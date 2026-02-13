# Quick Start Script for Windows PowerShell
# Run this script to set up and test the QA automation framework

Write-Host "🚀 League of Traders QA Automation - Quick Start" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "📦 Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js detected: $nodeVersion" -ForegroundColor Green

# Check if npm is installed
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm is not installed. Please install Node.js which includes npm." -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm detected: $npmVersion" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file and add your test credentials:" -ForegroundColor Yellow
    Write-Host "   LOT_EMAIL=your-test-email@example.com" -ForegroundColor White
    Write-Host "   LOT_PASSWORD=your-password" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to open .env file in notepad..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    notepad .env
    Write-Host ""
    Write-Host "Press any key to continue after saving credentials..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}
Write-Host ""

# Check if Playwright browsers are installed
Write-Host "🌐 Checking Playwright browsers..." -ForegroundColor Yellow
$playwrightPath = "node_modules\.bin\playwright.cmd"
if (Test-Path $playwrightPath) {
    & $playwrightPath install chromium --with-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Browser installation had issues, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Playwright browsers ready" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Playwright not found in node_modules" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  npm run test:smoke        - Run smoke tests (fast, ~5 min)" -ForegroundColor White
Write-Host "  npm run test:regression   - Run regression tests (~15 min)" -ForegroundColor White
Write-Host "  npm run test:crawl        - Run full site crawl (~60 min)" -ForegroundColor White
Write-Host "  npm run test:nightly      - Run accessibility tests" -ForegroundColor White
Write-Host "  npm run report            - View last test report" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Recommended first test:" -ForegroundColor Yellow
Write-Host "   npm run test:smoke" -ForegroundColor White
Write-Host ""
Write-Host "Would you like to run a smoke test now? (y/n): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🏃 Running smoke tests..." -ForegroundColor Yellow
    Write-Host ""
    npm run test:smoke
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Test run complete! Check the output above." -ForegroundColor Green
    Write-Host "To view the HTML report, run: npm run report" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "👍 Setup complete! Run tests whenever you're ready." -ForegroundColor Green
}

Write-Host ""
Write-Host "📚 For more information, see README.md" -ForegroundColor Cyan
Write-Host ""
