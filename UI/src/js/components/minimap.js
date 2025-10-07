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
        
        // === 통합된 크기 설정 ===
        this.canvasSize = { width: 3000, height: 2000 }; // 실제 캔버스 크기
        this.minimapSize = { width: 400, height: 300 };  // 미니맵 컨테이너 크기
        this.padding = 200;                      // 캔버스 여백
        
        // === 미니맵 설정 ===
        this.scale = 0.08;                       // 미니맵 스케일 (8% 크기로 축소)
        
        // === 캔버스 경계 관련 속성 ===
        this.canvasBounds = {                    // 현재 캔버스의 실제 콘텐츠 경계
            minX: 0, maxX: this.canvasSize.width,
            minY: 0, maxY: this.canvasSize.height
        };
        
        // === 드래그 관련 속성 ===
        this.isDragging = false;                 // 미니맵 드래그 중인지 여부
        this.dragStart = { x: 0, y: 0 };         // 드래그 시작 시 마우스 좌표
        
        // === 노드 관리 ===
        this.minimapNodes = new Map();           // 미니맵에 표시된 노드들 저장
        
        // === 연결선 관리 ===
        this.minimapConnections = new Map();     // 미니맵에 표시된 연결선들 저장
        this.minimapSVG = null;                  // 미니맵용 SVG 컨테이너
        
        // === 초기화 상태 관리 ===
        this.isInitialized = false;              // 초기화 완료 여부
        
        this.init();
    }
    
    /**
     * 초기화 메서드
     * 이벤트 리스너 설정과 초기 미니맵 업데이트를 수행합니다.
     */
    init() {
        if (this.isInitialized) {
            console.log('미니맵이 이미 초기화되었습니다');
            return;
        }
        
        console.log('미니맵 초기화 시작');
        
        this.setupEventListeners();
        this.setupMinimapSVG();
        this.updateMinimap();
        
        // 캔버스 스크롤 이벤트 리스너 (스크롤 시 뷰포트 업데이트)
        this.canvas.addEventListener('scroll', () => {
            this.updateViewport();
        });
        
        // Transform 기반 패닝 감지를 위한 MutationObserver
        this.setupTransformObserver();
        
        // 윈도우 리사이즈 이벤트 리스너 (화면 크기 변경 시 미니맵 업데이트)
        window.addEventListener('resize', () => {
            this.updateMinimap();
        });
        
        this.isInitialized = true;
        console.log('미니맵 초기화 완료');
    }
    
    /**
     * 미니맵 SVG 컨테이너 설정
     * 미니맵에 연결선을 표시하기 위한 SVG 컨테이너를 생성합니다.
     */
    setupMinimapSVG() {
        // 기존 SVG 제거
        if (this.minimapSVG) {
            this.minimapSVG.remove();
        }
        
        // SVG 컨테이너 생성
        this.minimapSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.minimapSVG.setAttribute('class', 'minimap-svg');
        this.minimapSVG.style.position = 'absolute';
        this.minimapSVG.style.top = '0';
        this.minimapSVG.style.left = '0';
        this.minimapSVG.style.width = '100%';
        this.minimapSVG.style.height = '100%';
        this.minimapSVG.style.pointerEvents = 'none';
        this.minimapSVG.style.zIndex = '1';
        
        // 미니맵 컨테이너에 SVG 추가
        this.minimapContent.appendChild(this.minimapSVG);
        
        console.log('미니맵 SVG 컨테이너 설정 완료');
    }
    
    /**
     * Transform 변경 감지를 위한 Observer 설정
     * 캔버스 콘텐츠의 Transform이 변경될 때마다 뷰포트를 업데이트합니다.
     */
    setupTransformObserver() {
        const canvasContent = document.getElementById('canvas-content');
        if (!canvasContent) return;
        
        // MutationObserver로 style 속성 변경 감지
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.updateViewport();
                }
            });
        });
        
        observer.observe(canvasContent, {
            attributes: true,
            attributeFilter: ['style']
        });
        
        console.log('미니맵 Transform Observer 설정 완료');
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
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 클릭 무시
        if (contentWidth <= 0 || contentHeight <= 0) {
            return;
        }
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 미니맵 스케일 계산
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 미니맵 좌표를 콘텐츠 좌표로 변환
        const contentX = (x / scaleX) + this.canvasBounds.minX;
        const contentY = (y / scaleY) + this.canvasBounds.minY;
        
        // 실제 화면 크기
        const workflowArea = this.canvas.parentElement;
        const viewportWidth = workflowArea.clientWidth;
        const viewportHeight = workflowArea.clientHeight;
        
        // 클릭한 위치를 화면 중앙에 오도록 계산
        const targetX = contentX - (viewportWidth / 2);
        const targetY = contentY - (viewportHeight / 2);
        
        // 캔버스 콘텐츠 컨테이너 확인
        const canvasContent = document.getElementById('canvas-content');
        
        if (canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            // Transform은 음수이므로 양수로 변환
            canvasContent.style.transform = `translate(${-targetX}px, ${-targetY}px)`;
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            this.canvas.scrollLeft = Math.max(0, targetX);
            this.canvas.scrollTop = Math.max(0, targetY);
        }
        
        this.updateViewport();
        
        console.log(`미니맵 클릭으로 이동: (${Math.round(targetX)}, ${Math.round(targetY)})`);
    }
    
    /**
     * 미니맵 더블클릭 처리
     * 더블클릭한 위치로 캔버스를 부드럽게 이동시킵니다.
     */
    handleMinimapDoubleClick(e) {
        const rect = this.minimapContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 더블클릭 무시
        if (contentWidth <= 0 || contentHeight <= 0) {
            return;
        }
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 미니맵 스케일 계산
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 미니맵 좌표를 콘텐츠 좌표로 변환
        const contentX = (x / scaleX) + this.canvasBounds.minX;
        const contentY = (y / scaleY) + this.canvasBounds.minY;
        
        // 실제 화면 크기
        const workflowArea = this.canvas.parentElement;
        const viewportWidth = workflowArea.clientWidth;
        const viewportHeight = workflowArea.clientHeight;
        
        // 더블클릭한 위치를 화면 중앙에 오도록 계산
        const targetX = contentX - (viewportWidth / 2);
        const targetY = contentY - (viewportHeight / 2);
        
        // 해당 영역으로 부드럽게 이동
        this.smoothScrollTo(targetX, targetY);
        
        console.log(`미니맵 더블클릭으로 부드러운 이동: (${Math.round(targetX)}, ${Math.round(targetY)})`);
    }
    
    /**
     * 부드러운 스크롤 애니메이션
     * 지정된 위치로 부드럽게 이동하는 애니메이션을 실행합니다.
     */
    smoothScrollTo(targetX, targetY) {
        const canvasContent = document.getElementById('canvas-content');
        
        let startX, startY;
        
        if (canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const transform = canvasContent.style.transform;
            if (transform && transform !== 'none') {
                const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (match) {
                    startX = -parseFloat(match[1]);
                    startY = -parseFloat(match[2]);
                } else {
                    startX = 0;
                    startY = 0;
                }
            } else {
                startX = 0;
                startY = 0;
            }
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            startX = this.canvas.scrollLeft;
            startY = this.canvas.scrollTop;
        }
        
        const duration = 500; // 0.5초
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 부드러운 이징 함수 (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (targetX - startX) * easeOut;
            const currentY = startY + (targetY - startY) * easeOut;
            
            if (canvasContent) {
                // Transform 기반 패닝 (피그마 방식)
                canvasContent.style.transform = `translate(${-currentX}px, ${-currentY}px)`;
            } else {
                // 스크롤 기반 패닝 (전통적 방식)
                this.canvas.scrollLeft = Math.max(0, currentX);
                this.canvas.scrollTop = Math.max(0, currentY);
            }
            
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
        console.log('=== 미니맵 업데이트 시작 ===');
        
        // 기존 미니맵 노드들 제거
        this.clearMinimapNodes();
        
        // 기존 미니맵 연결선들 제거
        this.clearMinimapConnections();
        
        // 캔버스 크기 동적 조정
        this.adjustCanvasSize();
        
        // 캔버스의 모든 노드들을 미니맵에 표시
        // 피그마 방식: 캔버스 콘텐츠 컨테이너에서 노드 찾기
        const canvasContent = document.getElementById('canvas-content');
        const nodes = canvasContent ? canvasContent.querySelectorAll('.workflow-node') : this.canvas.querySelectorAll('.workflow-node');
        
        console.log(`미니맵에 추가할 노드 개수: ${nodes.length}`);
        console.log(`현재 미니맵 노드 개수: ${this.minimapNodes.size}`);
        
        nodes.forEach((node, index) => {
            const nodeId = node.id || node.dataset.nodeId;
            console.log(`노드 ${index + 1}: ${nodeId}`);
            this.addMinimapNode(node);
        });
        
        // 연결선들을 미니맵에 표시
        this.updateMinimapConnections();
        
        // 뷰포트 업데이트
        this.updateViewport();
        
        console.log(`=== 미니맵 업데이트 완료 - 노드 ${this.minimapNodes.size}개, 연결선 ${this.minimapConnections.size}개 ===`);
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
            // 노드가 없으면 기본 캔버스 크기로 설정
            this.canvasBounds = {
                minX: -this.padding, 
                maxX: this.canvasSize.width + this.padding,
                minY: -this.padding, 
                maxY: this.canvasSize.height + this.padding
            };
            console.log(`캔버스 경계 업데이트 (노드 없음):`, this.canvasBounds);
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
        
        // 최소 캔버스 크기 보장 (통합된 변수 사용)
        const minWidth = this.canvasSize.width;
        const minHeight = this.canvasSize.height;
        
        // 노드들이 기본 크기보다 작은 영역에만 있으면 최소 크기로 확장
        const nodeWidth = maxX - minX;
        const nodeHeight = maxY - minY;
        
        if (nodeWidth < minWidth) {
            const centerX = (minX + maxX) / 2;
            minX = centerX - minWidth / 2;
            maxX = centerX + minWidth / 2;
        }
        
        if (nodeHeight < minHeight) {
            const centerY = (minY + maxY) / 2;
            minY = centerY - minHeight / 2;
            maxY = centerY + minHeight / 2;
        }
        
        // 여백을 포함한 캔버스 경계 계산
        this.canvasBounds = {
            minX: minX - this.padding,
            maxX: maxX + this.padding,
            minY: minY - this.padding,
            maxY: maxY + this.padding
        };
        
        console.log(`캔버스 경계 업데이트 (${nodes.length}개 노드):`, this.canvasBounds);
        console.log(`- 노드 영역: ${Math.round(nodeWidth)}x${Math.round(nodeHeight)}`);
        console.log(`- 최종 영역: ${Math.round(this.canvasBounds.maxX - this.canvasBounds.minX)}x${Math.round(this.canvasBounds.maxY - this.canvasBounds.minY)}`);
        console.log(`- 캔버스 크기 설정: ${this.canvasSize.width}x${this.canvasSize.height}`);
        console.log(`- 미니맵 크기 설정: ${this.minimapSize.width}x${this.minimapSize.height}`);
    }
    
    /**
     * 미니맵에 노드 추가
     * 캔버스의 노드를 미니맵에 축소된 크기로 표시합니다.
     */
    addMinimapNode(node) {
        const nodeId = node.id || node.dataset.nodeId;
        if (!nodeId) {
            console.warn('노드 ID가 없습니다:', node);
            return;
        }
        
        // 이미 존재하는 노드인지 확인
        if (this.minimapNodes.has(nodeId)) {
            console.log(`미니맵 노드 중복 방지: ${nodeId}`);
            return;
        }
        
        console.log(`미니맵 노드 추가: ${nodeId}`);
        
        // 미니맵 노드 생성
        const minimapNode = document.createElement('div');
        minimapNode.className = 'minimap-node';
        minimapNode.dataset.nodeId = nodeId;
        
        // 노드 색상 결정 (캔버스 노드의 색상 클래스에서 추출)
        const colorClass = Array.from(node.classList).find(cls => cls.startsWith('node-'));
        const color = colorClass ? colorClass.replace('node-', '') : 'blue';
        minimapNode.classList.add(color);
        
        // 노드 위치와 크기 계산
        const x = parseInt(node.style.left) || 0;
        const y = parseInt(node.style.top) || 0;
        const width = node.offsetWidth || 200;
        const height = node.offsetHeight || 100;
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 기본값 사용
        if (contentWidth <= 0 || contentHeight <= 0) {
            console.warn('미니맵 노드 추가: 콘텐츠 영역이 없습니다');
            return;
        }
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 미니맵 스케일 계산
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 노드 위치를 콘텐츠 영역 기준으로 변환
        const relativeX = x - this.canvasBounds.minX;
        const relativeY = y - this.canvasBounds.minY;
        
        // 미니맵에서의 노드 위치와 크기 계산
        const minimapX = relativeX * scaleX;
        const minimapY = relativeY * scaleY;
        const minimapWidth = Math.max(2, width * scaleX); // 최소 2px
        const minimapHeight = Math.max(2, height * scaleY); // 최소 2px
        
        // 미니맵 노드 스타일 설정
        minimapNode.style.left = minimapX + 'px';
        minimapNode.style.top = minimapY + 'px';
        minimapNode.style.width = minimapWidth + 'px';
        minimapNode.style.height = minimapHeight + 'px';
        
        this.minimapContent.appendChild(minimapNode);
        this.minimapNodes.set(nodeId, minimapNode);
        
        // 디버깅 로그
        if (Math.random() < 0.1) {
            console.log(`미니맵 노드 추가: ${nodeId}`);
            console.log(`- 원본 위치: (${x}, ${y}) 크기: ${width}x${height}`);
            console.log(`- 미니맵 위치: (${Math.round(minimapX)}, ${Math.round(minimapY)}) 크기: ${Math.round(minimapWidth)}x${Math.round(minimapHeight)}`);
        }
    }
    
    /**
     * 미니맵 노드 위치 업데이트
     * 캔버스에서 노드가 이동했을 때 미니맵의 노드 위치도 업데이트합니다.
     */
    updateMinimapNode(node) {
        const nodeId = node.id || node.dataset.nodeId;
        if (!nodeId) {
            console.warn('미니맵 노드 업데이트: 노드 ID가 없습니다');
            return;
        }
        
        const minimapNode = this.minimapNodes.get(nodeId);
        if (!minimapNode) {
            console.warn(`미니맵 노드 업데이트: 노드 ${nodeId}를 찾을 수 없습니다`);
            return;
        }
        
        console.log(`미니맵 노드 위치 업데이트: ${nodeId}`);
        
        // 노드 위치와 크기 계산
        const x = parseInt(node.style.left) || 0;
        const y = parseInt(node.style.top) || 0;
        const width = node.offsetWidth || 200;
        const height = node.offsetHeight || 100;
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 업데이트하지 않음
        if (contentWidth <= 0 || contentHeight <= 0) {
            return;
        }
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 미니맵 스케일 계산
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 노드 위치를 콘텐츠 영역 기준으로 변환
        const relativeX = x - this.canvasBounds.minX;
        const relativeY = y - this.canvasBounds.minY;
        
        // 미니맵에서의 노드 위치와 크기 계산
        const minimapX = relativeX * scaleX;
        const minimapY = relativeY * scaleY;
        const minimapWidth = Math.max(2, width * scaleX); // 최소 2px
        const minimapHeight = Math.max(2, height * scaleY); // 최소 2px
        
        // 미니맵 노드 스타일 업데이트
        minimapNode.style.left = minimapX + 'px';
        minimapNode.style.top = minimapY + 'px';
        minimapNode.style.width = minimapWidth + 'px';
        minimapNode.style.height = minimapHeight + 'px';
    }
    
    /**
     * 뷰포트 업데이트
     * 현재 캔버스에서 보이는 영역을 미니맵에 표시합니다.
     */
    updateViewport() {
        if (!this.minimapViewport) return;
        
        // 캔버스 콘텐츠 컨테이너 확인
        const canvasContent = document.getElementById('canvas-content');
        
        // 실제 화면에 보이는 영역 크기 (워크플로우 영역의 크기)
        const workflowArea = this.canvas.parentElement;
        const viewportWidth = workflowArea.clientWidth;
        const viewportHeight = workflowArea.clientHeight;
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 기본값 사용
        if (contentWidth <= 0 || contentHeight <= 0) {
            this.minimapViewport.style.display = 'none';
            return;
        }
        
        // 미니맵 스케일 계산 (콘텐츠를 미니맵에 맞게 축소)
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 뷰포트 크기 계산 (실제 화면 크기를 미니맵 스케일로 변환)
        const minimapViewportWidth = viewportWidth * scaleX;
        const minimapViewportHeight = viewportHeight * scaleY;
        
        let currentViewX = 0;
        let currentViewY = 0;
        
        if (canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const transform = canvasContent.style.transform;
            if (transform && transform !== 'none') {
                const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (match) {
                    // Transform은 음수이므로 양수로 변환
                    currentViewX = -parseFloat(match[1]);
                    currentViewY = -parseFloat(match[2]);
                }
            }
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            currentViewX = this.canvas.scrollLeft;
            currentViewY = this.canvas.scrollTop;
        }
        
        // 현재 뷰포트 위치를 콘텐츠 영역 기준으로 변환
        const relativeViewX = currentViewX - this.canvasBounds.minX;
        const relativeViewY = currentViewY - this.canvasBounds.minY;
        
        // 미니맵에서의 뷰포트 위치 계산
        let minimapX = relativeViewX * scaleX;
        let minimapY = relativeViewY * scaleY;
        
        // 미니맵 경계 내로 제한
        const maxX = minimapContainerWidth - minimapViewportWidth;
        const maxY = minimapContainerHeight - minimapViewportHeight;
        
        minimapX = Math.max(0, Math.min(minimapX, maxX));
        minimapY = Math.max(0, Math.min(minimapY, maxY));
        
        // 뷰포트 업데이트
        this.minimapViewport.style.left = minimapX + 'px';
        this.minimapViewport.style.top = minimapY + 'px';
        this.minimapViewport.style.width = minimapViewportWidth + 'px';
        this.minimapViewport.style.height = minimapViewportHeight + 'px';
        this.minimapViewport.style.display = 'block';
        
        // 디버깅 로그 (간소화)
        if (Math.random() < 0.05) {
            console.log(`미니맵 뷰포트 업데이트:`);
            console.log(`- 현재 뷰: (${Math.round(currentViewX)}, ${Math.round(currentViewY)})`);
            console.log(`- 콘텐츠 영역: ${Math.round(contentWidth)}x${Math.round(contentHeight)}`);
            console.log(`- 미니맵 위치: (${Math.round(minimapX)}, ${Math.round(minimapY)})`);
            console.log(`- 미니맵 크기: ${Math.round(minimapViewportWidth)}x${Math.round(minimapViewportHeight)}`);
            console.log(`- 미니맵 컨테이너: ${minimapContainerWidth}x${minimapContainerHeight}`);
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
     * 미니맵 연결선들 제거
     * 미니맵에 표시된 모든 연결선들을 제거합니다.
     */
    clearMinimapConnections() {
        if (this.minimapSVG) {
            this.minimapSVG.innerHTML = '';
        }
        this.minimapConnections.clear();
    }
    
    /**
     * 미니맵 연결선 업데이트
     * 캔버스의 모든 연결선들을 미니맵에 표시합니다.
     */
    updateMinimapConnections() {
        if (!this.minimapSVG) return;
        
        console.log('=== 미니맵 연결선 업데이트 시작 ===');
        
        // 기존 연결선 모두 제거
        this.clearMinimapConnections();
        
        // 연결선 매니저에서 연결선 정보 가져오기
        if (!window.connectionManager || !window.connectionManager.connections) {
            console.log('연결선 매니저 또는 연결선 정보가 없습니다');
            console.log(`- window.connectionManager: ${!!window.connectionManager}`);
            console.log(`- window.connectionManager.connections: ${!!(window.connectionManager && window.connectionManager.connections)}`);
            if (window.connectionManager) {
                console.log(`- connectionManager.connections.size: ${window.connectionManager.connections ? window.connectionManager.connections.size : 'undefined'}`);
            }
            
            // 연결선 매니저가 없으면 초기화 시도
            if (window.nodeManager && window.nodeManager.canvas && window.ConnectionManager) {
                console.log('미니맵에서 연결선 매니저 초기화 시도...');
                window.nodeManager.connectionManager = new window.ConnectionManager(window.nodeManager.canvas);
                if (window.setConnectionManager) {
                    window.setConnectionManager(window.nodeManager.connectionManager);
                }
                console.log('미니맵에서 연결선 매니저 초기화 완료');
                
                // 다시 연결선 정보 확인
                if (window.connectionManager && window.connectionManager.connections) {
                    console.log('연결선 매니저 초기화 후 연결선 정보 확인됨');
                } else {
                    console.log('연결선 매니저 초기화 후에도 연결선 정보가 없습니다');
                    return;
                }
            } else {
                return;
            }
        }
        
        console.log(`연결선 매니저에서 가져온 연결선 개수: ${window.connectionManager.connections.size}`);
        
        // 모든 연결선을 미니맵에 표시
        window.connectionManager.connections.forEach((connection, connectionId) => {
            console.log(`미니맵에 연결선 추가: ${connectionId}`);
            console.log(`- 연결선 정보:`, connection);
            this.addMinimapConnection(connectionId, connection);
        });
        
        console.log(`=== 미니맵 연결선 업데이트 완료 - 연결선 ${this.minimapConnections.size}개 ===`);
    }
    
    /**
     * 미니맵에 연결선 추가
     * 캔버스의 연결선을 미니맵에 축소된 크기로 표시합니다.
     */
    addMinimapConnection(connectionId, connection) {
        if (!this.minimapSVG) {
            console.warn('미니맵 SVG가 없습니다');
            return;
        }
        
        // 이미 존재하는 연결선인지 확인
        if (this.minimapConnections.has(connectionId)) {
            console.log(`미니맵 연결선 중복 방지: ${connectionId}`);
            return; // 중복 추가 방지
        }
        
        console.log(`미니맵 연결선 추가 시작: ${connectionId}`);
        
        // 연결선의 시작점과 끝점 노드 찾기
        // 연결선 정보에서 from과 to 속성 사용 (fromNodeId, toNodeId가 아님)
        const fromNodeId = connection.from || connection.fromNodeId;
        const toNodeId = connection.to || connection.toNodeId;
        
        const fromNode = document.getElementById(fromNodeId);
        const toNode = document.getElementById(toNodeId);
        
        if (!fromNode || !toNode) {
            console.warn(`미니맵 연결선 추가 실패: 노드를 찾을 수 없습니다 - ${fromNodeId}, ${toNodeId}`);
            console.log('연결선 정보:', connection);
            return;
        }
        
        console.log(`미니맵 연결선 노드 찾기 성공: ${fromNodeId} -> ${toNodeId}`);
        
        // 노드 위치 계산
        const fromX = parseInt(fromNode.style.left) || 0;
        const fromY = parseInt(fromNode.style.top) || 0;
        const fromWidth = fromNode.offsetWidth || 200;
        const fromHeight = fromNode.offsetHeight || 100;
        
        const toX = parseInt(toNode.style.left) || 0;
        const toY = parseInt(toNode.style.top) || 0;
        const toWidth = toNode.offsetWidth || 200;
        const toHeight = toNode.offsetHeight || 100;
        
        // 연결점 위치 계산 (노드 중심)
        const fromCenterX = fromX + fromWidth / 2;
        const fromCenterY = fromY + fromHeight / 2;
        const toCenterX = toX + toWidth / 2;
        const toCenterY = toY + toHeight / 2;
        
        // 콘텐츠 영역 크기 계산
        const contentWidth = this.canvasBounds.maxX - this.canvasBounds.minX;
        const contentHeight = this.canvasBounds.maxY - this.canvasBounds.minY;
        
        // 콘텐츠가 없으면 기본값 사용
        if (contentWidth <= 0 || contentHeight <= 0) {
            return;
        }
        
        // 미니맵 컨테이너 크기 (통합된 변수 사용)
        const minimapContainerWidth = this.minimapSize.width;
        const minimapContainerHeight = this.minimapSize.height;
        
        // 미니맵 스케일 계산
        const scaleX = minimapContainerWidth / contentWidth;
        const scaleY = minimapContainerHeight / contentHeight;
        
        // 연결점 위치를 콘텐츠 영역 기준으로 변환
        const fromRelativeX = fromCenterX - this.canvasBounds.minX;
        const fromRelativeY = fromCenterY - this.canvasBounds.minY;
        const toRelativeX = toCenterX - this.canvasBounds.minX;
        const toRelativeY = toCenterY - this.canvasBounds.minY;
        
        // 미니맵에서의 연결점 위치 계산
        const fromMinimapX = fromRelativeX * scaleX;
        const fromMinimapY = fromRelativeY * scaleY;
        const toMinimapX = toRelativeX * scaleX;
        const toMinimapY = toRelativeY * scaleY;
        
        // SVG 경로 생성 (곡선 연결선)
        const controlPoint1X = fromMinimapX + (toMinimapX - fromMinimapX) * 0.5;
        const controlPoint1Y = fromMinimapY;
        const controlPoint2X = fromMinimapX + (toMinimapX - fromMinimapX) * 0.5;
        const controlPoint2Y = toMinimapY;
        
        const pathData = `M ${fromMinimapX} ${fromMinimapY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toMinimapX} ${toMinimapY}`;
        
        // SVG 경로 요소 생성
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'minimap-connection-line');
        path.setAttribute('data-connection-id', connectionId);
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '0.5'); // 더 얇게
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', '0.5'); // 더 투명하게
        
        // SVG에 경로 추가
        this.minimapSVG.appendChild(path);
        this.minimapConnections.set(connectionId, path);
        
        // 디버깅 로그
        if (Math.random() < 0.1) {
            console.log(`미니맵 연결선 추가: ${connectionId}`);
            console.log(`- 원본 위치: (${fromCenterX}, ${fromCenterY}) -> (${toCenterX}, ${toCenterY})`);
            console.log(`- 미니맵 위치: (${Math.round(fromMinimapX)}, ${Math.round(fromMinimapY)}) -> (${Math.round(toMinimapX)}, ${Math.round(toMinimapY)})`);
        }
    }
    
    /**
     * 노드 추가 이벤트 처리
     * 새 노드가 캔버스에 추가될 때 미니맵에도 추가합니다.
     */
    onNodeAdded(node) {
        this.addMinimapNode(node);
        // 연결선도 업데이트
        this.updateMinimapConnections();
    }
    
    /**
     * 노드 이동 이벤트 처리
     * 노드가 이동할 때 미니맵의 노드 위치도 업데이트합니다.
     */
    onNodeMoved(node) {
        console.log(`미니맵 노드 이동 처리: ${node.id || node.dataset.nodeId}`);
        
        // 노드 위치만 업데이트 (전체 업데이트는 하지 않음)
        this.updateMinimapNode(node);
        
        // 연결선도 업데이트 (항상 업데이트)
        console.log('미니맵 연결선 업데이트 시작');
        this.updateMinimapConnections();
        
        console.log(`미니맵 노드 이동 처리 완료 - 현재 노드 개수: ${this.minimapNodes.size}`);
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
        // 연결선도 업데이트
        this.updateMinimapConnections();
    }
    
    /**
     * 연결선 추가 이벤트 처리
     * 새 연결선이 추가될 때 미니맵에도 추가합니다.
     */
    onConnectionAdded(connectionId, connection) {
        this.addMinimapConnection(connectionId, connection);
    }
    
    /**
     * 연결선 업데이트 이벤트 처리
     * 연결선이 업데이트될 때 미니맵의 연결선도 업데이트합니다.
     */
    onConnectionUpdated(connectionId, connection) {
        // 기존 연결선 제거
        const existingPath = this.minimapConnections.get(connectionId);
        if (existingPath) {
            existingPath.remove();
            this.minimapConnections.delete(connectionId);
        }
        // 새 연결선 추가
        this.addMinimapConnection(connectionId, connection);
    }
    
    /**
     * 연결선 삭제 이벤트 처리
     * 연결선이 삭제될 때 미니맵에서도 제거합니다.
     */
    onConnectionRemoved(connectionId) {
        const minimapConnection = this.minimapConnections.get(connectionId);
        if (minimapConnection) {
            minimapConnection.remove();
            this.minimapConnections.delete(connectionId);
        }
    }
    
    /**
     * 전체 미니맵 새로고침
     * 미니맵을 완전히 다시 그립니다.
     */
    refresh() {
        this.updateMinimap();
    }
    
    /**
     * 미니맵 크기 설정 메서드
     * 캔버스 크기와 미니맵 크기를 통합적으로 관리합니다.
     */
    setSizes(canvasSize, minimapSize, padding = 200) {
        this.canvasSize = canvasSize;
        this.minimapSize = minimapSize;
        this.padding = padding;
        
        // 캔버스 경계 업데이트
        this.canvasBounds = {
            minX: 0, maxX: this.canvasSize.width,
            minY: 0, maxY: this.canvasSize.height
        };
        
        console.log(`미니맵 크기 설정 업데이트:`);
        console.log(`- 캔버스 크기: ${this.canvasSize.width}x${this.canvasSize.height}`);
        console.log(`- 미니맵 크기: ${this.minimapSize.width}x${this.minimapSize.height}`);
        console.log(`- 여백: ${this.padding}px`);
        
        // 미니맵 새로고침
        this.updateMinimap();
    }
    
    /**
     * 미니맵 크기 가져오기
     * 현재 설정된 크기 정보를 반환합니다.
     */
    getSizes() {
        return {
            canvasSize: this.canvasSize,
            minimapSize: this.minimapSize,
            padding: this.padding,
            canvasBounds: this.canvasBounds
        };
    }
}

