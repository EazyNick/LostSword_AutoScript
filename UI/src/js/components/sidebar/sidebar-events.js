/**
 * SidebarManager 이벤트 처리
 * 이벤트 바인딩 및 처리를 담당
 */

import { getLogger } from './sidebar-utils.js';

/**
 * 이벤트 처리 클래스
 */
export class SidebarEventHandler {
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 스크립트 추가 버튼
        document.querySelector('.add-script-btn').addEventListener('click', () => {
            this.sidebarManager.showAddScriptModal();
        });

        // 사이드바 리사이즈 핸들 설정
        this.setupResizeHandle();

        // 저장된 사이드바 너비 로드
        this.sidebarManager.uiManager.loadSidebarWidth();

        // 초기 CSS 변수 설정
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const initialWidth = sidebar.offsetWidth || 350;
            document.documentElement.style.setProperty('--sidebar-width', `${initialWidth}px`);
        }

        // 모든 스크립트 실행 버튼은 workflow.js에서 등록하므로 여기서는 제거
        // (헤더의 버튼은 workflow.js에서, 사이드바의 버튼이 있다면 여기서 등록)
        // 현재는 헤더에만 버튼이 있으므로 여기서는 등록하지 않음
    }

    /**
     * 사이드바 리사이즈 핸들 설정
     */
    setupResizeHandle() {
        const sidebar = document.querySelector('.sidebar');
        const resizeHandle = document.getElementById('sidebar-resize-handle');

        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        if (!sidebar) {
            logError('[Sidebar] 사이드바 요소를 찾을 수 없습니다.');
            return;
        }

        if (!resizeHandle) {
            // 리사이즈 핸들이 없으면 동적으로 생성 (정상적인 경우)
            log('[Sidebar] 리사이즈 핸들 요소를 찾을 수 없음, 동적 생성 시작');
            const handle = document.createElement('div');
            handle.className = 'sidebar-resize-handle';
            handle.id = 'sidebar-resize-handle';
            sidebar.appendChild(handle);
            log('[Sidebar] 리사이즈 핸들 동적 생성 완료');
        }

        const finalHandle = document.getElementById('sidebar-resize-handle');
        if (!finalHandle) {
            logError('[Sidebar] 리사이즈 핸들 설정 실패');
            return;
        }

        // 리사이즈 핸들이 항상 최상위에 오도록 z-index 설정
        finalHandle.style.zIndex = '10001';
        log('[Sidebar] 리사이즈 핸들 설정 시작');

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        // 마우스 다운 이벤트
        finalHandle.addEventListener('mousedown', (e) => {
            log('[Sidebar] 리사이즈 핸들 마우스 다운');
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            sidebar.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            // 워크플로우 캔버스의 커서 스타일 임시 제거 및 이벤트 차단
            const workflowCanvas = document.querySelector('.workflow-canvas');
            const workflowArea = document.querySelector('.workflow-area');
            if (workflowCanvas) {
                workflowCanvas.style.cursor = 'col-resize';
                workflowCanvas.style.pointerEvents = 'none';
            }
            if (workflowArea) {
                workflowArea.style.pointerEvents = 'none';
            }

            e.preventDefault();
            e.stopPropagation();
        });

        // 마우스 이동 이벤트
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) {
                return;
            }

            const diff = e.clientX - startX;
            let newWidth = startWidth + diff;

            // 최소/최대 너비 제한
            const minWidth = 250;
            const maxWidth = 600;
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            sidebar.style.width = `${newWidth}px`;
            // 관련 요소들도 함께 조정 (리사이즈 중이므로 transition 비활성화)
            this.sidebarManager.uiManager.adjustLayoutForSidebarWidth(newWidth, true);

            e.preventDefault();
        });

        // 마우스 업 이벤트
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                sidebar.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // 리사이즈 완료 후 transition 복원
                const finalWidth = sidebar.offsetWidth;
                this.sidebarManager.uiManager.adjustLayoutForSidebarWidth(finalWidth, false);

                // 워크플로우 캔버스의 커서 스타일 및 이벤트 복원
                const workflowCanvas = document.querySelector('.workflow-canvas');
                const workflowArea = document.querySelector('.workflow-area');
                if (workflowCanvas) {
                    workflowCanvas.style.cursor = '';
                    workflowCanvas.style.pointerEvents = '';
                }
                if (workflowArea) {
                    workflowArea.style.pointerEvents = '';
                }

                // 너비 저장 (비동기)
                log(`[Sidebar] 사이드바 너비 저장 시작: ${sidebar.offsetWidth}px`);
                this.sidebarManager.uiManager.saveSidebarWidth(sidebar.offsetWidth).catch((error) => {
                    const logger = getLogger();
                    logger.error('[Sidebar] 사이드바 너비 저장 중 에러:', error);
                });
            }
        });

        // 리사이즈 핸들 위에서 col-resize 커서 표시 및 캔버스 이벤트 차단
        finalHandle.addEventListener('mouseenter', () => {
            log('[Sidebar] 리사이즈 핸들 마우스 진입');
            if (!isResizing) {
                const workflowCanvas = document.querySelector('.workflow-canvas');
                const workflowArea = document.querySelector('.workflow-area');
                if (workflowCanvas) {
                    workflowCanvas.style.pointerEvents = 'none';
                }
                if (workflowArea) {
                    workflowArea.style.pointerEvents = 'none';
                }
            }
        });

        finalHandle.addEventListener('mouseleave', () => {
            log('[Sidebar] 리사이즈 핸들 마우스 이탈');
            if (!isResizing) {
                const workflowCanvas = document.querySelector('.workflow-canvas');
                const workflowArea = document.querySelector('.workflow-area');
                if (workflowCanvas) {
                    workflowCanvas.style.pointerEvents = '';
                }
                if (workflowArea) {
                    workflowArea.style.pointerEvents = '';
                }
            }
        });

        log('[Sidebar] 리사이즈 핸들 설정 완료');
    }

    /**
     * 드래그 앤 드롭 기능 설정
     */
    setupDragAndDrop(scriptItem, index) {
        const logger = getLogger();
        const log = logger.log;

        // 드래그 시작
        scriptItem.addEventListener('dragstart', (e) => {
            scriptItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            log(`[Sidebar] 드래그 시작 - 인덱스: ${index}`);
        });

        // 드래그 종료
        scriptItem.addEventListener('dragend', (e) => {
            scriptItem.classList.remove('dragging');
            // 모든 드롭 인디케이터 제거
            document.querySelectorAll('.script-item').forEach((item) => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            log(`[Sidebar] 드래그 종료 - 인덱스: ${index}`);
        });

        // 드래그 오버 (다른 항목 위로 이동)
        scriptItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const draggingItem = document.querySelector('.script-item.dragging');
            if (draggingItem && draggingItem !== scriptItem) {
                const rect = scriptItem.getBoundingClientRect();
                const y = e.clientY - rect.top;

                // 항목의 중간 지점을 기준으로 위/아래 결정
                if (y < rect.height / 2) {
                    scriptItem.classList.add('drag-over-top');
                    scriptItem.classList.remove('drag-over-bottom');
                } else {
                    scriptItem.classList.add('drag-over-bottom');
                    scriptItem.classList.remove('drag-over-top');
                }
            }
        });

        // 드래그 리브 (항목에서 벗어남)
        scriptItem.addEventListener('dragleave', (e) => {
            scriptItem.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        // 드롭
        scriptItem.addEventListener('drop', (e) => {
            e.preventDefault();
            scriptItem.classList.remove('drag-over-top', 'drag-over-bottom');

            const draggingIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const rect = scriptItem.getBoundingClientRect();
            const y = e.clientY - rect.top;

            // 드롭 위치에 따라 인덱스 결정
            let dropIndex = index;
            if (y < rect.height / 2) {
                // 위쪽에 드롭
                dropIndex = index;
            } else {
                // 아래쪽에 드롭
                dropIndex = index + 1;
            }

            if (draggingIndex !== dropIndex && draggingIndex !== dropIndex - 1) {
                log(`[Sidebar] 드롭 - 드래그 인덱스: ${draggingIndex}, 드롭 인덱스: ${dropIndex}`);
                this.sidebarManager.reorderScripts(draggingIndex, dropIndex);
            }
        });
    }
}
