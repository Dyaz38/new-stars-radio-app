# Convert Markdown files to PDF
# This script helps you convert the completion docs to PDF

Write-Host "=== Markdown to PDF Converter ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "admin-panel\QS_PROMPT_5_COMPLETE.md",
    "QS_PROMPTS_1-5_COMPLETE.md"
)

# Check if pandoc is installed
$pandocExists = Get-Command pandoc -ErrorAction SilentlyContinue

if ($pandocExists) {
    Write-Host "✅ Pandoc found! Converting files..." -ForegroundColor Green
    Write-Host ""
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            $pdfFile = $file -replace '\.md$', '.pdf'
            Write-Host "Converting: $file -> $pdfFile" -ForegroundColor Yellow
            
            pandoc $file -o $pdfFile --pdf-engine=wkhtmltopdf `
                -V geometry:margin=1in `
                --highlight-style=tango
            
            if ($?) {
                Write-Host "✅ Created: $pdfFile" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to convert: $file" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ File not found: $file" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Write-Host "✅ Done!" -ForegroundColor Green
    
} else {
    Write-Host "❌ Pandoc not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Install Pandoc: https://pandoc.org/installing.html" -ForegroundColor White
    Write-Host "2. Use VS Code Markdown PDF extension" -ForegroundColor White
    Write-Host "3. Use online converter: https://www.markdowntopdf.com/" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening files in browser for manual PDF save..." -ForegroundColor Yellow
    
    # Open in default browser - user can print to PDF
    foreach ($file in $files) {
        if (Test-Path $file) {
            Write-Host "Opening: $file" -ForegroundColor Cyan
            $fullPath = (Resolve-Path $file).Path
            Start-Process $fullPath
        }
    }
    
    Write-Host ""
    Write-Host "💡 Tip: In your markdown viewer, you can File -> Print -> Save as PDF" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



