# Hệ thống ReShop - Sơ đồ Lớp Tổng thể (Overall Class Diagram)

Tài liệu này cung cấp bản thiết kế cấu trúc tĩnh toàn diện của hệ thống **ReShop**, thể hiện chi tiết các thực thể dữ liệu, thuộc tính, kiểu dữ liệu, các quan hệ ràng buộc và các cơ chế logic cốt lõi đảm bảo tính toàn vẹn dữ liệu.

---

## 1. Sơ đồ Lớp Tổng thể (Mermaid Class Diagram)

Dưới đây là sơ đồ chi tiết các lớp dữ liệu và các mối quan hệ liên kết trong hệ thống ReShop:

```mermaid
classDiagram
    %% Thể hiện các Class chính và kiểu dữ liệu chuẩn từ schema database
    class User {
        +UUID id
        +String name
        +String email
        +String password_hash
        +UserRole role
        +String status
        +Decimal wallet_balance
        +Decimal pending_balance
        +String phone
        +String address
        +String avatar_url
        +DateTime last_login_at
        +DateTime created_at
    }

    class Customer {
        %% Thừa kế từ User, đại diện cho khách mua hàng
    }

    class VendorUser {
        %% Thừa kế từ User, đại diện cho người bán hàng
    }

    class Admin {
        %% Thừa kế từ User, đại diện cho quản trị viên hệ thống
    }

    User <|-- Customer : Kế thừa
    User <|-- VendorUser : Kế thừa
    User <|-- Admin : Kế thừa

    class Vendor {
        +UUID id
        +UUID user_id
        +String store_name
        +String slug
        +VendorStatus status
        +Decimal commission_rate
        +JSON bank_info
        +String logo_url
        +String banner_url
        +String phone
        +String address
        +String email
        +int return_policy_days
        +String return_policy_desc
        +UUID fee_tier_id
        +DateTime created_at
        +DateTime updated_at
    }

    VendorUser "1" --> "0..1" Vendor : Sở hữu (Đã kích hoạt)

    class FeeTier {
        +UUID id
        +String tier_name
        +String description
        +DateTime created_at
        +DateTime updated_at
    }

    class FeeTierItem {
        +UUID id
        +UUID fee_tier_id
        +String fee_name
        +String fee_type
        +Decimal fee_value
        +DateTime created_at
        +DateTime updated_at
    }

    FeeTier "1" --> "*" FeeTierItem : Định nghĩa các loại phí
    FeeTier "1" --> "*" Vendor : Áp dụng cho gian hàng

    class Category {
        +UUID id
        +String name
        +String slug
        +UUID parent_id
        +int sort_order
        +DateTime created_at
    }
    Category "0..1" <-- "*" Category : Tự tham chiếu (parent_id)

    class Product {
        +UUID id
        +UUID vendor_id
        +UUID category_id
        +String name
        +String description
        +Decimal price
        +int stock
        +Boolean is_featured
        +JSON image_urls
        +ProductStatus status
        +Decimal average_rating
        +DateTime created_at
        +DateTime updated_at
        +DateTime deleted_at
    }

    Category "1" --> "*" Product : Thuộc danh mục
    Vendor "1" --> "*" Product : Đăng bán

    class ProductImage {
        +UUID id
        +UUID product_id
        +String url
        +Boolean is_primary
        +int display_order
        +DateTime created_at
    }
    Product "1" --> "*" ProductImage : Hình ảnh chi tiết

    class Tag {
        +UUID id
        +String name
    }
    Product "1" --> "*" Tag : Gắn thẻ phân loại

    class Review {
        +UUID id
        +UUID order_id
        +UUID product_id
        +UUID user_id
        +int stars
        +String comment
        +JSON images
        +String vendor_reply
        +DateTime created_at
        +DateTime updated_at
    }
    Product "1" --> "*" Review : Nhận đánh giá
    User "1" --> "*" Review : Viết đánh giá

    class QA {
        +UUID id
        +UUID product_id
        +UUID user_id
        +String question
        +String answer
        +UUID answered_by
        +DateTime answered_at
        +DateTime created_at
        +DateTime updated_at
    }
    Product "1" --> "*" QA : Hỏi đáp liên quan
    User "1" --> "*" QA : Hỏi sản phẩm
    Vendor "1" --> "*" QA : Trả lời thắc mắc

    class CartItem {
        +UUID id
        +UUID user_id
        +UUID product_id
        +int quantity
        +DateTime created_at
        +DateTime updated_at
    }
    User "1" --> "*" CartItem : Có trong giỏ hàng
    Product "1" --> "*" CartItem : Được thêm vào giỏ

    class Order {
        +UUID id
        +UUID buyer_id
        +String order_code
        +Decimal total_amount
        +Decimal refunded_amount
        +OrderStatus status
        +JSON shipping_address
        +String payment_method
        +String payment_status
        +String vnpay_transaction_no
        +String vnpay_bank_code
        +String vnpay_card_type
        +DateTime vnpay_pay_date
        +DateTime created_at
        +DateTime updated_at
    }
    User "1" --> "*" Order : Đặt mua (Khách hàng)

    class SubOrder {
        +UUID id
        +UUID order_id
        +UUID vendor_id
        +String sub_order_code
        +String status
        +Decimal subtotal
        +Decimal shipping_fee
        +Decimal vendor_discount
        +Decimal platform_discount
        +Decimal refunded_amount
        +String tracking_number
        +OrderFeedbackStatus feedback_status
        +DateTime delivered_at
        +DateTime created_at
        +DateTime updated_at
    }
    Order "1" --> "*" SubOrder : Tách đơn theo gian hàng
    Vendor "1" --> "*" SubOrder : Xử lý giao hàng

    class OrderItem {
        +UUID id
        +UUID order_id
        +UUID sub_order_id
        +UUID product_id
        +int quantity
        +Decimal price_snapshot
        +String product_name_snapshot
        +DateTime created_at
    }
    Order "1" --> "*" OrderItem : Gồm các sản phẩm
    SubOrder "1" --> "*" OrderItem : Chi tiết đơn hàng con
    Product "1" --> "*" OrderItem : Tham chiếu (Snapshot)

    class ReturnRequest {
        +UUID id
        +UUID order_item_id
        +String reason
        +String description
        +JSON images
        +ReturnStatus status
        +String reject_reason
        +String admin_notes
        +DateTime resolved_at
        +DateTime created_at
        +DateTime updated_at
    }
    OrderItem "1" --> "0..1" ReturnRequest : Đổi trả / Hoàn tiền

    class WalletTransaction {
        +UUID id
        +UUID user_id
        +Decimal amount
        +WalletTransactionType type
        +UUID ref_id
        +Decimal balance_after
        +DateTime created_at
    }
    User "1" --> "*" WalletTransaction : Lịch sử ví điện tử

    class VNPayTransaction {
        +UUID id
        +UUID order_id
        +String txn_ref
        +String transaction_no
        +String command
        +Decimal amount
        +String response_code
        +String transaction_status
        +String bank_code
        +String card_type
        +JSON raw_request
        +JSON raw_response
        +DateTime created_at
    }
    Order "1" --> "*" VNPayTransaction : Thanh toán trực tuyến

    %% Định nghĩa các kiểu Enumeration (Enums) để biểu diễn kiểu dữ liệu ràng buộc
    class UserRole {
        <<enumeration>>
        customer
        vendor
        admin
    }
    class VendorStatus {
        <<enumeration>>
        inactive
        active
        banned
    }
    class OrderStatus {
        <<enumeration>>
        pending
        confirmed
        processing
        shipped
        delivered
        cancelled
        returned
    }
    class WalletTransactionType {
        <<enumeration>>
        deposit
        withdraw
        refund
        payment
        pending_credit
        pending_release
    }
    class OrderFeedbackStatus {
        <<enumeration>>
        awaiting_feedback
        reviewed
        disputed
        auto_completed
    }
    class ReturnStatus {
        <<enumeration>>
        pending_vendor
        approved
        rejected
        escalated
        resolved_admin
    }
    class ProductStatus {
        <<enumeration>>
        active
        inactive
        out_of_stock
        deleted
    }
```

