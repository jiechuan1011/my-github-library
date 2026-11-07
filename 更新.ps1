# 一键更新（Windows）
# 用法：右键 → 使用 PowerShell 运行；或在终端执行 .\更新.ps1
# 有 Token 的话先设置：$env:GITHUB_TOKEN = "ghp_xxx"  再运行本脚本

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "1/3 抓取 GitHub 数据..." -ForegroundColor Cyan
node scripts/fetch.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "抓取失败，检查网络或 Token" -ForegroundColor Red; exit 1 }

Write-Host "2/3 生成网页..." -ForegroundColor Cyan
node scripts/build.mjs

Write-Host "3/3 生成体检报告..." -ForegroundColor Cyan
node scripts/report.mjs

Write-Host "完成，正在打开 index.html" -ForegroundColor Green
Start-Process (Join-Path $PSScriptRoot "index.html")
