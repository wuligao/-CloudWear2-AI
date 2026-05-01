import { Injectable } from '@nestjs/common'
import { ServiceException } from '@vivy-common/core'
import { TokenService } from '@vivy-common/security'
import { LoginService } from '@/modules/auth/login/login.service'
import { CreateUserDto } from '@/modules/system/user/dto/user.dto'
import { UserService } from '@/modules/system/user/user.service'
import { H5LoginDto, H5RegisterDto, H5UpdateProfileDto } from './dto/h5-auth.dto'
import {
  assertH5Password,
  buildH5CreateUser,
  normalizeH5Phone,
  toH5AuthUser,
  type H5AuthUser,
} from './h5-auth.utils'

export interface H5AuthSession {
  token: string
  expiresIn: number
  user: H5AuthUser
}

@Injectable()
export class H5AuthService {
  constructor(
    private readonly loginService: LoginService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService
  ) {}

  async register(form: H5RegisterDto): Promise<H5AuthSession> {
    const phone = this.normalizeCredentials(form)
    const isPhoneUnique = await this.userService.checkUserPhoneUnique(phone)
    const isUserNameUnique = await this.userService.checkUserNameUnique(phone)

    if (!isPhoneUnique || !isUserNameUnique) {
      throw new ServiceException('该手机号已注册')
    }

    await this.createH5User(phone, form.password, form.nickName)

    return this.login({ phone, password: form.password })
  }

  async login(form: H5LoginDto): Promise<H5AuthSession> {
    const phone = this.normalizeCredentials(form)
    const user = await this.userService.selectUserByUserName(phone)
    if (!user) {
      await this.createH5User(phone, form.password)
    }

    const loginUser = await this.loginService.login({
      username: phone,
      password: form.password,
    })
    const token = await this.tokenService.createToken(loginUser)

    return {
      ...token,
      user: toH5AuthUser(loginUser),
    }
  }

  async profile(): Promise<H5AuthUser> {
    const loginUser = await this.getCurrentLoginUser()

    return toH5AuthUser(loginUser)
  }

  async updateProfile(form: H5UpdateProfileDto): Promise<H5AuthUser> {
    const loginUser = await this.getCurrentLoginUser()
    const updatePayload: { nickName?: string; avatar?: string } = {}

    if (form.nickName !== undefined) {
      const nickName = String(form.nickName).trim()
      if (!nickName) {
        throw new ServiceException('昵称不能为空')
      }
      updatePayload.nickName = nickName
    }

    if (form.avatar !== undefined) {
      updatePayload.avatar = String(form.avatar).trim()
    }

    if (!Object.keys(updatePayload).length) {
      throw new ServiceException('请至少修改一项资料')
    }

    await this.userService.updateBasicInfo(loginUser.userId, updatePayload)

    Object.assign(loginUser.sysUser, updatePayload)
    await this.tokenService.setLoginUser(loginUser)

    return toH5AuthUser(loginUser)
  }

  async logout(): Promise<void> {
    const token = this.tokenService.getToken()
    if (token) {
      await this.tokenService.delLoginUser(token)
    }
  }

  private normalizeCredentials(form: H5LoginDto): string {
    try {
      const phone = normalizeH5Phone(form.phone)
      assertH5Password(form.password)
      form.phone = phone
      return phone
    } catch (error) {
      throw new ServiceException(error instanceof Error ? error.message : '登录信息格式不正确')
    }
  }

  private async createH5User(phone: string, password: string, nickName?: string): Promise<void> {
    const user = buildH5CreateUser({ phone, password, nickName }) as CreateUserDto
    await this.userService.add(user)
  }

  private async getCurrentLoginUser() {
    const token = this.tokenService.getToken()
    const loginUser = await this.tokenService.getLoginUser(token)
    if (!loginUser) {
      throw new ServiceException('登录已过期，请重新登录')
    }

    return loginUser
  }
}
