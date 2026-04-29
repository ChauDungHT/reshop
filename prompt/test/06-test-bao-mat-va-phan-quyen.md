# PROMPT 06: KIỂM THỬ BẢO MẬT VÀ PHÂN QUYỀN (RBAC)

**Vai trò:** Security / QA Engineer
**Nhiệm vụ:** Tìm kiếm các lỗ hổng phân quyền tiềm ẩn.

### Kịch bản kiểm thử:
1.  **Q&A Ownership:** 
    *   Sử dụng User A để đặt câu hỏi.
    *   Sử dụng Token của User B gọi API `DELETE /api/qa/:id_của_A` -> Kỳ vọng: Lỗi 403 Forbidden.
2.  **Wallet Privacy:**
    *   User A truy cập API `/api/wallet/history?user_id=ID_của_B` -> Kỳ vọng: Backend chỉ trả về dữ liệu của User A dựa trên Token, không được phép rò rỉ dữ liệu của B.
3.  **Review Logic:**
    *   Vendor tự đánh giá sản phẩm của chính mình -> Kiểm tra chính sách dự án (Thường là CẤM, yêu cầu trả lỗi 403/400).

**Mục tiêu:** Không có hiện tượng "leo rào" phân quyền giữa các User.
