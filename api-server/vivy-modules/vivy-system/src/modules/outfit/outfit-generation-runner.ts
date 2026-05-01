import type { OutfitGeneration, OutfitInput, OutfitPlan } from './types/outfit'

export type OutfitImageGenerator<TAiConfig = unknown> = (
  plan: OutfitPlan,
  userPhotoDataUrl: string | undefined,
  imageModel: string | undefined,
  aiConfig: TAiConfig
) => Promise<string>

export interface OutfitVariantProgress {
  completedCount: number
  message: string
  progress: number
  totalCount: number
}

export interface GenerateOutfitVariantResultsOptions<TAiConfig = unknown> {
  aiConfig: TAiConfig
  imageGenerator: OutfitImageGenerator<TAiConfig>
  input: OutfitInput
  now: string
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
  onProgress,
  safeInput,
  taskId,
  variants,
}: GenerateOutfitVariantResultsOptions<TAiConfig>): Promise<OutfitGeneration[]> {
  const totalCount = variants.length
  let completedCount = 0

  const settledResults = await Promise.all(
    variants.map(async (variantPlan, index) => {
      try {
        const imageUrl = await imageGenerator(variantPlan, input.userPhotoDataUrl, input.imageModel, aiConfig)
        completedCount += 1
        onProgress?.({
          completedCount,
          totalCount,
          progress: 48 + Math.round((completedCount / totalCount) * 42),
          message: `已完成 ${completedCount} / ${totalCount} 套穿搭图片。`,
        })

        return {
          status: 'fulfilled' as const,
          value: {
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
          },
        }
      } catch (reason) {
        return { reason, status: 'rejected' as const }
      }
    })
  )

  const failedResult = settledResults.find((result) => result.status === 'rejected')
  if (failedResult?.status === 'rejected') throw failedResult.reason

  return settledResults.map((result) => {
    if (result.status === 'rejected') throw result.reason
    return result.value
  })
}
