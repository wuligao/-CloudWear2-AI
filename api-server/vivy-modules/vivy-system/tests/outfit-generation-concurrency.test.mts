import assert from 'node:assert/strict'
import test from 'node:test'
import { generateOutfitVariantResults } from '../src/modules/outfit/outfit-generation-runner.ts'
import type { OutfitInput, OutfitPlan } from '../src/modules/outfit/types/outfit.ts'

const input: OutfitInput = {
  season: '春季',
  temperature: 22,
  weather: '晴朗',
  location: '上海街区',
  occasion: '通勤',
  style: '轻潮街拍',
  generationCount: 4,
}

const basePlan: OutfitPlan = {
  outfitTitle: '轻潮街拍风方案',
  summary: '适合通勤的轻潮街拍风。',
  styleTags: ['街拍风'],
  temperatureAdvice: '适合 22 度。',
  occasionReason: '适合通勤。',
  items: [],
  imagePrompt: 'street style outfit',
}

test('generateOutfitVariantResults generates images sequentially', async () => {
  const variants = Array.from({ length: 4 }, (_, index) => ({
    ...basePlan,
    outfitTitle: `方案 ${index + 1}`,
    imagePrompt: `variant ${index + 1}`,
  }))
  const startedIndexes: number[] = []
  const finishedIndexes: number[] = []
  const progressMessages: string[] = []

  const results = await generateOutfitVariantResults({
    aiConfig: {},
    imageGenerator: async (plan) => {
      const index = Number(plan.imagePrompt.replace('variant ', ''))
      startedIndexes.push(index)
      await Promise.resolve()
      finishedIndexes.push(index)
      return `data:image/png;base64,${index}`
    },
    input,
    now: '2026-05-01T06:00:00.000Z',
    onProgress: ({ message }) => progressMessages.push(message),
    safeInput: input,
    taskId: 'task-1',
    variants,
  })

  assert.deepEqual(startedIndexes, [1, 2, 3, 4])
  assert.deepEqual(finishedIndexes, [1, 2, 3, 4])
  assert.equal(results.length, 4)
  assert.deepEqual(
    results.map((result) => result.id),
    ['task-1-1', 'task-1-2', 'task-1-3', 'task-1-4']
  )
  assert.equal(progressMessages.at(-1), '已完成 4 / 4 套穿搭图片。')
})

test('generateOutfitVariantResults stops when one image generation fails', async () => {
  const variants = Array.from({ length: 2 }, (_, index) => ({
    ...basePlan,
    outfitTitle: `方案 ${index + 1}`,
    imagePrompt: `variant ${index + 1}`,
  }))
  const startedIndexes: number[] = []

  await assert.rejects(
    generateOutfitVariantResults({
      aiConfig: {},
      imageGenerator: async (plan) => {
        const index = Number(plan.imagePrompt.replace('variant ', ''))
        startedIndexes.push(index)
        if (index === 1) throw new Error('image failed')
        return `data:image/png;base64,${index}`
      },
      input,
      now: '2026-05-01T06:00:00.000Z',
      safeInput: input,
      taskId: 'task-2',
      variants,
    }),
    /image failed/
  )

  assert.deepEqual(startedIndexes, [1])
})

test('generateOutfitVariantResults keeps earlier successful results internal until all variants finish', async () => {
  const variants = Array.from({ length: 2 }, (_, index) => ({
    ...basePlan,
    outfitTitle: `方案 ${index + 1}`,
    imagePrompt: `variant ${index + 1}`,
  }))
  const progressMessages: string[] = []

  await assert.rejects(
    generateOutfitVariantResults({
      aiConfig: {},
      imageGenerator: async (plan) => {
        if (plan.imagePrompt === 'variant 2') throw new Error('image failed')
        return 'data:image/png;base64,1'
      },
      input,
      now: '2026-05-01T06:00:00.000Z',
      onProgress: ({ message }) => progressMessages.push(message),
      safeInput: input,
      taskId: 'task-2',
      variants,
    }),
    /image failed/
  )

  assert.deepEqual(progressMessages, ['已完成 1 / 2 套穿搭图片。'])
})
