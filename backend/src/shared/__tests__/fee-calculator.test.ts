import { calculateVendorFee } from '../fee-calculator';

describe('calculateVendorFee helper', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
    };
  });

  it('should calculate standard tier fee (5% + 2000đ) successfully', async () => {
    // Mock vendor lookup returning fee_tier_id
    mockClient.query.mockResolvedValueOnce({
      rows: [{ fee_tier_id: 'standard-tier-id' }],
    });

    // Mock fee tier items lookup returning percentage & fixed fee configurations
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { fee_name: 'Phí sàn phần trăm', fee_type: 'percentage', fee_value: '5.00' },
        { fee_name: 'Phí cố định', fee_type: 'fixed', fee_value: '2000.00' },
      ],
    });

    const result = await calculateVendorFee(mockClient, 'vendor-uuid', 100000);

    expect(result.totalFee).toBe(7000); // 5000 + 2000
    expect(result.netAmount).toBe(93000);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0]).toEqual({
      fee_name: 'Phí sàn phần trăm',
      fee_type: 'percentage',
      fee_value: 5.0,
      calculated_amount: 5000,
    });
    expect(result.breakdown[1]).toEqual({
      fee_name: 'Phí cố định',
      fee_type: 'fixed',
      fee_value: 2000.0,
      calculated_amount: 2000,
    });
  });

  it('should calculate verified tier fee (3% + 1000đ) successfully', async () => {
    // Mock vendor lookup returning fee_tier_id
    mockClient.query.mockResolvedValueOnce({
      rows: [{ fee_tier_id: 'verified-tier-id' }],
    });

    // Mock fee tier items lookup returning percentage & fixed fee configurations
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { fee_name: 'Phí sàn phần trăm', fee_type: 'percentage', fee_value: '3.00' },
        { fee_name: 'Phí cố định', fee_type: 'fixed', fee_value: '1000.00' },
      ],
    });

    const result = await calculateVendorFee(mockClient, 'vendor-uuid', 100000);

    expect(result.totalFee).toBe(4000); // 3000 + 1000
    expect(result.netAmount).toBe(96000);
    expect(result.breakdown).toHaveLength(2);
  });

  it('should fallback to standard tier when vendor exists but has no fee_tier_id', async () => {
    // Mock vendor lookup returning undefined/null fee_tier_id
    mockClient.query.mockResolvedValueOnce({
      rows: [{ fee_tier_id: null }],
    });

    // Mock lookup for default standard tier id
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'standard-tier-id' }],
    });

    // Mock fee tier items lookup
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { fee_name: 'Phí sàn phần trăm', fee_type: 'percentage', fee_value: '5.00' },
        { fee_name: 'Phí cố định', fee_type: 'fixed', fee_value: '2000.00' },
      ],
    });

    const result = await calculateVendorFee(mockClient, 'vendor-uuid', 100000);

    expect(result.totalFee).toBe(7000);
    expect(result.netAmount).toBe(93000);
  });

  it('should fallback to 5% flat percentage calculation if default tier lookup fails', async () => {
    // Mock vendor lookup returning null
    mockClient.query.mockResolvedValueOnce({
      rows: [{ fee_tier_id: null }],
    });

    // Mock default tier lookup returning empty rows
    mockClient.query.mockResolvedValueOnce({
      rows: [],
    });

    const result = await calculateVendorFee(mockClient, 'vendor-uuid', 100000);

    expect(result.totalFee).toBe(5000);
    expect(result.netAmount).toBe(95000);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].fee_name).toContain('fallback');
  });
});
