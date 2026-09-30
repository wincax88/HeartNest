const REQUIRED_PRODUCTION_KEYS = [
  'DATABASE_URL',
  'TOKEN_SIGNING_KEY',
  'DATA_ENCRYPTION_KEY',
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

  return {
    nodeEnv,
    databaseUrl: env.DATABASE_URL,
    tokenSigningKey: env.TOKEN_SIGNING_KEY,
    dataEncryptionKey: env.DATA_ENCRYPTION_KEY,
    features: {
      payment: hasAll(env, ['WECHAT_PAY_MCH_ID', 'WECHAT_PAY_PRIVATE_KEY']),
      appPush: hasAll(env, ['APP_PUSH_ENDPOINT', 'APP_PUSH_KEY']),
      phoneLogin: hasAll(env, ['SMS_ENDPOINT', 'SMS_API_KEY']),
    },
  }
}
