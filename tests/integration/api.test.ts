import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import { createPool } from '../../apps/api/src/db/pool';
import { migrate } from '../../apps/api/src/db/migrate';
import { readConfig } from '../../apps/api/src/config';
import { createApp } from '../../apps/api/src/app';
import { createAuthRepository } from '../../apps/api/src/modules/auth/auth.repository';
import { createAuthService } from '../../apps/api/src/modules/auth/auth.service';
import { createLoanRepository } from '../../apps/api/src/modules/loans/loan.repository';
import { createLoanService } from '../../apps/api/src/modules/loans/loan.service';
import { normalizeReceipt } from '../../apps/api/src/modules/loans/receipt.service';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error(
    'Set TEST_DATABASE_URL to a dedicated database whose name ends in _test. These tests truncate its tables.',
  );
const pool = createPool(url);
const config = readConfig({
  DATABASE_URL: url,
  JWT_SECRET: 'integration-jwt-secret-at-least-32-characters',
  OTP_SECRET: 'integration-otp-secret-at-least-32-characters',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
});
let now = new Date('2026-10-21T12:00:00Z');
const codes = new Map<string, string>();
const auth = createAuthService({
  repository: createAuthRepository(pool),
  clock: () => now,
  delivery: {
    send: (phone, otp) => {
      codes.set(phone, otp);
    },
  },
  jwtSecret: config.JWT_SECRET,
  otpSecret: config.OTP_SECRET,
});
const loans = createLoanService({
  repository: createLoanRepository(pool),
  clock: () => now,
  processReceipt: normalizeReceipt,
});
const deps = {
  config,
  logger: pino({ level: 'silent' }),
  auth,
  loans,
  checkDatabase: async () => {
    await pool.query('SELECT 1');
  },
};
const app = createApp({ ...deps, rateLimits: false });
const phone = '+919876543210';
async function login(number = phone): Promise<string> {
  await request(app).post('/api/auth/request-otp').send({ phone: number }).expect(200);
  const response = await request(app)
    .post('/api/auth/verify-otp')
    .send({ phone: number, otp: codes.get(number) })
    .expect(200);
  return response.body.token as string;
}
async function add(token: string, amount = '100.10', dueDate = '2026-10-20') {
  return request(app)
    .post('/api/loans')
    .auth(token, { type: 'bearer' })
    .send({ friendName: 'Aditi', amount, dueDate })
    .expect(201);
}
beforeAll(async () => {
  await migrate(pool);
});
beforeEach(async () => {
  await pool.query('TRUNCATE loans, users, otp_challenges CASCADE');
  now = new Date('2026-10-21T12:00:00Z');
  codes.clear();
});
afterAll(async () => {
  await pool.end();
});

