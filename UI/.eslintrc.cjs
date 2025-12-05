/**
 * ESLint 설정 파일
 * 개발 편의성을 위해 대부분의 규칙을 경고 또는 비활성화로 설정
 */

module.exports = {
    // === 실행 환경 설정 ===
    // 브라우저/Node.js 환경에서 사용 가능한 전역 변수 자동 인식
    env: {
        browser: true,  // 브라우저 전역 변수 사용 (window, document 등)
        es2021: true,  // ES2021 문법 사용
        node: true     // Node.js 전역 변수 사용
    },

    // === 기본 규칙 세트 확장 ===
    // ESLint 권장 규칙을 기본으로 사용
    // prettier는 마지막에 위치해야 Prettier와 충돌하는 규칙을 비활성화
    extends: [
        'eslint:recommended',  // ESLint 권장 규칙 사용
        'prettier'             // Prettier와 충돌하는 ESLint 규칙 비활성화 (indent, quotes, semi 등)
    ],

    // === 파서 옵션 설정 ===
    // JavaScript 파싱 옵션
    parserOptions: {
        ecmaVersion: 'latest',  // 최신 ECMAScript 버전 사용
        sourceType: 'module'     // ES6 모듈 사용 (import/export)
    },

    // === 커스텀 규칙 설정 ===
    // 각 규칙의 의미와 설정 이유
    // 주의: Prettier와 충돌하는 규칙(indent, quotes, semi 등)은 eslint-config-prettier가 자동으로 비활성화
    rules: {
        // === 들여쓰기 ===
        // Prettier가 들여쓰기를 담당하므로 ESLint의 indent 규칙은 비활성화됨
        // Prettier 설정: tabWidth: 4 (4칸 스페이스)
        // indent 규칙은 eslint-config-prettier에 의해 자동으로 비활성화됨

        // === 줄바꿈 스타일 ===
        // Prettier가 줄바꿈을 관리하므로 ESLint 규칙은 비활성화
        // Prettier 설정: endOfLine: "auto" (현재 파일의 줄바꿈 스타일 유지)
        'linebreak-style': 'off',

        // === 따옴표 ===
        // 작은따옴표 사용 권장 (에러 방지용 큰따옴표 허용)
        quotes: ['warn', 'single', { avoidEscape: true }],

        // === 세미콜론 ===
        // 세미콜론 필수 사용 권장
        semi: ['warn', 'always'],

        // === 사용하지 않는 변수 ===
        // 경고 비활성화 (개발 편의성 - 나중에 사용할 변수 선언 허용)
        'no-unused-vars': 'off',

        // === 콘솔 사용 ===
        // console.log 등 허용 (디버깅 편의성)
        'no-console': 'off',

        // === 디버거 사용 ===
        // debugger 문 사용 시 경고 (프로덕션 배포 전 확인)
        'no-debugger': 'warn',

        // === const 사용 권장 ===
        // let 대신 const 사용 권장 (변경 불가능한 변수는 const 사용)
        'prefer-const': 'warn',

        // === var 사용 ===
        // var 사용 시 경고 (let, const 권장 - 호이스팅 문제 방지)
        'no-var': 'warn',

        // === 동등 연산자 ===
        // == 사용 허용 (=== 권장이지만 강제하지 않음 - 개발 편의성)
        eqeqeq: 'off',

        // === 중괄호 ===
        // if/else 등에서 중괄호 사용 권장 (버그 방지)
        curly: ['warn', 'all'],

        // === 중괄호 스타일 ===
        // 중괄호 위치 자유 (1tbs, stroustrup, allman 모두 허용)
        'brace-style': 'off',

        // === case 블록 변수 선언 ===
        // switch case 블록에서 변수 선언 허용 (개발 편의성)
        'no-case-declarations': 'off',

        // === 중복 키 ===
        // 객체에서 중복 키는 실제 버그이므로 에러로 감지
        // 중복 키는 예상치 못한 동작을 일으킬 수 있음
        'no-dupe-keys': 'error',

        // === 쉼표 ===
        // 마지막 쉼표 사용하지 않음 (예: [1, 2, 3] ✓, [1, 2, 3,] ✗)
        'comma-dangle': ['warn', 'never'],

        // === 쉼표 앞뒤 공백 ===
        // 쉼표 앞 공백 없음, 뒤 공백 있음 (예: [1, 2, 3] ✓, [1,2,3] ✗)
        'comma-spacing': ['warn', { before: false, after: true }],

        // === 쉼표 위치 ===
        // 쉼표는 마지막에 위치 (예: const a = 1, b = 2; ✓)
        'comma-style': ['warn', 'last'],

        // === 객체 키-값 간격 ===
        // 콜론 앞 공백 없음, 뒤 공백 있음 (예: {key: value} ✓, {key:value} ✗)
        'key-spacing': ['warn', { beforeColon: false, afterColon: true }],

        // === 객체 중괄호 내부 공백 ===
        // { key: value } 형식 (공백 있음) (예: {key: value} ✓, {key:value} ✗)
        'object-curly-spacing': ['warn', 'always'],

        // === 배열 대괄호 내부 공백 ===
        // [1, 2, 3] 형식 (공백 없음) (예: [1, 2, 3] ✓, [ 1, 2, 3 ] ✗)
        'array-bracket-spacing': ['warn', 'never'],

        // === 블록 앞 공백 ===
        // if {, function { 등 블록 앞 공백 권장 (예: if (true) { ✓)
        'space-before-blocks': ['warn', 'always'],

        // === 함수 괄호 앞 공백 ===
        // 함수 선언 시 괄호 앞 공백 규칙
        'space-before-function-paren': ['warn', {
            anonymous: 'always',  // 익명 함수: function () {} ✓
            named: 'never',       // 명명 함수: function name() {} ✓
            asyncArrow: 'always'  // async 화살표: async () => {} ✓
        }],

        // === 괄호 내부 공백 ===
        // (1, 2) 형식 (공백 없음) (예: (1, 2) ✓, ( 1, 2 ) ✗)
        'space-in-parens': ['warn', 'never'],

        // === 연산자 주변 공백 ===
        // a + b 형식 (연산자 주변 공백 권장) (예: a + b ✓, a+b ✗)
        'space-infix-ops': 'warn',

        // === 단항 연산자 공백 ===
        // 단항 연산자 공백 규칙
        'space-unary-ops': ['warn', {
            words: true,    // typeof, delete 등: 공백 있음 (예: typeof x ✓)
            nonwords: false // ++, -- 등: 공백 없음 (예: x++ ✓, x ++ ✗)
        }],

        // === 주석 공백 ===
        // // 주석 형식 (// 뒤 공백 권장) (예: // 주석 ✓, //주석 ✗)
        'spaced-comment': ['warn', 'always'],

        // === 화살표 함수 공백 ===
        // () => {} 형식 (화살표 앞뒤 공백 권장) (예: () => {} ✓, ()=>{} ✗)
        'arrow-spacing': ['warn', { before: true, after: true }],

        // === 줄 끝 공백 ===
        // 줄 끝 공백 제거 권장 (Git diff 깔끔하게 유지)
        'no-trailing-spaces': 'warn',

        // === 파일 끝 줄바꿈 ===
        // 파일 끝에 줄바꿈 추가 권장 (POSIX 표준 준수)
        'eol-last': ['warn', 'always'],

        // === 최대 라인 길이 ===
        // 라인 길이 제한 없음 (개발 편의성 - 긴 URL, 긴 문자열 허용)
        'max-len': 'off'
    },

    // === 전역 변수 선언 ===
    // 브라우저/Node.js 환경에서 사용 가능한 전역 변수
    // 'readonly': 읽기 전용 (재할당 불가)
    globals: {
        // === 브라우저 전역 변수 ===
        window: 'readonly',              // 브라우저 window 객체
        document: 'readonly',            // DOM document 객체
        console: 'readonly',             // console 객체 (log, error 등)
        fetch: 'readonly',               // fetch API
        localStorage: 'readonly',         // 로컬 스토리지
        sessionStorage: 'readonly',      // 세션 스토리지
        performance: 'readonly',         // 성능 측정 API
        requestAnimationFrame: 'readonly', // 애니메이션 프레임 요청
        cancelAnimationFrame: 'readonly', // 애니메이션 프레임 취소

        // === 커스텀 전역 변수 ===
        // logger.js에서 정의한 전역 로거 함수들
        log: 'readonly',                 // log() 함수
        logWarn: 'readonly',             // logWarn() 함수
        logError: 'readonly',            // logError() 함수
        logInfo: 'readonly',             // logInfo() 함수
        logDebug: 'readonly',            // logDebug() 함수
        Logger: 'readonly'               // Logger 객체
    }
};

