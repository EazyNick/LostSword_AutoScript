/**
 * 페이지 라우터 클래스
 * 페이지 전환 및 네비게이션을 관리합니다.
 * ES6 모듈 방식으로 작성됨
 */

import { getDashboardManagerInstance } from './dashboard.js';
import { getSettingsManagerInstance } from './settings.js';
import { getHistoryManagerInstance } from './history.js';

/**
 * 로거 유틸리티 가져오기
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * PageRouter 클래스
 * 페이지 전환 및 네비게이션을 관리합니다.
 */
export class PageRouter {
    constructor() {
        this.currentPage = 'dashboard'; // 기본 페이지는 대시보드
        // 초기화는 DOM 로드 후에 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.init(), 0);
            });
        } else {
            setTimeout(() => this.init(), 0);
        }
    }

    /**
     * 초기화
     */
    init() {
        const logger = getLogger();
        logger.log('[PageRouter] 페이지 라우터 초기화');

        this.setupNavigation();
        this.showPage(this.currentPage);
    }

    /**
     * 네비게이션 메뉴 설정
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });
    }

    /**
     * 페이지 표시
     */
    showPage(pageName) {
        const logger = getLogger();
        logger.log('[PageRouter] 페이지 전환:', pageName);

        // 모든 페이지 숨기기
        const allPages = document.querySelectorAll('.page-content');
        allPages.forEach((page) => {
            page.style.display = 'none';
        });

        // 선택된 페이지 표시
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            // workflow-area는 flex 사용, 나머지는 block
            if (targetPage.classList.contains('workflow-area')) {
                targetPage.style.display = 'flex';
            } else {
                targetPage.style.display = 'block';
            }
            this.currentPage = pageName;
        } else {
            logger.warn('[PageRouter] 페이지를 찾을 수 없습니다:', pageName);
        }

        // 네비게이션 활성화 상태 업데이트
        this.updateNavActiveState(pageName);

        // 헤더 제목 및 설명 업데이트
        this.updateHeader(pageName);

        // 사이드바 스크립트 섹션 표시/숨김 (에디터에서만 표시)
        const scriptsSection = document.getElementById('sidebar-scripts-section');
        if (scriptsSection) {
            scriptsSection.style.display = pageName === 'editor' ? 'block' : 'none';
        }

        // 페이지별 초기화
        if (pageName === 'dashboard') {
            this.initDashboard();
        } else if (pageName === 'editor') {
            this.initEditor();
        } else if (pageName === 'history') {
            this.initHistory();
        } else if (pageName === 'settings') {
            this.initSettings();
        }
    }

    /**
     * 헤더 제목 및 설명 업데이트
     */
    updateHeader(pageName) {
        const titleEl = document.querySelector('.script-title');
        const descEl = document.querySelector('.script-description');

        if (!titleEl || !descEl) {
            return;
        }

        switch (pageName) {
            case 'dashboard':
                titleEl.textContent = '대시보드';
                descEl.textContent = '워크플로우 현황을 확인하세요';
                break;
            case 'editor':
                // 현재 선택된 스크립트 정보 표시
                if (window.sidebarManager) {
                    const currentScript = window.sidebarManager.getCurrentScript();
                    if (currentScript) {
                        titleEl.textContent = currentScript.name || '스크립트';
                        descEl.textContent = currentScript.description || '워크플로우를 편집하세요';
                    } else {
                        titleEl.textContent = '스크립트';
                        descEl.textContent = '워크플로우를 편집하세요';
                    }
                } else {
                    titleEl.textContent = '스크립트';
                    descEl.textContent = '워크플로우를 편집하세요';
                }
                break;
            case 'history':
                titleEl.textContent = '실행 기록';
                descEl.textContent = '과거 실행 내역 및 노드 실행 로그를 확인하세요';
                break;
            case 'settings':
                titleEl.textContent = '설정';
                descEl.textContent = '애플리케이션 설정을 관리하세요';
                break;
            default:
                titleEl.textContent = '자동화 도구';
                descEl.textContent = '';
        }
    }

    /**
     * 네비게이션 활성화 상태 업데이트
     */
    updateNavActiveState(activePage) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item) => {
            if (item.dataset.page === activePage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 대시보드 초기화
     */
    async initDashboard() {
        const dashboardManager = getDashboardManagerInstance();
        await dashboardManager.init();
    }

    /**
     * 스크립트 페이지 초기화
     */
    async initEditor() {
        const logger = getLogger();
        logger.log('[PageRouter] 스크립트 페이지 초기화');

        // 서버에서 최신 스크립트 목록 다시 조회 (비활성화 상태 반영을 위해)
        const sidebarManager = window.sidebarManager;
        if (sidebarManager && typeof sidebarManager.loadScriptsFromServer === 'function') {
            logger.log('[PageRouter] 서버에서 최신 스크립트 목록 조회 중...');
            await sidebarManager.loadScriptsFromServer();
            logger.log('[PageRouter] 최신 스크립트 목록 조회 완료');
        }

        // 헤더 업데이트 (현재 스크립트 정보 반영)
        this.updateHeader('editor');

        // 워크플로우 페이지가 있으면 현재 스크립트 로드
        if (window.workflowPage && window.workflowPage.loadService) {
            if (sidebarManager) {
                const currentScript = sidebarManager.getCurrentScript();
                if (currentScript) {
                    window.workflowPage.loadService.load(currentScript);
                }
            }
        }
    }

    /**
     * 실행 기록 초기화
     */
    async initHistory() {
        const logger = getLogger();
        logger.log('[PageRouter] 실행 기록 페이지 초기화');

        // 실행 기록 페이지에 로그 기능 통합
        const historyManager = getHistoryManagerInstance();
        await historyManager.init();
    }

    /**
     * 설정 페이지 초기화
     */
    async initSettings() {
        const settingsManager = getSettingsManagerInstance();
        await settingsManager.init();
    }
}

/**
 * PageRouter 인스턴스 가져오기
 */
let pageRouterInstance = null;

export function getPageRouterInstance() {
    if (!pageRouterInstance) {
        pageRouterInstance = new PageRouter();
        window.pageRouter = pageRouterInstance; // 전역 접근을 위해 window에 노출
    }
    return pageRouterInstance;
}

/**
 * 자동 초기화: 페이지 로드 시 자동으로 PageRouter 인스턴스 생성
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        getPageRouterInstance();
    });
} else {
    // DOM이 이미 로드된 경우 즉시 초기화
    getPageRouterInstance();
}
