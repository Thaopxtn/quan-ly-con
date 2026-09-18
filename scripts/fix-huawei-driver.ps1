Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   DANG XU LY GO BO DRIVER LOI EW_USBCCGPFILTER    " -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Tìm tất cả các gói oem*.inf của ew_usbccgpfilter.inf
$drivers = pnputil /enum-drivers
$oemList = @()
$currentOem = ""
foreach ($line in ($drivers -split "`r?`n")) {
    if ($line -match "Published Name:\s+(oem\d+\.inf)") {
        $currentOem = $matches[1]
    }
    if ($line -match "ew_usbccgpfilter\.inf") {
        if ($currentOem -and (-not ($oemList -contains $currentOem))) {
            $oemList += $currentOem
        }
    }
}

Write-Host "Cac goi driver Huawei Filter duoc tim thay: $($oemList -join ', ')" -ForegroundColor Gray

foreach ($oem in $oemList) {
    Write-Host "Dang go bo $oem..." -ForegroundColor Yellow
    & pnputil /delete-driver $oem /uninstall /force
}

# 2. Xoa UpperFilters trong Registry cua thiet bi USB Huawei
$huaweiDevices = Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Enum\USB" -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like "VID_12D1*" }
foreach ($dev in $huaweiDevices) {
    Get-ChildItem $dev.PSPath | ForEach-Object {
        $subPath = $_.PSPath
        $props = Get-ItemProperty $subPath -ErrorAction SilentlyContinue
        if ($props.UpperFilters -contains "ew_usbccgpfilter") {
            Write-Host "Dang go UpperFilters ew_usbccgpfilter tai $subPath..." -ForegroundColor Yellow
            $newFilters = $props.UpperFilters | Where-Object { $_ -ne "ew_usbccgpfilter" }
            if ($newFilters.Count -eq 0) {
                Remove-ItemProperty -Path $subPath -Name "UpperFilters" -Force -ErrorAction SilentlyContinue
            } else {
                Set-ItemProperty -Path $subPath -Name "UpperFilters" -Value $newFilters -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# 3. Doi ten hoac go file driver sys bi chan
if (Test-Path "C:\Windows\System32\drivers\ew_usbccgpfilter.sys") {
    try {
        Rename-Item -Path "C:\Windows\System32\drivers\ew_usbccgpfilter.sys" -NewName "ew_usbccgpfilter.sys.bak" -Force -ErrorAction SilentlyContinue
        Write-Host "Da vo hieu hoa file ew_usbccgpfilter.sys thanh cong!" -ForegroundColor Green
    } catch {
        Write-Host "Khong the doi ten ew_usbccgpfilter.sys" -ForegroundColor Gray
    }
}

# 4. Quet lai thiet bi PnP
Write-Host "Dang quet lai phan cung USB (Rescan)..." -ForegroundColor Cyan
pnputil /scan-devices

# 5. Khoi dong lai thiet bi Huawei neu dang cam
$devices = Get-PnpDevice | Where-Object { $_.InstanceId -like "*VID_12D1*" }
foreach ($d in $devices) {
    Write-Host "Dang khoi dong lai thiet bi: $($d.InstanceId)..." -ForegroundColor Cyan
    pnputil /restart-device "$($d.InstanceId)"
}

Write-Host "====================================================" -ForegroundColor Green
Write-Host "   DA HOAN TAT! VUI LONG RUT CAP VA CAM LAI NOVA 3I " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Start-Sleep -Seconds 3
