Add-Type -AssemblyName System.Drawing

$targetSize = 768
$quality = 85

# 20道菜的英文文件名
$names = @(
    "garlic_chicken_legs",
    "breakfast_sandwich",
    "butter_toast_with_milk",
    "shrimp_broccoli_stirfry",
    "tomato_fish_soup",
    "curry_beef_rice",
    "spinach_wood_ear_salad",
    "ham_egg_fried_rice",
    "sesame_noodles",
    "oyster_mushrooms",
    "tomato_seabass_soup",
    "pan_fried_buns",
    "shrimp_egg_scramble",
    "garlic_eggplant",
    "wood_ear_yam_stirfry",
    "curry_shrimp_rice",
    "lemon_salmon_salad",
    "creamy_mushroom_pasta",
    "duck_lotus_root_stew",
    "soy_sauce_fried_rice"
)

$dir = "e:\project\LetsDo\dish_imgs_final"
$results = @()

foreach ($name in $names) {
    $path = Join-Path $dir "$name.jpg"
    if (-not (Test-Path $path)) {
        Write-Host "SKIP (not found): $path"
        continue
    }
    
    # 加载原图
    $src = [System.Drawing.Image]::FromFile($path)
    $origW = $src.Width
    $origH = $src.Height
    
    # 裁剪底部 10%
    $cropH = [int]($origH * 0.9)
    $cropRect = New-Object System.Drawing.Rectangle(0, 0, $origW, $cropH)
    
    # 创建裁剪后的位图
    $cropped = New-Object System.Drawing.Bitmap($cropRect.Width, $cropRect.Height)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, $cropRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    
    # 缩放到 768x768
    $resized = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $g2 = [System.Drawing.Graphics]::FromImage($resized)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.DrawImage($cropped, 0, 0, $targetSize, $targetSize)
    $g2.Dispose()
    $cropped.Dispose()
    
    # 保存 JPEG q85
    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
    
    # 先删旧文件
    Remove-Item $path -Force
    $resized.Save($path, $jpegCodec, $encParams)
    $resized.Dispose()
    
    # 获取文件大小
    $file = Get-Item $path
    $kb = [math]::Round($file.Length / 1KB, 1)
    Write-Host "OK: $name ($origW x $origH -> $targetSize x $targetSize, $kb KB)"
    
    $results += [PSCustomObject]@{ Name = $name; SizeKB = $kb; Path = $path }
}

Write-Host "`n=== Summary ==="
$results | Format-Table -AutoSize
Write-Host "Total processed: $($results.Count)"
