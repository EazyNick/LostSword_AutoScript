/**
 * 로거 유틸리티
 * 개발 모드일 때만 로그를 출력합니다.
 */

// 환경 변수에서 DEV 모드 확인 (서버 API에서 받아오기)
let DEV_MODE = false;
let DEV_MODE_LOADED = false;

// 서버에서 DEV_MODE를 비동기로 가져오기
async function loadDevMode() {
    if (DEV_MODE_LOADED) {
        return DEV_MODE;
    }
    
    try {
        // 서버 API에서 설정 정보 가져오기
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            // ENVIRONMENT 값이 있으면 그것을 우선 사용, 없으면 dev_mode 사용
            if (config.environment !== undefined) {
                DEV_MODE = config.environment === 'dev';
                console.log('[Logger] 서버에서 ENVIRONMENT 받아옴:', config.environment, '→ DEV_MODE:', DEV_MODE);
            } else {
                DEV_MODE = config.dev_mode === true || config.dev_mode === 'true';
                console.log('[Logger] 서버에서 DEV_MODE 받아옴:', config.dev_mode, '→', DEV_MODE);
            }
            DEV_MODE_LOADED = true;
            return DEV_MODE;
        } else {
            console.warn('[Logger] 서버 설정 조회 실패, 폴백 사용');
        }
    } catch (error) {
        console.warn('[Logger] 서버 설정 조회 중 에러:', error);
    }
    
    // 폴백: window.ENVIRONMENT 또는 window.DEV_MODE (HTML 주입) 또는 localStorage, URL 파라미터
    if (window.ENVIRONMENT !== undefined) {
        DEV_MODE = window.ENVIRONMENT === 'dev';
        console.log('[Logger] window.ENVIRONMENT에서 읽음:', window.ENVIRONMENT, '→ DEV_MODE:', DEV_MODE);
    } else if (window.DEV_MODE !== undefined) {
        DEV_MODE = window.DEV_MODE === true || window.DEV_MODE === 'true';
        console.log('[Logger] window.DEV_MODE에서 읽음:', window.DEV_MODE, '→', DEV_MODE);
    } else {
        // localStorage나 URL 파라미터 확인
        const envFromStorage = localStorage.getItem('ENVIRONMENT');
        if (envFromStorage) {
            DEV_MODE = envFromStorage === 'dev';
            console.log('[Logger] localStorage에서 ENVIRONMENT 읽음:', envFromStorage, '→ DEV_MODE:', DEV_MODE);
        } else {
            DEV_MODE = localStorage.getItem('DEV_MODE') === 'true' || 
                    new URLSearchParams(window.location.search).get('dev') === 'true';
            console.log('[Logger] 폴백 사용:', DEV_MODE);
        }
    }
    
    DEV_MODE_LOADED = true;
    return DEV_MODE;
}

// 즉시 로드 시도 (비동기)
loadDevMode();

// 전역 로거 객체
const Logger = {
    /**
     * 개발 모드일 때만 로그 출력
     */
    log(...args) {
        // DEV_MODE가 아직 로드되지 않았으면 일단 출력 (로드 중)
        if (DEV_MODE || !DEV_MODE_LOADED) {
            console.log(...args);
        }
    },
    
    /**
     * 개발 모드일 때만 경고 출력
     */
    warn(...args) {
        if (DEV_MODE || !DEV_MODE_LOADED) {
            console.warn(...args);
        }
    },
    
    /**
     * 개발 모드일 때만 에러 출력 (에러는 항상 출력)
     */
    error(...args) {
        // 에러는 항상 출력
        console.error(...args);
    },
    
    /**
     * 개발 모드일 때만 정보 출력
     */
    info(...args) {
        if (DEV_MODE || !DEV_MODE_LOADED) {
            console.info(...args);
        }
    },
    
    /**
     * 개발 모드일 때만 디버그 출력
     */
    debug(...args) {
        if (DEV_MODE || !DEV_MODE_LOADED) {
            console.debug(...args);
        }
    },
    
    /**
     * 개발 모드 상태 확인
     */
    isDevMode() {
        return DEV_MODE;
    },
    
    /**
     * 개발 모드 로드 완료 대기
     */
    async waitForDevMode() {
        await loadDevMode();
        return DEV_MODE;
    }
};

// 전역으로 사용할 수 있도록 export
window.Logger = Logger;
window.DEV_MODE = DEV_MODE;

// 전역 log 함수들 (편의를 위해 직접 사용 가능)
window.log = Logger.log.bind(Logger);
window.logWarn = Logger.warn.bind(Logger);
window.logError = Logger.error.bind(Logger);
window.logInfo = Logger.info.bind(Logger);
window.logDebug = Logger.debug.bind(Logger);

// 개발 모드 상태 로그 (비동기로 로드 후 출력)
if (!window._LOGGER_INITIALIZED) {
    loadDevMode().then(() => {
        if (DEV_MODE) {
            console.log('[Logger] ✅ 개발 모드 활성화됨 (서버에서 확인)');
        } else {
            console.log('[Logger] 프로덕션 모드 (로그 비활성화)');
        }
    });
    window._LOGGER_INITIALIZED = true;
}

