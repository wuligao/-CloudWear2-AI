import type { OutfitGeneration, OutfitInput, OutfitPlan } from './types/outfit'

export type OutfitImageGenerator<TAiConfig = unknown> = (
  plan: OutfitPlan,
  userPhotoDataUrl: string | undefined,
  imageModel: string | undefined,
  aiConfig: TAiConfig,
  trace?: OutfitVariantTrace & { taskId: string }
) => Promise<string>

export interface OutfitVariantProgress {
  completedCount: number
  message: string
  progress: number
  totalCount: number
}

export interface OutfitVariantTrace {
  index: number
  totalCount: number
  title?: string
}

export interface GenerateOutfitVariantResultsOptions<TAiConfig = unknown> {
  aiConfig: TAiConfig
  imageGenerator: OutfitImageGenerator<TAiConfig>
  input: OutfitInput
  now: string
  onVariantComplete?: (trace: OutfitVariantTrace & { imageLength: number }) => void
  onVariantStart?: (trace: OutfitVariantTrace) => void
  onProgress?: (progress: OutfitVariantProgress) => void
  safeInput: Omit<OutfitInput, 'userPhotoDataUrl'>
  taskId: string
  variants: OutfitPlan[]
}

export async function generateOutfitVariantResults<TAiConfig = unknown>({
  aiConfig,
  imageGenerator,
  input,
  now,
  onVariantComplete,
  onVariantStart,
  onProgress,
  safeInput,
  taskId,
  variants,
}: GenerateOutfitVariantResultsOptions<TAiConfig>): Promise<OutfitGeneration[]> {
  const totalCount = variants.length
  let completedCount = 0

  const results: OutfitGeneration[] = []

  for (const [index, variantPlan] of variants.entries()) {
    onVariantStart?.({ index: index + 1, totalCount, title: variantPlan.outfitTitle })
    const imageUrl = await imageGenerator(variantPlan, input.userPhotoDataUrl, input.imageModel, aiConfig, {
      index: index + 1,
      taskId,
      title: variantPlan.outfitTitle,
      totalCount,
    })
    completedCount += 1
    onVariantComplete?.({
      index: index + 1,
      totalCount,
      title: variantPlan.outfitTitle,
      imageLength: imageUrl.length,
    })
    onProgress?.({
      completedCount,
      totalCount,
      progress: 48 + Math.round((completedCount / totalCount) * 42),
      message: `已完成 ${completedCount} / ${totalCount} 套穿搭图片。`,
    })

    results.push({
      id: `${taskId}-${index + 1}`,
      taskId,
      source: input.userPhotoDataUrl ? ('photo' as const) : ('keyword' as const),
      recordStatus: 'succeeded' as const,
      totalCount,
      successCount: totalCount,
      failedCount: 0,
      ...safeInput,
      ...variantPlan,
      imageUrl,
      userPhotoUsed: Boolean(input.userPhotoDataUrl),
      createdAt: now,
    })
  }

  return results
}