describe('OTP authentication with PostgreSQL', () => {
  it('stores only keyed hashes, rejects cooldown requests and prevents replay', async () => {
    const token = await login();
    expect(token).toBeTruthy();
    const stored = await pool.query('SELECT code_hash FROM otp_challenges WHERE phone=$1', [phone]);
    expect(stored.rows[0].code_hash).toHaveLength(64);
    expect(stored.rows[0].code_hash).not.toBe(codes.get(phone));
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: codes.get(phone) })
      .expect(401);
    await request(app).post('/api/auth/request-otp').send({ phone }).expect(429);
  });
  it('allows only one concurrent verification of a code', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone }).expect(200);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post('/api/auth/verify-otp')
          .send({ phone, otp: codes.get(phone) }),
      ),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([200, 401]);
    expect((await pool.query('SELECT count(*) FROM users')).rows[0].count).toBe('1');
  });
  it('allows only one concurrent initial OTP request', async () => {
    const responses = await Promise.all(
      [1, 2].map(() => request(app).post('/api/auth/request-otp').send({ phone })),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([200, 429]);
  });
  it('locks verification after five failed attempts', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone }).expect(200);
    for (let i = 0; i < 5; i++)
      await request(app).post('/api/auth/verify-otp').send({ phone, otp: '000000' }).expect(401);
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: codes.get(phone) })
      .expect(429);
  });
  it('rejects expired codes and allows resend after the cooldown', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone }).expect(200);
    now = new Date(now.getTime() + 300001);
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: codes.get(phone) })
      .expect(401);
    expect(response.body.error.code).toBe('OTP_EXPIRED');
    await login();
  });
  it('returns validation errors without exposing raw internals', async () => {
    const response = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone: 'hello' })
      .expect(400);
    expect(response.body.error.details[0].field).toBe('phone');
    expect(response.body.error.stack).toBeUndefined();
    await request(app)
      .post('/api/auth/request-otp')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
  });
});
describe('ledger behavior and ownership', () => {
  it('starts with a zero summary and requires authentication', async () => {
    await request(app).get('/api/loans').expect(401);
    const token = await login();
    const response = await request(app)
      .get('/api/loans/summary')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(response.body).toEqual({
      totalLent: '0.00',
      totalRepaid: '0.00',
      outstanding: '0.00',
      overdueAmount: '0.00',
      currency: 'INR',
      asOf: '2026-10-21',
    });
  });
  it('calculates exact totals, excludes today/future from overdue, and repays idempotently', async () => {
    const token = await login();
    const overdue = await add(token, '0.10');
    await add(token, '0.20', '2026-10-21');
    await add(token, '1.00', '2026-10-22');
    expect(overdue.body.isOverdue).toBe(true);
    const before = await request(app).get('/api/loans/summary').auth(token, { type: 'bearer' });
    expect(before.body.totalLent).toBe('1.30');
    expect(before.body.overdueAmount).toBe('0.10');
    const first = await request(app)
      .patch(`/api/loans/${overdue.body.id}/repay`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    now = new Date(now.getTime() + 1000);
    const second = await request(app)
      .patch(`/api/loans/${overdue.body.id}/repay`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(first.body.repaidAt).toBe(second.body.repaidAt);
    expect(second.body.isOverdue).toBe(false);
    const after = await request(app).get('/api/loans/summary').auth(token, { type: 'bearer' });
    expect(after.body).toMatchObject({
      totalLent: '1.30',
      totalRepaid: '0.10',
      outstanding: '1.20',
      overdueAmount: '0.00',
    });
  });
  it('isolates list, summary, repayments and receipts between users', async () => {
    const alice = await login();
    const bob = await login('+919876543211');
    const entry = await add(alice);
    await request(app)
      .patch(`/api/loans/${entry.body.id}/repay`)
      .auth(bob, { type: 'bearer' })
      .expect(404);
    await request(app)
      .get(`/api/loans/${entry.body.id}/receipt`)
      .auth(bob, { type: 'bearer' })
      .expect(404);
    const list = await request(app).get('/api/loans').auth(bob, { type: 'bearer' });
    expect(list.body.entries).toEqual([]);
    const totals = await request(app).get('/api/loans/summary').auth(bob, { type: 'bearer' });
    expect(totals.body.totalLent).toBe('0.00');
  });
  it('handles concurrent repayment without counting twice', async () => {
    const token = await login();
    const entry = await add(token);
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app).patch(`/api/loans/${entry.body.id}/repay`).auth(token, { type: 'bearer' }),
      ),
    );
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(results[0]!.body.repaidAt).toBe(results[1]!.body.repaidAt);
    const totals = await request(app).get('/api/loans/summary').auth(token, { type: 'bearer' });
    expect(totals.body.totalRepaid).toBe('100.10');
  });
  it('paginates without leaking receipt blobs and validates query parameters', async () => {
    const token = await login();
    await add(token);
    await add(token);
    await add(token);
    const first = await request(app)
      .get('/api/loans?limit=2')
      .auth(token, { type: 'bearer' })
      .expect(200);
    const second = await request(app)
      .get('/api/loans?limit=2&offset=2')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(first.body.nextOffset).toBe(2);
    expect(second.body.nextOffset).toBeNull();
    expect(new Set([...first.body.entries, ...second.body.entries].map((row) => row.id)).size).toBe(
      3,
    );
    expect(first.body.entries[0].receipt).toBeUndefined();
    await request(app).get('/api/loans?limit=500').auth(token, { type: 'bearer' }).expect(400);
  });
  it('rejects bad dates, UUIDs, and money before writing', async () => {
    const token = await login();
    for (const input of [
      { friendName: '', amount: '10', dueDate: '2026-10-21' },
      { friendName: 'A', amount: '-1', dueDate: '2026-10-21' },
      { friendName: 'A', amount: '1.123', dueDate: '2026-10-21' },
      { friendName: 'A', amount: '1', dueDate: '2026-02-30' },
    ]) {
      await request(app).post('/api/loans').auth(token, { type: 'bearer' }).send(input).expect(400);
    }
    await request(app)
      .patch('/api/loans/not-a-uuid/repay')
      .auth(token, { type: 'bearer' })
      .expect(400);
    expect((await pool.query('SELECT count(*) FROM loans')).rows[0].count).toBe('0');
  });
  it('atomically stores a valid receipt and enforces ownership when reading it', async () => {
    const token = await login();
    const other = await login('+919876543211');
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } })
      .png()
      .toBuffer();
    const entry = await request(app)
      .post('/api/loans')
      .auth(token, { type: 'bearer' })
      .field('friendName', 'Receipt friend')
      .field('amount', '25')
      .field('dueDate', '2026-10-22')
      .attach('receipt', png, 'receipt.png')
      .expect(201);
    expect(entry.body.hasReceipt).toBe(true);
    const photo = await request(app)
      .get(`/api/loans/${entry.body.id}/receipt`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(photo.body.dataUri).toMatch(/^data:image\/jpeg;base64,/);
    await request(app)
      .get(`/api/loans/${entry.body.id}/receipt`)
      .auth(other, { type: 'bearer' })
      .expect(404);
  });
  it('rejects fake and oversized receipt files without creating a loan', async () => {
    const token = await login();
    for (const [buffer, status] of [
      [Buffer.from('not an image'), 400],
      [Buffer.alloc(2097153), 413],
    ] as const) {
      await request(app)
        .post('/api/loans')
        .auth(token, { type: 'bearer' })
        .field('friendName', 'A')
        .field('amount', '10')
        .field('dueDate', '2026-10-21')
        .attach('receipt', buffer, 'fake.jpg')
        .expect(status);
    }
    expect((await pool.query('SELECT count(*) FROM loans')).rows[0].count).toBe('0');
  });
  it('rejects expired or tampered sessions', async () => {
    const token = await login();
    const expired = jwt.sign({}, config.JWT_SECRET, {
      subject: '00000000-0000-4000-8000-000000000000',
      issuer: 'miniledger',
      audience: 'miniledger-app',
      expiresIn: -1,
    });
    await request(app).get('/api/loans').auth(expired, { type: 'bearer' }).expect(401);
    await request(app).get('/api/loans').auth(`${token}tampered`, { type: 'bearer' }).expect(401);
  });
});
describe('operational safeguards', () => {
  it('runs migrations twice safely and reports healthy readiness', async () => {
    await migrate(pool);
    await request(app).get('/health').expect(200);
    await request(app).get('/ready').expect(200);
    const unavailable = createApp({
      ...deps,
      checkDatabase: async () => {
        throw new Error('offline');
      },
      rateLimits: false,
    });
    await request(unavailable).get('/ready').expect(503);
  });
  it('limits authentication traffic with a structured error', async () => {
    const limited = createApp(deps);
    for (let i = 0; i < 30; i++)
      await request(limited).post('/api/auth/request-otp').send({ phone: 'bad' }).expect(400);
    const response = await request(limited)
      .post('/api/auth/request-otp')
      .send({ phone: 'bad' })
      .expect(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
