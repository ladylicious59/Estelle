import { Router } from 'express';
// import * as videoController from '../controllers/videoController.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ videos: [] });
});

router.post('/generate', (req, res) => {
  res.json({ message: 'Video generation started', id: 'mock-id' });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'completed', url: 'https://example.com/video.mp4' });
});

export default router;
