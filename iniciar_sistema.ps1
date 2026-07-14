Clear-Host
Write-Host "⚡ SE7VEN ENERGIA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
    python -m http.server 8000
} catch {
    Write-Host "⚠️ Python não encontrado" -ForegroundColor Yellow
    Write-Host "📁 Abra a pasta e execute servidor.bat" -ForegroundColor White
    Start-Process $pasta
}
