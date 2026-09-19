# CHÍNH SÁCH QUYỀN RIÊNG TƯ (PRIVACY POLICY)
**Hệ thống Ứng Dụng Quản Lý Con Cái: ParentPro & KidCare**  
*Cập nhật lần cuối: Ngày 19 tháng 09 năm 2026*

---

## 1. Giới Thiệu & Cam Kết Chung

Chào mừng bạn đến với hệ thống giải pháp bảo vệ và đồng hành cùng con trẻ:
* **ParentPro (Dành cho Cha Mẹ)** – Mã gói (Package Name): `com.lethao.parentpro`
* **KidCare (Dành cho Con Cái)** – Mã gói (Package Name): `com.lethao.kidcare`
* **Nhà phát triển:** Lê Thảo (Email hỗ trợ: `support@parentpro.vn` / `thaoh@gmail.com`)

Chúng tôi cam kết bảo vệ tối đa quyền riêng tư và sự an toàn của trẻ em trên không gian mạng. Ứng dụng được thiết kế nhằm mục đích duy nhất là giúp phụ huynh đồng hành, bảo vệ an toàn thể chất và định hướng thói quen sử dụng thiết bị số lành mạnh cho con cái. 

Chính sách này tuân thủ nghiêm ngặt **Đạo luật Bảo vệ Quyền riêng tư của Trẻ em trên Mạng (COPPA)**, **Quy định Bảo vệ Dữ liệu Chung (GDPR)**, **Luật Trẻ Em Việt Nam 2016** và các chính sách của **Google Play Developer Policy**.

---

## 2. Dữ Liệu Thu Thập & Mục Đích Sử Dụng Chi Tiết

Để các tính năng giám sát an toàn hoạt động chính xác, ứng dụng KidCare trên máy con thu thập một số dữ liệu cần thiết dưới sự kiểm soát và đồng ý của phụ huynh:

### A. Dữ liệu Vị trí Thời Gian Thực & Vị trí Chạy Ngầm (Location Data)
* **Các quyền Android sử dụng:** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`.
* **Mục đích:**
  1. Cho phép cha mẹ xem vị trí hiện tại của con trên bản đồ thời gian thực.
  2. Tự động thông báo khi con ra/vào Vùng An Toàn (nhà, trường học).
  3. Gửi tọa độ cứu nạn khẩn cấp tức thời khi con bấm nút **SOS Khẩn Cấp**.
* **Công bố nổi bật (Prominent Disclosure):** Ứng dụng KidCare thu thập dữ liệu vị trí ngay cả khi ứng dụng đang đóng hoặc không chạy trên màn hình (chạy ngầm) để tính năng khoanh vùng an toàn Geofence và định vị khẩn cấp SOS luôn sẵn sàng bảo vệ con 24/7.
* **Bảo mật:** Dữ liệu vị trí chỉ được mã hóa và truyền tải duy nhất đến tài khoản phụ huynh đã liên kết, tuyệt đối không chia sẻ cho bên thứ ba, không dùng cho quảng cáo.

### B. Dịch vụ Trợ Năng (Accessibility Service API)
* **Quyền Android sử dụng:** `android.permission.BIND_ACCESSIBILITY_SERVICE`.
* **Mục đích:**
  1. Nhận biết khi con mở ứng dụng nằm trong danh mục cấm hoặc ứng dụng đã hết hạn mức sử dụng để kích hoạt màn hình khóa nhắc nhở.
  2. Ngăn chặn hành vi gỡ cài đặt ứng dụng bảo vệ khi chưa có mật mã PIN của cha mẹ.
* **CAM KẾT MINH BẠCH VỀ QUYỀN TRỢ NĂNG:**
  * KHÔNG ghi lại thao tác bàn phím (No Keylogger).
  * KHÔNG đọc nội dung tin nhắn riêng tư (Zalo, Messenger, SMS,...).
  * KHÔNG thu thập mật khẩu, tài khoản ngân hàng hoặc thông tin nhạy cảm.
  * Chỉ sử dụng thông tin tên gói ứng dụng (Package Name) của cửa sổ đang hiển thị để đối chiếu quy tắc chặn của phụ huynh.

### C. Dữ liệu Thống Kê Giờ Dùng Ứng Dụng (Package Usage Stats)
* **Quyền Android sử dụng:** `android.permission.PACKAGE_USAGE_STATS`.
* **Mục đích:** Tính toán thời lượng sử dụng từng ứng dụng trong ngày (ví dụ: YouTube 30 phút, Game 15 phút, Học tập 45 phút) để lập biểu đồ báo cáo cho cha mẹ.

### D. Cảm biến Âm thanh Môi trường (Microphone / Audio Sensor)
* **Quyền Android sử dụng:** `android.permission.RECORD_AUDIO`.
* **Mục đích:** Đo cường độ âm thanh xung quanh theo thang decibel (dB) nhằm nhắc nhở khi môi trường học tập quá ồn ào.
* **Cam kết:** Ứng dụng **KHÔNG ghi âm**, **KHÔNG lưu trữ tệp âm thanh**, và **KHÔNG truyền tải giọng nói** lên bất kỳ máy chủ nào.

### E. Quản Trị Viên Thiết Bị (Device Administrator)
* **Quyền Android sử dụng:** `android.permission.BIND_DEVICE_ADMIN`.
* **Mục đích:** Ngăn ngừa việc vô tình gỡ cài đặt ứng dụng bảo vệ, bảo đảm hệ sinh thái an toàn không bị gián đoạn.

### F. Dịch vụ Chạy Ngầm & Thông Báo (Foreground Service & Notifications)
* **Các quyền:** `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.
* **Mục đích:** Đảm bảo duy trì thông báo tức thì (Còi báo động SOS, Lời dặn dò, Yêu cầu gia hạn giờ) ngay cả khi màn hình tắt hoặc khi đang mở ứng dụng khác.

