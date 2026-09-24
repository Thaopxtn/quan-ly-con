# Hướng Dẫn & Quy Tắc Dự Án Quản Lý Con (KidCare & ParentPro)

Tài liệu này được tối ưu hóa cho Antigravity (Google DeepMind) nhằm hiểu sâu kiến trúc, tuân thủ các quy tắc cốt lõi và tự động hóa kiểm thử cho dự án Quản Lý Con.

---

## 1. Kiến Trúc Dự Án (Architecture Overview)

Dự án gồm 3 phần chính chạy song song:
1. **App Cha Mẹ (`appchame/`)**: 
   - Ứng dụng giám sát, điều khiển từ xa, thiết lập thời gian sử dụng, khóa máy, bản đồ GPS, thưởng sao, phê duyệt gia hạn.
   - Entry point: `appchame/src/ParentWebPortal.tsx`, `appchame/src/components/Kids360ScreenTimeGauge.tsx`, `appchame/src/components/UnifiedChildHub.tsx`.
   - Android container: `android-parent/` -> Xuất file `ParentPro-AppChaMe.apk`.
2. **App Con Cái (`appconchau/`)**:
   - Ứng dụng cài trên điện thoại của con. Chạy background service thực thi quy tắc, khóa màn hình đè (Overlay lock), giới hạn app, đếm bước chân, thu thập telemetry GPS & pin.
   - Entry point: `appconchau/src/KidApp.tsx`.
   - Android container: `android-kid/` -> Xuất file `KidCare-AppConCai.apk`.
3. **Local PC Server & Cloudflare Tunnel (`server.cjs` & `tunnel-manager.cjs`)**:
   - Máy chủ Node.js cục bộ chạy cổng `3000` (PM2 service: `quan-ly-con-server`).
   - Đường hầm Cloudflare Tunnel (PM2 service: `quan-ly-con-tunnel`) tự động duy trì URL public kết nối 4G/WiFi từ xa và cập nhật lên GitHub/jsDelivr.
   - Lưu trữ dữ liệu JSON tại `data/` (`children.json`, `child_settings.json`, `remote_commands.json`, `telemetry_history.json`, v.v.).
4. **Mô-đun Dùng Chung (`shared/`)**:
   - `shared/store.ts`: State management tập trung cho toàn bộ ứng dụng (`useAppState()`).
   - `shared/services/serverApiClient.ts`: REST API & SSE client kết nối server.
   - `shared/firebase/cloudSyncService.ts`: Lớp đồng bộ đám mây và xử lý tín hiệu.

---

## 2. Các Quy Tắc Cốt Lõi Khi Lập Trình (Strict Development Rules)

### Quy Tắc 1: Không Thay Đổi Trạng Thái Nút Bấm Ảo (No Premature Optimistic UI)
- Khi Cha Mẹ bấm nút **Khóa máy** hoặc **Mở khóa**, **TUYỆT ĐỐI KHÔNG** tự động đổi ngay trạng thái `isLocked` của nút trong store trước khi máy con xác nhận.
- Trong thời gian chờ máy con phản hồi:
  - Nút bấm phải hiển thị **Trạng thái thực tế hiện tại của con** kèm spinner đang gửi (ví dụ: `Đang gửi lệnh khóa... (Trạng thái con: Đang Mở 🟢)`).
  - Chỉ khi nhận được ACK với `status: 'executed'` từ máy con (hoặc qua snapshot telemetry mới nhất), nút mới được chuyển sang trạng thái mới.
  - Sau 15 giây nếu không nhận được phản hồi (máy con ngoại tuyến/tắt mạng), nút tự động hoàn nguyên về trạng thái cũ và hiển thị cảnh báo cho cha mẹ.

