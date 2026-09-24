' ==============================================================================
' ParentPro Server - Khởi Chạy Ẩn Toàn Bộ Khi Mở Máy Tính (Windows Startup)
' Chạy ngầm 100%, không hiện cửa sổ đen CMD, không gây gián đoạn công việc
' Tự động phục hồi cả máy chủ nội bộ (server.cjs) và trạm 4G (tunnel-manager.cjs)
' ==============================================================================
Option Explicit

Dim WshShell, fso, rootDir
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = "d:\luufilelaptrinh\quan ly con"
WshShell.CurrentDirectory = rootDir

' Khởi chạy máy chủ Node.js và 4G Tunnel qua PM2 đã được cấu hình
' Mã lệnh 0 = Ẩn hoàn toàn (Hidden), False = Không chờ tiến trình kết thúc
WshShell.Run "cmd /c pm2 resurrect", 0, False
