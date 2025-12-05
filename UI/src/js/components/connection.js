/**
 * 노드 간 연결을 관리하는 클래스
 * ES6 모듈 방식으로 작성됨
 */

/**
 * 로거 유틸리티 가져오기 (전역 fallback 포함)
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * ConnectionManager 클래스
 * 노드 간 연결선을 관리하고 그리는 역할을 담당합니다.
 */
export class ConnectionManager {
    constructor(workflowCanvas) {
        this.canvas = workflowCanvas;
        this.connections = new Map(); // 연결 정보 저장
        this.connectionLines = new Map(); // SVG 라인 요소 저장
        this.isConnecting = false;
        this.isUpdating = false; // 업데이트 중복 방지 플래그
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null; // 연결 시작 커넥터 타입
        this.startOutputType = null; // 조건 노드의 출력 타입
        this.tempLine = null;
        this.tempConnection = null; // 롱터치용 임시 연결 라인

        this.initSVG();
        this.bindEvents();
    }

    /**
     * SVG 요소 초기화
     * 무한 캔버스 모드에 맞게 SVG 컨테이너 설정
     */
    initSVG() {
        const logger = getLogger();

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

        // canvas-content가 있으면 그 안에 추가, 없으면 canvas에 추가
        const canvasContent = document.getElementById('canvas-content');
        if (canvasContent) {
            logger.log('[ConnectionManager] SVG를 canvas-content 안에 추가');
            canvasContent.appendChild(this.svgContainer);
        } else {
            logger.log('[ConnectionManager] SVG를 canvas에 추가 (canvas-content 없음)');
            this.canvas.appendChild(this.svgContainer);
        }

        // SVG 크기 초기 업데이트
        this.updateSVGSize();
    }

    /**
     * SVG 크기 업데이트
     * canvas-content와 동일한 크기로 설정 (SVG가 canvas-content 안에 있으므로)
     */
    updateSVGSize() {
        if (!this.svgContainer) {
            return;
        }

        const logger = getLogger();

        // 캔버스 콘텐츠 컨테이너 확인
        const canvasContent = document.getElementById('canvas-content');

        if (canvasContent) {
            // SVG가 canvas-content 안에 있으므로, canvas-content의 크기와 동일하게 설정
            // canvas-content는 무한 캔버스이므로 충분히 큰 크기로 설정
            const canvasContentStyle = window.getComputedStyle(canvasContent);

            // canvas-content의 실제 크기 가져오기 (CSS에서 설정된 크기)
            const width = parseFloat(canvasContentStyle.width) || 100000;
            const height = parseFloat(canvasContentStyle.height) || 100000;

            logger.log('[ConnectionManager] SVG 크기 업데이트:', { width, height });

            // SVG 크기를 canvas-content와 동일하게 설정
            this.svgContainer.setAttribute('width', width);
            this.svgContainer.setAttribute('height', height);
            this.svgContainer.style.width = width + 'px';
            this.svgContainer.style.height = height + 'px';
        } else {
            // 스크롤 기반 패닝(일반 방식)
            const canvasRect = this.canvas.getBoundingClientRect();

            // 캔버스 크기에 맞춰 SVG 크기 설정
            this.svgContainer.setAttribute('width', canvasRect.width);
            this.svgContainer.setAttribute('height', canvasRect.height);
            this.svgContainer.style.width = canvasRect.width + 'px';
            this.svgContainer.style.height = canvasRect.height + 'px';
        }
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 캔버스 클릭 이벤트(연결 취소용)
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
     * 노드 커넥터 클릭 이벤트 바인딩
     * 중복 등록 방지를 위해 데이터 속성으로 바인딩 여부 확인
     */
    bindNodeConnector(nodeElement) {
        const logger = getLogger();
        const nodeId = nodeElement.dataset.nodeId;

        if (!nodeElement) {
            logger.warn('[ConnectionManager] bindNodeConnector: nodeElement가 없습니다.');
            return;
        }

        logger.log('[ConnectionManager] bindNodeConnector 호출:', {
            nodeId: nodeId,
            hasInput: !!nodeElement.querySelector('.node-input'),
            hasOutput: !!nodeElement.querySelector('.node-output')
        });

        // 입력 커넥터
        const inputConnector = nodeElement.querySelector('.node-input');
        if (inputConnector) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newInputConnector = inputConnector.cloneNode(true);
            inputConnector.parentNode.replaceChild(newInputConnector, inputConnector);

            // 클릭 이벤트 (연결 시작/완료)
            newInputConnector.addEventListener('click', (e) => {
                e.stopPropagation();

                // 패닝 중일 때는 연결 시작 방지
                if (this.isPanning()) {
                    return;
                }
                logger.log('[ConnectionManager] 입력 커넥터 클릭:', nodeId);
                this.handleConnectorClick(nodeElement, 'input', newInputConnector);
            });

            // 더블클릭 이벤트 (연결 삭제)
            newInputConnector.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (this.isPanning()) {
                    return;
                }

                logger.log('[ConnectionManager] 입력 커넥터 더블클릭:', nodeId);
                // NodeManager의 handleConnectorDoubleClick 호출
                if (window.nodeManager && typeof window.nodeManager.handleConnectorDoubleClick === 'function') {
                    window.nodeManager.handleConnectorDoubleClick(newInputConnector, nodeElement, 'input');
                }
            });