---

## 2. Phân tích Chi tiết các Logic Ràng buộc Cốt lõi

### 2.1 Lớp Người dùng đa vai trò & Gian hàng (Vendor)
* **Kế thừa vai trò (Inheritance):** Hệ thống phân cấp `User` làm lớp cơ sở chứa các thông tin tài khoản chung. Các lớp `Customer` (Khách hàng), `VendorUser` (Người bán) và `Admin` (Quản trị viên) kế thừa trực tiếp từ `User`.
* **Quan hệ ràng buộc 1 - 0..1:** Mối liên kết giữa `User` (cụ thể là `VendorUser`) và `Vendor` (Gian hàng) được thiết lập thông qua khóa ngoại `user_id` (được đánh chỉ mục UNIQUE).
* **Quy trình kích hoạt:** 
  > [!IMPORTANT]
  > Để kích hoạt gian hàng, người dùng bắt buộc phải có vai trò `vendor`. Khi vừa tạo mới, trạng thái mặc định của gian hàng sẽ là `inactive` (chờ kiểm duyệt). Chỉ sau khi Admin phê duyệt thành công, trạng thái mới chuyển sang `active` và cho phép đăng bán sản phẩm.

### 2.2 Cấu trúc Cây danh mục không giới hạn (Self-Referencing)
* **Mô hình tự tham chiếu:** Lớp `Category` (Danh mục) tự liên kết với chính nó thông qua trường `parent_id` (kiểu UUID).
* **Cơ chế hoạt động:** 
  * Danh mục cấp cao nhất có `parent_id = NULL`.
  * Các danh mục con cấp dưới lưu `parent_id` trỏ đến danh mục cha.
  * Cơ chế này hỗ trợ thiết lập cây danh mục cầu lông với độ sâu vô hạn (ví dụ: *Vợt cầu lông -> Vợt Yonex -> Yonex Astrox*).

