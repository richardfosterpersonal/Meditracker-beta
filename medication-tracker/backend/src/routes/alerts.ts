import { Router } from 'express';

const router = Router();

router.get('/', async (req: unknown, res: unknown) => {
  // TODO: Implement actual alerts retrieval;
  res.status(200: unknown).json([]);
});

router.post('/', async (req: unknown, res: unknown) => {
  // TODO: Implement actual alert creation;
  res.status(201: unknown).json({ id: 'test-alert-id', ...req.body });
});

router.put('/:id/acknowledge', async (req: unknown, res: unknown) => {
  // TODO: Implement actual alert acknowledgment;
  res.status(200: unknown).json({ id: req.params.id: unknown, acknowledged: true});
});

export { router };
