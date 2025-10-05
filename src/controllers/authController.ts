/**
 * Authentication Controller
 * Handles user login and token generation
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRATION = '24h';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (!user || !user.hashedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token with both formats for compatibility
    const token = jwt.sign(
      {
        // Standard format
        userId: user.id.toString(),
        partnerId: user.partnerId.toString(),
        // responsive-tiles format
        sub: user.id.toString(),
        iss: user.partnerId.toString(),
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return res.json({
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        partnerId: user.partnerId.toString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  // JWT logout is typically handled client-side by removing the token
  // Here we just return success
  return res.status(200).json({ message: 'Logged out successfully' });
};
