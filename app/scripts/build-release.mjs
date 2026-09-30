import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const platform = process.argv[2]
if (!['mp-weixin', 'app'].includes(platform)) throw new Error('Usage: node scripts/build-release.mjs <mp-weixin|app>')

const manifestPath = resolve('src/manifest.json')
const original = await readFile(manifestPath, 'utf8')
const manifest = JSON.parse(original.replace(/\/\*[\s\S]*?\*\//g, ''))
const appId = platform === 'mp-weixin' ? process.env.HEARTNEST_WECHAT_APP_ID : process.env.HEARTNEST_APP_ID
if (!appId?.trim()) throw new Error(`${platform === 'mp-weixin' ? 'HEARTNEST_WECHAT_APP_ID' : 'HEARTNEST_APP_ID'} is required for a release build`)

if (platform === 'mp-weixin') manifest['mp-weixin'].appid = appId.trim()
else manifest.appid = appId.trim()

try {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', platform === 'mp-weixin' ? 'build:mp-weixin' : 'build:app'], { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status ?? 1
} finally {
  await writeFile(manifestPath, original)
}
