import {
  ChildProfile,
  SafeZone,
  AppItem,
  ScreenTimeData,
  ContentFilterCategory,
  StudySubject,
  StudyExercise,
  HealthData,
  AlertNotification,
  FamilyMember,
  ConnectedDevice,
  RoutePoint,
  KidTask,
  ChildSpecificSettings,
  RewardItem,
  StarTransaction,
  RewardRedemption,
  ChildNotification,
  MediaPlaybackState,
  NetworkInfo,
  SensorValues,
  ChildAlarm,
  ChildTimer,
  ChildScheduleEvent,
} from './types';

export const INITIAL_CHILD: ChildProfile = {
  id: 'child_1',
  name: 'Bé An',
  birthYear: 2016,
  age: 10,
  grade: 'Lớp 5',
  school: 'Trường Tiểu học Nguyễn Du',
  avatar: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80',
  phone: '0987 654 321',
  status: 'online',
  battery: 78,
  speed: 0,
  currentAddress: '123 Nguyễn Văn Cừ, Quận 1, TP. HCM',
  lat: 10.762622,
  lng: 106.682245,
  lastUpdated: '10:24',
};

export const INITIAL_CHILDREN: ChildProfile[] = [
  INITIAL_CHILD,
  {
    id: 'child_2',
    name: 'Bé Bình',
    birthYear: 2019,
    age: 7,
    grade: 'Lớp 2',
    school: 'Trường Tiểu học Lê Quý Đôn',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    phone: '0912 345 678',
    status: 'studying',
    battery: 92,
    speed: 0,
    currentAddress: 'Phòng học 2A, Tiểu học Lê Quý Đôn',
    lat: 10.772510,
    lng: 106.693240,
    lastUpdated: '10:28',
  },
  {
    id: 'child_3',
    name: 'Bé Chi',
    birthYear: 2012,
    age: 14,
    grade: 'Lớp 8',
    school: 'Trường THCS Chu Văn An',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'moving',
    battery: 64,
    speed: 12,
    currentAddress: 'Đường Điện Biên Phủ, Bình Thạnh',
    lat: 10.795120,
    lng: 106.711850,
    lastUpdated: '10:30',
  },
];

export const INITIAL_SAFE_ZONES: SafeZone[] = [
  {
    id: 'zone_1',
    name: 'Nhà',
    icon: 'home',
    radius: 500,
    isActive: true,
    address: '123 Nguyễn Văn Cừ, Quận 1, TP. HCM',
    lat: 10.762622,
    lng: 106.682245,
    color: '#10B981',
    notifyOnEnter: true,
    notifyOnExit: true,
  },
  {
    id: 'zone_2',
    name: 'Trường học',
    icon: 'school',
    radius: 250,
    isActive: true,
    address: 'Trường Tiểu học Nguyễn Du, Q1',
    lat: 10.771234,
    lng: 106.691456,
    color: '#3B82F6',
    notifyOnEnter: true,
    notifyOnExit: true,
  },
  {
    id: 'zone_3',
    name: 'Khu vui chơi',
    icon: 'gamepad',
    radius: 300,
    isActive: false,
    address: 'Công viên Tao Đàn, Q1',
    lat: 10.775892,
    lng: 106.692341,
    color: '#F59E0B',
    notifyOnEnter: false,
    notifyOnExit: true,
  },
];

export const INITIAL_APPS: AppItem[] = [
  {
    id: 'app_youtube',
    name: 'YouTube',
    icon: 'youtube',
    category: 'video',
    status: 'allowed',
    timeUsedMinutes: 80,
    dailyLimitMinutes: 90,
    percentChange: 59,
  },
  {
    id: 'app_tiktok',
    name: 'TikTok',
    icon: 'video',
    category: 'video',
    status: 'blocked',
    timeUsedMinutes: 35,
    dailyLimitMinutes: 30,
    percentChange: 16,
  },
  {
    id: 'app_zalo',
    name: 'Zalo',
    icon: 'message-circle',
    category: 'chat',
    status: 'allowed',
    timeUsedMinutes: 20,
    dailyLimitMinutes: 60,
    percentChange: 9,
  },
  {
    id: 'app_facebook',
    name: 'Facebook',
    icon: 'facebook',
    category: 'social',
    status: 'allowed',
    timeUsedMinutes: 15,
    dailyLimitMinutes: 45,
    percentChange: 7,
  },
  {
    id: 'app_messenger',
    name: 'Messenger',
    icon: 'message-square',
    category: 'chat',
    status: 'blocked',
    timeUsedMinutes: 0,
    dailyLimitMinutes: 0,
    percentChange: 0,
  },
  {
    id: 'app_chrome',
    name: 'Google Chrome',
    icon: 'globe',
    category: 'browser',
    status: 'allowed',
    timeUsedMinutes: 10,
    dailyLimitMinutes: 60,
    percentChange: 5,
  },
  {
    id: 'app_game',
    name: 'Roblox / Game',
    icon: 'gamepad-2',
    category: 'game',
    status: 'blocked',
    timeUsedMinutes: 0,
    dailyLimitMinutes: 40,
    percentChange: 0,
  },
  {
    id: 'app_instagram',
    name: 'Instagram',
    icon: 'camera',
    category: 'social',
    status: 'blocked',
    timeUsedMinutes: 0,
    dailyLimitMinutes: 30,
    percentChange: 0,
  },
];

