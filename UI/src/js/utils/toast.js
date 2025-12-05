/**
 * Toast 알림 유틸리티
 * ES6 모듈 방식으로 작성됨
 */

/**
 * ToastManager 클래스
 * 화면 상단에 표시되는 Toast 알림을 관리합니다.
 */
export class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    /**
     * Toast 컨테이너 초기화
     */
    init() {
        // Toast 컨테이너 생성
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;

        document.body.appendChild(this.container);
    }

    /**
     * Toast 알림 표시
     * @param {string} message - 표시할 메시지
     * @param {string} type - Toast 타입 ('success', 'error', 'info', 'warning')
     * @param {number} duration - 표시 시간 (밀리초, 기본값: 3000)
     */
    show(message, type = 'success', duration = 3000) {
        if (!this.container) {
            this.init();
        }

        // Toast 요소 생성
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background-color: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            font-weight: 500;
            min-width: 200px;
            text-align: center;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        toast.textContent = message;

        // 컨테이너에 추가
        this.container.appendChild(toast);

        // 애니메이션을 위해 약간의 지연 후 표시
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });
        });

        // 지정된 시간 후 자동 제거
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300); // 애니메이션 시간과 동일
        }, duration);
    }

    /**
     * Toast 타입에 따른 배경색 반환
     * @param {string} type - Toast 타입
     * @returns {string} 배경색
     */
    getBackgroundColor(type) {
        const colors = {
            success: '#10b981', // green-500
            error: '#ef4444', // red-500
            warning: '#f59e0b', // amber-500
            info: '#3b82f6' // blue-500
        };
        return colors[type] || colors.info;
    }

    /**
     * 성공 Toast 표시
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 시간 (밀리초)
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    /**
     * 에러 Toast 표시
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 시간 (밀리초)
     */
    error(message, duration = 3000) {
        this.show(message, 'error', duration);
    }

    /**
     * 정보 Toast 표시
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 시간 (밀리초)
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    /**
     * 경고 Toast 표시
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 시간 (밀리초)
     */
    warning(message, duration = 3000) {
        this.show(message, 'warning', duration);
    }
}

// 싱글톤 인스턴스
let toastManagerInstance = null;

/**
 * ToastManager 인스턴스 가져오기
 * @returns {ToastManager} ToastManager 인스턴스
 */
export function getToastManagerInstance() {
    if (!toastManagerInstance) {
        toastManagerInstance = new ToastManager();
    }
    return toastManagerInstance;
}
