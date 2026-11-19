# ==============================================================================
# CLARICE ACHADINHOS — Pipeline Completo: Sincronização, Garimpo & Monetização
# ==============================================================================

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CLARICE ACHADINHOS - PIPELINE COMPLETO MICROSOFT EDGE   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpeza preventiva cirúrgica: encerra APENAS processos órfãos que usam .edge-ml-profile
#    (O Microsoft Edge pessoal e janelas de navegação do usuário NUNCA são fechados)
Write-Host "[1/4] Limpeza cirurgica de processos travados da automacao..." -ForegroundColor White

$automationEdgeProcs = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*edge-ml-profile*" }

if ($automationEdgeProcs) {
  $automationEdgeProcs | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

$profileDir = Join-Path $PSScriptRoot ".edge-ml-profile"
if (Test-Path $profileDir) {
  Remove-Item -Path "$profileDir\Singleton*" -Force -ErrorAction SilentlyContinue
  Remove-Item -Path "$profileDir\lockfile" -Force -ErrorAction SilentlyContinue
}

# 2. Sincronização rápida de preços, estoque e promoções dos produtos ativos
Write-Host "[2/4] Sincronizando precos, estoque e promocoes da vitrine ativa..." -ForegroundColor White
Write-Host ""

node scripts/sincronizar-vitrine.mjs

Write-Host ""
Write-Host "[3/4] Iniciando garimpo e monetizacao de novos achadinhos (Edge: Link Geral -> Radar -> Link Builder)..." -ForegroundColor White
Write-Host ""

node scripts/auto-afiliado-ml.mjs

Write-Host ""
Write-Host "[4/4] Ciclo completo finalizado com sucesso!" -ForegroundColor Green
Write-Host "Vitrine oficial: https://clarice-variedades.vercel.app" -ForegroundColor Cyan
Write-Host ""
