import type { Pool } from 'pg';
import { inTransaction } from '../../db/pool';

export interface Challenge {
  code_hash: string;
  created_at: Date;
  expires_at: Date;
  attempts: number;
  consumed_at: Date | null;
}
export interface User {
  id: string;
  phone: string;
}
export type Verification =
  { kind: 'success'; user: User } | { kind: 'invalid' | 'expired' | 'locked' };
export interface AuthRepository {
  saveChallenge(phone: string, hash: string, now: Date, expiresAt: Date): Promise<boolean>;
  consumeChallenge(
    phone: string,
    now: Date,
    matches: (hash: string) => boolean,
  ): Promise<Verification>;
}
export function createAuthRepository(pool: Pool): AuthRepository {
  return {
    async saveChallenge(phone, hash, now, expiresAt) {
      return inTransaction(pool, async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [phone]);
        const current = await client.query<Challenge>(
          'SELECT * FROM otp_challenges WHERE phone = $1 FOR UPDATE',
          [phone],
        );
        if (current.rows[0] && now.getTime() - current.rows[0].created_at.getTime() < 60000)
          return false;
        await client.query(
          `INSERT INTO otp_challenges (phone, code_hash, created_at, expires_at) VALUES ($1,$2,$3,$4)
          ON CONFLICT (phone) DO UPDATE SET code_hash=$2, created_at=$3, expires_at=$4, attempts=0, consumed_at=NULL`,
          [phone, hash, now, expiresAt],
        );
        return true;
      });
    },
    async consumeChallenge(phone, now, matches) {
      return inTransaction(pool, async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [phone]);
        const result = await client.query<Challenge>(
          'SELECT * FROM otp_challenges WHERE phone=$1 FOR UPDATE',
          [phone],
        );
        const challenge = result.rows[0];
        if (!challenge || challenge.consumed_at) return { kind: 'invalid' };
        if (challenge.expires_at <= now) return { kind: 'expired' };
        if (challenge.attempts >= 5) return { kind: 'locked' };
        if (!matches(challenge.code_hash)) {
          await client.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE phone=$1', [
            phone,
          ]);
          return { kind: 'invalid' };
        }
        await client.query('UPDATE otp_challenges SET consumed_at=$2 WHERE phone=$1', [phone, now]);
        const user = await client.query<User>(
          'INSERT INTO users (phone) VALUES ($1) ON CONFLICT (phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id, phone',
          [phone],
        );
        return { kind: 'success', user: user.rows[0]! };
      });
    },
  };
}
