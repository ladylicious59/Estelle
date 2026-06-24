# TalkHuman AI - API Contract

This document outlines the API endpoints and data structures for the TalkHuman AI backend.

## Base URL
`http://localhost:3001/api`

## Authentication
**Recommendation**: Clerk (Fast, secure, and handles UI components).
For development, endpoints are currently placeholders.

### POST `/auth/signup`
Placeholder for user registration.

### POST `/auth/login`
Placeholder for user login.

## Videos

### GET `/videos`
Retrieve all video generations for the authenticated user.
**Response**:
```json
{
  "videos": [
    {
      "id": "string",
      "status": "pending | processing | completed | failed",
      "avatar_id": "string",
      "voice_id": "string",
      "input_text": "string",
      "video_url": "string | null",
      "created_at": "ISO Date string"
    }
  ]
}
```

### POST `/videos/generate`
Trigger a new AI video generation.
**Request Body**:
```json
{
  "avatar_id": "string",
  "voice_id": "string",
  "input_text": "string"
}
```
**Response**:
```json
{
  "message": "Video generation started",
  "id": "string"
}
```

### GET `/videos/:id`
Get status and details of a specific video generation.
**Response**:
```json
{
  "id": "string",
  "status": "pending | processing | completed | failed",
  "url": "string | null"
}
```

## Subscriptions

### GET `/subscriptions/me`
Get current user's subscription status.
**Response**:
```json
{
  "plan": "starter | pro | agency",
  "status": "active | trialing | canceled | past_due"
}
```

### POST `/subscriptions/create-checkout-session`
Create a Stripe Checkout session for a specific plan.
**Request Body**:
```json
{
  "plan": "starter | pro | agency"
}
```
**Response**:
```json
{
  "url": "string"
}
```

## Database Schema (SQLite)

### `users`
- `id` (PK): User identifier (Clerk ID)
- `email`: User email
- `name`: User name
- `created_at`: Creation timestamp

### `subscriptions`
- `id` (PK): Subscription ID
- `user_id` (FK): User identifier
- `plan`: 'starter' | 'pro' | 'agency'
- `status`: Subscription status
- `current_period_end`: End date of current billing period

### `video_generations`
- `id` (PK): Generation ID
- `user_id` (FK): User identifier
- `status`: 'pending' | 'processing' | 'completed' | 'failed'
- `avatar_id`: AI Avatar ID
- `voice_id`: AI Voice ID
- `input_text`: Input script
- `video_url`: URL of the generated video
- `created_at`: Creation timestamp
