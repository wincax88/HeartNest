import sharp from 'sharp'

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const avatarIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function avatarError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

export function createAvatarService({ repositories }) {
  return {
    async upload(userId, file) {
      if (!file?.buffer?.length) throw avatarError(400, 'AVATAR_REQUIRED', '请选择一张头像图片')
      if (file.buffer.length > MAX_AVATAR_BYTES) throw avatarError(413, 'AVATAR_TOO_LARGE', '请选择不超过 2 MB 的图片')
      let data
      try {
        const image = sharp(file.buffer, { limitInputPixels: 16_000_000, failOn: 'warning' })
        const metadata = await image.metadata()
        if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error('Unsupported image')
        data = await image.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
      } catch {
        throw avatarError(400, 'INVALID_AVATAR_IMAGE', '请使用有效的 JPG、PNG 或 WebP 图片')
      }
      const id = await repositories.saveUserAvatar(userId, data)
      return { avatarUrl: `/api/avatars/${id}` }
    },
    async getPublished(id) {
      if (!avatarIdPattern.test(id)) throw avatarError(404, 'AVATAR_NOT_FOUND', '头像不存在')
      const avatar = await repositories.getPublishedAvatar(id)
      if (!avatar) throw avatarError(404, 'AVATAR_NOT_FOUND', '头像不存在')
      return avatar
    },
  }
}
