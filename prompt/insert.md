Dưới đây là chi tiết các trường cần chuẩn bị cùng ví dụ thực tế cho một shop cầu lông:

### 1. Dữ liệu Tài khoản Chủ shop (`users` table)
Mỗi shop cần một tài khoản user đóng vai trò là chủ cửa hàng.
* **name**: Tên chủ shop (VD: *Nguyễn Văn A*).
* **email**: Email đăng nhập (VD: *contact@caulongstore.com*).
* **password_hash**: Mật khẩu đã được mã hóa (Bcrypt/Argon2).
* **role**: `vendor` (Bắt buộc phải set khác với default 'customer').
* **status**: `active`.
* **phone**: Số điện thoại liên hệ (VD: *0987654321*).
* **address**: Địa chỉ shop (VD: *123 Lê Lợi, TP. Vinh, Nghệ An*).

### 2. Dữ liệu Thông tin Cửa hàng (`vendors` table)
Liên kết trực tiếp với `user_id` ở trên.
* **store_name**: Tên hiển thị của shop (VD: *VNB Sports Vinh* hoặc *Tiến Minh Badminton*).
* **slug**: Đường dẫn tĩnh (VD: *vnb-sports-vinh*).
* **status**: `active` (thay vì default 'inactive' để shop có thể bán ngay).
* **commission_rate**: Tỉ lệ hoa hồng sàn thu (VD: `5.0` tương đương 5%).
* **bank_info**: Cấu trúc JSON chứa thông tin nhận tiền.
    * *Ví dụ JSON*: `{"bank": "Vietcombank", "account_no": "1012345678", "owner": "NGUYEN VAN A"}`

Dưới đây là danh sách **10 mặt hàng cầu lông** được chuẩn hóa theo cấu trúc dữ liệu bạn yêu cầu, bao gồm đầy đủ thông tin về danh mục, thông số kỹ thuật và tồn kho.

---

## 3. Bảng Danh mục (Categories)
| ID | Tên danh mục | Slug | Parent ID |
| :--- | :--- | :--- | :--- |
| 1 | Vợt cầu lông | `vot-cau-long` | NULL |
| 2 | Giày cầu lông | `giay-cau-long` | NULL |
| 3 | Phụ kiện | `phu-kien-cau-long` | NULL |
| 4 | Vợt Yonex | `vot-yonex` | 1 |
| 5 | Vợt Lining | `vot-lining` | 1 |
| 6 | Vợt Victor | `vot-victor` | 1 |
| 7 | Cước & Phụ kiện | `cuoc-phu-kien` | 3 |

---

## 4. Dữ liệu Sản phẩm (Products)

Dưới đây là 10 sản phẩm (tập trung vào vợt) để bạn đưa vào database. 
*Lưu ý: Tất cả sản phẩm sẽ sử dụng `vendor_id` của shop vừa tạo và có `status` mặc định là `active`.*

| STT | Tên sản phẩm (Name) | Mô tả (Description - Thông số kỹ thuật) | Giá (Price) | Tồn kho (Stock) | Danh mục |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Yonex Astrox 88D Pro (Gen 3)** | Trọng lượng: 4U, Cán: G5. Điểm cân bằng: Nặng đầu. Sức căng: 28lbs. Công nghệ: Rotational Generator System. | 4,250,000 | 25 | Vợt Yonex |
| 2 | **Yonex Nanoflare 1000Z** | Trọng lượng: 4U, Cán: G5. Dòng vợt siêu tốc độ, thân cứng, đầu cân bằng. Phù hợp đánh đôi, phản tạt. | 4,100,000 | 15 | Vợt Yonex |
| 3 | **Lining Axforce 80** | Trọng lượng: 3U/4U. Thân vợt linh hoạt, thiên công mạnh mẽ. Sức căng tối đa: 30lbs. | 3,850,000 | 12 | Vợt Lining |
| 4 | **Lining Halbertec 8000** | Trọng lượng: 4U, Cán: G5. Dòng vợt kiểm soát cầu toàn diện, cân bằng giữa công và thủ. | 3,700,000 | 20 | Vợt Lining |
| 5 | **Victor Thruster Ryuga II** | Trọng lượng: 3U/4U. Vợt thiên công, thân cứng vừa phải, sức căng cực cao lên đến 31lbs. | 3,600,000 | 10 | Vợt Victor |
| 6 | **Victor Brave Sword 12 SE** | Trọng lượng: 3U/4U. Khung vợt kim cương xé gió, huyền thoại của Victor cho lối đánh tốc độ. | 3,100,000 | 30 | Vợt Victor |
| 7 | **Yonex Arcsaber 11 Pro** | Trọng lượng: 4U, Cán: G5. Vợt công thủ toàn diện, điều cầu cực kỳ chính xác. | 4,050,000 | 18 | Vợt Yonex |
| 8 | **Giày Yonex 65Z3 Wide** | Giày chuyên dụng cầu lông cao cấp. Đệm Power Cushion+. Màu: Trắng/Xanh. Size: 39-44. | 2,800,000 | 45 | Giày |
| 9 | **Cước Yonex BG66 Ultimax** | Đường kính: 0.65mm. Cước cho độ nảy cao, tiếng nổ đanh. Màu: Trắng, Vàng, Cam. | 180,000 | 200 | Phụ kiện |
| 10 | **Quấn cán Yonex AC102EX** | Chất liệu cao su non bám tay, thấm hút mồ hôi tốt. Vỉ 3 cái. | 120,000 | 500 | Phụ kiện |
---