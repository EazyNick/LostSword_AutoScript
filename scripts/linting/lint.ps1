# 린팅 자동화 스크립트 (PowerShell)
# 사용법: .\scripts\linting\lint.ps1

$ErrorActionPreference = "Stop"  # 에러 발생 시 스크립트 중단

# 색상 출력 함수
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# 현재 디렉토리 확인
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $ProjectRoot

Write-ColorOutput Green "=== 린팅 시작 ==="
Write-Output "프로젝트 루트: $ProjectRoot"
Write-Output ""

# 1단계: Ruff 자동 수정
Write-ColorOutput Yellow "[1/4] Ruff 자동 수정 중..."
try {
    ruff check --fix server/
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Ruff 자동 수정 완료"
    } else {
        Write-ColorOutput Red "✗ Ruff 자동 수정 실패"
        exit 1
    }
} catch {
    Write-ColorOutput Red "✗ Ruff 자동 수정 실패: $_"
    exit 1
}
Write-Output ""

# 2단계: Ruff 포매팅
Write-ColorOutput Yellow "[2/4] Ruff 포매팅 중..."
try {
    ruff format server/
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Ruff 포매팅 완료"
    } else {
        Write-ColorOutput Red "✗ Ruff 포매팅 실패"
        exit 1
    }
} catch {
    Write-ColorOutput Red "✗ Ruff 포매팅 실패: $_"
    exit 1
}
Write-Output ""

# 3단계: Ruff 검사
Write-ColorOutput Yellow "[3/4] Ruff 검사 중..."
try {
    ruff check server/
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Ruff 검사 통과"
    } else {
        Write-ColorOutput Red "✗ Ruff 검사 실패"
        exit 1
    }
} catch {
    Write-ColorOutput Red "✗ Ruff 검사 실패: $_"
    exit 1
}
Write-Output ""

# 4단계: Mypy 타입 체크
Write-ColorOutput Yellow "[4/4] Mypy 타입 체크 중..."
try {
    mypy server/
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Mypy 타입 체크 통과"
    } else {
        Write-ColorOutput Red "✗ Mypy 타입 체크 실패"
        exit 1
    }
} catch {
    Write-ColorOutput Red "✗ Mypy 타입 체크 실패: $_"
    exit 1
}
Write-Output ""

Write-ColorOutput Green "=== 모든 린팅 검사 통과! ==="

