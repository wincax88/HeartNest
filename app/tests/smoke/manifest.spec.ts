import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/manifest.json'), 'utf8')
const manifest = JSON.parse(source.replace(/\/\*[\s\S]*?\*\//g, ''))

describe('release manifest', () => {
  it('does not request unused Android sensitive permissions', () => {
    const permissions = manifest['app-plus'].distribute.android.permissions.join('\n')
    for (const forbidden of ['READ_LOGS', 'GET_ACCOUNTS', 'READ_PHONE_STATE', 'WRITE_SETTINGS', 'CAMERA', 'FLASHLIGHT']) {
      expect(permissions).not.toContain(forbidden)
    }
  })

  it('enables WeChat URL validation for release builds', () => {
    expect(manifest['mp-weixin'].setting.urlCheck).toBe(true)
  })

  it('contains the production WeChat mini program AppID', () => {
    expect(manifest['mp-weixin'].appid).toBe('wxf398149aa702daae')
  })
})
