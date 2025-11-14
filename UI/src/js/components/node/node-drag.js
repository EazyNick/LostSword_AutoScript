// node-drag.js
// 노드 드래그 / 위치 업데이트 담당 컨트롤러
// ES6 모듈 방식으로 작성됨

// Logger는 logger.js에서 로드됨
const log = window.Logger ? window.Logger.log.bind(window.Logger) : console.log;
const logError = window.Logger ? window.Logger.error.bind(window.Logger) : console.error;

export class NodeDragController {
    /**
     * @param {NodeManager} nodeManager
     */
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
        this.canvas = nodeManager.canvas;

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedNode = null;

        this.bindGlobalEvents();
    }

    /**
     * 전역 mousemove / mouseup 바인딩
     */
    bindGlobalEvents() {
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
    }

    /**
     * 개별 노드에 드래그 관련 이벤트 바인딩
     */
    attachNode(node) {
        // 이미 바인딩되었는지 확인 (중복 방지)
        if (node.dataset.dragAttached === 'true') {
            return;
        }
        
        // 드래그 시작
        node.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 왼쪽 버튼
                e.preventDefault();
                e.stopPropagation();
                this.startDrag(e, node);
            }
        });

        // 호버 시 살짝 떠오르는 효과
        node.addEventListener('mouseenter', () => {
            node.style.transform = 'translateY(-2px)';
        });

        node.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                node.style.transform = '';
            }
        });
        
        // 바인딩 완료 플래그 설정
        node.dataset.dragAttached = 'true';
    }

    /**
     * 드래그 시작
     */
    startDrag(e, node) {
        try {
            this.isDragging = true;
            this.draggedNode = node;

            // NodeManager 쪽 선택 상태도 맞춰줌
            if (this.nodeManager.selectionController) {
                this.nodeManager.selectionController.selectNode(node);
            } else if (typeof this.nodeManager.selectNode === 'function') {
                this.nodeManager.selectNode(node);
            }

            this.calculateDragOffset(e, node);
            this.setDragState(node, true);

            log('드래그 시작:', node.id);
        } catch (error) {
            logError('드래그 시작 실패:', error);
            this.isDragging = false;
            this.draggedNode = null;
        }
    }

    /**
     * 오프셋 계산
     */
    calculateDragOffset(e, node) {
        const canvasRect = this.nodeManager.canvas.getBoundingClientRect();

        const nodeX = parseInt(node.style.left) || 0;
        const nodeY = parseInt(node.style.top) || 0;

        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        this.dragOffset = {
            x: mouseX - nodeX,
            y: mouseY - nodeY
        };

        log(`- 노드 위치: (${nodeX}, ${nodeY})`);
        log(`- 마우스 위치: (${mouseX}, ${mouseY})`);
        log(`- 드래그 오프셋: (${this.dragOffset.x}, ${this.dragOffset.y})`);
    }

    /**
     * 드래그 CSS 상태
     */
    setDragState(node, isDragging) {
        if (isDragging) {
            node.classList.add('dragging');
        } else {
            node.classList.remove('dragging');
        }
    }

    /**
     * 드래그 중 처리
     */
    handleDrag(e) {
        if (!this.isDragging || !this.draggedNode) return;

        try {
            const pos = this.calculateNewPosition(e);
            this.updateNodePosition(this.draggedNode, pos);
            this.updateRelatedComponents(this.draggedNode);
        } catch (error) {
            logError('드래그 처리 실패:', error);
        }
    }

    /**
     * 새 위치 계산
     */
    calculateNewPosition(e) {
        const canvasRect = this.nodeManager.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        return {
            x: mouseX - this.dragOffset.x,
            y: mouseY - this.dragOffset.y
        };
    }

    /**
     * 실제 DOM 위치 갱신
     */
    updateNodePosition(node, position) {
        node.style.left = position.x + 'px';
        node.style.top = position.y + 'px';
    }

    /**
     * 연결선 등 관련 컴포넌트 업데이트
     */
    updateRelatedComponents(node) {
        const nodeId = node.id;

        if (!this.nodeManager) return;

        // 드래그 중에는 rAF 기반 업데이트 사용
        if (typeof this.nodeManager.updateConnectionsDuringDrag === 'function') {
            this.nodeManager.updateConnectionsDuringDrag(nodeId);
        } else if (typeof this.nodeManager.updateConnectionsImmediately === 'function') {
            this.nodeManager.updateConnectionsImmediately(nodeId);
        }
    }

    /**
     * 드래그 종료
     */
    endDrag() {
        if (!this.isDragging || !this.draggedNode) return;

        try {
            const node = this.draggedNode;
            const nodeId = node.dataset.nodeId;

            // 최종 위치 저장
            this.saveFinalPosition(node);

            // CSS 상태 정리
            this.setDragState(node, false);

            // 연결선 최종 업데이트
            if (typeof this.nodeManager.updateConnectionsImmediately === 'function') {
                this.nodeManager.updateConnectionsImmediately(nodeId);
            }

            // connectionManager.updateConnections() 호출 (기존 로직 유지)
            if (window.connectionManager) {
                setTimeout(() => {
                    window.connectionManager.updateConnections();
                }, 10);
            }

            log(`드래그 종료: ${nodeId}`);
        } catch (error) {
            logError('드래그 종료 실패:', error);
        } finally {
            this.isDragging = false;
            this.draggedNode = null;
        }
    }

    /**
     * nodeData에 최종 위치 반영
     */
    saveFinalPosition(node) {
        const nodeId = node.dataset.nodeId;
        const finalX = parseInt(node.style.left) || 0;
        const finalY = parseInt(node.style.top) || 0;
        const data = this.nodeManager.nodeData && this.nodeManager.nodeData[nodeId];

        if (data) {
            data.x = finalX;
            data.y = finalY;
            data.updatedAt = new Date().toISOString();
        }
    }
}

// 전역으로 노출 (하위 호환성을 위해)
window.NodeDragController = NodeDragController;
