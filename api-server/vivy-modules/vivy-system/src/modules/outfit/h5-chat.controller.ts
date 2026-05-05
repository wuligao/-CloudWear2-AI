import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { TokenService } from '@vivy-common/security'
import { Public } from '@vivy-common/security'
import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import { H5ChatService } from './h5-chat.service'
import { h5ChatCreateSessionSchema, h5ChatSendMessageSchema } from './h5-chat.dto'

@ApiTags('H5穿搭顾问')
@Controller('api/h5/chat')
export class H5ChatController {
  constructor(
    private readonly chatService: H5ChatService,
    private readonly tokenService: TokenService
  ) {}

  @Get('bootstrap')
  @Public()
  async bootstrap() {
    return this.chatService.bootstrap()
  }

  @Get('sessions')
  @Public()
  async listSessions(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return await this.chatService.listSessions(await this.resolveLoginUserId(request))
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Post('sessions')
  @Public()
  async createSession(
    @Body() payload: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return await this.chatService.createSession(
        h5ChatCreateSessionSchema.parse(payload || {}),
        await this.resolveLoginUserId(request)
      )
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Get('sessions/:sessionId/messages')
  @Public()
  async listMessages(
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return await this.chatService.listMessages(
        this.parseSessionId(sessionId),
        await this.resolveLoginUserId(request)
      )
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Post('sessions/:sessionId/messages')
  @Public()
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() payload: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      return await this.chatService.sendMessage(
        this.parseSessionId(sessionId),
        h5ChatSendMessageSchema.parse(payload),
        await this.resolveLoginUserId(request)
      )
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  private parseSessionId(sessionId: string) {
    const parsedSessionId = Number(sessionId)
    if (!Number.isSafeInteger(parsedSessionId) || parsedSessionId <= 0) {
      throw new BadRequestException({ error: '对话会话ID格式不正确。' })
    }

    return parsedSessionId
  }

  private async resolveLoginUserId(request: Request) {
    const token = this.tokenService.getToken(request)
    if (!token) throw new UnauthorizedException({ error: '请先登录后再使用 AI 穿搭顾问。' })

    const loginUser = await this.tokenService.getLoginUser(token)
    if (!loginUser?.userId) throw new UnauthorizedException({ error: '登录状态已失效，请重新登录。' })

    return loginUser.userId
  }

  private handleError(error: unknown, response: Response) {
    if (error instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST)
      return {
        error: '对话参数不完整或格式不正确。',
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
          : 'AI 穿搭顾问暂时不可用。'
    response.status(status)

    return { error: message }
  }
}
