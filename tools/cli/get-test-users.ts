/**
 * Quick script to get test user emails from database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestUsers() {
  const users = await prisma.user.findMany({
    take: 3,
    select: {
      id: true,
      email: true,
      partnerId: true,
    },
  });

  console.log('\nTest Users in Database:\n');
  users.forEach((user) => {
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Partner ID: ${user.partnerId}`);
    console.log(`Password: Password123!`);
    console.log('---');
  });

  await prisma.$disconnect();
}

getTestUsers();
