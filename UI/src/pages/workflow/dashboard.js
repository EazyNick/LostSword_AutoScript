/**
 * 대시보드 페이지 관리 클래스
 * ES6 모듈 방식으로 작성됨
 */

import { ScriptAPI } from '../../js/api/scriptapi.js';

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
 * DashboardManager 클래스
 * 대시보드 페이지의 데이터 로드 및 UI 업데이트를 담당합니다.
 */
export class DashboardManager {
    constructor() {
        this.scripts = [];
        this.executionStats = {
            totalScripts: 0,
            todayExecutions: 0,
            successRate: 0,
            failedTests: 0
        };
    }

    /**
     * 대시보드 초기화
     */
    async init() {
        const logger = getLogger();
        logger.log('[Dashboard] 대시보드 초기화 시작');

        await this.loadDashboardData();
        this.renderDashboard();
    }

    /**
     * 대시보드 데이터 로드
     */
    async loadDashboardData() {
        const logger = getLogger();
        logger.log('[Dashboard] 대시보드 데이터 로드 시작');

        try {
            // 스크립트 목록 로드
            if (ScriptAPI && typeof ScriptAPI.getAllScripts === 'function') {
                this.scripts = await ScriptAPI.getAllScripts();
                logger.log('[Dashboard] 스크립트 목록 로드 완료:', this.scripts.length);
            } else {
                logger.warn('[Dashboard] ScriptAPI를 사용할 수 없습니다.');
                this.scripts = [];
            }

            // 통계 데이터 계산 (실제로는 서버에서 가져와야 함)
            this.calculateStats();
        } catch (error) {
            logger.error('[Dashboard] 데이터 로드 실패:', error);
            this.scripts = [];
            this.calculateStats();
        }
    }

    /**
     * 통계 데이터 계산
     */
    calculateStats() {
        this.executionStats.totalScripts = this.scripts.length;
        // TODO: 실제 실행 기록 데이터를 서버에서 가져와서 계산
        this.executionStats.todayExecutions = 0; // 임시값
        this.executionStats.successRate = 0; // 임시값
        this.executionStats.failedTests = 0; // 임시값
    }

    /**
     * 대시보드 렌더링
     */
    renderDashboard() {
        this.updateStats();
        this.renderScripts();
    }

    /**
     * 통계 카드 업데이트
     */
    updateStats() {
        const stats = this.executionStats;

        // 전체 스크립트 카드
        const totalScriptsCard = document.querySelector('.stat-card:nth-child(1)');
        if (totalScriptsCard) {
            const valueEl = totalScriptsCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.totalScripts;
            }
        }

