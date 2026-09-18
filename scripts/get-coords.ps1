Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap "D:\luufilelaptrinh\quan ly con\screen_kid_perm_real.png"
Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"
$xs = [System.Collections.Generic.List[int]]::new()
$ys = [System.Collections.Generic.List[int]]::new()
for ($y = 0; $y -lt $bmp.Height; $y += 2) {
    for ($x = 0; $x -lt $bmp.Width; $x += 2) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 220 -and $c.G -gt 120 -and $c.G -lt 180 -and $c.B -lt 40) {
            $xs.Add($x)
            $ys.Add($y)
        }
    }
}
$bmp.Dispose()
if ($xs.Count -gt 0) {
    $minX = ($xs | Measure-Object -Minimum).Minimum
    $maxX = ($xs | Measure-Object -Maximum).Maximum
    $minY = ($ys | Measure-Object -Minimum).Minimum
    $maxY = ($ys | Measure-Object -Maximum).Maximum
    Write-Host "Button bounds: X: $minX .. $maxX , Y: $minY .. $maxY"
    $centerX = [int](($minX + $maxX) / 2)
    $centerY = [int](($minY + $maxY) / 2)
    Write-Host "Center: $centerX , $centerY"
} else {
    Write-Host "No orange pixels found"
}
