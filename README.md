# Hệ Thống Quản Lý & Đồng Hành Cùng Con (ParentPro & KidCare)

Hệ thống phần mềm bảo vệ và quản lý con cái thông minh, tái hiện trọn vẹn **19 màn hình** chuẩn mẫu theo thiết kế, tích hợp phân tích tâm lý giáo dục thực tế và kiến trúc mô-đun hóa cao cấp (**Modular Architecture**).

---

## 🌟 Điểm Nổi Bật & Tùy Biến Nhu Cầu Thực Tế

1. **Kiến Trúc Mô-đun (Pluggable Architecture)**:
   - Các phân hệ chức năng độc lập (`dashboard`, `tracking`, `screentime`, `learning`, `health`, `content-filter`, `ai-assistant`, `sos-monitor`...) giúp dễ dàng bảo trì, nâng cấp và mở rộng trong tương lai.
2. **Hệ Sinh Thái Song Hành 2 Chiều**:
   - **ParentPro (`appchame/`)**: Ứng dụng Quản trị dành cho Cha Mẹ với đầy đủ 18 màn hình chi tiết, giám sát GPS trực quan, thiết lập bán kính geofence, giới hạn ứng dụng, báo cáo tuần/tháng, tư vấn AI Copilot.
   - **KidCare Companion (`appconchau/`)**: Ứng dụng Thân thiện dành cho Trẻ em. Tránh cấm đoán tiêu cực, ứng dụng cơ chế **Thưởng phạt tích cực (Gamification)**: Con làm việc tốt -> Nhận sao thưởng ⭐ -> Đổi lấy thời gian chơi game hoặc quà từ bố mẹ.
3. **Đồng Bộ Thời Gian Thực (Real-time EventBus)**:
   - Tích hợp `BroadcastChannel` và `LocalStorage Event Bus`: Khi Cha Mẹ bấm khóa ứng dụng (như TikTok/YouTube) ➔ Máy Con ngay lập tức hiển thị trạng thái bị khóa.
   - Khi Con nhấn nút **SOS Khẩn cấp** ➔ Máy Cha Mẹ lập tức rung chuông báo động, hiển thị tọa độ GPS khẩn cấp.
4. **Mô Phỏng Bản Đồ Vector & Tua Lại Lộ Trình (Route Playback)**:
   - Bản đồ hiển thị vị trí bé, vòng tròn vùng an toàn (Nhà 500m, Trường học 200m), hoạt họa xe di chuyển theo lộ trình từng chặng trong ngày (07:15 -> 07:45 -> 15:20).
5. **Trình Giả Lập Dual-Device Live Simulator**:
   - Cho phép xem song song cả 2 chiếc điện thoại (Cha Mẹ và Con) trên cùng 1 màn hình để trải nghiệm tương tác trực tiếp.

---

## 📱 Danh Sách 18 Màn Hình Chuẩn Mẫu

