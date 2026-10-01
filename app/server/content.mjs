function contentError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function createContentService({ repositories, avatarOrigins = [] }) {
  return {
    async updateProfile(userId, patch) {
      const displayName = typeof patch.displayName === 'string' ? patch.displayName.trim() : ''
      if (!displayName || displayName.length > 30) throw contentError(400, 'INVALID_DISPLAY_NAME', '昵称必须为 1–30 个字符')
      if (patch.avatarUrl != null && typeof patch.avatarUrl !== 'string') throw contentError(400, 'INVALID_AVATAR_URL', '头像地址无效')
      let avatarUrl = patch.avatarUrl === undefined ? undefined : (patch.avatarUrl || null)
      if (avatarUrl) {
        if (!/^\/api\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(avatarUrl)) {
          let parsed
          try { parsed = new URL(avatarUrl) } catch { throw contentError(400, 'INVALID_AVATAR_URL', '头像地址无效') }
          if (parsed.protocol !== 'https:' || !avatarOrigins.includes(parsed.origin)) throw contentError(400, 'INVALID_AVATAR_URL', '头像地址不受支持')
          if (parsed.pathname.startsWith('/api/avatars/')) {
            if (!/^\/api\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(parsed.pathname)) throw contentError(400, 'INVALID_AVATAR_URL', '头像地址无效')
            avatarUrl = parsed.pathname
          } else avatarUrl = parsed.toString()
        }
      }
      const user = await repositories.updateUserProfile(userId, { displayName, avatarUrl })
      return { displayName: user.displayName, avatar: user.avatarUrl || null }
    },
    favoriteMessage: (userId, messageId) => repositories.favoriteMessage(userId, messageId),
    listFavorites: (userId) => repositories.listFavorites(userId),
    deleteFavorite: (userId, favoriteId) => repositories.deleteFavorite(userId, favoriteId),
    review(userId, filters = {}) {
      const from = filters.from || '1970-01-01'
      const to = filters.to || '9999-12-31'
      if (!validDate(from) || !validDate(to) || from > to) throw contentError(400, 'INVALID_DATE_RANGE', '日期范围无效')
      return repositories.reviewMoodRecords(userId, { from, to, mood: filters.mood || null })
    },
  }
}
