import { Router } from 'express';
import { 
  getVendorProducts, 
  getVendorProductById,
  createProduct, 
  updateProduct, 
  bulkDeleteProducts, 
  bulkToggleProducts,
  bulkUpdateStock,
  getVendorOrders,
  updateOrderStatus,
  getVendorReturns,
  approveReturnByVendor,
  rejectReturnByVendor,
  getVendorDashboard,
  getVendorProfile,
  updateVendorProfile,
  exportOrderPDF,
  getVendorFees
} from './vendor.controller';
import { getVendorQA, answerQuestion } from '../after-sales/after-sales.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';
import { upload, processProductImages } from '../../shared/middlewares/upload.middleware';

const router = Router();

// Tất cả các route /api/vendor/... đều cần auth và role vendor
router.use(authMiddleware);
router.use(roleGuard(['vendor']));

// Dashboard (Prompt 05)
router.get('/dashboard', getVendorDashboard);

// Quản lý Shop (Prompt 05)
router.get('/shop', getVendorProfile);
router.put('/shop', 
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), 
  processProductImages, 
  updateVendorProfile
);

// Quản lý biểu phí (Prompt 11)
router.get('/fees', getVendorFees);


// Quản lý sản phẩm (Prompt 03)
router.get('/products', getVendorProducts);
router.get('/products/:id', getVendorProductById);
router.post('/products', upload.array('images', 8), processProductImages, createProduct);
router.put('/products/bulk-toggle', bulkToggleProducts);
router.put('/products/bulk-stock', bulkUpdateStock);
router.delete('/products/bulk', bulkDeleteProducts);
router.put('/products/:id', upload.array('images', 8), processProductImages, updateProduct);

// Quản lý đơn hàng (Prompt 04)
router.get('/orders', getVendorOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/pdf', exportOrderPDF);

// Quản lý trả hàng (Prompt 04)
router.get('/returns', getVendorReturns);
router.put('/returns/:id/approve', approveReturnByVendor);
router.put('/returns/:id/reject', rejectReturnByVendor);

// Quản lý Hỏi đáp (Prompt 07)
router.get('/qa', getVendorQA);
router.put('/qa/:id/answer', answerQuestion);

export default router;
