const { config } = require('./core/config');
const { generatePaymentUrl } = require('./modules/payment/vnpay.utils');

console.log('Real app config values:');
console.log('  - vnpTmnCode:', config.vnpTmnCode);
console.log('  - vnpHashSecret:', config.vnpHashSecret);
console.log('  - vnpUrl:', config.vnpUrl);
console.log('  - vnpReturnUrl:', config.vnpReturnUrl);

const url = generatePaymentUrl({
  orderCode: 'WL-22126571-W8FP',
  amount: 50000,
  ipAddr: '127.0.0.1',
  orderInfo: 'Nap tien vao vi ReShop'
});
console.log('\nGenerated payment URL from real backend code:');
console.log(url);
