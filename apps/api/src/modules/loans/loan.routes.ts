import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { createLoanSchema, RECEIPT_MAX_BYTES } from '@miniledger/contracts';
import type { LoanService } from './loan.service';

const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export function loanRouter(service: LoanService) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: RECEIPT_MAX_BYTES, files: 1, fields: 3, fieldSize: 1024, parts: 4 },
  });
  router.get('/summary', async (_req, res) => {
    res.json(await service.summary(res.locals.userId as string));
  });
  router.get('/', async (req, res) => {
    const { limit, offset } = pagination.parse(req.query);
    res.json(await service.list(res.locals.userId as string, limit, offset));
  });
  router.post('/', upload.single('receipt'), async (req, res) => {
    const input = createLoanSchema.parse(req.body);
    res
      .status(201)
      .json(await service.create(res.locals.userId as string, input, req.file?.buffer));
  });
  router.patch('/:id/repay', async (req, res) => {
    res.json(await service.repay(res.locals.userId as string, z.uuid().parse(req.params.id)));
  });
  router.get('/:id/receipt', async (req, res) => {
    res.json(await service.receipt(res.locals.userId as string, z.uuid().parse(req.params.id)));
  });
  return router;
}
