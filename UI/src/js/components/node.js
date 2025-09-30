/**
 * 워크플로우 노드 관리 클래스
 * 
 * 이 클래스는 워크플로우 캔버스에서 노드들을 생성, 관리, 조작하는 모든 기능을 담당합니다.
 * 주요 기능:
 * - 노드 생성, 이동, 삭제
 * - 마우스 휠 패닝 (화면 이동)
 * - Ctrl + 마우스 휠 줌 (확대/축소)
 * - 캔버스 크기 자동 조정
 * - 미니맵과의 연동
 */
class NodeManager {
    constructor() {
        // === 기본 속성 초기화 ===
        this.nodes = [];                    // 생성된 모든 노드들의 배열
        this.selectedNode = null;           // 현재 선택된 노드
        this.nodeData = {};                 // 노드 데이터 저장소 (위치, 설정 등)
        
        // === 드래그 관련 속성 ===
        this.isDragging = false;            // 노드 드래그 중인지 여부
        this.dragOffset = { x: 0, y: 0 };   // 드래그 시작 시 마우스와 노드의 오프셋
        
        // === 패닝 관련 속성 (마우스 휠로 화면 이동) ===
        this.isPanning = false;             // 패닝 모드인지 여부
        this.panStart = { x: 0, y: 0 };     // 패닝 시작 시 마우스 좌표
        this.panScrollStart = { left: 0, top: 0 }; // 패닝 시작 시 스크롤 위치
        
        // === 무한 캔버스 관련 속성 ===
        this.isInfiniteCanvas = true;       // 무한 캔버스 모드 활성화
        
        // === 연결 모드 관련 속성 ===
        this.isConnecting = false;            // 연결 모드 여부
        this.connectionStart = null;          // 연결 시작 정보
        this.canvasSize = { width: 50000, height: 50000 }; // 무한 캔버스 크기
        
        // === 줌 관련 속성 ===
        this.isZooming = false;               // 줌 중인지 여부
        
        // === 연결선 그리기 관련 속성 ===
        this.isDrawingConnection = false;     // 연결선 그리기 모드 여부
        this.connectionStartPoint = null;     // 연결선 시작점
        this.connectionStartConnector = null; // 연결선 시작 연결점
        this.longTouchTimer = null;           // 롱터치 타이머
        this.longTouchDelay = 300;            // 롱터치 지연 시간 (ms)
        this.magneticThreshold = 30;          // 마그네틱 감지 거리 (px)
        
        // === 드래그 연결 관련 속성 ===
        this.isDraggingConnection = false;    // 드래그 연결 모드 여부
        this.dragConnectionStart = null;      // 드래그 연결 시작 정보
        this.tempConnectionLine = null;       // 임시 연결선 요소
        
        // === 클릭 연결 관련 속성 ===
        this.isClickConnecting = false;       // 클릭 연결 모드 여부
        this.clickConnectionStart = null;     // 클릭 연결 시작 정보
        
        // === 캔버스 관련 속성 ===
        this.canvas = null;                 // 워크플로우 캔버스 DOM 요소
        this.isCanvasFocused = false;       // 캔버스에 포커스가 있는지 여부
        
        // === 외부 매니저 참조 ===
        this.connectionManager = null;     // 노드 간 연결선 관리자
        this.minimapManager = null;         // 미니맵 관리자
        
        this.init();
    }
    
    /**
     * 초기화 메서드
     * 캔버스 설정, 이벤트 리스너 등록, 기존 노드 설정을 수행합니다.
     */
    init() {
        // 캔버스 DOM 요소 가져오기
        this.canvas = document.getElementById('workflow-canvas');
        if (!this.canvas) {
            console.error('워크플로우 캔버스를 찾을 수 없습니다.');
            return;
        }
        
        // 캔버스가 항상 스크롤 가능하도록 크기 설정
        this.ensureCanvasScrollable();
        
        // 이벤트 리스너 등록
        this.setupEventListeners();
        
        // 기존 노드들에 이벤트 리스너 추가
        this.setupExistingNodes();
        
        // 외부 매니저들 초기화 (지연 초기화로 다른 컴포넌트들이 로드된 후 실행)
        setTimeout(() => {
            this.initializeExternalManagers();
        }, 100);
    }
    
    /**
     * 외부 매니저들 초기화
     * 연결 관리자와 미니맵 관리자를 초기화합니다.
     */
    initializeExternalManagers() {
        // 연결 관리자 초기화
            if (window.ConnectionManager && !this.connectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                console.log('연결 관리자 초기화 완료');
        } else if (!window.ConnectionManager) {
            console.warn('ConnectionManager 클래스를 찾을 수 없습니다.');
            }
            
        // 미니맵 관리자 초기화
            if (window.MinimapManager && !this.minimapManager) {
                const minimapContent = document.getElementById('minimap-content');
                if (minimapContent) {
                    this.minimapManager = new window.MinimapManager(this.canvas, minimapContent);
                    console.log('미니맵 관리자 초기화 완료');
                }
        } else if (!window.MinimapManager) {
            console.warn('MinimapManager 클래스를 찾을 수 없습니다.');
            }
    }
    
