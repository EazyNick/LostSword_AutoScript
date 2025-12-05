/**
 * 노드 연결 처리 핸들러
 *
 * NodeManager의 연결 관련 로직을 분리한 모듈입니다.
 * 클릭 연결, 드래그 연결, 연결선 그리기 등의 기능을 담당합니다.
 */
class NodeConnectionHandler {
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
        this.canvas = nodeManager.canvas;

        // 연결 모드 관련 속성
        this.isClickConnecting = false;
        this.clickConnectionStart = null;
        this.isDraggingConnection = false;
        this.dragConnectionStart = null;
        this.tempConnectionLine = null;
        this.isDrawingConnection = false;
        this.connectionStartPoint = null;
        this.connectionStartConnector = null;
        this.longTouchTimer = null;
        this.longTouchDelay = 300;
        this.magneticThreshold = 30;

        // 바인딩된 메서드들
        this.handleDragConnectionMove = this.handleDragConnectionMove.bind(this);
        this.handleDragConnectionEnd = this.handleDragConnectionEnd.bind(this);
        this.handleConnectionDrawing = this.handleConnectionDrawing.bind(this);
        this.handleConnectionComplete = this.handleConnectionComplete.bind(this);
    }

    /**
     * 연결점 이벤트 설정
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    setupConnectionEvents(nodeElement) {
        // 입력 연결점 이벤트
        const inputConnector = nodeElement.querySelector('.node-input');
        if (inputConnector) {
            this.setupInputConnectorEvents(inputConnector, nodeElement);
        }

        // 출력 연결점 이벤트
        const outputConnectors = nodeElement.querySelectorAll('.node-output');
        outputConnectors.forEach((outputConnector) => {
            this.setupOutputConnectorEvents(outputConnector, nodeElement);
        });
    }

    /**
     * 입력 연결점 이벤트 설정
     */
    setupInputConnectorEvents(inputConnector, nodeElement) {
        inputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleInputConnectorClick(inputConnector, nodeElement);
        });

        inputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(inputConnector, nodeElement, 'input');
        });

        const connections = this.nodeManager.findConnectionsByNode(nodeElement.dataset.nodeId, 'input');
        this.nodeManager.updateConnectorVisualState(inputConnector, connections.length > 0);

        inputConnector.addEventListener('mouseenter', () => {
            const tooltipText = connections.length > 0 ? `입력 연결점 (${connections.length}개 연결됨)` : '입력 연결점';
            this.nodeManager.showConnectorTooltip(inputConnector, tooltipText);
        });

        inputConnector.addEventListener('mouseleave', () => {
            this.nodeManager.hideConnectorTooltip();
        });
    }

    /**
     * 출력 연결점 이벤트 설정
     */
    setupOutputConnectorEvents(outputConnector, nodeElement) {
        outputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isClickConnecting) {
                const nodeId = nodeElement.dataset.nodeId;
                const outputType = outputConnector.classList.contains('true-output')
                    ? 'true'
                    : outputConnector.classList.contains('false-output')
                      ? 'false'
                      : 'default';
                this.completeClickConnection(nodeId, outputType);
            } else {
                this.startClickConnection(outputConnector, nodeElement);
            }
        });

        outputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(outputConnector, nodeElement, 'output');
        });

        const outputConnections = this.nodeManager.findConnectionsByNode(nodeElement.dataset.nodeId, 'output');
        this.nodeManager.updateConnectorVisualState(outputConnector, outputConnections.length > 0);

        outputConnector.addEventListener('mouseenter', () => {
            const label = outputConnector.querySelector('.output-label');
            const baseText = label ? label.textContent : '출력 연결점';
            const tooltipText =
                outputConnections.length > 0 ? `${baseText} (${outputConnections.length}개 연결됨)` : baseText;
            this.nodeManager.showConnectorTooltip(outputConnector, tooltipText);
        });

        outputConnector.addEventListener('mouseleave', () => {
            this.nodeManager.hideConnectorTooltip();
        });
    }

    /**
     * 입력 연결점 클릭 처리
     */
    handleInputConnectorClick(inputConnector, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;

        if (this.isClickConnecting) {
            this.completeClickConnection(nodeId, 'input');
        } else {
            this.startClickConnectionFromInput(inputConnector, nodeElement);
        }
    }

    /**
     * 클릭 연결 시작 (출력 연결점에서)
     */
    startClickConnection(outputConnector, nodeElement) {
        // ConnectionManager를 필수로 사용
        const connectionManager = this.nodeManager.connectionManager || window.connectionManager;
        if (!connectionManager) {
            console.error('[NodeConnectionHandler] ConnectionManager가 없습니다. 연결을 시작할 수 없습니다.');
            return;
        }

        // ConnectionManager를 사용하여 연결 시작
        connectionManager.handleConnectorClick(nodeElement, 'output', outputConnector);
    }

    /**
     * 클릭 연결 시작 (입력 연결점에서)
     */
    startClickConnectionFromInput(inputConnector, nodeElement) {
        // ConnectionManager를 필수로 사용
        const connectionManager = this.nodeManager.connectionManager || window.connectionManager;
        if (!connectionManager) {
            console.error('[NodeConnectionHandler] ConnectionManager가 없습니다. 연결을 시작할 수 없습니다.');
            return;
        }

        // ConnectionManager를 사용하여 연결 시작
        connectionManager.handleConnectorClick(nodeElement, 'input', inputConnector);
    }

    /**
     * 클릭 연결 완료
     */
    completeClickConnection(nodeId, connectorType) {
        if (!this.isClickConnecting || !this.clickConnectionStart) {
            return;
        }

        const startNodeId = this.clickConnectionStart.nodeId;
        const startOutputType = this.clickConnectionStart.outputType;
        const isFromOutput = this.clickConnectionStart.isFromOutput;

        let isValid = false;
        if (isFromOutput) {
            isValid = this.nodeManager.validateConnection(startNodeId, nodeId, 'output', 'input');
        } else {
            isValid = this.nodeManager.validateConnection(nodeId, startNodeId, 'input', 'output');
        }

        if (!isValid) {
            this.cancelClickConnection();
            return;
        }

        if (isFromOutput) {
            this.nodeManager.createNodeConnection(startNodeId, nodeId, startOutputType, connectorType);
        } else {
            this.nodeManager.createNodeConnection(nodeId, startNodeId, connectorType, 'input');
        }

        this.cleanupClickConnection();
    }

    /**
     * 클릭 연결 취소
     */
    cancelClickConnection() {
        this.cleanupClickConnection();
    }

    /**
     * 클릭 연결 정리
     */
    cleanupClickConnection() {
        this.isClickConnecting = false;

        if (this.clickConnectionStart && this.clickConnectionStart.connector) {
            this.nodeManager.updateConnectorVisualState(this.clickConnectionStart.connector, false);
        }

        this.removeTempConnectionLine();
        this.nodeManager.deactivateAllConnectors();
        this.hideClickConnectionMessage();
        this.clickConnectionStart = null;
    }

    /**
     * 클릭 연결 메시지 표시
     */
    showClickConnectionMessage(text = '입력 연결점을 클릭하여 연결하세요') {
        const message = document.createElement('div');
        message.id = 'click-connection-message';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1001;
            pointer-events: none;
        `;
        message.textContent = text;
        document.body.appendChild(message);
    }

    /**
     * 클릭 연결 메시지 숨기기
     */
    hideClickConnectionMessage() {
        const message = document.getElementById('click-connection-message');
        if (message) {
            message.remove();
        }
    }

    /**
     * 클릭 연결 중 임시 연결선 업데이트
     */
    updateClickConnectionLine(e) {
        if (!this.isClickConnecting || !this.clickConnectionStart || !this.tempConnectionLine) {
            return;
        }

        const startConnector = this.clickConnectionStart.connector;
        const startPos = this.nodeManager.getConnectorPosition(startConnector);

        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        this.updateTempConnectionLine(startPos, { x: mouseX, y: mouseY });
        this.highlightNearbyInputConnector(mouseX, mouseY);
    }

    /**
     * 근처 입력 연결점 하이라이트
     */
    highlightNearbyInputConnector(mouseX, mouseY) {
        const inputConnectors = document.querySelectorAll('.node-input');
        let nearestConnector = null;
        let minDistance = this.magneticThreshold;

        inputConnectors.forEach((connector) => {
            const pos = this.nodeManager.getConnectorPosition(connector);
            const distance = Math.sqrt(Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2));

            if (distance < minDistance) {
                minDistance = distance;
                nearestConnector = connector;
            }
        });

        inputConnectors.forEach((connector) => {
            connector.classList.remove('magnetic-highlight');
        });

        if (nearestConnector) {
            nearestConnector.classList.add('magnetic-highlight');
        }
    }

    /**
     * 드래그 연결 시작
     */
    startDragConnection(e, outputConnector, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        const outputType = outputConnector.classList.contains('true-output')
            ? 'true'
            : outputConnector.classList.contains('false-output')
              ? 'false'
              : 'default';

        this.isDraggingConnection = true;
        this.dragConnectionStart = {
            nodeId: nodeId,
            outputType: outputType,
            connector: outputConnector,
            ...(() => {
                const p = this.nodeManager.getConnectorPosition(outputConnector);
                return { startCanvasX: p.x, startCanvasY: p.y };
            })()
        };

        outputConnector.style.backgroundColor = '#FF6B35';
        outputConnector.style.borderColor = '#FF6B35';
        outputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';

        this.createTempConnectionLine(this.dragConnectionStart.startCanvasX, this.dragConnectionStart.startCanvasY);

        document.addEventListener('mousemove', this.handleDragConnectionMove);
        document.addEventListener('mouseup', this.handleDragConnectionEnd);

        this.showDragConnectionMessage();
    }

    /**
     * 드래그 연결 이동 처리
     */
    handleDragConnectionMove(e) {
        if (!this.isDraggingConnection) {
            return;
        }

        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        this.updateTempConnectionLine(
            { x: this.dragConnectionStart.startCanvasX, y: this.dragConnectionStart.startCanvasY },
            { x: mouseX, y: mouseY }
        );

        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);
        this.nodeManager.clearAllConnectorHighlights();

        if (nearbyInputConnector) {
            this.nodeManager.highlightConnector(nearbyInputConnector);
        }
    }

    /**
     * 드래그 연결 종료 처리
     */
    handleDragConnectionEnd(e) {
        if (!this.isDraggingConnection) {
            return;
        }

        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);

        if (nearbyInputConnector) {
            this.completeDragConnection(nearbyInputConnector);
        } else {
            this.cancelDragConnection();
        }
    }

    /**
     * 가까운 입력 연결점 찾기
     */
    findNearbyInputConnector(mouseX, mouseY) {
        const inputConnectors = this.canvas.querySelectorAll('.node-input');
        let closestConnector = null;
        let closestDistance = this.magneticThreshold;

        inputConnectors.forEach((connector) => {
            const rect = connector.getBoundingClientRect();
            const connectorX = rect.left + rect.width / 2;
            const connectorY = rect.top + rect.height / 2;

            const distance = Math.sqrt(Math.pow(mouseX - connectorX, 2) + Math.pow(mouseY - connectorY, 2));

            if (distance < closestDistance) {
                closestDistance = distance;
                closestConnector = connector;
            }
        });

        return closestConnector;
    }

    /**
     * 드래그 연결 완료
     */
    completeDragConnection(targetInputConnector) {
        if (!this.dragConnectionStart || !targetInputConnector) {
            return;
        }

        const targetNode = targetInputConnector.closest('.workflow-node');
        if (!targetNode) {
            return;
        }

        const targetNodeId = targetNode.dataset.nodeId;
        const startNodeId = this.dragConnectionStart.nodeId;
        const outputType = this.dragConnectionStart.outputType;

        // 연결 유효성 검증
        const isValid = this.nodeManager.validateConnection(startNodeId, targetNodeId, outputType, 'input');
        if (!isValid) {
            this.cleanupDragConnection();
            return;
        }

        this.nodeManager.createNodeConnection(startNodeId, targetNodeId, outputType, 'input');
        this.cleanupDragConnection();
    }

    /**
     * 드래그 연결 취소
     */
    cancelDragConnection() {
        this.cleanupDragConnection();
    }

    /**
     * 드래그 연결 정리
     */
    cleanupDragConnection() {
        this.isDraggingConnection = false;

        if (this.dragConnectionStart && this.dragConnectionStart.connector) {
            this.nodeManager.updateConnectorVisualState(this.dragConnectionStart.connector, false);
        }

        document.removeEventListener('mousemove', this.handleDragConnectionMove);
        document.removeEventListener('mouseup', this.handleDragConnectionEnd);

        this.removeTempConnectionLine();
        this.nodeManager.clearAllConnectorHighlights();
        this.hideDragConnectionMessage();
        this.dragConnectionStart = null;
    }

    /**
     * 임시 연결선 생성
     */
    createTempConnectionLine(startX, startY) {
        this.removeTempConnectionLine();

        const canvasRect = this.canvas.getBoundingClientRect();

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'temp-connection-line';
        svg.style.cssText = `
            position: fixed;
            top: ${canvasRect.top}px;
            left: ${canvasRect.left}px;
            width: ${canvasRect.width}px;
            height: ${canvasRect.height}px;
            pointer-events: none;
            z-index: 1000;
        `;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', '#FF6B35');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);

        svg.appendChild(path);
        document.body.appendChild(svg);

        this.tempConnectionLine = { svg, path };
    }

    /**
     * 임시 연결선 업데이트
     */
    updateTempConnectionLine(startPos, endPos) {
        if (!this.tempConnectionLine) {
            return;
        }

        const startX = startPos.x;
        const startY = startPos.y;
        const currentX = endPos.x;
        const currentY = endPos.y;

        const controlPoint1X = startX + (currentX - startX) * 0.5;
        const controlPoint1Y = startY;
        const controlPoint2X = startX + (currentX - startX) * 0.5;
        const controlPoint2Y = currentY;

        const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${currentX} ${currentY}`;
        this.tempConnectionLine.path.setAttribute('d', pathData);
    }

    /**
     * 임시 연결선 제거
     */
    removeTempConnectionLine() {
        if (this.tempConnectionLine && this.tempConnectionLine.svg) {
            this.tempConnectionLine.svg.remove();
            this.tempConnectionLine = null;
        }
    }

    /**
     * 드래그 연결 메시지 표시
     */
    showDragConnectionMessage() {
        const message = document.createElement('div');
        message.id = 'drag-connection-message';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1001;
            pointer-events: none;
        `;
        message.textContent = '입력 연결점에 놓아서 연결하세요';
        document.body.appendChild(message);
    }

    /**
     * 드래그 연결 메시지 숨기기
     */
    hideDragConnectionMessage() {
        const message = document.getElementById('drag-connection-message');
        if (message) {
            message.remove();
        }
    }

    /**
     * 연결점 더블클릭 처리
     */
    handleConnectorDoubleClick(connector, nodeElement, connectorType) {
        const nodeId = nodeElement.dataset.nodeId;

        try {
            // 출력 타입 감지 (조건 노드의 경우)
            let outputType = null;
            if (connectorType === 'output' && connector) {
                if (connector.classList.contains('true-output') || connector.closest('.true-output')) {
                    outputType = 'true';
                } else if (connector.classList.contains('false-output') || connector.closest('.false-output')) {
                    outputType = 'false';
                }
            }

            // 연결 목록 조회 (조건 노드의 경우 outputType 고려)
            const connections = this.nodeManager.findConnectionsByNode(nodeId, connectorType, outputType);

            if (connections.length === 0) {
                this.nodeManager.showConnectorTooltip(connector, '연결된 선이 없습니다');
                setTimeout(() => this.nodeManager.hideConnectorTooltip(), 2000);
                return;
            }

            connections.forEach((connection) => {
                this.nodeManager.deleteConnectionByConnectionId(connection.id);
            });

            this.nodeManager.showConnectionDeletedFeedback(connector, connections.length);

            setTimeout(() => {
                this.nodeManager.updateAllConnectorsVisualState();
            }, 100);
        } catch (error) {
            console.error('연결선 삭제 실패:', error);
        }
    }

    /**
     * 롱터치 시작
     */
    startLongTouch(e, connector, nodeElement, connectorType) {
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
        }

        this.longTouchTimer = setTimeout(() => {
            this.activateConnectionDrawingMode(e, connector, nodeElement, connectorType);
        }, this.longTouchDelay);
    }

    /**
     * 롱터치 취소
     */
    cancelLongTouch() {
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
            this.longTouchTimer = null;
        }

        if (this.isDrawingConnection) {
            this.deactivateConnectionDrawingMode();
        }
    }

    /**
     * 연결선 그리기 모드 활성화
     */
    activateConnectionDrawingMode(e, connector, nodeElement, connectorType) {
        this.isDrawingConnection = true;
        this.connectionStartConnector = connector;
        this.connectionStartPoint = {
            x: e.clientX,
            y: e.clientY,
            nodeId: nodeElement.dataset.nodeId,
            connectorType: connectorType
        };

        connector.style.backgroundColor = '#FF6B35';
        connector.style.borderColor = '#FF6B35';
        connector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';

        this.canvas.addEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.addEventListener('mouseup', this.handleConnectionComplete);

        this.showConnectionDrawingMessage(connectorType);
    }

    /**
     * 연결선 그리기 모드 비활성화
     */
    deactivateConnectionDrawingMode() {
        this.isDrawingConnection = false;
        this.connectionStartPoint = null;
        this.connectionStartConnector = null;

        if (this.connectionStartConnector) {
            this.nodeManager.updateConnectorVisualState(this.connectionStartConnector, false);
        }

        this.canvas.removeEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.removeEventListener('mouseup', this.handleConnectionComplete);

        this.hideConnectionDrawingMessage();

        if (this.nodeManager.connectionManager) {
            this.nodeManager.connectionManager.removeTempConnection();
        }

        this.nodeManager.clearAllConnectorHighlights();
    }

    /**
     * 연결선 그리기 처리
     */
    handleConnectionDrawing(e) {
        if (!this.isDrawingConnection || !this.connectionStartPoint) {
            return;
        }

        if (this.nodeManager.connectionManager) {
            this.nodeManager.connectionManager.updateTempConnection(
                this.connectionStartPoint.x,
                this.connectionStartPoint.y,
                e.clientX,
                e.clientY
            );
        }

        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);
        if (nearbyConnector) {
            this.nodeManager.highlightConnector(nearbyConnector);
        } else {
            this.nodeManager.clearAllConnectorHighlights();
        }
    }

    /**
     * 연결선 완료 처리
     */
    handleConnectionComplete(e) {
        if (!this.isDrawingConnection || !this.connectionStartPoint) {
            return;
        }

        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);

        if (nearbyConnector) {
            this.completeConnectionToConnector(nearbyConnector);
        } else {
            this.deactivateConnectionDrawingMode();
        }
    }

    /**
     * 가까운 연결점 찾기
     */
    findNearbyConnector(mouseX, mouseY) {
        const allConnectors = this.canvas.querySelectorAll('.node-input, .node-output');
        let closestConnector = null;
        let closestDistance = this.magneticThreshold;

        allConnectors.forEach((connector) => {
            const rect = connector.getBoundingClientRect();
            const connectorX = rect.left + rect.width / 2;
            const connectorY = rect.top + rect.height / 2;

            const distance = Math.sqrt(Math.pow(mouseX - connectorX, 2) + Math.pow(mouseY - connectorY, 2));

            if (distance < closestDistance) {
                closestDistance = distance;
                closestConnector = connector;
            }
        });

        return closestConnector;
    }

    /**
     * 연결점으로 연결 완료
     */
    completeConnectionToConnector(targetConnector) {
        if (!this.connectionStartPoint || !targetConnector) {
            return;
        }

        const targetNode = targetConnector.closest('.workflow-node');
        if (!targetNode) {
            return;
        }

        const targetNodeId = targetNode.dataset.nodeId;
        const targetConnectorType = targetConnector.classList.contains('node-input') ? 'input' : 'output';

        if (this.connectionStartPoint.connectorType === 'output' && targetConnectorType === 'input') {
            this.nodeManager.createNodeConnection(
                this.connectionStartPoint.nodeId,
                targetNodeId,
                this.connectionStartPoint.connectorType,
                targetConnectorType
            );
        } else if (this.connectionStartPoint.connectorType === 'input' && targetConnectorType === 'output') {
            this.nodeManager.createNodeConnection(
                targetNodeId,
                this.connectionStartPoint.nodeId,
                targetConnectorType,
                this.connectionStartPoint.connectorType
            );
        }

        this.deactivateConnectionDrawingMode();
    }

    /**
     * 연결선 그리기 메시지 표시
     */
    showConnectionDrawingMessage(connectorType) {
        const message = document.createElement('div');
        message.id = 'connection-drawing-message';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            pointer-events: none;
        `;
        message.textContent = `${connectorType === 'output' ? '출력' : '입력'} 연결점에서 연결선을 그리는 중... 다른 연결점에 놓으세요.`;
        document.body.appendChild(message);
    }

    /**
     * 연결선 그리기 메시지 숨기기
     */
    hideConnectionDrawingMessage() {
        const message = document.getElementById('connection-drawing-message');
        if (message) {
            message.remove();
        }
    }
}

// 전역으로 사용할 수 있도록 export
window.NodeConnectionHandler = NodeConnectionHandler;
