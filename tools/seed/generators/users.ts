import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function generateUsers(partnerId: bigint, count: number) {
  const users = [];

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email();
    const password = 'Password123!'; // Default test password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        partnerId,
        email,
        hashedPassword,
        salt,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        timezone: faker.location.timeZone(),
        jwtSecret: faker.string.alphanumeric(32),
        loginCount: faker.number.int({ min: 0, max: 100 }),
        lastLoginAt: faker.helpers.maybe(() => faker.date.recent({ days: 30 }), { probability: 0.8 }),
        preferences: {
          theme: faker.helpers.arrayElement(['light', 'dark']),
          notifications: faker.datatype.boolean(0.8),
          language: 'en-US',
        },
      },
    });

    users.push(user);
  }

  return users;
}
