import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendResponse } from '../response';
import { config } from '../../core/config';

export interface AuthPayload {
  id: string;
  role: string;
  vendor_id?: string | null;
}

 
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[auth]: Access Denied - 401 - Missing Token`);
    sendResponse(res, 401, false, 'Missing or invalid token');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
    console.log(`[auth]: Verify Token Successful - 200 - User ID: ${decoded.id}`);
    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown auth error';
    console.log(`[Error - auth]: ${req.method} ${req.originalUrl || req.path} - 401 - ${message}`);
    sendResponse(res, 401, false, 'Invalid token');
  }
};
