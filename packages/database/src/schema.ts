import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  fbUserId: text('fb_user_id'),
  fbAccessToken: text('fb_access_token'),
  igUserId: text('ig_user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const videos = sqliteTable('videos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  prompt: text('prompt').notNull(),
  status: text('status').notNull(), // pending, generating, completed, failed
  videoUrl: text('video_url'),
  igContainerId: text('ig_container_id'),
  igPostId: text('ig_post_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
