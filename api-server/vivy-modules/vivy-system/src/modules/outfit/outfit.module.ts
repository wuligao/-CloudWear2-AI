import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiModelModule } from '../ai-model/ai-model.module'
import { SysUser } from '../system/user/entities/sys-user.entity'
import { H5StyleProfile } from './entities/h5-style-profile.entity'
import { OutfitRecord } from './entities/outfit-record.entity'
import { AdminH5StyleProfileController, H5ProfileController } from './h5-profile.controller'
import { H5ProfileService } from './h5-profile.service'
import { OutfitController } from './outfit.controller'
import { OutfitGenerationTasksService } from './outfit-generation-tasks.service'
import { AdminOutfitRecordsController, OutfitRecordsController } from './outfit-records.controller'
import { OutfitRecordsService } from './outfit-records.service'

@Module({
  imports: [AiModelModule, TypeOrmModule.forFeature([OutfitRecord, H5StyleProfile, SysUser])],
  controllers: [
    OutfitController,
    OutfitRecordsController,
    H5ProfileController,
    AdminOutfitRecordsController,
    AdminH5StyleProfileController,
  ],
  providers: [OutfitGenerationTasksService, OutfitRecordsService, H5ProfileService],
})
export class OutfitModule {}
