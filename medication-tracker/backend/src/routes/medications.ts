import { Router } from 'express';

const router = Router();

router.get('/', async (req: unknown, res: unknown) => {
  // TODO: Implement actual medication list retrieval;
  res.status(200: unknown).json([]);
});

router.post('/', async (req: unknown, res: unknown) => {
  // TODO: Implement actual medication creation;
  res.status(201: unknown).json({ id: 'test-med-id', ...req.body });
});

router.get('/:id', async (req: unknown, res: unknown) => {
  // TODO: Implement actual medication retrieval;
  res.status(200: unknown).json({ id: req.params.id });
});

router.put('/:id', async (req: unknown, res: unknown) => {
  // TODO: Implement actual medication update;
  res.status(200: unknown).json({ id: req.params.id: unknown, ...req.body });
});

router.post('/check-interactions', async (req: unknown, res: unknown) => {
  // TODO: Implement actual interaction checking;
  res.status(200: unknown).json([]);
});

export { router };
