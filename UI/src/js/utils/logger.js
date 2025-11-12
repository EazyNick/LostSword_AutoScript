/**
 * 로거 유틸리티
 * 개발 모드일 때만 로그를 출력합니다.
 */

// 환경 변수에서 DEV 모드 확인 (서버에서 주입된 값 또는 기본값)
const DEV_MODE = window.DEV_MODE !== undefined ? window.DEV_MODE : 
                 (localStorage.getItem('DEV_MODE') === 'true' || 
                  new URLSearchParams(window.location.search).get('dev') === 'true');

// 전역 로거 객체
const Logger = {
    /**
     * 개발 모드일 때만 로그 출력
     */
    log(...args) {
        if (DEV_MODE) {
            console.log(...args);
        }
    },
    
    /**
     * 개발 모드일 때만 경고 출력
     */
    warn(...args) {
        if (DEV_MODE) {
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
        if (DEV_MODE) {
            console.info(...args);
        }
    },
    
    /**
     * 개발 모드일 때만 디버그 출력
     */
    debug(...args) {
        if (DEV_MODE) {
            console.debug(...args);
        }
    },
    
    /**
     * 개발 모드 상태 확인
     */
    isDevMode() {
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

// 개발 모드 상태 로그 (이것만 항상 출력 - 한 번만)
if (!window._LOGGER_INITIALIZED) {
    if (DEV_MODE) {
        console.log('[Logger] 개발 모드 활성화됨');
    } else {
        console.log('[Logger] 프로덕션 모드 (로그 비활성화)');
    }
    window._LOGGER_INITIALIZED = true;
}

