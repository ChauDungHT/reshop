import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../../../shared-ui/src/context/CartContext';
import axiosInstance from '../../../../shared-ui/src/lib/axios';

const formatPrice = (value: number) => `${Number(value).toLocaleString('vi-VN')}₫`;

// Bản đồ mã lỗi VNPAY sang thông điệp tiếng Việt thân thiện
const ERROR_MESSAGES: Record<string, string> = {
  '07': 'Giao dịch bị nghi ngờ gian lận (đang chờ kiểm duyệt tại Merchant Admin).',
  '09': 'Thẻ/Tài khoản của quý khách chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Quý khách xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của quý khách đang bị khóa.',
  '24': 'Quý khách đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì. Vui lòng thử lại sau.',
  '99': 'Lỗi không xác định phát sinh từ cổng thanh toán.',
};

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [bankCode, setBankCode] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Lấy số tiền từ params (VNPAY trả về số tiền nhân 100)
        const amtStr = searchParams.get('vnp_Amount');
        if (amtStr) {
          setAmount(parseFloat(amtStr) / 100);
        }
        const bank = searchParams.get('vnp_BankCode');
        if (bank) {
          setBankCode(bank);
        }

        // Gọi API backend đối soát chữ ký và trạng thái
        const res = await axiosInstance.get('/payment/verify-return', {
          params: Object.fromEntries(searchParams.entries()),
        });

        if (res.data.success) {
          setSuccess(true);
          const txnRef = res.data.data?.orderCode || searchParams.get('vnp_TxnRef') || '';
          setOrderCode(txnRef);
          
          // Chỉ dọn giỏ hàng nếu không phải nạp tiền ví
          if (!txnRef.startsWith('WL')) {
            clearCart();
          }
        } else {
          setSuccess(false);
          const code = res.data.code || searchParams.get('vnp_ResponseCode') || '99';
          setErrorMessage(ERROR_MESSAGES[code] || 'Giao dịch thanh toán không thành công. Vui lòng thử lại.');
        }
      } catch (err: any) {
        console.error('Verify payment failed:', err);
        setSuccess(false);
        setErrorMessage(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình xác thực giao dịch.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, clearCart]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="h-16 w-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Đang xác thực giao dịch...</h2>
          <p className="text-slate-500 text-sm">Vui lòng không đóng trình duyệt hoặc tải lại trang</p>
        </div>
      </div>
    );
  }

  const isWalletTopup = orderCode.startsWith('WL');

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 rounded-4xl p-8 border border-white/5 shadow-2xl text-center space-y-6">
        <div className="h-24 w-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-5xl mx-auto border border-emerald-500/20 text-emerald-400 animate-pulse">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">
            {isWalletTopup ? 'Nạp tiền ví thành công!' : 'Thanh toán thành công!'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isWalletTopup 
              ? 'Số tiền đã được cộng trực tiếp vào ví ReShop của bạn.'
              : 'Cảm ơn quý khách đã tin tưởng mua sắm tại ReShop. Đơn hàng của bạn đã được xác nhận thanh toán.'
            }
          </p>
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 text-left text-sm space-y-3 border border-white/5">
          <div className="flex justify-between">
            <span className="text-slate-500">{isWalletTopup ? 'Mã giao dịch:' : 'Mã đơn hàng:'}</span>
            <span className="font-bold text-indigo-400">{orderCode}</span>
          </div>
          {amount !== null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền:</span>
              <span className="font-bold text-emerald-400">{formatPrice(amount)}</span>
            </div>
          )}
          {bankCode && (
            <div className="flex justify-between">
              <span className="text-slate-500">Cổng thanh toán:</span>
              <span className="font-bold text-slate-300">VNPAY ({bankCode})</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Trạng thái:</span>
            <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">Đã thanh toán</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => navigate(isWalletTopup ? '/dashboard?tab=wallet' : '/dashboard')}
            className="w-full rounded-3xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
          >
            {isWalletTopup ? 'Quay lại Ví cá nhân' : 'Quản lý đơn hàng'}
          </button>
          <button
            onClick={() => navigate(isWalletTopup ? '/checkout' : '/')}
            className="w-full rounded-3xl border border-slate-700 py-3 font-bold text-slate-300 hover:bg-slate-800 transition"
          >
            {isWalletTopup ? 'Tiếp tục thanh toán đơn hàng' : 'Tiếp tục mua sắm'}
          </button>
        </div>
      </div>
    );
  }

  const refCode = searchParams.get('vnp_TxnRef') || '';
  const failureIsWallet = refCode.startsWith('WL');

  // Giao diện thất bại / lỗi thanh toán
  return (
    <div className="max-w-md mx-auto my-12 bg-slate-900 rounded-4xl p-8 border border-white/5 shadow-2xl text-center space-y-6">
      <div className="h-24 w-24 bg-rose-500/10 rounded-full flex items-center justify-center text-4xl mx-auto border border-rose-500/20 text-rose-500">
        ✕
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white">
          {failureIsWallet ? 'Nạp tiền ví không thành công' : 'Thanh toán không thành công'}
        </h1>
        <p className="text-rose-400/90 text-sm font-medium">{errorMessage}</p>
      </div>

      <div className="bg-slate-950 rounded-2xl p-5 text-left text-sm space-y-3 border border-white/5">
        <div className="flex justify-between">
          <span className="text-slate-500">{failureIsWallet ? 'Mã giao dịch tham chiếu:' : 'Mã đơn hàng tham chiếu:'}</span>
          <span className="font-bold text-slate-300">{refCode || 'N/A'}</span>
        </div>
        {amount !== null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Số tiền:</span>
            <span className="font-bold text-slate-400">{formatPrice(amount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Trạng thái giao dịch:</span>
          <span className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-md font-bold">Thất bại / Đã hủy</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => navigate(failureIsWallet ? '/dashboard?tab=wallet' : '/checkout')}
          className="w-full rounded-3xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
        >
          {failureIsWallet ? 'Quay lại Ví cá nhân' : 'Quay lại checkout thanh toán lại'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full rounded-3xl border border-slate-700 py-3 font-bold text-slate-300 hover:bg-slate-800 transition"
        >
          Quay về trang chủ
        </button>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
