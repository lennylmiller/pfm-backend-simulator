export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: '24h',
  bcryptRounds: 10,
};
