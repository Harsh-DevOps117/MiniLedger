import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919876543210');
export const requestOtpSchema = z.object({ phone: phoneSchema });
export const verifyOtpSchema = requestOtpSchema.extend({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= '2000-01-01' &&
      value <= '2100-12-31'
    );
  }, 'Enter a real date between 2000 and 2100');
export const amountSchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, 'Enter an amount with up to 2 decimal places')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');
export const createLoanSchema = z.object({
  friendName: z
    .string()
    .trim()
    .min(1, 'Enter a friend’s name')
    .max(80, 'Keep the name under 81 characters'),
  amount: amountSchema,
  dueDate: dateSchema,
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type LoanStatus = 'outstanding' | 'repaid';
export interface Loan {
  id: string;
  friendName: string;
  amount: string;
  dueDate: string;
  status: LoanStatus;
  isOverdue: boolean;
  hasReceipt: boolean;
  createdAt: string;
  repaidAt: string | null;
}
export interface Summary {
  totalLent: string;
  totalRepaid: string;
  outstanding: string;
  overdueAmount: string;
  currency: 'INR';
  asOf: string;
}
export interface Session {
  token: string;
  user: { id: string; phone: string };
}
export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
export const RECEIPT_MAX_BYTES = 2 * 1024 * 1024;
