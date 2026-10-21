import type { CreateLoanInput } from '@miniledger/contracts';
import type { LoanRepository } from './loan.repository';
import { AppError } from '../../lib/errors';
import { utcToday, type Clock } from '../../lib/time';

export function createLoanService(deps: {
  repository: LoanRepository;
  clock: Clock;
  processReceipt: (buffer: Buffer) => Promise<Buffer>;
}) {
  return {
    async list(userId: string, limit: number, offset: number) {
      const rows = await deps.repository.list(userId, utcToday(deps.clock), limit + 1, offset);
      return {
        entries: rows.slice(0, limit),
        nextOffset: rows.length > limit ? offset + limit : null,
      };
    },
    async create(userId: string, input: CreateLoanInput, receipt?: Buffer) {
      const photo = receipt ? await deps.processReceipt(receipt) : null;
      return deps.repository.create(userId, utcToday(deps.clock), input, photo);
    },
    async repay(userId: string, id: string) {
      const loan = await deps.repository.repay(userId, utcToday(deps.clock), id, deps.clock());
      if (!loan) throw new AppError(404, 'LOAN_NOT_FOUND', 'Entry not found.');
      return loan;
    },
    summary(userId: string) {
      return deps.repository.summary(userId, utcToday(deps.clock));
    },
    async receipt(userId: string, id: string) {
      const buffer = await deps.repository.receipt(userId, id);
      if (!buffer) throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found.');
      return { dataUri: `data:image/jpeg;base64,${buffer.toString('base64')}` };
    },
  };
}
export type LoanService = ReturnType<typeof createLoanService>;
