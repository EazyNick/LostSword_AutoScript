/**
 * 대시보드 페이지 관리 클래스
 * ES6 모듈 방식으로 작성됨
 */

import { ScriptAPI } from '../../js/api/scriptapi.js';
import { apiCall } from '../../js/api/api.js';

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
            allExecutions: 0, // 전체 실행 시 실행된 스크립트 개수
            allFailed: 0, // 전체 실행 시 실패한 스크립트 개수
            inactiveScripts: 0
        };
        this.runningScriptId = null; // 현재 실행 중인 스크립트 ID
        this.setupExecutionEventListeners();
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
     * 스크립트 실행 이벤트 리스너 설정
     */
    setupExecutionEventListeners() {
        // 스크립트 실행 시작 이벤트
        document.addEventListener('scriptExecutionStarted', (event) => {
            const { scriptId } = event.detail;
            this.setScriptRunning(scriptId, true);
        });

        // 스크립트 실행 완료 이벤트
        document.addEventListener('scriptExecutionCompleted', (event) => {
            const { scriptId, status } = event.detail;
            this.setScriptRunning(scriptId, false);
            // 실행 완료 후 잠시 성공/실패 상태 표시
            if (status === 'success') {
                this.setScriptStatus(scriptId, 'success');
                setTimeout(() => this.setScriptStatus(scriptId, null), 2000);
            } else if (status === 'failed') {
                // 실패한 스크립트는 팝업이 뜰 때까지 빨간색으로 유지
                this.setScriptStatus(scriptId, 'failed');
                if (!this.failedScriptIds) {
                    this.failedScriptIds = new Set();
                }
                this.failedScriptIds.add(scriptId);
            }
        });

        // 전체 실행 완료 이벤트
        document.addEventListener('allScriptsExecutionCompleted', () => {
            // 모든 스크립트의 실행 중 상태 제거 (실패 상태는 유지)
            this.clearAllRunningStates();
        });

        // 실행 결과 모달 표시 이벤트 (팝업이 뜬 후 실패 상태 제거)
        // this 컨텍스트 보존을 위한 참조
        const self = this;
        document.addEventListener('executionResultModalShown', () => {
            // 실패한 스크립트들의 상태 제거
            if (self && typeof self.clearFailedStates === 'function') {
                self.clearFailedStates();
            }
        });
    }

    /**
     * 스크립트 실행 중 상태 설정
     */
    setScriptRunning(scriptId, isRunning) {
        const logger = getLogger();
        logger.log(`[Dashboard] 스크립트 실행 상태 변경: ${scriptId}, 실행 중: ${isRunning}`);

        this.runningScriptId = isRunning ? scriptId : null;

        // 스크립트 카드 찾기
        const card = document.querySelector(`.script-card[data-script-id="${scriptId}"]`);
        if (!card) {
            // data-script-id가 없으면 버튼의 data-script-id로 찾기
            const runBtn = document.querySelector(`.btn-run[data-script-id="${scriptId}"]`);
            if (runBtn) {
                const parentCard = runBtn.closest('.script-card');
                if (parentCard) {
                    this.updateScriptCardState(parentCard, isRunning);
                }
            }
        } else {
            this.updateScriptCardState(card, isRunning);
        }
    }

    /**
     * 스크립트 카드 상태 업데이트
     */
    updateScriptCardState(card, isRunning) {
        if (isRunning) {
            card.classList.add('executing');
            card.setAttribute('data-script-id', card.querySelector('.btn-run')?.dataset?.scriptId || '');
        } else {
            card.classList.remove('executing');
        }
    }

    /**
     * 스크립트 상태 설정 (성공/실패)
     */
    setScriptStatus(scriptId, status) {
        const logger = getLogger();
        logger.log(`[Dashboard] setScriptStatus 호출: scriptId=${scriptId}, status=${status}`);

        // 먼저 data-script-id로 카드 찾기
        let card = document.querySelector(`.script-card[data-script-id="${scriptId}"]`);

        // 없으면 버튼의 data-script-id로 찾기
        if (!card) {
            const runBtn = document.querySelector(`.btn-run[data-script-id="${scriptId}"]`);
            if (runBtn) {
                card = runBtn.closest('.script-card');
            }
        }

        // 여전히 없으면 모든 스크립트 카드를 순회하며 찾기
        if (!card) {
            const allCards = document.querySelectorAll('.script-card');
            for (const c of allCards) {
                const btn = c.querySelector(`.btn-run[data-script-id="${scriptId}"]`);
                if (btn) {
                    card = c;
                    // data-script-id 속성도 설정
                    card.setAttribute('data-script-id', scriptId);
                    break;
                }
            }
        }

        if (card) {
            logger.log(`[Dashboard] 스크립트 카드 찾음: ${scriptId}`);
            this.updateScriptCardStatus(card, status);
        } else {
            logger.warn(`[Dashboard] 스크립트 카드를 찾을 수 없음: ${scriptId}`);
        }
    }

    /**
     * 스크립트 카드 상태 업데이트 (성공/실패)
     */
    updateScriptCardStatus(card, status) {
        const logger = getLogger();
        logger.log(`[Dashboard] updateScriptCardStatus 호출: status=${status}`);

        // 기존 상태 클래스 제거
        card.classList.remove('execution-success', 'execution-failed');

        if (status === 'success') {
            card.classList.add('execution-success');
            logger.log('[Dashboard] execution-success 클래스 추가됨');
        } else if (status === 'failed') {
            card.classList.add('execution-failed');
            logger.log('[Dashboard] execution-failed 클래스 추가됨');
        } else if (status === null) {
            // 상태 제거
            logger.log('[Dashboard] 상태 클래스 제거됨');
        }
    }

    /**
     * 모든 실행 중 상태 제거 (실패 상태는 유지)
     */
    clearAllRunningStates() {
        const logger = getLogger();
        logger.log('[Dashboard] 모든 실행 중 상태 제거 (실패 상태는 유지)');

        const executingCards = document.querySelectorAll('.script-card.executing');
        executingCards.forEach((card) => {
            card.classList.remove('executing');
        });

        // 성공 상태만 제거 (실패 상태는 유지)
        const successCards = document.querySelectorAll('.script-card.execution-success');
        successCards.forEach((card) => {
            card.classList.remove('execution-success');
        });

        this.runningScriptId = null;
    }

    /**
     * 실패한 스크립트 상태 제거 (팝업 표시 후 호출)
     */
    clearFailedStates() {
        const logger = getLogger();
        logger.log('[Dashboard] 실패한 스크립트 상태 제거');

        // failedScriptIds가 없으면 초기화
        if (!this.failedScriptIds) {
            this.failedScriptIds = new Set();
            return;
        }

        // 실패한 스크립트 ID 목록을 순회하며 상태 제거
        if (this.failedScriptIds.size > 0) {
            this.failedScriptIds.forEach((scriptId) => {
                this.setScriptStatus(scriptId, null);
            });
        }

        // 실패한 스크립트 ID 목록 초기화
        this.failedScriptIds.clear();
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
                // 서버에서 이미 execution_order 기준으로 정렬되어 반환되므로 별도 정렬 불필요
                this.scripts = await ScriptAPI.getAllScripts();
                logger.log('[Dashboard] 스크립트 목록 로드 완료:', this.scripts.length);
            } else {
                logger.warn('[Dashboard] ScriptAPI를 사용할 수 없습니다.');
                this.scripts = [];
            }

            // 대시보드 통계 데이터 로드
            await this.loadDashboardStats();
        } catch (error) {
            logger.error('[Dashboard] 데이터 로드 실패:', error);
            this.scripts = [];
            this.calculateStats();
        }
    }

    /**
     * 대시보드 통계 데이터 로드
     */
    async loadDashboardStats() {
        const logger = getLogger();
        logger.log('[Dashboard] 대시보드 통계 데이터 로드 시작');

        try {
            const apiHost = window.API_HOST || 'localhost';
            const apiPort = window.API_PORT || 8001;
            // 실행 기록 저장 후에는 캐시를 사용하지 않고 최신 데이터 조회
            const response = await fetch(`http://${apiHost}:${apiPort}/api/dashboard/stats?use_cache=false`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            logger.log('[Dashboard] 대시보드 통계 데이터 로드 완료:', result);

            // 변경된 응답 형식: {success: true, message: "...", data: {...}}
            const stats = result.data || result; // 하위 호환성 유지

            // 통계 데이터 설정
            this.executionStats = {
                totalScripts: stats.total_scripts || 0,
                allExecutions: stats.all_executions || 0, // 전체 실행 시 실행된 스크립트 개수
                allFailed: stats.all_failed_scripts || 0, // 전체 실행 시 실패한 스크립트 개수
                inactiveScripts: stats.inactive_scripts || 0
            };
        } catch (error) {
            logger.error('[Dashboard] 대시보드 통계 데이터 로드 실패:', error);
            // 실패 시 로컬 계산
            this.calculateStats();
        }
    }

    /**
     * 통계 데이터 계산
     */
    calculateStats() {
        this.executionStats.totalScripts = this.scripts.length;
        // 전체 실행 통계는 서버에서 관리하므로 로컬 계산 불필요
        this.executionStats.allExecutions = 0;
        this.executionStats.allFailed = 0;
        // 비활성 스크립트 개수 계산
        this.executionStats.inactiveScripts = this.scripts.filter((script) => !script.active).length;
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

        // 전체 실행 횟수 카드
        const allExecutionsCard = document.querySelector('.stat-card:nth-child(2)');
        if (allExecutionsCard) {
            const valueEl = allExecutionsCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.allExecutions;
            }
            // 변화량 표시 제거 (전체 실행 기준이므로 어제 대비 불필요)
            const changeEl = allExecutionsCard.querySelector('.stat-change');
            if (changeEl) {
                changeEl.innerHTML = '';
            }
        }

        // 전체 실행 실패한 스크립트 카드
        const allFailedCard = document.querySelector('.stat-card:nth-child(3)');
        if (allFailedCard) {
            const valueEl = allFailedCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.allFailed;
            }
        }

        // 비활성 스크립트 카드
        const inactiveScriptsCard = document.querySelector('.stat-card:nth-child(4)');
        if (inactiveScriptsCard) {
            const valueEl = inactiveScriptsCard.querySelector('.stat-value');
            if (valueEl) {
                valueEl.textContent = stats.inactiveScripts;
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
        card.setAttribute('data-script-id', script.id);

        // active 필드가 있으면 사용, 없으면 기본값 true
        const isActive = script.active !== undefined ? script.active : true;
        const status = isActive ? 'active' : 'inactive';
        const statusText = isActive ? '활성' : '비활성';

        // 마지막 실행 시간 포맷팅 (last_executed_at 필드 사용)
        const lastRun = script.last_executed_at ? this.formatLastRun(script.last_executed_at) : null;

        card.innerHTML = `
            <div class="script-card-header">
                <div class="script-card-icon">📄</div>
                <div class="script-card-content">
                    <h3 class="script-card-title">${this.escapeHtml(script.name)}</h3>
                    <p class="script-card-description">${this.escapeHtml(script.description || '')}</p>
                    <div class="script-card-meta">
                        <button class="btn-toggle-active ${status}" data-script-id="${script.id}" data-active="${isActive}">
                            ${statusText}
                        </button>
                        ${lastRun ? `<span class="script-card-last-run">🕐 ${lastRun}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="script-card-footer">
                <div class="script-card-actions">
                    <button class="btn-edit" data-script-id="${script.id}">편집</button>
                    <button class="btn-run" data-script-id="${script.id}">
                        <span class="btn-run-icon">▶</span>
                        <span class="btn-run-text">실행</span>
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

        // 활성/비활성 토글 버튼 클릭 이벤트
        const toggleBtn = card.querySelector('.btn-toggle-active');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', async () => {
                await this.toggleScriptActive(script.id, !isActive);
            });
        }

        return card;
    }

    /**
     * 스크립트 활성/비활성 상태 토글
     */
    async toggleScriptActive(scriptId, newActive) {
        const logger = getLogger();
        logger.log('[Dashboard] 스크립트 활성 상태 토글:', scriptId, newActive);

        try {
            if (ScriptAPI && typeof ScriptAPI.toggleScriptActive === 'function') {
                await ScriptAPI.toggleScriptActive(scriptId, newActive);

                // 로컬 스크립트 데이터 업데이트
                const script = this.scripts.find((s) => s.id === scriptId);
                if (script) {
                    script.active = newActive;
                }

                // 대시보드 다시 렌더링
                this.calculateStats();
                this.renderDashboard();
            } else {
                logger.warn('[Dashboard] ScriptAPI.toggleScriptActive를 사용할 수 없습니다.');
            }
        } catch (error) {
            logger.error('[Dashboard] 스크립트 활성 상태 토글 실패:', error);
            // 에러 메시지 표시 (선택사항)
        }
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

    /**
     * 스크립트 실행 기록 저장
     * @param {number} scriptId - 스크립트 ID
     * @param {Object} executionData - 실행 데이터 {status: string, error_message?: string, execution_time_ms?: number}
     * @returns {Promise<Object>} 저장 결과
     */
    async recordScriptExecution(scriptId, executionData) {
        const logger = getLogger();
        logger.log('[Dashboard] recordScriptExecution() 호출됨');
        logger.log('[Dashboard] 스크립트 ID:', scriptId);
        logger.log('[Dashboard] 실행 데이터:', executionData);

        try {
            const result = await apiCall(`/api/scripts/${scriptId}/execution-record`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(executionData)
            });

            logger.log('[Dashboard] ✅ 스크립트 실행 기록 저장 완료:', result);

            // 실행 기록 저장 후 대시보드 통계 즉시 업데이트
            await this.loadDashboardStats();
            this.updateStats();

            return result;
        } catch (error) {
            logger.error('[Dashboard] ❌ 스크립트 실행 기록 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 전체 실행 요약 정보 저장
     * @param {Object} summary - 실행 요약 정보 {total_executions: number, failed_count: number}
     * @returns {Promise<Object>} 저장 결과
     */
    async recordExecutionSummary(summary) {
        const logger = getLogger();
        logger.log('[Dashboard] recordExecutionSummary() 호출됨');
        logger.log('[Dashboard] 실행 요약 정보:', summary);

        try {
            const result = await apiCall('/api/dashboard/execution-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(summary)
            });

            logger.log('[Dashboard] ✅ 전체 실행 요약 정보 저장 완료:', result);

            // 실행 요약 저장 후 대시보드 통계 즉시 업데이트
            await this.loadDashboardStats();
            this.updateStats();

            return result;
        } catch (error) {
            logger.error('[Dashboard] ❌ 전체 실행 요약 정보 저장 실패:', error);
            throw error;
        }
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
