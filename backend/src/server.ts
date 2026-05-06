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

const app: Express = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Global static files route
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/after-sales', afterSalesRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    data: null
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
