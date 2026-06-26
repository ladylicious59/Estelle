import { Router } from 'express';
import * as videoController from '../controllers/videoController.js';

const router = Router();

router.get('/', videoController.listUserVideos);
router.post('/generate', videoController.generateVideo);
router.get('/:id', videoController.getVideoStatus);

export default router;
