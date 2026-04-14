import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../response';

export const ownerGuard = (resourceIdParam: string = 'id', isVendorResource: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log(`[auth]: Owner Guard Failed - 401 - Unauthenticated access attempt`);
      sendResponse(res, 401, false, 'Unauthenticated');
      return;
    }

    // Try finding the resource ID from request params first, then body
    const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
    
    if (!resourceId) {
      console.log(`[auth]: Owner Guard Failed - 400 - Resource ID missing: ${resourceIdParam}`);
      sendResponse(res, 400, false, `Resource ID missing in param/body: ${resourceIdParam}`);
      return;
    }

    // Admins usually bypass simple ownership checks
    if (req.user.role === 'admin') {
      console.log(`[auth]: Owner Bypass Successful - 200 - Admin Bypass applied`);
      return next();
    }

    const requestedOwnerId = isVendorResource ? req.user.vendor_id : req.user.id;

    if (requestedOwnerId !== resourceId) {
      console.log(`[auth]: Action Denied - 403 - Owner Mismatch (${requestedOwnerId} != ${resourceId})`);
      sendResponse(res, 403, false, 'You are not the owner of this resource');
      return;
    }

    console.log(`[auth]: Ownership Check Successful - 200 - Owner ID matches`);
    next();
  };
};
