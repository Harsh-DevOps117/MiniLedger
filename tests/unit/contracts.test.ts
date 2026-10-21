import { describe, expect, it } from 'vitest';
import { amountSchema, createLoanSchema, dateSchema, phoneSchema } from '@miniledger/contracts';

describe('shared input contracts', () => {
  it.each(['0', '-1', '1.001', '1e3', 'NaN', '10000000000', '01.00', ''])(
    'rejects invalid money %s',
    (amount) => {
      expect(amountSchema.safeParse(amount).success).toBe(false);
    },
  );
  it.each(['0.01', '10', '9999999999.99', '10.5'])('accepts exact decimal money %s', (amount) => {
    expect(amountSchema.safeParse(amount).success).toBe(true);
  });
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '1999-12-31', '2101-01-01', '2026-1-1'])(
    'rejects impossible or unsupported date %s',
    (date) => {
      expect(dateSchema.safeParse(date).success).toBe(false);
    },
  );
  it('accepts leap day and trims names', () => {
    expect(
      createLoanSchema.parse({ friendName: ' Aditi ', amount: '0.10', dueDate: '2028-02-29' })
        .friendName,
    ).toBe('Aditi');
  });
  it('requires an international phone number and a nonblank name', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(false);
    expect(phoneSchema.parse(' +919876543210 ')).toBe('+919876543210');
    expect(
      createLoanSchema.safeParse({ friendName: '  ', amount: '1', dueDate: '2026-01-01' }).success,
    ).toBe(false);
  });
});
