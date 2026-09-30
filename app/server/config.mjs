const REQUIRED_PRODUCTION_KEYS = [
  'DATABASE_URL',
  'TOKEN_SIGNING_KEY',
  'DATA_ENCRYPTION_KEY',
  'WECHAT_MINI_APP_ID',
  'WECHAT_MINI_SECRET',
  'WECHAT_APP_ID',
  'WECHAT_APP_SECRET',
  'WECHAT_H5_APP_ID',
  'WECHAT_H5_SECRET',
]

function hasAll(env, names) {
  return names.every((name) => typeof env[name] === 'string' && env[name].trim().length > 0)
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'

  if (nodeEnv === 'production') {
    for (const name of REQUIRED_PRODUCTION_KEYS) {
      if (!hasAll(env, [name])) throw new Error(`Missing required configuration: ${name}`)
    }
  }

  const wechatPay = {
    mchId: env.WECHAT_PAY_MCH_ID,
    appId: env.WECHAT_PAY_APP_ID || env.WECHAT_APP_ID,
    privateKey: env.WECHAT_PAY_PRIVATE_KEY,
    merchantSerial: env.WECHAT_PAY_MERCHANT_SERIAL,
    platformCertificate: env.WECHAT_PAY_PLATFORM_CERTIFICATE,
    platformCertificateSerial: env.WECHAT_PAY_PLATFORM_SERIAL,
    apiV3Key: env.WECHAT_PAY_API_V3_KEY,
    notifyUrl: env.WECHAT_PAY_NOTIFY_URL,
  }

  return {
    nodeEnv,
    databaseUrl: env.DATABASE_URL,
    tokenSigningKey: env.TOKEN_SIGNING_KEY,
    dataEncryptionKey: env.DATA_ENCRYPTION_KEY,
    wechat: {
      miniAppId: env.WECHAT_MINI_APP_ID,
      miniSecret: env.WECHAT_MINI_SECRET,
      appId: env.WECHAT_APP_ID,
      appSecret: env.WECHAT_APP_SECRET,
      h5AppId: env.WECHAT_H5_APP_ID,
      h5Secret: env.WECHAT_H5_SECRET,
    },
    wechatPay,
    features: {
      payment: Object.values(wechatPay).every((value) => typeof value === 'string' && value.trim().length > 0),
      appPush: hasAll(env, ['APP_PUSH_ENDPOINT', 'APP_PUSH_KEY']),
      phoneLogin: hasAll(env, ['SMS_ENDPOINT', 'SMS_API_KEY']),
    },
  }
}
