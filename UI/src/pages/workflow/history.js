/**
 * 실행 기록 페이지 관리 클래스
 * ES6 모듈 방식으로 작성됨
 */

import { LogService } from '../../logs/services/log-service.js';
import { ScriptAPI } from '../../js/api/scriptapi.js';
import { LogAPI } from '../../js/api/logapi.js';
import { getModalManagerInstance } from '../../js/utils/modal.js';
import { t } from '../../js/utils/i18n.js';

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
 * HistoryManager 클래스
 * 실행 기록 페이지의 데이터 로드 및 UI 업데이트를 담당합니다.
 */
export class HistoryManager {
    constructor() {
        this.logService = new LogService();
        // this.logs는 this.logService.logs를 참조하도록 설정 (통계 계산을 위해)
        this.scripts = [];
        this.currentFilters = {
            script_id: null,
            status: 'all',
            limit: 100
        };
        this.modalManager = getModalManagerInstance();
    }

    /**
     * 로그 배열 getter (LogService의 logs를 반환)
     */
    get logs() {
        return this.logService.logs;
    }

    /**
     * 로그 배열 setter (LogService의 logs를 설정)
     */
    set logs(value) {
        this.logService.logs = value;
    }

    /**
     * 실행 기록 페이지 초기화
     */
    async init() {
        const logger = getLogger();
        logger.log('[HistoryManager] 실행 기록 페이지 초기화 시작');

        // 언어 설정 확인 및 적용
        try {
            const { getLanguage, setLanguage } = await import('../../js/utils/i18n.js');
            const { UserSettingsAPI } = await import('../../js/api/user-settings-api.js');

            // 서버에서 언어 설정 로드
            const savedLanguage = await UserSettingsAPI.getSetting('language');
            const currentLanguage = getLanguage();
            const language = savedLanguage || 'ko';

            // 언어가 다르면 적용 (초기 로드 시에는 silent=true로 설정)
            if (currentLanguage !== language) {
                await setLanguage(language, true);
                logger.log(`[HistoryManager] 언어 설정 적용: ${language}`);
            }
        } catch (error) {
            logger.warn('[HistoryManager] 언어 설정 로드 실패:', error);
        }

        // HTML의 하드코딩된 텍스트 업데이트
        this.updateStaticTexts();

        await this.loadScripts();
        await this.loadLogs();
        this.renderLogs();
        this.setupEventListeners();
    }

    /**
     * HTML의 정적 텍스트 업데이트
     */
    updateStaticTexts() {
        // 페이지 제목 및 부제목
        const pageTitle = document.querySelector('#page-history .page-title');
        if (pageTitle) {
            pageTitle.textContent = t('header.history');
        }
        const pageSubtitle = document.querySelector('#page-history .page-subtitle');
        if (pageSubtitle) {
            pageSubtitle.textContent = t('header.historySubtitle');
        }

        // 필터 레이블
        const scriptLabel = document.querySelector('label[for="history-filter-script"]');
        if (scriptLabel) {
            scriptLabel.textContent = t('history.script');
        }
        const statusLabel = document.querySelector('label[for="history-filter-status"]');
        if (statusLabel) {
            statusLabel.textContent = t('history.status');
        }

        // 상태 필터 옵션
        const statusFilter = document.getElementById('history-filter-status');
        if (statusFilter) {
            const options = statusFilter.querySelectorAll('option');
            if (options.length >= 4) {
                options[0].textContent = t('history.all');
                options[1].textContent = t('history.statusCompleted');
                options[2].textContent = t('history.statusFailed');
                options[3].textContent = t('history.statusRunning');
            }
        }

        // 버튼 텍스트
        const refreshBtn = document.getElementById('history-refresh-btn');
        if (refreshBtn) {
            refreshBtn.textContent = `🔄 ${t('history.refresh')}`;
        }
        const deleteAllBtn = document.getElementById('history-delete-all-btn');
        if (deleteAllBtn) {
            deleteAllBtn.textContent = `🗑️ ${t('history.deleteAll')}`;
            deleteAllBtn.title = t('history.deleteAllLogs');
        }

        // 통계 카드 레이블
        const statLabels = document.querySelectorAll('.history-stat-label');
        if (statLabels.length >= 4) {
            statLabels[0].textContent = t('history.totalLogs');
            statLabels[1].textContent = t('history.statusCompleted');
            statLabels[2].textContent = t('history.statusFailed');
            statLabels[3].textContent = t('history.averageExecutionTime');
        }
    }