    /**
     * 이벤트 리스너 설정
     * 마우스, 키보드, 휠 등 모든 사용자 입력 이벤트를 처리합니다.
     */
    setupEventListeners() {
        // === 전역 마우스 이벤트 (문서 전체에서 감지) ===
        // 드래그만 전역에서 처리 (패닝은 별도 처리)
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
        
        // === 연결 모드 관련 이벤트 ===
        
        // 캔버스 클릭 이벤트 (연결 모드 취소용)
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                if (this.isConnecting) {
                this.cancelConnection();
                } else if (this.isClickConnecting) {
                    this.cancelClickConnection();
                }
            }
        });
        
        // 마우스 이동 이벤트 (클릭 연결 중 임시 연결선 업데이트)
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isClickConnecting) {
                this.updateClickConnectionLine(e);
            }
        });
        
        // ESC 키 이벤트 (연결 모드 취소용)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isConnecting) {
                e.preventDefault();
                this.cancelConnection();
                } else if (this.isClickConnecting) {
                    e.preventDefault();
                    this.cancelClickConnection();
                }
            }
        });
        this.canvas.addEventListener('wheel', (e) => {
            console.log('Wheel 이벤트 발생:', {
                ctrlKey: e.ctrlKey,
                deltaY: e.deltaY,
                isPanning: this.isPanning,
                isCanvasFocused: this.isCanvasFocused
            });
            
            if (this.isPanning) {
                // 패닝 중에는 스크롤 방지
                console.log('패닝 중이므로 스크롤 방지');
                e.preventDefault();
            } else if (e.ctrlKey) {
                // Ctrl + 마우스 휠로 줌 (포커스 조건 제거)
                console.log('Ctrl + 휠 줌 실행');
                e.preventDefault();
                e.stopPropagation();
                
                // 캔버스에 포커스 설정 (줌 실행 전에)
                this.canvas.focus();
                this.isCanvasFocused = true;
                
                this.handleCanvasZoom(e);
            }
        });
        
        // 컨텍스트 메뉴 방지 (우클릭 메뉴 비활성화)
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // 캔버스 포커스 관리
        this.canvas.addEventListener('focus', () => {
            this.isCanvasFocused = true;
            console.log('캔버스 포커스됨');
        });
        
        this.canvas.addEventListener('blur', () => {
            this.isCanvasFocused = false;
            console.log('캔버스 포커스 해제됨');
        });
        
        // 마우스가 캔버스에 올라가면 자동 포커스
        this.canvas.addEventListener('mouseenter', () => {
            this.canvas.focus();
            console.log('마우스 진입으로 캔버스 포커스 설정');
        });
        
        // 캔버스 클릭 시 포커스 설정 및 디버깅
        this.canvas.addEventListener('click', (e) => {
            this.canvas.focus();
            
            // 디버깅용 로그
            console.log('=== 캔버스 클릭 디버깅 ===');
            console.log(`- 클릭 위치: (${e.clientX}, ${e.clientY})`);
            console.log(`- 스크롤 위치: (${this.canvas.scrollLeft}, ${this.canvas.scrollTop})`);
            console.log(`- 캔버스 크기: ${this.canvas.scrollWidth}x${this.canvas.scrollHeight}`);
            console.log(`- 화면 크기: ${this.canvas.clientWidth}x${this.canvas.clientHeight}`);
            console.log(`- 무한 캔버스 모드: ${this.isInfiniteCanvas}`);
            console.log(`- 패닝 중: ${this.isPanning}`);
        });
        
        // 윈도우 리사이즈 시 캔버스 크기 조정
        window.addEventListener('resize', () => {
            this.ensureCanvasScrollable();
        });
        
        // 마우스 휠 버튼 패닝 (중간 버튼을 누르고 드래그) - 완전히 새로운 접근
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // 중간 마우스 버튼 (마우스 휠)
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('마우스 휠 버튼 누름 - 패닝 시작');
                this.startPan(e);
                
                // 간단한 이벤트 핸들러들
                const handleMove = (moveEvent) => {
                    if (this.isPanning) {
                        this.handlePan(moveEvent);
                    }
                };
                
                const handleUp = (upEvent) => {
                    console.log('마우스 업 감지 - 패닝 종료');
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleUp);
                    document.removeEventListener('mouseleave', handleUp);
                    if (this.isPanning) {
                        this.endPan();
                    }
                };
                
                // 이벤트 리스너 등록
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
                document.addEventListener('mouseleave', handleUp);
            }
        });
        
        // 전역 mouseup 이벤트로 패닝 강제 종료
        document.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                console.log('전역 mouseup - 패닝 강제 종료');
                this.endPan();
            }
        });
        
        // 마우스 휠로 패닝 (피그마 방식)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
            const deltaY = e.deltaY || (e.shiftKey ? 0 : e.deltaY);
            
            // Transform 상태가 없으면 초기화
            if (!this.canvasTransform) {
                this.canvasTransform = {
                    x: -50000,
                    y: -50000,
                    scale: 1
                };
            }
            
            // 피그마 방식: Transform으로 패닝
            const newX = this.canvasTransform.x + deltaX;
            const newY = this.canvasTransform.y + deltaY;
            
            // 현재 실제 줌 상태 가져오기
            const canvasContent = document.getElementById('canvas-content');
            let currentScale = this.canvasTransform.scale;
            if (canvasContent) {
                const currentTransform = canvasContent.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        currentScale = parseFloat(scaleMatch[1]) || 1;
                    }
                }
            }
            
            this.updateCanvasTransform(newX, newY, currentScale);
            
            // 로그 간소화 (10번에 1번만 출력)
            if (Math.random() < 0.1) {
                console.log(`피그마 방식 휠 패닝: translate(${Math.round(newX)}, ${Math.round(newY)})`);
            }
        });
        
        // auxclick 이벤트 완전히 무시 (패닝 방해 방지)
        // auxclick: 보조 마우스 버튼(중간 버튼, 사이드 버튼) 클릭 시 발생하는 이벤트
        // 이벤트 순서: mousedown → auxclick → mouseup
        // button 속성: 0=왼쪽, 1=중간(휠), 2=오른쪽
        // 문제: auxclick이 mousedown 직후에 발생하여 패닝을 방해할 수 있음
        this.canvas.addEventListener('auxclick', (e) => {
            console.log('auxclick 이벤트 무시됨 (패닝 방해 방지):');
            console.log('- 버튼:', e.button, '(0=왼쪽, 1=중간휠, 2=오른쪽)');
            console.log('- 좌표:', { x: e.clientX, y: e.clientY });
            console.log('- 패닝 상태:', this.isPanning);
            console.log('- 설명: auxclick은 패닝을 방해할 수 있어서 무시합니다');
            
            // auxclick 이벤트를 완전히 무시 (preventDefault로 기본 동작 방지)
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // 패닝 종료하지 않음 - mouseup 이벤트만으로 패닝 종료 처리
        });
    }
    
    /**
     * 기존 노드들에 이벤트 리스너 설정
     * 페이지 로드 시 이미 존재하는 노드들에 이벤트를 바인딩합니다.
     */
    setupExistingNodes() {
        const existingNodes = document.querySelectorAll('.workflow-node');
        existingNodes.forEach(node => {
            this.setupNodeEventListeners(node);
        });
    }
    
    /**
     * 개별 노드에 이벤트 리스너 설정
     * 노드의 클릭, 드래그, 선택 등의 이벤트를 처리합니다.
     */
    setupNodeEventListeners(node) {
        // 노드 클릭 시 선택
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
        });
        
        // 노드 드래그 시작
        node.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 왼쪽 마우스 버튼만
                e.preventDefault();
                e.stopPropagation();
                this.startDrag(e, node);
            }
        });
        
        // 노드 호버 효과
        node.addEventListener('mouseenter', () => {
            node.style.transform = 'translateY(-2px)';
        });
        
        node.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                node.style.transform = '';
            }
        });
    }
    
    // ==========================================
    // 노드 생성 관련 메서드들
    // ==========================================
    
    /**
     * 노드 생성 (메인 메서드)
     * 새로운 워크플로우 노드를 생성하고 캔버스에 추가합니다.
     * 
     * @param {Object} nodeData - 노드 데이터
     * @param {string} nodeData.id - 노드 ID
     * @param {string} nodeData.title - 노드 제목
     * @param {string} nodeData.type - 노드 타입 ('action' | 'condition')
     * @param {string} nodeData.color - 노드 색상
     * @param {number} nodeData.x - X 좌표
     * @param {number} nodeData.y - Y 좌표
     * @returns {HTMLElement} 생성된 노드 요소
     */
    createNode(nodeData) {
        try {
            // 1. 기본 노드 요소 생성
            const nodeElement = this.createNodeElement(nodeData);
            
            // 2. 노드 내용 생성
            const nodeContent = this.generateNodeContent(nodeData);
            nodeElement.innerHTML = nodeContent;
            
            // 3. 이벤트 리스너 설정
            this.setupNodeEventListeners(nodeElement);
            
            // 4. 연결 이벤트 설정
            this.setupConnectionEvents(nodeElement);
            
            // 5. 캔버스에 추가
            this.addNodeToCanvas(nodeElement);
            
            // 6. 노드 데이터 저장
            this.saveNodeData(nodeData);
            
            console.log(`노드 생성 완료: ${nodeData.id} (${nodeData.title})`);
            return nodeElement;
            
        } catch (error) {
            console.error('노드 생성 실패:', error);
            throw error;
        }
    }
    
    /**
     * 노드 DOM 요소 생성
     * @param {Object} nodeData - 노드 데이터
     * @returns {HTMLElement} 노드 요소
     */
    createNodeElement(nodeData) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node node-${nodeData.color}`;
        nodeElement.id = nodeData.id;
        nodeElement.dataset.nodeId = nodeData.id;
        nodeElement.style.left = nodeData.x + 'px';
        nodeElement.style.top = nodeData.y + 'px';
        
        return nodeElement;
    }
    
    /**
     * 노드 내용 HTML 생성
     * @param {Object} nodeData - 노드 데이터
     * @returns {string} HTML 내용
     */
    generateNodeContent(nodeData) {
        const nodeTemplates = {
            condition: this.generateConditionNodeContent(nodeData),
            action: this.generateActionNodeContent(nodeData),
            default: this.generateActionNodeContent(nodeData)
        };
        
        return nodeTemplates[nodeData.type] || nodeTemplates.default;
    }
    
    /**
     * 연결점 이벤트 설정
     * n8n 스타일의 연결 기능을 위한 이벤트 리스너를 추가합니다.
     * 
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
        outputConnectors.forEach(outputConnector => {
            this.setupOutputConnectorEvents(outputConnector, nodeElement);
        });
    }
    
    /**
     * 입력 연결점 이벤트 설정
     * @param {HTMLElement} inputConnector - 입력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    setupInputConnectorEvents(inputConnector, nodeElement) {
        // 클릭으로 연결 완료
        inputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
                this.handleInputConnectorClick(inputConnector, nodeElement);
        });
        
        // 더블클릭으로 연결선 삭제
        inputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(inputConnector, nodeElement, 'input');
        });
        
        // 연결점에 연결 상태 표시
        const connections = this.findConnectionsByNode(nodeElement.dataset.nodeId, 'input');
        this.updateConnectorVisualState(inputConnector, connections.length > 0);
        
        inputConnector.addEventListener('mouseenter', (e) => {
            const tooltipText = connections.length > 0 ? 
                `입력 연결점 (${connections.length}개 연결됨)` : '입력 연결점';
            this.showConnectorTooltip(inputConnector, tooltipText);
        });
        
        inputConnector.addEventListener('mouseleave', (e) => {
            this.hideConnectorTooltip();
        });
    }
    
    /**
     * 출력 연결점 이벤트 설정
     * @param {HTMLElement} outputConnector - 출력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    setupOutputConnectorEvents(outputConnector, nodeElement) {
        // 클릭으로 연결 모드 시작
        outputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isClickConnecting) {
                // 연결 모드 중: 연결 완료
                const nodeId = nodeElement.dataset.nodeId;
                const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                                  outputConnector.classList.contains('false-output') ? 'false' : 'default';
                this.completeClickConnection(nodeId, outputType);
            } else {
                // 연결 모드가 아님: 연결 시작
                this.startClickConnection(outputConnector, nodeElement);
            }
        });
        
        // 더블클릭으로 연결선 삭제
        outputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(outputConnector, nodeElement, 'output');
        });
        
        // 연결점에 연결 상태 표시
        const outputConnections = this.findConnectionsByNode(nodeElement.dataset.nodeId, 'output');
        this.updateConnectorVisualState(outputConnector, outputConnections.length > 0);
        
        outputConnector.addEventListener('mouseenter', (e) => {
            const label = outputConnector.querySelector('.output-label');
            const baseText = label ? label.textContent : '출력 연결점';
            const tooltipText = outputConnections.length > 0 ? 
                `${baseText} (${outputConnections.length}개 연결됨)` : baseText;
            this.showConnectorTooltip(outputConnector, tooltipText);
        });
        
        outputConnector.addEventListener('mouseleave', (e) => {
            this.hideConnectorTooltip();
        });
    }
    
    /**
     * 입력 연결점 클릭 처리
     * @param {HTMLElement} inputConnector - 입력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    handleInputConnectorClick(inputConnector, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        
        if (this.isClickConnecting) {
            // 연결 모드 중: 연결 완료
            this.completeClickConnection(nodeId, 'input');
        } else {
            // 연결 모드가 아님: 입력 연결점에서 연결 시작
            this.startClickConnectionFromInput(inputConnector, nodeElement);
        }
    }
    
    /**
     * 클릭 연결 시작 (출력 연결점에서)
     * 출력 연결점을 클릭하면 연결 모드를 시작합니다.
     * @param {HTMLElement} outputConnector - 출력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    startClickConnection(outputConnector, nodeElement) {
        console.log('출력 연결점에서 클릭 연결 시작');
        
        const nodeId = nodeElement.dataset.nodeId;
        const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                          outputConnector.classList.contains('false-output') ? 'false' : 'default';
        
        // 클릭 연결 상태 설정
        this.isClickConnecting = true;
        this.clickConnectionStart = {
            nodeId: nodeId,
            outputType: outputType,
            connector: outputConnector,
            isFromOutput: true
        };
        
        // 연결점 하이라이트
        outputConnector.style.backgroundColor = '#FF6B35';
        outputConnector.style.borderColor = '#FF6B35';
        outputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // 임시 연결선 생성
        const startPos = this.getConnectorPosition(outputConnector);
        this.createTempConnectionLine(startPos.x, startPos.y);
        
        // 연결 모드 메시지 표시
        this.showClickConnectionMessage('입력 연결점을 클릭하여 연결하세요');
        
        // 모든 입력 연결점 활성화
        this.activateInputConnectors();
        
        console.log(`출력 연결점에서 클릭 연결 시작: ${nodeId} (${outputType})`);
    }
    
    /**
     * 클릭 연결 시작 (입력 연결점에서)
     * 입력 연결점을 클릭하면 연결 모드를 시작합니다.
     * @param {HTMLElement} inputConnector - 입력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    startClickConnectionFromInput(inputConnector, nodeElement) {
        console.log('입력 연결점에서 클릭 연결 시작');
        
        const nodeId = nodeElement.dataset.nodeId;
        
        // 클릭 연결 상태 설정
        this.isClickConnecting = true;
        this.clickConnectionStart = {
            nodeId: nodeId,
            outputType: 'input',
            connector: inputConnector,
            isFromOutput: false
        };
        
        // 연결점 하이라이트
        inputConnector.style.backgroundColor = '#FF6B35';
        inputConnector.style.borderColor = '#FF6B35';
        inputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // 임시 연결선 생성
        const startPos = this.getConnectorPosition(inputConnector);
        this.createTempConnectionLine(startPos.x, startPos.y);
        
        // 연결 모드 메시지 표시
        this.showClickConnectionMessage('출력 연결점을 클릭하여 연결하세요');
        
        // 모든 출력 연결점 활성화
        this.activateOutputConnectors();
        
        console.log(`입력 연결점에서 클릭 연결 시작: ${nodeId}`);
    }
    
    /**
     * 클릭 연결 완료
     * 연결점을 클릭하면 연결을 완료합니다.
     * @param {string} nodeId - 대상 노드 ID
     * @param {string} connectorType - 연결점 타입
     */
    completeClickConnection(nodeId, connectorType) {
        if (!this.isClickConnecting || !this.clickConnectionStart) {
            console.warn('클릭 연결 모드가 활성화되지 않았습니다.');
            return;
        }
        
        const startNodeId = this.clickConnectionStart.nodeId;
        const startOutputType = this.clickConnectionStart.outputType;
        const isFromOutput = this.clickConnectionStart.isFromOutput;
        
        // 연결 방향에 따른 유효성 검사
        let isValid = false;
        if (isFromOutput) {
            // 출력 → 입력 연결
            isValid = this.validateConnection(startNodeId, nodeId, 'output', 'input');
        } else {
            // 입력 → 출력 연결
            isValid = this.validateConnection(nodeId, startNodeId, 'input', 'output');
        }
        
        if (!isValid) {
            this.cancelClickConnection();
            return;
        }
        
        // 연결 생성
        if (isFromOutput) {
            this.createNodeConnection(startNodeId, nodeId, startOutputType, connectorType);
        } else {
            this.createNodeConnection(nodeId, startNodeId, connectorType, 'input');
        }
        
        // 클릭 연결 정리
        this.cleanupClickConnection();
        
        console.log(`클릭 연결 완료: ${startNodeId}(${startOutputType}) → ${nodeId}(${connectorType})`);
    }
    
    /**
     * 클릭 연결 취소
     * ESC 키나 캔버스 클릭 시 클릭 연결 모드를 취소합니다.
     */
    cancelClickConnection() {
        console.log('클릭 연결 취소');
        this.cleanupClickConnection();
    }
    
    /**
     * 클릭 연결 정리
     * 클릭 연결 관련 상태와 UI를 정리합니다.
     */
    cleanupClickConnection() {
        this.isClickConnecting = false;
        
        // 시작 연결점 하이라이트 제거
        if (this.clickConnectionStart && this.clickConnectionStart.connector) {
            this.updateConnectorVisualState(this.clickConnectionStart.connector, false);
        }
        
        // 임시 연결선 제거
        this.removeTempConnectionLine();
        
        // 모든 연결점 비활성화
        this.deactivateAllConnectors();
        
        // 연결 모드 메시지 숨기기
        this.hideClickConnectionMessage();
        
        // 상태 초기화
        this.clickConnectionStart = null;
    }
    
    /**
     * 클릭 연결 메시지 표시
     * 클릭 연결 중임을 알리는 메시지를 표시합니다.
     * @param {string} text - 표시할 메시지 텍스트
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
     * 클릭 연결 메시지를 제거합니다.
     */
    hideClickConnectionMessage() {
        const message = document.getElementById('click-connection-message');
        if (message) {
            message.remove();
        }
    }
    
    /**
     * 클릭 연결 중 임시 연결선 업데이트
     * 마우스 위치에 따라 임시 연결선을 업데이트합니다.
     * @param {MouseEvent} e - 마우스 이벤트
     */
    updateClickConnectionLine(e) {
        if (!this.isClickConnecting || !this.clickConnectionStart || !this.tempConnectionLine) {
            return;
        }
        
        const startConnector = this.clickConnectionStart.connector;
        const startPos = this.getConnectorPosition(startConnector);
        
        // 마우스 위치를 캔버스 좌표로 변환
        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // 임시 연결선 업데이트
        this.updateTempConnectionLine(startPos, { x: mouseX, y: mouseY });
        
        // 마그네틱 효과: 근처 입력 연결점 하이라이트
        this.highlightNearbyInputConnector(mouseX, mouseY);
    }
    
    /**
     * 근처 입력 연결점 하이라이트
     * 마우스 위치 근처의 입력 연결점을 하이라이트합니다.
     * @param {number} mouseX - 마우스 X 좌표
     * @param {number} mouseY - 마우스 Y 좌표
     */
    highlightNearbyInputConnector(mouseX, mouseY) {
        // 모든 입력 연결점 확인
        const inputConnectors = document.querySelectorAll('.node-input');
        let nearestConnector = null;
        let minDistance = this.magneticThreshold;
        
        inputConnectors.forEach(connector => {
            const pos = this.getConnectorPosition(connector);
            const distance = Math.sqrt(
                Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestConnector = connector;
            }
        });
        
        // 이전 하이라이트 제거
        inputConnectors.forEach(connector => {
            connector.classList.remove('magnetic-highlight');
        });
        
        // 가장 가까운 연결점 하이라이트
        if (nearestConnector) {
            nearestConnector.classList.add('magnetic-highlight');
        }
    }
    
    /**
     * 연결점 위치 계산
     * 연결점의 캔버스 상의 위치를 계산합니다.
     * @param {HTMLElement} connector - 연결점 요소
     * @returns {Object} 연결점 위치 {x, y}
     */
    getConnectorPosition(connector) {
        const rect = connector.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 캔버스 내에서의 상대 위치 계산 (연결점 중심 좌표)
        const relativeX = rect.left - canvasRect.left + rect.width / 2;
        const relativeY = rect.top - canvasRect.top + rect.height / 2;
        
        return { x: relativeX, y: relativeY };
    }
    
    /**
     * 드래그 연결 시작
     * 출력 연결점을 클릭하면 마우스를 따라가는 연결선을 그립니다.
     * @param {MouseEvent} e - 마우스 이벤트
     * @param {HTMLElement} outputConnector - 출력 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    startDragConnection(e, outputConnector, nodeElement) {
        console.log('드래그 연결 시작');
        
        const nodeId = nodeElement.dataset.nodeId;
        const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                          outputConnector.classList.contains('false-output') ? 'false' : 'default';
        
        // 드래그 연결 상태 설정
        this.isDraggingConnection = true;
        this.dragConnectionStart = {
            nodeId: nodeId,
            outputType: outputType,
            connector: outputConnector,
            startX: e.clientX,
            startY: e.clientY
        };
        
        // 연결점 하이라이트
        outputConnector.style.backgroundColor = '#FF6B35';
        outputConnector.style.borderColor = '#FF6B35';
        outputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // 임시 연결선 생성
        this.createTempConnectionLine(e.clientX, e.clientY);
        
        // 전역 마우스 이벤트 리스너 추가
        document.addEventListener('mousemove', this.handleDragConnectionMove);
        document.addEventListener('mouseup', this.handleDragConnectionEnd);
        
        // 연결 모드 메시지 표시
        this.showDragConnectionMessage();
        
        console.log(`드래그 연결 시작: ${nodeId} (${outputType})`);
    }
    
    /**
     * 드래그 연결 이동 처리
     * 마우스 이동에 따라 임시 연결선을 업데이트합니다.
     */
    handleDragConnectionMove = (e) => {
        if (!this.isDraggingConnection) return;
        
        // 임시 연결선 업데이트
        this.updateTempConnectionLine(e.clientX, e.clientY);
        
        // 가까운 입력 연결점 찾기 (마그네틱 효과)
        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);
        
        // 모든 연결점 하이라이트 제거
        this.clearAllConnectorHighlights();
        
        // 가까운 입력 연결점 하이라이트
        if (nearbyInputConnector) {
            this.highlightConnector(nearbyInputConnector);
        }
    }
    
    /**
     * 드래그 연결 종료 처리
     * 마우스 업 시 연결을 완료하거나 취소합니다.
     */
    handleDragConnectionEnd = (e) => {
        if (!this.isDraggingConnection) return;
        
        // 가까운 입력 연결점 찾기
        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);
        
        if (nearbyInputConnector) {
            // 연결 완료
            this.completeDragConnection(nearbyInputConnector);
        } else {
            // 연결 취소
            this.cancelDragConnection();
        }
    }
    
    /**
     * 가까운 입력 연결점 찾기
     * 마우스 위치에서 가까운 입력 연결점을 찾습니다.
     */
    findNearbyInputConnector(mouseX, mouseY) {
        const inputConnectors = this.canvas.querySelectorAll('.node-input');
        let closestConnector = null;
        let closestDistance = this.magneticThreshold;
        
        inputConnectors.forEach(connector => {
            const rect = connector.getBoundingClientRect();
            const connectorX = rect.left + rect.width / 2;
            const connectorY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(mouseX - connectorX, 2) + Math.pow(mouseY - connectorY, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestConnector = connector;
            }
        });
        
        return closestConnector;
    }
    
    /**
     * 드래그 연결 완료
     * 찾은 입력 연결점으로 연결을 완료합니다.
     */
    completeDragConnection(targetInputConnector) {
        if (!this.dragConnectionStart || !targetInputConnector) return;
        
        const targetNode = targetInputConnector.closest('.workflow-node');
        if (!targetNode) return;
        
        const targetNodeId = targetNode.dataset.nodeId;
        const startNodeId = this.dragConnectionStart.nodeId;
        const outputType = this.dragConnectionStart.outputType;
        
        console.log(`드래그 연결 완료: ${startNodeId}(${outputType}) → ${targetNodeId}(input)`);
        
        // 연결 생성
        this.createNodeConnection(startNodeId, targetNodeId, outputType, 'input');
        
        // 드래그 연결 정리
        this.cleanupDragConnection();
        
        console.log('드래그 연결 완료');
    }
    
    /**
     * 드래그 연결 취소
     * 드래그 연결을 취소하고 정리합니다.
     */
    cancelDragConnection() {
        console.log('드래그 연결 취소');
        this.cleanupDragConnection();
    }
    
    /**
     * 드래그 연결 정리
     * 드래그 연결 관련 상태와 UI를 정리합니다.
     */
    cleanupDragConnection() {
        this.isDraggingConnection = false;
        
        // 시작 연결점 하이라이트 제거
        if (this.dragConnectionStart && this.dragConnectionStart.connector) {
            this.updateConnectorVisualState(this.dragConnectionStart.connector, false);
        }
        
        // 전역 이벤트 리스너 제거
        document.removeEventListener('mousemove', this.handleDragConnectionMove);
        document.removeEventListener('mouseup', this.handleDragConnectionEnd);
        
        // 임시 연결선 제거
        this.removeTempConnectionLine();
        
        // 모든 연결점 하이라이트 제거
        this.clearAllConnectorHighlights();
        
        // 연결 모드 메시지 숨기기
        this.hideDragConnectionMessage();
        
        // 상태 초기화
        this.dragConnectionStart = null;
    }
    
    /**
     * 임시 연결선 생성
     * 드래그 중에 표시될 임시 연결선을 생성합니다.
     */
    createTempConnectionLine(startX, startY) {
        // 기존 임시 연결선 제거
        this.removeTempConnectionLine();
        
        // 캔버스 위치 계산
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // SVG 연결선 생성
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
     * 마우스 위치에 따라 임시 연결선을 업데이트합니다.
     */
    updateTempConnectionLine(startPos, endPos) {
        if (!this.tempConnectionLine) return;
        
        const startX = startPos.x;
        const startY = startPos.y;
        const currentX = endPos.x;
        const currentY = endPos.y;
        
        // 베지어 곡선으로 부드러운 연결선 그리기
        const controlPoint1X = startX + (currentX - startX) * 0.5;
        const controlPoint1Y = startY;
        const controlPoint2X = startX + (currentX - startX) * 0.5;
        const controlPoint2Y = currentY;
        
        const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${currentX} ${currentY}`;
        this.tempConnectionLine.path.setAttribute('d', pathData);
    }
    
    /**
     * 임시 연결선 제거
     * 임시 연결선을 DOM에서 제거합니다.
     */
    removeTempConnectionLine() {
        if (this.tempConnectionLine && this.tempConnectionLine.svg) {
            this.tempConnectionLine.svg.remove();
            this.tempConnectionLine = null;
        }
    }
    
    /**
     * 드래그 연결 메시지 표시
     * 드래그 연결 중임을 알리는 메시지를 표시합니다.
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
     * 드래그 연결 메시지를 제거합니다.
     */
    hideDragConnectionMessage() {
        const message = document.getElementById('drag-connection-message');
        if (message) {
            message.remove();
        }
    }
    
    /**
     * 연결점 더블클릭 처리
     * 연결된 연결점을 더블클릭하면 연결선을 삭제합니다.
     * 
     * @param {HTMLElement} connector - 연결점 요소
     * @param {HTMLElement} nodeElement - 노드 요소
     * @param {string} connectorType - 연결점 타입 ('input' | 'output')
     */
    handleConnectorDoubleClick(connector, nodeElement, connectorType) {
        const nodeId = nodeElement.dataset.nodeId;
        
        try {
            // 연결된 연결선 찾기
            const connections = this.findConnectionsByNode(nodeId, connectorType);
            
            if (connections.length === 0) {
                console.log(`노드 ${nodeId}의 ${connectorType} 연결점에 연결된 선이 없습니다.`);
                this.showConnectorTooltip(connector, '연결된 선이 없습니다');
                setTimeout(() => this.hideConnectorTooltip(), 2000);
                return;
            }
            
            // 연결선 삭제
            connections.forEach(connection => {
                this.deleteConnectionByConnectionId(connection.id);
            });
            
            // 시각적 피드백
            this.showConnectionDeletedFeedback(connector, connections.length);
            
            // 연결점 시각적 상태 업데이트
            setTimeout(() => {
                this.updateAllConnectorsVisualState();
            }, 100);
            
            console.log(`노드 ${nodeId}의 ${connectorType} 연결점에서 ${connections.length}개의 연결선 삭제됨`);
            
        } catch (error) {
            console.error('연결선 삭제 실패:', error);
        }
    }
    
    /**
     * 노드의 연결점에 연결된 연결선들 찾기
     * @param {string} nodeId - 노드 ID
     * @param {string} connectorType - 연결점 타입 ('input' | 'output')
     * @returns {Array} 연결된 연결선 배열
     */
    findConnectionsByNode(nodeId, connectorType) {
        if (!this.connectionManager || !this.connectionManager.connections) {
            return [];
        }
        
        const connections = [];
        this.connectionManager.connections.forEach((connection, connectionId) => {
            if (connectorType === 'input' && connection.to === nodeId) {
                connections.push({ id: connectionId, ...connection });
            } else if (connectorType === 'output' && connection.from === nodeId) {
                connections.push({ id: connectionId, ...connection });
            }
        });
        
        return connections;
    }
    
    /**
     * 연결선 ID로 연결선 삭제
     * @param {string} connectionId - 연결선 ID
     */
    deleteConnectionByConnectionId(connectionId) {
        if (!this.connectionManager) {
            console.warn('연결 관리자가 초기화되지 않았습니다.');
            return;
        }
        
        try {
            // 연결 관리자의 삭제 메서드 호출
            if (typeof this.connectionManager.deleteConnection === 'function') {
                this.connectionManager.deleteConnection(connectionId);
            } else {
                console.warn('연결 관리자에 deleteConnection 메서드가 없습니다.');
            }
        } catch (error) {
            console.error('연결선 삭제 실패:', error);
        }
    }
    
    /**
     * 연결선 삭제 시각적 피드백
     * @param {HTMLElement} connector - 연결점 요소
     * @param {number} deletedCount - 삭제된 연결선 개수
     */
    showConnectionDeletedFeedback(connector, deletedCount) {
        // 연결점에 삭제 애니메이션 효과
        connector.style.transform = 'scale(0.8)';
        connector.style.backgroundColor = '#FF3B30';
        connector.style.borderColor = '#FF3B30';
        
        // 툴팁으로 삭제 확인 메시지 표시
        this.showConnectorTooltip(connector, `${deletedCount}개 연결선 삭제됨`);
        
        // 0.3초 후 원래 상태로 복원
        setTimeout(() => {
            connector.style.transform = '';
            connector.style.backgroundColor = '';
            connector.style.borderColor = '';
            this.hideConnectorTooltip();
        }, 300);
    }
    
    /**
     * 연결점 시각적 상태 업데이트
     * 연결된 연결점과 연결되지 않은 연결점을 구분하여 표시합니다.
     * 
     * @param {HTMLElement} connector - 연결점 요소
     * @param {boolean} isConnected - 연결 상태
     */
    updateConnectorVisualState(connector, isConnected) {
        if (isConnected) {
            // 연결된 상태: 초록색으로 표시
            connector.classList.add('connected');
            connector.style.backgroundColor = '#34C759';
            connector.style.borderColor = '#34C759';
            connector.style.boxShadow = '0 0 8px rgba(52, 199, 89, 0.6)';
        } else {
            // 연결되지 않은 상태: 기본 색상
            connector.classList.remove('connected');
            connector.style.backgroundColor = '#ffffff';
            connector.style.borderColor = '#666';
            connector.style.boxShadow = 'none';
        }
    }
    
    /**
     * 모든 연결점의 시각적 상태 업데이트
     * 노드 생성 후 또는 연결 상태 변경 후 호출합니다.
     */
    updateAllConnectorsVisualState() {
        const allNodes = this.canvas.querySelectorAll('.workflow-node');
        
        allNodes.forEach(node => {
            const nodeId = node.dataset.nodeId;
            
            // 입력 연결점 업데이트
            const inputConnector = node.querySelector('.node-input');
            if (inputConnector) {
                const inputConnections = this.findConnectionsByNode(nodeId, 'input');
                this.updateConnectorVisualState(inputConnector, inputConnections.length > 0);
            }
            
            // 출력 연결점들 업데이트
            const outputConnectors = node.querySelectorAll('.node-output');
            outputConnectors.forEach(outputConnector => {
                const outputConnections = this.findConnectionsByNode(nodeId, 'output');
                this.updateConnectorVisualState(outputConnector, outputConnections.length > 0);
            });
        });
    }
    
    /**
     * 연결 모드 시작
     * 출력 연결점을 클릭했을 때 연결 모드를 시작합니다.
     * 
     * @param {string} nodeId - 시작 노드 ID
     * @param {string} connectorType - 연결점 타입 ('input' | 'output')
     * @param {string} outputType - 출력 타입 ('true' | 'false' | 'default')
     */
    startConnection(nodeId, connectorType, outputType = 'default') {
        try {
            this.isConnecting = true;
            this.connectionStart = {
                nodeId: nodeId,
                connectorType: connectorType,
                outputType: outputType,
                timestamp: Date.now()
            };
            
            // 연결 모드 UI 활성화
            this.activateConnectionMode();
            
            // 연결 시작점 하이라이트
            this.highlightConnectionStart(nodeId, connectorType, outputType);
            
            console.log(`연결 모드 시작: ${nodeId} (${connectorType}, ${outputType})`);
            
        } catch (error) {
            console.error('연결 모드 시작 실패:', error);
            this.cancelConnection();
        }
    }
    
    /**
     * 연결 완료
     * 입력 연결점을 클릭했을 때 연결을 완료합니다.
     * 
     * @param {string} nodeId - 대상 노드 ID
     * @param {string} connectorType - 연결점 타입 ('input' | 'output')
     * @param {string} outputType - 출력 타입 (선택사항)
     */
    completeConnection(nodeId, connectorType, outputType = 'default') {
        try {
            if (!this.isConnecting || !this.connectionStart) {
                console.warn('연결 모드가 활성화되지 않았습니다.');
                return;
            }
            
            const startNodeId = this.connectionStart.nodeId;
            const startConnectorType = this.connectionStart.connectorType;
            const startOutputType = this.connectionStart.outputType;
            
            // 연결 유효성 검사
            if (!this.validateConnection(startNodeId, nodeId, startConnectorType, connectorType)) {
                this.cancelConnection();
                return;
            }
            
            // 연결 생성
            this.createNodeConnection(startNodeId, nodeId, startOutputType, outputType);
            
            // 연결 모드 종료
            this.finishConnection();
            
            console.log(`연결 완료: ${startNodeId} → ${nodeId}`);
            
        } catch (error) {
            console.error('연결 완료 실패:', error);
            this.cancelConnection();
        }
    }
    
    /**
     * 연결 취소
     * ESC 키나 캔버스 클릭 시 연결 모드를 취소합니다.
     */
    cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        
        // 연결 모드 UI 비활성화
        this.deactivateConnectionMode();
        
        // 모든 하이라이트 제거
        this.clearAllHighlights();
        
        console.log('연결 모드 취소됨');
    }
    
    /**
     * 연결 완료 처리
     * 연결이 성공적으로 완료된 후 정리 작업을 수행합니다.
     */
    finishConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        
        // 연결 모드 UI 비활성화
        this.deactivateConnectionMode();
        
        // 모든 하이라이트 제거
        this.clearAllHighlights();
    }
    
    /**
     * 연결 유효성 검사
     * 연결이 유효한지 검사합니다.
     * 
     * @param {string} fromNodeId - 시작 노드 ID
     * @param {string} toNodeId - 대상 노드 ID
     * @param {string} fromType - 시작 연결점 타입
     * @param {string} toType - 대상 연결점 타입
     * @returns {boolean} 연결 유효성
     */
    validateConnection(fromNodeId, toNodeId, fromType, toType) {
        // 자기 자신과의 연결 방지
        if (fromNodeId === toNodeId) {
            console.warn('자기 자신과는 연결할 수 없습니다.');
            return false;
        }
        
        // 출력 → 입력 또는 입력 → 출력 연결 허용
        if (!((fromType === 'output' && toType === 'input') || (fromType === 'input' && toType === 'output'))) {
            console.warn('출력 → 입력 또는 입력 → 출력 연결만 가능합니다.');
            return false;
        }
        
        // 중복 연결 방지 (같은 입력에 여러 연결 방지)
        if (this.hasExistingConnection(toNodeId, 'input')) {
            console.warn('이미 연결된 입력 연결점입니다.');
            return false;
        }
        
        return true;
    }
    
    /**
     * 기존 연결 확인
     * @param {string} nodeId - 노드 ID
     * @param {string} connectorType - 연결점 타입
     * @returns {boolean} 기존 연결 존재 여부
     */
    hasExistingConnection(nodeId, connectorType) {
        if (!this.connectionManager || !this.connectionManager.connections) {
            return false;
        }
        
        return Array.from(this.connectionManager.connections.values()).some(connection => {
            if (connectorType === 'input') {
                return connection.to === nodeId;
            } else if (connectorType === 'output') {
                return connection.from === nodeId;
            }
            return false;
        });
    }
    
    /**
     * 노드 연결 생성
     * @param {string} fromNodeId - 시작 노드 ID
     * @param {string} toNodeId - 대상 노드 ID
     * @param {string} fromOutputType - 시작 출력 타입
     * @param {string} toOutputType - 대상 출력 타입
     */
    createNodeConnection(fromNodeId, toNodeId, fromOutputType, toOutputType) {
        // 연결 관리자가 없으면 초기화 시도
        if (!this.connectionManager) {
            if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                console.log('연결 관리자 지연 초기화 완료');
            } else {
                console.warn('연결 관리자가 초기화되지 않았습니다.');
                return;
            }
        }
        
        try {
            // 연결 데이터 생성
            const connectionData = {
                from: fromNodeId,
                to: toNodeId,
                fromOutputType: fromOutputType,
                toOutputType: toOutputType,
                createdAt: new Date().toISOString()
            };
            
            // 연결 생성
            this.connectionManager.createConnection(fromNodeId, toNodeId);
            
            console.log('노드 연결 생성 완료:', connectionData);
            
            // 연결점 시각적 상태 업데이트
            setTimeout(() => {
                this.updateAllConnectorsVisualState();
            }, 100);
            
        } catch (error) {
            console.error('노드 연결 생성 실패:', error);
        }
    }
    
    // ==========================================
    // 연결 모드 UI 관련 메서드들
    // ==========================================
    
    /**
     * 연결 모드 UI 활성화
     * 연결 모드일 때 캔버스와 연결점들의 스타일을 변경합니다.
     */
    activateConnectionMode() {
        // 캔버스에 연결 모드 클래스 추가
        this.canvas.classList.add('connection-mode');
        
        // 모든 입력 연결점을 활성화
        this.activateInputConnectors();
        
        // 연결 모드 안내 메시지 표시
        this.showConnectionModeMessage();
    }
    
    /**
     * 연결 모드 UI 비활성화
     * 연결 모드가 끝날 때 UI를 원래 상태로 복원합니다.
     */
    deactivateConnectionMode() {
        // 캔버스에서 연결 모드 클래스 제거
        this.canvas.classList.remove('connection-mode');
        
        // 모든 연결점 비활성화
        this.deactivateAllConnectors();
        
        // 연결 모드 안내 메시지 숨기기
        this.hideConnectionModeMessage();
    }
    
    /**
     * 입력 연결점 활성화
     * 연결 가능한 입력 연결점들을 하이라이트합니다.
     */
    activateInputConnectors() {
        const inputConnectors = this.canvas.querySelectorAll('.node-input');
        inputConnectors.forEach(connector => {
            connector.classList.add('connection-active');
        });
    }
    
    /**
     * 연결 가능한 출력 연결점들을 하이라이트합니다.
     */
    activateOutputConnectors() {
        const outputConnectors = this.canvas.querySelectorAll('.node-output');
        outputConnectors.forEach(connector => {
            connector.classList.add('connection-active');
        });
    }
    
    /**
     * 모든 연결점 비활성화
     * 모든 연결점의 활성 상태를 제거합니다.
     */
    deactivateAllConnectors() {
        const allConnectors = this.canvas.querySelectorAll('.node-input, .node-output');
        allConnectors.forEach(connector => {
            connector.classList.remove('connection-active', 'connection-highlight');
        });
    }
    
    /**
     * 연결 시작점 하이라이트
     * @param {string} nodeId - 노드 ID
     * @param {string} connectorType - 연결점 타입
     * @param {string} outputType - 출력 타입
     */
    highlightConnectionStart(nodeId, connectorType, outputType) {
        const node = document.getElementById(nodeId);
        if (!node) return;
        
        let connector;
        if (connectorType === 'output') {
            if (outputType === 'true') {
                connector = node.querySelector('.true-output');
            } else if (outputType === 'false') {
                connector = node.querySelector('.false-output');
            } else {
                connector = node.querySelector('.node-output');
            }
        }
        
        if (connector) {
            connector.classList.add('connection-highlight');
        }
    }
    
    /**
     * 모든 하이라이트 제거
     * 모든 연결점의 하이라이트를 제거합니다.
     */
    clearAllHighlights() {
        const highlightedConnectors = this.canvas.querySelectorAll('.connection-highlight');
        highlightedConnectors.forEach(connector => {
            connector.classList.remove('connection-highlight');
        });
    }
    
    /**
     * 연결 모드 안내 메시지 표시
     */
    showConnectionModeMessage() {
        let message = document.getElementById('connection-mode-message');
        if (!message) {
            message = document.createElement('div');
            message.id = 'connection-mode-message';
            message.className = 'connection-mode-message';
            message.innerHTML = `
                <div class="message-content">
                    <span class="message-icon">🔗</span>
                    <span class="message-text">연결할 입력 연결점을 클릭하세요</span>
                    <span class="message-hint">ESC 키로 취소</span>
                </div>
            `;
            document.body.appendChild(message);
        }
        
        message.classList.add('show');
    }
    
    /**
     * 연결 모드 안내 메시지 숨기기
     */
    hideConnectionModeMessage() {
        const message = document.getElementById('connection-mode-message');
        if (message) {
            message.classList.remove('show');
        }
    }
    
    /**
     * 연결점 툴팁 표시
     * @param {HTMLElement} connector - 연결점 요소
     * @param {string} text - 툴팁 텍스트
     */
    showConnectorTooltip(connector, text) {
        let tooltip = document.getElementById('connector-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'connector-tooltip';
            tooltip.className = 'connector-tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        
        // 위치 계산
        const rect = connector.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.top - 30 + 'px';
        
        tooltip.classList.add('show');
    }
    
    /**
     * 연결점 툴팁 숨기기
     */
    hideConnectorTooltip() {
        const tooltip = document.getElementById('connector-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }
    
    /**
     * 연결점 정보 표시
     * @param {string} nodeId - 노드 ID
     * @param {string} connectorType - 연결점 타입
     */
    showConnectionInfo(nodeId, connectorType) {
        const node = document.getElementById(nodeId);
        if (!node) return;
        
        const nodeTitle = node.querySelector('.node-title');
        const title = nodeTitle ? nodeTitle.textContent : nodeId;
        
        console.log(`연결점 정보: ${title} (${connectorType})`);
        
        // 연결된 노드들 표시
        if (this.connectionManager && this.connectionManager.connections) {
            const connections = Array.from(this.connectionManager.connections.values());
            const relatedConnections = connections.filter(conn => 
                conn.from === nodeId || conn.to === nodeId
            );
            
            if (relatedConnections.length > 0) {
                console.log('연결된 노드들:', relatedConnections);
            }
        }
    }
    
    /**
     * 조건 노드 내용 생성
     * @param {Object} nodeData - 노드 데이터
     * @returns {string} HTML 내용
     */
    generateConditionNodeContent(nodeData) {
        return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon">🔐</div>
                <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-outputs">
                    <div class="node-output true-output">
                        <div class="output-dot true-dot"></div>
                        <span class="output-label">True</span>
                    </div>
                    <div class="node-output false-output">
                        <div class="output-dot false-dot"></div>
                        <span class="output-label">False</span>
                    </div>
                </div>
                <div class="node-settings">⚙</div>
            `;
    }
    
    /**
     * 액션 노드 내용 생성
     * @param {Object} nodeData - 노드 데이터
     * @returns {string} HTML 내용
     */
    generateActionNodeContent(nodeData) {
        return `
                <div class="node-input"></div>
                <div class="node-content">
                <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
        
    /**
     * HTML 이스케이프 처리
     * @param {string} text - 이스케이프할 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 노드를 캔버스에 추가
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    addNodeToCanvas(nodeElement) {
        const canvasContent = document.getElementById('canvas-content');
        if (canvasContent) {
            canvasContent.appendChild(nodeElement);
            console.log(`노드 ${nodeElement.dataset.nodeId}를 canvas-content에 추가 완료`);
        } else {
            this.canvas.appendChild(nodeElement);
            console.log(`노드 ${nodeElement.dataset.nodeId}를 캔버스에 직접 추가 완료 (canvas-content 없음)`);
        }
    }
    
    /**
     * 노드 데이터 저장
     * @param {Object} nodeData - 노드 데이터
     */
    saveNodeData(nodeData) {
        if (!this.nodeData) {
            this.nodeData = {};
        }
        this.nodeData[nodeData.id] = {
            ...nodeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    /**
     * 연결 관리자에 노드 등록 (지연 초기화)
     * @param {HTMLElement} nodeElement - 노드 요소
     */
    registerNodeWithConnectionManager(nodeElement) {
        setTimeout(() => {
            if (this.connectionManager) {
                this.connectionManager.bindNodeConnector(nodeElement);
            } else if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                this.connectionManager.bindNodeConnector(nodeElement);
            }
        }, 50);
    }
    
    // ==========================================
    // 노드 선택 관련 메서드들
    // ==========================================
    
    /**
     * 노드 선택
     * 클릭된 노드를 선택 상태로 만들고 다른 노드들의 선택을 해제합니다.
     * 
     * @param {HTMLElement} node - 선택할 노드 요소
     */
    selectNode(node) {
        // 기존 선택 해제
        this.deselectNode();
        
        // 새 노드 선택
        this.selectedNode = node;
        node.classList.add('selected');
        
        console.log('노드 선택됨:', node.id);
    }
    
    /**
     * 노드 선택 해제
     * 현재 선택된 노드의 선택 상태를 해제합니다.
     */
    deselectNode() {
        if (this.selectedNode) {
            this.selectedNode.classList.remove('selected');
            this.selectedNode = null;
        }
    }
    
    /**
     * 노드 선택
     * 클릭된 노드를 선택 상태로 만들고 다른 노드들의 선택을 해제합니다.
     * 
     * @param {HTMLElement} node - 선택할 노드 요소
     */
    selectNode(node) {
        // 기존 선택 해제
        this.deselectNode();
        
        // 새 노드 선택
        this.selectedNode = node;
        node.classList.add('selected');
        
        console.log('노드 선택됨:', node.id);
    }
    
    /**
     * 노드 선택 해제
     * 현재 선택된 노드의 선택 상태를 해제합니다.
     */
    deselectNode() {
        if (this.selectedNode) {
            this.selectedNode.classList.remove('selected');
            this.selectedNode = null;
        }
    }
    
    // ==========================================
    // 노드 이동 관련 메서드들
    // ==========================================
    
    /**
     * 노드 드래그 시작
     * 마우스를 누른 순간의 위치를 기록하고 드래그 모드를 시작합니다.
     * 
     * @param {MouseEvent} e - 마우스 이벤트
     * @param {HTMLElement} node - 드래그할 노드 요소
     */
    startDrag(e, node) {
        try {
        this.isDragging = true;
        this.selectedNode = node;
        
            // 드래그 오프셋 계산
            this.calculateDragOffset(e, node);
            
            // 드래그 상태 설정
            this.setDragState(node, true);
            
            console.log('드래그 시작:', node.id);
            
        } catch (error) {
            console.error('드래그 시작 실패:', error);
            this.isDragging = false;
        }
    }
    
    /**
     * 드래그 오프셋 계산
     * @param {MouseEvent} e - 마우스 이벤트
     * @param {HTMLElement} node - 노드 요소
     */
    calculateDragOffset(e, node) {
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 현재 노드의 실제 위치 (Transform 적용된 위치)
        const nodeX = parseInt(node.style.left) || 0;
        const nodeY = parseInt(node.style.top) || 0;
        
        // 마우스 위치를 캔버스 좌표계로 변환
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        this.dragOffset = {
            x: mouseX - nodeX,
            y: mouseY - nodeY
        };
        
        console.log(`- 노드 위치: (${nodeX}, ${nodeY})`);
        console.log(`- 마우스 위치: (${mouseX}, ${mouseY})`);
        console.log(`- 드래그 오프셋: (${this.dragOffset.x}, ${this.dragOffset.y})`);
    }
    
    /**
     * 드래그 상태 설정
     * @param {HTMLElement} node - 노드 요소
     * @param {boolean} isDragging - 드래그 상태
     */
    setDragState(node, isDragging) {
        if (isDragging) {
            node.classList.add('dragging');
        } else {
            node.classList.remove('dragging');
        }
    }
    
    /**
     * 노드 드래그 처리
     * 마우스 이동에 따라 노드의 위치를 업데이트합니다.
     * 
     * @param {MouseEvent} e - 마우스 이벤트
     */
    handleDrag(e) {
        if (!this.isDragging || !this.selectedNode) return;
        
        try {
            // 새로운 위치 계산
            const newPosition = this.calculateNewPosition(e);
        
        // 노드 위치 업데이트
            this.updateNodePosition(this.selectedNode, newPosition);
            
            // 관련 컴포넌트 업데이트
            this.updateRelatedComponents(this.selectedNode);
            
        } catch (error) {
            console.error('드래그 처리 실패:', error);
        }
    }
    
    /**
     * 새로운 위치 계산
     * @param {MouseEvent} e - 마우스 이벤트
     * @returns {Object} 새로운 위치 {x, y}
     */
    calculateNewPosition(e) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        return {
            x: mouseX - this.dragOffset.x,
            y: mouseY - this.dragOffset.y
        };
    }
    
    /**
     * 노드 위치 업데이트
     * @param {HTMLElement} node - 노드 요소
     * @param {Object} position - 새로운 위치 {x, y}
     */
    updateNodePosition(node, position) {
        // 무한 캔버스 모드에서는 음수 좌표도 허용
        node.style.left = position.x + 'px';
        node.style.top = position.y + 'px';
    }
    
    /**
     * 관련 컴포넌트 업데이트
     * @param {HTMLElement} node - 노드 요소
     */
    updateRelatedComponents(node) {
        // 미니맵 업데이트
        if (this.minimapManager) {
            this.minimapManager.onNodeMoved(node);
        }
        
        // 연결선 업데이트
        if (this.connectionManager) {
            this.updateConnectionsImmediately(node.id);
        }
    }
    
    /**
     * 노드 드래그 종료
     * 드래그를 완료하고 최종 위치를 저장합니다.
     */
    endDrag() {
        if (!this.isDragging || !this.selectedNode) return;
        
        try {
            const nodeId = this.selectedNode.dataset.nodeId;
            
            // 최종 위치 저장
            this.saveFinalPosition(nodeId);
            
            // 드래그 상태 정리
            this.cleanupDragState();
            
            // 연결선 최종 업데이트
            this.finalizeConnections(nodeId);
            
            // 미니맵 업데이트
            this.updateMinimapAfterDrag();
            
            console.log(`드래그 종료: ${nodeId}`);
            
        } catch (error) {
            console.error('드래그 종료 실패:', error);
        } finally {
            this.isDragging = false;
        }
    }
    
    /**
     * 최종 위치 저장
     * @param {string} nodeId - 노드 ID
     */
    saveFinalPosition(nodeId) {
            const finalX = parseInt(this.selectedNode.style.left) || 0;
            const finalY = parseInt(this.selectedNode.style.top) || 0;
            
            // 노드 데이터에 최종 위치 저장
            if (this.nodeData && this.nodeData[nodeId]) {
                this.nodeData[nodeId].x = finalX;
                this.nodeData[nodeId].y = finalY;
            this.nodeData[nodeId].updatedAt = new Date().toISOString();
        }
    }
    
    /**
     * 드래그 상태 정리
     */
    cleanupDragState() {
        if (this.selectedNode) {
            this.setDragState(this.selectedNode, false);
        }
    }
    
    /**
     * 연결선 최종 업데이트
     * @param {string} nodeId - 노드 ID
     */
    finalizeConnections(nodeId) {
            this.updateConnectionsImmediately(nodeId);
    }
            
    /**
     * 드래그 후 미니맵 업데이트
     */
    updateMinimapAfterDrag() {
            setTimeout(() => {
        if (this.minimapManager) {
                    this.minimapManager.updateMinimap();
                }
            }, 100);
    }
    
    // ==========================================
    // 연결선 관련 메서드들
    // ==========================================
    
    /**
     * 연결선 즉시 업데이트
     * 노드 이동 후 연결선을 즉시 다시 그립니다.
     * 
     * @param {string} nodeId - 업데이트할 노드 ID
     */
    updateConnectionsImmediately(nodeId) {
        // 연결 관리자가 없으면 초기화 시도
        if (!this.connectionManager) {
            if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                console.log('연결 관리자 지연 초기화 완료');
            } else {
                console.warn('연결 관리자가 초기화되지 않았습니다.');
                return;
            }
        }
        
        try {
            console.log(`노드 ${nodeId}의 연결선 즉시 업데이트 중...`);
            
            // 연결 관리자의 업데이트 메서드 호출
            if (typeof this.connectionManager.updateNodeConnectionsImmediately === 'function') {
                this.connectionManager.updateNodeConnectionsImmediately(nodeId);
            } else {
                console.warn('연결 관리자에 updateNodeConnectionsImmediately 메서드가 없습니다.');
            }
            
        } catch (error) {
            console.error('연결선 업데이트 실패:', error);
        }
    }
    
    /**
     * 모든 연결선 업데이트
     * 전체 캔버스의 모든 연결선을 업데이트합니다.
     */
    updateAllConnections() {
        if (!this.connectionManager) return;
        
        try {
            console.log('모든 연결선 업데이트 중...');
            
            if (typeof this.connectionManager.updateAllConnections === 'function') {
                this.connectionManager.updateAllConnections();
            } else {
                console.warn('연결 관리자에 updateAllConnections 메서드가 없습니다.');
            }
            
        } catch (error) {
            console.error('전체 연결선 업데이트 실패:', error);
        }
    }
    
    /**
     * 연결선 상태 확인
     * 연결선이 정상적으로 작동하는지 확인합니다.
     * 
     * @returns {Object} 연결선 상태 정보
     */
    getConnectionStatus() {
        if (!this.connectionManager) {
            return { initialized: false, error: '연결 관리자가 초기화되지 않음' };
        }
        
        return {
            initialized: true,
            connectionCount: this.connectionManager.connections ? 
                this.connectionManager.connections.size : 0,
            hasUpdateMethod: typeof this.connectionManager.updateNodeConnectionsImmediately === 'function'
        };
    }
    
    /**
     * 패닝 시작 (마우스 휠로 화면 이동 시작)
     * 마우스 휠 버튼을 누른 순간의 위치를 기록하고 패닝 모드를 시작합니다.
     */
    startPan(e) {
        if (this.isPanning) return; // 이미 패닝 중이면 무시
        
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        
        // Transform 상태가 없으면 초기화
        if (!this.canvasTransform) {
            this.canvasTransform = {
                x: -50000,
                y: -50000,
                scale: 1
            };
        }
        
        // 피그마 방식: 현재 Transform 위치를 시작점으로 설정
        this.panScrollStart = { 
            left: this.canvasTransform.x, 
            top: this.canvasTransform.y 
        };
        
        // 패닝 모드 CSS 클래스 추가 (커서 변경 등)
        this.canvas.classList.add('panning');
        
        // 커서를 grabbing으로 변경
        this.canvas.style.cursor = 'grabbing';
        
        // 선택된 노드 해제
        this.deselectNode();
        
        console.log(`피그마 방식 패닝 시작: 마우스(${this.panStart.x}, ${this.panStart.y}) Transform(${Math.round(this.panScrollStart.left)}, ${Math.round(this.panScrollStart.top)})`);
    }
    
    /**
     * 패닝 처리 (마우스 휠로 화면 이동)
     * 마우스 이동에 따라 캔버스의 스크롤 위치를 변경합니다.
     */
    handlePan(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.panStart.x;
        const deltaY = e.clientY - this.panStart.y;
        
        // Transform 상태가 없으면 초기화
        if (!this.canvasTransform) {
            this.canvasTransform = {
                x: -50000,
                y: -50000,
                scale: 1
            };
        }
        
        // 피그마 방식: Transform으로 패닝
        const newX = this.panScrollStart.left + deltaX;
        const newY = this.panScrollStart.top + deltaY;
        
        // 현재 실제 줌 상태 가져오기
        const canvasContent = document.getElementById('canvas-content');
        let currentScale = this.canvasTransform.scale;
        if (canvasContent) {
            const currentTransform = canvasContent.style.transform;
            if (currentTransform && currentTransform !== 'none') {
                const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                if (scaleMatch) {
                    currentScale = parseFloat(scaleMatch[1]) || 1;
                }
            }
        }
        
        this.updateCanvasTransform(newX, newY, currentScale);
        
        // 로그 간소화 (50번에 1번만 출력)
        if (Math.random() < 0.02) {
            console.log(`피그마 방식 드래그 패닝: translate(${Math.round(newX)}, ${Math.round(newY)})`);
        }
    }
    
    /**
     * 캔버스 Transform 업데이트 (피그마 방식)
     * Transform을 사용해서 캔버스 위치와 크기를 업데이트합니다.
     */
    updateCanvasTransform(x, y, scale = 1) {
        // 줌 중일 때는 실행하지 않음
        if (this.isZooming) {
            console.log('updateCanvasTransform: 줌 중이므로 실행 건너뜀');
            return;
        }
        
        let canvasContent = document.getElementById('canvas-content');
        
        // 찾을 수 없으면 동적으로 생성
        if (!canvasContent) {
            console.log(`updateCanvasTransform: 캔버스 콘텐츠 컨테이너를 찾을 수 없습니다 - 동적으로 생성합니다`);
            
            // 기존 노드들을 임시 저장
            const existingNodes = Array.from(this.canvas.children);
            
            // 캔버스 콘텐츠 컨테이너 생성
            canvasContent = document.createElement('div');
            canvasContent.id = 'canvas-content';
            canvasContent.className = 'canvas-content';
            
            // 캔버스 비우기
            this.canvas.innerHTML = '';
            
            // 캔버스 콘텐츠 컨테이너 추가
            this.canvas.appendChild(canvasContent);
            
            // 기존 노드들을 캔버스 콘텐츠 컨테이너로 이동
            existingNodes.forEach(node => {
                // 노드의 현재 위치 저장
                const currentLeft = node.style.left;
                const currentTop = node.style.top;
                
                // 노드를 새 컨테이너로 이동
                canvasContent.appendChild(node);
                
                // 위치 복원 (Transform이 적용되므로 원래 위치 유지)
                node.style.left = currentLeft;
                node.style.top = currentTop;
            });
        }
        
        // 현재 줌 상태 보존 (scale이 기본값이면 현재 상태 유지)
        let currentScale = scale;
        if (scale === 1) {
            // 현재 Transform에서 scale 추출
            const currentTransform = canvasContent.style.transform;
            if (currentTransform && currentTransform !== 'none') {
                const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                if (scaleMatch) {
                    currentScale = parseFloat(scaleMatch[1]) || 1;
                    console.log(`updateCanvasTransform: 현재 줌 상태 보존 ${currentScale}`);
                }
            }
        }
        
        // Transform 상태 저장
        this.canvasTransform = { x, y, scale: currentScale };
        
        // Transform 적용 (현재 줌 상태 보존)
        canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${currentScale})`;
        
        console.log(`updateCanvasTransform: translate(${x}, ${y}) scale(${currentScale})`);
        
        // 노드 위치 디버깅
        const nodes = canvasContent.querySelectorAll('.workflow-node');
        if (nodes.length > 0) {
            console.log(`노드 위치 디버깅 (총 ${nodes.length}개):`);
            nodes.forEach((node, index) => {
                const rect = node.getBoundingClientRect();
                const style = node.style;
                console.log(`노드 ${index + 1}:`, {
                    id: node.dataset.nodeId,
                    styleLeft: style.left,
                    styleTop: style.top,
                    boundingRect: `${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`,
                    visible: rect.width > 0 && rect.height > 0
                });
            });
        }
        
        // 미니맵 뷰포트 업데이트
        if (this.minimapManager) {
            this.minimapManager.updateViewport();
        }
    }
    
    /**
     * 패닝 이벤트 정리
     * 패닝 관련 모든 이벤트 리스너를 제거합니다.
     */
    cleanupPanningEvents(handleMiddleMouseMove, handleMiddleMouseUp, handleMouseLeave, handleContextMenu) {
        document.removeEventListener('mousemove', handleMiddleMouseMove);
        document.removeEventListener('mouseup', handleMiddleMouseUp);
        document.removeEventListener('mouseleave', handleMouseLeave);
        if (handleContextMenu) {
            document.removeEventListener('contextmenu', handleContextMenu);
        }
        console.log('패닝 이벤트 리스너 정리 완료');
    }
    
    /**
     * 패닝 종료
     * 마우스 휠 버튼을 떼면 패닝 모드를 종료합니다.
     */
    endPan() {
        console.log('endPan() 호출됨 - 현재 패닝 상태:', this.isPanning);
        
        // 강제로 패닝 상태 초기화
        this.isPanning = false;
        
        // 패닝 관련 속성들 초기화
        this.panStart = { x: 0, y: 0 };
        this.panScrollStart = { left: 0, top: 0 };
        
        // 패닝 모드 CSS 클래스 제거
        this.canvas.classList.remove('panning');
        
        // 커서를 기본값으로 복원
        this.canvas.style.cursor = 'default';
        
        console.log('패닝 모드 종료 완료 - 일반 모드로 복귀');
        console.log('패닝 상태:', this.isPanning, 'CSS 클래스:', this.canvas.classList.contains('panning'));
    }
    
    
    /**
     * 캔버스 스크롤 가능성 보장
     * 캔버스가 항상 스크롤 가능하도록 최소 크기를 설정합니다.
     */
    ensureCanvasScrollable() {
        if (this.isInfiniteCanvas) {
            console.log(`피그마 방식 무한 캔버스 모드 활성화`);
            
            // Transform 상태 초기화
            this.canvasTransform = {
                x: -50000,
                y: -50000,
                scale: 1
            };
            
            // 피그마 방식: Transform 기반 패닝
            const setupFigmaStyleCanvas = () => {
                // 캔버스 콘텐츠 컨테이너 찾기
                let canvasContent = document.getElementById('canvas-content');
                
                // 찾을 수 없으면 동적으로 생성
                if (!canvasContent) {
                    console.log(`캔버스 콘텐츠 컨테이너를 찾을 수 없습니다 - 동적으로 생성합니다`);
                    
                    // 기존 노드들을 임시 저장
                    const existingNodes = Array.from(this.canvas.children);
                    
                    // 캔버스 콘텐츠 컨테이너 생성
                    canvasContent = document.createElement('div');
                    canvasContent.id = 'canvas-content';
                    canvasContent.className = 'canvas-content';
                    
                    // 캔버스 비우기
                    this.canvas.innerHTML = '';
                    
                    // 캔버스 콘텐츠 컨테이너 추가
                    this.canvas.appendChild(canvasContent);
                    
                    // 기존 노드들을 캔버스 콘텐츠 컨테이너로 이동
                    existingNodes.forEach(node => {
                        // 노드의 현재 위치 저장
                        const currentLeft = node.style.left;
                        const currentTop = node.style.top;
                        
                        // 노드를 새 컨테이너로 이동
                        canvasContent.appendChild(node);
                        
                        // 위치 복원 (Transform이 적용되므로 원래 위치 유지)
                        node.style.left = currentLeft;
                        node.style.top = currentTop;
                    });
                    
                    console.log(`캔버스 콘텐츠 컨테이너를 동적으로 생성했습니다`);
                }
                
                // 노드들을 화면 중앙에 배치
                const screenCenterX = this.canvas.clientWidth / 2;
                const screenCenterY = this.canvas.clientHeight / 2;
                
                // 노드들의 위치를 화면 중앙에 맞게 조정
                const nodes = canvasContent.querySelectorAll('.workflow-node');
                nodes.forEach((node, index) => {
                    const nodeWidth = 200; // 노드 너비
                    const nodeHeight = 80; // 노드 높이
                    const spacing = 250; // 노드 간격
                    
                    // 노드들을 가로로 배치
                    const nodeX = screenCenterX + (index - 1) * spacing - nodeWidth / 2;
                    const nodeY = screenCenterY - nodeHeight / 2;
                    
                    console.log(`노드 ${node.dataset.nodeId} 위치 조정:`, {
                        원래위치: `${node.style.left}, ${node.style.top}`,
                        새위치: `${nodeX}, ${nodeY}`
                    });
                    
                    // 노드 위치 설정
                    node.style.left = nodeX + 'px';
                    node.style.top = nodeY + 'px';
                });
                
                // Transform 초기화 (노드들이 화면 좌표에 직접 배치됨)
                canvasContent.style.transform = 'translate(0px, 0px)';
                
                console.log(`피그마 방식 캔버스 설정 완료:`);
                console.log(`- 캔버스 크기: ${this.canvas.clientWidth}x${this.canvas.clientHeight}`);
                console.log(`- 화면 중앙: (${screenCenterX}, ${screenCenterY})`);
                console.log(`- Transform: translate(0px, 0px)`);
                console.log(`- 노드 개수: ${nodes.length}개 화면 중앙 배치 완료`);
                
                // DOM 상태 확인
                console.log('=== DOM 상태 확인 ===');
                console.log(`- canvas-content 자식 개수: ${canvasContent.children.length}`);
                console.log(`- canvas-content 자식들:`, Array.from(canvasContent.children).map(child => ({
                    tagName: child.tagName,
                    className: child.className,
                    nodeId: child.dataset.nodeId,
                    style: `${child.style.left}, ${child.style.top}`
                })));
                
                // 노드들의 실제 화면 위치 확인
                nodes.forEach(node => {
                    const rect = node.getBoundingClientRect();
                    console.log(`노드 ${node.dataset.nodeId} 실제 화면 위치:`, {
                        boundingRect: `${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`,
                        visible: rect.width > 0 && rect.height > 0,
                        style: `${node.style.left}, ${node.style.top}`
                    });
                });
                
                // Transform 상태 저장
                this.canvasTransform = {
                    x: 0,
                    y: 0,
                    scale: 1
                };
            };
            
            setTimeout(setupFigmaStyleCanvas, 300);
            return;
        }
        
        // 기존 로직 (고정 크기 캔버스용)
        const minWidth = Math.max(6000, window.innerWidth * 4);
        const minHeight = Math.max(4000, window.innerHeight * 4);
        
        const currentWidth = this.canvas.scrollWidth;
        const currentHeight = this.canvas.scrollHeight;
        
        if (currentWidth < minWidth || currentHeight < minHeight) {
            const newWidth = Math.max(currentWidth, minWidth);
            const newHeight = Math.max(currentHeight, minHeight);
            
            this.canvas.style.width = newWidth + 'px';
            this.canvas.style.height = newHeight + 'px';
            
            console.log(`캔버스 크기 확장: ${newWidth}x${newHeight}`);
        }
    }
    
    /**
     * 캔버스 줌 처리
     * Ctrl + 마우스 휠로 캔버스를 확대/축소합니다.
     * 무한 캔버스 모드에서 canvas-content의 Transform을 조정합니다.
     */
    handleCanvasZoom(e) {
        console.log('handleCanvasZoom 호출됨:', {
            clientX: e.clientX,
            clientY: e.clientY,
            deltaY: e.deltaY
        });
        
        // 줌 중 플래그 설정
        this.isZooming = true;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        console.log('마우스 위치 계산:', {
            canvasRect: rect,
            mouseX: mouseX,
            mouseY: mouseY
        });
        
        // 무한 캔버스 모드에서 canvas-content 찾기
        const canvasContent = document.getElementById('canvas-content');
        if (!canvasContent) {
            console.warn('canvas-content를 찾을 수 없습니다.');
            return;
        }
        
        // 현재 Transform 상태 파싱
        const transform = canvasContent.style.transform || 'translate(-50000px, -50000px) scale(1)';
        console.log('현재 Transform:', transform);
        
        // Transform 파싱 - 더 강력한 방법
        let currentX = -50000, currentY = -50000, currentScale = 1;
        
        // translate 파싱 (소수점 포함)
        const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (translateMatch) {
            currentX = parseFloat(translateMatch[1]) || -50000;
            currentY = parseFloat(translateMatch[2]) || -50000;
            console.log('Translate 파싱 결과:', { currentX, currentY, raw: translateMatch });
        }
        
        // scale 파싱 (소수점 포함)
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            currentScale = parseFloat(scaleMatch[1]) || 1;
            console.log('Scale 파싱 결과:', { currentScale, raw: scaleMatch[1] });
        } else {
            console.log('Scale 파싱 실패 - transform:', transform);
            // 기본값 유지
            currentScale = 1;
        }
        
        console.log('현재 Transform 상태:', {
            currentX: currentX,
            currentY: currentY,
            currentScale: currentScale
        });
        
        // 줌 방향 결정 (휠 위로 = 확대, 아래로 = 축소)
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, currentScale * zoomFactor));
        
        console.log('줌 계산:', {
            deltaY: e.deltaY,
            zoomFactor: zoomFactor,
            currentScale: currentScale,
            newScale: newScale
        });
        
        // 줌 중심점 계산 (마우스 위치를 중심으로 줌)
        const zoomRatio = newScale / currentScale;
        
        // 새로운 위치 계산 (마우스 위치를 중심으로 줌)
        const newX = mouseX - (mouseX - currentX) * zoomRatio;
        const newY = mouseY - (mouseY - currentY) * zoomRatio;
        
        console.log('새로운 위치 계산:', {
            zoomRatio: zoomRatio,
            newX: newX,
            newY: newY
        });
        
        // Transform 적용
        const newTransform = `translate(${newX}px, ${newY}px) scale(${newScale})`;
        canvasContent.style.transform = newTransform;
        
        console.log('Transform 적용됨:', newTransform);
        
        // 줌 레벨 표시
        this.showZoomLevel(newScale);
        
        // 미니맵 업데이트
        if (this.minimapManager) {
            this.minimapManager.updateMinimap();
        }
        
        console.log(`캔버스 줌 레벨 변경: ${currentScale.toFixed(2)}x → ${newScale.toFixed(2)}x`);
        console.log(`줌 중심: (${mouseX}, ${mouseY}), 새 위치: (${newX.toFixed(0)}, ${newY.toFixed(0)})`);
        
        // 줌 완료 후 플래그 해제 (약간의 지연 후)
        setTimeout(() => {
            this.isZooming = false;
            console.log('줌 완료 - 플래그 해제');
        }, 100);
    }
    
    /**
     * 줌 레벨 표시
     * 화면 상단에 현재 줌 레벨을 표시합니다.
     */
    showZoomLevel(zoomLevel) {
        // 기존 줌 레벨 표시 제거
        const existingIndicator = document.getElementById('zoom-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 새 줌 레벨 표시 생성
        const indicator = document.createElement('div');
        indicator.id = 'zoom-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;
        indicator.textContent = `${(zoomLevel * 100).toFixed(0)}%`;
        
        document.body.appendChild(indicator);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    indicator.remove();
                }, 300);
            }
        }, 2000);
    }
    
    /**
     * 노드 삭제
     * 선택된 노드를 캔버스와 데이터에서 제거합니다.
     */
    deleteNode(node) {
        const nodeId = node.dataset.nodeId;
        
        // DOM에서 노드 제거
        node.remove();
        
        // 데이터에서 노드 제거
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        delete this.nodeData[nodeId];
        
        // 미니맵에서 노드 제거
        if (this.minimapManager) {
            this.minimapManager.onNodeRemoved(nodeId);
        }
        
        // 연결선 제거
        if (this.connectionManager) {
            this.connectionManager.removeNodeConnections(nodeId);
        }
        
        // 선택 해제
        if (this.selectedNode === node) {
            this.selectedNode = null;
        }
        
        console.log('노드 삭제됨:', nodeId);
    }
    
    /**
     * 노드 애니메이션 (생성 시)
     * 새로 생성된 노드에 페이드인 애니메이션을 적용합니다.
     */
    animateNodeIn(nodeElement) {
        nodeElement.style.opacity = '0';
        nodeElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            nodeElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            nodeElement.style.opacity = '1';
            nodeElement.style.transform = 'scale(1)';
        }, 50);
    }
    
    /**
     * 모든 노드 데이터 반환
     * 현재 생성된 모든 노드의 정보를 반환합니다.
     */
    getAllNodes() {
        return this.nodes.map(n => ({
            id: n.data.id,
            title: n.data.title,
            type: n.data.type,
            color: n.data.color,
            x: parseInt(n.element.style.left),
            y: parseInt(n.element.style.top)
        }));
    }
    
    /**
     * 모든 연결선 데이터 반환
     * 현재 생성된 모든 연결선의 정보를 반환합니다.
     */
    getAllConnections() {
        if (this.connectionManager) {
            return this.connectionManager.getConnections();
        }
        return [];
    }
    
    /**
     * 롱터치 시작
     * 연결점을 롱터치하여 연결선 그리기 모드를 시작합니다.
     */
    startLongTouch(e, connector, nodeElement, connectorType) {
        console.log(`롱터치 시작: ${connectorType} 연결점`, {
            connector: connector,
            nodeElement: nodeElement,
            delay: this.longTouchDelay
        });
        
        // 기존 타이머가 있으면 취소
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
            console.log('기존 롱터치 타이머 취소됨');
        }
        
        // 롱터치 타이머 시작
        this.longTouchTimer = setTimeout(() => {
            console.log('롱터치 타이머 완료 - 연결선 그리기 모드 활성화');
            this.activateConnectionDrawingMode(e, connector, nodeElement, connectorType);
        }, this.longTouchDelay);
        
        console.log(`롱터치 타이머 시작됨 (${this.longTouchDelay}ms 후 활성화)`);
    }
    
    /**
     * 롱터치 취소
     * 롱터치를 취소하고 연결선 그리기 모드를 비활성화합니다.
     */
    cancelLongTouch() {
        console.log('롱터치 취소 시도', {
            hasTimer: !!this.longTouchTimer,
            isDrawing: this.isDrawingConnection
        });
        
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
            this.longTouchTimer = null;
            console.log('롱터치 타이머 취소됨');
        }
        
        if (this.isDrawingConnection) {
            console.log('연결선 그리기 모드 비활성화 중...');
            this.deactivateConnectionDrawingMode();
        }
    }
    
    /**
     * 연결선 그리기 모드 활성화
     * 롱터치가 완료되면 연결선 그리기 모드를 시작합니다.
     */
    activateConnectionDrawingMode(e, connector, nodeElement, connectorType) {
        console.log(`연결선 그리기 모드 활성화: ${connectorType}`);
        
        this.isDrawingConnection = true;
        this.connectionStartConnector = connector;
        this.connectionStartPoint = {
            x: e.clientX,
            y: e.clientY,
            nodeId: nodeElement.dataset.nodeId,
            connectorType: connectorType
        };
        
        // 연결점 하이라이트
        connector.style.backgroundColor = '#FF6B35';
        connector.style.borderColor = '#FF6B35';
        connector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // 캔버스에 마우스 이벤트 추가
        this.canvas.addEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.addEventListener('mouseup', this.handleConnectionComplete);
        
        // 연결선 그리기 메시지 표시
        this.showConnectionDrawingMessage(connectorType);
        
        console.log('연결선 그리기 모드 활성화 완료');
    }
    
    /**
     * 연결선 그리기 모드 비활성화
     * 연결선 그리기를 취소하고 모드를 비활성화합니다.
     */
    deactivateConnectionDrawingMode() {
        console.log('연결선 그리기 모드 비활성화');
        
        this.isDrawingConnection = false;
        this.connectionStartPoint = null;
        this.connectionStartConnector = null;
        
        // 연결점 하이라이트 제거
        if (this.connectionStartConnector) {
            this.updateConnectorVisualState(this.connectionStartConnector, false);
        }
        
        // 캔버스 이벤트 제거
        this.canvas.removeEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.removeEventListener('mouseup', this.handleConnectionComplete);
        
        // 연결선 그리기 메시지 숨기기
        this.hideConnectionDrawingMessage();
        
        // 임시 연결선 제거
        if (this.connectionManager) {
            this.connectionManager.removeTempConnection();
        }
        
        // 모든 연결점 하이라이트 제거
        this.clearAllConnectorHighlights();
        
        console.log('연결선 그리기 모드 비활성화 완료');
    }
    
    /**
     * 연결선 그리기 처리
     * 마우스 이동 시 연결선을 그리고 마그네틱 기능을 처리합니다.
     */
    handleConnectionDrawing = (e) => {
        if (!this.isDrawingConnection || !this.connectionStartPoint) return;
        
        // 임시 연결선 그리기 (connectionManager에 위임)
        if (this.connectionManager) {
            this.connectionManager.updateTempConnection(
                this.connectionStartPoint.x,
                this.connectionStartPoint.y,
                e.clientX,
                e.clientY
            );
        }
        
        // 마그네틱 기능: 가까운 연결점 찾기
        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);
        if (nearbyConnector) {
            this.highlightConnector(nearbyConnector);
        } else {
            this.clearAllConnectorHighlights();
        }
    }
    
    /**
     * 연결선 완료 처리
     * 마우스 업 시 연결을 완료하거나 취소합니다.
     */
    handleConnectionComplete = (e) => {
        if (!this.isDrawingConnection || !this.connectionStartPoint) return;
        
        // 가까운 연결점 찾기
        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);
        
        if (nearbyConnector) {
            // 연결 완료
            this.completeConnectionToConnector(nearbyConnector);
        } else {
            // 연결 취소
            this.deactivateConnectionDrawingMode();
        }
    }
    
    /**
     * 가까운 연결점 찾기 (마그네틱 기능)
     * 마우스 위치에서 가까운 연결점을 찾습니다.
     */
    findNearbyConnector(mouseX, mouseY) {
        const allConnectors = this.canvas.querySelectorAll('.node-input, .node-output');
        let closestConnector = null;
        let closestDistance = this.magneticThreshold;
        
        allConnectors.forEach(connector => {
            const rect = connector.getBoundingClientRect();
            const connectorX = rect.left + rect.width / 2;
            const connectorY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(mouseX - connectorX, 2) + Math.pow(mouseY - connectorY, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestConnector = connector;
            }
        });
        
        return closestConnector;
    }
    
    /**
     * 연결점 하이라이트
     * 연결점을 하이라이트하여 마그네틱 효과를 표시합니다.
     */
    highlightConnector(connector) {
        // 기존 하이라이트 제거
        this.clearAllConnectorHighlights();
        
        // 새 연결점 하이라이트
        connector.style.backgroundColor = '#34C759';
        connector.style.borderColor = '#34C759';
        connector.style.boxShadow = '0 0 15px rgba(52, 199, 89, 0.8)';
        connector.style.transform = 'scale(1.2)';
        connector.classList.add('magnetic-highlight');
    }
    
    /**
     * 모든 연결점 하이라이트 제거
     */
    clearAllConnectorHighlights() {
        const highlightedConnectors = this.canvas.querySelectorAll('.magnetic-highlight');
        highlightedConnectors.forEach(connector => {
            connector.style.backgroundColor = '';
            connector.style.borderColor = '';
            connector.style.boxShadow = '';
            connector.style.transform = '';
            connector.classList.remove('magnetic-highlight');
        });
    }
    
    /**
     * 연결점으로 연결 완료
     * 찾은 연결점으로 연결을 완료합니다.
     */
    completeConnectionToConnector(targetConnector) {
        if (!this.connectionStartPoint || !targetConnector) return;
        
        const targetNode = targetConnector.closest('.workflow-node');
        if (!targetNode) return;
        
        const targetNodeId = targetNode.dataset.nodeId;
        const targetConnectorType = targetConnector.classList.contains('node-input') ? 'input' : 'output';
        
        console.log(`연결 완료: ${this.connectionStartPoint.nodeId}(${this.connectionStartPoint.connectorType}) → ${targetNodeId}(${targetConnectorType})`);
        
        // 연결 생성
        if (this.connectionStartPoint.connectorType === 'output' && targetConnectorType === 'input') {
            this.createNodeConnection(
                this.connectionStartPoint.nodeId,
                targetNodeId,
                this.connectionStartPoint.connectorType,
                targetConnectorType
            );
        } else if (this.connectionStartPoint.connectorType === 'input' && targetConnectorType === 'output') {
            this.createNodeConnection(
                targetNodeId,
                this.connectionStartPoint.nodeId,
                targetConnectorType,
                this.connectionStartPoint.connectorType
            );
        }
        
        // 연결선 그리기 모드 비활성화
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
window.NodeManager = NodeManager;

// 페이지 로드 완료 후 노드 매니저 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 로드 완료 - 노드 매니저 인스턴스 생성');
window.nodeManager = new NodeManager();
    console.log('노드 매니저 인스턴스 생성 완료:', window.nodeManager);
});