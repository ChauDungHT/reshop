# SKILL: CREATE_NEW_SHOP
**Mục tiêu:** Tự động hóa quy trình tạo một cửa hàng (Vendor) mới trên hệ thống Reshop bằng cách trích xuất dữ liệu từ file này và thực thi các câu lệnh Database cần thiết.

**Hướng dẫn dành cho Agent:**
1. **Đọc dữ liệu:** Phân tích thông tin từ các mục: Chủ shop (User), Thông tin cửa hàng (Vendor), Danh mục (Categories) và Sản phẩm (Products).
2. **Kiểm tra User:** Tìm kiếm User theo email `${email}`. Nếu chưa có, tạo User mới với role `vendor` và password mặc định (ví dụ: `123456`).
3. **Tạo Vendor:** Tạo bản ghi trong bảng `vendors` liên kết với User vừa tạo. Đảm bảo `slug` là duy nhất.
4. **Xử lý Danh mục:** Kiểm tra sự tồn tại của các danh mục theo `slug`. Nếu danh mục cha (Parent ID) chưa có, hãy tạo nó trước. Lưu lại ID của các danh mục để gán cho sản phẩm.
5. **Chèn Sản phẩm:** Thêm tất cả 10 sản phẩm vào bảng `products`. Phải gán đúng `vendor_id` của shop vừa tạo và `category_id` tương ứng.
6. **Xác nhận:** Báo cáo kết quả chi tiết bao gồm ID của Vendor và số lượng sản phẩm đã chèn.


---

## 1. Dữ liệu Tài khoản Chủ shop (`users` table)
* **name**: Nguyễn Văn A
* **email**: contact@caulongstore.com
* **phone**: 0987654321
* **address**: 123 Lê Lợi, TP. Vinh, Nghệ An


## 2. Dữ liệu Thông tin Cửa hàng (`vendors` table)
* **store_name**: Thế Giới Cầu Lông (Updated)
* **slug**: the-gioi-cau-long
* **commission_rate**: 5.0
* **bank_info**: `{"bank": "Vietcombank", "account_no": "1012345678", "owner": "NGUYEN VAN A"}`


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
| 8 | Vợt Mizuno | `vot-mizuno` | 1 |
| 9 | Vợt Kumpoo | `vot-kumpoo` | 1 |
| 10 | Balo - Túi | `balo-tui` | NULL |
| 11 | Quần áo | `quan-ao` | NULL |


---

## 4. Dữ liệu Sản phẩm (Products)

Dưới đây là 10 sản phẩm (tập trung vào vợt) để bạn đưa vào database. 
*Lưu ý: Tất cả sản phẩm sẽ sử dụng `vendor_id` của shop vừa tạo và có `status` mặc định là `active`.*

| STT | Tên sản phẩm (Name) | Mô tả (Description - Thông số kỹ thuật) | Giá (Price) | Tồn kho (Stock) | Danh mục | Ảnh (Images) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 4 | **Mizuno Fortius 10 Quick** | Trọng lượng: 4U. Vợt thiên về phản tạt, tốc độ vung vợt cực nhanh. Thiết kế tối ưu cho dòng đánh đôi. | 3,950,000 | 12 | Vợt Mizuno | `/uploads/products/mizuno-fortius-10-quick.png` |
| 5 | **Kumpoo Power Control K520 Pro** | Trọng lượng: 4U, Cán: G5. Thân vợt dẻo, trợ lực cực tốt, điểm ngọt lớn phù hợp cho người mới bắt đầu. | 650,000 | 80 | Vợt Kumpoo | `/uploads/products/kumpoo-power-control-k520-pro.png` |
| 6 | **Giày Lining AYTS012** | Giày form rộng, đế cao su chống mài mòn cao. Tích hợp công nghệ đệm giảm chấn Cloud êm ái. Màu: Đen/Đỏ. | 1,450,000 | 35 | Giày cầu lông | `/uploads/products/giay-lining-ayts012.png` |
| 7 | **Giày Victor P9200II** | Dòng giày siêu êm ái của Victor. Trang bị hệ thống đệm Energymax 3.0 và công nghệ chống lật cổ chân an toàn. | 2,500,000 | 25 | Giày cầu lông | `/uploads/products/giay-victor-p9200ii.png` |
| 8 | **Balo Yonex BA82012EX** | Balo thể thao đa năng, có ngăn chứa giày và vợt riêng biệt. Kích thước: 33x25.5x50 cm, chất liệu chống nước nhẹ. | 1,150,000 | 40 | Balo - Túi | `/uploads/products/balo-yonex-ba82012ex.png` |
| 9 | **Túi cầu lông Lining ABJS037** | Túi chữ nhật 2 ngăn lớn, trang bị lớp cách nhiệt bảo vệ khung vợt. Sức chứa tối đa lên đến 6 cây vợt. | 1,200,000 | 15 | Balo - Túi | `/uploads/products/tui-cau-long-lining-abjs037.png` |
| 10 | **Ống cầu lông Vina Star** | Quả cầu lông tiêu chuẩn thi đấu, tốc độ 76. Độ bền lông cao, quỹ đạo bay ổn định. (Đóng gói: Ống 12 quả). | 220,000 | 300 | Phụ kiện | `/uploads/products/ong-cau-long-vina-star.png` |
| 11 | **Cước Lining No.1** | Đường kính: 0.65mm. Dòng cước trợ lực, độ nảy cực tốt và âm thanh đanh rát, đối thủ cạnh tranh của BG66U. | 150,000 | 150 | Phụ kiện | `/uploads/products/cuoc-lining-no-1.png` |
| 12 | **Quấn cán vải Victor GR334** | Quấn cán bằng chất liệu vải nhung, siêu thấm hút hôi. Lựa chọn tối ưu cho người chơi ra nhiều mồ hôi tay. | 45,000 | 400 | Phụ kiện | `/uploads/products/quan-can-vai-victor-gr334.png` |
| 13 | **Áo cầu lông Yonex 10458EX** | Chất liệu vải Polyester thoáng khí, ứng dụng công nghệ VeryCool làm mát nhanh chóng. Form dáng thể thao. | 650,000 | 60 | Quần áo | `/uploads/products/ao-cau-long-yonex-10458ex.png` |




---