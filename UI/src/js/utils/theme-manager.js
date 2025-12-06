/**
 * 테마 관리자
 * 라이트/다크 모드 전환 및 시스템 설정 감지를 담당합니다.
 */

/**
 * 로거 유틸리티
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * ThemeManager 클래스
 */
export class ThemeManager {
    constructor() {
        this.currentTheme = 'dark'; // 기본값: 다크 모드
        this.storageKey = 'app-theme';
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        const logger = getLogger();
        logger.log('[ThemeManager] 테마 관리자 초기화');

        // 저장된 테마 로드
        this.loadTheme();

        // 시스템 다크모드 변경 감지
        this.setupSystemThemeListener();
    }

    /**
     * 저장된 테마 로드
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            // 기본값: 시스템 설정 확인
            this.currentTheme = 'system';
        }
        this.applyTheme(this.currentTheme);
    }

    /**
     * 테마 적용
     */
    applyTheme(theme) {
        const logger = getLogger();
        logger.log('[ThemeManager] 테마 적용:', theme);

        this.currentTheme = theme;

        // 실제 적용할 테마 결정
        let actualTheme = theme;
        if (theme === 'system') {
            actualTheme = this.getSystemTheme();
        }

        // body에 테마 클래스 추가/제거
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${actualTheme}`);

        // HTML 요소에도 테마 속성 추가 (CSS 변수 사용 시)
        document.documentElement.setAttribute('data-theme', actualTheme);

        // 로컬 스토리지에 저장
        localStorage.setItem(this.storageKey, theme);

        // 테마 변경 이벤트 발생
        this.dispatchThemeChangeEvent(actualTheme);
    }

    /**
     * 시스템 테마 감지
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * 시스템 테마 변경 리스너 설정
     */
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

            // 이벤트 리스너 추가 (최신 브라우저)
            if (darkModeQuery.addEventListener) {
                darkModeQuery.addEventListener('change', (e) => {
                    if (this.currentTheme === 'system') {
                        this.applyTheme('system');
                    }
                });
            } else {
                // 구형 브라우저 지원
                darkModeQuery.addListener((e) => {
                    if (this.currentTheme === 'system') {
                        this.applyTheme('system');
                    }
                });
            }
        }
    }

    /**
     * 테마 변경 이벤트 발생
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme }
        });
        window.dispatchEvent(event);
    }

    /**
     * 현재 테마 가져오기
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 실제 적용된 테마 가져오기
     */
    getActualTheme() {
        if (this.currentTheme === 'system') {
            return this.getSystemTheme();
        }
        return this.currentTheme;
    }
}

/**
 * ThemeManager 인스턴스 가져오기
 */
let themeManagerInstance = null;

export function getThemeManagerInstance() {
    if (!themeManagerInstance) {
        themeManagerInstance = new ThemeManager();
        window.themeManager = themeManagerInstance; // 전역 접근을 위해
    }
    return themeManagerInstance;
}

/**
 * 자동 초기화
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        getThemeManagerInstance();
    });
} else {
    getThemeManagerInstance();
}
