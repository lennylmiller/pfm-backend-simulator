import { Request, Response } from 'express';
import * as networthService from '../services/networthService';
import { logger } from '../config/logger';
import { serializeNetworth, serializeNetworthDetailed } from '../utils/serializers';

/**
 * GET /users/:userId/networth
 *
 * Get networth summary (assets, liabilities, total)
 *
 * Query Parameters:
 * - as_of_date (optional): ISO date string for historical networth
 *
 * Response:
 * {
 *   "networth": {
 *     "assets": "150000.00",
 *     "liabilities": "24550.00",
 *     "networth": "125450.00",
 *     "as_of_date": "2025-10-04T12:00:00.000Z"
 *   }
 * }
 */
export const getNetworth = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { as_of_date } = req.query;

    // Verify user ownership
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);
    const partnerIdBigInt = BigInt(req.context!.partnerId);

    // Parse optional date parameter
    const asOfDate = as_of_date ? new Date(as_of_date as string) : undefined;

    // Calculate networth
    const networth = await networthService.calculateNetworth(
      userIdBigInt,
      partnerIdBigInt,
      asOfDate
    );

    return res.json({ networth: serializeNetworth(networth) });
  } catch (error) {
    logger.error({ error }, 'Failed to get networth');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /users/:userId/networth/details
 *
 * Get networth with detailed account breakdown
 *
 * Query Parameters:
 * - as_of_date (optional): ISO date string for historical networth
 *
 * Response:
 * {
 *   "networth": {
 *     "assets": "150000.00",
 *     "liabilities": "24550.00",
 *     "networth": "125450.00",
 *     "as_of_date": "2025-10-04T12:00:00.000Z",
 *     "asset_accounts": [
 *       {
 *         "account_id": 1,
 *         "account_name": "Checking",
 *         "account_type": "checking",
 *         "balance": "5000.00",
 *         "contribution": "5000.00"
 *       }
 *     ],
 *     "liability_accounts": [
 *       {
 *         "account_id": 2,
 *         "account_name": "Credit Card",
 *         "account_type": "credit_card",
 *         "balance": "-2500.00",
 *         "contribution": "-2500.00"
 *       }
 *     ]
 *   }
 * }
 */
export const getNetworthDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { as_of_date } = req.query;

    // Verify user ownership
    if (userId !== req.context?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userIdBigInt = BigInt(req.context!.userId);
    const partnerIdBigInt = BigInt(req.context!.partnerId);

    // Parse optional date parameter
    const asOfDate = as_of_date ? new Date(as_of_date as string) : undefined;

    // Calculate detailed networth
    const detailed = await networthService.calculateNetworthWithBreakdown(
      userIdBigInt,
      partnerIdBigInt,
      asOfDate
    );

    return res.json({ networth: serializeNetworthDetailed(detailed) });
  } catch (error) {
    logger.error({ error }, 'Failed to get networth details');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
