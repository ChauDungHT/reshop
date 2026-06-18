import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './modules/identity/auth.route';
import userRoutes from './modules/identity/user.route';
import productRoutes from './modules/catalog/product.route';
import categoryRoutes from './modules/catalog/category.route';
import walletRoutes from './modules/wallet/wallet.route';
import cartRoutes from './modules/cart/cart.route';
import checkoutRoutes from './modules/checkout/checkout.route';
import afterSalesRoutes from './modules/after-sales/after-sales.route';
import paymentRoutes from './modules/payment/payment.route';
import vendorRoutes from './modules/vendor/vendor.route';
import adminUserRoutes from './modules/identity/admin-user.route';
import adminCategoryRoutes from './modules/catalog/admin-category.route';
import adminShopRoutes from './modules/vendor/admin-shop.route';
import adminFeeRoutes from './modules/vendor/admin-fee.route';
import adminDisputeRoutes from './modules/after-sales/admin-dispute.route';
import toolPermissionRoutes from './modules/identity/tool-permission.route';
import couponRoutes from './modules/coupon/coupon.route';

const app: Express = express();
const port = process.env.PORT || 8000;

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json());

// Global static files route
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/after-sales', afterSalesRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/shops', adminShopRoutes);
app.use('/api/admin/fees', adminFeeRoutes);
app.use('/api/admin/disputes', adminDisputeRoutes);
app.use('/api/tool-permissions', toolPermissionRoutes);
app.use('/api/coupons', couponRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    data: null
  });
});

import { initCronJobs } from './core/cron';

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  initCronJobs();
});
