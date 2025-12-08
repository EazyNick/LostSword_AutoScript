/**
 * ConnectionManager SVG 관련 기능
 *
 * 이 모듈은 노드 간 연결선을 그리기 위한 SVG 관리 기능을 제공합니다.
 * - SVG 컨테이너 초기화 및 크기 관리
 * - 연결선 그리기 및 업데이트
 * - 임시 연결선 생성 (드래그 중)
 *
 * @module connection-svg
 */

import { getLogger } from './connection-utils.js';
import { createCurvedPath } from './connection-utils.js';

/**
 * SVG 초기화 및 관리 클래스
 *
 * ConnectionManager의 SVG 관련 기능을 담당하는 클래스입니다.
 * 무한 캔버스 모드와 스크롤 기반 모드를 모두 지원하며,
 * canvas-content 내부에 SVG를 배치하여 transform 기반 패닝과 호환됩니다.
 *
 * @class ConnectionSVGManager
 */
export class ConnectionSVGManager {
    /**
     * ConnectionSVGManager 생성자
     *
     * @param {ConnectionManager} connectionManager - 부모 ConnectionManager 인스턴스
     */
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
        this.svgContainer = null;
    }

    /**
     * SVG 요소 초기화
     *
     * 무한 캔버스 모드에 맞게 SVG 컨테이너를 생성하고 설정합니다.
     * canvas-content가 있으면 그 안에 추가하고, 없으면 canvas에 직접 추가합니다.
     *
     * @returns {void}
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
            this.connectionManager.canvas.appendChild(this.svgContainer);
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
            const canvasRect = this.connectionManager.canvas.getBoundingClientRect();

            // 캔버스 크기에 맞춰 SVG 크기 설정
            this.svgContainer.setAttribute('width', canvasRect.width);
            this.svgContainer.setAttribute('height', canvasRect.height);
            this.svgContainer.style.width = canvasRect.width + 'px';
            this.svgContainer.style.height = canvasRect.height + 'px';
        }
    }

    /**
     * 연결선 그리기
     */
    drawConnection(fromNodeId, toNodeId, outputType = null) {
        const fromNode = this.connectionManager.canvas.querySelector(`[data-node-id="${fromNodeId}"]`);
        const toNode = this.connectionManager.canvas.querySelector(`[data-node-id="${toNodeId}"]`);

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

        const fromPos = this.connectionManager.getConnectorPosition(fromConnector);
        const toPos = this.connectionManager.getConnectorPosition(toConnector);

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
        const path = createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);

        // 연결선 스타일 설정 (조건 노드의 경우 true/false에 따라 색상 구분)
        let strokeColor = '#60a5fa'; // 기본 청록색 (이미지와 유사)
        let strokeWidth = '2';

        if (outputType === 'true') {
            strokeColor = '#22c55e'; // 초록색 (True)
            strokeWidth = '2.5';
        } else if (outputType === 'false') {
            strokeColor = '#ef4444'; // 빨간색 (False)
            strokeWidth = '2.5';
        }

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('class', 'connection-line');
        line.setAttribute('data-connection-id', `${fromNodeId}-${toNodeId}`);
        line.setAttribute('data-output-type', outputType || 'default'); // 출력 타입 저장

        if (outputType === 'true') {
            line.classList.add('connection-true');
        } else if (outputType === 'false') {
            line.classList.add('connection-false');
        }

        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', strokeWidth);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        // 화살표 제거: marker-end 속성 제거됨 (점선만 표시)

        // 연결선 클릭 시 삭제 이벤트
        line.style.pointerEvents = 'stroke';
        line.addEventListener('click', (e) => {
            e.stopPropagation();
            this.connectionManager.deleteConnection(`${fromNodeId}-${toNodeId}`);
        });

        // 호버 시 강조 효과
        line.addEventListener('mouseenter', (e) => {
            line.setAttribute('stroke', '#FF3B30');
            line.setAttribute('stroke-width', '3');
        });

        line.addEventListener('mouseleave', (e) => {
            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', strokeWidth);
        });

        this.svgContainer.appendChild(line);
        this.connectionManager.connectionLines.set(`${fromNodeId}-${toNodeId}`, line);
    }

    /**
     * 기존 연결선의 위치만 업데이트
     * 이미 존재하는 path의 d 값만 수정한다.
     */
    updateAllConnections() {
        const logger = getLogger();
        logger.log('모든 연결 위치 업데이트 시작...');

        this.connectionManager.connections.forEach((connection, connectionId) => {
            const line = this.connectionManager.connectionLines.get(connectionId);
            if (line) {
                // 연결 좌표 재계산
                const fromNode = this.connectionManager.canvas.querySelector(`[data-node-id="${connection.from}"]`);
                const toNode = this.connectionManager.canvas.querySelector(`[data-node-id="${connection.to}"]`);

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
                        const fromPos = this.connectionManager.getConnectorPosition(fromConnector);
                        const toPos = this.connectionManager.getConnectorPosition(toConnector);

                        // 새로운 경로 생성
                        const path = createCurvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
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
     * 임시 연결선 생성
     */
    createTempLine() {
        const logger = getLogger();

        logger.log('[ConnectionManager] ========== createTempLine 시작 ==========');

        if (!this.connectionManager.startConnector) {
            logger.warn('[ConnectionManager] createTempLine: startConnector가 없습니다.');
            return;
        }

        if (!this.connectionManager.startNode) {
            logger.warn('[ConnectionManager] createTempLine: startNode가 없습니다.');
            return;
        }

        const nodeId = this.connectionManager.startNode.dataset.nodeId || this.connectionManager.startNode.id;
        const connectorType = this.connectionManager.startConnectorType;
        const outputType = this.connectionManager.startOutputType || null; // 조건 노드의 출력 타입

        logger.log('[ConnectionManager] createTempLine: 기본 정보:', {
            nodeId: nodeId,
            connectorType: connectorType,
            outputType: outputType,
            startNode: this.connectionManager.startNode,
            startConnector: this.connectionManager.startConnector,
            nodeStyleLeft: this.connectionManager.startNode.style.left,
            nodeStyleTop: this.connectionManager.startNode.style.top,
            connectorClasses: this.connectionManager.startConnector.className
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

        this.connectionManager.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.connectionManager.tempLine.setAttribute('stroke', '#ff6b35');
        this.connectionManager.tempLine.setAttribute('stroke-width', '3');
        this.connectionManager.tempLine.setAttribute('fill', 'none');
        this.connectionManager.tempLine.setAttribute('stroke-dasharray', '5,5');
        this.connectionManager.tempLine.style.pointerEvents = 'none';

        this.svgContainer.appendChild(this.connectionManager.tempLine);
        logger.log('[ConnectionManager] createTempLine: SVG path 요소 생성 및 추가 완료');

        // 즉시 커넥터 위치 계산 (requestAnimationFrame 없이)
        // 일반 연결선과 동일한 방식으로 계산
        logger.log('[ConnectionManager] createTempLine: 커넥터 위치 계산 시작', {
            startConnector: this.connectionManager.startConnector,
            connectorClasses: this.connectionManager.startConnector.className,
            isOutputDot: this.connectionManager.startConnector.classList.contains('output-dot'),
            closestTrueOutput: this.connectionManager.startConnector.closest('.true-output'),
            closestFalseOutput: this.connectionManager.startConnector.closest('.false-output')
        });
        const startPos = this.connectionManager.getConnectorPosition(this.connectionManager.startConnector);

        logger.log('[ConnectionManager] ========== createTempLine: 위치 계산 결과 ==========');
        logger.log('[ConnectionManager] 임시 연결선 생성 - 위치 계산:', {
            startConnector: this.connectionManager.startConnector,
            startNode: this.connectionManager.startNode,
            startPos: startPos,
            svgContainer: this.svgContainer,
            connectorClasses: this.connectionManager.startConnector.className,
            nodeId: nodeId,
            nodeStyleLeft: this.connectionManager.startNode.style.left,
            nodeStyleTop: this.connectionManager.startNode.style.top
        });

        if (!startPos || isNaN(startPos.x) || isNaN(startPos.y)) {
            logger.error('[ConnectionManager] ❌ 유효하지 않은 시작 위치:', startPos);
            // DOM 업데이트 후 다시 시도
            requestAnimationFrame(() => {
                logger.log('[ConnectionManager] createTempLine: 재시도 시작');
                const retryPos = this.connectionManager.getConnectorPosition(this.connectionManager.startConnector);
                logger.log('[ConnectionManager] createTempLine: 재시도 위치:', retryPos);
                if (retryPos && !isNaN(retryPos.x) && !isNaN(retryPos.y)) {
                    logger.log('[ConnectionManager] ✅ 재시도 후 위치 계산 성공:', retryPos);
                    this.connectionManager.updateTempLine(retryPos.x, retryPos.y, retryPos.x, retryPos.y);
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
        this.connectionManager.updateTempLine(startPos.x, startPos.y, startPos.x, startPos.y);

        logger.log('[ConnectionManager] ========== createTempLine 완료 ==========');
    }

    /**
     * 임시 연결선 업데이트 (롱터치용)
     * 마우스/터치 이동에 따라 임시 연결선을 그린다.
     */
    updateTempConnection(startX, startY, endX, endY) {
        // 기존 임시 연결선 제거
        if (this.connectionManager.tempConnection) {
            this.connectionManager.tempConnection.remove();
            this.connectionManager.tempConnection = null;
        }

        // 새 임시 연결선 생성
        this.connectionManager.tempConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.connectionManager.tempConnection.setAttribute('class', 'temp-connection-line');
        this.connectionManager.tempConnection.setAttribute('stroke', '#FF6B35');
        this.connectionManager.tempConnection.setAttribute('stroke-width', '2');
        this.connectionManager.tempConnection.setAttribute('fill', 'none');
        this.connectionManager.tempConnection.setAttribute('stroke-linecap', 'round');
        this.connectionManager.tempConnection.setAttribute('stroke-linejoin', 'round');
        this.connectionManager.tempConnection.setAttribute('stroke-dasharray', '5,5');
        this.connectionManager.tempConnection.style.pointerEvents = 'none';

        // 베지어 곡선으로 경로 생성
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        this.connectionManager.tempConnection.setAttribute('d', path);

        // SVG 컨테이너에 추가
        if (this.svgContainer) {
            this.svgContainer.appendChild(this.connectionManager.tempConnection);
        }
    }
}
