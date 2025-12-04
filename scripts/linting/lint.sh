#!/bin/bash
# 린팅 자동화 스크립트
# 사용법: ./scripts/linting/lint.sh [--fix]

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}=== 린팅 시작 ===${NC}"
echo "프로젝트 루트: $PROJECT_ROOT"
echo ""

# 1단계: Ruff 자동 수정
echo -e "${YELLOW}[1/4] Ruff 자동 수정 중...${NC}"
if ruff check --fix server/; then
    echo -e "${GREEN}✓ Ruff 자동 수정 완료${NC}"
else
    echo -e "${RED}✗ Ruff 자동 수정 실패${NC}"
    exit 1
fi
echo ""

# 2단계: Ruff 포매팅
echo -e "${YELLOW}[2/4] Ruff 포매팅 중...${NC}"
if ruff format server/; then
    echo -e "${GREEN}✓ Ruff 포매팅 완료${NC}"
else
    echo -e "${RED}✗ Ruff 포매팅 실패${NC}"
    exit 1
fi
echo ""

# 3단계: Ruff 검사
echo -e "${YELLOW}[3/4] Ruff 검사 중...${NC}"
if ruff check server/; then
    echo -e "${GREEN}✓ Ruff 검사 통과${NC}"
else
    echo -e "${RED}✗ Ruff 검사 실패${NC}"
    exit 1
fi
echo ""

# 4단계: Mypy 타입 체크
echo -e "${YELLOW}[4/4] Mypy 타입 체크 중...${NC}"
if mypy server/; then
    echo -e "${GREEN}✓ Mypy 타입 체크 통과${NC}"
else
    echo -e "${RED}✗ Mypy 타입 체크 실패${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=== 모든 린팅 검사 통과! ===${NC}"

