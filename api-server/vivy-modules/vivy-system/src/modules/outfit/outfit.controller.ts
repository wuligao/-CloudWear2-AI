import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  Sse,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public, TokenService } from '@vivy-common/security'
import type { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { ZodError } from 'zod'
import { outfitInputSchema } from './ai/schema'
import { OutfitGenerationTasksService } from './outfit-generation-tasks.service'

const heartbeatMs = 15_000

@ApiTags('H5穿搭生成')
@Controller('api/generate-outfit')
export class OutfitController {
  private readonly logger = new Logger(OutfitController.name)

  constructor(
    private readonly tasks: OutfitGenerationTasksService,
    private readonly tokenService: TokenService
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const startedAt = Date.now()
    try {
      const input = outfitInputSchema.parse(payload)
      this.logger.log({
        event: 'h5.generate.create.request',
        generationCount: input.generationCount,
        hasPhoto: Boolean(input.userPhotoDataUrl),
        imageModel: input.imageModel,
        source: input.userPhotoDataUrl ? 'photo' : 'keyword',
      })
      response.status(HttpStatus.ACCEPTED)
      const task = await this.tasks.create(input, await this.resolveLoginUserId(request))
      this.logger.log({
        event: 'h5.generate.create.accepted',
        elapsedMs: Date.now() - startedAt,
        status: task.status,
        taskId: task.taskId,
      })
      return task
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.warn({
          event: 'h5.generate.create.validation_failed',
          elapsedMs: Date.now() - startedAt,
          issueCount: error.issues.length,
        })
        response.status(HttpStatus.BAD_REQUEST)
        return {
          error: '输入信息不完整或格式不正确。',
          details: error.flatten(),
        }
      }

      const status =
        typeof error === 'object' && error && 'getStatus' in error
          ? Number((error as { getStatus: () => number }).getStatus())
          : HttpStatus.INTERNAL_SERVER_ERROR
      const responseBody =
        typeof error === 'object' && error && 'getResponse' in error
          ? (error as { getResponse: () => unknown }).getResponse()
          : null
      const message =
        responseBody && typeof responseBody === 'object' && 'error' in responseBody
          ? String((responseBody as { error: unknown }).error)
          : error instanceof Error
            ? error.message
            : '生成失败，请稍后再试。'
      this.logger.warn({
        event: 'h5.generate.create.failed',
        elapsedMs: Date.now() - startedAt,
        errorMessage: message,
        errorName: error instanceof Error ? error.name : typeof error,
        status,
      })
      response.status(status)
      return { error: message }
    }
  }

  @Get(':taskId')
  @Public()
  findOne(@Param('taskId') taskId: string, @Res({ passthrough: true }) response: Response) {
    const task = this.tasks.get(taskId)
    if (!task) {
      this.logger.warn({
        event: 'h5.generate.task.not_found',
        taskId,
      })
      response.status(HttpStatus.NOT_FOUND)
      return { error: '生成任务不存在或已过期。' }
    }

    this.logger.log({
      event: 'h5.generate.task.read',
      progress: task.progress,
      status: task.status,
      taskId,
    })
    return task
  }

  @Sse(':taskId/events')
  @Public()
  events(@Param('taskId') taskId: string): Observable<MessageEvent> {
    const task = this.tasks.get(taskId)
    if (!task) {
      this.logger.warn({
        event: 'h5.generate.events.not_found',
        taskId,
      })
      throw new NotFoundException({ error: '生成任务不存在或已过期。' })
    }

    return new Observable<MessageEvent>((subscriber) => {
      this.logger.log({
        event: 'h5.generate.events.open',
        status: task.status,
        taskId,
      })
      subscriber.next({ type: 'status', data: task })
      if (task.status === 'succeeded' || task.status === 'failed') {
        this.logger.log({
          event: 'h5.generate.events.complete_immediately',
          status: task.status,
          taskId,
        })
        subscriber.complete()
        return undefined
      }

      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', data: { now: new Date().toISOString() } })
      }, heartbeatMs)
      const subscription = this.tasks.stream(taskId).subscribe({
        next: (nextTask) => {
          this.logger.log({
            event: 'h5.generate.events.status',
            progress: nextTask.progress,
            status: nextTask.status,
            taskId,
          })
          subscriber.next({ type: 'status', data: nextTask })
          if (nextTask.status === 'succeeded' || nextTask.status === 'failed') {
            subscriber.complete()
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      })

      return () => {
        clearInterval(heartbeat)
        subscription.unsubscribe()
        this.logger.log({
          event: 'h5.generate.events.close',
          taskId,
        })
      }
    })
  }

  private async resolveLoginUserId(request: Request) {
    const token = this.tokenService.getToken(request)
    if (!token) throw new UnauthorizedException({ error: '请先登录后再生成穿搭方案。' })

    const loginUser = await this.tokenService.getLoginUser(token)
    if (!loginUser?.userId) throw new UnauthorizedException({ error: '登录状态已失效，请重新登录。' })

    return loginUser.userId
  }
}
