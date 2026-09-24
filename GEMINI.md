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
