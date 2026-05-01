import { OmitType, PartialType } from '@nestjs/mapped-types'
import { Allow, IsIn, IsNotEmpty } from 'class-validator'
import { AiModelProvider } from '../entities/ai-model-provider.entity'
import { AiModelItem, AiModelType } from '../entities/ai-model-item.entity'
import { AiAppModelConfig } from '../entities/ai-app-model-config.entity'
import { H5OutfitOptionConfig } from '../h5-outfit-options'

export class CreateAiModelProviderDto extends OmitType(AiModelProvider, ['providerId', 'models'] as const) {}

export class UpdateAiModelProviderDto extends PartialType(CreateAiModelProviderDto) {}

export class CreateAiModelItemDto extends OmitType(AiModelItem, ['modelPk', 'providerId', 'provider'] as const) {}

export class UpdateAiModelItemDto extends PartialType(CreateAiModelItemDto) {}

export class UpdateAiAppModelConfigDto extends PartialType(
  OmitType(AiAppModelConfig, ['configId', 'appCode', 'appName'] as const)
) {
  @Allow()
  options?: Partial<H5OutfitOptionConfig>
}

export class TestConnectionDto {
  @Allow()
  baseUrl?: string

  @Allow()
  apiKey?: string

  @Allow()
  modelId?: string
}

export class TestModelDto {
  @Allow()
  providerId?: number

  @Allow()
  modelId?: string

  @IsIn(['text', 'image', 'embedding'])
  testType: Exclude<AiModelType, 'multimodal'>

  @IsNotEmpty()
  prompt: string
}
