import { expect, it } from 'vitest';
import { readConfig } from '../../apps/api/src/config';
it('fails fast on missing secrets without echoing their values', () => {
  expect(() =>
    readConfig({
      DATABASE_URL: 'postgresql://localhost/demo',
      JWT_SECRET: 'secret',
      OTP_SECRET: 'secret',
    }),
  ).toThrow('Invalid environment');
});
