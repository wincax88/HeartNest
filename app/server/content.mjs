function contentError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function createContentService({ repositories, avatarOrigins = [] }) {
  return {
    async updateProfile(userId, patch) {
      const displayName = patch.displayName?.trim()
      if (!displayName || displayName.length > 30) throw contentError(400, 'INVALID_DISPLAY_NAME', '昵称必须为 1–30 个字符')
      let avatarUrl = patch.avatarUrl || null
      if (avatarUrl) {
        let parsed
        try { parsed = new URL(avatarUrl) } catch { throw contentError(400, 'INVALID_AVATAR_URL', '头像地址无效') }
        if (parsed.protocol !== 'https:' || !avatarOrigins.includes(parsed.origin)) throw contentError(400, 'INVALID_AVATAR_URL', '头像地址不受支持')
        avatarUrl = parsed.toString()
      }
      return repositories.updateUserProfile(userId, { displayName, avatarUrl })
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
