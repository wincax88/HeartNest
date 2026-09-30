import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('payment persistence', () => {
  let pool
  let repositories
  let user
  let product

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    user = await repositories.createUser()
    await pool.query("INSERT INTO memberships (user_id, tier) VALUES ($1, 'free')", [user.id])
    product = await repositories.getPaymentProduct('heartnest-pro-monthly')
  })

  afterAll(async () => pool?.end())

  it('grants one membership for duplicate successful callbacks', async () => {
    const order = await repositories.createPaymentOrder({ userId: user.id, product, merchantOrderNo: 'HN-INTEGRATION-1' })
    await repositories.markPaymentOrderPending(order.id, { prepayId: 'prepay' })
    const callback = { merchantOrderNo: order.merchantOrderNo, platformTransactionId: 'wx-integration-1', amount: 1800, currency: 'CNY' }

    await repositories.completePaymentOrder(callback)
    await repositories.completePaymentOrder(callback)

    const grants = await pool.query('SELECT count(*)::int AS count FROM membership_grants WHERE payment_order_id = $1', [order.id])
    const membership = await pool.query('SELECT tier, ends_at FROM memberships WHERE user_id = $1', [user.id])
    expect(grants.rows[0].count).toBe(1)
    expect(membership.rows[0].tier).toBe('pro')
    expect(membership.rows[0].ends_at).toBeInstanceOf(Date)
  })

  it('rejects an amount mismatch without changing membership', async () => {
    const order = await repositories.createPaymentOrder({ userId: user.id, product, merchantOrderNo: 'HN-INTEGRATION-2' })
    await repositories.markPaymentOrderPending(order.id, { prepayId: 'prepay' })

    await expect(repositories.completePaymentOrder({
      merchantOrderNo: order.merchantOrderNo,
      platformTransactionId: 'wx-integration-2',
      amount: 1,
      currency: 'CNY',
    })).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' })
    const membership = await pool.query('SELECT tier FROM memberships WHERE user_id = $1', [user.id])
    expect(membership.rows[0].tier).toBe('free')
  })
})
