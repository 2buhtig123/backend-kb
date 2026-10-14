# 重建两个部署包脚本（中文版 + 英文版）
# 用法：在 backend-kb/site/ 目录下右键 → "使用 PowerShell 运行"

$ErrorActionPreference = 'Stop'

$env:ASTRO_TELEMETRY_DISABLED = "1"
Write-Host "==> 1. 重新构建站点..." -ForegroundColor Cyan
npm run build 2>&1 | Tee-Object -Variable buildOutput | Out-Null

if (-not (Test-Path dist/index.html)) {
    Write-Host "✗ 构建失败：未生成 dist/index.html" -ForegroundColor Red
    exit 1
}

Write-Host "==> 2. 清理旧部署包..." -ForegroundColor Cyan
foreach ($f in @('deploy-ready.zip', 'deploy-en.zip', 'dist-en')) {
    if (Test-Path $f) {
        Remove-Item $f -Recurse -Force
        Write-Host "   ✓ 删除 $f" -ForegroundColor Gray
    }
}

Write-Host "==> 3. 生成英文路径版（dist-en/）..." -ForegroundColor Cyan
node scripts/build-english-zip.mjs | Out-Null

Write-Host "==> 4. 打包中文版（用于 Vercel/GH Pages 等）..." -ForegroundColor Cyan
Compress-Archive -Path dist/* -DestinationPath deploy-ready.zip -CompressionLevel Optimal

Write-Host "==> 5. 打包英文版（用于 EdgeOne Pages 等严格平台）..." -ForegroundColor Cyan
Compress-Archive -Path dist-en/* -DestinationPath deploy-en.zip -CompressionLevel Optimal

$size1 = [math]::Round((Get-Item deploy-ready.zip).Length / 1KB, 1)
$size2 = [math]::Round((Get-Item deploy-en.zip).Length / 1KB, 1)

Write-Host ""
Write-Host "✅ 完成！" -ForegroundColor Green
Write-Host "   · 中文版 deploy-ready.zip: $size1 KB（Vercel / GitHub Pages）" -ForegroundColor White
Write-Host "   · 英文版 deploy-en.zip:    $size2 KB（EdgeOne Pages）" -ForegroundColor White
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "  · 拖到 EdgeOne Pages 用 deploy-en.zip" -ForegroundColor White
Write-Host "  · 推 GitHub / 拖 Vercel 用 deploy-ready.zip" -ForegroundColor White
