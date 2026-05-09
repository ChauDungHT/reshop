# VNPay Integration Requirements (Top-up Only)

This document outlines the requirements and architecture for integrating VNPay as the primary payment gateway for topping up the Reshop wallet.

## 1. VNPay Credentials (SandBox)
To proceed with integration, the following credentials from VNPay Sandbox are required in `.env`:

```env
VNP_TMN_CODE=XXXXXX         # Terminal ID
VNP_HASH_SECRET=XXXXXXXX    # Secret Key
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/wallet/vnpay-return
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
```

## 2. Integration Flow
VNPay will be used **exclusively** for wallet top-ups. Payment for orders will still be handled by the Reshop wallet balance.

### Step-by-Step Flow:
1. **Request**: User selects a top-up amount on the Dashboard.
2. **Endpoint**: Frontend calls `POST /api/wallet/vnpay/create-payment`.
3. **Redirection**: Backend generates a signed VNPay URL and returns it to the frontend.
4. **Payment**: Frontend redirects the user to VNPay.
5. **Callback (Return URL)**: After payment, VNPay redirects the user back to Reshop (`VNP_RETURN_URL`).
6. **Verification (IPN)**: VNPay calls a backend endpoint (`POST /api/wallet/vnpay/callback`) to confirm the transaction status.
7. **Wallet Update**: Upon successful verification, the backend updates the user's `wallet_balance` and logs a `deposit` transaction.

## 3. Planned Endpoints

### `POST /api/wallet/vnpay/create-payment`
- **Body**: `{ amount: number }`
- **Responsibility**: Validate amount, generate unique `vnp_TxnRef`, sign the request, and return the payment URL.

### `GET /api/wallet/vnpay/vnpay-return` (Frontend Handled)
- **Responsibility**: Parse URL parameters, show success/failure UI to the user.

### `GET/POST /api/wallet/vnpay/callback` (IPN)
- **Responsibility**: Securely verify the checksum from VNPay, check if the transaction was already processed, and update the wallet balance.

## 4. Technical Requirements
- Library: `crypto` (built-in Node.js) for HmacSHA512 signing.
- Query string sorting: VNPay requires parameters to be sorted alphabetically before hashing.
- Transaction locking: Use database transactions to ensure wallet updates are atomic and idempotent.
