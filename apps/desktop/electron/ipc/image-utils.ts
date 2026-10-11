import { nativeImage } from 'electron'
import fs from 'fs'
import path from 'path'

const DEFAULT_THUMBNAIL_MAX_DIMENSION = 400

export function getThumbnailPaths(assetPath: string): { bigThumbnailPath: string; smallThumbnailPath: string } {
  const parsed = path.parse(assetPath)
  return {
    bigThumbnailPath: path.join(parsed.dir, `${parsed.name}_big_thumbnail.png`),
    smallThumbnailPath: path.join(parsed.dir, `${parsed.name}_small_thumbnail.png`),
  }
}

export function createDownsampledThumbnail(
  sourcePath: string,
  outputPath: string,
  maxDimension = DEFAULT_THUMBNAIL_MAX_DIMENSION,
): void {
  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) throw new Error(`Cannot read image: ${sourcePath}`)
  const { width, height } = image.getSize()
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const thumbnail = scale < 1
    ? image.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), quality: 'best' })
    : image
  fs.writeFileSync(outputPath, thumbnail.toPNG())
}

export function getImageDimensions(sourcePath: string): { width: number; height: number } {
  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) throw new Error(`Cannot read image: ${sourcePath}`)
  return image.getSize()
}