### 2.3 Liên kết Sản phẩm và các Thực thể vệ tinh
* Một đối tượng `Product` đóng vai trò trung tâm liên kết với nhiều thực thể vệ tinh theo mối quan hệ `1 - n`:
  * **Hình ảnh (ProductImage):** Quản lý bộ sưu tập ảnh của sản phẩm, trong đó có một ảnh được thiết lập `is_primary = TRUE` làm ảnh đại diện.
  * **Tag (Nhãn phân loại):** Phân nhóm sản phẩm theo nhu cầu riêng.
  * **Đánh giá (Review):** Khách mua hàng để lại nhận xét và số sao (1-5), đồng thời người bán có thể phản hồi (`vendor_reply`).
  * **Hỏi đáp & Phản hồi (QA):** Khách hàng đặt câu hỏi công khai và người bán trả lời.

---

## 3. Điểm sáng Kỹ thuật: Cơ chế Snapshot của OrderItem

> [!TIP]
> **Cơ chế Snapshot lịch sử đơn giá & thông tin sản phẩm**
> Để đảm bảo tính toàn vẹn dữ liệu tài chính và bảo vệ lịch sử giao dịch trước mọi thay đổi trong tương lai (khi người bán đổi giá, đổi tên hoặc xóa sản phẩm), hệ thống áp dụng cơ chế chụp ảnh dữ liệu (Snapshot) tại đúng thời điểm thanh toán.

```mermaid
flowchart TD
    A[Khách hàng thêm sản phẩm vào Giỏ] --> B(Lấy giá hiện thời từ bảng Products)
    B --> C[Khách hàng tiến hành Thanh toán]
    C --> D{Chụp lại thông tin lúc đó}
    D --> E[Lưu price_snapshot vào OrderItem]
    D --> F[Lưu product_name_snapshot vào OrderItem]
    E & F --> G[Đơn hàng được khóa vĩnh viễn - Không bị ảnh hưởng bởi thay đổi giá tương lai]
```

* **OrderItem:** Chứa hai trường snapshot quan trọng:
  * `price_snapshot`: Lưu mức giá tại thời điểm đặt hàng.
  * `product_name_snapshot`: Lưu tên sản phẩm tại thời điểm đặt hàng.
* Mối liên hệ: `OrderItem` trỏ đến `Product` thông qua `product_id` (ràng buộc `ON DELETE RESTRICT` để tránh mất dữ liệu liên kết vật lý), đồng thời lưu giá trị snapshot độc lập.

---

## 4. Quản lý Luồng giao dịch, Hóa đơn và Ví điện tử

* **Hóa đơn và Vận chuyển (Sub-Orders):** 
  * Một đơn hàng lớn `Order` gồm nhiều sản phẩm từ các shop khác nhau sẽ được tự động chia nhỏ thành các `SubOrder` (Đơn hàng con) theo từng `Vendor`.
  * Mỗi `SubOrder` có thông tin vận chuyển, mã vận đơn `tracking_number`, phí giao hàng `shipping_fee` riêng và có thể xuất hóa đơn PDF độc lập.
* **Luồng giao dịch (WalletTransaction & VNPayTransaction):**
  * **VNPayTransaction:** Ánh xạ các thông tin thanh toán online qua cổng VNPAY. Lưu trữ chi tiết phản hồi kết quả giao dịch và mã giao dịch hệ thống ngân hàng.
  * **WalletTransaction:** Quản lý ví điện tử của người dùng và nhà bán hàng. Hỗ trợ ghi nhận các loại giao dịch: đặt cọc (`deposit`), rút tiền (`withdraw`), hoàn tiền (`refund`), thanh toán (`payment`), tạm giữ doanh thu (`pending_credit`, `pending_release`).
