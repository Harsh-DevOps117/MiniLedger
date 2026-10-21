import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requestOtpSchema, verifyOtpSchema } from '@miniledger/contracts';
import type { AuthService } from './auth.service';

export function authRouter(service: AuthService, rateLimits: boolean) {
  const router = Router();
  if (rateLimits)
    router.use(
      rateLimit({
        windowMs: 15 * 60000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many sign-in attempts. Please try again in 15 minutes.',
          },
        },
      }),
    );
  router.post('/request-otp', async (req, res) => {
    const { phone } = requestOtpSchema.parse(req.body);
    res.json(await service.requestOtp(phone));
  });
  router.post('/verify-otp', async (req, res) => {
    const { phone, otp } = verifyOtpSchema.parse(req.body);
    res.json(await service.verifyOtp(phone, otp));
  });
  return router;
}