export const INITIAL_SCREEN_TIME: ScreenTimeData = {
  todayTotalMinutes: 135, // 2h 15p
  yesterdayTotalMinutes: 210,
  percentChangeVsYesterday: -35,
  hourlyUsage: [0, 0, 0, 0, 0, 0, 10, 15, 25, 10, 5, 20, 15, 5, 10, 20, 0, 0, 0, 0, 0, 0, 0, 0],
  weekTotalHours: 28.75,
  studyHours: 9.25,
  entertainmentHours: 6.33,
};

export const INITIAL_CONTENT_FILTERS: ContentFilterCategory[] = [
  { id: 'f_violence', name: 'Bạo lực & Máu me', isBlocked: true, categoryType: 'web', icon: 'shield-alert', desc: 'Chặn nội dung kích động đánh nhau' },
  { id: 'f_adult', name: 'Khiêu dâm & 18+', isBlocked: true, categoryType: 'web', icon: 'eye-off', desc: 'Chặn hoàn toàn web người lớn' },
  { id: 'f_gambling', name: 'Cờ bạc & Cá cược', isBlocked: true, categoryType: 'web', icon: 'coins', desc: 'Chặn cổng nạp thẻ cờ bạc online' },
  { id: 'f_weapon', name: 'Vũ khí & Độc hại', isBlocked: true, categoryType: 'web', icon: 'crosshair', desc: 'Chặn hướng dẫn chế tạo vũ khí' },
  { id: 'f_fakenews', name: 'Tin giả & Lừa đảo', isBlocked: true, categoryType: 'web', icon: 'file-warning', desc: 'Ngăn chặn link giả mạo OTP, phishing' },
  { id: 'f_inappropriate', name: 'Nội dung không phù hợp', isBlocked: true, categoryType: 'web', icon: 'user-x', desc: 'Lọc từ khóa thô tục, độc hại' },
];

export const INITIAL_STUDY_SUBJECTS: StudySubject[] = [
  { id: 'sub_math', name: 'Toán học', score: 92, color: '#3B82F6', icon: 'calculator' },
  { id: 'sub_vietnamese', name: 'Tiếng Việt', score: 88, color: '#10B981', icon: 'book-open' },
  { id: 'sub_english', name: 'Tiếng Anh', score: 80, color: '#F59E0B', icon: 'languages' },
  { id: 'sub_science', name: 'Khoa học', score: 76, color: '#8B5CF6', icon: 'flask-conical' },
];

export const INITIAL_EXERCISES: StudyExercise[] = [
  { id: 'ex_1', title: 'Bài Toán - Chương 3 (Phân số)', subject: 'Toán học', result: 'Hoàn thành 8/10', scorePercent: 85, time: 'Hôm nay 09:15' },
  { id: 'ex_2', title: 'Từ vựng Tiếng Anh Unit 4: Animals', subject: 'Tiếng Anh', result: 'Đạt 10/10', scorePercent: 100, time: 'Hôm qua' },
  { id: 'ex_3', title: 'Tập đọc & Soạn bài Tiếng Việt', subject: 'Tiếng Việt', result: 'Hoàn thành tốt', scorePercent: 90, time: '2 ngày trước' },
];

export const INITIAL_HEALTH: HealthData = {
  steps: 8532,
  stepGoal: 10000,
  activeMinutes: 85, // 1h 25p
  activeGoalMinutes: 120,
  heartRate: 78,
  sleepHours: 8,
  sleepMinutes: 12,
  aiSuggestion: 'Khuyến khích con vận động ngoài trời thêm 30 phút mỗi ngày để giảm nguy cơ cận thị và thư giãn mắt.',
};

