import { Body, Controller, Delete, Get, Param, ParseArrayPipe, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AjaxResult, SecurityContext } from '@vivy-common/core'
import { Log, OperType } from '@vivy-common/logger'
import { Public, RequirePermissions } from '@vivy-common/security'
import { AiPromptTemplateService } from './ai-prompt-template.service'
import { AiModelService } from './ai-model.service'
import {
  CreateAiModelItemDto,
  CreateAiModelProviderDto,
  TestConnectionDto,
  TestModelDto,
  UpdateAiAppModelConfigDto,
  UpdateAiModelItemDto,
  UpdateAiModelProviderDto,
} from './dto/ai-model.dto'
import {
  CreateAiPromptTemplateDto,
  ListAiPromptTemplateDto,
  UpdateAiPromptTemplateDto,
  UpdateAiPromptTemplateStatusDto,
} from './dto/ai-prompt-template.dto'

@ApiTags('AI模型配置')
@ApiBearerAuth()
@Controller('ai-model')
export class AiModelController {
  constructor(
    private readonly aiModelService: AiModelService,
    private readonly promptTemplateService: AiPromptTemplateService,
    private readonly securityContext: SecurityContext
  ) {}

  @Get('providers')
  @RequirePermissions('ai:model:list')
  async listProviders(): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.listProviders())
  }

  @Get('providers/:providerId')
  @RequirePermissions('ai:model:query')
  async infoProvider(@Param('providerId') providerId: number): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.infoProvider(Number(providerId)))
  }

  @Get('app-configs/h5-outfit')
  @RequirePermissions('ai:model:list')
  async infoH5Config(): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.infoH5Config())
  }

  @Get('prompts')
  @RequirePermissions('ai:prompt:list')
  async listPrompts(@Query() query: ListAiPromptTemplateDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.list(query))
  }

  @Get('prompts/stats')
  @RequirePermissions('ai:prompt:list')
  async promptStats(): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.stats())
  }

  @Get('prompts/:promptId')
  @RequirePermissions('ai:prompt:query')
  async infoPrompt(@Param('promptId') promptId: number): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.info(Number(promptId)))
  }

  @Post('prompts')
  @Log({ title: 'AI提示词', operType: OperType.INSERT })
  @RequirePermissions('ai:prompt:add')
  async addPrompt(@Body() prompt: CreateAiPromptTemplateDto): Promise<AjaxResult> {
    prompt.createBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.promptTemplateService.add(prompt))
  }

  @Put('prompts/:promptId')
  @Log({ title: 'AI提示词', operType: OperType.UPDATE })
  @RequirePermissions('ai:prompt:update')
  async updatePrompt(
    @Param('promptId') promptId: number,
    @Body() prompt: UpdateAiPromptTemplateDto
  ): Promise<AjaxResult> {
    prompt.updateBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.promptTemplateService.update(Number(promptId), prompt))
  }

  @Put('prompts/:promptId/status')
  @Log({ title: 'AI提示词状态', operType: OperType.UPDATE })
  @RequirePermissions('ai:prompt:update')
  async updatePromptStatus(
    @Param('promptId') promptId: number,
    @Body() dto: UpdateAiPromptTemplateStatusDto
  ): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.updateStatus(Number(promptId), dto.status))
  }

  @Post('prompts/:promptId/duplicate')
  @Log({ title: 'AI提示词复制', operType: OperType.INSERT })
  @RequirePermissions('ai:prompt:add')
  async duplicatePrompt(@Param('promptId') promptId: number): Promise<AjaxResult> {
    return AjaxResult.success(
      await this.promptTemplateService.duplicate(Number(promptId), this.securityContext.getUserName())
    )
  }

  @Post('prompts/:promptId/use')
  @Log({ title: 'AI提示词使用', operType: OperType.UPDATE })
  @RequirePermissions('ai:prompt:update')
  async usePrompt(@Param('promptId') promptId: number): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.markUsed(Number(promptId)))
  }

  @Delete('prompts/:promptIds')
  @Log({ title: 'AI提示词', operType: OperType.DELETE })
  @RequirePermissions('ai:prompt:delete')
  async deletePrompt(
    @Param('promptIds', new ParseArrayPipe({ items: Number })) promptIds: number[]
  ): Promise<AjaxResult> {
    return AjaxResult.success(await this.promptTemplateService.delete(promptIds))
  }

  @Get('public/app-configs/h5-outfit')
  @Public()
  async publicH5Config(): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.publicH5Config())
  }

  @Put('app-configs/h5-outfit')
  @Log({ title: 'H5模型配置', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async updateH5Config(@Body() config: UpdateAiAppModelConfigDto): Promise<AjaxResult> {
    config.updateBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.aiModelService.updateH5Config(config))
  }

  @Post('app-configs/h5-outfit/daily-refresh')
  @Log({ title: 'H5首页每日内容生成', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async refreshH5HomeContent(): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.refreshH5HomeContentManually())
  }

  @Post('app-configs/h5-outfit/login-refresh')
  @Log({ title: 'H5登录页每日内容生成', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async refreshH5LoginContent(): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.refreshH5LoginContentManually())
  }

  @Post('providers')
  @Log({ title: 'AI模型服务商', operType: OperType.INSERT })
  @RequirePermissions('ai:model:add')
  async addProvider(@Body() provider: CreateAiModelProviderDto): Promise<AjaxResult> {
    provider.createBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.aiModelService.addProvider(provider))
  }

  @Put('providers/:providerId')
  @Log({ title: 'AI模型服务商', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async updateProvider(
    @Param('providerId') providerId: number,
    @Body() provider: UpdateAiModelProviderDto
  ): Promise<AjaxResult> {
    provider.updateBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.aiModelService.updateProvider(Number(providerId), provider))
  }

  @Delete('providers/:providerId')
  @Log({ title: 'AI模型服务商', operType: OperType.DELETE })
  @RequirePermissions('ai:model:delete')
  async deleteProvider(@Param('providerId') providerId: number): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.deleteProvider(Number(providerId)))
  }

  @Post('providers/:providerId/models')
  @Log({ title: 'AI模型', operType: OperType.INSERT })
  @RequirePermissions('ai:model:add')
  async addModel(
    @Param('providerId') providerId: number,
    @Body() model: CreateAiModelItemDto
  ): Promise<AjaxResult> {
    model.createBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.aiModelService.addModel(Number(providerId), model))
  }

  @Put('providers/:providerId/models/:modelPk')
  @Log({ title: 'AI模型', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async updateModel(
    @Param('providerId') providerId: number,
    @Param('modelPk') modelPk: number,
    @Body() model: UpdateAiModelItemDto
  ): Promise<AjaxResult> {
    model.updateBy = this.securityContext.getUserName()
    return AjaxResult.success(await this.aiModelService.updateModel(Number(providerId), Number(modelPk), model))
  }

  @Delete('providers/:providerId/models/:modelPk')
  @Log({ title: 'AI模型', operType: OperType.DELETE })
  @RequirePermissions('ai:model:delete')
  async deleteModel(
    @Param('providerId') providerId: number,
    @Param('modelPk') modelPk: number
  ): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.deleteModel(Number(providerId), Number(modelPk)))
  }

  @Put('providers/:providerId/models/:modelPk/default')
  @Log({ title: '默认AI模型', operType: OperType.UPDATE })
  @RequirePermissions('ai:model:update')
  async setDefaultModel(
    @Param('providerId') providerId: number,
    @Param('modelPk') modelPk: number
  ): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.setDefaultModel(Number(providerId), Number(modelPk)))
  }

  @Post('providers/:providerId/test-connection')
  @RequirePermissions('ai:model:test')
  async testConnection(
    @Param('providerId') providerId: number,
    @Body() dto: TestConnectionDto
  ): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.testConnection(Number(providerId), dto))
  }

  @Post('test-model')
  @RequirePermissions('ai:model:test')
  async testModel(@Body() dto: TestModelDto): Promise<AjaxResult> {
    return AjaxResult.success(await this.aiModelService.testModel(dto))
  }
}
