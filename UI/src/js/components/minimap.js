/**
 * 미니맵 관리 클래스
 * 
 * 이 클래스는 워크플로우 캔버스의 미니맵을 관리합니다.
 * 주요 기능:
 * - 캔버스 전체를 축소해서 보여주는 미니맵 표시
 * - 현재 보이는 영역을 미니맵에 표시 (뷰포트)
 * - 미니맵 클릭/드래그로 캔버스 이동
 * - 미니맵 더블클릭으로 해당 영역으로 부드럽게 이동
 * - 캔버스 크기 자동 조정
 */
class MinimapManager {
    constructor(canvas, minimapContent) {
        // === 기본 속성 초기화 ===
        this.canvas = canvas;                    // 메인 워크플로우 캔버스
        this.minimapContent = minimapContent;   // 미니맵 컨테이너 DOM 요소
        this.minimapViewport = document.getElementById('minimap-viewport'); // 현재 보이는 영역 표시
        
        // === 미니맵 설정 ===
        this.scale = 0.08;                       // 미니맵 스케일 (8% 크기로 축소)
        this.minCanvasSize = { width: 2000, height: 2000 }; // 기본 캔버스 크기 (10000 → 2000)
        this.padding = 100;                      // 캔버스 여백 (500 → 100)
        
        // === 캔버스 경계 관련 속성 ===
        this.canvasBounds = {                    // 현재 캔버스의 실제 콘텐츠 경계
            minX: 0, maxX: 2000,                 // 10000 → 2000
            minY: 0, maxY: 2000                  // 10000 → 2000
        };
        
        // === 드래그 관련 속성 ===
        this.isDragging = false;                 // 미니맵 드래그 중인지 여부
        this.dragStart = { x: 0, y: 0 };         // 드래그 시작 시 마우스 좌표
        
        // === 노드 관리 ===
        this.minimapNodes = new Map();           // 미니맵에 표시된 노드들 저장
        
        this.init();
    }
    
