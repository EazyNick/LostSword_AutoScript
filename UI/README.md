# UI 개발 가이드

## JavaScript 린팅 설정

이 프로젝트는 ESLint와 Prettier를 사용하여 JavaScript 코드 품질을 관리합니다.

## 빠른 시작

### 1. 의존성 설치

```bash
cd UI
npm install
```

### 2. 린팅 실행

```bash
# 린팅 오류 확인
npm run lint

# 린팅 오류 자동 수정
npm run lint:fix

# 코드 포매팅
npm run format

# 포매팅 확인 (수정하지 않음)
npm run format:check
```

## 사용 가능한 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run lint` | 모든 JavaScript 파일의 린팅 오류 확인 |
| `npm run lint:fix` | 자동으로 수정 가능한 린팅 오류 수정 |
| `npm run format` | Prettier로 코드 포매팅 적용 |
| `npm run format:check` | 포매팅 확인만 (수정하지 않음) |

## 린팅 규칙

### ESLint 규칙

- 들여쓰기: 4칸 스페이스
- 따옴표: 작은따옴표 (`'`)
- 세미콜론: 필수
- `var` 사용 금지 (`let`, `const` 사용)
- `==` 사용 금지 (`===` 사용)
- 최대 라인 길이: 120자

### Prettier 설정

- 들여쓰기: 4칸 스페이스
- 작은따옴표 사용
- 세미콜론 사용
- 최대 라인 길이: 120자

## CI/CD에서 사용

GitHub Actions나 다른 CI/CD 파이프라인에서 사용하려면:

```yaml
# 예시: GitHub Actions
- name: Install dependencies
  run: |
    cd UI
    npm install

- name: Run linter
  run: |
    cd UI
    npm run lint

- name: Check formatting
  run: |
    cd UI
    npm run format:check
```

## 문제 해결

### ESLint가 설치되지 않는 경우

```bash
cd UI
npm install --save-dev eslint prettier
```

### 특정 파일/폴더 제외

`.eslintignore` 파일에 제외할 경로를 추가하세요:

```
# 예시
node_modules/
dist/
*.config.js
```

## 추가 정보

- [ESLint 공식 문서](https://eslint.org/)
- [Prettier 공식 문서](https://prettier.io/)

