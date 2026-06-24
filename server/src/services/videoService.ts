import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HEYGEN_API_URL = 'https://api.heygen.com/v2';
const API_KEY = process.env.HEYGEN_API_KEY || '';

export const heygenService = {
  generateVideo: async (params: {
    avatarId: string;
    voiceId: string;
    inputText: string;
    title?: string;
  }) => {
    try {
      const response = await axios.post(
        `${HEYGEN_API_URL}/video/generate`,
        {
          video_gen_v2: {
            avatar: {
              avatar_id: params.avatarId,
              avatar_type: 'talking_photo', // or 'avatar'
            },
            voice: {
              voice_id: params.voiceId,
            },
            input_text: params.inputText,
          },
          test: process.env.NODE_ENV === 'development',
        },
        {
          headers: {
            'X-Api-Key': API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data; // { video_id: "..." }
    } catch (error: any) {
      console.error('HeyGen API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate video with HeyGen');
    }
  },

  getVideoStatus: async (videoId: string) => {
    try {
      const response = await axios.get(`${HEYGEN_API_URL}/video/status?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': API_KEY,
        },
      });

      return response.data.data; // { status: "completed", video_url: "...", ... }
    } catch (error: any) {
      console.error('HeyGen Status API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get video status from HeyGen');
    }
  },
};
