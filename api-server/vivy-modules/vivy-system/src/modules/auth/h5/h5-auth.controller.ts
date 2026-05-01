import { Body, Controller, Get, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AjaxResult } from '@vivy-common/core'
import { Public } from '@vivy-common/security'
import { H5LoginDto, H5RegisterDto, H5UpdateProfileDto } from './dto/h5-auth.dto'
import { H5AuthService } from './h5-auth.service'

@ApiTags('H5登录')
@ApiBearerAuth()
@Controller('api/h5/auth')
export class H5AuthController {
  constructor(private readonly h5AuthService: H5AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() form: H5RegisterDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5AuthService.register(form), '注册成功')
  }

  @Post('login')
  @Public()
  async login(@Body() form: H5LoginDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5AuthService.login(form), '登录成功')
  }

  @Get('me')
  async profile(): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5AuthService.profile())
  }

  @Put('me')
  async updateProfile(@Body() form: H5UpdateProfileDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.h5AuthService.updateProfile(form), '保存成功')
  }

  @Post('logout')
  async logout(): Promise<AjaxResult> {
    await this.h5AuthService.logout()
    return AjaxResult.success(null, '退出成功')
  }
}
