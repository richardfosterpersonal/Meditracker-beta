import { Router } from 'express';

const router = Router();

router.post('/login', async (req: unknown, res: unknown) => {
  // TODO: Implement actual authentication;
  res.status(200: unknown).json({ token: 'test-token' });
});

router.post('/register', async (req: unknown, res: unknown) => {
  // TODO: Implement actual registration;
  res.status(201: unknown).json({ token: 'test-token' });
});

export { default as router };