            logger.log('[ConnectionManager] 입력 커넥터 바인딩 완료:', nodeId);
        } else {
            logger.warn('[ConnectionManager] 입력 커넥터를 찾을 수 없습니다:', nodeId);
        }

        // 일반 출력 커넥터
        const outputConnector = nodeElement.querySelector('.node-output:not(.true-output):not(.false-output)');
        if (outputConnector) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newOutputConnector = outputConnector.cloneNode(true);
            outputConnector.parentNode.replaceChild(newOutputConnector, outputConnector);

            // 클릭 이벤트 (연결 시작/완료)
            newOutputConnector.addEventListener('click', (e) => {
                e.stopPropagation();

                // 패닝 중일 때는 연결 시작 방지
                if (this.isPanning()) {
                    return;
                }
                logger.log('[ConnectionManager] 출력 커넥터 클릭:', nodeId);
                this.handleConnectorClick(nodeElement, 'output', newOutputConnector);
            });

            // 더블클릭 이벤트 (연결 삭제)
            newOutputConnector.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (this.isPanning()) {
                    return;
                }

                logger.log('[ConnectionManager] 출력 커넥터 더블클릭:', nodeId);
                // NodeManager의 handleConnectorDoubleClick 호출
                if (window.nodeManager && typeof window.nodeManager.handleConnectorDoubleClick === 'function') {
                    window.nodeManager.handleConnectorDoubleClick(newOutputConnector, nodeElement, 'output');
                }
            });

            logger.log('[ConnectionManager] 출력 커넥터 바인딩 완료:', nodeId);
        } else {
            logger.warn('[ConnectionManager] 출력 커넥터를 찾을 수 없습니다:', nodeId);
        }

        // 조건 노드용 True/False 출력 커넥터
        const trueOutput = nodeElement.querySelector('.true-output .output-dot');
        const falseOutput = nodeElement.querySelector('.false-output .output-dot');

        if (trueOutput) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newTrueOutput = trueOutput.cloneNode(true);
            trueOutput.parentNode.replaceChild(newTrueOutput, trueOutput);

            // 클릭 이벤트 (연결 시작/완료)
            newTrueOutput.addEventListener('click', (e) => {
                e.stopPropagation();

                if (this.isPanning()) {
                    return;
                }
                logger.log('[ConnectionManager] True 출력 커넥터 클릭:', nodeId);
                this.handleConnectorClick(nodeElement, 'output', newTrueOutput);
            });

            // 더블클릭 이벤트 (연결 삭제)
            newTrueOutput.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (this.isPanning()) {
                    return;
                }

                logger.log('[ConnectionManager] True 출력 커넥터 더블클릭:', nodeId);
                // NodeManager의 handleConnectorDoubleClick 호출
                if (window.nodeManager && typeof window.nodeManager.handleConnectorDoubleClick === 'function') {
                    window.nodeManager.handleConnectorDoubleClick(newTrueOutput, nodeElement, 'output');
                }
            });

            logger.log('[ConnectionManager] True 출력 커넥터 바인딩 완료:', nodeId);
        }

        if (falseOutput) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            const newFalseOutput = falseOutput.cloneNode(true);
            falseOutput.parentNode.replaceChild(newFalseOutput, falseOutput);

            // 클릭 이벤트 (연결 시작/완료)
            newFalseOutput.addEventListener('click', (e) => {
                e.stopPropagation();

                if (this.isPanning()) {
                    return;
                }
                logger.log('[ConnectionManager] False 출력 커넥터 클릭:', nodeId);
                this.handleConnectorClick(nodeElement, 'output', newFalseOutput);
            });

            // 더블클릭 이벤트 (연결 삭제)
            newFalseOutput.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (this.isPanning()) {
                    return;
                }

                logger.log('[ConnectionManager] False 출력 커넥터 더블클릭:', nodeId);
                // NodeManager의 handleConnectorDoubleClick 호출
                if (window.nodeManager && typeof window.nodeManager.handleConnectorDoubleClick === 'function') {
                    window.nodeManager.handleConnectorDoubleClick(newFalseOutput, nodeElement, 'output');
                }
            });

            logger.log('[ConnectionManager] False 출력 커넥터 바인딩 완료:', nodeId);
        }
    }

    /**
     * 노드 매니저의 패닝 상태 확인
     */
    isPanning() {
        // 노드 매니저의 패닝 상태를 전역에서 확인
        return window.nodeManager && window.nodeManager.isPanning;
    }

    /**
     * 커넥터 클릭 처리
     */
    handleConnectorClick(nodeElement, connectorType, connectorElement) {
        const logger = getLogger();
        const nodeId = nodeElement.dataset.nodeId;

        logger.log('[ConnectionManager] 커넥터 클릭:', {
            nodeId: nodeId,
            connectorType: connectorType,
            isConnecting: this.isConnecting,
            connectionsCount: this.connections.size
        });

        if (!this.isConnecting) {
            // 연결 모드가 아닐 때: 연결 시작
            // 출력 타입 감지 (조건 노드의 경우)
            let outputType = null;
            if (connectorType === 'output' && connectorElement) {
                if (connectorElement.classList.contains('true-output') || connectorElement.closest('.true-output')) {
                    outputType = 'true';
                } else if (
                    connectorElement.classList.contains('false-output') ||
                    connectorElement.closest('.false-output')
                ) {
                    outputType = 'false';
                }
            }

            // 조건 노드의 경우 .output-dot을 찾아서 사용
            let actualConnector = connectorElement;
            if (connectorType === 'output' && outputType) {
                // .true-output 또는 .false-output이 클릭된 경우, 내부의 .output-dot을 찾음
                if (
                    connectorElement.classList.contains('true-output') ||
                    connectorElement.classList.contains('false-output')
                ) {
                    const outputDot = connectorElement.querySelector('.output-dot');
                    if (outputDot) {
                        actualConnector = outputDot;
                        logger.log('[ConnectionManager] .output-dot 찾음:', {
                            original: connectorElement,
                            actual: actualConnector,
                            outputType: outputType
                        });
                    }
                }
            }

            // 연결 시작 (입력/출력 모두 시작점이 될 수 있음)
            // 이미 연결된 커넥터도 클릭하면 연결 모드 시작 가능
            this.startConnection(nodeElement, actualConnector, connectorType);
        } else {
            // 연결 모드 중일 때
            // 같은 커넥터를 다시 클릭하면 연결 취소
            if (
                this.startNode === nodeElement &&
                this.startConnectorType === connectorType &&
                this.startConnector === connectorElement
            ) {
                logger.log('[ConnectionManager] 같은 커넥터 클릭 - 연결 취소');
                this.cancelConnection();
                return;
            }

            // 다른 타입의 커넥터 + 다른 노드일 때: 연결 완료
            if (this.startConnectorType !== connectorType && this.startNode !== nodeElement) {
                this.completeConnection(nodeElement, connectorElement);
            } else {
                // 같은 타입이거나 같은 노드면 연결 취소
                logger.log('[ConnectionManager] 잘못된 연결 시도 - 연결 취소');
                this.cancelConnection();
            }
        }
    }

    /**
     * 커넥터가 이미 연결되어 있는지 확인
     * @param {string} nodeId - 노드 ID
     * @param {string} connectorType - 커넥터 타입 ('input' 또는 'output')
     * @param {string} outputType - 출력 타입 ('true', 'false', 또는 null) - 조건 노드의 경우에만 사용
     * @returns {boolean} 연결되어 있으면 true
     */
    isConnectorConnected(nodeId, connectorType, outputType = null) {
        const logger = getLogger();

        // 노드 ID를 문자열로 정규화 (숫자와 문자열 비교 문제 방지)
        const normalizedNodeId = String(nodeId).trim();

        logger.log('[ConnectionManager] isConnectorConnected 호출:', {
            nodeId: normalizedNodeId,
            connectorType: connectorType,
            outputType: outputType,
            connectionsSize: this.connections ? this.connections.size : 0
        });

        // connections가 없거나 비어있으면 연결되지 않음
        if (!this.connections || this.connections.size === 0) {
            logger.log('[ConnectionManager] isConnectorConnected: connections가 비어있음');
            return false;
        }

        // 모든 연결 정보 로그 출력 (디버깅용)
        const allConnections = Array.from(this.connections.entries()).map(([id, conn]) => ({
            id: id,
            from: String(conn.from || '').trim(),
            to: String(conn.to || '').trim(),
            outputType: conn.outputType || null
        }));

        logger.log('[ConnectionManager] isConnectorConnected: 모든 연결 정보:', allConnections);

        // connections Map을 순회하며 해당 노드의 커넥터가 사용되는지 확인
        for (const [connectionId, connection] of this.connections.entries()) {
            // 연결 정보의 노드 ID도 문자열로 정규화하여 비교
            const connectionFrom = String(connection.from || '').trim();
            const connectionTo = String(connection.to || '').trim();

            if (connectorType === 'input') {
                // input 커넥터: 해당 노드가 'to'로 사용되는 연결이 있는지 확인
                if (connectionTo === normalizedNodeId) {
                    logger.log('[ConnectionManager] ✅ isConnectorConnected: input 커넥터가 이미 연결됨', {
                        nodeId: normalizedNodeId,
                        connectionId: connectionId,
                        connection: connection,
                        connectionTo: connectionTo,
                        match: true
                    });
                    return true;
                }
            } else if (connectorType === 'output') {
                // output 커넥터: 해당 노드가 'from'으로 사용되는 연결이 있는지 확인
                // 조건 노드의 경우, 같은 outputType을 가진 연결만 확인
                if (connectionFrom === normalizedNodeId) {
                    if (outputType) {
                        // 조건 노드의 경우, 같은 outputType을 가진 연결만 확인
                        if (connection.outputType === outputType) {
                            logger.log(
                                '[ConnectionManager] ✅ isConnectorConnected: 조건 노드 output 커넥터가 이미 연결됨',
                                {
                                    nodeId: normalizedNodeId,
                                    outputType: outputType,
                                    connectionId: connectionId,
                                    connection: connection,
                                    connectionFrom: connectionFrom,
                                    match: true
                                }
                            );
                            return true;
                        }
                    } else {
                        // 일반 노드의 경우, outputType이 없으면 모든 연결 확인
                        logger.log('[ConnectionManager] ✅ isConnectorConnected: output 커넥터가 이미 연결됨', {
                            nodeId: normalizedNodeId,
                            connectionId: connectionId,
                            connection: connection,
                            connectionFrom: connectionFrom,
                            match: true
                        });
                        return true;
                    }
                }
            }
        }

        // 추가 확인: 실제로 화면에 그려진 연결선도 확인
        // connectionLines Map에서 해당 노드와 관련된 연결선이 있는지 확인
        let hasDrawnConnection = false;
        for (const [connectionId, line] of this.connectionLines.entries()) {
            const connection = this.connections.get(connectionId);
            if (connection) {
                const connectionFrom = String(connection.from || '').trim();
                const connectionTo = String(connection.to || '').trim();

                if (connectorType === 'input' && connectionTo === normalizedNodeId) {
                    hasDrawnConnection = true;
                    logger.log('[ConnectionManager] ✅ 화면에 그려진 연결선 발견 (input):', {
                        connectionId: connectionId,
                        connection: connection
                    });
                    break;
                } else if (connectorType === 'output' && connectionFrom === normalizedNodeId) {
                    // 조건 노드의 경우, 같은 outputType을 가진 연결만 확인
                    if (outputType) {
                        if (connection.outputType === outputType) {
                            hasDrawnConnection = true;
                            logger.log('[ConnectionManager] ✅ 화면에 그려진 연결선 발견 (조건 노드 output):', {
                                connectionId: connectionId,
                                connection: connection,
                                outputType: outputType
                            });
                            break;
                        }
                    } else {
                        // 일반 노드의 경우, outputType이 없으면 모든 연결 확인
                        hasDrawnConnection = true;
                        logger.log('[ConnectionManager] ✅ 화면에 그려진 연결선 발견 (output):', {
                            connectionId: connectionId,
                            connection: connection
                        });
                        break;
                    }
                }
            }
        }

        if (hasDrawnConnection) {
            logger.log('[ConnectionManager] ⚠️ connections Map에는 없지만 화면에 연결선이 있음 - 연결된 것으로 간주');
            return true;
        }

        logger.log('[ConnectionManager] ❌ isConnectorConnected: 연결되지 않음', {
            nodeId: normalizedNodeId,
            connectorType: connectorType,
            allConnections: allConnections,
            searchedFor: connectorType === 'input' ? `to === "${normalizedNodeId}"` : `from === "${normalizedNodeId}"`,
            connectionLinesCount: this.connectionLines ? this.connectionLines.size : 0
        });
        return false;
    }

    /**
     * 연결 시작
     */
    startConnection(nodeElement, connectorElement, connectorType) {
        const logger = getLogger();
        const nodeId = nodeElement.dataset.nodeId || nodeElement.id;

        logger.log('[ConnectionManager] ========== 연결 시작 호출 ==========');
        logger.log('[ConnectionManager] 연결 시작 호출:', {
            nodeId: nodeId,
            connectorType: connectorType,
            connectorElement: connectorElement,
            connectorClasses: connectorElement.className,
            nodeElement: nodeElement,
            nodeStyleLeft: nodeElement.style.left,
            nodeStyleTop: nodeElement.style.top
        });

        // 출력 타입 감지 (조건 노드의 경우)
        // .output-dot이 클릭된 경우 부모 요소(.true-output 또는 .false-output)를 확인
        let outputType = null;
        if (connectorType === 'output' && connectorElement) {
            if (connectorElement.classList.contains('true-output') || connectorElement.closest('.true-output')) {
                outputType = 'true';
            } else if (
                connectorElement.classList.contains('false-output') ||
                connectorElement.closest('.false-output')
            ) {
                outputType = 'false';
            }
        }

        logger.log('[ConnectionManager] 연결 시작 진행:', {
            nodeId: nodeId,
            connectorType: connectorType,
            outputType: outputType
        });

        this.isConnecting = true;
        this.startNode = nodeElement;
        this.startConnector = connectorElement;
        this.startConnectorType = connectorType; // 시작 커넥터 타입 저장
        this.startOutputType = outputType; // 조건 노드의 출력 타입 저장

        // 시작 커넥터 스타일 표시
        connectorElement.classList.add('connecting');

        // 커넥터 위치 미리 계산해서 로그 출력
        const testPos = this.getConnectorPosition(connectorElement);
        logger.log('[ConnectionManager] startConnection에서 커넥터 위치 테스트:', {
            testPos: testPos,
            nodeId: nodeId,
            connectorType: connectorType,
            outputType: outputType
        });

        // 임시 연결선 생성
        this.createTempLine();

        // 마우스 이동 이벤트 등록
        const boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.canvas.addEventListener('mousemove', boundHandleMouseMove);

        // 이벤트 핸들러 저장 (나중에 제거하기 위해)
        this._tempMouseMoveHandler = boundHandleMouseMove;

        logger.log('[ConnectionManager] ========== 연결 시작 완료 ==========');
    }

    /**
     * 연결 완료
     */
    completeConnection(targetNodeElement, targetConnectorElement) {
        const logger = getLogger();
        const startNodeId = this.startNode.dataset.nodeId;
        const targetNodeId = targetNodeElement.dataset.nodeId;

        logger.log('[ConnectionManager] ========== 연결 완료 ==========');
        logger.log('[ConnectionManager] 연결 완료 호출:', {
            startNodeId: startNodeId,
            startConnectorType: this.startConnectorType,
            targetNodeId: targetNodeId,
            targetConnectorType: targetConnectorElement.classList.contains('node-input')
                ? 'input'
                : targetConnectorElement.classList.contains('node-output')
                  ? 'output'
                  : 'unknown'
        });

        // 자기 자신으로의 연결 방지
        if (startNodeId === targetNodeId) {
            logger.warn('[ConnectionManager] 자기 자신으로의 연결 시도 - 취소');
            this.cancelConnection();
            return;
        }

        // 연결 방향 결정
        // 출력 -> 입력 방향으로만 연결 가능
        let fromNodeId, toNodeId;

        if (this.startConnectorType === 'output' && targetConnectorElement.classList.contains('node-input')) {
            // 시작: 출력, 타겟: 입력 -> start -> target (정상)
            fromNodeId = startNodeId;
            toNodeId = targetNodeId;
            logger.log('[ConnectionManager] 연결 방향: 출력 -> 입력 (정상)', {
                from: fromNodeId,
                to: toNodeId
            });
        } else if (this.startConnectorType === 'input' && targetConnectorElement.classList.contains('node-output')) {
            // 시작: 입력, 타겟: 출력 -> target -> start (반대)
            fromNodeId = targetNodeId;
            toNodeId = startNodeId;
            logger.log('[ConnectionManager] 연결 방향: 입력 -> 출력 (반대로 변환)', {
                original: { from: startNodeId, to: targetNodeId },
                corrected: { from: fromNodeId, to: toNodeId }
            });
        } else {
            // 잘못된 연결 타입 조합
            logger.warn('[ConnectionManager] 잘못된 연결 타입 조합:', {
                startType: this.startConnectorType,
                targetType: targetConnectorElement.classList.contains('node-input')
                    ? 'input'
                    : targetConnectorElement.classList.contains('node-output')
                      ? 'output'
                      : 'unknown'
            });
            this.cancelConnection();
            return;
        }

        // 기존 연결 확인 및 삭제 (덮어쓰기)
        const connectionId = `${fromNodeId}-${toNodeId}`;
        if (this.connections.has(connectionId)) {
            logger.log('[ConnectionManager] 기존 연결 발견 - 덮어쓰기:', {
                connectionId: connectionId
            });
            this.deleteConnection(connectionId);
        }

        // 입력 커넥터에 기존 연결이 있으면 삭제 (입력은 하나만 연결 가능)
        const existingInputConnections = Array.from(this.connections.values()).filter((conn) => conn.to === toNodeId);
        existingInputConnections.forEach((conn) => {
            logger.log('[ConnectionManager] 입력 커넥터 기존 연결 삭제:', {
                connectionId: conn.id || `${conn.from}-${conn.to}`,
                from: conn.from,
                to: conn.to
            });
            this.deleteConnection(conn.id || `${conn.from}-${conn.to}`);
        });

        // 출력 타입 감지 (조건 노드의 경우) - 검증 전에 먼저 감지
        // .output-dot이 클릭된 경우 부모 요소(.true-output 또는 .false-output)를 확인
        let outputType = null;
        if (this.startConnectorType === 'output') {
            const startConnector = this.startConnector;
            if (startConnector) {
                if (startConnector.classList.contains('true-output') || startConnector.closest('.true-output')) {
                    outputType = 'true';
                } else if (
                    startConnector.classList.contains('false-output') ||
                    startConnector.closest('.false-output')
                ) {
                    outputType = 'false';
                }
            }
        } else if (this.startConnectorType === 'input' && targetConnectorElement.classList.contains('node-output')) {
            // 입력에서 출력으로 연결하는 경우 (반대 방향)
            if (
                targetConnectorElement.classList.contains('true-output') ||
                targetConnectorElement.closest('.true-output')
            ) {
                outputType = 'true';
            } else if (
                targetConnectorElement.classList.contains('false-output') ||
                targetConnectorElement.closest('.false-output')
            ) {
                outputType = 'false';
            }
        }

        // 출력 연결 개수 검증 (조건 노드 제외)
        // fromNodeId에서 나가는 연결 개수 확인
        // 조건 노드의 경우, 같은 outputType을 가진 연결만 카운트
        const fromNodeElement = document.querySelector(`[data-node-id="${fromNodeId}"]`);
        const nodeType = fromNodeElement ? fromNodeElement.dataset.nodeType : null;
        const isConditionNode = nodeType === 'condition';

        let existingOutputConnections = Array.from(this.connections.values()).filter(
            (conn) => conn.from === fromNodeId
        );

        // 조건 노드인 경우, 같은 outputType을 가진 연결만 카운트
        if (isConditionNode && outputType) {
            existingOutputConnections = existingOutputConnections.filter((conn) => conn.outputType === outputType);
        }

        logger.log('[ConnectionManager] 출력 연결 검증:', {
            fromNodeId: fromNodeId,
            nodeType: nodeType,
            isCondition: isConditionNode,
            outputType: outputType,
            existingOutputConnections: existingOutputConnections.length,
            existingConnections: existingOutputConnections.map(
                (c) => `${c.from} → ${c.to} (${c.outputType || 'default'})`
            )
        });

        // 노드 타입 확인 (조건 노드가 아닌 경우 출력은 최대 1개만 허용)
        if (fromNodeElement) {
            logger.log('[ConnectionManager] 노드 타입 확인:', {
                fromNodeId: fromNodeId,
                nodeType: nodeType,
                isCondition: isConditionNode,
                existingCount: existingOutputConnections.length
            });

            // 조건 노드는 출력 연결 개수 제한 없음 (각 outputType별로 독립적)
            // 조건 노드가 아니고 이미 출력 연결이 있는 경우: 기존 연결 삭제 (덮어쓰기)
            if (!isConditionNode && existingOutputConnections.length >= 1) {
                logger.log('[ConnectionManager] 조건 노드가 아닌 노드의 기존 출력 연결 삭제:', {
                    nodeId: fromNodeId,
                    nodeType: nodeType || 'undefined',
                    existingConnections: existingOutputConnections.length,
                    existingConnectionsList: existingOutputConnections.map((c) => `${c.from} → ${c.to}`)
                });

                // 기존 출력 연결 삭제
                existingOutputConnections.forEach((conn) => {
                    const connId = conn.id || `${conn.from}-${conn.to}`;
                    logger.log('[ConnectionManager] 출력 커넥터 기존 연결 삭제:', {
                        connectionId: connId,
                        from: conn.from,
                        to: conn.to
                    });
                    this.deleteConnection(connId);
                });
            }
        } else {
            // 노드 요소를 찾을 수 없어도 기존 연결이 있으면 삭제
            if (existingOutputConnections.length >= 1) {
                logger.log('[ConnectionManager] 노드 요소를 찾을 수 없지만 기존 연결 삭제:', {
                    fromNodeId: fromNodeId,
                    existingConnections: existingOutputConnections.length
                });

                // 기존 출력 연결 삭제
                existingOutputConnections.forEach((conn) => {
                    const connId = conn.id || `${conn.from}-${conn.to}`;
                    this.deleteConnection(connId);
                });
            }
        }

        // 연결 생성
        logger.log('[ConnectionManager] 연결 생성:', {
            from: fromNodeId,
            to: toNodeId,
            connectionId: connectionId,
            outputType: outputType
        });
        this.createConnection(fromNodeId, toNodeId, outputType);

        // 연결 완료 처리
        this.finishConnection();

        // 도착 커넥터 스타일 표시
        targetConnectorElement.classList.add('connected');

        logger.log('[ConnectionManager] ========== 연결 완료 성공 ==========');
    }

    /**
     * 연결 취소
     */
    cancelConnection() {
        const logger = getLogger();
        logger.log('[ConnectionManager] 연결 취소');

        this.isConnecting = false;

        // 시작 커넥터 상태 복원
        if (this.startConnector) {
            this.startConnector.classList.remove('connecting');
        }

        // 임시 연결선 제거
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }

        // 마우스 이동 이벤트 제거
        if (this._tempMouseMoveHandler) {
            this.canvas.removeEventListener('mousemove', this._tempMouseMoveHandler);
            this._tempMouseMoveHandler = null;
        }

        // 연결 시작 정보 초기화
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null;
        this.startOutputType = null;
    }

    /**
     * 연결 완료 후 정리 처리
     */
    finishConnection() {
        this.isConnecting = false;

        // 시작 커넥터 상태 복원
        if (this.startConnector) {
            this.startConnector.classList.remove('connecting');
        }

        // 임시 연결선 제거
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }

        // 마우스 이동 이벤트 제거
        if (this._tempMouseMoveHandler) {
            this.canvas.removeEventListener('mousemove', this._tempMouseMoveHandler);
            this._tempMouseMoveHandler = null;
        }

        // 연결 시작 정보 초기화
        this.startNode = null;
        this.startConnector = null;
        this.startConnectorType = null;
        this.startOutputType = null;
    }

    /**
     * 마우스 이동 처리
     * 임시 연결선을 마우스 위치에 맞게 업데이트
     */
    handleMouseMove(e) {
        if (!this.tempLine || !this.startConnector) {
            return;
        }

        const logger = getLogger();

        // 마우스 위치를 canvas-content 기준 좌표로 변환
        const canvasContent = document.getElementById('canvas-content');
        const canvas = this.canvas;

        if (!canvas) {
            logger.warn('[ConnectionManager] handleMouseMove: canvas가 없습니다.');
            return;
        }

        let mouseX, mouseY;

        if (canvasContent) {
            // canvas-content 기준 좌표 계산
            const canvasRect = canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX;
            const mouseScreenY = e.clientY;

            // 화면 좌표를 canvas 기준 좌표로 변환
            const mouseCanvasX = mouseScreenX - canvasRect.left;
            const mouseCanvasY = mouseScreenY - canvasRect.top;

            // Transform 정보 가져오기
            const transform = canvasContent.style.transform || 'translate(0px, 0px) scale(1)';
            let transformX = 0,
                transformY = 0,
                scale = 1;

            const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (translateMatch) {
                transformX = parseFloat(translateMatch[1]) || 0;
                transformY = parseFloat(translateMatch[2]) || 0;
            }

            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                scale = parseFloat(scaleMatch[1]) || 1;
            }

            // canvas-content 기준 좌표로 변환
            // Transform을 역으로 적용: (mouseCanvas - transform) / scale
            mouseX = (mouseCanvasX - transformX) / scale;
            mouseY = (mouseCanvasY - transformY) / scale;

            logger.log('[ConnectionManager] 마우스 위치 변환:', {
                screen: { x: mouseScreenX, y: mouseScreenY },
                canvas: { x: mouseCanvasX, y: mouseCanvasY },
                transform: { x: transformX, y: transformY, scale: scale },
                content: { x: mouseX, y: mouseY }
            });
        } else {
            // 스크롤 기반 모드
            const canvasRect = canvas.getBoundingClientRect();
            mouseX = e.clientX - canvasRect.left;
            mouseY = e.clientY - canvasRect.top;
        }

        // 시작 커넥터 좌표 (이미 canvas-content 기준)
        const startPos = this.getConnectorPosition(this.startConnector);

        if (!startPos || isNaN(startPos.x) || isNaN(startPos.y)) {
            logger.warn('[ConnectionManager] 유효하지 않은 시작 커넥터 위치:', startPos);
            return;
        }

        if (isNaN(mouseX) || isNaN(mouseY)) {
            logger.warn('[ConnectionManager] 유효하지 않은 마우스 위치:', { x: mouseX, y: mouseY });
            return;
        }

        // 모든 노드의 임시 연결선에서 마우스 커서 위치(끝점) 보정
        // x좌표를 +10만큼 조정 (하드코딩)
        //
        // 용어 설명:
        // - canvas: 워크플로우 캔버스 컨테이너 (workflow-canvas)
        // - canvas-content: canvas 안에 있는 div 요소로, 노드들이 배치되는 실제 컨텐츠 영역
        //   transform(translate, scale)이 적용되어 무한 캔버스와 줌 기능을 구현함
        // - SVG: Scalable Vector Graphics, 연결선을 그리기 위한 벡터 그래픽 요소
        //   SVG는 canvas-content 안에 배치되어 있어서 canvas-content의 좌표계를 사용함
        //
        // 원인:
        // - 실제 연결선은 getConnectorPosition()으로 두 커넥터 위치를 모두 계산하므로 정확함
        // - 임시 연결선은 시작 커넥터는 getConnectorPosition()을 사용하지만, 마우스 위치는 직접 계산함
        // - 마우스 위치 변환 공식: mouseX = (mouseCanvasX - transformX) / scale
        //   * mouseCanvasX: 마우스 화면 좌표에서 canvas의 왼쪽 상단을 뺀 값 (canvas 기준 좌표)
        //   * transformX: canvas-content에 적용된 translate X 값
        //   * scale: canvas-content에 적용된 scale 값
        //   * 계산 과정: canvas 좌표에서 transform의 translate를 빼고, scale로 나눠서 canvas-content 로컬 좌표로 변환
        // - 이 변환 과정에서 canvas와 canvas-content의 좌표계 차이로 인해 약 10픽셀 정도의 오차 발생
        // - canvas-content에 transform이 적용되어 있고, SVG가 canvas-content 안에 있어서
        //   좌표 변환 시 미세한 오차가 발생하는 것으로 추정됨
        // - 실제 연결선은 두 커넥터 모두 같은 방식(getConnectorPosition)으로 계산하므로 오차가 없음
        const adjustedMouseX = mouseX - -10; // mouseX + 10과 동일

        logger.log('[ConnectionManager] 임시 연결선 업데이트:', {
            start: startPos,
            end: { x: adjustedMouseX, y: mouseY },
            originalMouse: { x: mouseX, y: mouseY }
        });

        // 임시 연결선 업데이트 (보정된 마우스 위치 사용)
        this.updateTempLine(startPos.x, startPos.y, adjustedMouseX, mouseY);
    }

    /**
     * 커넥터 위치 계산
     * canvas-content 기준 좌표로 계산 (SVG가 canvas-content 안에 있으므로)
     * 서버에서 받은 노드 좌표(style.left, style.top)를 기준으로 계산
     */
    getConnectorPosition(connectorElement) {
        const logger = getLogger();

        // 캔버스 콘텐츠 컨테이너 확인
        const canvasContent = document.getElementById('canvas-content');

        if (canvasContent) {
            // 커넥터의 부모 노드 찾기
            const nodeElement = connectorElement.closest('.workflow-node');
            if (!nodeElement) {
                logger.warn('[ConnectionManager] 노드를 찾을 수 없음');
                return { x: 0, y: 0 };
            }

            // 노드의 canvas-content 기준 위치 가져오기 (서버에서 받은 좌표)
            const nodeLeft = parseFloat(nodeElement.style.left) || 0;
            const nodeTop = parseFloat(nodeElement.style.top) || 0;

            // 노드의 실제 크기 (렌더링된 크기)
            // offsetWidth/offsetHeight가 0이면 getBoundingClientRect 사용
            let nodeWidth = nodeElement.offsetWidth;
            let nodeHeight = nodeElement.offsetHeight;

            if (nodeWidth === 0 || nodeHeight === 0) {
                const nodeRect = nodeElement.getBoundingClientRect();
                nodeWidth = nodeRect.width;
                nodeHeight = nodeRect.height;
            }

            // 커넥터 타입 확인 (input 또는 output)
            const isInput = connectorElement.classList.contains('node-input');
            const isOutput =
                connectorElement.classList.contains('node-output') || connectorElement.classList.contains('output-dot');
            const isOutputDot = connectorElement.classList.contains('output-dot');

            // 디버그 로그
            if (isOutputDot) {
                logger.log('[ConnectionManager] getConnectorPosition: output-dot 감지됨', {
                    connectorElement: connectorElement,
                    className: connectorElement.className,
                    isOutputDot: isOutputDot
                });
            }

            // 커넥터의 노드 내부 상대 위치 계산
            // CSS: input은 left: -6px, output은 right: -6px, 둘 다 top: 50% + translateY(-50%)
            let connectorOffsetX, connectorOffsetY;

            if (isInput) {
                // input 커넥터: 노드 왼쪽 밖 -6px, 세로 중앙
                // 커넥터 중심이 노드 왼쪽에서 -6px 위치
                connectorOffsetX = -6;
                // top: 50% + translateY(-50%) = 노드 세로 중앙
                connectorOffsetY = nodeHeight / 2;
            } else if (isOutputDot) {
                // 조건 노드의 output-dot: 실제 DOM 위치를 사용하여 정확한 위치 계산
                // getBoundingClientRect를 사용하여 실제 렌더링된 위치를 가져옴
                const connectorRect = connectorElement.getBoundingClientRect();
                const nodeRect = nodeElement.getBoundingClientRect();

                // 커넥터 중심의 노드 내부 상대 위치 (노드의 왼쪽 상단 기준)
                // 화면 좌표 차이를 사용하여 상대 위치 계산
                // connectorRect와 nodeRect는 모두 화면 좌표이므로, 차이는 노드 내부 상대 위치
                const connectorCenterX = connectorRect.left + connectorRect.width / 2;
                const connectorCenterY = connectorRect.top + connectorRect.height / 2;
                const nodeLeft = nodeRect.left;
                const nodeTop = nodeRect.top;

                connectorOffsetX = connectorCenterX - nodeLeft;
                connectorOffsetY = connectorCenterY - nodeTop;

                logger.log('[ConnectionManager] output-dot 위치 계산:', {
                    connectorRect: {
                        left: connectorRect.left,
                        top: connectorRect.top,
                        width: connectorRect.width,
                        height: connectorRect.height
                    },
                    nodeRect: {
                        left: nodeRect.left,
                        top: nodeRect.top,
                        width: nodeRect.width,
                        height: nodeRect.height
                    },
                    connectorCenter: { x: connectorCenterX, y: connectorCenterY },
                    connectorOffset: { x: connectorOffsetX, y: connectorOffsetY }
                });
            } else if (isOutput) {
                // 일반 output 커넥터: 노드 오른쪽 밖 +6px, 세로 중앙
                // right: -6px = 노드 오른쪽에서 -6px = 노드 왼쪽에서 nodeWidth + 6px
                connectorOffsetX = nodeWidth + 6;
                // top: 50% + translateY(-50%) = 노드 세로 중앙
                connectorOffsetY = nodeHeight / 2;
            } else {
                // 알 수 없는 타입이면 getBoundingClientRect로 실제 위치 계산
                const connectorRect = connectorElement.getBoundingClientRect();
                const nodeRect = nodeElement.getBoundingClientRect();

                // 커넥터 중심의 노드 내부 상대 위치 (노드의 왼쪽 상단 기준)
                // 화면 좌표 차이를 사용하여 상대 위치 계산
                connectorOffsetX = connectorRect.left + connectorRect.width / 2 - nodeRect.left;
                connectorOffsetY = connectorRect.top + connectorRect.height / 2 - nodeRect.top;
            }

            // canvas-content 기준 절대 위치
            // 서버 좌표(style.left/top) + 커넥터 상대 위치
            const absoluteX = nodeLeft + connectorOffsetX;
            const absoluteY = nodeTop + connectorOffsetY;

            logger.log('[ConnectionManager] getConnectorPosition:', {
                nodeId: nodeElement.dataset.nodeId || nodeElement.id,
                nodeServerPosition: { left: nodeLeft, top: nodeTop },
                nodeRenderedSize: { width: nodeWidth, height: nodeHeight },
                connectorType: isInput ? 'input' : isOutput ? 'output' : 'unknown',
                connectorOffset: { x: connectorOffsetX, y: connectorOffsetY },
                absolutePosition: { x: absoluteX, y: absoluteY }
            });

            return { x: absoluteX, y: absoluteY };
        } else {
            // 스크롤 기반 일반 모드
            const rect = connectorElement.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();

            // 캔버스 내 상대 좌표(커넥터 중심)
            const relativeX = rect.left - canvasRect.left + rect.width / 2;
            const relativeY = rect.top - canvasRect.top + rect.height / 2;

            logger.log('[ConnectionManager] getConnectorPosition (scroll mode):', {
                relative: { x: relativeX, y: relativeY }
            });

            return { x: relativeX, y: relativeY };
        }
    }

    /**
     * 임시 연결선 생성
     */
    createTempLine() {
        const logger = getLogger();

        logger.log('[ConnectionManager] ========== createTempLine 시작 ==========');

        if (!this.startConnector) {
            logger.warn('[ConnectionManager] createTempLine: startConnector가 없습니다.');
            return;
        }

        if (!this.startNode) {
            logger.warn('[ConnectionManager] createTempLine: startNode가 없습니다.');
            return;
        }

        const nodeId = this.startNode.dataset.nodeId || this.startNode.id;
        const connectorType = this.startConnectorType;
        const outputType = this.startOutputType || null; // 조건 노드의 출력 타입

        logger.log('[ConnectionManager] createTempLine: 기본 정보:', {
            nodeId: nodeId,
            connectorType: connectorType,
            outputType: outputType,
            startNode: this.startNode,
            startConnector: this.startConnector,
            nodeStyleLeft: this.startNode.style.left,
            nodeStyleTop: this.startNode.style.top,
            connectorClasses: this.startConnector.className
        });

        if (!this.svgContainer) {
            logger.warn('[ConnectionManager] createTempLine: svgContainer가 없습니다.');
            return;
        }

        logger.log('[ConnectionManager] createTempLine: SVG 컨테이너 확인:', {
            svgContainer: this.svgContainer,
            svgContainerParent: this.svgContainer.parentElement,
            svgContainerId: this.svgContainer.id
        });

        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempLine.setAttribute('stroke', '#ff6b35');
        this.tempLine.setAttribute('stroke-width', '3');
        this.tempLine.setAttribute('fill', 'none');
        this.tempLine.setAttribute('stroke-dasharray', '5,5');
        this.tempLine.style.pointerEvents = 'none';

        this.svgContainer.appendChild(this.tempLine);
        logger.log('[ConnectionManager] createTempLine: SVG path 요소 생성 및 추가 완료');

        // 즉시 커넥터 위치 계산 (requestAnimationFrame 없이)
        // 일반 연결선과 동일한 방식으로 계산
        logger.log('[ConnectionManager] createTempLine: 커넥터 위치 계산 시작', {
            startConnector: this.startConnector,
            connectorClasses: this.startConnector.className,
            isOutputDot: this.startConnector.classList.contains('output-dot'),
            closestTrueOutput: this.startConnector.closest('.true-output'),
            closestFalseOutput: this.startConnector.closest('.false-output')
        });
        const startPos = this.getConnectorPosition(this.startConnector);

        logger.log('[ConnectionManager] ========== createTempLine: 위치 계산 결과 ==========');
        logger.log('[ConnectionManager] 임시 연결선 생성 - 위치 계산:', {
            startConnector: this.startConnector,
            startNode: this.startNode,
            startPos: startPos,
            svgContainer: this.svgContainer,
            connectorClasses: this.startConnector.className,
            nodeId: nodeId,
            nodeStyleLeft: this.startNode.style.left,
            nodeStyleTop: this.startNode.style.top
        });

        if (!startPos || isNaN(startPos.x) || isNaN(startPos.y)) {
            logger.error('[ConnectionManager] ❌ 유효하지 않은 시작 위치:', startPos);
            // DOM 업데이트 후 다시 시도
            requestAnimationFrame(() => {
                logger.log('[ConnectionManager] createTempLine: 재시도 시작');
                const retryPos = this.getConnectorPosition(this.startConnector);
                logger.log('[ConnectionManager] createTempLine: 재시도 위치:', retryPos);
                if (retryPos && !isNaN(retryPos.x) && !isNaN(retryPos.y)) {
                    logger.log('[ConnectionManager] ✅ 재시도 후 위치 계산 성공:', retryPos);
                    this.updateTempLine(retryPos.x, retryPos.y, retryPos.x, retryPos.y);
                } else {
                    logger.error('[ConnectionManager] ❌ 재시도 후에도 위치 계산 실패:', retryPos);
                }
            });
            return;
        }

        logger.log('[ConnectionManager] ✅ 유효한 시작 위치 확인, 임시 연결선 초기화:', {
            startPos: startPos,
            initialPath: `M ${startPos.x} ${startPos.y} C ${startPos.x} ${startPos.y}, ${startPos.x} ${startPos.y}, ${startPos.x} ${startPos.y}`
        });

        // 초기에는 시작점과 같은 위치로 설정 (마우스 이동하면서 업데이트)
        this.updateTempLine(startPos.x, startPos.y, startPos.x, startPos.y);

        logger.log('[ConnectionManager] ========== createTempLine 완료 ==========');
    }

    /**
     * 임시 연결선 업데이트
     */
    updateTempLine(x1, y1, x2, y2) {
        const logger = getLogger();

        if (!this.tempLine) {
            logger.warn('[ConnectionManager] updateTempLine: tempLine이 없습니다.');
            return;
        }

        // 좌표 유효성 체크
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            logger.warn('[ConnectionManager] updateTempLine: 유효하지 않은 좌표:', { x1, y1, x2, y2 });
            return;
        }

        const path = this.createCurvedPath(x1, y1, x2, y2);
        this.tempLine.setAttribute('d', path);

        logger.log('[ConnectionManager] 임시 연결선 경로 업데이트:', {
            from: { x: x1, y: y1 },
            to: { x: x2, y: y2 },
            path: path
        });
    }

    /**
     * 연결 생성
     */
    createConnection(fromNodeId, toNodeId, outputType = null) {
        const logger = getLogger();
        const connectionId = `${fromNodeId}-${toNodeId}`;

        // 입력 커넥터에 기존 연결이 있으면 삭제 (입력은 하나만 연결 가능)
        const existingInputConnections = Array.from(this.connections.values()).filter((conn) => conn.to === toNodeId);

        if (existingInputConnections.length > 0) {
            logger.log('[ConnectionManager] createConnection: 입력 커넥터 기존 연결 삭제:', {
                toNodeId: toNodeId,
                existingConnections: existingInputConnections.length,
                existingConnectionsList: existingInputConnections.map((c) => `${c.from} → ${c.to}`)
            });

            // 기존 입력 연결 삭제
            existingInputConnections.forEach((conn) => {
                const connId = conn.id || `${conn.from}-${conn.to}`;
                this.deleteConnection(connId);
            });
        }

        // 출력 연결 개수 검증 (조건 노드 제외) - createConnection에서도 재검증
        // 조건 노드의 경우, 같은 outputType을 가진 연결만 카운트
        const fromNodeElement = document.querySelector(`[data-node-id="${fromNodeId}"]`);
        const nodeType = fromNodeElement ? fromNodeElement.dataset.nodeType : null;
        const isConditionNode = nodeType === 'condition';

        let existingOutputConnections = Array.from(this.connections.values()).filter(
            (conn) => conn.from === fromNodeId
        );

        // 조건 노드인 경우, 같은 outputType을 가진 연결만 카운트
        if (isConditionNode && outputType) {
            existingOutputConnections = existingOutputConnections.filter((conn) => conn.outputType === outputType);
        }

        logger.log('[ConnectionManager] createConnection 출력 연결 검증:', {
            fromNodeId: fromNodeId,
            nodeType: nodeType,
            isCondition: isConditionNode,
            outputType: outputType,
            existingOutputConnections: existingOutputConnections.length,
            existingConnections: existingOutputConnections.map(
                (c) => `${c.from} → ${c.to} (${c.outputType || 'default'})`
            )
        });

        // 노드 타입 확인 (조건 노드가 아닌 경우 출력은 최대 1개만 허용)
        if (fromNodeElement) {
            logger.log('[ConnectionManager] createConnection 노드 타입 확인:', {
                fromNodeId: fromNodeId,
                nodeType: nodeType,
                isCondition: isConditionNode,
                existingCount: existingOutputConnections.length
            });

            // 조건 노드는 출력 연결 개수 제한 없음 (각 outputType별로 독립적)
            // 조건 노드가 아니고 이미 출력 연결이 있는 경우: 기존 연결 삭제 (덮어쓰기)
            if (!isConditionNode && existingOutputConnections.length >= 1) {
                logger.log('[ConnectionManager] createConnection: 조건 노드가 아닌 노드의 기존 출력 연결 삭제:', {
                    nodeId: fromNodeId,
                    nodeType: nodeType || 'undefined',
                    existingConnections: existingOutputConnections.length,
                    existingConnectionsList: existingOutputConnections.map((c) => `${c.from} → ${c.to}`)
                });

                // 기존 출력 연결 삭제
                existingOutputConnections.forEach((conn) => {
                    const connId = conn.id || `${conn.from}-${conn.to}`;
                    this.deleteConnection(connId);
                });
            }
        } else {
            // 노드 요소를 찾을 수 없어도 기존 연결이 있으면 삭제
            if (existingOutputConnections.length >= 1) {
                logger.log('[ConnectionManager] createConnection: 노드 요소를 찾을 수 없지만 기존 연결 삭제:', {
                    fromNodeId: fromNodeId,
                    existingConnections: existingOutputConnections.length
                });

                // 기존 출력 연결 삭제
                existingOutputConnections.forEach((conn) => {
                    const connId = conn.id || `${conn.from}-${conn.to}`;
                    this.deleteConnection(connId);
                });
            }
        }

        // 연결 정보 저장 (조건 노드의 경우 출력 타입 포함)
        const connectionData = {
            id: connectionId,
            from: fromNodeId,
            to: toNodeId,
            outputType: outputType || null // 'true', 'false', 또는 null
        };
        this.connections.set(connectionId, connectionData);

        // 연결선 그리기 (출력 타입 전달)
        this.drawConnection(fromNodeId, toNodeId, outputType || null);

        // 연결 생성 이벤트 발생
        this.canvas.dispatchEvent(
            new CustomEvent('connectionCreated', {
                detail: { from: fromNodeId, to: toNodeId }
            })
        );
    }

    /**
     * 연결 전체 업데이트
     * 노드 이동/캔버스 변화 시 연결들을 다시 그린다
     */
    updateConnections() {
        // 이미 업데이트 중이면 중복 호출 방지
        if (this.isUpdating) {
            return;
        }

        this.isUpdating = true;

        try {
            // SVG 크기 업데이트
            this.updateSVGSize();

            // 모든 연결 다시 그리기
            this.redrawAllConnections();
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * 연결선 그리기
     */
    drawConnection(fromNodeId, toNodeId, outputType = null) {
        const fromNode = this.canvas.querySelector(`[data-node-id="${fromNodeId}"]`);
        const toNode = this.canvas.querySelector(`[data-node-id="${toNodeId}"]`);

        const logger = getLogger();

        if (!fromNode || !toNode) {
            logger.warn('[ConnectionManager] 노드를 찾을 수 없습니다:', { fromNodeId, toNodeId });
            logger.warn('[ConnectionManager] fromNode:', fromNode, 'toNode:', toNode);
            return;
        }

        // 커넥터 찾기 (조건 노드의 경우 올바른 출력 커넥터 선택)
        let fromConnector = null;
        if (outputType === 'true') {
            // 조건 노드의 True 출력: .output-dot을 찾거나, 없으면 .true-output 자체 사용
            fromConnector =
                fromNode.querySelector('.true-output .output-dot') || fromNode.querySelector('.true-output');
        } else if (outputType === 'false') {
            // 조건 노드의 False 출력: .output-dot을 찾거나, 없으면 .false-output 자체 사용
            fromConnector =
                fromNode.querySelector('.false-output .output-dot') || fromNode.querySelector('.false-output');
        } else {
            // 일반 노드 또는 출력 타입이 없는 경우
            fromConnector = fromNode.querySelector('.node-output:not(.true-output):not(.false-output)');
        }
        const toConnector = toNode.querySelector('.node-input');

        if (!fromConnector || !toConnector) {
            logger.warn('[ConnectionManager] 커넥터를 찾을 수 없습니다:', { fromNodeId, toNodeId, outputType });
            logger.warn('[ConnectionManager] fromConnector:', fromConnector, 'toConnector:', toConnector);
            logger.warn('[ConnectionManager] fromNode 구조:', {
                hasTrueOutput: !!fromNode.querySelector('.true-output'),
                hasFalseOutput: !!fromNode.querySelector('.false-output'),
                hasOutputDot: !!fromNode.querySelector('.output-dot'),
                nodeHTML: fromNode.innerHTML.substring(0, 200)
            });
            return;
        }

        const fromPos = this.getConnectorPosition(fromConnector);
        const toPos = this.getConnectorPosition(toConnector);

        logger.log(`[ConnectionManager] 연결선 그리기: ${fromNodeId} → ${toNodeId}`);
        logger.log('[ConnectionManager] fromPos:', fromPos);
        logger.log('[ConnectionManager] toPos:', toPos);

        // SVG 크기 업데이트 (연결 그리기 전에)
        this.updateSVGSize();

        // 좌표 유효성 체크
        if (!fromPos || !toPos || isNaN(fromPos.x) || isNaN(fromPos.y) || isNaN(toPos.x) || isNaN(toPos.y)) {
            logger.warn('[ConnectionManager] 유효하지 않은 연결 좌표:', { fromPos, toPos });
            logger.warn('[ConnectionManager] 노드 위치 확인:', {
                fromNode: {
                    id: fromNodeId,
                    left: fromNode.style.left,
                    top: fromNode.style.top,
                    rect: fromNode.getBoundingClientRect()
                },
                toNode: {
                    id: toNodeId,
                    left: toNode.style.left,
                    top: toNode.style.top,
                    rect: toNode.getBoundingClientRect()
                }
            });
            return;
        }

        // 기존 같은 연결이 있으면 먼저 제거 (강화된 중복 제거 로직)
        const existingLines = this.svgContainer.querySelectorAll(`[data-connection-id="${fromNodeId}-${toNodeId}"]`);
        existingLines.forEach((line) => {
            line.remove();
        });

        // 연결 경로 생성
        const path = this.createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('class', 'connection-line');
        line.setAttribute('data-connection-id', `${fromNodeId}-${toNodeId}`);
        line.setAttribute('data-output-type', outputType || 'default'); // 출력 타입 저장

        // 연결선 스타일 설정 (조건 노드의 경우 true/false에 따라 색상 구분)
        let strokeColor = '#007AFF'; // 기본 파란색
        let strokeWidth = '2';

        if (outputType === 'true') {
            strokeColor = '#22c55e'; // 초록색 (True)
            strokeWidth = '2.5';
            line.classList.add('connection-true');
        } else if (outputType === 'false') {
            strokeColor = '#ef4444'; // 빨간색 (False)
            strokeWidth = '2.5';
            line.classList.add('connection-false');
        }

        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', strokeWidth);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');

        // 연결선 클릭 시 삭제 이벤트
        line.style.pointerEvents = 'stroke';
        line.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConnection(`${fromNodeId}-${toNodeId}`);
        });

        // 호버 시 강조 효과
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
    }

    /**
     * 기존 연결선의 위치만 업데이트
     * 이미 존재하는 path의 d 값만 수정한다.
     */
    updateAllConnections() {
        const logger = getLogger();
        logger.log('모든 연결 위치 업데이트 시작...');

        this.connections.forEach((connection, connectionId) => {
            const line = this.connectionLines.get(connectionId);
            if (line) {
                // 연결 좌표 재계산
                const fromNode = this.canvas.querySelector(`[data-node-id="${connection.from}"]`);
                const toNode = this.canvas.querySelector(`[data-node-id="${connection.to}"]`);

                if (fromNode && toNode) {
                    // 조건 노드의 경우 올바른 출력 커넥터 찾기
                    let fromConnector = null;
                    if (connection.outputType === 'true') {
                        fromConnector =
                            fromNode.querySelector('.true-output .output-dot') ||
                            fromNode.querySelector('.true-output');
                    } else if (connection.outputType === 'false') {
                        fromConnector =
                            fromNode.querySelector('.false-output .output-dot') ||
                            fromNode.querySelector('.false-output');
                    } else {
                        // 일반 노드 또는 출력 타입이 없는 경우
                        fromConnector = fromNode.querySelector('.node-output:not(.true-output):not(.false-output)');
                    }

                    const toConnector = toNode.querySelector('.node-input');

                    if (fromConnector && toConnector) {
                        const fromPos = this.getConnectorPosition(fromConnector);
                        const toPos = this.getConnectorPosition(toConnector);

                        // 새로운 경로 생성
                        const path = this.createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
                        line.setAttribute('d', path);

                        logger.log(
                            `연결 ${connectionId} 위치 업데이트: (${fromPos.x}, ${fromPos.y}) → (${toPos.x}, ${toPos.y})`
                        );
                    }
                }
            }
        });

        logger.log('모든 연결 위치 업데이트 완료');
    }

    /**
     * 두 점 사이를 부드러운 베지어 곡선으로 잇는 path 데이터 생성
     */
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
        if (!this.connections.has(connectionId)) {
            return;
        }

        // 연결선 제거
        const line = this.connectionLines.get(connectionId);
        if (line) {
            line.remove();
            this.connectionLines.delete(connectionId);
        }

        // 연결 정보 제거
        this.connections.delete(connectionId);

        // 연결 삭제 이벤트 발생
        this.canvas.dispatchEvent(
            new CustomEvent('connectionDeleted', {
                detail: { connectionId }
            })
        );
    }

    /**
     * 모든 연결 다시 그리기
     * Transform 변경 시 연결 위치를 다시 계산해서 그린다
     */
    redrawAllConnections() {
        // 기존 연결선 모두 제거
        this.connectionLines.forEach((line) => line.remove());
        this.connectionLines.clear();

        // 저장된 연결 정보를 기반으로 모두 다시 그리기
        this.connections.forEach((connection, connectionId) => {
            this.drawConnection(connection.from, connection.to, connection.outputType || null);
        });
    }

    /**
     * 연결 정보 가져오기
     */
    getConnections() {
        return Array.from(this.connections.values());
    }

    /**
     * 연결 정보 설정
     * (예: 저장된 워크플로우를 로드할 때 사용)
     */
    setConnections(connections) {
        // 기존 연결 정보 제거
        this.connections.clear();
        this.connectionLines.forEach((line) => line.remove());
        this.connectionLines.clear();

        // 새로운 연결 정보 추가
        connections.forEach((connection) => {
            // 연결 정보 구조 정규화
            const connectionId = connection.id || `${connection.from}-${connection.to}`;
            const normalizedConnection = {
                id: connectionId,
                from: connection.from || connection.fromNodeId,
                to: connection.to || connection.toNodeId,
                outputType: connection.outputType || null // 조건 노드의 출력 타입 복원
            };

            this.connections.set(connectionId, normalizedConnection);
            this.drawConnection(
                normalizedConnection.from,
                normalizedConnection.to,
                normalizedConnection.outputType || null
            );
        });
    }

    /**
     * 특정 노드가 이동했을 때 그 노드와 관련된 연결만 다시 그리기
     */
    updateNodeConnections(nodeId) {
        // 약간의 지연을 두고 실행 (DOM 업데이트 완료 후 반영하기 위함)
        setTimeout(() => {
            this.connections.forEach((connection, connectionId) => {
                if (connection.from === nodeId || connection.to === nodeId) {
                    // 기존 연결선 제거
                    const line = this.connectionLines.get(connectionId);
                    if (line) {
                        line.remove();
                        this.connectionLines.delete(connectionId);
                    }

                    // 새로 연결선 그리기
                    this.drawConnection(connection.from, connection.to, connection.outputType || null);
                }
            });
        }, 10);
    }

    /**
     * 특정 노드 관련 연결을 즉시 업데이트
     * 드래그 중에 실시간으로 연결선을 업데이트하기 위해 사용
     */
    updateNodeConnectionsImmediately(nodeId) {
        const logger = getLogger();

        // 지연 없이 바로 업데이트
        this.connections.forEach((connection, connectionId) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                // 기존 연결선 제거
                const line = this.connectionLines.get(connectionId);
                if (line) {
                    line.remove();
                    this.connectionLines.delete(connectionId);
                }

                // 새로 연결선 그리기 (조건 노드의 경우 outputType 전달)
                try {
                    this.drawConnection(connection.from, connection.to, connection.outputType || null);
                } catch (error) {
                    logger.warn(`[ConnectionManager] 연결선 그리기 실패: ${connectionId}`, error);
                }
            }
        });
    }

    /**
     * 임시 연결선 업데이트 (롱터치용)
     * 마우스/터치 이동에 따라 임시 연결선을 그린다.
     */
    updateTempConnection(startX, startY, endX, endY) {
        // 기존 임시 연결선 제거
        if (this.tempConnection) {
            this.tempConnection.remove();
            this.tempConnection = null;
        }

        // 새 임시 연결선 생성
        this.tempConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempConnection.setAttribute('class', 'temp-connection-line');
        this.tempConnection.setAttribute('stroke', '#FF6B35');
        this.tempConnection.setAttribute('stroke-width', '2');
        this.tempConnection.setAttribute('fill', 'none');
        this.tempConnection.setAttribute('stroke-linecap', 'round');
        this.tempConnection.setAttribute('stroke-linejoin', 'round');
        this.tempConnection.setAttribute('stroke-dasharray', '5,5');
        this.tempConnection.style.pointerEvents = 'none';

        // 베지어 곡선으로 경로 생성
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        this.tempConnection.setAttribute('d', path);

        // SVG 컨테이너에 추가
        if (this.svgContainer) {
            this.svgContainer.appendChild(this.tempConnection);
        }
    }

    /**
     * 임시 연결선 제거
     */
    removeTempConnection() {
        if (this.tempConnection) {
            this.tempConnection.remove();
            this.tempConnection = null;
        }
    }

    /**
     * 특정 노드와 관련된 모든 연결 제거
     * 노드가 삭제될 때 호출한다.
     */
    removeNodeConnections(nodeId) {
        const connectionsToRemove = [];

        // 해당 노드와 관련된 모든 연결 찾기
        this.connections.forEach((connection, connectionId) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                connectionsToRemove.push(connectionId);
            }
        });

        // 찾은 연결들 삭제
        connectionsToRemove.forEach((connectionId) => {
            this.deleteConnection(connectionId);
        });
    }

    /**
     * 모든 연결 제거
     * 캔버스를 완전히 초기화할 때 사용
     */
    clearAllConnections() {
        // 모든 연결선 SVG 요소 제거
        this.connectionLines.forEach((line) => {
            line.remove();
        });
        this.connectionLines.clear();

        // 모든 연결 정보 제거
        this.connections.clear();
    }
}

/**
 * ConnectionManager 인스턴스 설정 함수
 * 다른 파일과의 호환성을 위해 전역 변수로도 설정 (임시)
 * TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
 */
export function setConnectionManager(connectionManager) {
    window.connectionManager = connectionManager;
}

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.ConnectionManager = ConnectionManager;
    window.setConnectionManager = setConnectionManager;
}
