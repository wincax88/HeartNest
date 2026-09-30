import { createHash, randomBytes } from 'node:crypto'

function privacyError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createPrivacyService({ repositories, versions }) {
  return {
    async acceptConsent(userId, acceptedVersions) {
      for (const [name, expected] of Object.entries(versions)) {
        if (acceptedVersions?.[name] !== expected) throw privacyError(400, 'INVALID_CONSENT_VERSION', '请同意当前版本的隐私政策与用户协议')
      }
      return repositories.recordConsent(userId, versions)
    },

    async requireCurrentConsent(userId) {
      if (!await repositories.hasCurrentConsent(userId, versions)) {
        throw privacyError(403, 'CONSENT_REQUIRED', '继续对话前需要同意当前隐私政策与 AI 数据说明')
      }
    },

    async createExport(userId) {
      const downloadToken = randomBytes(32).toString('base64url')
      const record = await repositories.createDataExport({
        userId,
        downloadTokenHash: hashToken(downloadToken),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      })
      return { ...record, downloadToken }
    },

    async consumeExport(userId, exportId, downloadToken) {
      if (typeof downloadToken !== 'string' || downloadToken.length < 32) {
        throw privacyError(404, 'EXPORT_NOT_FOUND', '导出文件不存在')
      }
      return repositories.consumeDataExport({ userId, exportId, downloadTokenHash: hashToken(downloadToken) })
    },

    requestDeletion(userId) {
      return repositories.requestDeletion(userId, new Date(Date.now() + 7 * 86_400_000))
    },

    cancelDeletion(userId) {
      return repositories.cancelDeletion(userId)
    },

    deleteDueAccounts(now = new Date()) {
      return repositories.deleteDueUsers(now)
    },
  }
}
