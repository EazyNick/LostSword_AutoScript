/**
 * ConnectionManager 유틸리티 함수들
 *
 * 이 모듈은 ConnectionManager에서 사용하는 공통 유틸리티 함수들을 제공합니다.
 * - 로거: 전역 Logger 인스턴스 또는 console을 사용하는 로거 팩토리
 * - 경로 생성: 두 점을 연결하는 부드러운 베지어 곡선 SVG path 생성
 *
 * @module connection-utils
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
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * 두 점 사이를 부드러운 베지어 곡선으로 잇는 SVG path 데이터 생성
 *
 * 3차 베지어 곡선(Cubic Bezier)을 사용하여 두 커넥터를 부드럽게 연결합니다.
 * 제어점은 시작점과 끝점에서 수평 방향으로 오프셋을 두어 자연스러운 곡선을 만듭니다.
 *
 * @param {number} x1 - 시작점 X 좌표 (출력 커넥터)
 * @param {number} y1 - 시작점 Y 좌표 (출력 커넥터)
 * @param {number} x2 - 끝점 X 좌표 (입력 커넥터)
 * @param {number} y2 - 끝점 Y 좌표 (입력 커넥터)
 * @returns {string} SVG path 데이터 (M 명령어로 시작하는 경로 문자열)
 *
 * @example
 * const path = createCurvedPath(100, 200, 300, 400);
 * // "M 100 200 C 150 200, 250 400, 300 400"
 */
export function createCurvedPath(x1, y1, x2, y2) {
    // 두 점 사이의 거리 계산
    const dx = x2 - x1;
    const dy = y2 - y1;

    // 제어점 오프셋: 거리의 50% 또는 최대 100px 중 작은 값
    // 너무 긴 연결선에서 과도한 곡선을 방지하기 위함
    const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100);

    // 첫 번째 제어점: 시작점에서 수평으로 오프셋만큼 이동
    const cp1x = x1 + controlPointOffset;
    const cp1y = y1;

    // 두 번째 제어점: 끝점에서 수평으로 오프셋만큼 이동
    const cp2x = x2 - controlPointOffset;
    const cp2y = y2;

    // SVG path 명령어: M(이동) → C(3차 베지어 곡선)
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}
