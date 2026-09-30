import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createPool, withTransaction } from './client.mjs'

const moduleDirectory = dirname(fileURLToPath(import.meta.url))
const defaultMigrationsDirectory = resolve(moduleDirectory, 'migrations')

export async function runMigrations(pool, migrationsDirectory = defaultMigrationsDirectory) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const files = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
  let applied = 0

  for (const name of files) {
    const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
    if (exists.rowCount) continue
    const sql = await readFile(resolve(migrationsDirectory, name), 'utf8')
    await withTransaction(pool, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock($1)', [20_260_930])
      const recheck = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
      if (recheck.rowCount) return
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
      applied += 1
    })
  }

  return { applied, total: files.length }
}

async function main() {
  const pool = createPool(process.env.DATABASE_URL)
  try {
    const result = await runMigrations(pool)
    console.log(JSON.stringify(result))
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