| STT | Phân hệ (Module) | Đường dẫn Component | Tính năng Chính |
|:---:|---|---|---|
| **01** | **Chào mừng & Đăng nhập** | `appchame/src/modules/auth/WelcomeAuthScreen.tsx` | Đăng nhập/Đăng ký, Social Google/Apple |
| **02** | **Trang chủ (Dashboard)** | `appchame/src/modules/dashboard/DashboardScreen.tsx` | Tổng quan trạng thái online, 8 phím tắt, quote động viên |
| **03** | **Vị trí thời gian thực** | `appchame/src/modules/tracking/RealtimeGpsScreen.tsx` | Bản đồ GPS, % pin thiết bị, tốc độ, chỉ đường |
| **04** | **Thiết lập vùng an toàn** | `appchame/src/modules/tracking/SafeZoneScreen.tsx` | Geofence Nhà (500m), Trường (200m), thêm vùng mới |
| **05** | **Giới hạn thời gian sử dụng**| `appchame/src/modules/screentime/ScreenTimeScreen.tsx` | Biểu đồ cột theo giờ, tổng thời gian 2h15p (-35%) |
| **06** | **Lọc nội dung nâng cao** | `appchame/src/modules/content/ContentFilterScreen.tsx` | Blacklist bạo lực/18+/cờ bạc, Chế độ học tập whitelist |
| **07** | **Quản lý ứng dụng (nâng cao)**| `appchame/src/modules/screentime/AppManagementScreen.tsx`| 1 chạm khóa/mở YouTube, TikTok, Facebook, Game |
| **08** | **Theo dõi học tập & kỹ năng**| `appchame/src/modules/learning/LearningScreen.tsx` | Vòng tiến độ 85%, điểm Toán (92%), Tiếng Việt, Anh |
| **09** | **Theo dõi sức khỏe & vận động**| `appchame/src/modules/health/HealthScreen.tsx` | Đếm bước 8.532 bước, nhịp tim 78 bpm, ngủ 8h12p, gợi ý AI |
| **10** | **Báo cáo chi tiết** | `appchame/src/modules/reports/AnalyticsReportScreen.tsx` | Biểu đồ sóng tuần, phân bổ Online vs Học tập vs Giải trí |
| **11** | **Thông báo & cảnh báo** | `appchame/src/modules/alerts/AlertsScreen.tsx` | Lịch sử con về nhà, bài tập xong, pin yếu, rời vùng an toàn |
| **12** | **Quản lý gia đình & thiết bị** | `appchame/src/modules/family/FamilyDevicesScreen.tsx` | Phân quyền Bố, Mẹ, Con cái; Đồng hồ thông minh, GPS |
| **13** | **Trợ lý AI thông minh** | `appchame/src/modules/ai/AIAssistantScreen.tsx` | Trò chuyện cùng AI Copilot, gợi ý lịch học & mẹo nuôi dạy |
| **14** | **SOS khẩn cấp** | `appchame/src/modules/sos/SosMonitorScreen.tsx` | Màn hình đỏ xung động, còi báo động khẩn cấp, gọi 113 |
| **15** | **Tích hợp thiết bị IoT** | `appchame/src/modules/devices/SmartDevicesScreen.tsx` | Đồng hồ KidWatch (78%), GPS Tag (60%), Camera gia đình |
| **16** | **Gói dịch vụ cao cấp** | `appchame/src/modules/premium/PremiumScreen.tsx` | Gói Pro mở khóa phân tích AI chuyên sâu, lưu vết 12 tháng |
| **17** | **Cài đặt hệ thống** | `appchame/src/modules/settings/SettingsScreen.tsx` | Bảo mật mã PIN, Dark mode, ngôn ngữ Tiếng Việt, đăng xuất |
| **18** | **Xem lại lịch sử di chuyển** | `appchame/src/modules/tracking/RouteHistoryScreen.tsx` | Bản đồ lộ trình có waypoint thời gian & nút phát lại |
| **19** | **Trung tâm điều khiển từ xa (MỚI)** | `appchame/src/modules/remote/RemoteControlCenter.tsx` | Điều khiển âm lượng, độ sáng, flash, Kiosk pin, khóa giải toán, vận động 50 bước, cảm biến, live monitor |

---

## 🎮 Các Tính Năng Điều Khiển Từ Xa & Giám Sát Nâng Cao

1. **Điều khiển phần cứng**:
   - Âm lượng từ xa 0-100% kèm chỉ báo Volume HUD chuẩn iOS trên máy con.
   - Điều khiển độ sáng màn hình 10-100% kèm lớp mờ tối chân thực.
   - Bật/tắt chế độ Mute (im lặng) và Đèn Flash tìm kiếm trong đêm.
2. **Chế độ Kiosk / Ghim ứng dụng cưỡng chế**:
   - Ép buộc mở một ứng dụng duy nhất (như Chrome, YouTube học tập) và ngăn không cho thoát ra màn hình chính.
3. **Phát tin nhắn & sticker đè màn hình (Broadcast Overlay)**:
   - Gửi thông điệp khẩn kèm sticker (Ăn cơm, Đi ngủ, Uống nước...) hiển thị đè toàn bộ màn hình con.
