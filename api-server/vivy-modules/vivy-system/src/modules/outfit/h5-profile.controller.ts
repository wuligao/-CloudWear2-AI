import { BadRequestException, Body, Controller, Get, HttpStatus, Post, Put, Query, Req, Res, UnauthorizedException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AjaxResult } from '@vivy-common/core'
import { Public, RequirePermissions, TokenService } from '@vivy-common/security'
import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import {
  AdminH5StyleProfileQueryDto,
  h5ProfileOverviewQuerySchema,
  h5StyleProfileFeedbackSchema,
  h5StyleProfilePhotoAnalysisSchema,
  h5StyleProfileQuerySchema,
  h5StyleProfileSchema,
} from './h5-profile.dto'
import { H5ProfileService } from './h5-profile.service'

@ApiTags('H5个人中心')
@Controller('api/h5/profile')
export class H5ProfileController {
  constructor(
    private readonly h5ProfileService: H5ProfileService,
    private readonly tokenService: TokenService
  ) {}

  @Get('overview')
  @Public()
  async overview(@Query() query: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const parsedQuery = h5ProfileOverviewQuerySchema.parse(query)
      void parsedQuery
      return AjaxResult.success(await this.h5ProfileService.overview(await this.resolveLoginUserId(request)))
    } catch (error) {
      return this.handleError(error, response, '个人中心参数不完整或格式不正确。')
    }
  }

  @Get('archive')
  @Public()
  async archive(@Query() query: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const parsedQuery = h5StyleProfileQuerySchema.parse(query)
      void parsedQuery
      return AjaxResult.success(
        await this.h5ProfileService.styleProfile(await this.resolveLoginUserId(request))
      )
    } catch (error) {
      return this.handleError(error, response, '风格档案参数不完整或格式不正确。')
    }
  }

  @Put('archive')
  @Public()
  async updateArchive(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const parsedPayload = h5StyleProfileSchema.parse(payload)
      return AjaxResult.success(await this.h5ProfileService.upsertStyleProfile(parsedPayload, await this.resolveLoginUserId(request)))
    } catch (error) {
      return this.handleError(error, response, '风格档案内容不完整或格式不正确。')
    }
  }

  @Post('archive/analyze-photo')
  @Public()
  async analyzeArchivePhoto(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const parsedPayload = h5StyleProfilePhotoAnalysisSchema.parse(payload)
      return AjaxResult.success(
        await this.h5ProfileService.analyzeStyleProfilePhoto(parsedPayload, await this.resolveLoginUserId(request))
      )
    } catch (error) {
      return this.handleError(error, response, '风格照片内容不完整或格式不正确。')
    }
  }

  @Post('feedback')
  @Public()
  async feedback(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const parsedPayload = h5StyleProfileFeedbackSchema.parse(payload)
      return AjaxResult.success(
        await this.h5ProfileService.applyStyleProfileFeedback(parsedPayload, await this.resolveLoginUserId(request))
      )
    } catch (error) {
      return this.handleError(error, response, '反馈内容不完整或格式不正确。')
    }
  }

  private handleError(error: unknown, response: Response, zodMessage: string) {
    if (error instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST)
      return {
        error: zodMessage,
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
          : '风格档案操作失败。'

    response.status(status)
    return { error: message }
  }

  private async resolveLoginUserId(request: Request) {
    const token = this.tokenService.getToken(request)
    if (!token) throw new UnauthorizedException({ error: '请先登录后再操作风格档案。' })

    const loginUser = await this.tokenService.getLoginUser(token)
    if (!loginUser?.userId) throw new UnauthorizedException({ error: '登录状态已失效，请重新登录。' })

    return loginUser.userId
  }
}

@ApiTags('后台H5风格档案')
@ApiBearerAuth()
@Controller('h5-style-profiles')
export class AdminH5StyleProfileController {
  constructor(private readonly h5ProfileService: H5ProfileService) {}

  @Get()
  @RequirePermissions('outfit:record:list')
  async list(@Query() query: AdminH5StyleProfileQueryDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5ProfileService.adminCards(query))
  }

  @Get('archive')
  @RequirePermissions('outfit:record:list')
  async archive(@Query() query: AdminH5StyleProfileQueryDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5ProfileService.adminArchive(query))
  }
}