        // 오늘 실행 횟수 카드
        const todayExecutionsCard = document.querySelector('.stat-card:nth-child(2)');
        if (todayExecutionsCard) {
            const valueEl = todayExecutionsCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.todayExecutions;
            }
            // 변화량 표시 (임시로 +12% 설정)
            const changeEl = todayExecutionsCard.querySelector('.stat-change');
            if (changeEl) {
                changeEl.innerHTML =
                    '<span class="change-icon">↑</span><span class="change-text">+12% 어제 대비</span>';
            }
        }

        // 성공률 카드
        const successRateCard = document.querySelector('.stat-card:nth-child(3)');
        if (successRateCard) {
            const valueEl = successRateCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = `${stats.successRate.toFixed(1)}%`;
            }
            // 변화량 표시 (임시로 +2.1% 설정)
            const changeEl = successRateCard.querySelector('.stat-change');
            if (changeEl) {
                changeEl.innerHTML =
                    '<span class="change-icon">↑</span><span class="change-text">~+2.1% 지난주 대비</span>';
            }
        }

        // 실패한 테스트 카드
        const failedTestsCard = document.querySelector('.stat-card:nth-child(4)');
        if (failedTestsCard) {
            const valueEl = failedTestsCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.failedTests;
            }
        }
    }

    /**
     * 스크립트 목록 렌더링
     */
    renderScripts() {
        const scriptsGrid = document.getElementById('dashboard-scripts-grid');
        if (!scriptsGrid) {
            return;
        }

        scriptsGrid.innerHTML = '';

        if (this.scripts.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = '스크립트가 없습니다. 새 워크플로우를 생성하세요.';
            scriptsGrid.appendChild(emptyMessage);
            return;
        }

        this.scripts.forEach((script) => {
            const scriptCard = this.createScriptCard(script);
            scriptsGrid.appendChild(scriptCard);
        });
    }

    /**
     * 스크립트 카드 생성
     */
    createScriptCard(script) {
        const card = document.createElement('div');
        card.className = 'script-card';

        // 상태에 따른 클래스 및 텍스트 결정
        const status = script.status || 'active';
        const statusText =
            {
                active: '활성',
                paused: '일시정지',
                draft: '초안'
            }[status] || '활성';

        // 마지막 실행 시간 포맷팅
        const lastRun = script.lastRun ? this.formatLastRun(script.lastRun) : null;

        // 성공률 표시
        const successRate = script.successRate !== undefined ? script.successRate : null;

        card.innerHTML = `
            <div class="script-card-header">
                <div class="script-card-icon">📄</div>
                <div class="script-card-content">
                    <h3 class="script-card-title">${this.escapeHtml(script.name)}</h3>
                    <p class="script-card-description">${this.escapeHtml(script.description || '')}</p>
                    <div class="script-card-meta">
                        <span class="script-card-status status-${status}">${statusText}</span>
                        ${lastRun ? `<span class="script-card-last-run">🕐 ${lastRun}</span>` : ''}
                        ${successRate !== null ? `<span class="script-card-success-rate">✓ ${successRate}%</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="script-card-footer">
                <div class="script-card-actions">
                    <button class="btn-edit" data-script-id="${script.id}">편집</button>
                    <button class="btn-run" data-script-id="${script.id}">
                        <span>▶</span>
                        <span>실행</span>
                    </button>
                </div>
            </div>
        `;

        // 편집 버튼 클릭 이벤트
        const editBtn = card.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.switchToEditor(script.id);
            });
        }

        // 실행 버튼 클릭 이벤트
        const runBtn = card.querySelector('.btn-run');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runScript(script.id);
            });
        }

        return card;
    }

    /**
     * 스크립트 페이지로 전환
     */
    switchToEditor(scriptId) {
        // 페이지 라우터로 전환
        if (window.pageRouter) {
            window.pageRouter.showPage('editor');
        } else {
            // 폴백: 네비게이션 메뉴 클릭
            const editorNav = document.querySelector('.nav-item[data-page="editor"]');
            if (editorNav) {
                editorNav.click();
            }
        }

        // 스크립트 선택
        if (window.sidebarManager) {
            const scripts = window.sidebarManager.getAllScripts();
            const scriptIndex = scripts.findIndex((s) => s.id === scriptId);
            if (scriptIndex >= 0) {
                setTimeout(() => {
                    window.sidebarManager.selectScript(scriptIndex);
                }, 100);
            }
        }
    }

    /**
     * 스크립트 실행
     */
    async runScript(scriptId) {
        const logger = getLogger();
        logger.log('[Dashboard] 스크립트 실행:', scriptId);

        // 스크립트 페이지로 전환 후 실행
        this.switchToEditor(scriptId);

        // 잠시 후 실행 (에디터 로드 대기)
        setTimeout(() => {
            if (window.workflowPage && window.workflowPage.executionService) {
                window.workflowPage.executionService.execute();
            }
        }, 500);
    }

    /**
     * 마지막 실행 시간 포맷팅
     */
    formatLastRun(timestamp) {
        if (!timestamp) {
            return null;
        }

        const now = new Date();
        const lastRun = new Date(timestamp);
        const diffMs = now - lastRun;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return '방금 전';
        } else if (diffMins < 60) {
            return `${diffMins}분 전`;
        } else if (diffHours < 24) {
            return `${diffHours}시간 전`;
        } else if (diffDays < 7) {
            return `${diffDays}일 전`;
        } else {
            return lastRun.toLocaleDateString('ko-KR');
        }
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        if (!text) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * DashboardManager 인스턴스 가져오기
 */
let dashboardManagerInstance = null;

export function getDashboardManagerInstance() {
    if (!dashboardManagerInstance) {
        dashboardManagerInstance = new DashboardManager();
    }
    return dashboardManagerInstance;
}