export const INITIAL_ALERTS: AlertNotification[] = [
  {
    id: 'alt_1',
    type: 'location',
    title: 'Con đã về đến nhà',
    message: '12:34 - Trường Tiểu học Nguyễn Du về 123 Nguyễn Văn Cừ',
    time: '10:24',
    isRead: false,
    priority: 'medium',
  },
  {
    id: 'alt_2',
    type: 'study',
    title: 'Đã hoàn thành bài tập Toán',
    message: 'Đạt 95% điểm số (Chương 3 Phân số)',
    time: '09:15',
    isRead: false,
    priority: 'low',
  },
  {
    id: 'alt_3',
    type: 'screentime',
    title: 'Con mở YouTube quá giờ',
    message: 'Đã sử dụng 45 phút liên tục',
    time: '08:30',
    isRead: true,
    priority: 'high',
  },
  {
    id: 'alt_4',
    type: 'battery',
    title: 'Thiết bị pin yếu',
    message: 'Điện thoại con còn 15% pin, hãy nhắc con sạc nhé!',
    time: '07:50',
    isRead: true,
    priority: 'high',
  },
  {
    id: 'alt_5',
    type: 'location',
    title: 'Con rời khỏi vùng an toàn',
    message: 'Con đã rời khỏi khuôn viên Trường học',
    time: '06:20',
    isRead: true,
    priority: 'urgent',
  },
];