### Quy Tắc 2: Truyền Nhận Lệnh Hai Chiều (Dual-Transport & Bidirectional ACK)
- Mọi lệnh từ xa (`lock_now`, `unlock_now`, `buzz_siren`, v.v.) phải gửi qua 2 kênh:
  1. **SSE tức thời (0ms)**: Truyền realtime khi kết nối mạng thông suốt.
  2. **Active Polling dự phòng (mỗi 3s)**: App con quét chủ động `/api/command?childId=...` để đảm bảo thực thi ngay cả khi Android đưa app vào chế độ ngủ sâu (Doze Mode).
- Ngay sau khi thực thi lệnh trên thiết bị con, App con phải gửi ngay xác nhận ACK:
  ```ts
  sendRemoteCommandAck(parentId, childId, {
    id: cmdId,
    command: cmd.command,
    status: 'executed',
    childId: childId,
    childName: childName,
    deviceName: deviceName,
    detail: 'Đã thực thi thành công trên thiết bị con'
  });
  ```

### Quy Tắc 3: Quản Lý Đa Hồ Sơ Con Thông Minh (Smart Multi-Child Routing)
- Khi cha mẹ mở app, hệ thống phải tự động kiểm tra và ưu tiên chọn thiết bị đang **Trực tuyến / hoạt động gần nhất**.
- Tránh tình trạng lưu cố định hồ sơ cũ đã offline nhiều ngày (như máy cũ) khiến lệnh gửi không tới đúng điện thoại con đang dùng.
- Hiển thị rõ tên và trạng thái của bé đang được điều khiển trên tất cả các nút bấm và màn hình chính.

### Quy Tắc 4: Quản Lý & Nhắc Nhở Quyền Truy Cập Thời Gian Sử Dụng (`PACKAGE_USAGE_STATS`)
- Khi Cha Mẹ xem bất kỳ màn hình nào liên quan đến **Thời gian sử dụng**, **Đồng hồ 360** hoặc **Báo cáo ứng dụng**:
  - Hệ thống phải kiểm tra cờ `hasUsageAccessPermission` của thiết bị con.
  - Nếu con **Chưa cấp quyền**, hiển thị ngay thông báo cảnh báo kèm nút hành động: **"Yêu cầu máy con cấp quyền ngay"**.
  - Khi Cha Mẹ bấm nút, hệ thống gửi lệnh từ xa `request_usage_permission` tới máy con.
  - Thiết bị con (`KidApp.tsx`) khi nhận lệnh sẽ tự động đánh thức màn hình, phát âm thanh hướng dẫn và mở thẳng màn hình Cài đặt Android (`Settings.ACTION_USAGE_ACCESS_SETTINGS`).
  - Sau khi con bật quyền, app con gửi cập nhật telemetry ngay lập tức để màn hình Cha Mẹ tự động chuyển sang trạng thái hợp lệ màu xanh.

### Quy Tắc 5: Truyền Nhận Dữ Liệu 4G/WAN Tin Cậy & Xác Thực Bearer Token
- Đường truyền từ xa qua 4G Internet (Cloudflare Tunnel) phải đảm bảo:
  1. **Khám phá URL máy chủ thông minh**: Luôn ưu tiên GitHub Contents API (`api.github.com/repos/Thaopxtn/quan-ly-con/contents/server-url.txt` giải mã Base64) để tránh độ trễ DNS và không bị jsDelivr cache giữ URL cũ. Tự động đồng bộ `server-url.txt` vào thư mục assets của cả 2 APK để khởi động nguội tức thì (0ms).
  2. **Tự động chuyển mạng Wi-Fi LAN / 4G WAN**: Nếu đang lưu IP nội bộ (`192.168.x.x`) mà ra khỏi nhà (mất kết nối LAN), client phải tự động kích hoạt Cloudflare Tunnel 4G mà không cần người dùng thao tác thủ công.
  3. **Xác thực bảo mật**: Hỗ trợ đầy đủ `Bearer parent_master_secret_2026` và token HMAC-SHA256 trên mọi endpoint API và SSE stream, không để xảy ra lỗi `401 Unauthorized` hay `405 Method Not Allowed` khi chạy từ file APK.