// 전역으로 사용할 수 있도록 export
window.MinimapManager = MinimapManager;

// 페이지 로드 완료 후 미니맵 매니저 인스턴스 생성 (캔버스 크기 확장 후)
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM 로드 완료 - 미니맵 매니저 인스턴스 생성 대기 ===');
    
    const initMinimap = () => {
        console.log('=== 미니맵 초기화 시도 ===');
        
        // 이미 미니맵 매니저가 생성되었는지 확인
        if (window.minimapManager) {
            console.log('미니맵 매니저가 이미 존재합니다');
            return;
        }
        
        console.log('미니맵 매니저 생성 조건 확인 중...');
        const minimapContent = document.getElementById('minimap-content');
        console.log(`- minimapContent: ${!!minimapContent}`);
        console.log(`- window.nodeManager: ${!!window.nodeManager}`);
        console.log(`- window.nodeManager.canvas: ${!!(window.nodeManager && window.nodeManager.canvas)}`);
        
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
            console.log('미니맵 매니저 인스턴스 생성 시작...');
            window.minimapManager = new MinimapManager(window.nodeManager.canvas, minimapContent);
            console.log('미니맵 매니저 인스턴스 생성 완료:', window.minimapManager);
            console.log(`미니맵 초기화 완료 - 무한 캔버스 모드 활성화`);
            console.log(`현재 캔버스 크기: ${canvasWidth}x${canvasHeight}`);
            
            // 연결선 매니저 상태 확인
            console.log('연결선 매니저 상태 확인:');
            console.log(`- window.connectionManager: ${!!window.connectionManager}`);
            if (window.connectionManager) {
                console.log(`- connectionManager.connections: ${!!window.connectionManager.connections}`);
                console.log(`- connections.size: ${window.connectionManager.connections ? window.connectionManager.connections.size : 'undefined'}`);
            }
        } else {
            console.log('=== 미니맵 매니저 생성 조건 미충족 - 재시도 ===');
            console.log(`- minimapContent: ${!!minimapContent}`);
            console.log(`- window.nodeManager: ${!!window.nodeManager}`);
            console.log(`- window.nodeManager.canvas: ${!!(window.nodeManager && window.nodeManager.canvas)}`);
            console.log('100ms 후 재시도...');
            setTimeout(initMinimap, 100);
        }
    };
    
    // 캔버스 크기 확장 후 미니맵 초기화 (더 긴 대기 시간)
    setTimeout(initMinimap, 1000);
});