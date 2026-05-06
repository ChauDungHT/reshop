# Prompt 07: Trả lời Câu hỏi Q&A

## Ngữ cảnh
Tương tác với khách hàng thông qua việc trả lời các câu hỏi về sản phẩm.

## Yêu cầu
Thực hiện trong `backend/src/modules/after-sales/after-sales.controller.ts`:

1. **PUT `/api/vendor/qa/:id/answer`:**
   - Payload: `{"answer": "..."}`.
   - Cập nhật trường `answer`, `answered_at` và `answered_by` (ID của vendor) trong bảng `qa`.
   - Kiểm tra quyền: Chỉ Vendor sở hữu sản phẩm liên quan đến câu hỏi mới được phép trả lời.

## Kiểm tra
- Thử dùng tài khoản Vendor A để trả lời câu hỏi cho sản phẩm của Vendor B và đảm bảo nhận lỗi 403 Forbidden.
- Kiểm tra dữ liệu được cập nhật đúng sau khi trả lời thành công.
