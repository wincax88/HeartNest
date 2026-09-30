import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../server/config.mjs'

describe('loadConfig', () => {
  it('rejects production startup without database and token keys', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('DATABASE_URL')
  })

  it('rejects production startup without Mini Program credentials', () => {
    expect(() => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://test',
      TOKEN_SIGNING_KEY: 'x'.repeat(32),
      DATA_ENCRYPTION_KEY: 'y'.repeat(32),
    })).toThrow('WECHAT_MINI_APP_ID')
  })

  it('starts production with Mini Program credentials while App and H5 remain optional', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://test',
      TOKEN_SIGNING_KEY: 'x'.repeat(32),
      DATA_ENCRYPTION_KEY: 'y'.repeat(32),
      WECHAT_MINI_APP_ID: 'mini-app',
      WECHAT_MINI_SECRET: 'mini-secret',
    })

    expect(config.wechat.appId).toBeUndefined()
    expect(config.wechat.h5AppId).toBeUndefined()
  })

  it('keeps optional platform capabilities disabled without credentials', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test',
      TOKEN_SIGNING_KEY: 'x'.repeat(32),
      DATA_ENCRYPTION_KEY: 'y'.repeat(32),
    })

    expect(config.features).toEqual({
      payment: false,
      appPush: false,
      phoneLogin: false,
    })
  })

  it('enables optional capabilities only when their complete credential set is present', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test',
      TOKEN_SIGNING_KEY: 'x'.repeat(32),
      DATA_ENCRYPTION_KEY: 'y'.repeat(32),
      WECHAT_PAY_MCH_ID: 'merchant',
      WECHAT_PAY_APP_ID: 'payment-app',
      WECHAT_PAY_PRIVATE_KEY: 'private-key',
      WECHAT_PAY_MERCHANT_SERIAL: 'merchant-serial',
      WECHAT_PAY_PLATFORM_CERTIFICATE: 'platform-certificate',
      WECHAT_PAY_PLATFORM_SERIAL: 'platform-serial',
      WECHAT_PAY_API_V3_KEY: 'z'.repeat(32),
      WECHAT_PAY_NOTIFY_URL: 'https://api.example.test/api/payments/wechat/callback',
      APP_PUSH_ENDPOINT: 'https://push.example.test',
      APP_PUSH_KEY: 'push-key',
      SMS_ENDPOINT: 'https://sms.example.test',
      SMS_API_KEY: 'sms-key',
    })

    expect(config.features).toEqual({
      payment: true,
      appPush: true,
      phoneLogin: true,
    })
  })

  it('exposes server-only WeChat identity credentials without marking incomplete providers ready', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test',
      TOKEN_SIGNING_KEY: 'x'.repeat(32),
      DATA_ENCRYPTION_KEY: 'y'.repeat(32),
      WECHAT_MINI_APP_ID: 'mini-app',
      WECHAT_MINI_SECRET: 'mini-secret',
    })

    expect(config.wechat).toEqual({
      miniAppId: 'mini-app',
      miniSecret: 'mini-secret',
      appId: undefined,
      appSecret: undefined,
      h5AppId: undefined,
      h5Secret: undefined,
    })
  })
})
