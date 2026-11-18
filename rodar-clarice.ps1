# ==============================================================================
# CLARICE ACHADINHOS — Garimpo Real & Monetização Automática (Microsoft Edge)
# ==============================================================================

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CLARICE ACHADINHOS - AUTO-AFILIADO COM MICROSOFT EDGE   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpeza preventiva de processos residuais e travas de sessão
Write-Host "[1/3] Limpando processos residuais e travas de sessao..." -ForegroundColor White

Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like "*edge-ml-profile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$profileDir = Join-Path $PSScriptRoot ".edge-ml-profile"
if (Test-Path $profileDir) {
  Remove-Item -Path "$profileDir\Singleton*" -Force -ErrorAction SilentlyContinue
  Remove-Item -Path "$profileDir\lockfile" -Force -ErrorAction SilentlyContinue
}

Write-Host "[2/3] Iniciando robo autonomo (Contexto Unico Edge: Link Geral -> Radar -> Link Builder)..." -ForegroundColor White
Write-Host ""

node scripts/auto-afiliado-ml.mjs

Write-Host ""
Write-Host "[3/3] Ciclo finalizado com sucesso!" -ForegroundColor Green
Write-Host "Vitrine oficial: https://clarice-variedades.vercel.app" -ForegroundColor Cyan
Write-Host ""
