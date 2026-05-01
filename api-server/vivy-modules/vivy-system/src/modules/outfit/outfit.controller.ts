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
  constructor(
    private readonly tasks: OutfitGenerationTasksService,
    private readonly tokenService: TokenService
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const input = outfitInputSchema.parse(payload)
      response.status(HttpStatus.ACCEPTED)
      return await this.tasks.create(input, await this.resolveLoginUserId(request))
    } catch (error) {
      if (error instanceof ZodError) {
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
      response.status(status)
      return { error: message }
    }
  }

  @Get(':taskId')
  @Public()
  findOne(@Param('taskId') taskId: string, @Res({ passthrough: true }) response: Response) {
    const task = this.tasks.get(taskId)
    if (!task) {
      response.status(HttpStatus.NOT_FOUND)
      return { error: '生成任务不存在或已过期。' }
    }

    return task
  }

  @Sse(':taskId/events')
  @Public()
  events(@Param('taskId') taskId: string): Observable<MessageEvent> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new NotFoundException({ error: '生成任务不存在或已过期。' })
    }

    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ type: 'status', data: task })
      if (task.status === 'succeeded' || task.status === 'failed') {
        subscriber.complete()
        return undefined
      }

      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', data: { now: new Date().toISOString() } })
      }, heartbeatMs)
      const subscription = this.tasks.stream(taskId).subscribe({
        next: (nextTask) => {
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
