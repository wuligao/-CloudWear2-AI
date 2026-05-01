import { Module } from '@nestjs/common'
import { H5AuthModule } from './h5/h5-auth.module'
import { LoginModule } from './login/login.module'

@Module({
  imports: [LoginModule, H5AuthModule],
})
export class AuthModule {}
