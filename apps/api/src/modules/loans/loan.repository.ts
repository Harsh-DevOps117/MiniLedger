import type { Pool } from 'pg';
import type { CreateLoanInput, Loan, Summary } from '@miniledger/contracts';

const projection = `id, friend_name AS "friendName", amount::text, to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
  CASE WHEN repaid_at IS NULL THEN 'outstanding' ELSE 'repaid' END AS status,
  (repaid_at IS NULL AND due_date < $2::date) AS "isOverdue", (receipt IS NOT NULL) AS "hasReceipt",
  created_at AS "createdAt", repaid_at AS "repaidAt"`;
type LoanRow = Omit<Loan, 'createdAt' | 'repaidAt'> & { createdAt: Date; repaidAt: Date | null };
function toLoan(row: LoanRow): Loan {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    repaidAt: row.repaidAt?.toISOString() ?? null,
  };
}
export interface LoanRepository {
  list(userId: string, today: string, limit: number, offset: number): Promise<Loan[]>;
  create(
    userId: string,
    today: string,
    input: CreateLoanInput,
    receipt: Buffer | null,
  ): Promise<Loan>;
  repay(userId: string, today: string, id: string, now: Date): Promise<Loan | null>;
  summary(userId: string, today: string): Promise<Summary>;
  receipt(userId: string, id: string): Promise<Buffer | null>;
}
export function createLoanRepository(pool: Pool): LoanRepository {
  return {
    async list(userId, today, limit, offset) {
      const result = await pool.query<LoanRow>(
        `SELECT ${projection} FROM loans WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`,
        [userId, today, limit, offset],
      );
      return result.rows.map(toLoan);
    },
    async create(userId, today, input, receipt) {
      const result = await pool.query<LoanRow>(
        `INSERT INTO loans (user_id,friend_name,amount,due_date,receipt) VALUES ($1,$3,$4,$5,$6) RETURNING ${projection}`,
        [userId, today, input.friendName, input.amount, input.dueDate, receipt],
      );
      return toLoan(result.rows[0]!);
    },
    async repay(userId, today, id, now) {
      const result = await pool.query<LoanRow>(
        `UPDATE loans SET repaid_at=COALESCE(repaid_at,$4) WHERE user_id=$1 AND id=$3 RETURNING ${projection}`,
        [userId, today, id, now],
      );
      return result.rows[0] ? toLoan(result.rows[0]) : null;
    },
    async summary(userId, today) {
      const result = await pool.query<Omit<Summary, 'currency' | 'asOf'>>(
        `SELECT
        COALESCE(SUM(amount),0)::numeric(20,2)::text AS "totalLent",
        COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NOT NULL),0)::numeric(20,2)::text AS "totalRepaid",
        COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NULL),0)::numeric(20,2)::text AS outstanding,
        COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NULL AND due_date < $2::date),0)::numeric(20,2)::text AS "overdueAmount"
        FROM loans WHERE user_id=$1`,
        [userId, today],
      );
      return { ...result.rows[0]!, currency: 'INR', asOf: today };
    },
    async receipt(userId, id) {
      const result = await pool.query<{ receipt: Buffer | null }>(
        'SELECT receipt FROM loans WHERE user_id=$1 AND id=$2',
        [userId, id],
      );
      return result.rows[0]?.receipt ?? null;
    },
  };
}
