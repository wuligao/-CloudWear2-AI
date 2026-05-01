import assert from 'node:assert/strict'
import test from 'node:test'
import { buildH5ProfileOverview, buildH5StyleArchive } from '../src/modules/outfit/h5-profile-overview.ts'

test('buildH5ProfileOverview derives quota and order counts from record summary', () => {
  const overview = buildH5ProfileOverview({
    dailyLimit: 50,
    generatedToday: 18,
    recordSummary: {
      all: 31,
      running: 3,
      succeeded: 26,
      failed: 2,
    },
  })

  assert.equal(overview.stats.dailyGenerated, 18)
  assert.equal(overview.stats.dailyLimit, 50)
  assert.equal(overview.stats.remainingToday, 32)
  assert.equal(overview.orderStatuses[0].count, 31)
  assert.equal(overview.orderStatuses[1].count, 3)
  assert.equal(overview.orderStatuses[2].count, 26)
  assert.equal(overview.orderStatuses[3].count, 2)
  assert.equal(overview.orderStatuses[2].href, '/history?status=succeeded')
})

test('buildH5StyleArchive merges saved style profile into the archive', () => {
  const archive = buildH5StyleArchive([], { displayName: 'Luna' }, {
    height: '168cm',
    weight: '52kg',
    clothingSize: 'M',
    shoeSize: '38',
    favoriteStyles: ['法式通勤', '松弛休闲'],
    favoriteColors: ['黑色', '燕麦色'],
    elementPreferences: ['针织', '高腰线'],
    fitPreferences: ['直筒', '微宽松'],
    bodyMetrics: {
      shoulder: '38cm',
      waist: '66cm',
    },
  })

  assert.equal(archive.profile.displayName, 'Luna')
  assert.equal(archive.profile.height, '168cm')
  assert.equal(archive.profile.weight, '52kg')
  assert.equal(archive.profile.clothingSize, 'M')
  assert.equal(archive.profile.shoeSize, '38')
  assert.deepEqual(
    archive.stylePreferences.map((item) => item.label),
    ['法式通勤', '松弛休闲']
  )
  assert.deepEqual(
    archive.colorPreferences.map((item) => item.label),
    ['黑色', '燕麦色']
  )
  assert.deepEqual(archive.elementPreferences, ['针织', '高腰线'])
  assert.deepEqual(
    archive.fitTypes.map((item) => item.label),
    ['直筒', '微宽松']
  )
  assert.equal(archive.bodyMetrics.find((item) => item.id === 'shoulder')?.value, '38cm')
  assert.equal(archive.bodyMetrics.find((item) => item.id === 'waist')?.value, '66cm')
})
