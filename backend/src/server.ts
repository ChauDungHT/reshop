import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './modules/identity/auth.route';

const app: Express = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

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
