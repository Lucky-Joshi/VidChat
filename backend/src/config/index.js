const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  corsOrigin: corsOrigin.includes(',')
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : corsOrigin.trim(),
  roomId: 'vidchat-room',
  minNameLength: 2,
  maxNameLength: 30,
  maxRoomIdLength: 64,
};
