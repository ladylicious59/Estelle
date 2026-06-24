import { Request, Response } from 'express';
import { heygenService } from '../services/videoService.js';
import { db } from '../config/database.js';

export const generateVideo = async (req: Request, res: Response) => {
  const { avatarId, voiceId, inputText, userId } = req.body;

  if (!avatarId || !voiceId || !inputText || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Check user subscription and credits (TBD)
    
    // 2. Call HeyGen API
    const heygenData = await heygenService.generateVideo({
      avatarId,
      voiceId,
      inputText,
    });

    const videoId = heygenData.video_id;

    // 3. Store in database
    db.prepare(`
      INSERT INTO video_generations (id, user_id, avatar_id, voice_id, input_text, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(videoId, userId, avatarId, voiceId, inputText, 'pending');

    res.json({
      message: 'Video generation started',
      id: videoId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVideoStatus = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    // 1. Get status from HeyGen
    const heygenData = await heygenService.getVideoStatus(id);
    
    // 2. Update database
    if (heygenData.status === 'completed' || heygenData.status === 'failed') {
      db.prepare('UPDATE video_generations SET status = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(heygenData.status, heygenData.video_url || null, id);
    } else {
      db.prepare('UPDATE video_generations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(heygenData.status, id);
    }

    res.json({
      id,
      status: heygenData.status,
      url: heygenData.video_url || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const listUserVideos = async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const videos = db.prepare('SELECT * FROM video_generations WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json({ videos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