    /**
     * 스크립트 목록 로드
     */
    async loadScripts() {
        const logger = getLogger();
        logger.log('[HistoryManager] 스크립트 목록 로드 시작');

        try {
            if (ScriptAPI && typeof ScriptAPI.getAllScripts === 'function') {
                this.scripts = await ScriptAPI.getAllScripts();
                logger.log('[HistoryManager] 스크립트 목록 로드 완료:', this.scripts.length);
                this.renderScriptFilter();
            } else {
                logger.warn('[HistoryManager] ScriptAPI를 사용할 수 없습니다.');
                this.scripts = [];
            }
        } catch (error) {
            logger.error('[HistoryManager] 스크립트 목록 로드 실패:', error);
            this.scripts = [];
        }
    }

    /**
     * 로그 데이터 로드
     */
    async loadLogs() {
        const logger = getLogger();
        logger.log('[HistoryManager] 로그 데이터 로드 시작');

        try {
            const filters = {
                script_id: this.currentFilters.script_id,
                status: this.currentFilters.status,
                limit: this.currentFilters.limit
            };

            await this.logService.loadLogs(filters);
            // logService.loadLogs()가 이미 this.logService.logs에 저장하므로 별도 할당 불필요
            logger.log('[HistoryManager] 로그 데이터 로드 완료:', this.logs.length);
        } catch (error) {
            logger.error('[HistoryManager] 로그 데이터 로드 실패:', error);
            this.logService.logs = [];
        }
    }

    /**
     * 로그 목록 렌더링
     */
    renderLogs() {
        const historyList = document.getElementById('history-list');
        if (!historyList) {
            return;
        }

        historyList.innerHTML = '';

        if (this.logs.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'history-empty-message';
            emptyMessage.textContent = t('history.noLogs');
            historyList.appendChild(emptyMessage);
            return;
        }

        // 통계 정보 계산
        const stats = this.logService.calculateStats();

        // 통계 카드 업데이트
        this.updateStats(stats);

        // 로그 그룹화 (실행 ID별)
        const groupedLogs = this.logService.groupLogsByExecutionId();

        // 각 실행 그룹별로 렌더링
        Object.entries(groupedLogs).forEach(([executionId, logs]) => {
            const executionGroup = this.createExecutionGroup(executionId, logs);
            historyList.appendChild(executionGroup);
        });
    }

    /**
     * 실행 그룹 생성
     */
    createExecutionGroup(executionId, logs) {
        const group = document.createElement('div');
        group.className = 'history-execution-group';

        // 그룹 헤더
        const header = document.createElement('div');
        header.className = 'history-execution-header';
        header.style.cursor = 'pointer';

        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];
        const startTime = firstLog.started_at ? this.formatDateTime(firstLog.started_at) : t('history.unknown');
        const endTime = lastLog.finished_at ? this.formatDateTime(lastLog.finished_at) : t('history.inProgress');

