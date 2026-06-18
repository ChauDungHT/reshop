const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@localhost:5433/${process.env.POSTGRES_DB || 'cdshop'}`;

const pool = new Pool({
  connectionString,
});

// Helper to generate random date between two dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate a random alphanumeric string
function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function seedOrders() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[seeder]: Fetching buyer account (acerikyl@gmail.com)...');
    const buyerRes = await client.query("SELECT id FROM users WHERE email = 'acerikyl@gmail.com'");
    if (buyerRes.rows.length === 0) {
      throw new Error("Buyer 'acerikyl@gmail.com' not found. Please seed master data first.");
    }
    const buyerId = buyerRes.rows[0].id;

    console.log('[seeder]: Fetching active products and vendors...');
    const productsRes = await client.query(`
      SELECT p.id, p.name, p.price, p.stock, p.vendor_id, v.user_id as vendor_user_id
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.status = 'active'
    `);
    const products = productsRes.rows;
    if (products.length === 0) {
      throw new Error("No active products found to purchase.");
    }

    console.log('[seeder]: Fetching fee tiers and items...');
    const feeItemsRes = await client.query(`
      SELECT fti.fee_tier_id, fti.fee_name, fti.fee_type, fti.fee_value
      FROM fee_tier_items fti
    `);
    const feeItemsByTier = {};
    for (const item of feeItemsRes.rows) {
      if (!feeItemsByTier[item.fee_tier_id]) {
        feeItemsByTier[item.fee_tier_id] = [];
      }
      feeItemsByTier[item.fee_tier_id].push(item);
    }

    // Default fee tier (Hạng Thường)
    const defaultTierRes = await client.query("SELECT id FROM fee_tiers WHERE tier_name = 'Hạng Thường' LIMIT 1");
    const defaultTierId = defaultTierRes.rows[0]?.id;

    // Fetch vendor info to know fee tier
    const vendorsRes = await client.query("SELECT id, user_id, fee_tier_id FROM vendors");
    const vendorsMap = {};
    for (const v of vendorsRes.rows) {
      vendorsMap[v.id] = {
        userId: v.user_id,
        feeTierId: v.fee_tier_id || defaultTierId
      };
    }

    // Define fee calculation function
    function calculateVendorFee(vendorId, grossAmount) {
      const vendor = vendorsMap[vendorId];
      const tierId = vendor ? vendor.feeTierId : defaultTierId;
      const items = feeItemsByTier[tierId] || [];

      let totalFee = 0;
      for (const item of items) {
        const feeValue = parseFloat(item.fee_value);
        let calculated = 0;
        if (item.fee_type === 'percentage') {
          calculated = parseFloat((grossAmount * (feeValue / 100)).toFixed(2));
        } else if (item.fee_type === 'fixed') {
          calculated = feeValue;
        }
        totalFee += calculated;
      }
      totalFee = parseFloat(totalFee.toFixed(2));
      const netAmount = parseFloat((grossAmount - totalFee).toFixed(2));
      return { totalFee, netAmount: netAmount < 0 ? 0 : netAmount };
    }

    // Initialize/reset user balances in simulation
    // Buyer: start with 500,000,000 VND
    let buyerWalletBalance = 500000000.00;
    let buyerPendingBalance = 0.00;

    // Vendors: track balances in memory
    const vendorBalances = {};
    for (const v of vendorsRes.rows) {
      vendorBalances[v.user_id] = {
        walletBalance: 0.00,
        pendingBalance: 0.00
      };
    }

    // Ensure products have high stock initially so constraints are not violated
    console.log('[seeder]: Setting product stocks high for seeding...');
    await client.query("UPDATE products SET stock = stock + 1000");

    // Define simulation time bounds
    const nowTime = new Date('2026-06-18T12:00:00Z');
    const startTime = new Date('2026-03-01T00:00:00Z');
    const endTime = new Date('2026-06-18T00:00:00Z');

    // Generate 100 orders with random properties
    console.log('[seeder]: Generating 100 order specifications...');
    const ordersData = [];
    for (let i = 0; i < 100; i++) {
      const createdDate = randomDate(startTime, endTime);
      
      // Select 1 to 3 random products
      const orderItemsCount = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      const usedProductIds = new Set();
      
      while (selectedProducts.length < orderItemsCount) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        if (!usedProductIds.has(randomProduct.id)) {
          usedProductIds.add(randomProduct.id);
          selectedProducts.push({
            ...randomProduct,
            quantity: Math.floor(Math.random() * 2) + 1 // 1 or 2 items
          });
        }
      }

      // Group items by vendor
      const itemsByVendor = {};
      for (const item of selectedProducts) {
        if (!itemsByVendor[item.vendor_id]) {
          itemsByVendor[item.vendor_id] = [];
        }
        itemsByVendor[item.vendor_id].push(item);
      }

      // Determine payment method: 40% COD, 40% Wallet, 20% VNPAY
      const randPay = Math.random();
      let paymentMethod = 'cod';
      if (randPay < 0.4) {
        paymentMethod = 'wallet';
      } else if (randPay < 0.8) {
        paymentMethod = 'cod';
      } else {
        paymentMethod = 'vnpay';
      }

      // Determine order status: 80% delivered, 5% cancelled, 5% shipped, 5% processing, 5% pending
      const randStatus = Math.random();
      let status = 'delivered';
      if (randStatus < 0.80) {
        status = 'delivered';
      } else if (randStatus < 0.85) {
        status = 'cancelled';
      } else if (randStatus < 0.90) {
        status = 'shipped';
      } else if (randStatus < 0.95) {
        status = 'processing';
      } else {
        status = 'pending';
      }

      ordersData.push({
        createdDate,
        itemsByVendor,
        paymentMethod,
        status,
        selectedProducts
      });
    }

    // Sort orders chronologically to simulate natural linear transaction history
    ordersData.sort((a, b) => a.createdDate - b.createdDate);

    console.log('[seeder]: Inserting orders chronologically into DB...');

    for (let i = 0; i < ordersData.length; i++) {
      const orderSpec = ordersData[i];
      const createdStr = orderSpec.createdDate.toISOString();
      
      // Calculate order code YYYYMMDD suffix
      const yyyy = orderSpec.createdDate.getFullYear();
      const mm = String(orderSpec.createdDate.getMonth() + 1).padStart(2, '0');
      const dd = String(orderSpec.createdDate.getDate()).padStart(2, '0');
      const orderCode = `ORD-${yyyy}${mm}${dd}-${randomString(5)}`;

      // Calculate totals
      let grandTotal = 0;
      const subOrderPlans = [];

      const vendorIds = Object.keys(orderSpec.itemsByVendor).sort();
      vendorIds.forEach((vendorId, idx) => {
        const items = orderSpec.itemsByVendor[vendorId];
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        // Shipping fee on first sub-order
        const shippingFee = (idx === 0) ? 20000 : 0;
        const vendorDiscount = 0;
        const platformDiscount = 0;
        
        const grossAmount = subtotal + shippingFee - vendorDiscount - platformDiscount;
        grandTotal += grossAmount;

        subOrderPlans.push({
          vendorId,
          subtotal,
          shippingFee,
          vendorDiscount,
          platformDiscount,
          grossAmount,
          items
        });
      });

      // Determine payment status
      let paymentStatus = 'pending';
      if (orderSpec.paymentMethod === 'wallet') {
        paymentStatus = 'paid';
      } else if (orderSpec.paymentMethod === 'vnpay') {
        paymentStatus = (orderSpec.status === 'cancelled' || orderSpec.status === 'pending') ? 'pending' : 'paid';
      } else { // cod
        paymentStatus = (orderSpec.status === 'delivered') ? 'paid' : 'pending';
      }

      // Insert Order record
      const orderInsertRes = await client.query(
        `INSERT INTO orders (buyer_id, order_code, total_amount, status, shipping_address, payment_method, payment_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
        [
          buyerId,
          orderCode,
          grandTotal,
          orderSpec.status,
          JSON.stringify({ name: "Acerikyl", phone: "0944444444", address: "TP. Hồ Chí Minh", shipping_method: "standard" }),
          orderSpec.paymentMethod,
          paymentStatus,
          createdStr
        ]
      );
      const orderId = orderInsertRes.rows[0].id;

      // Handle Buyer Wallet Transaction
      if (orderSpec.paymentMethod === 'wallet') {
        buyerWalletBalance -= grandTotal;
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after, created_at)
           VALUES ($1, $2, 'payment', $3, $4, $5)`,
          [buyerId, -grandTotal, orderId, buyerWalletBalance, createdStr]
        );
      }

      // Process sub-orders & order items
      for (let j = 0; j < subOrderPlans.length; j++) {
        const plan = subOrderPlans[j];
        const subLabel = j < 26 ? String.fromCharCode(65 + j) : `V${j + 1}`;
        const subOrderCode = `${orderCode}-${subLabel}`;

        let deliveredAt = null;
        if (orderSpec.status === 'delivered') {
          // Delivered 1-2 days after creation
          deliveredAt = new Date(orderSpec.createdDate.getTime() + (1 + Math.random()) * 24 * 60 * 60 * 1000);
        }

        const subOrderInsertRes = await client.query(
          `INSERT INTO sub_orders (order_id, vendor_id, sub_order_code, status, subtotal, shipping_fee, vendor_discount, platform_discount, refunded_amount, delivered_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $10) RETURNING id`,
          [
            orderId,
            plan.vendorId,
            subOrderCode,
            orderSpec.status,
            plan.subtotal,
            plan.shippingFee,
            plan.vendorDiscount,
            plan.platformDiscount,
            deliveredAt ? deliveredAt.toISOString() : null,
            createdStr
          ]
        );
        const subOrderId = subOrderInsertRes.rows[0].id;

        // Insert Order Items and Update Stock
        for (const item of plan.items) {
          await client.query(
            `INSERT INTO order_items (order_id, sub_order_id, product_id, quantity, price_snapshot, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderId, subOrderId, item.id, item.quantity, item.price, createdStr]
          );

          await client.query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.id]
          );
        }

        // Handle Vendor Credit & Escrow Releases
        if (orderSpec.status === 'delivered' && deliveredAt) {
          const { netAmount } = calculateVendorFee(plan.vendorId, plan.grossAmount);
          const vendor = vendorsMap[plan.vendorId];

          if (vendor) {
            const vendorUserId = vendor.userId;
            const balances = vendorBalances[vendorUserId];

            // 1. Transaction 'pending_credit' at delivery date
            balances.pendingBalance += netAmount;
            await client.query(
              `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after, created_at)
               VALUES ($1, $2, 'pending_credit', $3, $4, $5)`,
              [vendorUserId, netAmount, subOrderId, balances.walletBalance, deliveredAt.toISOString()]
            );

            // 2. Check if escrow should release (delivered_at + 7 days <= nowTime)
            const releaseTime = new Date(deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (releaseTime <= nowTime) {
              balances.pendingBalance = Math.max(0, balances.pendingBalance - netAmount);
              balances.walletBalance += netAmount;

              await client.query(
                `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after, created_at)
                 VALUES ($1, $2, 'pending_release', $3, $4, $5)`,
                [vendorUserId, netAmount, subOrderId, balances.walletBalance, releaseTime.toISOString()]
              );

              // Update sub_order status to auto_completed in DB
              await client.query(
                `UPDATE sub_orders SET feedback_status = 'auto_completed' WHERE id = $1`,
                [subOrderId]
              );
            } else {
              // Not released yet
              await client.query(
                `UPDATE sub_orders SET feedback_status = 'awaiting_feedback' WHERE id = $1`,
                [subOrderId]
              );
            }
          }
        }
      }
    }

    // Finalize all updated user balances in DB
    console.log('[seeder]: Updating final wallet balances of buyer and vendors in DB...');
    await client.query(
      "UPDATE users SET wallet_balance = $1, pending_balance = $2 WHERE id = $3",
      [buyerWalletBalance, buyerPendingBalance, buyerId]
    );

    for (const vendorUserId of Object.keys(vendorBalances)) {
      const balances = vendorBalances[vendorUserId];
      await client.query(
        "UPDATE users SET wallet_balance = $1, pending_balance = $2 WHERE id = $3",
        [balances.walletBalance, balances.pendingBalance, vendorUserId]
      );
    }

    await client.query('COMMIT');
    console.log('[seeder]: Successfully completed transaction and seeded 100 historical orders!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seeder]: Failed seeding database:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seedOrders();
