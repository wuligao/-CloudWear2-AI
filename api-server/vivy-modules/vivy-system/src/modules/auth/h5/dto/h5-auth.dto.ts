import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class H5LoginDto {
  @ApiProperty({
    description: '手机号',
    default: '13800138000',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  phone: string

  @ApiProperty({
    description: '密码',
    default: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  password: string
}

export class H5RegisterDto extends H5LoginDto {
  @ApiProperty({
    description: '昵称',
    required: false,
    default: '云裳用户',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickName?: string
}

export class H5UpdateProfileDto {
  @ApiProperty({
    description: '昵称',
    required: false,
    default: '云裳用户',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickName?: string

  @ApiProperty({
    description: '头像地址',
    required: false,
    default: '/uploads/avatar/demo.png',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  avatar?: string
}
