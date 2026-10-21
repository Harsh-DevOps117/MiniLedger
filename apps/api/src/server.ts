import pino from 'pino';
import { readConfig } from './config';
import { createPool } from './db/pool';
import { createApp } from './app';
import { createAuthRepository } from './modules/auth/auth.repository';
import { createAuthService } from './modules/auth/auth.service';
import { createLoanRepository } from './modules/loans/loan.repository';
import { createLoanService } from './modules/loans/loan.service';
import { normalizeReceipt } from './modules/loans/receipt.service';
import { systemClock } from './lib/time';

const config = readConfig();
const logger = pino({ level: config.LOG_LEVEL, redact: ['token', 'authorization', 'password'] });
const pool = createPool(config.DATABASE_URL);
pool.on('error', (err) => logger.error({ err }, 'Unexpected idle database connection error'));
const auth = createAuthService({
  repository: createAuthRepository(pool),
  clock: systemClock,
  jwtSecret: config.JWT_SECRET,
  otpSecret: config.OTP_SECRET,
  delivery: {
    send(phone, otp) {
      logger.info({ phone, otp }, 'MOCK OTP — development delivery only');
    },
  },
});
const loans = createLoanService({
  repository: createLoanRepository(pool),
  clock: systemClock,
  processReceipt: normalizeReceipt,
});
const app = createApp({
  config,
  logger,
  auth,
  loans,
  checkDatabase: async () => {
    await pool.query('SELECT 1');
  },
});
const server = app.listen(config.PORT, '0.0.0.0', () =>
  logger.info({ port: config.PORT }, 'MiniLedger API ready'),
);
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Shutting down');
  const timeout = setTimeout(() => process.exit(1), 10000).unref();
  server.close(() => {
    void pool.end().then(() => {
      clearTimeout(timeout);
      process.exit(0);
    });
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