---

## 3. Cơ Chế Lưu Trữ, Mã Hóa & Chia Sẻ Dữ Liệu

1. **Phân vùng dữ liệu gia đình (Strict Partitioning):**  
   Toàn bộ dữ liệu (tọa độ GPS, tin nhắn, nhiệm vụ, cài đặt) được lưu trữ trên hạ tầng **Google Cloud Firebase (Firestore & Realtime Database)** theo khóa phân vùng độc quyền `parentId_childId`. Thiết bị của gia đình khác hoàn toàn không thể truy cập hoặc nhìn thấy dữ liệu của gia đình bạn.
2. **Mã hóa an toàn:**  
   Dữ liệu được mã hóa trong suốt quá trình truyền tải bằng chuẩn giao thức bảo mật cao cấp (HTTPS, TLS 1.3, WSS) và mã hóa khi lưu trữ tĩnh (Encryption at Rest) trên Google Cloud.
3. **Không quảng cáo & Không bán dữ liệu:**  
   Chúng tôi cam kết 100% không tích hợp mạng lưới quảng cáo, không theo dõi hành vi thương mại và không bán/cho thuê dữ liệu người dùng cho bất kỳ bên thứ ba nào.

---

## 4. Quyền Riêng Tư Của Trẻ Em & Sự Đồng Ý Của Cha Mẹ (COPPA)

* Ứng dụng KidCare chỉ được phép kích hoạt sau khi phụ huynh hoàn tất quy trình liên kết bảo mật (đăng nhập tài khoản Google của phụ huynh hoặc nhập mã PIN ghép nối 6 chữ số).
* Cha mẹ có toàn quyền xem xét, điều chỉnh, tạm dừng hoặc xóa bỏ bất kỳ dữ liệu nào liên quan đến con cái của mình bất cứ lúc nào.

---

## 5. Chính Sách Xóa Dữ Liệu & Hủy Tài Khoản (Data Deletion)

Người dùng có quyền yêu cầu xóa toàn bộ dữ liệu cá nhân và tài khoản bất kỳ lúc nào:
1. **Xóa trực tiếp trong ứng dụng ParentPro:** Vào mục **Cài đặt** -> Chọn **Hồ sơ tài khoản** -> Nhấn nút **"Xóa tài khoản & Toàn bộ dữ liệu"**. Hệ thống sẽ lập tức xóa sạch thông tin phụ huynh, danh sách con cái, lịch sử định vị và dữ liệu liên quan khỏi cơ sở dữ liệu đám mây.
2. **Yêu cầu qua email:** Gửi email yêu cầu xóa dữ liệu đến `support@parentpro.vn` kèm địa chỉ email đăng ký. Chúng tôi sẽ xử lý và hoàn tất việc xóa vĩnh viễn trong vòng 24 - 48 giờ làm việc.

---

## 6. Thông Tin Liên Hệ

Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc đóng góp ý kiến về Chính Sách Quyền Riêng Tư này, vui lòng liên hệ với chúng tôi:
* **Đại diện phát triển:** Lê Thảo
* **Email:** `support@parentpro.vn`
* **Kho mã nguồn:** [https://github.com/Thaopxtn/quan-ly-con](https://github.com/Thaopxtn/quan-ly-con)
* **Địa chỉ:** Việt Nam

---
*Chính sách này có hiệu lực kể từ ngày công bố và áp dụng cho toàn bộ người dùng cài đặt ứng dụng ParentPro và KidCare.*
