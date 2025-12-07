/**
 * ConnectionManager 좌표 계산
 * 커넥터 위치 계산 및 좌표 변환을 담당
 */

import { getLogger } from './connection-utils.js';

/**
 * 좌표 계산 클래스
 */
export class ConnectionCoordinateCalculator {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
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
            const canvasRect = this.connectionManager.canvas.getBoundingClientRect();

            // 캔버스 내 상대 좌표(커넥터 중심)
            const relativeX = rect.left - canvasRect.left + rect.width / 2;
            const relativeY = rect.top - canvasRect.top + rect.height / 2;

            logger.log('[ConnectionManager] getConnectorPosition (scroll mode):', {
                relative: { x: relativeX, y: relativeY }
            });

            return { x: relativeX, y: relativeY };
        }
    }
}
