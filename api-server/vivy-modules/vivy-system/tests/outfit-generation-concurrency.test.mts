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

test('generateOutfitVariantResults starts all image generations concurrently', async () => {
  const variants = Array.from({ length: 4 }, (_, index) => ({
    ...basePlan,
    outfitTitle: `方案 ${index + 1}`,
    imagePrompt: `variant ${index + 1}`,
  }))
  const pendingResolvers: Array<(value: string) => void> = []
  const startedIndexes: number[] = []
  const progressMessages: string[] = []

  const runPromise = generateOutfitVariantResults({
    aiConfig: {},
    imageGenerator: async (plan) => {
      startedIndexes.push(Number(plan.imagePrompt.replace('variant ', '')))
      return new Promise<string>((resolve) => {
        pendingResolvers.push(resolve)
      })
    },
    input,
    now: '2026-05-01T06:00:00.000Z',
    onProgress: ({ message }) => progressMessages.push(message),
    safeInput: input,
    taskId: 'task-1',
    variants,
  })

  await Promise.resolve()

  assert.deepEqual(startedIndexes, [1, 2, 3, 4])
  assert.equal(pendingResolvers.length, 4)

  pendingResolvers.forEach((resolve, index) => resolve(`data:image/png;base64,${index + 1}`))
  const results = await runPromise

  assert.equal(results.length, 4)
  assert.deepEqual(
    results.map((result) => result.id),
    ['task-1-1', 'task-1-2', 'task-1-3', 'task-1-4']
  )
  assert.equal(progressMessages.at(-1), '已完成 4 / 4 套穿搭图片。')
})

test('generateOutfitVariantResults waits for concurrent requests before reporting failure', async () => {
  const variants = Array.from({ length: 2 }, (_, index) => ({
    ...basePlan,
    outfitTitle: `方案 ${index + 1}`,
    imagePrompt: `variant ${index + 1}`,
  }))
  let resolveSecond: ((value: string) => void) | null = null
  let rejected = false

  const runPromise = generateOutfitVariantResults({
    aiConfig: {},
    imageGenerator: async (plan) => {
      if (plan.imagePrompt === 'variant 1') throw new Error('image failed')
      return new Promise<string>((resolve) => {
        resolveSecond = resolve
      })
    },
    input,
    now: '2026-05-01T06:00:00.000Z',
    safeInput: input,
    taskId: 'task-2',
    variants,
  }).catch((error: Error) => {
    rejected = true
    throw error
  })

  await Promise.resolve()
  assert.equal(rejected, false)

  resolveSecond?.('data:image/png;base64,2')
  await assert.rejects(runPromise, /image failed/)
  assert.equal(rejected, true)
})