    /**
     * 초기화 메서드
     * 이벤트 리스너 설정과 초기 미니맵 업데이트를 수행합니다.
     */
    init() {
        this.setupEventListeners();
        this.updateMinimap();
        
        // 캔버스 스크롤 이벤트 리스너 (스크롤 시 뷰포트 업데이트)
        this.canvas.addEventListener('scroll', () => {
            this.updateViewport();
        });
        
        // 윈도우 리사이즈 이벤트 리스너 (화면 크기 변경 시 미니맵 업데이트)
        window.addEventListener('resize', () => {
            this.updateMinimap();
        });
    }
    
    
    /**
     * 이벤트 리스너 설정
     * 미니맵과 관련된 모든 사용자 입력 이벤트를 처리합니다.
     */
    setupEventListeners() {
        // 미니맵 클릭 이벤트 (단일 클릭으로 해당 위치로 이동)
        this.minimapContent.addEventListener('click', (e) => {
            this.handleMinimapClick(e);
        });
        
        // 미니맵 더블클릭 이벤트 (해당 영역으로 부드럽게 이동)
        this.minimapContent.addEventListener('dblclick', (e) => {
            this.handleMinimapDoubleClick(e);
        });
        
        // 미니맵 드래그 이벤트 (드래그로 캔버스 이동)
        this.minimapContent.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });
        
        // node.js에서 이미 패닝 기능을 구현하고 있으므로 중복 제거
        // 미니맵은 뷰포트 업데이트만 담당
    }
    
    /**
     * 미니맵 클릭 처리
     * 클릭한 위치로 캔버스를 즉시 이동시킵니다.
     */
    handleMinimapClick(e) {
        const rect = this.minimapContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 미니맵 좌표를 캔버스 좌표로 변환
        const canvasX = (x / this.scale) - (this.canvas.clientWidth / 2);
        const canvasY = (y / this.scale) - (this.canvas.clientHeight / 2);
        
        // 캔버스 스크롤
        this.canvas.scrollLeft = Math.max(0, canvasX);
        this.canvas.scrollTop = Math.max(0, canvasY);
        
        this.updateViewport();
    }
    
    /**
     * 미니맵 더블클릭 처리
     * 더블클릭한 위치로 캔버스를 부드럽게 이동시킵니다.
     */
    handleMinimapDoubleClick(e) {
        const rect = this.minimapContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 미니맵 좌표를 캔버스 좌표로 변환
        const canvasX = (x / this.scale) - (this.canvas.clientWidth / 2);
        const canvasY = (y / this.scale) - (this.canvas.clientHeight / 2);
        
        // 해당 영역으로 부드럽게 이동
        this.smoothScrollTo(canvasX, canvasY);
        
        console.log(`미니맵 더블클릭으로 포커스 이동: (${canvasX}, ${canvasY})`);
    }
    
    /**
     * 부드러운 스크롤 애니메이션
     * 지정된 위치로 부드럽게 이동하는 애니메이션을 실행합니다.
     */
    smoothScrollTo(targetX, targetY) {
        const startX = this.canvas.scrollLeft;
        const startY = this.canvas.scrollTop;
        const duration = 500; // 0.5초
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 부드러운 이징 함수 (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (targetX - startX) * easeOut;
            const currentY = startY + (targetY - startY) * easeOut;
            
            this.canvas.scrollLeft = Math.max(0, currentX);
            this.canvas.scrollTop = Math.max(0, currentY);
            
            this.updateViewport();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 미니맵 드래그 시작
     * 마우스를 누른 순간의 위치를 기록하고 드래그 모드를 시작합니다.
     */
    startDrag(e) {
        this.isDragging = true;
        this.dragStart = {
            x: e.clientX - this.canvas.scrollLeft,
            y: e.clientY - this.canvas.scrollTop
        };
        this.minimapContent.style.cursor = 'grabbing';
    }
    
    /**
     * 미니맵 드래그 처리
     * 마우스 이동에 따라 캔버스의 스크롤 위치를 변경합니다.
     */
    handleDrag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        
        this.canvas.scrollLeft = Math.max(0, deltaX);
        this.canvas.scrollTop = Math.max(0, deltaY);
        
        this.updateViewport();
    }
    
    /**
     * 미니맵 드래그 종료
     * 마우스를 떼면 드래그 모드를 종료합니다.
     */
    endDrag() {
        this.isDragging = false;
        this.minimapContent.style.cursor = 'crosshair';
    }
    
    
    /**
     * 미니맵 업데이트
     * 캔버스의 모든 노드들을 미니맵에 표시하고 캔버스 크기를 조정합니다.
     */
    updateMinimap() {
        // 기존 미니맵 노드들 제거
        this.clearMinimapNodes();
        
        // 캔버스 크기 동적 조정
        this.adjustCanvasSize();
        
        // 캔버스의 모든 노드들을 미니맵에 표시
        // 피그마 방식: 캔버스 콘텐츠 컨테이너에서 노드 찾기
        const canvasContent = document.getElementById('canvas-content');
        const nodes = canvasContent ? canvasContent.querySelectorAll('.workflow-node') : this.canvas.querySelectorAll('.workflow-node');
        nodes.forEach(node => {
            this.addMinimapNode(node);
        });
        
        // 뷰포트 업데이트
        this.updateViewport();
    }
    
    /**
     * 캔버스 크기 동적 조정
     * 노드들의 위치를 기반으로 캔버스 경계를 업데이트합니다.
     */
    adjustCanvasSize() {
        // 피그마 방식: 캔버스 콘텐츠 컨테이너에서 노드 찾기
        const canvasContent = document.getElementById('canvas-content');
        const nodes = canvasContent ? canvasContent.querySelectorAll('.workflow-node') : this.canvas.querySelectorAll('.workflow-node');
        if (nodes.length === 0) {
            // 노드가 없으면 무한 캔버스 크기로 설정
            this.canvasBounds = {
                minX: 0, maxX: 100000,
                minY: 0, maxY: 100000
            };
            return;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // 모든 노드의 위치를 확인하여 캔버스 경계 계산
        nodes.forEach(node => {
            const x = parseInt(node.style.left) || 0;
            const y = parseInt(node.style.top) || 0;
            const width = node.offsetWidth || 200;
            const height = node.offsetHeight || 100;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });
        
        // 여백을 포함한 캔버스 경계 계산 (무한 캔버스용)
        // 노드가 없으면 기본 크기 사용
        if (nodes.length === 0) {
            this.canvasBounds = {
                minX: -500, maxX: 1500,
                minY: -500, maxY: 1500
            };
        } else {
            // 노드가 있을 때는 노드 위치 기준으로만 계산 (무한 캔버스 크기 제한 제거)
            this.canvasBounds = {
                minX: minX - this.padding,
                maxX: maxX + this.padding,
                minY: minY - this.padding,
                maxY: maxY + this.padding
            };
        }
        
        console.log(`캔버스 경계 업데이트:`, this.canvasBounds);
    }
    
    /**
     * 미니맵에 노드 추가
     * 캔버스의 노드를 미니맵에 축소된 크기로 표시합니다.
     */
    addMinimapNode(node) {
        const nodeId = node.id || node.dataset.nodeId;
        if (!nodeId) return;
        
        // 미니맵 노드 생성
        const minimapNode = document.createElement('div');
        minimapNode.className = 'minimap-node';
        minimapNode.dataset.nodeId = nodeId;
        
        // 노드 색상 결정 (캔버스 노드의 색상 클래스에서 추출)
        const colorClass = Array.from(node.classList).find(cls => cls.startsWith('node-'));
        const color = colorClass ? colorClass.replace('node-', '') : 'blue';
        minimapNode.classList.add(color);
        
        // 위치 계산 (캔버스 좌표를 미니맵 좌표로 변환)
        const x = parseInt(node.style.left) || 0;
        const y = parseInt(node.style.top) || 0;
        
        // 콘텐츠 영역을 기준으로 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        const minimapContainerWidth = this.minimapContent.clientWidth;
        const minimapContainerHeight = this.minimapContent.clientHeight;
        
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 노드 위치를 콘텐츠 영역 기준으로 변환
        const relativeX = x - this.canvasBounds.minX;
        const relativeY = y - this.canvasBounds.minY;
        
        minimapNode.style.left = (relativeX * scaleX) + 'px';
        minimapNode.style.top = (relativeY * scaleY) + 'px';
        
        this.minimapContent.appendChild(minimapNode);
        this.minimapNodes.set(nodeId, minimapNode);
    }
    
    /**
     * 미니맵 노드 위치 업데이트
     * 캔버스에서 노드가 이동했을 때 미니맵의 노드 위치도 업데이트합니다.
     */
    updateMinimapNode(node) {
        const nodeId = node.id || node.dataset.nodeId;
        if (!nodeId) return;
        
        const minimapNode = this.minimapNodes.get(nodeId);
        if (!minimapNode) return;
        
        const x = parseInt(node.style.left) || 0;
        const y = parseInt(node.style.top) || 0;
        
        // 콘텐츠 영역을 기준으로 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        const minimapContainerWidth = this.minimapContent.clientWidth;
        const minimapContainerHeight = this.minimapContent.clientHeight;
        
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 노드 위치를 콘텐츠 영역 기준으로 변환
        const relativeX = x - this.canvasBounds.minX;
        const relativeY = y - this.canvasBounds.minY;
        
        minimapNode.style.left = (relativeX * scaleX) + 'px';
        minimapNode.style.top = (relativeY * scaleY) + 'px';
    }
    
    /**
     * 뷰포트 업데이트
     * 현재 캔버스에서 보이는 영역을 미니맵에 표시합니다.
     */
    updateViewport() {
        if (!this.minimapViewport) return;
        
        // 피그마 방식: Transform 기반 뷰포트 업데이트
        const canvasContent = document.getElementById('canvas-content');
        if (!canvasContent) {
            // Transform이 없으면 스크롤 기반으로 폴백
            const scrollLeft = this.canvas.scrollLeft;
            const scrollTop = this.canvas.scrollTop;
            
            // 실제 화면에 보이는 영역 크기 (캔버스 컨테이너의 크기)
            const viewportWidth = this.canvas.parentElement.clientWidth;
            const viewportHeight = this.canvas.parentElement.clientHeight;
            
            // 미니맵 컨테이너 크기 (고정)
            const minimapContainerWidth = this.minimapContent.clientWidth;
            const minimapContainerHeight = this.minimapContent.clientHeight;
            
            // 콘텐츠 영역을 기준으로 계산
            const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
            const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
            
            // 뷰포트 크기 제한 (너무 작아지거나 커지지 않도록)
            const minViewportSize = 20;  // 최소 20px
            const maxViewportSize = Math.min(minimapContainerWidth * 0.8, minimapContainerHeight * 0.8); // 최대 80%
            
            // 뷰포트 크기 계산 (화면 크기 기준)
            const viewportScaleX = viewportWidth / contentWidth;
            const viewportScaleY = viewportHeight / contentHeight;
            
            // 미니맵에서의 뷰포트 크기
            let minimapViewportWidth = viewportWidth * (minimapContainerWidth / contentWidth);
            let minimapViewportHeight = viewportHeight * (minimapContainerHeight / contentHeight);
            
            // 크기 제한 적용
            minimapViewportWidth = Math.max(minViewportSize, Math.min(maxViewportSize, minimapViewportWidth));
            minimapViewportHeight = Math.max(minViewportSize, Math.min(maxViewportSize, minimapViewportHeight));
            
            // 스케일 계산 (제한된 크기 기준)
            const scaleX = minimapContainerWidth / contentWidth;
            const scaleY = minimapContainerHeight / contentHeight;
            
            // 스크롤 위치를 콘텐츠 영역 기준으로 변환
            const relativeScrollLeft = scrollLeft - this.canvasBounds.minX;
            const relativeScrollTop = scrollTop - this.canvasBounds.minY;
            
            const minimapX = relativeScrollLeft * scaleX;
            const minimapY = relativeScrollTop * scaleY;
            
            // 뷰포트 업데이트
            this.minimapViewport.style.left = minimapX + 'px';
            this.minimapViewport.style.top = minimapY + 'px';
            this.minimapViewport.style.width = minimapViewportWidth + 'px';
            this.minimapViewport.style.height = minimapViewportHeight + 'px';
            
            // 로그 간소화
            if (Math.random() < 0.1) {
                console.log(`뷰포트: 스크롤(${Math.round(scrollLeft)}, ${Math.round(scrollTop)})`);
            }
            return;
        }
        
        // Transform 값 가져오기
        const transform = canvasContent.style.transform;
        let transformX = 0, transformY = 0;
        
        if (transform && transform !== 'none') {
            const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (match) {
                transformX = parseFloat(match[1]);
                transformY = parseFloat(match[2]);
            }
        }
        
        // 실제 화면에 보이는 영역 크기 (캔버스 컨테이너의 크기)
        const viewportWidth = this.canvas.parentElement.clientWidth;
        const viewportHeight = this.canvas.parentElement.clientHeight;
        
        // 미니맵 컨테이너 크기 (고정)
        const minimapContainerWidth = this.minimapContent.clientWidth;
        const minimapContainerHeight = this.minimapContent.clientHeight;
        
        // 콘텐츠 영역을 기준으로 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 미니맵에서 뷰포트 위치 계산 (콘텐츠 영역 대비 비율)
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // Transform 위치를 콘텐츠 영역 기준으로 변환
        // Transform은 음수이므로 양수로 변환하여 실제 화면 위치 계산
        const actualViewportX = -transformX;
        const actualViewportY = -transformY;
        
        // 콘텐츠 영역 기준으로 변환
        const relativeViewportX = actualViewportX - this.canvasBounds.minX;
        const relativeViewportY = actualViewportY - this.canvasBounds.minY;
        
        let minimapX = relativeViewportX * scaleX;
        let minimapY = relativeViewportY * scaleY;
        const minimapWidth = viewportWidth * scaleX;
        const minimapHeight = viewportHeight * scaleY;
        
        // 미니맵 경계 내로 제한
        const maxX = minimapContainerWidth - minimapWidth;
        const maxY = minimapContainerHeight - minimapHeight;
        
        minimapX = Math.max(0, Math.min(minimapX, maxX));
        minimapY = Math.max(0, Math.min(minimapY, maxY));
        
        // 뷰포트 업데이트
        this.minimapViewport.style.left = minimapX + 'px';
        this.minimapViewport.style.top = minimapY + 'px';
        this.minimapViewport.style.width = minimapWidth + 'px';
        this.minimapViewport.style.height = minimapHeight + 'px';
        
        // 디버깅 로그 (뷰포트 위치 확인)
        if (Math.random() < 0.1) {
            console.log(`뷰포트 디버깅:`);
            console.log(`- Transform: (${Math.round(transformX)}, ${Math.round(transformY)})`);
            console.log(`- 실제 뷰포트: (${Math.round(actualViewportX)}, ${Math.round(actualViewportY)})`);
            console.log(`- 콘텐츠 영역: (${this.canvasBounds.minX}-${this.canvasBounds.maxX}, ${this.canvasBounds.minY}-${this.canvasBounds.maxY})`);
            console.log(`- 미니맵 위치: (${Math.round(minimapX)}, ${Math.round(minimapY)})`);
            console.log(`- 미니맵 크기: (${Math.round(minimapWidth)}, ${Math.round(minimapHeight)})`);
            console.log(`- 스케일: (${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`);
        }
    }
    
    /**
     * 미니맵 노드들 제거
     * 미니맵에 표시된 모든 노드들을 제거합니다.
     */
    clearMinimapNodes() {
        this.minimapNodes.forEach(node => {
            node.remove();
        });
        this.minimapNodes.clear();
    }
    
    /**
     * 노드 추가 이벤트 처리
     * 새 노드가 캔버스에 추가될 때 미니맵에도 추가합니다.
     */
    onNodeAdded(node) {
        this.addMinimapNode(node);
    }
    
    /**
     * 노드 이동 이벤트 처리
     * 노드가 이동할 때 미니맵의 노드 위치도 업데이트합니다.
     */
    onNodeMoved(node) {
        this.updateMinimapNode(node);
    }
    
    /**
     * 노드 삭제 이벤트 처리
     * 노드가 삭제될 때 미니맵에서도 제거합니다.
     */
    onNodeRemoved(nodeId) {
        const minimapNode = this.minimapNodes.get(nodeId);
        if (minimapNode) {
            minimapNode.remove();
            this.minimapNodes.delete(nodeId);
        }
    }
    
    /**
     * 전체 미니맵 새로고침
     * 미니맵을 완전히 다시 그립니다.
     */
    refresh() {
        this.updateMinimap();
    }
}

// 전역으로 사용할 수 있도록 export
window.MinimapManager = MinimapManager;

// 페이지 로드 완료 후 미니맵 매니저 인스턴스 생성 (캔버스 크기 확장 후)
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 로드 완료 - 미니맵 매니저 인스턴스 생성 대기');
    
    const initMinimap = () => {
        const minimapContent = document.getElementById('minimap-content');
        if (minimapContent && window.nodeManager && window.nodeManager.canvas) {
            // 캔버스 크기가 제대로 설정되었는지 확인 - 상세 디버깅
            const canvas = window.nodeManager.canvas;
            const styleWidth = canvas.style.width;
            const styleHeight = canvas.style.height;
            const scrollWidth = canvas.scrollWidth;
            const scrollHeight = canvas.scrollHeight;
            const clientWidth = canvas.clientWidth;
            const clientHeight = canvas.clientHeight;
            
            const parsedWidth = parseInt(styleWidth);
            const parsedHeight = parseInt(styleHeight);
            
            // scrollWidth와 scrollHeight를 우선 사용 (실제 콘텐츠 크기)
            const canvasWidth = scrollWidth;
            const canvasHeight = scrollHeight;
            
            console.log(`=== 미니맵 초기화 디버깅 ===`);
            console.log(`- style.width: "${styleWidth}" (parsed: ${parsedWidth})`);
            console.log(`- style.height: "${styleHeight}" (parsed: ${parsedHeight})`);
            console.log(`- scrollWidth: ${scrollWidth}, scrollHeight: ${scrollHeight}`);
            console.log(`- clientWidth: ${clientWidth}, clientHeight: ${clientHeight}`);
            console.log(`- 최종 캔버스 크기: ${canvasWidth}x${canvasHeight}`);
            console.log(`- 조건 확인: ${canvasWidth} >= 6000 && ${canvasHeight} >= 4000 = ${canvasWidth >= 6000 && canvasHeight >= 4000}`);
            
            // 무한 캔버스 모드에서는 크기 제한 없이 바로 초기화
            window.minimapManager = new MinimapManager(window.nodeManager.canvas, minimapContent);
            console.log('미니맵 매니저 인스턴스 생성 완료:', window.minimapManager);
            console.log(`미니맵 초기화 완료 - 무한 캔버스 모드 활성화`);
            console.log(`현재 캔버스 크기: ${canvasWidth}x${canvasHeight}`);
        } else {
            console.log('미니맵 매니저 생성 조건 미충족 - 재시도');
            console.log(`- minimapContent: ${!!minimapContent}`);
            console.log(`- window.nodeManager: ${!!window.nodeManager}`);
            console.log(`- window.nodeManager.canvas: ${!!(window.nodeManager && window.nodeManager.canvas)}`);
            setTimeout(initMinimap, 100);
        }
    };
    
    // 캔버스 크기 확장 후 미니맵 초기화 (더 긴 대기 시간)
    setTimeout(initMinimap, 1000);
});