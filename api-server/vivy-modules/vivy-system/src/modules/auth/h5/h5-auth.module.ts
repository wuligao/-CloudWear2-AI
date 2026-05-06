import { Module } from '@nestjs/common'
import { LoginModule } from '@/modules/auth/login/login.module'
import { AiModelModule } from '@/modules/ai-model/ai-model.module'
import { UserModule } from '@/modules/system/user/user.module'
import { H5AuthController } from './h5-auth.controller'
import { H5AuthService } from './h5-auth.service'

@Module({
  imports: [LoginModule, UserModule, AiModelModule],
  controllers: [H5AuthController],
  providers: [H5AuthService],
})
export class H5AuthModule {}
