# PowerShell script to configure Windows AutoStart & Desktop Shortcut
param(
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$launcherVbs = Join-Path $rootDir "ParentPro-Server-Launcher.vbs"
$runnerVbs = Join-Path $rootDir "start-server-hidden.vbs"
$iconFile = Join-Path $rootDir "public\app-icon.ico"

$desktop = [Environment]::GetFolderPath('Desktop')
$startup = [Environment]::GetFolderPath('Startup')

$wsh = New-Object -ComObject WScript.Shell

if ($Action -eq "install" -or $Action -eq "shortcut_only") {
    # 1. Create Desktop Shortcut
    $scDesktop = $wsh.CreateShortcut((Join-Path $desktop "ParentPro Server Manager.lnk"))
    $scDesktop.TargetPath = "wscript.exe"
    $scDesktop.Arguments = "`"$launcherVbs`""
    $scDesktop.WorkingDirectory = $rootDir
    $scDesktop.Description = "Trung Tam Dieu Khien May Chu ParentPro"
    if (Test-Path $iconFile) {
        $scDesktop.IconLocation = "$iconFile,0"
    }
    $scDesktop.Save()
    Write-Host "[OK] Da tao phim tat tren Desktop: ParentPro Server Manager.lnk" -ForegroundColor Green

    if ($Action -eq "install") {
        # 2. Create Startup Shortcut
        $scStartup = $wsh.CreateShortcut((Join-Path $startup "ParentPro-Server-AutoStart.lnk"))
        $scStartup.TargetPath = "wscript.exe"
        $scStartup.Arguments = "`"$runnerVbs`""
        $scStartup.WorkingDirectory = $rootDir
        $scStartup.Description = "Tu dong khoi dong may chu ParentPro"
        if (Test-Path $iconFile) {
            $scStartup.IconLocation = "$iconFile,0"
        }
        $scStartup.Save()
        Write-Host "[OK] Da dang ky thanh cong vao Windows Startup!" -ForegroundColor Green

        # Save PM2 state if available
        try {
            cmd /c "pm2 save" 2>$null
            Write-Host "[OK] Da luu cau hinh PM2." -ForegroundColor Green
        } catch {}
    }
} elseif ($Action -eq "uninstall") {
    $targetLnk = Join-Path $startup "ParentPro-Server-AutoStart.lnk"
    $targetVbs = Join-Path $startup "ParentPro-Server-AutoStart.vbs"
    if (Test-Path $targetLnk) {
        Remove-Item -Force $targetLnk
        Write-Host "[OK] Da go bo khoi Windows Startup: $targetLnk" -ForegroundColor Yellow
    }
    if (Test-Path $targetVbs) {
        Remove-Item -Force $targetVbs
        Write-Host "[OK] Da go bo khoi Windows Startup: $targetVbs" -ForegroundColor Yellow
    }
}
