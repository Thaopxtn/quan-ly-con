' ==============================================================================
' ParentPro Server Manager - Khởi Động Giao Diện Phần Mềm Quản Trị Máy Chủ
' Chạy độc lập dạng ứng dụng máy tính (Desktop App Mode), không thanh URL, không tab
' Tự động kích hoạt toàn bộ hệ sinh thái máy chủ + Cloudflare 4G Tunnel
' ==============================================================================
Option Explicit

Dim WshShell, fso, rootDir, edgePath, chromePath, url, appArgs

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = "d:\luufilelaptrinh\quan ly con"
WshShell.CurrentDirectory = rootDir
url = "http://localhost:3000/portal"

' 1. Đảm bảo toàn bộ máy chủ và đường truyền 4G đang hoạt động trong nền
WshShell.Run "cmd /c pm2 resurrect", 0, False

' Đợi 600ms để cổng mạng sẵn sàng
WScript.Sleep 600

' 2. Mở giao diện dưới dạng cửa sổ phần mềm độc lập (Edge App hoặc Chrome App)
appArgs = " --app=""" & url & """ --window-size=1260,850 --window-position=center"

' Tìm đường dẫn Microsoft Edge (mặc định có trên mọi Windows 10/11)
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
    edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

' Tìm Google Chrome nếu cần
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(chromePath) Then
    chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If

If fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """" & appArgs, 1, False
ElseIf fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """" & appArgs, 1, False
Else
    ' Fallback mở trình duyệt mặc định của hệ thống
    WshShell.Run url, 1, False
End If
