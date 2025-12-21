/**
 * 실행 결과 모달 유틸리티 클래스
 * 가운데 팝업 형태의 실행 결과 표시 모달
 * ES6 모듈 방식으로 작성됨
 */

import { t } from './i18n.js';

/**
 * ResultModalManager 클래스
 * 실행 결과 모달을 관리하는 유틸리티 클래스입니다.
 */
export class ResultModalManager {
    constructor() {
        this.resultModal = null;
    }

    /**
     * 실행 결과 모달 요소 가져오기 또는 생성
     * @returns {HTMLElement} 실행 결과 모달 요소
     */
    getResultModal() {
        if (!this.resultModal) {
            this.resultModal = document.getElementById('result-modal');
            if (!this.resultModal) {
                this.resultModal = document.createElement('div');
                this.resultModal.id = 'result-modal';
                this.resultModal.className = 'result-modal';
                this.resultModal.innerHTML = '<div class="result-modal-content"></div>';
                document.body.appendChild(this.resultModal);
            }
        }
        return this.resultModal;
    }

    /**
     * HTML 이스케이프 함수
     * @param {string} text - 이스케이프할 텍스트
     * @returns {string} 이스케이프된 HTML 문자열
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 노드 목록 HTML 생성
     * @param {Array} nodes - 노드 실행 결과 목록
     * @returns {string} 노드 목록 HTML 문자열
     */
    generateNodesListHtml(nodes) {
        if (!nodes || nodes.length === 0) {
            return '';
        }

        const nodeItems = nodes
            .map((node) => {
                const nodeName = this.escapeHtml(node.name || node.title || node.id || t('common.unknownNode'));
                const status = node.status || (node.error ? 'failed' : 'success');
                const statusText =
                    status === 'success'
                        ? t('common.successLabel')
                        : status === 'failed'
                          ? t('common.failedLabel')
                          : t('common.cancelledLabel');
                const statusClass = status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'cancelled';
                const message =
                    node.error ||
                    node.message ||
                    (status === 'success' ? t('common.executionCompletedSuccessfully') : '');

                return `
                <div class="result-node-item">
                    <div class="result-node-header">
                        <span class="result-node-name">${nodeName}</span>
                        <span class="result-node-status ${statusClass}">${statusText}</span>
                    </div>
                    ${message ? `<div class="result-node-message ${status === 'failed' ? 'error' : ''}">${this.escapeHtml(message)}</div>` : ''}
                </div>
            `;
            })
            .join('');

        return `
            <div class="result-nodes-list">
                <div class="result-nodes-title">노드 실행 결과</div>
                ${nodeItems}
            </div>
        `;
    }

    /**
     * 스크립트 목록 HTML 생성
     * @param {Array} scripts - 스크립트 실행 결과 목록
     * @returns {string} 스크립트 목록 HTML 문자열
     */
    generateScriptsListHtml(scripts) {
        if (!scripts || scripts.length === 0) {
            return '';
        }

        const scriptItems = scripts
            .map((script) => {
                const scriptName = this.escapeHtml(
                    script.name || script.title || script.id || t('common.unknownScript')
                );
                const status = script.status || (script.error ? 'failed' : 'success');
                const statusText =
                    status === 'success'
                        ? t('common.successLabel')
                        : status === 'failed'
                          ? t('common.failedLabel')
                          : t('common.cancelledLabel');
                const statusClass = status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'cancelled';
                const message =
                    script.error ||
                    script.message ||
                    (status === 'success' ? t('common.executionCompletedSuccessfully') : '');

                return `
                <div class="result-node-item">
                    <div class="result-node-header">
                        <span class="result-node-name">${scriptName}</span>
                        <span class="result-node-status ${statusClass}">${statusText}</span>
                    </div>
                    ${message ? `<div class="result-node-message ${status === 'failed' ? 'error' : ''}">${this.escapeHtml(message)}</div>` : ''}
                </div>
            `;
            })
            .join('');

        return `
            <div class="result-nodes-list">
                <div class="result-nodes-title">${this.escapeHtml(t('common.scriptExecutionResults'))}</div>
                ${scriptItems}
            </div>
        `;
    }

