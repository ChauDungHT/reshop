# Hệ thống ReShop - Sơ đồ Chuyển Trạng thái Đơn hàng (State Diagram)

Tài liệu này mô tả chi tiết các trạng thái và luồng chuyển trạng thái (State Transition) của đối tượng **Đơn hàng (Order)** trong hệ thống ReShop dựa trên phân tích logic từ các controller (`checkout.controller.ts`, `vendor.controller.ts`, `admin-dispute.controller.ts`).

---

## 1. Sơ đồ Chuyển Trạng thái (Mermaid State Diagram)

Dưới đây là sơ đồ trạng thái mô tả vòng đời của một Đơn hàng từ khi khởi tạo cho đến khi kết thúc (Thành công, Hủy hoặc Trả hàng):

```mermaid
stateDiagram-v2
    [*] --> pending : Khách hàng đặt hàng (Checkout)
    
    state pending {
        [*] --> Chờ_Thanh_Toán : Thanh toán VNPAY (Chưa thanh toán)
        [*] --> Chờ_Xác_Nhận : Thanh toán Ví / COD
    }

    %% Transitions from pending
    pending --> confirmed : Thanh toán VNPAY thành công (IPN '00') / Vendor xác nhận đơn
    pending --> cancelled : Thanh toán thất bại / Khách hàng hủy đơn / Vendor từ chối đơn

    %% Transitions from confirmed
    confirmed --> processing : Vendor bắt đầu chuẩn bị hàng
    confirmed --> cancelled : Khách hàng / Vendor hủy đơn (Khi chưa giao hàng)

    %% Transitions from processing
    processing --> shipped : Vendor nhập mã vận đơn (tracking_code) & gửi hàng
    processing --> cancelled : Hủy đơn trong quá trình chuẩn bị (Sự cố kho, sản phẩm lỗi)

    %% Transitions from shipped
    shipped --> delivered : Giao hàng thành công đến Người mua

    %% Transitions from delivered (After-sales & Return/Refund)
    delivered --> returned : Khách hàng yêu cầu trả hàng (Trong 7 ngày) & được duyệt (Vendor/Admin)
    delivered --> [*] : Giao dịch hoàn tất (Sau 7 ngày không phát sinh khiếu nại)

    %% End states
    cancelled --> [*] : Hủy đơn hoàn tất (Hoàn tiền nếu có / Hoàn tồn kho sản phẩm)
    returned --> [*] : Hoàn trả hàng & Hoàn tiền cho Người mua thành công
```

---

## 2. Mô tả Chi tiết các Trạng thái & Điều kiện Chuyển đổi

### 2.1 Trạng thái khởi đầu (`pending`)
* **Mô tả:** Đơn hàng được tạo thành công trên hệ thống. 
* **Nhánh xử lý:**
  * Nếu chọn thanh toán qua **VNPAY**: Đơn hàng ở trạng thái chờ xác nhận từ cổng thanh toán.
  * Nếu chọn thanh toán qua **Ví điện tử** hoặc **COD**: Đơn hàng chờ Vendor xác nhận chuẩn bị hàng.

### 2.2 Trạng thái đã xác nhận (`confirmed`)
* **Điều kiện chuyển đổi:**
  * Hệ thống nhận được IPN phản hồi giao dịch thành công (`vnp_ResponseCode == '00'`) từ VNPAY.
  * Hoặc Vendor duyệt đơn hàng từ màn hình quản lý (đối với thanh toán Ví/COD).
* **Đặc tính:** Đơn hàng chính thức hợp lệ và chuyển sang khâu xử lý tiếp theo.

### 2.3 Trạng thái đang chuẩn bị hàng (`processing`)
* **Điều kiện chuyển đổi:** Vendor chọn bắt đầu xử lý đơn hàng.
* **Mô tả:** Các sản phẩm trong đơn được chuẩn bị và đóng gói tại kho của Vendor.

### 2.4 Trạng thái đang giao hàng (`shipped`)
* **Điều kiện chuyển đổi:** Vendor cập nhật trạng thái kèm theo **Mã vận đơn (tracking_code)** hợp lệ.
* **Mô tả:** Đơn hàng đã được bàn giao cho đơn vị vận chuyển để giao tới Người mua.

### 2.5 Trạng thái đã giao hàng (`delivered`)
* **Điều kiện chuyển đổi:** Xác nhận người mua đã nhận được hàng.
* **Mô tả:** Đơn hàng giao thành công. Lúc này, tiền thanh toán của người mua sẽ được cộng vào số dư đóng băng (`pending_balance`) của Vendor.

### 2.6 Trạng thái đã hủy (`cancelled`)
* **Điều kiện chuyển đổi:**
  * Khách hàng hủy đơn hàng (chỉ khả thi khi các đơn con đang ở trạng thái `pending`).
  * Thanh toán VNPAY hết hạn hoặc bị lỗi.
  * Vendor từ chối nhận đơn.
* **Hành động hệ thống:** Tự động hoàn trả số lượng sản phẩm (`stock = stock + quantity`) về kho hàng để bán tiếp. Nếu đã thanh toán qua ví, hệ thống tự động hoàn tiền vào ví khả dụng của Người mua.

### 2.7 Trạng thái đã trả hàng (`returned`)
* **Điều kiện chuyển đổi:** 
  * Người mua tạo yêu cầu trả hàng trong vòng 7 ngày kể từ lúc nhận hàng thành công (`delivered`).
  * Vendor hoặc Admin duyệt yêu cầu (`ReturnRequest.status` chuyển thành `approved` hoặc `resolved_admin` cho bên mua thắng kiện).
* **Hành động hệ thống:** Trừ tiền đóng băng (`pending_balance`) của Vendor, hoàn trả tiền vào ví Người mua, và hoàn số lượng sản phẩm về kho của shop.
