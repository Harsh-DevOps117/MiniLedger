import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Session } from '@miniledger/contracts';
import type { AuthRepository } from './auth.repository';
import { AppError } from '../../lib/errors';
import type { Clock } from '../../lib/time';

export interface OtpDelivery {
  send(phone: string, otp: string): void;
}
export function createAuthService(deps: {
  repository: AuthRepository;
  delivery: OtpDelivery;
  clock: Clock;
  otpSecret: string;
  jwtSecret: string;
}) {
  const hash = (phone: string, otp: string) =>
    createHmac('sha256', deps.otpSecret).update(`${phone}:${otp}`).digest('hex');
  return {
    async requestOtp(phone: string) {
      const otp = String(randomInt(100000, 1000000));
      const now = deps.clock();
      const saved = await deps.repository.saveChallenge(
        phone,
        hash(phone, otp),
        now,
        new Date(now.getTime() + 300000),
      );
      if (!saved)
        throw new AppError(
          429,
          'OTP_COOLDOWN',
          'Please wait 60 seconds before requesting another code.',
        );
      deps.delivery.send(phone, otp);
      return {
        message: 'Code sent. In this demo, check the API server log.',
        expiresInSeconds: 300,
        retryAfterSeconds: 60,
      };
    },
    async verifyOtp(phone: string, otp: string): Promise<Session> {
      const candidate = Buffer.from(hash(phone, otp), 'hex');
      const result = await deps.repository.consumeChallenge(phone, deps.clock(), (stored) =>
        timingSafeEqual(candidate, Buffer.from(stored, 'hex')),
      );
      if (result.kind !== 'success') {
        const messages = {
          invalid: 'The code is incorrect or already used.',
          expired: 'This code has expired. Request a new one.',
          locked: 'Too many incorrect attempts. Request a new code after the cooldown.',
        };
        throw new AppError(
          result.kind === 'locked' ? 429 : 401,
          `OTP_${result.kind.toUpperCase()}`,
          messages[result.kind],
        );
      }
      return {
        token: jwt.sign({}, deps.jwtSecret, {
          subject: result.user.id,
          issuer: 'miniledger',
          audience: 'miniledger-app',
          expiresIn: '1d',
          algorithm: 'HS256',
        }),
        user: result.user,
      };
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
