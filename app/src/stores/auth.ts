import { defineStore } from 'pinia'
import type { BootstrapData } from '@/domain/models'
import { ApiError, api, setSession, type ConsentVersions } from '@/services/api'

const currentConsent: ConsentVersions = {
  privacyVersion: '2026-09-30',
  termsVersion: '2026-09-30',
  aiVersion: '2026-09-30',
}

function wechatProvider(): 'wechat_mini_program' | 'wechat_app' | 'wechat_h5' {
  let provider: 'wechat_mini_program' | 'wechat_app' | 'wechat_h5' = 'wechat_mini_program'
  // #ifdef APP-PLUS
  provider = 'wechat_app'
  // #endif
  // #ifdef H5
  provider = 'wechat_h5'
  // #endif
  return provider
}

function requestWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => result.code ? resolve(result.code) : reject(new Error('微信未返回授权码')),
      fail: (error) => reject(new Error(error.errMsg || '微信登录失败')),
    })
  })
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ pendingConsent: false, authenticated: false, loading: false }),
  actions: {
    prepareConsent() {
      this.pendingConsent = true
    },
    async loginWithWechat() {
      this.loading = true
      try {
        const session = await api.loginWithProvider(wechatProvider(), await requestWechatCode())
        setSession(session)
        this.authenticated = true
        if (this.pendingConsent) {
          await api.acceptConsent(currentConsent)
          this.pendingConsent = false
        }
      } finally {
        this.loading = false
      }
    },
    async authorizedBootstrap(): Promise<BootstrapData> {
      try {
        return await api.bootstrap()
      } catch (error) {
        if (!(error instanceof ApiError) || !['TOKEN_EXPIRED', 'INVALID_ACCESS_TOKEN'].includes(error.code)) throw error
        await api.refreshSession()
        return api.bootstrap()
      }
    },
    async logout() {
      await api.logout()
      this.authenticated = false
    },
  },
})
