import type { ReminderSchedule } from '@/domain/models'
import { api, ApiError } from './api'

export function notificationChannel(): ReminderSchedule['channel'] | null {
  const platform = uni.getSystemInfoSync?.().uniPlatform
  if (platform === 'mp-weixin') return 'wechat'
  if (platform === 'app' || platform === 'app-plus') return 'app'
  return null
}

export async function authorizeWechatReminder(templateId: string): Promise<Record<string, string>> {
  // Invoke from the save-button handler before any network request breaks the user gesture.
  await new Promise<void>((resolve, reject) => {
    if (typeof uni.requestSubscribeMessage !== 'function') {
      reject(new ApiError(0, 'SUBSCRIPTION_UNSUPPORTED', '当前微信版本暂不支持订阅提醒，请更新后再试')); return
    }
    uni.requestSubscribeMessage({
      tmplIds: [templateId],
      success(result) {
        const choice = (result as unknown as Record<string, unknown>)[templateId]
        if (choice === 'accept') resolve()
        else reject(new ApiError(0, 'NOTIFICATION_PERMISSION_REQUIRED', '你还没有允许订阅提醒。想收到提醒时，可以再试一次。'))
      },
      fail() { reject(new ApiError(0, 'SUBSCRIPTION_FAILED', '暂时无法获取微信订阅授权，请稍后重试')) },
    })
  })
  const code = await new Promise<string>((resolve, reject) => {
    uni.login({ provider: 'weixin',
      success(result) { result.code ? resolve(result.code) : reject(new ApiError(0, 'INVALID_PROVIDER_CODE', '微信授权未完成，请重试')) },
      fail() { reject(new ApiError(0, 'INVALID_PROVIDER_CODE', '微信授权未完成，请重试')) },
    })
  })
  await api.authorizeNotification({ channel: 'wechat', templateId, code })
  return { templateId }
}

export async function authorizeAppReminder(): Promise<Record<string, string>> {
  if (uni.getAppAuthorizeSetting?.().notificationAuthorized !== 'authorized') {
    throw new ApiError(0, 'NOTIFICATION_PERMISSION_REQUIRED', '请在系统设置中允许心栖发送通知，再保存提醒')
  }
  const token = await new Promise<string>((resolve, reject) => {
    if (typeof uni.getPushClientId !== 'function') {
      reject(new ApiError(0, 'PUSH_UNSUPPORTED', '当前 App 暂不支持推送提醒')); return
    }
    uni.getPushClientId({
      success(result) { result.cid ? resolve(result.cid) : reject(new ApiError(0, 'INVALID_NOTIFICATION_DEVICE', '暂时无法获取设备通知授权，请重试')) },
      fail() { reject(new ApiError(0, 'INVALID_NOTIFICATION_DEVICE', '暂时无法获取设备通知授权，请重试')) },
    })
  })
  await api.registerNotificationDevice({ platform: 'app', token, status: 'active' })
  return { token }
}
