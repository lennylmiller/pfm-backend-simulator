import { PrismaClient } from '@prisma/client';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { UserPartnerSelection } from '../types/workflow';

/**
 * User/Partner Selector Module
 * Interactive selection of user and partner for responsive-tiles startup
 */

/**
 * Select partner and user interactively
 */
export async function selectUserAndPartner(): Promise<UserPartnerSelection | null> {
  const prisma = new PrismaClient();

  try {
    // Step 1: Get all partners
    const partners = await prisma.partner.findMany({
      orderBy: { name: 'asc' },
    });

    if (partners.length === 0) {
      console.log(chalk.yellow('\n⚠️  No partners found in database'));
      console.log(chalk.gray('   Please run database seed first\n'));
      return null;
    }

    // Step 2: Select partner
    let selectedPartnerId: bigint;
    let selectedPartnerName: string;

    if (partners.length === 1) {
      // Auto-select if only one partner
      selectedPartnerId = partners[0].id;
      selectedPartnerName = partners[0].name;
      console.log(chalk.gray(`\nAuto-selected partner: ${selectedPartnerName}`));
    } else {
      // Interactive selection
      const partnerChoices = partners.map(p => ({
        name: `${p.name} (${p.domain})`,
        value: p.id,
      }));

      const { partnerId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'partnerId',
          message: 'Select a partner:',
          choices: partnerChoices,
        },
      ]);

      selectedPartnerId = partnerId;
      selectedPartnerName = partners.find(p => p.id === partnerId)!.name;
    }

    // Step 3: Get users for selected partner
    const users = await prisma.user.findMany({
      where: { partnerId: selectedPartnerId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    if (users.length === 0) {
      console.log(chalk.yellow(`\n⚠️  No users found for partner: ${selectedPartnerName}\n`));
      return null;
    }

    // Step 4: Select user
    let selectedUserId: bigint;
    let selectedUserName: string;

    if (users.length === 1) {
      // Auto-select if only one user
      selectedUserId = users[0].id;
      selectedUserName = `${users[0].firstName} ${users[0].lastName}`;
      console.log(chalk.gray(`Auto-selected user: ${selectedUserName}\n`));
    } else {
      // Interactive selection
      const userChoices = users.map(u => ({
        name: `${u.firstName} ${u.lastName} (${u.email || 'no email'})`,
        value: u.id,
      }));

      const { userId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'userId',
          message: 'Select a user:',
          choices: userChoices,
          pageSize: 15,
        },
      ]);

      selectedUserId = userId;
      const user = users.find(u => u.id === userId)!;
      selectedUserName = `${user.firstName} ${user.lastName}`;
    }

    console.log(chalk.green('\n✅ Selection complete'));
    console.log(chalk.gray(`   Partner: ${selectedPartnerName}`));
    console.log(chalk.gray(`   User: ${selectedUserName}\n`));

    return {
      userId: selectedUserId,
      partnerId: selectedPartnerId,
      userName: selectedUserName,
      partnerName: selectedPartnerName,
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error selecting user/partner: ${error.message}\n`));
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get user and partner details by IDs
 */
export async function getUserPartnerDetails(
  userId: bigint,
  partnerId: bigint
): Promise<UserPartnerSelection | null> {
  const prisma = new PrismaClient();

  try {
    const [user, partner] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.partner.findUnique({ where: { id: partnerId } }),
    ]);

    if (!user || !partner) {
      return null;
    }

    return {
      userId: user.id,
      partnerId: partner.id,
      userName: `${user.firstName} ${user.lastName}`,
      partnerName: partner.name,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Display user/partner selection summary
 */
export function displaySelection(selection: UserPartnerSelection): void {
  console.log(chalk.blue.bold('\n👤 Selected User & Partner\n'));
  console.log(chalk.gray(`Partner: ${selection.partnerName} (ID: ${selection.partnerId})`));
  console.log(chalk.gray(`User: ${selection.userName} (ID: ${selection.userId})\n`));
}

/**
 * List all partners with user counts
 */
export async function listPartners(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const partners = await prisma.partner.findMany({
      include: {
        _count: {
          select: { users: true, accounts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (partners.length === 0) {
      console.log(chalk.yellow('\nNo partners found in database\n'));
      return;
    }

    console.log(chalk.blue.bold('\n📋 Partners in Database\n'));

    for (const partner of partners) {
      console.log(chalk.green(`${partner.name} (${partner.domain})`));
      console.log(chalk.gray(`  ID: ${partner.id}`));
      console.log(chalk.gray(`  Users: ${partner._count.users}`));
      console.log(chalk.gray(`  Accounts: ${partner._count.accounts}\n`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * List all users for a partner
 */
export async function listUsers(partnerId: bigint): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      where: { partnerId },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    if (users.length === 0) {
      console.log(chalk.yellow(`\nNo users found for partner ID: ${partnerId}\n`));
      return;
    }

    console.log(chalk.blue.bold('\n👥 Users\n'));

    for (const user of users) {
      console.log(chalk.green(`${user.firstName} ${user.lastName}`));
      console.log(chalk.gray(`  ID: ${user.id}`));
      console.log(chalk.gray(`  Email: ${user.email || 'N/A'}`));
      console.log(chalk.gray(`  Accounts: ${user._count.accounts}\n`));
    }
  } finally {
    await prisma.$disconnect();
  }
}
