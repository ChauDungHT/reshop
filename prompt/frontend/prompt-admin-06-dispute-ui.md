# Prompt: Implement Admin Dispute Resolution UI

## Context
When a dispute is escalated, the Admin needs a clear view of the evidence from both the customer and the vendor to make a fair judgment.

## Reference
- API Endpoint: `GET /api/admin/disputes`, `POST /api/admin/disputes/:id/resolve`
- Database Table: `return_requests`.

## Requirements

### 1. Dispute List
- List of escalated return requests.
- Show: Order Code, Customer Name, Shop Name, Date Escalated, Reason.

### 2. Resolution Detail View
- Split-screen comparison:
  - **Left**: Customer's claim (Reason, description, evidence images).
  - **Right**: Vendor's rejection reason.
- **Evidence Gallery**: Lightbox for viewing high-resolution images of the returned product.

### 3. Judgment Form
- Radio buttons: **Quyết định cho Khách hàng (Hoàn tiền)** / **Quyết định cho Người bán (Giữ tiền)**.
- Text area: **Ghi chú phân xử** (Bắt buộc).
- Finalize button with a double-confirmation prompt.

## Expected Output
- `DisputeList.tsx`
- `DisputeDetail.tsx`
- `ResolutionForm.tsx`

## Verification
- Ensure the decision form correctly calculates the refund amount if the customer wins.
- Images should be displayed using `getFullImageUrl`.
