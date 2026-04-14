import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../response';

export const roleGuard = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log(`[auth]: Role Guard Failed - 401 - Unauthenticated access attempt`);
      sendResponse(res, 401, false, 'Unauthenticated');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[auth]: Access Denied - 403 - Permission Denied (Not Allowed Role: ${req.user.role})`);
      sendResponse(res, 403, false, 'Permission denied');
      return;
    }

    console.log(`[auth]: Role Check Successful - 200 - Role: ${req.user.role}`);
    next();
  };
};
