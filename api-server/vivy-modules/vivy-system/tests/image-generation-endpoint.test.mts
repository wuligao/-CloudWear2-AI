import assert from 'node:assert/strict'
import test from 'node:test'
import { generateImageFromPrompt } from '../dist/modules/outfit/ai/openai.js'

test('generateImageFromPrompt uses Responses image generation for gpt-image-2', async () => {
  let responsesCalled = 0
  let imagesCalled = 0
  const client = {
    responses: {
      create: async (payload: unknown) => {
        responsesCalled += 1
        assert.deepEqual(payload, {
          model: 'gpt-image-2',
          input: 'fashion prompt',
          tools: [
            {
              type: 'image_generation',
              model: 'gpt-image-2',
              size: '1024x1024',
              output_format: 'png',
            },
          ],
          tool_choice: { type: 'image_generation' },
          store: false,
          stream: true,
        })

        return asyncGenerator([
          { type: 'response.created' },
          {
            type: 'response.image_generation_call.partial_image',
            partial_image_b64: 'partial123',
          },
          {
            type: 'response.output_item.done',
            item: {
              type: 'image_generation_call',
              result: 'abc123',
            },
          },
        ])
      },
    },
    images: {
      generate: async () => {
        imagesCalled += 1
        return { data: [] }
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,abc123')
  assert.equal(responsesCalled, 1)
  assert.equal(imagesCalled, 0)
})

test('generateImageFromPrompt can use partial image when stream has no final item result', async () => {
  const client = {
    responses: {
      create: async () =>
        asyncGenerator([
          {
            type: 'response.image_generation_call.partial_image',
            partial_image_b64: 'partial123',
          },
        ]),
    },
    images: {
      generate: async () => {
        throw new Error('Images API should not be called')
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,partial123')
})

test('generateImageFromPrompt reads Responses completed output when provided', async () => {
  const client = {
    responses: {
      create: async () =>
        asyncGenerator([
          {
            type: 'response.completed',
            response: {
              output: [
                {
                  type: 'image_generation_call',
                  result: 'completed123',
                },
              ],
            },
          },
        ]),
    },
    images: {
      generate: async () => {
        throw new Error('Images API should not be called')
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,completed123')
})

test('generateImageFromPrompt retries when Responses stream read fails before image output', async () => {
  let responsesCalled = 0
  const client = {
    responses: {
      create: async () => {
        responsesCalled += 1
        if (responsesCalled === 1) {
          return throwingAsyncGenerator([
            { type: 'response.created' },
            { type: 'response.image_generation_call.generating' },
          ])
        }

        return asyncGenerator([
          {
            type: 'response.output_item.done',
            item: {
              type: 'image_generation_call',
              result: 'retry123',
            },
          },
        ])
      },
    },
    images: {
      generate: async () => {
        throw new Error('Images API should not be called')
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,retry123')
  assert.equal(responsesCalled, 2)
})

test('generateImageFromPrompt retries when Responses stream is terminated before image output', async () => {
  let responsesCalled = 0
  const client = {
    responses: {
      create: async () => {
        responsesCalled += 1
        if (responsesCalled === 1) {
          return throwingAsyncGenerator(
            [
              { type: 'response.created' },
              { type: 'response.image_generation_call.generating' },
            ],
            new TypeError('terminated')
          )
        }

        return asyncGenerator([
          {
            type: 'response.output_item.done',
            item: {
              type: 'image_generation_call',
              result: 'retry-after-terminated',
            },
          },
        ])
      },
    },
    images: {
      generate: async () => {
        throw new Error('Images API should not be called')
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,retry-after-terminated')
  assert.equal(responsesCalled, 2)
})

test('generateImageFromPrompt returns last stream image when read fails after image output', async () => {
  let responsesCalled = 0
  const client = {
    responses: {
      create: async () => {
        responsesCalled += 1
        return throwingAsyncGenerator([
          {
            type: 'response.image_generation_call.partial_image',
            partial_image_b64: 'partial-before-error',
          },
        ])
      },
    },
    images: {
      generate: async () => {
        throw new Error('Images API should not be called')
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'gpt-image-2',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,partial-before-error')
  assert.equal(responsesCalled, 1)
})

test('generateImageFromPrompt keeps Images API for non gpt-image-2 models', async () => {
  let responsesCalled = 0
  let imagesCalled = 0
  const client = {
    responses: {
      create: async () => {
        responsesCalled += 1
        return { output: [] }
      },
    },
    images: {
      generate: async (payload: unknown) => {
        imagesCalled += 1
        assert.deepEqual(payload, {
          model: 'dall-e-3',
          prompt: 'fashion prompt',
          size: '1024x1024',
          response_format: 'b64_json',
        })

        return { data: [{ b64_json: 'def456' }] }
      },
    },
  }

  const imageUrl = await generateImageFromPrompt(
    client as never,
    'dall-e-3',
    'fashion prompt',
    '1024x1024',
    'empty'
  )

  assert.equal(imageUrl, 'data:image/png;base64,def456')
  assert.equal(responsesCalled, 0)
  assert.equal(imagesCalled, 1)
})

async function* asyncGenerator(events: unknown[]) {
  for (const event of events) {
    yield event
  }
}

async function* throwingAsyncGenerator(events: unknown[], error: Error = new Error('stream_read_error')) {
  for (const event of events) {
    yield event
  }
  throw error
}
