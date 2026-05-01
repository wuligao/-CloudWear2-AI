import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AiModelController } from './ai-model.controller'
import { AiModelService } from './ai-model.service'
import { AiAppModelConfig } from './entities/ai-app-model-config.entity'
import { AiModelItem } from './entities/ai-model-item.entity'
import { AiModelProvider } from './entities/ai-model-provider.entity'
import { AiPromptTemplate } from './entities/ai-prompt-template.entity'
import { AiPromptTemplateService } from './ai-prompt-template.service'

@Module({
  imports: [TypeOrmModule.forFeature([AiModelProvider, AiModelItem, AiAppModelConfig, AiPromptTemplate])],
  controllers: [AiModelController],
  providers: [AiModelService, AiPromptTemplateService],
  exports: [AiModelService],
})
export class AiModelModule {}
