/**
 * Authentication helpers for CLI
 */

import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const chalk = require('chalk');

const prisma = new PrismaClient();

export interface UserContext {
  userId: string;
  partnerId: string;
  email?: string;
}

export interface TestUser {
  email: string;
  password: string;
  label: string;
}

export function parseToken(token: string): UserContext | null {
  try {
    const decoded = jwt.decode(token) as any;

    // Handle both token formats
    const userId = decoded.sub || decoded.userId;
    const partnerId = decoded.iss || decoded.partnerId;

    if (!userId || !partnerId) {
      console.log(chalk.red('Invalid token format'));
      return null;
    }

    return {
      userId: userId.toString(),
      partnerId: partnerId.toString(),
      email: decoded.email,
    };
  } catch (error) {
    console.log(chalk.red('Failed to parse token:', error));
    return null;
  }
}

export function displayUserContext(context: UserContext) {
  console.log(chalk.blue('\n👤 Current User Context:'));
  console.log(chalk.gray(`   User ID: ${context.userId}`));
  console.log(chalk.gray(`   Partner ID: ${context.partnerId}`));
  if (context.email) {
    console.log(chalk.gray(`   Email: ${context.email}`));
  }
}

// Function to get actual test users from database
export async function getTestUsers(): Promise<TestUser[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
      take: 10,
      orderBy: { createdAt: 'asc' }
    });

    if (users.length === 0) {
      console.log(chalk.yellow('\n⚠️  No users found in database'));
      console.log(chalk.yellow('💡 Run: npm run seed -- generate --clear\n'));
      return [];
    }

    return users
      .filter((user) => user.email && user.firstName && user.lastName)
      .map((user) => ({
        email: user.email!,
        password: 'Password123!',
        label: `${user.firstName} ${user.lastName} (${user.email})`,
      }));
  } catch (error) {
    console.error(chalk.red('\n❌ Error fetching test users from database'));
    console.error(chalk.yellow('💡 Make sure you have run: npm run seed -- generate --clear\n'));
    return [];
  }
}
