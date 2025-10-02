import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const getCurrentPartner = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.context!;

    const partner = await prisma.partner.findUnique({
      where: {
        id: BigInt(partnerId),
      },
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json({ partner });
  } catch (error) {
    logger.error({ error }, 'Failed to get current partner');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