    /**
     * 실행 결과 모달 표시 (가운데 팝업)
     * @param {string} title - 모달 제목
     * @param {Object} resultData - 실행 결과 데이터
     * @param {number} resultData.successCount - 성공 개수 (노드 또는 스크립트)
     * @param {number} resultData.failCount - 실패 개수 (노드 또는 스크립트)
     * @param {number} resultData.cancelledCount - 중단 개수 (노드 또는 스크립트)
     * @param {Array} resultData.nodes - 노드 실행 결과 목록 (선택적)
     * @param {Array} resultData.scripts - 스크립트 실행 결과 목록 (선택적)
     * @param {string} resultData.summaryLabel - 요약 라벨 (예: "노드" 또는 "스크립트", 기본값: "노드")
     * @param {Function} onOk - 확인 버튼 클릭 시 실행할 함수 (선택적)
     */
    showExecutionResult(title, resultData, onOk = null) {
        const {
            successCount = 0,
            failCount = 0,
            cancelledCount = 0,
            nodes = [],
            scripts = [],
            summaryLabel = '노드'
        } = resultData;

        // 노드 또는 스크립트 목록 HTML 생성
        let itemsListHtml = '';
        if (scripts && scripts.length > 0) {
            itemsListHtml = this.generateScriptsListHtml(scripts);
        } else if (nodes && nodes.length > 0) {
            itemsListHtml = this.generateNodesListHtml(nodes);
        }

        // 번역된 텍스트 준비
        let executionSummary = t('common.executionSummary');
        let successLabel = t('common.successLabel');
        let failedLabel = t('common.failedLabel');
        let cancelledLabel = t('common.cancelledLabel');
        let unitText = t('common.unit');
        let okText = t('common.ok');

        // 번역 키가 그대로 반환된 경우 기본값 사용
        if (executionSummary === 'common.executionSummary') {
            executionSummary = '실행 요약';
        }
        if (successLabel === 'common.successLabel') {
            successLabel = '성공';
        }
        if (failedLabel === 'common.failedLabel') {
            failedLabel = '실패';
        }
        if (cancelledLabel === 'common.cancelledLabel') {
            cancelledLabel = '중단';
        }
        if (unitText === 'common.unit') {
            unitText = '';
        }
        if (okText === 'common.ok') {
            okText = '확인';
        }

        // summaryLabel 처리 (이미 번역된 텍스트일 수도 있고, 번역 키일 수도 있음)
        let translatedSummaryLabel = summaryLabel;
        // 번역 키로 보이는 경우 번역 시도
        if (summaryLabel && (summaryLabel.startsWith('common.') || summaryLabel.startsWith('sidebar.'))) {
            const translated = t(summaryLabel);
            translatedSummaryLabel = translated !== summaryLabel ? translated : summaryLabel;
        } else if (summaryLabel === '노드' || summaryLabel === 'Nodes') {
            translatedSummaryLabel = t('common.nodes');
            if (translatedSummaryLabel === 'common.nodes') {
                translatedSummaryLabel = '노드';
            }
        } else if (summaryLabel === '스크립트' || summaryLabel === 'Scripts') {
            translatedSummaryLabel = t('sidebar.scripts');
            if (translatedSummaryLabel === 'sidebar.scripts') {
                translatedSummaryLabel = '스크립트';
            }
        }

        // 사용자 친화적인 메시지 형식으로 변환
        const formatValue = (count, unit) => {
            if (unit && unit.trim() !== '' && unit !== 'common.unit') {
                return `${count}${unit}`;
            }
            return count.toString();
        };

        // 실행 결과 모달 HTML 생성
        const content = `
            <div class="result-modal-header">
                <h2 class="result-modal-title">${this.escapeHtml(title)}</h2>
                <span class="result-modal-close">&times;</span>
            </div>
            <div class="result-modal-body">
                <div class="result-summary">
                    <div class="result-summary-title">${this.escapeHtml(executionSummary)}</div>
                    <div class="result-summary-item">
                        <span class="result-summary-label">${this.escapeHtml(successLabel)} ${this.escapeHtml(translatedSummaryLabel)}</span>
                        <span class="result-summary-value">${formatValue(successCount, unitText)}</span>
                    </div>
                    <div class="result-summary-item">
                        <span class="result-summary-label">${this.escapeHtml(failedLabel)} ${this.escapeHtml(translatedSummaryLabel)}</span>
                        <span class="result-summary-value">${formatValue(failCount, unitText)}</span>
                    </div>
                    <div class="result-summary-item">
                        <span class="result-summary-label">${this.escapeHtml(cancelledLabel)} ${this.escapeHtml(translatedSummaryLabel)}</span>
                        <span class="result-summary-value">${formatValue(cancelledCount, unitText)}</span>
                    </div>
                </div>
                ${itemsListHtml}
            </div>
            <div class="result-modal-footer">
                <button id="result-ok-btn" class="btn btn-primary">${this.escapeHtml(okText)}</button>
            </div>
        `;

        // 실행 결과 모달 요소 가져오기
        const resultModal = this.getResultModal();
        const resultModalContent = resultModal.querySelector('.result-modal-content');
        resultModalContent.innerHTML = content;

        // 이벤트 리스너 설정
        const closeBtn = resultModalContent.querySelector('.result-modal-close');
        const okBtn = resultModalContent.querySelector('#result-ok-btn');

        // 모달이 실제로 표시되었는지 추적하는 플래그
        let modalWasShown = false;

        const closeModal = () => {
            resultModal.classList.remove('show');
            resultModal.classList.add('hide');

            // 모달이 실제로 표시된 후에만 닫힐 때 이벤트 dispatch (대시보드에서 실패 상태 제거를 위해)
            if (modalWasShown) {
                document.dispatchEvent(
                    new CustomEvent('executionResultModalShown', {
                        detail: { title, resultData }
                    })
                );
            }

            setTimeout(() => {
                resultModal.style.display = 'none';
                resultModal.classList.remove('hide');
                modalWasShown = false; // 플래그 리셋
                if (onOk) {
                    onOk();
                }
            }, 200);
        };

        closeBtn.addEventListener('click', closeModal);
        okBtn.addEventListener('click', closeModal);

        // 배경 클릭으로 닫기
        resultModal.addEventListener('click', (e) => {
            if (e.target === resultModal) {
                closeModal();
            }
        });

        // 모달 표시
        resultModal.style.display = 'block';
        // 모달이 화면에 표시되도록 약간의 지연 후 애니메이션 클래스 추가
        setTimeout(() => {
            resultModal.classList.add('show');

            // 모달이 실제로 표시된 후 플래그 설정
            requestAnimationFrame(() => {
                modalWasShown = true;
                // 모달이 표시되었을 때는 이벤트를 dispatch하지 않음
                // (사용자가 확인 버튼을 누를 때까지 실패 상태를 유지하기 위해)
            });
        }, 10);

        // ESC 키로 닫기
        const escHandler = (e) => {
            if (e.key === 'Escape' && resultModal.classList.contains('show')) {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 사이드바 너비를 CSS 변수로 설정 (중앙 정렬 계산용)
        this.updateModalPosition();
    }

    /**
     * 사이드바 너비를 CSS 변수로 설정 (중앙 정렬 계산용)
     */
    updateModalPosition() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 350; // 기본값 350px

        // CSS 변수로 사이드바 너비 설정
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }

    /**
     * 실행 결과 모달 닫기
     */
    close() {
        const resultModal = this.getResultModal();
        if (resultModal) {
            resultModal.classList.remove('show');
            resultModal.classList.add('hide');
            setTimeout(() => {
                resultModal.style.display = 'none';
                resultModal.classList.remove('hide');
            }, 200);
        }
    }

    /**
     * 실행 결과 모달이 열려있는지 확인
     * @returns {boolean} 모달이 열려있으면 true
     */
    isOpen() {
        const resultModal = this.getResultModal();
        return resultModal && resultModal.classList.contains('show');
    }
}

/**
 * ResultModalManager 인스턴스 생성 및 export
 * 싱글톤 패턴으로 하나의 인스턴스만 사용
 */
let resultModalManagerInstance = null;

/**
 * ResultModalManager 인스턴스 가져오기
 * ES6 모듈에서 명시적으로 인스턴스를 가져올 수 있도록 제공
 *
 * @returns {ResultModalManager} ResultModalManager 인스턴스
 */
export function getResultModalManagerInstance() {
    if (!resultModalManagerInstance) {
        resultModalManagerInstance = new ResultModalManager();
    }
    return resultModalManagerInstance;
}

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
if (typeof window !== 'undefined') {
    window.resultModalManager = getResultModalManagerInstance();
}
