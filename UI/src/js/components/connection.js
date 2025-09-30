/**
 * 노드 간 연결 관리 클래스
 */
class ConnectionManager {
    constructor(workflowCanvas) {
        this.canvas = workflowCanvas;
        this.connections = new Map(); // 연결 정보 저장
        this.connectionLines = new Map(); // SVG 라인 요소 저장
        this.isConnecting = false;
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null;
        this.startConnectorType = null; // 연결점 타입 저장
        this.tempLine = null;
        this.tempConnection = null; // 롱터치용 임시 연결선
        
        this.initSVG();
        this.bindEvents();
    }
    
    /**
     * SVG 요소 초기화
     * 무한 캔버스 모드에 맞게 SVG 컨테이너 설정
     */
    initSVG() {
        // SVG 컨테이너 생성
        this.svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgContainer.setAttribute('class', 'connection-svg');
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.top = '0';
        this.svgContainer.style.left = '0';
        this.svgContainer.style.width = '100%';
        this.svgContainer.style.height = '100%';
        this.svgContainer.style.pointerEvents = 'none';
        this.svgContainer.style.zIndex = '1';
        this.svgContainer.style.overflow = 'visible';
        
        // 캔버스에 SVG 추가
        this.canvas.appendChild(this.svgContainer);
        
        // SVG 크기 업데이트
        this.updateSVGSize();
        
        console.log('SVG 컨테이너 초기화 완료');
    }
    
