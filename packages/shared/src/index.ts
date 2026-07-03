export interface User {
  id: string;
  email: string;
  fbUserId?: string;
  igUserId?: string;
}

export interface VideoJob {
  id: string;
  userId: string;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  createdAt: string;
}
