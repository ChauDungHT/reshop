import { PoolClient } from 'pg';
import db from '../core/db';

export interface IFeeBreakdown {
  fee_name: string;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  calculated_amount: number;
}

export interface IFeeCalculationResult {
  totalFee: number;
  netAmount: number;
  breakdown: IFeeBreakdown[];
}

/**
 * Calculates the product fee for a vendor based on their fee tier.
 * @param client PG PoolClient or DB pool (to support both in-transaction and direct query)
 * @param vendorId UUID of the vendor
 * @param grossAmount Total gross revenue of the order/sub-order
 */
export async function calculateVendorFee(
  client: PoolClient | typeof db,
  vendorId: string,
  grossAmount: number
): Promise<IFeeCalculationResult> {
  // 1. Get the vendor's fee_tier_id
  const vendorRes = await client.query(
    'SELECT fee_tier_id FROM vendors WHERE id = $1::uuid',
    [vendorId]
  );

  let feeTierId = vendorRes.rows[0]?.fee_tier_id;

  // 2. If vendor has no fee_tier_id, find the default "Hạng Thường" tier
  if (!feeTierId) {
    const defaultTierRes = await client.query(
      "SELECT id FROM fee_tiers WHERE tier_name = 'Hạng Thường' LIMIT 1"
    );
    feeTierId = defaultTierRes.rows[0]?.id;
  }

  // 3. If still no feeTierId, fallback to a flat calculation of 5% (to prevent app crash)
  if (!feeTierId) {
    const fallbackPercentage = 5.0;
    const calculatedFee = parseFloat((grossAmount * (fallbackPercentage / 100)).toFixed(2));
    return {
      totalFee: calculatedFee,
      netAmount: parseFloat((grossAmount - calculatedFee).toFixed(2)),
      breakdown: [
        {
          fee_name: 'Phí sàn phần trăm (fallback)',
          fee_type: 'percentage',
          fee_value: fallbackPercentage,
          calculated_amount: calculatedFee,
        },
      ],
    };
  }

  // 4. Retrieve the detailed fee configuration items
  const itemsRes = await client.query(
    'SELECT fee_name, fee_type, fee_value FROM fee_tier_items WHERE fee_tier_id = $1::uuid',
    [feeTierId]
  );

  let totalFee = 0;
  const breakdown: IFeeBreakdown[] = [];

  for (const row of itemsRes.rows) {
    const feeValue = parseFloat(row.fee_value);
    let calculatedAmount = 0;

    if (row.fee_type === 'percentage') {
      calculatedAmount = parseFloat((grossAmount * (feeValue / 100)).toFixed(2));
    } else if (row.fee_type === 'fixed') {
      calculatedAmount = feeValue;
    }

    totalFee += calculatedAmount;
    breakdown.push({
      fee_name: row.fee_name,
      fee_type: row.fee_type as 'percentage' | 'fixed',
      fee_value: feeValue,
      calculated_amount: parseFloat(calculatedAmount.toFixed(2)),
    });
  }

  // Ensure total fee is rounded nicely
  totalFee = parseFloat(totalFee.toFixed(2));
  const netAmount = parseFloat((grossAmount - totalFee).toFixed(2));

  return {
    totalFee,
    netAmount: netAmount < 0 ? 0 : netAmount,
    breakdown,
  };
}
