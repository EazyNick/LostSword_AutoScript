#!/usr/bin/env python3
"""
JavaScript 린팅 자동화 스크립트
사용법: python scripts/linting/lint-js.py

GitHub Desktop에서도 메시지가 보이도록 stderr로 출력합니다.
"""

import os
import subprocess
import sys
from pathlib import Path

# Windows에서 UTF-8 인코딩 설정
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    os.environ["PYTHONIOENCODING"] = "utf-8"

# GitHub Desktop에서 메시지가 보이도록 stderr로 출력하는 함수
def print_stderr(message: str) -> None:
    """stderr로 메시지 출력 (GitHub Desktop에서 보이도록)"""
    try:
        print(message, file=sys.stderr, flush=True)
    except UnicodeEncodeError:
        safe_message = message.replace("✓", "[OK]").replace("✗", "[FAIL]")
        print(safe_message, file=sys.stderr, flush=True)

# 색상 출력 (터미널용)
class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    NC = "\033[0m"  # No Color


def print_color(message: str, color: str = Colors.NC, use_stderr: bool = True) -> None:
    """색상이 있는 메시지 출력 (GitHub Desktop 호환)"""
    # GitHub Desktop에서는 색상이 안 보이므로 텍스트로도 표시
    if use_stderr:
        # stderr로 출력 (GitHub Desktop에서 보임)
        print_stderr(message)
    else:
        # stdout으로 출력 (터미널용)
        try:
            print(f"{color}{message}{Colors.NC}")
        except UnicodeEncodeError:
            safe_message = message.replace("✓", "[OK]").replace("✗", "[FAIL]")
            print(f"{color}{safe_message}{Colors.NC}")


def find_node_modules(project_root: Path) -> Path | None:
    """UI 디렉토리에서 node_modules 찾기"""
    ui_dir = project_root / "UI"
    node_modules = ui_dir / "node_modules"
    if node_modules.exists():
        return node_modules
    return None


def find_npm_command() -> list[str]:
    """npm 명령어 찾기 (Windows에서는 npm.cmd 사용)"""
    if sys.platform == "win32":
        # Windows에서는 npm.cmd를 사용
        return ["npm.cmd"]
    else:
        # Linux/Mac에서는 npm 사용
        which_cmd = "which"
        try:
            result = subprocess.run([which_cmd, "npm"], capture_output=True, text=True, check=True)
            return [result.stdout.strip().split("\n")[0]]
        except (subprocess.CalledProcessError, FileNotFoundError):
            return ["npm"]


def run_command(command: list[str], description: str, cwd: Path | None = None) -> bool:
    """명령어 실행 (GitHub Desktop 호환)"""
    print_stderr(f"[{description}] 실행 중...")
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=cwd,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        # stdout 출력 (GitHub Desktop에서 보이도록 stderr로 리다이렉트)
        if result.stdout:
            try:
                print_stderr(result.stdout)
            except UnicodeEncodeError:
                safe_output = result.stdout.encode("utf-8", errors="replace").decode("utf-8", errors="replace")
                print_stderr(safe_output)
        print_stderr(f"[OK] {description} 완료")
        return True
    except subprocess.CalledProcessError as e:
        print_stderr("")
        print_stderr(f"[FAIL] {description} 실패")
        print_stderr("")
        # 에러 출력 (GitHub Desktop에서 보이도록)
        if e.stdout:
            try:
                print_stderr("=== 표준 출력 ===")
                print_stderr(e.stdout)
            except UnicodeEncodeError:
                safe_output = e.stdout.encode("utf-8", errors="replace").decode("utf-8", errors="replace")
                print_stderr("=== 표준 출력 ===")
                print_stderr(safe_output)
        if e.stderr:
            try:
                print_stderr("=== 에러 출력 ===")
                print_stderr(e.stderr)
            except UnicodeEncodeError:
                safe_output = e.stderr.encode("utf-8", errors="replace").decode("utf-8", errors="replace")
                print_stderr("=== 에러 출력 ===")
                print_stderr(safe_output)
        print_stderr("")
        return False
    except FileNotFoundError:
        print_stderr("")
        print_stderr(f"[FAIL] {description} 실패: '{command[0]}' 명령어를 찾을 수 없습니다.")
        print_stderr("")
        print_stderr("해결 방법:")
        print_stderr("  1. npm이 설치되어 있는지 확인하세요: npm --version")
        print_stderr("  2. UI 디렉토리로 이동하여 의존성을 설치하세요: cd UI && npm install")
        print_stderr("")
        return False


def main() -> int:
    """메인 함수"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    ui_dir = project_root / "UI"

    # UI 디렉토리 확인
    if not ui_dir.exists():
        print_stderr("")
        print_stderr("[FAIL] UI 디렉토리를 찾을 수 없습니다.")
        print_stderr(f"예상 경로: {ui_dir}")
        print_stderr("")
        return 1

    # node_modules 확인
    node_modules = ui_dir / "node_modules"
    if not node_modules.exists():
        print_stderr("")
        print_stderr("[FAIL] node_modules가 없습니다.")
        print_stderr("")
        print_stderr("해결 방법:")
        print_stderr("  1. UI 디렉토리로 이동: cd UI")
        print_stderr("  2. 의존성 설치: npm install")
        print_stderr("")
        return 1

    npm_cmd = find_npm_command()
    os.chdir(ui_dir)

    print_stderr("")
    print_stderr("=== JavaScript 린팅 검사 시작 ===")
    print_stderr(f"UI 디렉토리: {ui_dir}")
    print_stderr("")

    # 1단계: ESLint 자동 수정
    if not run_command(npm_cmd + ["run", "lint:fix"], "[1/4] ESLint 자동 수정", cwd=ui_dir):
        print_stderr("")
        print_stderr("=== JavaScript 린팅 검사 실패 ===")
        print_stderr("")
        return 1
    print_stderr("")

    # 2단계: Prettier 포매팅
    if not run_command(npm_cmd + ["run", "format"], "[2/4] Prettier 포매팅", cwd=ui_dir):
        print_stderr("")
        print_stderr("=== JavaScript 린팅 검사 실패 ===")
        print_stderr("")
        return 1
    print_stderr("")

    # 3단계: ESLint 검사
    if not run_command(npm_cmd + ["run", "lint"], "[3/4] ESLint 검사", cwd=ui_dir):
        print_stderr("")
        print_stderr("=== JavaScript 린팅 검사 실패 ===")
        print_stderr("")
        return 1
    print_stderr("")

    # 4단계: Prettier 포매팅 확인
    if not run_command(npm_cmd + ["run", "format:check"], "[4/4] Prettier 포매팅 확인", cwd=ui_dir):
        print_stderr("")
        print_stderr("=== JavaScript 린팅 검사 실패 ===")
        print_stderr("")
        return 1
    print_stderr("")

    print_stderr("=== 모든 JavaScript 린팅 검사 통과! ===")
    print_stderr("")
    return 0


if __name__ == "__main__":
    sys.exit(main())

