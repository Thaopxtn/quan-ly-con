# 📱 Hướng Dẫn Sử Dụng & Biên Dịch 2 App Độc Lập (ParentPro & KidCare)

Hệ thống đã được **tách thành 2 ứng dụng Android độc lập hoàn toàn**, sẵn sàng cài đặt lên 2 máy khác nhau và mở riêng biệt trong Android Studio.

---

## 🎯 Tổng Quan 2 Ứng Dụng Độc Lập

| Tiêu chí | 👨‍👩‍👧 Ứng Dụng Cha Mẹ (ParentPro) | 👦 Ứng Dụng Con Cái (KidCare) |
| :--- | :--- | :--- |
| **Mục đích** | Dành riêng cho phụ huynh giám sát | Dành riêng cho máy con cái bảo vệ |
| **Thư mục Android Studio** | D:\luufilelaptrinh\quan ly con\android-parent | D:\luufilelaptrinh\quan ly con\android-kid |
| **Package ID** | com.parentpro.parent | com.parentpro.kidcare |
| **Tên hiển thị trên điện thoại** | **ParentPro - Cha Mẹ** | **KidCare Con Cái** |
| **File APK xuất xưởng** | ParentPro-AppChaMe.apk (4.28 MB) | KidCare-AppConCai.apk (4.23 MB) |
| **Dịch vụ chạy nền** | Đồng bộ Cloud, Giám sát bản đồ GPS, Cảnh báo SOS | MDM Accessibility, Khóa máy, Báo động 1 chạm SOS, Chống gỡ |
| **Lệnh mở Android Studio** | 
pm run studio:parent | 
pm run studio:kid |
| **Lệnh build APK** | 
pm run build:apk:parent | 
pm run build:apk:kid |

---

## 🚀 1. Cách Cài Đặt Trực Tiếp Lên 2 Điện Thoại (Không Cần Android Studio)

Hai file APK đã được biên dịch sẵn ngay tại thư mục gốc của dự án:
- 📲 **Máy Phụ Huynh**: Chép file **ParentPro-AppChaMe.apk** sang điện thoại bố/mẹ và bấm Cài đặt.
- 📲 **Máy Con Cái**: Chép file **KidCare-AppConCai.apk** sang điện thoại của con và bấm Cài đặt.

> **Lưu ý trên máy con**:
> Khi mở app **KidCare** lần đầu, hãy cấp các quyền cần thiết:
> 1. Cho phép quyền Vị trí (Chọn *Luôn cho phép trong nền*).
> 2. Bật dịch vụ Trợ năng (Accessibility) để giám sát và khóa máy khi hết giờ.
> 3. Tắt tối ưu hóa pin để app chạy ngầm 24/7.

---

## 💻 2. Cách Mở & Chạy Trên Android Studio

### A. Mở Ứng Dụng Cha Mẹ (ParentPro)
1. Chạy lệnh:
   `ash
   npm run studio:parent
   `
   *(Hoặc trong Android Studio: File -> Open -> duyệt đến D:\luufilelaptrinh\quan ly con\android-parent)*
2. Chờ Gradle Sync hoàn tất trong khoảng 1 phút.
3. Bấm nút **Run ▶️ (Shift + F10)** để cài lên máy ảo hoặc máy bố mẹ.

### B. Mở Ứng Dụng Con Cái (KidCare)
1. Chạy lệnh:
   `ash
   npm run studio:kid
   `
   *(Hoặc trong Android Studio: File -> Open -> duyệt đến D:\luufilelaptrinh\quan ly con\android-kid)*
2. Chờ Gradle Sync hoàn tất.
3. Bấm nút **Run ▶️ (Shift + F10)** để cài lên máy con hoặc máy ảo thứ 2.

---

## 🛠️ 3. Danh Mục Lệnh Nhanh (Terminal / PowerShell)

| Lệnh | Ý nghĩa |
| :--- | :--- |
| 
pm run studio:parent | Khởi động Android Studio mở dự án Cha Mẹ |
| 
pm run studio:kid | Khởi động Android Studio mở dự án Con Cái |
| 
pm run build:apk:all | Tự động build cả 2 app và xuất cả 2 file APK ra thư mục gốc |
| 
pm run build:apk:parent | Chỉ build và xuất ParentPro-AppChaMe.apk |
| 
pm run build:apk:kid | Chỉ build và xuất KidCare-AppConCai.apk |
| 
pm run dev | Chạy môi trường Web Simulator trên trình duyệt máy tính |

---

## 📡 4. Cơ Chế Đồng Bộ Thời Gian Thực
- Hai máy sử dụng cơ chế kết nối thời gian thực qua **Google Firebase Firestore** (Collection qlconcai).
- Khi Cha Mẹ nhấn:
  - **Khóa máy từ xa**: Lập tức gửi lệnh qua Firebase, máy Con Cái sẽ kích hoạt khóa màn hình.
  - **Báo động SOS từ máy con**: Lập tức đẩy thông báo còi hú và tọa độ vệ tinh GPS lên máy Cha Mẹ.
  - **Cộng/trừ sao thưởng**: Điểm sao cập nhật tức thì trên cả 2 màn hình.
