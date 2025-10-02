import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generatePartners(count: number) {
  const partners = [];

  for (let i = 0; i < count; i++) {
    const companyName = faker.company.name();
    const domain = faker.internet.domainName();

    const partner = await prisma.partner.create({
      data: {
        name: companyName,
        domain: domain,
        subdomain: faker.helpers.maybe(() => faker.internet.domainWord(), { probability: 0.5 }),
        allowPartnerApiv2: true,
        ssoEnabled: faker.datatype.boolean(0.3),
        mfaRequired: faker.datatype.boolean(0.2),
        logoUrl: faker.image.urlLoremFlickr({ category: 'business' }),
        primaryColor: faker.internet.color(),
        secondaryColor: faker.internet.color(),
        featureFlags: {
          budgets_enabled: true,
          goals_enabled: true,
          cashflow_enabled: true,
          alerts_enabled: true,
        },
        settings: {
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
        },
      },
    });

    partners.push(partner);
  }

  return partners;
}
