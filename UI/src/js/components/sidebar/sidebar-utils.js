/**
 * SidebarManager 유틸리티 함수들
 *
 * 이 모듈은 SidebarManager에서 사용하는 공통 유틸리티 함수들을 제공합니다.
 * - 로거: 전역 Logger 인스턴스 또는 console을 사용하는 로거 팩토리
 * - 날짜 포맷팅: 서버의 ISO 날짜 형식을 클라이언트 표시 형식으로 변환
 *
 * @module sidebar-utils
 */

/**
 * 로거 유틸리티 팩토리 함수
 *
 * 전역 Logger 인스턴스가 있으면 우선 사용하고, 없으면 console을 fallback으로 사용합니다.
 * 이는 ES6 모듈 전환 과정에서 기존 전역 변수와의 호환성을 유지하기 위한 설계입니다.
 *
 * @returns {{log: Function, warn: Function, error: Function}} 로거 객체
 * @example
 * const logger = getLogger();
 * logger.log('메시지');
 * logger.warn('경고');
 * logger.error('에러');
 */
export const getLogger = () => {
    // ES6 모듈에서 import 시도 (다른 파일이 ES6 모듈로 변경되면 사용)
    try {
        // 동적 import는 나중에 추가 가능
        return {
            log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
            warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
            error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
        };
    } catch (e) {
        // 전역 fallback
        return {
            log: window.log || console.log,
            warn: window.logWarn || console.warn,
            error: window.logError || console.error
        };
    }
};

/**
 * 날짜 포맷팅 함수
 *
 * 서버에서 받은 ISO 8601 형식의 날짜 문자열을 한국어 표기 형식으로 변환합니다.
 * 예: "2024-01-15T10:30:00Z" → "2024. 01. 15."
 *
 * @param {string} dateString - ISO 8601 형식의 날짜 문자열 (예: "2024-01-15T10:30:00Z")
 * @returns {string} 포맷된 날짜 문자열 (예: "2024. 01. 15.") 또는 빈 문자열 (입력이 없거나 파싱 실패 시)
 *
 * @example
 * formatDate("2024-01-15T10:30:00Z"); // "2024. 01. 15."
 * formatDate(null); // ""
 * formatDate("invalid"); // ""
 */
export function formatDate(dateString) {
    if (!dateString) {
        return '';
    }

    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        // 월은 0부터 시작하므로 +1 필요
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}. ${month}. ${day}.`;
    } catch (error) {
        console.error('날짜 포맷팅 실패:', error);
        return '';
    }
}
