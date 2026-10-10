import assert from 'node:assert/strict'
import test from 'node:test'

import { visualAssetMetadataMigrationKey } from './project-asset-metadata-migration.ts'

const missingImage = (id, path) => ({
  id,
  type: 'image',
  path,
  prompt: '',
  resolution: '',
  createdAt: 1,
})

test('unresolved visual metadata has a stable key across unrelated project saves', () => {
  const first = missingImage('image-1', 'assets/red.png')
  const key = visualAssetMetadataMigrationKey([first])

  assert.equal(visualAssetMetadataMigrationKey([{ ...first, prompt: 'edited' }]), key)
  assert.notEqual(visualAssetMetadataMigrationKey([first, missingImage('image-2', 'assets/blue.png')]), key)
  assert.equal(visualAssetMetadataMigrationKey([{
    ...first,
    width: 64,
    height: 64,
    bigThumbnailPath: 'assets/red-big.png',
    smallThumbnailPath: 'assets/red-small.png',
  }]), '[]')
})
