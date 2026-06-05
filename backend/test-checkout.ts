import dotenv from 'dotenv';
dotenv.config();

import './src/shared/middlewares/auth.middleware';

import db from './src/core/db';
import { processCheckout } from './src/modules/checkout/checkout.controller';

async function run() {
  console.log('Testing checkout...');
  const req = {
    user: { id: 'f1bca292-24e2-4c46-a312-10453c5856fa' },
    body: { items: [ { product_id: '321b075a-c9f1-473c-9806-149a6a25b8c2', quantity: 1 }, { product_id: 'ca97ca48-7f13-42c9-8ad8-fe6c46aa02e2', quantity: 2 } ], shipping_address: {} }
  };
  const res = {
    status: function(c: number) {
      return {
        json: function(d: any) {
          console.log('STATUS', c, 'JSON', d);
        }
      };
    },
    json: function(d: any) {
      console.log('JSON', d);
    }
  };
  
  try {
    await processCheckout(req as any, res as any);
  } catch (e) {
    console.error('UNHANDLED ERROR', e);
  } finally {
    process.exit(0);
  }
}

run();
