export type UserRole = 'customer' | 'vendor' | 'admin';
export type VendorStatus = 'inactive' | 'active' | 'banned';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type WalletTransactionType = 'deposit' | 'withdraw' | 'refund' | 'payment';
export type ReturnStatus = 'pending_vendor' | 'approved' | 'rejected' | 'escalated' | 'resolved_admin';
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'deleted';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  wallet_balance: number;
  phone?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  created_at: string;
}

export interface IVendor {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  status: VendorStatus;
  commission_rate: number;
  bank_info?: any; // JSONB
  logo_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  return_policy_days: number;
  return_policy_desc?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  created_at: string;
}

export interface IProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface IProduct {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  is_featured: boolean;
  image_urls?: string[] | null; // Note: actual DB is JSONB
  status: ProductStatus;
  average_rating: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ICartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Extended fields typically joined from products
  product_name?: string;
  product_price?: number;
  product_image?: string;
  product_stock?: number;
  store_name?: string;
  vendor_id?: string;
  selected?: boolean; // Used in UI state
}

export interface IOrderItem {
  id: string;
  order_id: string | null;
  sub_order_id: string;
  product_id: string;
  quantity: number;
  price_snapshot: number;
  created_at: string;
  // Extended fields typically joined
  product_name?: string;
  product_image?: string;
  store_name?: string;
  image_urls?: string[]; // For easier access in UI, derived from product_image or product's image_urls
}

export interface ISubOrder {
  id: string;
  order_id: string;
  vendor_id: string;
  sub_order_code: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  vendor_discount: number;
  platform_discount: number; // [Risk 3] Pro-rata voucher
  refunded_amount: number; // [Risk 5-B] Tổng tiền đã hoàn — không thay đổi subtotal
  tracking_number?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  store_name?: string;
  items?: IOrderItem[];
}

export interface IOrder {
  id: string;
  buyer_id: string;
  order_code: string;
  total_amount: number;
  status: OrderStatus;
  shipping_address?: any; // JSONB
  created_at: string;
  updated_at: string;
  items?: IOrderItem[];
  sub_orders?: ISubOrder[];
}

export interface IWalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: WalletTransactionType;
  ref_id?: string | null;
  balance_after: number;
  created_at: string;
}

export interface IReview {
  id: string;
  order_id: string;
  product_id: string;
  user_id: string;
  stars: number;
  comment?: string | null;
  images?: string[] | null;
  vendor_reply?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IQAItem {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
  product_name?: string;
}

export interface IReturnRequest {
  id: string;
  order_item_id: string;
  reason: string;
  description?: string | null;
  images?: string[] | null;
  status: ReturnStatus;
  reject_reason?: string | null;
  created_at: string;
  updated_at: string;
}
