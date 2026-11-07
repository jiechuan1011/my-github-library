# 一键更新（Windows）
# 用法：右键 → 使用 PowerShell 运行；或在终端执行 .\更新.ps1
# 有 Token 的话先设置：$env:GITHUB_TOKEN = "ghp_xxx"  再运行本脚本

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
chcp 65001 | Out-Null

Write-Host "1/4 抓取 GitHub 数据..." -ForegroundColor Cyan
node scripts/fetch.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "抓取失败，检查网络或代理" -ForegroundColor Red; exit 1 }

Write-Host "2/4 自动翻译新收藏的说明..." -ForegroundColor Cyan
if (Get-Command python -ErrorAction SilentlyContinue) {
  python scripts/translate.py
  if ($LASTEXITCODE -ne 0) { Write-Host "翻译没成功，跳过（不影响页面）" -ForegroundColor Yellow }
} else {
  Write-Host "没找到 python，跳过自动翻译（新收藏会显示英文原文）" -ForegroundColor Yellow
}

Write-Host "3/4 生成网页..." -ForegroundColor Cyan
node scripts/build.mjs

Write-Host "4/4 生成体检报告..." -ForegroundColor Cyan
node scripts/report.mjs

Write-Host "完成，正在打开 index.html" -ForegroundColor Green
Start-Process (Join-Path $PSScriptRoot "index.html")