4. **Bộ thử thách mở khóa tích cực (Positive Unlock Challenges)**:
   - Khóa tức thì từ xa.
   - Thử thách giải toán mở máy (phép tính ngẫu nhiên, làm đúng thưởng 5 sao).
   - Thử thách câu đố kiến thức trắc nghiệm khoa học.
   - Thử thách vận động thể chất: đứng dậy đi bộ hoặc lắc máy đủ 50 bước mới mở máy.
   - Đếm ngược tĩnh tâm 5 phút.
5. **Cảm biến an toàn thông minh & Tự động hóa**:
   - Cảm biến AI phát hiện nói bậy / từ ngữ không phù hợp ➔ Tự động khóa máy 10 phút và cảnh báo cha mẹ.
   - Cảm biến âm thanh phòng quá lớn (>85dB) ➔ Cảnh báo môi trường ồn ào.
   - Lịch tự động khóa máy giờ ăn cơm (11:30 - 12:30 & 18:30 - 19:30) và giờ đi ngủ (sau 21:30).
   - Phát âm thanh hướng dẫn bằng giọng nói Tiếng Việt tự nhiên qua Web Speech API.
6. **Giám sát trực tiếp (Live Monitor)**:
   - Live Screen Mirroring phản chiếu màn hình con với chỉ số 1080p, 30 FPS, độ trễ 12ms.
   - Live Camera stream quan sát góc học tập và tư thế ngồi của con.

## 🛠️ Cấu Trúc Thư Mục Dự Án

```
quan ly con/
├── packages / shared/           # Lớp dữ liệu và giao tiếp thời gian thực
│   ├── types.ts                 # Toàn bộ TypeScript interfaces chuẩn hóa
│   ├── eventBus.ts              # BroadcastChannel cho real-time inter-app sync
│   ├── store.ts                 # React hook useAppState & LocalStorage persistence
│   ├── mockData.ts              # Dữ liệu khởi tạo chuẩn xác theo ảnh mẫu
│   └── components/
│       ├── InteractiveMap.tsx   # Bản đồ vector offline với geofence và GPS pin
│       └── MobileFrame.tsx      # Khung điện thoại iPhone hiện đại với dynamic island
│
├── appchame/                    # Phân hệ Ứng dụng Cha Mẹ (ParentPro)
│   ├── src/
│   │   ├── ParentApp.tsx        # Bộ điều phối 18 màn hình & routing
│   │   ├── components/          # Thanh điều hướng Bottom Nav
│   │   └── modules/             # 18 modules màn hình độc lập
│
├── appconchau/                  # Phân hệ Ứng dụng Con Cái (KidCare Companion)
│   └── src/
│       └── KidApp.tsx           # Nhiệm vụ tích sao, đổi quà, xin thêm giờ, SOS
│
├── src/                         # Simulator & Portal trải nghiệm
│   ├── AppSimulator.tsx         # Trình điều khiển Dual-Device song song
│   ├── main.tsx                 # Điểm mount React 18
│   └── index.css                # Cấu hình Tailwind CSS
│
├── package.json                 # Cấu hình npm & dependencies
├── vite.config.ts               # Cấu hình Vite bundler & alias
└── tsconfig.json                # Cấu hình TypeScript 5.7+
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Khởi động môi trường phát triển (Dev Mode):
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000/`

### 2. Biên dịch Production Build:
```bash
npm run build
```
Kết quả biên dịch tối ưu hóa sẵn sàng triển khai tại thư mục `dist/`.

### 3. Đóng gói thành Mobile App (Android / iOS):
Nhờ cấu trúc chia tách rõ ràng giữa `appchame` và `appconchau`, bạn có thể dễ dàng bọc bằng **Capacitor** hoặc chuyển đổi sang **React Native**:
```bash
npx cap init ParentPro com.parentpro.app
npx cap add android
npx cap add ios
```