export const INITIAL_FAMILY: FamilyMember[] = [
  { id: 'f_1', name: 'Bố (Quản trị viên)', role: 'Quản trị viên gia đình', email: 'bome@gmail.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80', isCurrentUser: true },
  { id: 'f_2', name: 'Mẹ', role: 'Phụ huynh', email: 'me@gmail.com', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80' },
  { id: 'f_3', name: 'Bé An (Con)', role: '10 tuổi - Lớp 5', email: 'an.kid@parentpro.vn', avatar: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120&auto=format&fit=crop&q=80' },
];

export const INITIAL_DEVICES: ConnectedDevice[] = [
  { id: 'dev_1', name: 'Đồng hồ thông minh (KidWatch Pro)', type: 'smartwatch', battery: 78, isConnected: true, statusText: 'Đang đeo trên tay • GPS Tốt', icon: 'watch' },
  { id: 'dev_2', name: 'Thiết bị định vị GPS (SmartTag)', type: 'gps', battery: 60, isConnected: true, statusText: 'Để trong ba lô bé', icon: 'navigation' },
  { id: 'dev_3', name: 'Camera góc học tập gia đình', type: 'camera', battery: 100, isConnected: false, statusText: 'Chưa kết nối', icon: 'camera' },
  { id: 'dev_4', name: 'Nhà thông minh (Smart Home)', type: 'smarthome', battery: 100, isConnected: true, statusText: 'Tùy chọn • Khóa cổng an toàn', icon: 'home' },
];

export const INITIAL_ROUTE: RoutePoint[] = [
  { id: 'pt_1', time: '06:45', title: 'Rời nhà', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'start', duration: 'Xuất phát', speed: 0, battery: 98, transport: 'stay' },
  { id: 'pt_2', time: '07:10', title: 'Điểm dừng ăn sáng', address: 'Quán Phở 24, Trần Hưng Đạo', lat: 10.766100, lng: 106.686500, type: 'stop', duration: 'Dừng 25 phút', speed: 18, battery: 95, transport: 'bike' },
  { id: 'pt_3', time: '07:45', title: 'Đến trường học', address: 'Trường Tiểu học Nguyễn Du, Q1', lat: 10.771234, lng: 106.691456, type: 'stop', duration: 'Ở lại 4h 15m', speed: 0, battery: 92, transport: 'stay' },
  { id: 'pt_4', time: '12:05', title: 'Bán trú / Thư viện', address: 'Thư viện Thiếu nhi TP. HCM', lat: 10.774500, lng: 106.694200, type: 'stop', duration: 'Dừng 1h 30m', speed: 5, battery: 84, transport: 'walk' },
  { id: 'pt_5', time: '16:30', title: 'Lớp học bơi / CLB', address: 'Hồ bơi Kỳ Đồng, Q3', lat: 10.781200, lng: 106.681100, type: 'stop', duration: 'Dừng 1h 15m', speed: 22, battery: 76, transport: 'bus' },
  { id: 'pt_6', time: '18:15', title: 'Về đến nhà an toàn', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'end', duration: 'Ở nhà', speed: 0, battery: 68, transport: 'stay' },
];

export const MOCK_ROUTES_BY_DAY: Record<string, RoutePoint[]> = {
  today: INITIAL_ROUTE,
  yesterday: [
    { id: 'y_1', time: '07:00', title: 'Rời nhà', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'start', duration: 'Xuất phát', speed: 0, battery: 100, transport: 'stay' },
    { id: 'y_2', time: '07:30', title: 'Trường Tiểu học Nguyễn Du', address: 'Trường Tiểu học Nguyễn Du, Q1', lat: 10.771234, lng: 106.691456, type: 'stop', duration: 'Ở lại 8 tiếng', speed: 15, battery: 90, transport: 'bike' },
    { id: 'y_3', time: '16:45', title: 'Nhà sách Fahasa', address: '40 Nguyễn Huệ, Quận 1', lat: 10.773500, lng: 106.703200, type: 'stop', duration: 'Dừng 45 phút', speed: 20, battery: 75, transport: 'bus' },
    { id: 'y_4', time: '17:50', title: 'Về nhà', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'end', duration: 'Nghỉ ngơi', speed: 0, battery: 62, transport: 'stay' },
  ],
  twoDaysAgo: [
    { id: 't_1', time: '08:00', title: 'Rời nhà', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'start', duration: 'Xuất phát', speed: 0, battery: 100, transport: 'stay' },
    { id: 't_2', time: '08:40', title: 'Nhà ông bà ngoại', address: '18 Võ Thị Sáu, Quận 3', lat: 10.785400, lng: 106.696100, type: 'stop', duration: 'Ở lại 5 tiếng', speed: 25, battery: 85, transport: 'car' },
    { id: 't_3', time: '14:30', title: 'Công viên Tao Đàn', address: 'Công viên Tao Đàn, Trương Định, Q1', lat: 10.775892, lng: 106.692341, type: 'stop', duration: 'Dạo chơi 2 tiếng', speed: 8, battery: 70, transport: 'walk' },
    { id: 't_4', time: '17:15', title: 'Về nhà', address: '123 Nguyễn Văn Cừ, Quận 1', lat: 10.762622, lng: 106.682245, type: 'end', duration: 'Nghỉ ngơi', speed: 0, battery: 55, transport: 'stay' },
  ],
};

export const INITIAL_KID_TASKS: KidTask[] = [
  { id: 'tsk_1', title: 'Làm bài tập Toán phân số trang 42', subject: 'Toán học', stars: 5, completed: true, dueDate: 'Hôm nay' },
  { id: 'tsk_2', title: 'Đọc sách 20 phút (Dế Mèn Phiêu Lưu Ký)', subject: 'Kỹ năng sống', stars: 3, completed: false, dueDate: '16:00' },
  { id: 'tsk_3', title: 'Tập thể dục / nhảy dây 100 cái', subject: 'Thể chất', stars: 4, completed: false, dueDate: '17:30' },
  { id: 'tsk_4', title: 'Học 5 từ mới Tiếng Anh Unit 5', subject: 'Tiếng Anh', stars: 5, completed: false, dueDate: '20:00' },
];

export const INITIAL_REWARDS_CATALOG: RewardItem[] = [
  {
    id: 'rew_1',
    title: 'Thêm 30 phút dùng máy / chơi game',
    starsCost: 20,
    icon: '🎮',
    category: 'screen',
    description: 'Bố mẹ duyệt mở thêm giờ giải trí tự động trên máy',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  {
    id: 'rew_2',
    title: '1 Cây kem ốc quế / ly trà sữa',
    starsCost: 30,
    icon: '🍦',
    category: 'treat',
    description: 'Thưởng thức món tráng miệng ngọt ngào yêu thích cuối tuần',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  {
    id: 'rew_3',
    title: '1 Cuốn truyện tranh / sách mới',
    starsCost: 50,
    icon: '📚',
    category: 'book',
    description: 'Tập truyện tranh Doraemon, Thám tử Conan hoặc sách khoa học tự chọn',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  {
    id: 'rew_4',
    title: 'Bữa tối pizza / gà rán cùng cả nhà',
    starsCost: 100,
    icon: '🍕',
    category: 'treat',
    description: 'Bé được tự chọn thực đơn món ăn yêu thích cho bữa tối gia đình',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  {
    id: 'rew_5',
    title: 'Vé đi khu vui chơi / công viên nước',
    starsCost: 150,
    icon: '🎡',
    category: 'trip',
    description: 'Chuyến vui chơi thỏa thích cùng bố mẹ vào ngày Chủ Nhật',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  {
    id: 'rew_6',
    title: 'Món đồ chơi / bộ Lego tự chọn',
    starsCost: 200,
    icon: '🧸',
    category: 'gift',
    description: 'Phần thưởng đặc biệt xứng đáng cho chuỗi ngày nỗ lực chăm ngoan',
    targetChildId: 'all',
    targetChildName: 'Cả nhà',
    isCustom: false,
  },
  // Quà riêng mẫu cho Bé An (child_1)
  {
    id: 'rew_an_1',
    title: 'Bộ Lego Lắp Ráp Tàu Vũ Trụ NASA',
    starsCost: 80,
    icon: '🚀',
    category: 'toy',
    description: 'Món quà ước mơ của Bé An sau khi đạt điểm 10 kỳ thi',
    targetChildId: 'child_1',
    targetChildName: 'Bé An',
    isCustom: true,
  },
  // Quà riêng mẫu cho Bé Bình (child_2)
  {
    id: 'rew_binh_1',
    title: 'Xe đua điều khiển từ xa tốc độ cao',
    starsCost: 60,
    icon: '🏎️',
    category: 'toy',
    description: 'Phần thưởng dành riêng cho Bé Bình khi tự giác ăn cơm và ngủ sớm',
    targetChildId: 'child_2',
    targetChildName: 'Bé Bình',
    isCustom: true,
  },
];

export const INITIAL_STAR_HISTORY: StarTransaction[] = [
  {
    id: 'st_1',
    childId: 'child_1',
    childName: 'Bé An',
    type: 'gift',
    stars: 10,
    title: 'Bố tặng 10 sao khen ngợi',
    note: 'Khen con tự giác dọn phòng và bàn học ngăn nắp',
    timestamp: '08:30 Hôm nay',
  },
  {
    id: 'st_2',
    childId: 'child_1',
    childName: 'Bé An',
    type: 'task_reward',
    stars: 5,
    title: 'Hoàn thành: Bài tập Toán phân số',
    timestamp: '09:15 Hôm nay',
  },
  {
    id: 'st_3',
    childId: 'child_1',
    childName: 'Bé An',
    type: 'redeem_gift',
    stars: -20,
    title: 'Đã đổi: Thêm 30 phút chơi game',
    timestamp: 'Hôm qua 17:30',
  },
];

export const INITIAL_REDEMPTIONS: RewardRedemption[] = [
  {
    id: 'rd_1',
    childId: 'child_1',
    childName: 'Bé An',
    rewardId: 'rew_1',
    rewardTitle: 'Thêm 30 phút dùng máy / chơi game',
    starsCost: 20,
    icon: '🎮',
    timestamp: 'Hôm qua 17:30',
    status: 'completed',
  },
];

// ─── Notifications ───────────────────────────────────────────
export const INITIAL_NOTIFICATIONS: ChildNotification[] = [
  {
    id: 'notif_1',
    appName: 'Zalo',
    appIcon: '💬',
    title: 'Ngọc Linh',
    body: 'Ngọc Linh vừa gửi cho bạn một tin nhắn.',
    time: '10:15',
    isRead: false,
  },
  {
    id: 'notif_2',
    appName: 'YouTube',
    appIcon: '▶️',
    title: 'Đề xuất cho bạn',
    body: '10 bài toán thú vị dành cho học sinh lớp 5',
    time: '09:42',
    isRead: false,
  },
  {
    id: 'notif_3',
    appName: 'Gmail',
    appIcon: '📧',
    title: 'Trường Tiểu học',
    body: 'Thông báo lịch kiểm tra giữa kỳ môn Toán ngày 20/9',
    time: '08:30',
    isRead: true,
  },
  {
    id: 'notif_4',
    appName: 'Messenger',
    appIcon: '🟣',
    title: 'Nhóm Gia đình',
    body: 'Mẹ: Con ăn cơm chưa?',
    time: '08:00',
    isRead: true,
  },
  {
    id: 'notif_5',
    appName: 'Hệ thống',
    appIcon: '🔋',
    title: 'Pin yếu',
    body: 'Điện thoại còn 20% pin. Hãy sạc ngay.',
    time: '07:55',
    isRead: true,
  },
];

// ─── Media Playback ──────────────────────────────────────────
export const INITIAL_MEDIA_PLAYBACK: MediaPlaybackState = {
  isPlaying: true,
  trackTitle: 'Vì Sao Em Buồn',
  artist: 'Đức Phúc',
  album: 'Lost In Space',
  artUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=300&auto=format&fit=crop',
  positionSeconds: 87,
  durationSeconds: 234,
  volume: 65,
  appName: 'Zing MP3',
};

// ─── Network Info ────────────────────────────────────────────
export const INITIAL_NETWORK_INFO: NetworkInfo = {
  wifiSSID: 'Nha_Ong_Ba_2.4G',
  wifiSignalDbm: -52,
  wifiConnected: true,
  cellBars: 3,
  cellType: '4G',
  cellConnected: true,
  nearbyWifis: [
    { ssid: 'Nha_Ong_Ba_2.4G', signal: -52, isConnected: true, isSecured: true },
    { ssid: 'VNPTFiber_123', signal: -68, isConnected: false, isSecured: true },
    { ssid: 'FPT_Telecom_5G', signal: -72, isConnected: false, isSecured: true },
    { ssid: 'AndroidAP_7B2F', signal: -75, isConnected: false, isSecured: false },
    { ssid: 'VNPT-HN-2E9A', signal: -81, isConnected: false, isSecured: true },
    { ssid: 'CafeWifi_Guest', signal: -88, isConnected: false, isSecured: false },
  ],
  nearbyBluetooth: [
    { name: 'AirPods Pro', rssi: -45, isPaired: true, type: 'headphone' },
    { name: 'Mi Band 7', rssi: -58, isPaired: true, type: 'watch' },
    { name: 'JBL Flip 5', rssi: -67, isPaired: false, type: 'speaker' },
    { name: 'Galaxy A54', rssi: -72, isPaired: false, type: 'phone' },
    { name: 'BLE Device', rssi: -85, isPaired: false, type: 'unknown' },
  ],
};

// ─── Sensor Values ───────────────────────────────────────────
export const INITIAL_SENSOR_VALUES: SensorValues = {
  accelX: 0.12,
  accelY: 9.72,
  accelZ: 0.34,
  gyroX: 0.003,
  gyroY: -0.007,
  gyroZ: 0.001,
  magnetX: 22.4,
  magnetY: -14.8,
  magnetZ: 41.2,
  pitch: 85,
  roll: 3,
  yaw: 127,
  pressureHpa: 1013.2,
  lightLux: 320,
  proximityNear: false,
  stepCount: 2847,
};

// ─── Alarms ──────────────────────────────────────────────────
export const INITIAL_ALARMS: ChildAlarm[] = [
  {
    id: 'alarm_1',
    childId: 'child_1',
    label: 'Thức dậy đi học',
    time: '06:00',
    repeatDays: [1, 2, 3, 4, 5],
    isEnabled: true,
  },
  {
    id: 'alarm_2',
    childId: 'child_1',
    label: 'Uống thuốc buổi sáng',
    time: '07:30',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    isEnabled: false,
  },
  {
    id: 'alarm_3',
    childId: 'child_1',
    label: 'Ôn bài buổi tối',
    time: '19:00',
    repeatDays: [1, 2, 3, 4, 5],
    isEnabled: true,
  },
];

// ─── Timers ──────────────────────────────────────────────────
export const INITIAL_TIMERS: ChildTimer[] = [];

// ─── Schedule Events ─────────────────────────────────────────
export const INITIAL_SCHEDULE_EVENTS: ChildScheduleEvent[] = [
  {
    id: 'evt_1',
    childId: 'child_1',
    title: 'Kiểm tra Toán giữa kỳ',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: '08:00',
    note: 'Ôn chương phân số và phép nhân',
    color: '#ef4444',
    isCompleted: false,
    category: 'study',
  },
  {
    id: 'evt_2',
    childId: 'child_1',
    title: 'Học võ Taekwondo',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: '16:30',
    note: 'Mang giày thể thao',
    color: '#3b82f6',
    isCompleted: false,
    category: 'activity',
  },
  {
    id: 'evt_3',
    childId: 'child_1',
    title: 'Họp phụ huynh',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: '09:00',
    note: 'Phòng A3 tầng 2',
    color: '#8b5cf6',
    isCompleted: false,
    category: 'family',
  },
  {
    id: 'evt_4',
    childId: 'child_1',
    title: 'Khám sức khỏe định kỳ',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: '10:00',
    note: 'Bệnh viện Nhi đồng',
    color: '#10b981',
    isCompleted: false,
    category: 'medical',
  },
];

