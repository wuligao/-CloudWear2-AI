import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AjaxResult } from '@vivy-common/core'
import { TokenService } from '@vivy-common/security'
import { Public, RequirePermissions } from '@vivy-common/security'
import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import {
  AdminOutfitRecordListQueryDto,
  createOutfitRecordSchema,
  outfitRecordListQuerySchema,
  outfitRecordOwnerSchema,
} from './dto/outfit-record.dto'
import { OutfitRecordsService } from './outfit-records.service'

@ApiTags('H5穿搭记录')
@Controller('api/outfit-records')
export class OutfitRecordsController {
  constructor(
    private readonly records: OutfitRecordsService,
    private readonly tokenService: TokenService
  ) {}

  @Post()
  @Public()
  async create(@Body() payload: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return await this.records.create(createOutfitRecordSchema.parse(payload), await this.resolveLoginUserId(request))
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Get()
  @Public()
  async list(@Query() query: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return await this.records.list(outfitRecordListQuerySchema.parse(query), await this.resolveLoginUserId(request))
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Get(':recordId')
  @Public()
  async info(
    @Param('recordId') recordId: string,
    @Query() query: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const parsedRecordId = this.parseRecordId(recordId)
      return await this.records.info(parsedRecordId, outfitRecordOwnerSchema.parse(query), await this.resolveLoginUserId(request))
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  @Delete(':recordId')
  @Public()
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('recordId') recordId: string,
    @Query() query: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const parsedRecordId = this.parseRecordId(recordId)
      return await this.records.delete(parsedRecordId, outfitRecordOwnerSchema.parse(query), await this.resolveLoginUserId(request))
    } catch (error) {
      return this.handleError(error, response)
    }
  }

  private handleError(error: unknown, response: Response) {
    if (error instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST)
      return {
        error: '穿搭记录参数不完整或格式不正确。',
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
          : '穿搭记录保存失败。'
    response.status(status)

    return { error: message }
  }

  private parseRecordId(recordId: string) {
    const parsedRecordId = Number(recordId)
    if (!Number.isSafeInteger(parsedRecordId) || parsedRecordId <= 0) {
      throw new BadRequestException({ error: '穿搭记录ID格式不正确。' })
    }

    return parsedRecordId
  }

  private async resolveLoginUserId(request: Request) {
    const token = this.tokenService.getToken(request)
    if (!token) throw new UnauthorizedException({ error: '请先登录后再操作穿搭记录。' })

    const loginUser = await this.tokenService.getLoginUser(token)
    if (!loginUser?.userId) throw new UnauthorizedException({ error: '登录状态已失效，请重新登录。' })

    return loginUser.userId
  }
}

@ApiTags('后台穿搭记录')
@ApiBearerAuth()
@Controller('outfit-records')
export class AdminOutfitRecordsController {
  constructor(private readonly records: OutfitRecordsService) {}

  @Get()
  @RequirePermissions('outfit:record:list')
  async list(@Query() query: AdminOutfitRecordListQueryDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.records.adminList(query))
  }

  @Delete(':recordId')
  @RequirePermissions('outfit:record:delete')
  async delete(@Param('recordId') recordId: string): Promise<AjaxResult> {
    return AjaxResult.success(await this.records.adminDelete(Number(recordId)))
  }
}
