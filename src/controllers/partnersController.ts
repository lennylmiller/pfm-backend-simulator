import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { serialize, wrapInArray } from '../utils/serializers';
import { AuthContext } from '../types/auth';

interface AuthenticatedRequest extends Request {
  context?: AuthContext;
}


export const getCurrentPartner = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { partnerId } = authReq.context!;

    const partner = await prisma.partner.findUnique({
      where: {
        id: BigInt(partnerId),
      },
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Add missing configuration fields expected by responsive-tiles
    // Matching staging backend response structure
    const partnerWithConfig = {
      ...partner,
      keepaliveTimeout: 2,
      partnerAlertsEnabled: true,
      productName: partner.name || 'Personal Finance Manager',
      browserTitle: partner.name || 'Personal Finance Manager',
      demo: false,
      googleTrackingId: null,
      featuredSearches: [],
      modules: {
        aggregation: {
          type: 'finicity',
        },
        mobile: {
          name: partner.name || 'Personal Finance Manager',
          logout_url: null,
          back_to_online_banking_url: null,
          back_to_online_banking_label: 'Back to Online Banking',
          keepalive_url: null,
          replace_pfm_name_with_dashboard: false,
          hide_help_contact_form: false,
          version: 'v2 Single Page Mobile',
          classic_dashboard: false,
          header_style: 'Standard',
          hide_logout_link: false,
        },
      },
      webtrendsDcsId: null,
      webtrendsDomain: null,
      webtrendsTimeZone: null,
      webtrendsReplicateDomain: null,
      keepaliveUrl: null,
    };

    // Wrap in array and serialize to snake_case for frontend compatibility
    const wrapped = wrapInArray(partnerWithConfig, 'partners');
    return res.json(serialize(wrapped));
  } catch (error) {
    logger.error({ error }, 'Failed to get current partner');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