    /**
     * SVG 크기 업데이트
     * 캔버스 크기 변경 시 SVG 크기도 함께 업데이트
     */
    updateSVGSize() {
        if (!this.svgContainer) return;
        
        // 캔버스의 실제 크기 가져오기
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 캔버스 크기에 맞춰 SVG 크기 설정
        this.svgContainer.setAttribute('width', canvasRect.width);
        this.svgContainer.setAttribute('height', canvasRect.height);
        this.svgContainer.style.width = canvasRect.width + 'px';
        this.svgContainer.style.height = canvasRect.height + 'px';
        
        console.log('SVG 크기 업데이트:', {
            width: this.svgContainer.getAttribute('width'),
            height: this.svgContainer.getAttribute('height')
        });
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 캔버스 클릭 이벤트 (연결 취소)
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas && this.isConnecting) {
                this.cancelConnection();
            }
        });
        
        // 윈도우 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.updateSVGSize();
            this.redrawAllConnections();
        });
    }
    
    /**
     * 노드 연결점 클릭 이벤트 바인딩
     */
    bindNodeConnector(nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        console.log(`노드 ${nodeId} 연결점 바인딩 시작`);
        
        // 입력 연결점
        const inputConnector = nodeElement.querySelector('.node-input');
        if (inputConnector) {
            inputConnector.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`입력 연결점 클릭됨 - 노드 ${nodeId}`);
                // 패닝 중이면 연결 방지
                if (this.isPanning()) {
                    console.log('패닝 중이므로 연결 방지');
                    return;
                }
                this.handleConnectorClick(nodeElement, 'input', inputConnector);
            });
        }
        
        // 일반 출력 연결점
        const outputConnector = nodeElement.querySelector('.node-output:not(.true-output):not(.false-output)');
        if (outputConnector) {
            outputConnector.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`출력 연결점 클릭됨 - 노드 ${nodeId}`);
                // 패닝 중이면 연결 방지
                if (this.isPanning()) {
                    console.log('패닝 중이므로 연결 방지');
                    return;
                }
                this.handleConnectorClick(nodeElement, 'output', outputConnector);
            });
        }
        
        // 조건 노드의 True/False 출력 연결점
        const trueOutput = nodeElement.querySelector('.true-output .output-dot');
        const falseOutput = nodeElement.querySelector('.false-output .output-dot');
        
        if (trueOutput) {
            trueOutput.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`True 출력 연결점 클릭됨 - 노드 ${nodeId}`);
                if (this.isPanning()) {
                    console.log('패닝 중이므로 연결 방지');
                    return;
                }
                this.handleConnectorClick(nodeElement, 'output', trueOutput);
            });
        }
        
        if (falseOutput) {
            falseOutput.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`False 출력 연결점 클릭됨 - 노드 ${nodeId}`);
                if (this.isPanning()) {
                    console.log('패닝 중이므로 연결 방지');
                    return;
                }
                this.handleConnectorClick(nodeElement, 'output', falseOutput);
            });
        }
        
        console.log(`노드 ${nodeId} 연결점 바인딩 완료`);
    }
    
    isPanning() {
        // 노드 매니저의 패닝 상태 확인
        return window.nodeManager && window.nodeManager.isPanning;
    }
    
    /**
     * 연결점 클릭 처리
     */
    handleConnectorClick(nodeElement, connectorType, connectorElement) {
        const nodeId = nodeElement.dataset.nodeId;
        
        if (!this.isConnecting) {
            // 연결 시작 (입력/출력 모두 가능)
            this.startConnection(nodeElement, connectorElement, connectorType);
        } else {
            // 연결 완료 (다른 타입의 연결점으로 완료 가능)
            if (this.startConnectorType !== connectorType && this.startNode !== nodeElement) {
                this.completeConnection(nodeElement, connectorElement);
            } else {
                this.cancelConnection();
            }
        }
    }
    
    /**
     * 연결 시작
     */
    startConnection(nodeElement, connectorElement, connectorType) {
        this.isConnecting = true;
        this.startNode = nodeElement;
        this.startConnector = connectorElement;
        this.startConnectorType = connectorType; // 연결점 타입 저장
        
        // 연결점 하이라이트
        connectorElement.classList.add('connecting');
        
        // 임시 연결선 생성
        this.createTempLine();
        
        // 마우스 이동 이벤트
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        console.log(`연결 시작됨 - 노드: ${nodeElement.dataset.nodeId}, 타입: ${connectorType}`);
    }
    
    /**
     * 연결 완료
     */
    completeConnection(targetNodeElement, targetConnectorElement) {
        const startNodeId = this.startNode.dataset.nodeId;
        const targetNodeId = targetNodeElement.dataset.nodeId;
        
        // 자기 자신과 연결 방지
        if (startNodeId === targetNodeId) {
            this.cancelConnection();
            return;
        }
        
        // 중복 연결 방지
        const connectionId = `${startNodeId}-${targetNodeId}`;
        if (this.connections.has(connectionId)) {
            this.cancelConnection();
            return;
        }
        
        // 연결 생성
        this.createConnection(startNodeId, targetNodeId);
        
        // 연결 완료 처리
        this.finishConnection();
        
        // 연결점 하이라이트
        targetConnectorElement.classList.add('connected');
    }
    
    /**
     * 연결 취소
     */
    cancelConnection() {
        this.isConnecting = false;
        
        // 시작 연결점 복원
        if (this.startConnector) {
            this.startConnector.classList.remove('connecting');
        }
        
        // 임시 연결선 제거
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
        
        // 이벤트 제거
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null;
        
        console.log('연결 취소됨');
    }
    
    /**
     * 연결 완료 처리
     */
    finishConnection() {
        this.isConnecting = false;
        
        // 시작 연결점 복원
        if (this.startConnector) {
            this.startConnector.classList.remove('connecting');
        }
        
        // 임시 연결선 제거
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
        
        // 이벤트 제거
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null;
        
        console.log('연결 완료됨');
    }
    
    /**
     * 마우스 이동 처리
     */
    handleMouseMove(e) {
        if (!this.tempLine) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 시작점 좌표
        const startPos = this.getConnectorPosition(this.startConnector);
        
        // 임시 연결선 업데이트
        this.updateTempLine(startPos.x, startPos.y, mouseX, mouseY);
    }
    
    /**
     * 연결점 위치 계산
     * 무한 캔버스 모드에서 Transform을 고려한 정확한 위치 계산
     */
    getConnectorPosition(connectorElement) {
        const rect = connectorElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 캔버스 내에서의 상대 위치 계산 (연결점 중심 좌표)
        const relativeX = rect.left - canvasRect.left + rect.width / 2;
        const relativeY = rect.top - canvasRect.top + rect.height / 2;
        
        console.log(`연결점 위치 계산:`);
        console.log(`- 연결점 크기: ${rect.width}x${rect.height}`);
        console.log(`- 상대 위치 (중심): (${relativeX}, ${relativeY})`);
        console.log(`- 최종 위치 (중심): (${relativeX}, ${relativeY})`);
        
        return { x: relativeX, y: relativeY };
    }
    
    /**
     * 임시 연결선 생성
     */
    createTempLine() {
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempLine.setAttribute('stroke', '#ff6b35');
        this.tempLine.setAttribute('stroke-width', '3');
        this.tempLine.setAttribute('fill', 'none');
        this.tempLine.setAttribute('stroke-dasharray', '5,5');
        this.tempLine.style.pointerEvents = 'none';
        
        this.svgContainer.appendChild(this.tempLine);
    }
    
    /**
     * 임시 연결선 업데이트
     */
    updateTempLine(x1, y1, x2, y2) {
        const path = this.createCurvedPath(x1, y1, x2, y2);
        this.tempLine.setAttribute('d', path);
    }
    
    /**
     * 연결 생성
     */
    createConnection(fromNodeId, toNodeId) {
        const connectionId = `${fromNodeId}-${toNodeId}`;
        
        // 연결 정보 저장
        this.connections.set(connectionId, {
            id: connectionId,
            from: fromNodeId,
            to: toNodeId
        });
        
        // 연결선 그리기
        this.drawConnection(fromNodeId, toNodeId);
        
        // 연결 생성 이벤트 발생
        this.canvas.dispatchEvent(new CustomEvent('connectionCreated', {
            detail: { from: fromNodeId, to: toNodeId }
        }));
    }
    
    /**
     * 연결선 그리기
     */
    drawConnection(fromNodeId, toNodeId) {
        const fromNode = this.canvas.querySelector(`[data-node-id="${fromNodeId}"]`);
        const toNode = this.canvas.querySelector(`[data-node-id="${toNodeId}"]`);
        
        if (!fromNode || !toNode) {
            console.warn('노드를 찾을 수 없습니다:', fromNodeId, toNodeId);
            return;
        }
        
        const fromConnector = fromNode.querySelector('.node-output');
        const toConnector = toNode.querySelector('.node-input');
        
        if (!fromConnector || !toConnector) {
            console.warn('연결점을 찾을 수 없습니다:', fromNodeId, toNodeId);
            return;
        }
        
        const fromPos = this.getConnectorPosition(fromConnector);
        const toPos = this.getConnectorPosition(toConnector);
        
        console.log('연결선 그리기:', fromPos, toPos);
        
        // SVG 크기 업데이트 (연결선 그리기 전에)
        this.updateSVGSize();
        
        // 위치가 유효한지 확인
        if (!fromPos || !toPos || isNaN(fromPos.x) || isNaN(fromPos.y) || isNaN(toPos.x) || isNaN(toPos.y)) {
            console.warn('유효하지 않은 연결점 위치:', fromPos, toPos);
            return;
        }
        
        // 연결선 생성
        const path = this.createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('class', 'connection-line');
        line.setAttribute('data-connection-id', `${fromNodeId}-${toNodeId}`);
        
        // 연결선 스타일 설정
        line.setAttribute('stroke', '#007AFF');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        
        // 연결선 클릭 이벤트 (삭제용)
        line.style.pointerEvents = 'stroke';
        line.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConnection(`${fromNodeId}-${toNodeId}`);
        });
        
        // 연결선 호버 이벤트
        line.addEventListener('mouseenter', (e) => {
            line.setAttribute('stroke', '#FF3B30');
            line.setAttribute('stroke-width', '3');
        });
        
        line.addEventListener('mouseleave', (e) => {
            line.setAttribute('stroke', '#007AFF');
            line.setAttribute('stroke-width', '2');
        });
        
        this.svgContainer.appendChild(line);
        this.connectionLines.set(`${fromNodeId}-${toNodeId}`, line);
        
        console.log('연결선 추가됨:', line);
        console.log('SVG 컨테이너 크기:', {
            width: this.svgContainer.getAttribute('width'),
            height: this.svgContainer.getAttribute('height')
        });
        console.log('연결선 경로:', path);
    }
    
    /**
     * 모든 연결선 다시 그리기
     * 노드 위치가 변경되었을 때 모든 연결선을 다시 그립니다.
     */
    redrawAllConnections() {
        console.log('모든 연결선 다시 그리기 시작...');
        
        // 기존 연결선 모두 제거
        this.connectionLines.forEach((line, connectionId) => {
            line.remove();
        });
        this.connectionLines.clear();
        
        // 모든 연결선 다시 그리기
        this.connections.forEach((connection, connectionId) => {
            this.drawConnection(connection.from, connection.to);
        });
        
        console.log(`총 ${this.connections.size}개의 연결선 다시 그리기 완료`);
    }
    
    /**
     * 연결선 위치 업데이트
     * 기존 연결선의 위치만 업데이트합니다 (제거하지 않고).
     */
    updateAllConnections() {
        console.log('모든 연결선 위치 업데이트 시작...');
        
        this.connections.forEach((connection, connectionId) => {
            const line = this.connectionLines.get(connectionId);
            if (line) {
                // 연결선 위치 다시 계산
                const fromNode = this.canvas.querySelector(`[data-node-id="${connection.from}"]`);
                const toNode = this.canvas.querySelector(`[data-node-id="${connection.to}"]`);
                
                if (fromNode && toNode) {
                    const fromConnector = fromNode.querySelector('.node-output');
                    const toConnector = toNode.querySelector('.node-input');
                    
                    if (fromConnector && toConnector) {
                        const fromPos = this.getConnectorPosition(fromConnector);
                        const toPos = this.getConnectorPosition(toConnector);
                        
                        // 새로운 경로 생성
                        const path = this.createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
                        line.setAttribute('d', path);
                        
                        console.log(`연결선 ${connectionId} 위치 업데이트: (${fromPos.x}, ${fromPos.y}) → (${toPos.x}, ${toPos.y})`);
                    }
                }
            }
        });
        
        console.log('모든 연결선 위치 업데이트 완료');
    }
    createCurvedPath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100);
        
        const cp1x = x1 + controlPointOffset;
        const cp1y = y1;
        const cp2x = x2 - controlPointOffset;
        const cp2y = y2;
        
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    
    /**
     * 연결 삭제
     */
    deleteConnection(connectionId) {
        if (!this.connections.has(connectionId)) return;
        
        // 연결선 제거
        const line = this.connectionLines.get(connectionId);
        if (line) {
            line.remove();
            this.connectionLines.delete(connectionId);
        }
        
        // 연결 정보 제거
        this.connections.delete(connectionId);
        
        // 연결 삭제 이벤트 발생
        this.canvas.dispatchEvent(new CustomEvent('connectionDeleted', {
            detail: { connectionId }
        }));
    }
    
    /**
     * 모든 연결선 다시 그리기
     */
    redrawAllConnections() {
        console.log('모든 연결선 다시 그리기 시작...');
        console.log('현재 연결 개수:', this.connections.size);
        
        // 기존 연결선 제거
        this.connectionLines.forEach(line => line.remove());
        this.connectionLines.clear();
        
        // 연결선 다시 그리기
        this.connections.forEach((connection, connectionId) => {
            console.log(`연결선 다시 그리기: ${connectionId}`);
            this.drawConnection(connection.from, connection.to);
        });
        
        console.log('모든 연결선 다시 그리기 완료');
    }
    
    /**
     * 연결 정보 가져오기
     */
    getConnections() {
        return Array.from(this.connections.values());
    }
    
    /**
     * 연결 정보 설정
     */
    setConnections(connections) {
        // 기존 연결 제거
        this.connections.clear();
        this.connectionLines.forEach(line => line.remove());
        this.connectionLines.clear();
        
        // 새 연결 추가
        connections.forEach(connection => {
            this.connections.set(connection.id, connection);
            this.drawConnection(connection.from, connection.to);
        });
    }
    
    /**
     * 노드 이동 시 연결선 업데이트
     */
    updateNodeConnections(nodeId) {
        console.log(`노드 ${nodeId}의 연결선 업데이트 중...`);
        
        // 약간의 지연을 두고 업데이트 (DOM 업데이트 완료 후)
        setTimeout(() => {
            this.connections.forEach((connection, connectionId) => {
                if (connection.from === nodeId || connection.to === nodeId) {
                    console.log(`연결선 ${connectionId} 업데이트 중...`);
                    
                    // 연결선 다시 그리기
                    const line = this.connectionLines.get(connectionId);
                    if (line) {
                        line.remove();
                        this.connectionLines.delete(connectionId);
                    }
                    
                    // 새로운 연결선 그리기
                    this.drawConnection(connection.from, connection.to);
                }
            });
        }, 10);
    }
    
    updateNodeConnectionsImmediately(nodeId) {
        console.log(`노드 ${nodeId}의 연결선 즉시 업데이트 중...`);
        
        // 지연 없이 즉시 업데이트
        this.connections.forEach((connection, connectionId) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                console.log(`연결선 ${connectionId} 즉시 업데이트 중...`);
                
                // 연결선 다시 그리기
                const line = this.connectionLines.get(connectionId);
                if (line) {
                    line.remove();
                    this.connectionLines.delete(connectionId);
                }
                
                // 새로운 연결선 그리기
                this.drawConnection(connection.from, connection.to);
            }
        });
    }
    
    /**
     * 임시 연결선 업데이트 (롱터치용)
     * 마우스 이동 시 임시 연결선을 그립니다.
     */
    updateTempConnection(startX, startY, endX, endY) {
        // 기존 임시 연결선 제거
        if (this.tempConnection) {
            this.tempConnection.remove();
            this.tempConnection = null;
        }
        
        // 새로운 임시 연결선 생성
        this.tempConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempConnection.setAttribute('class', 'temp-connection-line');
        this.tempConnection.setAttribute('stroke', '#FF6B35');
        this.tempConnection.setAttribute('stroke-width', '2');
        this.tempConnection.setAttribute('fill', 'none');
        this.tempConnection.setAttribute('stroke-linecap', 'round');
        this.tempConnection.setAttribute('stroke-linejoin', 'round');
        this.tempConnection.setAttribute('stroke-dasharray', '5,5');
        this.tempConnection.style.pointerEvents = 'none';
        
        // 연결선 경로 생성 (베지어 곡선)
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        this.tempConnection.setAttribute('d', path);
        
        // SVG 컨테이너에 추가
        if (this.svgContainer) {
            this.svgContainer.appendChild(this.tempConnection);
        }
        
        console.log(`임시 연결선 업데이트: (${startX}, ${startY}) → (${endX}, ${endY})`);
    }
    
    /**
     * 임시 연결선 제거
     */
    removeTempConnection() {
        if (this.tempConnection) {
            this.tempConnection.remove();
            this.tempConnection = null;
            console.log('임시 연결선 제거됨');
        }
    }
}

// 전역으로 사용할 수 있도록 export
window.ConnectionManager = ConnectionManager;
