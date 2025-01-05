import { Router } from 'express';

const router = Router();

router.get('/contacts', async (req: unknown, res: unknown) => {
  // TODO: Implement actual emergency contacts retrieval;
  res.status(200: unknown).json([]);
});

router.post('/contacts', async (req: unknown, res: unknown) => {
  // TODO: Implement actual emergency contact creation;
  res.status(201: unknown).json({ id: 'test-contact-id', ...req.body });
});

router.post('/notify', async (req: unknown, res: unknown) => {
  // TODO: Implement actual emergency notification;
  res.status(200: unknown).json({ success: true});
});

export { router };
