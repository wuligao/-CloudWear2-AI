import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import * as path from 'path'
import { ConfigService } from '@vivy-common/config'
import { joinPath } from '../file/upload/upload.storage'
import type { UploadOptions } from '../file/upload/upload.config'

const imageDataUrlPattern = /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/
const imageExtensionMap: Record<string, string> = {
  jpeg: 'jpg',
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
}
const supportedRemoteImageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isImageDataUrl(imageUrl: string) {
  return imageDataUrlPattern.test(imageUrl)
}

export async function persistOutfitImage(imageUrl: string, config: ConfigService) {
  const uploadOptions = config.get<UploadOptions>('upload')
  const existingUploadPath = toUploadRelativeUrl(imageUrl, uploadOptions)
  if (existingUploadPath) return existingUploadPath

  const match = imageUrl.match(imageDataUrlPattern)
  if (match) {
    const imageType = match[1].toLowerCase()
    const base64 = match[2]
    return writeOutfitImage(Buffer.from(base64, 'base64'), imageExtensionMap[imageType] || 'png', uploadOptions)
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    const remoteImage = await readRemoteImage(imageUrl)
    return writeOutfitImage(remoteImage.buffer, remoteImage.extension, uploadOptions)
  }

  return imageUrl
}

export function normalizePersistedOutfitImageUrl(imageUrl: string | undefined, config: ConfigService) {
  if (!imageUrl) return imageUrl

  const uploadOptions = config.get<UploadOptions>('upload')
  return toUploadRelativeUrl(imageUrl, uploadOptions) || imageUrl
}

async function writeOutfitImage(buffer: Buffer, extension: string, uploadOptions: UploadOptions) {
  const now = new Date()
  const relativeDir = joinPath(
    'outfit-records',
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0')
  )
  const filename = `${Date.now()}${randomUUID().replace(/-/g, '')}.${extension}`
  const absoluteDir = path.join(uploadOptions.path, relativeDir)

  await fs.mkdir(absoluteDir, { recursive: true })
  await fs.writeFile(path.join(absoluteDir, filename), buffer)

  return `/${joinPath(uploadOptions.prefix, relativeDir, filename)}`
}

async function readRemoteImage(imageUrl: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`远程图片下载失败：HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || ''
  const extension = supportedRemoteImageTypes[contentType] || getImageExtensionFromUrl(imageUrl)
  if (!extension) {
    throw new Error(`远程图片格式不支持：${contentType || 'unknown'}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.byteLength) {
    throw new Error('远程图片内容为空。')
  }

  return { buffer, extension }
}

function getImageExtensionFromUrl(imageUrl: string) {
  try {
    const extension = path.extname(new URL(imageUrl).pathname).replace('.', '').toLowerCase()
    return Object.values(imageExtensionMap).includes(extension) ? extension : ''
  } catch {
    return ''
  }
}

function toUploadRelativeUrl(imageUrl: string, uploadOptions: UploadOptions) {
  const uploadPrefix = `/${joinPath(uploadOptions.prefix)}`
  if (imageUrl === uploadPrefix || imageUrl.startsWith(`${uploadPrefix}/`)) return imageUrl
  if (imageUrl.startsWith(`${uploadPrefix.slice(1)}/`)) return `/${imageUrl}`

  if (!/^https?:\/\//i.test(imageUrl)) return ''

  try {
    const uploadDomain = uploadOptions.domain ? new URL(uploadOptions.domain) : null
    const image = new URL(imageUrl)
    if (uploadDomain && image.origin !== uploadDomain.origin) return ''
    if (!image.pathname.startsWith(`${uploadPrefix}/`)) return ''

    return image.pathname
  } catch {
    return ''
  }
}

export async function removePersistedOutfitImage(imageUrl: string, config: ConfigService) {
  const uploadOptions = config.get<UploadOptions>('upload')
  const uploadUrlPrefix = joinPath(uploadOptions.domain, uploadOptions.prefix)
  const uploadPathPrefix = `/${joinPath(uploadOptions.prefix)}`
  let relativePath = ''

  if (uploadUrlPrefix && imageUrl.startsWith(uploadUrlPrefix)) {
    relativePath = imageUrl.slice(uploadUrlPrefix.length)
  } else if (imageUrl.startsWith(uploadPathPrefix)) {
    relativePath = imageUrl.slice(uploadPathPrefix.length)
  }

  relativePath = relativePath.replace(/^\/+/, '')
  if (!relativePath.startsWith('outfit-records/')) return

  const uploadRoot = path.resolve(uploadOptions.path)
  const absolutePath = path.resolve(uploadRoot, relativePath)
  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) return

  await fs.unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}