### Quy Tắc 6: Hiển Thị Trạng Thái Kết Nối & Mã Nguồn GitHub Chính Thức
- App Cha Mẹ phải có thanh trạng thái kết nối trực quan (`ConnectionStatusBar`) hiển thị độ trễ máy chủ, trạng thái Cloudflare 4G và trạng thái máy con.
- Đặt liên kết mã nguồn mở chính thức của dự án (`https://github.com/Thaopxtn/quan-ly-con`) ở sidebar, thanh tiêu đề và màn hình Cài đặt của App Cha Mẹ.

### Quy Tắc 7: Đồng Bộ Hóa Xóa Hồ Sơ & Bắt Buộc Máy Con Xác Nhận (Mandatory ACK & Clean Unpairing)
- Khi Cha Mẹ thực hiện bất kỳ thao tác nào tác động tới máy con (khóa, mở khóa, gia hạn giờ, hủy ghép đôi / xóa hồ sơ, ghim app, đổi quy tắc...), **BẮT BUỘC** phải có luồng xác nhận ACK hai chiều:
  1. Máy con tiếp nhận lệnh, thực thi triệt để trong môi trường native/webview và gửi ngay ACK `status: 'executed'`.
  2. Khi xóa hồ sơ con, app cha mẹ phát lệnh `unpair_device` để máy con tự động xóa sạch dữ liệu ghép đôi (`localStorage`), gỡ bỏ khóa native (`is_locked: false`), đưa app con về màn hình kích hoạt ban đầu và gửi ACK xác nhận.
  3. Máy chủ dọn sạch dữ liệu toàn diện (settings, pairings, telemetry_history, remote_commands, chats, time_requests, sos) và ngăn chặn việc telemetry từ máy cũ tự ý phục hồi hồ sơ con đã xóa.
  4. Khi mở khóa máy (`unlock_now`), nếu con đã hết giờ dùng trong ngày, hệ thống tự động gia hạn thêm ít nhất 60 phút và kích hoạt cờ bỏ qua tạm thời (`screentime bypass`) để máy con không bị vòng lặp tự khóa lại ngay sau khi mở.

---

## 3. Quy Trình Kiểm Thử & Xác Nhận (Automated Testing & Verification)

Trước khi bàn giao bất kỳ tính năng hoặc sửa lỗi nào, Antigravity phải thực hiện các bước sau:

1. **Kiểm tra kiểu dữ liệu & cú pháp:**
   ```powershell
   npm run typecheck
   ```
2. **Kiểm thử tự động pipeline lệnh và phản hồi ACK:**
   ```powershell
   npm run test:server
   ```
3. **Biên dịch thử nghiệm web assets:**
   ```powershell
   npm run build:all
   ```
4. **Biên dịch APK khi có thay đổi cho Android:**
   ```powershell
   npm run build:apk:all
   ```
5. **Nạp APK trực tiếp vào điện thoại thật đang cắm USB (nếu cần):**
   - Máy con (`INE-LX2` - serial `JUC7N18704011839`): `npm run install:kid`
   - Máy cha (`SM-S908N` - serial `R3CT3102XWY`): `npm run install:parent`

---

## 4. Danh Sách Lệnh Quản Trị Hệ Thống Nhanh

| Lệnh | Mô tả |
| :--- | :--- |
| `pm2 status` | Xem trạng thái server cục bộ và Cloudflare tunnel |
| `pm2 restart quan-ly-con-server` | Khởi động lại server cục bộ sau khi sửa `server.cjs` |
| `npm run build:apk:all` | Biên dịch lại toàn bộ APK cho Cha Mẹ và Con Cái |
| `npm run test:server` | Chạy bộ test tự động xác nhận quy trình gửi nhận lệnh và phản hồi ACK |
| `npm run install:all` | Tự động cài đặt 2 file APK lên 2 điện thoại đang cắm cáp USB |
