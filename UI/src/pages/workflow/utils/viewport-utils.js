/**
 * 뷰포트 관련 유틸리티
 * 캔버스 뷰포트 조정 및 위치 관리
 */

export class ViewportUtils {
    /**
     * 모든 노드가 화면에 보이도록 뷰포트 조정
     */
    static fitNodesToView(workflowPage) {
        const logger = workflowPage.getLogger();
        const log = logger.log;

        log('[WorkflowPage] fitNodesToView() 호출됨');

        const canvasContent = document.getElementById('canvas-content');
        const canvas = document.getElementById('workflow-canvas');

        if (!canvasContent || !canvas) {
            log('[WorkflowPage] ⚠️ 캔버스 요소를 찾을 수 없음');
            return;
        }

        const nodeElements = canvasContent.querySelectorAll('.workflow-node');

        if (nodeElements.length === 0) {
            log('[WorkflowPage] 노드가 없어서 뷰포트 조정 건너뜀');
            return;
        }

        // 노드들의 bounding box 계산
        let minX = Infinity,
            minY = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity;

        nodeElements.forEach((node) => {
            // 노드의 실제 위치 가져오기 (style.left/top 또는 getBoundingClientRect 사용)
            let left = parseFloat(node.style.left);
            let top = parseFloat(node.style.top);

            // style.left/top이 없거나 0이면 getBoundingClientRect 사용
            if (isNaN(left) || isNaN(top) || (left === 0 && top === 0 && nodeElements.length > 1)) {
                const rect = node.getBoundingClientRect();
                const canvasContentRect = canvasContent.getBoundingClientRect();
                // canvas-content 기준 상대 위치 계산
                left = rect.left - canvasContentRect.left;
                top = rect.top - canvasContentRect.top;
            }

            // 여전히 유효하지 않으면 기본값 사용
            if (isNaN(left) || isNaN(top)) {
                left = 0;
                top = 0;
            }

            const width = node.offsetWidth || 200;
            const height = node.offsetHeight || 80;

            const nodeMinX = left;
            const nodeMinY = top;
            const nodeMaxX = left + width;
            const nodeMaxY = top + height;

            if (nodeMinX < minX) {
                minX = nodeMinX;
            }
            if (nodeMinY < minY) {
                minY = nodeMinY;
            }
            if (nodeMaxX > maxX) {
                maxX = nodeMaxX;
            }
            if (nodeMaxY > maxY) {
                maxY = nodeMaxY;
            }
        });

        // 패딩 추가
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        // 노드 영역의 중심점과 크기
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        // 캔버스 크기
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;

        // 스케일 계산 (노드 영역이 캔버스에 맞도록)
        const scaleX = canvasWidth / width;
        const scaleY = canvasHeight / height;
        const scale = Math.min(scaleX, scaleY, 1); // 1보다 크게 확대하지 않음

        // 중심점을 캔버스 중심으로 이동시키기 위한 translate 계산
        const translateX = canvasWidth / 2 - centerX * scale;
        const translateY = canvasHeight / 2 - centerY * scale;

        // Transform 적용
        canvasContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

        // 캔버스 컨트롤러의 transform 상태 동기화
        const nodeManager = workflowPage.getNodeManager();
        if (nodeManager && nodeManager.canvasController) {
            nodeManager.canvasController.canvasTransform = {
                x: translateX,
                y: translateY,
                scale: scale
            };
        }

        log('[WorkflowPage] ✅ 뷰포트 조정 완료 - 모든 노드가 화면에 표시됨');
    }

    /**
     * 현재 뷰포트 위치 가져오기
     */
    static getCurrentViewportPosition() {
        const canvasContent = document.getElementById('canvas-content');
        const canvas = document.getElementById('workflow-canvas');

        if (canvasContent && canvasContent.style.transform) {
            const transform = canvasContent.style.transform;
            const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);

            if (match) {
                return {
                    x: parseFloat(match[1]) || 0,
                    y: parseFloat(match[2]) || 0,
                    scale: parseFloat(match[3]) || 1,
                    mode: 'transform'
                };
            }
        }

        if (canvas) {
            return {
                x: canvas.scrollLeft || 0,
                y: canvas.scrollTop || 0,
                scale: 1,
                mode: 'scroll'
            };
        }

        return { x: -50000, y: -50000, scale: 1, mode: 'transform' };
    }

    /**
     * 뷰포트 위치 복원
     */
    static restoreViewportPosition(viewportData) {
        if (!viewportData) {
            return;
        }

        const canvasContent = document.getElementById('canvas-content');

        if (viewportData.mode === 'transform' && canvasContent) {
            const { x, y, scale } = viewportData;
            canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        } else if (viewportData.mode === 'scroll') {
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                canvas.scrollLeft = viewportData.x || 0;
                canvas.scrollTop = viewportData.y || 0;
            }
        }
    }
}