        const successCount = logs.filter((l) => l.status === 'completed').length;
        const failedCount = logs.filter((l) => l.status === 'failed').length;
        const totalTime = logs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0);

        // 실행 ID 파싱 (YYYYMMDD-HHMMSS-{랜덤} 형식)
        const executionIdParts = executionId.split('-');
        let displayId = executionId;
        if (executionIdParts.length >= 3) {
            // 날짜와 시간을 읽기 쉬운 형식으로 변환
            const datePart = executionIdParts[0]; // YYYYMMDD
            const timePart = executionIdParts[1]; // HHMMSS
            const randomPart = executionIdParts[2]; // 랜덤문자열

            // 날짜 포맷팅: YYYYMMDD -> YYYY-MM-DD
            const formattedDate = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
            // 시간 포맷팅: HHMMSS -> HH:MM:SS
            const formattedTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

            displayId = `${formattedDate} ${formattedTime} (${randomPart})`;
        }

        header.innerHTML = `
            <div class="history-execution-info">
                <div class="history-execution-id">${this.escapeHtml(displayId)}</div>
                <div class="history-execution-meta">
                    <span>${t('history.start')} ${startTime}</span>
                    <span>${t('history.end')} ${endTime}</span>
                    <span>${t('history.nodes')} ${logs.length}${t('history.nodesUnit')}</span>
                    <span>${t('history.success')} ${successCount}${t('history.successUnit')}</span>
                    <span>${t('history.failed')} ${failedCount}${t('history.failedUnit')}</span>
                    <span>${t('history.totalTime')} ${this.formatExecutionTime(totalTime)}</span>
                </div>
            </div>
            <div class="history-execution-actions">
                <button class="history-delete-execution-btn" data-execution-id="${executionId}" title="${t('history.deleteExecution')}">
                    🗑️
                </button>
                <div class="history-toggle-indicator">
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
        `;

        // 그룹 본문 (노드 로그 목록)
        const body = document.createElement('div');
        body.className = 'history-execution-body';
        body.style.display = 'none';

        logs.forEach((log) => {
            const logItem = this.createLogItem(log);
            body.appendChild(logItem);
        });

        // 헤더 전체 클릭 이벤트 (화살표 버튼 대신 헤더 전체 클릭 가능)
        const toggleIcon = header.querySelector('.toggle-icon');
        const deleteBtn = header.querySelector('.history-delete-execution-btn');

        // 삭제 버튼 클릭 이벤트 (이벤트 전파 중지)
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.deleteExecutionGroup(executionId, group);
        });

        // 헤더 클릭 이벤트 (삭제 버튼 제외)
        header.addEventListener('click', (e) => {
            // 삭제 버튼이나 그 자식 요소 클릭 시에는 토글하지 않음
            if (e.target.closest('.history-delete-execution-btn')) {
                return;
            }

            const isExpanded = body.style.display !== 'none';
            body.style.display = isExpanded ? 'none' : 'block';
            toggleIcon.textContent = isExpanded ? '▼' : '▲';
        });

        group.appendChild(header);
        group.appendChild(body);

        return group;
    }

    /**
     * 로그 아이템 생성
     */
    createLogItem(log) {
        const item = document.createElement('div');
        item.className = `history-item history-item-${log.status}`;

        const statusIcon = this.getStatusIcon(log.status);
        const statusText = this.getStatusText(log.status);
        const nodeName = log.node_name || log.node_id || t('history.unknown');
        const nodeType = log.node_type || 'unknown';
        const executionTime = log.execution_time_ms ? this.formatExecutionTime(log.execution_time_ms) : '-';
        const startTime = log.started_at ? this.formatDateTime(log.started_at) : '-';
        const endTime = log.finished_at ? this.formatDateTime(log.finished_at) : '-';

        item.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-status">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${statusText}</span>
                </div>
                <div class="history-item-meta">
                    <span class="history-item-node">${this.escapeHtml(nodeName)}</span>
                    <span class="history-item-type">${this.escapeHtml(nodeType)}</span>
                    <span class="history-item-time">${executionTime}</span>
                </div>
                <button class="history-delete-item-btn" data-log-id="${log.id}" title="${t('history.deleteLog')}">
                    🗑️
                </button>
            </div>
            <div class="history-item-details">
                <div class="history-item-timeline">
                    <div class="timeline-item">
                        <span class="timeline-label">시작:</span>
                        <span class="timeline-value">${startTime}</span>
                    </div>
                    ${
                        endTime !== '-'
                            ? `
                    <div class="timeline-item">
                        <span class="timeline-label">종료:</span>
                        <span class="timeline-value">${endTime}</span>
                    </div>
                    `
                            : ''
                    }
                </div>
                ${
                    log.parameters && Object.keys(log.parameters).length > 0
                        ? `
                <div class="history-item-parameters">
                    <div class="history-item-label">파라미터:</div>
                    <pre class="history-item-value">${this.escapeHtml(JSON.stringify(log.parameters, null, 2))}</pre>
                </div>
                `
                        : ''
                }
                ${
                    log.result && Object.keys(log.result).length > 0
                        ? `
                <div class="history-item-result">
                    <div class="history-item-label">결과:</div>
                    <pre class="history-item-value">${this.escapeHtml(JSON.stringify(log.result, null, 2))}</pre>
                </div>
                `
                        : ''
                }
                ${
                    log.error_message
                        ? `
                <div class="history-item-error">
                    <div class="history-item-label">에러:</div>
                    <div class="history-item-error-message">${this.escapeHtml(log.error_message)}</div>
                    ${
                        log.error_traceback
                            ? `
                    <details class="history-item-traceback">
                        <summary>스택 트레이스</summary>
                        <pre>${this.escapeHtml(log.error_traceback)}</pre>
                    </details>
                    `
                            : ''
                    }
                </div>
                `
                        : ''
                }
            </div>
        `;

        // 삭제 버튼 이벤트
        const deleteBtn = item.querySelector('.history-delete-item-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.deleteLogItem(log.id, item);
        });

        return item;
    }

    /**
     * 개별 로그 삭제
     */
    async deleteLogItem(logId, itemElement) {
        const logger = getLogger();

        this.modalManager.showCenterConfirm(
            t('history.deleteLog'),
            t('history.deleteLogConfirm'),
            async () => {
                try {
                    const result = await LogAPI.deleteNodeExecutionLog(logId);
                    logger.log(`[HistoryManager] 로그 삭제 성공 - 로그 ID: ${logId}`);
                    logger.log('[HistoryManager] 삭제 응답 데이터:', result);

                    // UI에서 제거
                    itemElement.remove();

                    // 로그 목록에서도 제거 (LogService의 logs를 직접 업데이트)
                    this.logService.logs = this.logService.logs.filter((log) => log.id !== logId);

                    // 서버에서 받은 통계로 업데이트
                    if (result && result.data && result.data.stats) {
                        const stats = {
                            total: result.data.stats.total || 0,
                            completed: result.data.stats.completed || 0,
                            failed: result.data.stats.failed || 0,
                            averageExecutionTime: result.data.stats.average_execution_time || 0
                        };
                        logger.log('[HistoryManager] 서버 통계로 업데이트:', stats);
                        this.updateStats(stats);
                    } else {
                        // 통계가 없으면 로컬 계산
                        logger.log('[HistoryManager] 서버 통계 없음, 로컬 계산 사용');
                        const stats = this.logService.calculateStats();
                        logger.log('[HistoryManager] 로컬 계산 통계:', stats);
                        this.updateStats(stats);
                    }

                    // 로그 목록이 비어있으면 메시지 표시
                    if (this.logs.length === 0) {
                        this.renderLogs();
                    }
                } catch (error) {
                    logger.error(`[HistoryManager] 로그 삭제 실패 - 로그 ID: ${logId}`, error);
                    this.modalManager.showCenterAlert(t('common.error'), t('history.deleteLogFailed'));
                }
            },
            () => {
                // 취소 시 아무 작업도 하지 않음
            }
        );
    }

    /**
     * 실행 그룹 삭제
     */
    async deleteExecutionGroup(executionId, groupElement) {
        const logger = getLogger();

        this.modalManager.showCenterConfirm(
            t('history.deleteExecution'),
            t('history.deleteExecutionConfirm'),
            async () => {
                try {
                    const result = await LogAPI.deleteNodeExecutionLogsByExecutionId(executionId);
                    logger.log(`[HistoryManager] 실행 그룹 삭제 성공 - execution_id: ${executionId}`);

                    // UI에서 제거
                    groupElement.remove();

                    // 로그 목록에서도 제거 (LogService의 logs를 직접 업데이트)
                    this.logService.logs = this.logService.logs.filter((log) => log.execution_id !== executionId);

                    // 서버에서 받은 통계로 업데이트
                    if (result && result.data && result.data.stats) {
                        const stats = {
                            total: result.data.stats.total || 0,
                            completed: result.data.stats.completed || 0,
                            failed: result.data.stats.failed || 0,
                            averageExecutionTime: result.data.stats.average_execution_time || 0
                        };
                        logger.log('[HistoryManager] 서버 통계로 업데이트:', stats);
                        this.updateStats(stats);
                    } else {
                        // 통계가 없으면 로컬 계산
                        logger.log('[HistoryManager] 서버 통계 없음, 로컬 계산 사용');
                        const stats = this.logService.calculateStats();
                        logger.log('[HistoryManager] 로컬 계산 통계:', stats);
                        this.updateStats(stats);
                    }

                    // 로그 목록이 비어있으면 메시지 표시
                    if (this.logs.length === 0) {
                        this.renderLogs();
                    }
                } catch (error) {
                    logger.error(`[HistoryManager] 실행 그룹 삭제 실패 - execution_id: ${executionId}`, error);
                    this.modalManager.showCenterAlert(t('common.error'), t('history.deleteExecutionFailed'));
                }
            },
            () => {
                // 취소 시 아무 작업도 하지 않음
            }
        );
    }

    /**
     * 전체 로그 삭제
     */
    async deleteAllLogs() {
        const logger = getLogger();

        this.modalManager.showCenterConfirm(
            t('history.deleteAllLogs'),
            t('history.deleteAllLogsConfirm'),
            async () => {
                try {
                    const result = await LogAPI.deleteAllNodeExecutionLogs();
                    logger.log('[HistoryManager] 전체 로그 삭제 성공');

                    // 로그 목록 초기화 (LogService의 logs를 직접 업데이트)
                    this.logService.logs = [];

                    // 서버에서 받은 통계로 업데이트
                    if (result.data && result.data.stats) {
                        const stats = {
                            total: result.data.stats.total || 0,
                            completed: result.data.stats.completed || 0,
                            failed: result.data.stats.failed || 0,
                            averageExecutionTime: result.data.stats.average_execution_time || 0
                        };
                        this.updateStats(stats);
                    } else {
                        // 통계가 없으면 0으로 설정
                        const stats = {
                            total: 0,
                            completed: 0,
                            failed: 0,
                            averageExecutionTime: 0
                        };
                        this.updateStats(stats);
                    }

                    // UI 업데이트 (renderLogs 내부에서 통계도 업데이트됨)
                    this.renderLogs();
                } catch (error) {
                    logger.error('[HistoryManager] 전체 로그 삭제 실패', error);
                    this.modalManager.showCenterAlert(t('common.error'), t('history.deleteAllLogsFailed'));
                }
            },
            () => {
                // 취소 시 아무 작업도 하지 않음
            }
        );
    }

    /**
     * 통계 카드 업데이트
     */
    updateStats(stats) {
        const logger = getLogger();
        logger.log('[HistoryManager] 통계 업데이트 시작:', stats);

        const totalEl = document.getElementById('history-stat-total');
        const completedEl = document.getElementById('history-stat-completed');
        const failedEl = document.getElementById('history-stat-failed');
        const avgTimeEl = document.getElementById('history-stat-avg-time');

        if (totalEl) {
            totalEl.textContent = stats.total || 0;
            logger.log(`[HistoryManager] 전체 로그 개수 업데이트: ${stats.total || 0}`);
        } else {
            logger.warn('[HistoryManager] history-stat-total 요소를 찾을 수 없습니다.');
        }
        if (completedEl) {
            completedEl.textContent = stats.completed || 0;
            logger.log(`[HistoryManager] 완료 로그 개수 업데이트: ${stats.completed || 0}`);
        } else {
            logger.warn('[HistoryManager] history-stat-completed 요소를 찾을 수 없습니다.');
        }
        if (failedEl) {
            failedEl.textContent = stats.failed || 0;
            logger.log(`[HistoryManager] 실패 로그 개수 업데이트: ${stats.failed || 0}`);
        } else {
            logger.warn('[HistoryManager] history-stat-failed 요소를 찾을 수 없습니다.');
        }
        if (avgTimeEl) {
            avgTimeEl.textContent = this.formatExecutionTime(stats.averageExecutionTime || 0);
            logger.log(`[HistoryManager] 평균 실행 시간 업데이트: ${stats.averageExecutionTime || 0}ms`);
        } else {
            logger.warn('[HistoryManager] history-stat-avg-time 요소를 찾을 수 없습니다.');
        }
    }

    /**
     * 스크립트 필터 렌더링
     */
    renderScriptFilter() {
        const filterSelect = document.getElementById('history-filter-script');
        if (!filterSelect) {
            return;
        }

        filterSelect.innerHTML = `<option value="">${t('history.allScripts')}</option>`;

        this.scripts.forEach((script) => {
            const option = document.createElement('option');
            option.value = script.id;
            option.textContent = script.name;
            if (this.currentFilters.script_id === script.id) {
                option.selected = true;
            }
            filterSelect.appendChild(option);
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 스크립트 필터 변경
        const scriptFilter = document.getElementById('history-filter-script');
        if (scriptFilter) {
            scriptFilter.addEventListener('change', async (e) => {
                this.currentFilters.script_id = e.target.value ? parseInt(e.target.value) : null;
                await this.loadLogs();
                this.renderLogs();
            });
        }

        // 상태 필터 변경
        const statusFilter = document.getElementById('history-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', async (e) => {
                this.currentFilters.status = e.target.value;
                await this.loadLogs();
                this.renderLogs();
            });
        }

        // 새로고침 버튼
        const refreshBtn = document.getElementById('history-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadLogs();
                this.renderLogs();
            });
        }

        // 전체 삭제 버튼
        const deleteAllBtn = document.getElementById('history-delete-all-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', async () => {
                await this.deleteAllLogs();
            });
        }

        // 워크플로우 실행 완료 시 로그 자동 새로고침
        // 중복 이벤트 방지를 위한 플래그
        let isRefreshing = false;
        let lastEventTime = 0;

        document.addEventListener('logsUpdated', async (e) => {
            const logger = getLogger();
            logger.log('[HistoryManager] 로그 업데이트 이벤트 수신:', e.detail);

            // 실행 기록 페이지가 현재 표시 중인지 확인
            const historyPage = document.getElementById('page-history');
            if (!historyPage || historyPage.style.display === 'none') {
                return;
            }

            // 중복 이벤트 방지 (같은 이벤트가 500ms 이내에 여러 번 발생하면 무시)
            const currentTime = Date.now();
            if (isRefreshing || currentTime - lastEventTime < 500) {
                logger.log('[HistoryManager] 중복 이벤트 무시');
                return;
            }

            isRefreshing = true;
            lastEventTime = currentTime;

            // 서버에서 로그 저장이 완료된 후 이벤트가 dispatch되므로 즉시 로그 조회
            // 실패 시에는 로그 저장이 더 오래 걸릴 수 있으므로 재시도 로직 추가
            const isFailed = e.detail?.type === 'workflowExecutionFailed';
            let retryCount = 0;
            const maxRetries = isFailed ? 3 : 1; // 실패 시 3번 재시도, 성공 시 1번
            const retryInterval = 500; // 500ms 간격

            while (retryCount < maxRetries) {
                try {
                    await this.loadLogs();
                    const currentLogCount = this.logs.length;

                    // 실패 시에는 failed 상태의 로그가 있는지 확인
                    if (isFailed && currentLogCount > 0) {
                        const hasFailedLog = this.logs.some((log) => log.status === 'failed');
                        if (hasFailedLog || retryCount === maxRetries - 1) {
                            // failed 로그가 있거나 마지막 재시도인 경우 렌더링
                            this.renderLogs();
                            logger.log(
                                `[HistoryManager] 로그 자동 새로고침 완료 (재시도: ${retryCount + 1}회, 로그 개수: ${currentLogCount}개)`
                            );
                            break;
                        } else {
                            // failed 로그가 없으면 재시도
                            retryCount++;
                            logger.log(
                                `[HistoryManager] 실패 로그가 아직 저장되지 않음, 재시도 ${retryCount}/${maxRetries} (500ms 후)`
                            );
                            await new Promise((resolve) => setTimeout(resolve, retryInterval));
                            continue;
                        }
                    } else {
                        // 성공 시 또는 로그가 없는 경우 즉시 렌더링
                        this.renderLogs();
                        logger.log(`[HistoryManager] 로그 자동 새로고침 완료 (로그 개수: ${currentLogCount}개)`);
                        break;
                    }
                } catch (error) {
                    logger.error(
                        `[HistoryManager] 로그 새로고침 실패 (재시도 ${retryCount + 1}/${maxRetries}):`,
                        error
                    );
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, retryInterval));
                    } else {
                        // 마지막 재시도 실패 시에도 렌더링 시도 (폴백)
                        try {
                            this.renderLogs();
                        } catch (renderError) {
                            logger.error('[HistoryManager] 렌더링 실패:', renderError);
                        }
                    }
                }
            }

            isRefreshing = false;
        });

        // 전체 스크립트 실행 완료 시 로그 자동 새로고침
        // (logsUpdated 이벤트로 이미 처리되므로 여기서는 제거)
        // allScriptsExecutionCompleted는 대시보드에서만 사용
    }

    /**
     * 상태 아이콘 가져오기
     */
    getStatusIcon(status) {
        switch (status) {
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'running':
                return '⏳';
            default:
                return '❓';
        }
    }

    /**
     * 상태 텍스트 가져오기
     */
    getStatusText(status) {
        switch (status) {
            case 'completed':
                return t('history.statusCompleted');
            case 'failed':
                return t('history.statusFailed');
            case 'running':
                return t('history.statusRunning');
            default:
                return t('history.statusUnknown');
        }
    }

    /**
     * 실행 시간 포맷팅
     */
    formatExecutionTime(ms) {
        if (!ms || ms === 0) {
            return `0${t('history.ms')}`;
        }
        if (ms < 1000) {
            return `${ms}${t('history.ms')}`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}${t('history.seconds')}`;
        }
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(2);
        return `${minutes}${t('history.minutes')} ${seconds}${t('history.seconds')}`;
    }

    /**
     * 날짜/시간 포맷팅
     */
    formatDateTime(dateString) {
        if (!dateString) {
            return '-';
        }
        try {
            const date = new Date(dateString);
            const lang = document.documentElement.lang || 'ko';
            const locale = lang === 'en' ? 'en-US' : 'ko-KR';
            return date.toLocaleString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * HistoryManager 인스턴스 가져오기
 */
let historyManagerInstance = null;

export function getHistoryManagerInstance() {
    if (!historyManagerInstance) {
        historyManagerInstance = new HistoryManager();
    }
    return historyManagerInstance;
}
