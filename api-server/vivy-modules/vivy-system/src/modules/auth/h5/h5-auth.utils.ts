interface H5AuthLoginUserLike {
  userId?: number
  userName?: string
  sysUser?: {
    userId?: number
    userName?: string
    nickName?: string
    phonenumber?: string
    avatar?: string
  }
}

export interface H5AuthUser {
  userId: number
  userName: string
  phone: string
  nickName: string
  avatar?: string
}

export interface H5CreateUserPayload {
  userName: string
  nickName: string
  phonenumber: string
  password: string
  userType: string
  status: string
  sex: string
}

export function normalizeH5Phone(phone: string): string {
  const normalized = String(phone || '').replace(/[^\d]/g, '')
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    throw new Error('请输入正确的手机号')
  }

  return normalized
}

export function assertH5Password(password: string): void {
  const value = String(password || '')
  if (value.length < 6 || value.length > 32) {
    throw new Error('密码长度需为 6-32 位')
  }
}

export function buildH5NickName(phone: string, nickName?: string): string {
  const normalizedName = String(nickName || '').trim()
  if (normalizedName) return normalizedName.slice(0, 50)

  return `云裳用户${phone.slice(-4)}`
}

export function buildH5GuestNickName(phone: string): string {
  return `云裳游客${phone.slice(-4)}`
}

export function buildH5CreateUser({
  phone,
  password,
  nickName,
}: {
  phone: string
  password: string
  nickName?: string
}): H5CreateUserPayload {
  return {
    userName: phone,
    nickName: buildH5NickName(phone, nickName),
    phonenumber: phone,
    password,
    userType: '10',
    status: '0',
    sex: '3',
  }
}

export function toH5AuthUser(loginUser: H5AuthLoginUserLike): H5AuthUser {
  const sysUser = loginUser.sysUser || {}
  const userName = sysUser.userName || loginUser.userName || ''
  const phone = sysUser.phonenumber || userName

  return {
    userId: Number(sysUser.userId || loginUser.userId),
    userName,
    phone,
    nickName: sysUser.nickName || buildH5NickName(phone),
    avatar: sysUser.avatar,
  }
}
