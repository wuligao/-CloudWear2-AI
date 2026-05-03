import assert from 'node:assert/strict'
import test from 'node:test'
import * as profileDto from '../dist/modules/outfit/h5-profile.dto.js'

const profileDtoModule = (
  'h5StyleProfileFeedbackSchema' in profileDto
    ? profileDto
    : (profileDto as unknown as { default: typeof profileDto }).default
) as typeof profileDto
const { h5StyleProfileFeedbackSchema } = profileDtoModule

test('h5StyleProfileFeedbackSchema accepts a generated look feedback payload', () => {
  const parsed = h5StyleProfileFeedbackSchema.parse({
    feedback: '喜欢这套',
    generation: {
      outfitTitle: '清爽通勤方案',
      style: '简约通勤',
      colorPreference: '黑白灰',
      occasion: '日常通勤',
      styleTags: ['通勤', '简约'],
      items: [
        {
          category: '外套',
          name: '短款西装',
        },
      ],
    },
  })

  assert.equal(parsed.feedback, '喜欢这套')
  assert.equal(parsed.generation.style, '简约通勤')
  assert.deepEqual(parsed.generation.styleTags, ['通勤', '简约'])
})
