/**
 * ?�크?�로???�드 관�??�래?? * 
 * ???�래?�는 ?�크?�로??캔버?�에???�드?�을 ?�성, 관�? 조작?�는 모든 기능???�당?�니??
 * 주요 기능:
 * - ?�드 ?�성, ?�동, ??��
 * - 마우?????�닝 (?�면 ?�동)
 * - Ctrl + 마우????�?(?��?/축소)
 * - 캔버???�기 ?�동 조정
 * - 미니맵과???�동
 */

// Logger??logger.js?�서 로드??const log = window.Logger ? window.Logger.log.bind(window.Logger) : console.log;
const logWarn = window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn;
const logError = window.Logger ? window.Logger.error.bind(window.Logger) : console.error;

class NodeManager {
    constructor() {
        // === 기본 ?�성 초기??===
        this.nodes = [];                    // ?�성??모든 ?�드?�의 배열
        this.selectedNode = null;           // ?�재 ?�택???�드
        this.nodeData = {};                 // ?�드 ?�이???�?�소 (?�치, ?�정 ??
        
        // === 무한 캔버??관???�성 ===
        this.isInfiniteCanvas = true;       // 무한 캔버??모드 ?�성??        
        // === ?�결 모드 관???�성 ===
        this.isConnecting = false;            // ?�결 모드 ?��? (?�거?? ?�용 ????
        this.connectionStart = null;          // ?�결 ?�작 ?�보 (?�거?? ?�용 ????
        this.canvasSize = { width: 50000, height: 50000 }; // 무한 캔버???�기
        
        // === ?�결 ?�들??===
        this.connectionHandler = null;        // ?�결 처리 ?�들??(지??초기??
        
        // === 캔버??관???�성 ===
        this.canvas = null;                 // ?�크?�로??캔버??DOM ?�소
        this.isCanvasFocused = false;       // 캔버?�에 ?�커?��? ?�는지 ?��?
        
        // === ?��? 매니?� 참조 ===
        this.connectionManager = null;     // ?�드 �??�결??관리자
        // ?�래�?�??�결???�데?�트 ?��?줄링 ?�래�?        this.connectionUpdateScheduled = false;
        this.pendingConnectionUpdateNodeId = null;
        
        this.init();
    }
    
    /**
     * 초기??메서??     * 캔버???�정, ?�벤??리스???�록, 기존 ?�드 ?�정???�행?�니??
     */
    init() {
        // 캔버??DOM ?�소 가?�오�?        this.canvas = document.getElementById('workflow-canvas');
        if (!this.canvas) {
            logError('?�크?�로??캔버?��? 찾을 ???�습?�다.');
            return;
        }
        
        // ?�벤??리스???�록
        this.setupEventListeners();
        
        // 기존 ?�드?�에 ?�벤??리스??추�?
        this.setupExistingNodes();
        
        // 컨트롤러??초기??(지??초기?�로 ?�른 ?�크립트?�이 로드?????�행)
        // ?�크립트가 로드???�까지 기다리기
        this.waitForControllersAndInitialize();
        
        // ?��? 매니?�??초기??(지??초기?�로 ?�른 컴포?�트?�이 로드?????�행)
        setTimeout(() => {
            this.initializeExternalManagers();
        }, 100);
    }
    
    /**
     * 컨트롤러 ?�크립트가 로드???�까지 기다�???초기??     */
    waitForControllersAndInitialize(maxAttempts = 20, attempt = 0) {
        const requiredControllers = [
            'NodeSelectionController',
            'NodeDragController',
            'NodeCanvasController',
            'NodeConnectionHandler'
        ];
        
        const allLoaded = requiredControllers.every(name => typeof window[name] === 'function');
        
        if (allLoaded || attempt >= maxAttempts) {
            if (allLoaded) {
                log('모든 컨트롤러 ?�크립트 로드 ?�료, 초기???�작');
            } else {
                logWarn('?��? 컨트롤러�?찾을 ???��?�?초기?��? 진행?�니??');
            }
            this.initializeControllers();
        } else {
            // 50ms ???�시 ?�도
            setTimeout(() => {
                this.waitForControllersAndInitialize(maxAttempts, attempt + 1);
            }, 50);
        }
    }
    
    /**
     * 컨트롤러??초기??     * ?�른 ?�크립트?�이 로드?????�행?�니??
     */
    initializeControllers() {
        // ?�택 컨트롤러
        if (typeof window.NodeSelectionController === 'function') {
            this.selectionController = new window.NodeSelectionController(this);
        } else {
            logWarn('NodeSelectionController �?찾을 ???�습?�다. (?�택 기능 기본 모드�??�작)');
            this.selectionController = null;
        }

        // ?�래�?컨트롤러
        if (typeof window.NodeDragController === 'function') {
            this.dragController = new window.NodeDragController(this);
        } else {
            logWarn('NodeDragController �?찾을 ???�습?�다. (?�래�?기능 비활??');
            this.dragController = null;
        }

        // 캔버??컨트롤러
        if (typeof window.NodeCanvasController === 'function') {
            this.canvasController = new window.NodeCanvasController(this);

            // 캔버???�벤???�닝/�??? 바인??            this.canvasController.bindEvents();

            // 캔버?��? ??�� ?�크�?가?�하?�록 ?�기 ?�정
            this.canvasController.ensureCanvasScrollable();
        } else {
            logWarn('NodeCanvasController �?찾을 ???�습?�다. (기본 캔버??모드)');
            this.canvasController = null;
        }
        
        // ?�결 ?�들??초기??        if (typeof window.NodeConnectionHandler === 'function') {
            this.connectionHandler = new window.NodeConnectionHandler(this);
        } else {
            logWarn('NodeConnectionHandler�?찾을 ???�습?�다. (?�결 기능 비활??');
            this.connectionHandler = null;
        }
        
        // 컨트롤러 초기????기존 ?�드?�에 ?�벤??리스???�시 바인??        this.setupExistingNodes();
    }
    
    // === ?�택 관???�록??===
    selectNode(node) {
        if (this.selectionController) {
            this.selectionController.selectNode(node);
        }
    }

    deselectNode() {
        if (this.selectionController) {
            this.selectionController.deselectNode();
        }
    }

    // === ?�태 조회??getter (connection.js?�서 ?�용 �? ===
    get isDragging() {
        return this.dragController ? this.dragController.isDragging : false;
    }

    get isPanning() {
        return this.canvasController ? this.canvasController.isPanning : false;
    }

    /**
     * ?��? 매니?�??초기??     * ?�결 관리자?� 미니�?관리자�?초기?�합?�다.
     */
    initializeExternalManagers() {
            // ?�결 관리자 초기??            if (window.ConnectionManager && !this.connectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                // ?�역 변?�로 ?�정
                if (window.setConnectionManager) {
                    window.setConnectionManager(this.connectionManager);
                }
                log('?�결 관리자 초기???�료');
            } else if (!window.ConnectionManager) {
                logWarn('ConnectionManager ?�래?��? 찾을 ???�습?�다.');
            }
            
        
    }
    
    /**
     * ?�벤??리스???�정
     * 마우?? ?�보?? ????모든 ?�용???�력 ?�벤?��? 처리?�니??
     */
    setupEventListeners() {
        // === ?�결 모드 관???�벤?�만 ?��? ===
    
        // 캔버???�릭 ?�벤??(?�결 모드 취소??
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                if (this.isConnecting) {
                    this.cancelConnection();
                } else if (this.connectionHandler && this.connectionHandler.isClickConnecting) {
                    this.connectionHandler.cancelClickConnection();
                }
            }
        });
        
        // 마우???�동 ?�벤??(?�릭 ?�결 �??�시 ?�결???�데?�트)
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.connectionHandler && this.connectionHandler.isClickConnecting) {
                this.connectionHandler.updateClickConnectionLine(e);
            }
        });
        
        // ESC ???�벤??(?�결 모드 취소??
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isConnecting) {
                    e.preventDefault();
                    this.cancelConnection();
                } else if (this.connectionHandler && this.connectionHandler.isClickConnecting) {
                    e.preventDefault();
                    this.connectionHandler.cancelClickConnection();
                }
            }
        });
    }
    
    /**
     * 기존 ?�드?�에 ?�벤??리스???�정
     * ?�이지 로드 ???��? 존재?�는 ?�드?�에 ?�벤?��? 바인?�합?�다.
     */
    setupExistingNodes() {
        const existingNodes = document.querySelectorAll('.workflow-node');
        existingNodes.forEach(node => {
            this.setupNodeEventListeners(node);
        });
    }
    
    /**
     * 개별 ?�드???�벤??리스???�정
     * ?�드???�릭, ?�래�? ?�택 ?�의 ?�벤?��? 처리?�니??
     */
    setupNodeEventListeners(node) {
        // ?�릭 ???�택?� NodeManager가 그�?�??�당
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
        });
    
        // ?�래�??�버???�래�?컨트롤러???�임
        if (this.dragController) {
            this.dragController.attachNode(node);
        }
    }
    
    // ==========================================
    // ?�드 ?�성 관??메서?�들
    // ==========================================
    
    /**
     * ?�드 ?�성 (메인 메서??
     * ?�로???�크?�로???�드�??�성?�고 캔버?�에 추�??�니??
     * 
     * @param {Object} nodeData - ?�드 ?�이??     * @param {string} nodeData.id - ?�드 ID
     * @param {string} nodeData.title - ?�드 ?�목
     * @param {string} nodeData.type - ?�드 ?�??('action' | 'condition')
     * @param {string} nodeData.color - ?�드 ?�상
     * @param {number} nodeData.x - X 좌표
     * @param {number} nodeData.y - Y 좌표
     * @returns {HTMLElement} ?�성???�드 ?�소
     */
    createNode(nodeData) {
        try {
            // 1. 기본 ?�드 ?�소 ?�성
            const nodeElement = this.createNodeElement(nodeData);
            
            // 2. ?�드 ?�용 ?�성
            const nodeContent = this.generateNodeContent(nodeData);
            nodeElement.innerHTML = nodeContent;
            
            // 3. ?�벤??리스???�정
            this.setupNodeEventListeners(nodeElement);
            
            // 4. ?�결 ?�벤???�정
            if (this.connectionHandler) {
                this.connectionHandler.setupConnectionEvents(nodeElement);
            }
            
            // 5. 캔버?�에 추�?
            this.addNodeToCanvas(nodeElement);
            
            // 6. ?�드 ?�이???�??            this.saveNodeData(nodeData);

            // ??nodes 배열?�도 ?�록 (?�?�용)
            this.nodes.push({
                id: nodeData.id,
                data: nodeData,
                element: nodeElement
            });
            
            log(`?�드 ?�성 ?�료: ${nodeData.id} (${nodeData.title})`);
            return nodeElement;
            
        } catch (error) {
            logError('?�드 ?�성 ?�패:', error);
            throw error;
        }
    }
    
    /**
     * ?�드 DOM ?�소 ?�성
     * @param {Object} nodeData - ?�드 ?�이??     * @returns {HTMLElement} ?�드 ?�소
     */
    createNodeElement(nodeData) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node node-${nodeData.color}`;
        nodeElement.id = nodeData.id;
        nodeElement.dataset.nodeId = nodeData.id;
        nodeElement.style.left = nodeData.x + 'px';
        nodeElement.style.top = nodeData.y + 'px';
        
        log(`?�드 ?�성: ${nodeData.id} ?�치 (${nodeData.x}, ${nodeData.y})`);
        
        return nodeElement;
    }
    
    /**
     * ?�드 ?�용 HTML ?�성
     * @param {Object} nodeData - ?�드 ?�이??     * @returns {string} HTML ?�용
     */
    generateNodeContent(nodeData) {
        // ?�적 ?��??�트리에???�?�별 ?�더??가?�오�?        const registry = this.constructor.nodeTypeDefinitions || {};
        
        // ?�선?�위: ?�확???�????action ??default
        const def =
            registry[nodeData.type] ||
            registry['action'] ||
            registry['default'];

        if (def && typeof def.renderContent === 'function') {
            // renderContent ?�에??this.escapeHtml ?�을 ?????�게 this�?그�?�??��?
            return def.renderContent.call(this, nodeData);
        }

        // ?�시 ?�무 것도 ?�록 ?????�으�??�전 기본 ?�태�?fallback
        return `
            <div class="node-input"></div>
            <div class="node-content">
                <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
            </div>
            <div class="node-output"></div>
            <div class="node-settings">??/div>
        `;
    }
    
    /**
     * ?�결???�벤???�정 (connectionHandler�??�임)
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    setupConnectionEvents(nodeElement) {
        if (this.connectionHandler) {
            this.connectionHandler.setupConnectionEvents(nodeElement);
        }
    }
    
    /**
     * ?�력 ?�결???�벤???�정
     * @param {HTMLElement} inputConnector - ?�력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    setupInputConnectorEvents(inputConnector, nodeElement) {
        // ?�릭?�로 ?�결 ?�료
        inputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
                this.handleInputConnectorClick(inputConnector, nodeElement);
        });
        
        // ?�블?�릭?�로 ?�결????��
        inputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(inputConnector, nodeElement, 'input');
        });
        
        // ?�결?�에 ?�결 ?�태 ?�시
        const connections = this.findConnectionsByNode(nodeElement.dataset.nodeId, 'input');
        this.updateConnectorVisualState(inputConnector, connections.length > 0);
        
        inputConnector.addEventListener('mouseenter', (e) => {
            const tooltipText = connections.length > 0 ? 
                `?�력 ?�결??(${connections.length}�??�결??` : '?�력 ?�결??;
            this.showConnectorTooltip(inputConnector, tooltipText);
        });
        
        inputConnector.addEventListener('mouseleave', (e) => {
            this.hideConnectorTooltip();
        });
    }
    
    /**
     * 출력 ?�결???�벤???�정
     * @param {HTMLElement} outputConnector - 출력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    setupOutputConnectorEvents(outputConnector, nodeElement) {
        // ?�릭?�로 ?�결 모드 ?�작
        outputConnector.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isClickConnecting) {
                // ?�결 모드 �? ?�결 ?�료
                const nodeId = nodeElement.dataset.nodeId;
                const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                                  outputConnector.classList.contains('false-output') ? 'false' : 'default';
                this.completeClickConnection(nodeId, outputType);
            } else {
                // ?�결 모드가 ?�님: ?�결 ?�작
                this.startClickConnection(outputConnector, nodeElement);
            }
        });
        
        // ?�블?�릭?�로 ?�결????��
        outputConnector.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleConnectorDoubleClick(outputConnector, nodeElement, 'output');
        });
        
        // ?�결?�에 ?�결 ?�태 ?�시
        const outputConnections = this.findConnectionsByNode(nodeElement.dataset.nodeId, 'output');
        this.updateConnectorVisualState(outputConnector, outputConnections.length > 0);
        
        outputConnector.addEventListener('mouseenter', (e) => {
            const label = outputConnector.querySelector('.output-label');
            const baseText = label ? label.textContent : '출력 ?�결??;
            const tooltipText = outputConnections.length > 0 ? 
                `${baseText} (${outputConnections.length}�??�결??` : baseText;
            this.showConnectorTooltip(outputConnector, tooltipText);
        });
        
        outputConnector.addEventListener('mouseleave', (e) => {
            this.hideConnectorTooltip();
        });
    }
    
    /**
     * ?�력 ?�결???�릭 처리
     * @param {HTMLElement} inputConnector - ?�력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    handleInputConnectorClick(inputConnector, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        
        if (this.isClickConnecting) {
            // ?�결 모드 �? ?�결 ?�료
            this.completeClickConnection(nodeId, 'input');
        } else {
            // ?�결 모드가 ?�님: ?�력 ?�결?�에???�결 ?�작
            this.startClickConnectionFromInput(inputConnector, nodeElement);
        }
    }
    
    /**
     * ?�릭 ?�결 ?�작 (출력 ?�결?�에??
     * 출력 ?�결?�을 ?�릭?�면 ?�결 모드�??�작?�니??
     * @param {HTMLElement} outputConnector - 출력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    startClickConnection(outputConnector, nodeElement) {
        log('출력 ?�결?�에???�릭 ?�결 ?�작');
        
        const nodeId = nodeElement.dataset.nodeId;
        const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                          outputConnector.classList.contains('false-output') ? 'false' : 'default';
        
        // ?�릭 ?�결 ?�태 ?�정
        this.isClickConnecting = true;
        this.clickConnectionStart = {
            nodeId: nodeId,
            outputType: outputType,
            connector: outputConnector,
            isFromOutput: true
        };
        
        // ?�결???�이?�이??        outputConnector.style.backgroundColor = '#FF6B35';
        outputConnector.style.borderColor = '#FF6B35';
        outputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // ?�시 ?�결???�성
        const startPos = this.getConnectorPosition(outputConnector);
        this.createTempConnectionLine(startPos.x, startPos.y);
        
        // ?�결 모드 메시지 ?�시
        this.showClickConnectionMessage('?�력 ?�결?�을 ?�릭?�여 ?�결?�세??);
        
        // 모든 ?�력 ?�결???�성??        this.activateInputConnectors();
        
        log(`출력 ?�결?�에???�릭 ?�결 ?�작: ${nodeId} (${outputType})`);
    }
    
    /**
     * ?�릭 ?�결 ?�작 (?�력 ?�결?�에??
     * ?�력 ?�결?�을 ?�릭?�면 ?�결 모드�??�작?�니??
     * @param {HTMLElement} inputConnector - ?�력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    startClickConnectionFromInput(inputConnector, nodeElement) {
        log('?�력 ?�결?�에???�릭 ?�결 ?�작');
        
        const nodeId = nodeElement.dataset.nodeId;
        
        // ?�릭 ?�결 ?�태 ?�정
        this.isClickConnecting = true;
        this.clickConnectionStart = {
            nodeId: nodeId,
            outputType: 'input',
            connector: inputConnector,
            isFromOutput: false
        };
        
        // ?�결???�이?�이??        inputConnector.style.backgroundColor = '#FF6B35';
        inputConnector.style.borderColor = '#FF6B35';
        inputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // ?�시 ?�결???�성
        const startPos = this.getConnectorPosition(inputConnector);
        this.createTempConnectionLine(startPos.x, startPos.y);
        
        // ?�결 모드 메시지 ?�시
        this.showClickConnectionMessage('출력 ?�결?�을 ?�릭?�여 ?�결?�세??);
        
        // 모든 출력 ?�결???�성??        this.activateOutputConnectors();
        
        log(`?�력 ?�결?�에???�릭 ?�결 ?�작: ${nodeId}`);
    }
    
    /**
     * ?�릭 ?�결 ?�료
     * ?�결?�을 ?�릭?�면 ?�결???�료?�니??
     * @param {string} nodeId - ?�???�드 ID
     * @param {string} connectorType - ?�결???�??     */
    completeClickConnection(nodeId, connectorType) {
        if (!this.isClickConnecting || !this.clickConnectionStart) {
            logWarn('?�릭 ?�결 모드가 ?�성?�되지 ?�았?�니??');
            return;
        }
        
        const startNodeId = this.clickConnectionStart.nodeId;
        const startOutputType = this.clickConnectionStart.outputType;
        const isFromOutput = this.clickConnectionStart.isFromOutput;
        
        // ?�결 방향???�른 ?�효??검??        let isValid = false;
        if (isFromOutput) {
            // 출력 ???�력 ?�결
            isValid = this.validateConnection(startNodeId, nodeId, 'output', 'input');
        } else {
            // ?�력 ??출력 ?�결
            isValid = this.validateConnection(nodeId, startNodeId, 'input', 'output');
        }
        
        if (!isValid) {
            this.cancelClickConnection();
            return;
        }
        
        // ?�결 ?�성
        if (isFromOutput) {
            this.createNodeConnection(startNodeId, nodeId, startOutputType, connectorType);
        } else {
            this.createNodeConnection(nodeId, startNodeId, connectorType, 'input');
        }
        
        // ?�릭 ?�결 ?�리
        this.cleanupClickConnection();
        
        log(`?�릭 ?�결 ?�료: ${startNodeId}(${startOutputType}) ??${nodeId}(${connectorType})`);
    }
    
    /**
     * ?�릭 ?�결 취소
     * ESC ?�나 캔버???�릭 ???�릭 ?�결 모드�?취소?�니??
     */
    cancelClickConnection() {
        log('?�릭 ?�결 취소');
        this.cleanupClickConnection();
    }
    
    /**
     * ?�릭 ?�결 ?�리
     * ?�릭 ?�결 관???�태?� UI�??�리?�니??
     */
    cleanupClickConnection() {
        this.isClickConnecting = false;
        
        // ?�작 ?�결???�이?�이???�거
        if (this.clickConnectionStart && this.clickConnectionStart.connector) {
            this.updateConnectorVisualState(this.clickConnectionStart.connector, false);
        }
        
        // ?�시 ?�결???�거
        this.removeTempConnectionLine();
        
        // 모든 ?�결??비활?�화
        this.deactivateAllConnectors();
        
        // ?�결 모드 메시지 ?�기�?        this.hideClickConnectionMessage();
        
        // ?�태 초기??        this.clickConnectionStart = null;
    }
    
    /**
     * ?�릭 ?�결 메시지 ?�시
     * ?�릭 ?�결 중임???�리??메시지�??�시?�니??
     * @param {string} text - ?�시??메시지 ?�스??     */
    showClickConnectionMessage(text = '?�력 ?�결?�을 ?�릭?�여 ?�결?�세??) {
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
     * ?�릭 ?�결 메시지 ?�기�?     * ?�릭 ?�결 메시지�??�거?�니??
     */
    hideClickConnectionMessage() {
        const message = document.getElementById('click-connection-message');
        if (message) {
            message.remove();
        }
    }
    
    /**
     * ?�릭 ?�결 �??�시 ?�결???�데?�트
     * 마우???�치???�라 ?�시 ?�결?�을 ?�데?�트?�니??
     * @param {MouseEvent} e - 마우???�벤??     */
    updateClickConnectionLine(e) {
        if (!this.isClickConnecting || !this.clickConnectionStart || !this.tempConnectionLine) {
            return;
        }
        
        const startConnector = this.clickConnectionStart.connector;
        const startPos = this.getConnectorPosition(startConnector);
        
        // 마우???�치�?캔버??좌표�?변??        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // ?�시 ?�결???�데?�트
        this.updateTempConnectionLine(startPos, { x: mouseX, y: mouseY });
        
        // 마그?�틱 ?�과: 근처 ?�력 ?�결???�이?�이??        this.highlightNearbyInputConnector(mouseX, mouseY);
    }
    
    /**
     * 근처 ?�력 ?�결???�이?�이??     * 마우???�치 근처???�력 ?�결?�을 ?�이?�이?�합?�다.
     * @param {number} mouseX - 마우??X 좌표
     * @param {number} mouseY - 마우??Y 좌표
     */
    highlightNearbyInputConnector(mouseX, mouseY) {
        // 모든 ?�력 ?�결???�인
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
        
        // ?�전 ?�이?�이???�거
        inputConnectors.forEach(connector => {
            connector.classList.remove('magnetic-highlight');
        });
        
        // 가??가까운 ?�결???�이?�이??        if (nearestConnector) {
            nearestConnector.classList.add('magnetic-highlight');
        }
    }
    
    /**
     * ?�결???�치 계산
     * ?�결?�의 캔버???�의 ?�치�?계산?�니??
     * @param {HTMLElement} connector - ?�결???�소
     * @returns {Object} ?�결???�치 {x, y}
     */
    getConnectorPosition(connector) {
        // 캔버??콘텐�?컨테?�너 ?�인
        const canvasContent = document.getElementById('canvas-content');
        
        if (canvasContent) {
            // Transform 기반 ?�닝 (?�그�?방식)
            const transform = canvasContent.style.transform;
            let transformX = 0, transformY = 0;
            
            if (transform && transform !== 'none') {
                const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (match) {
                    transformX = parseFloat(match[1]);
                    transformY = parseFloat(match[2]);
                }
            }
            
            // ?�결?�의 ?��? ?�치 계산
            const connectorRect = connector.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // 캔버???�에?�의 ?��? ?�치 계산 (Transform 고려)
            // Transform???�용???�태?�서???�제 ?�면 ?�치�?계산
            const relativeX = connectorRect.left - canvasRect.left + connectorRect.width / 2;
            const relativeY = connectorRect.top - canvasRect.top + connectorRect.height / 2;
            
            // SVG??캔버??뷰포??기�??��?�?Transform??빼야 ??            // Transform???�수?�면 캔버?��? ?�쪽/?�로 ?�동??것이므�??�결?��? ?�른�??�래�??�동
            const actualX = relativeX - transformX;
            const actualY = relativeY - transformY;
            
            return { x: actualX, y: actualY };
        } else {
            // ?�크�?기반 ?�닝 (?�통??방식)
            const rect = connector.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // 캔버???�에?�의 ?��? ?�치 계산 (?�결??중심 좌표)
            const relativeX = rect.left - canvasRect.left + rect.width / 2;
            const relativeY = rect.top - canvasRect.top + rect.height / 2;
            
            return { x: relativeX, y: relativeY };
        }
    }
    
    /**
     * ?�래�??�결 ?�작
     * 출력 ?�결?�을 ?�릭?�면 마우?��? ?�라가???�결?�을 그립?�다.
     * @param {MouseEvent} e - 마우???�벤??     * @param {HTMLElement} outputConnector - 출력 ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    startDragConnection(e, outputConnector, nodeElement) {
        log('?�래�??�결 ?�작');
        
        const nodeId = nodeElement.dataset.nodeId;
        const outputType = outputConnector.classList.contains('true-output') ? 'true' : 
                          outputConnector.classList.contains('false-output') ? 'false' : 'default';
        
        // ?�래�??�결 ?�태 ?�정
        this.isDraggingConnection = true;
        this.dragConnectionStart = {
            nodeId: nodeId,
            outputType: outputType,
            connector: outputConnector,
            // ?�작?��? ?�제 커넥??좌표(캔버??기�?)�?고정
            ...(() => { const p = this.getConnectorPosition(outputConnector); return { startCanvasX: p.x, startCanvasY: p.y }; })()
        };
        
        // ?�결???�이?�이??        outputConnector.style.backgroundColor = '#FF6B35';
        outputConnector.style.borderColor = '#FF6B35';
        outputConnector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // ?�시 ?�결???�성 (캔버??기�? 좌표)
        this.createTempConnectionLine(this.dragConnectionStart.startCanvasX, this.dragConnectionStart.startCanvasY);
        
        // ?�역 마우???�벤??리스??추�?
        document.addEventListener('mousemove', this.handleDragConnectionMove);
        document.addEventListener('mouseup', this.handleDragConnectionEnd);
        
        // ?�결 모드 메시지 ?�시
        this.showDragConnectionMessage();
        
        log(`?�래�??�결 ?�작: ${nodeId} (${outputType})`);
    }
    
    /**
     * ?�래�??�결 ?�동 처리
     * 마우???�동???�라 ?�시 ?�결?�을 ?�데?�트?�니??
     */
    handleDragConnectionMove = (e) => {
        if (!this.isDraggingConnection) return;
        
        // 마우??좌표�?캔버??기�??�로 ?�규??        const canvasRect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // ?�시 ?�결???�데?�트 (객체 좌표 ?�식)
        this.updateTempConnectionLine(
            { x: this.dragConnectionStart.startCanvasX, y: this.dragConnectionStart.startCanvasY },
            { x: mouseX, y: mouseY }
        );
        
        // 가까운 ?�력 ?�결??찾기 (마그?�틱 ?�과)
        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);
        
        // 모든 ?�결???�이?�이???�거
        this.clearAllConnectorHighlights();
        
        // 가까운 ?�력 ?�결???�이?�이??        if (nearbyInputConnector) {
            this.highlightConnector(nearbyInputConnector);
        }
    }
    
    /**
     * ?�래�??�결 종료 처리
     * 마우???????�결???�료?�거??취소?�니??
     */
    handleDragConnectionEnd = (e) => {
        if (!this.isDraggingConnection) return;
        
        // 가까운 ?�력 ?�결??찾기
        const nearbyInputConnector = this.findNearbyInputConnector(e.clientX, e.clientY);
        
        if (nearbyInputConnector) {
            // ?�결 ?�료
            this.completeDragConnection(nearbyInputConnector);
        } else {
            // ?�결 취소
            this.cancelDragConnection();
        }
    }
    
    /**
     * 가까운 ?�력 ?�결??찾기
     * 마우???�치?�서 가까운 ?�력 ?�결?�을 찾습?�다.
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
     * ?�래�??�결 ?�료
     * 찾�? ?�력 ?�결?�으�??�결???�료?�니??
     */
    completeDragConnection(targetInputConnector) {
        if (!this.dragConnectionStart || !targetInputConnector) return;
        
        const targetNode = targetInputConnector.closest('.workflow-node');
        if (!targetNode) return;
        
        const targetNodeId = targetNode.dataset.nodeId;
        const startNodeId = this.dragConnectionStart.nodeId;
        const outputType = this.dragConnectionStart.outputType;
        
        log(`?�래�??�결 ?�료: ${startNodeId}(${outputType}) ??${targetNodeId}(input)`);
        
        // ?�결 ?�성
        this.createNodeConnection(startNodeId, targetNodeId, outputType, 'input');
        
        // ?�래�??�결 ?�리
        this.cleanupDragConnection();
        
        log('?�래�??�결 ?�료');
    }
    
    /**
     * ?�래�??�결 취소
     * ?�래�??�결??취소?�고 ?�리?�니??
     */
    cancelDragConnection() {
        log('?�래�??�결 취소');
        this.cleanupDragConnection();
    }
    
    /**
     * ?�래�??�결 ?�리
     * ?�래�??�결 관???�태?� UI�??�리?�니??
     */
    cleanupDragConnection() {
        this.isDraggingConnection = false;
        
        // ?�작 ?�결???�이?�이???�거
        if (this.dragConnectionStart && this.dragConnectionStart.connector) {
            this.updateConnectorVisualState(this.dragConnectionStart.connector, false);
        }
        
        // ?�역 ?�벤??리스???�거
        document.removeEventListener('mousemove', this.handleDragConnectionMove);
        document.removeEventListener('mouseup', this.handleDragConnectionEnd);
        
        // ?�시 ?�결???�거
        this.removeTempConnectionLine();
        
        // 모든 ?�결???�이?�이???�거
        this.clearAllConnectorHighlights();
        
        // ?�결 모드 메시지 ?�기�?        this.hideDragConnectionMessage();
        
        // ?�태 초기??        this.dragConnectionStart = null;
    }
    
    /**
     * ?�시 ?�결???�성
     * ?�래�?중에 ?�시???�시 ?�결?�을 ?�성?�니??
     */
    createTempConnectionLine(startX, startY) {
        // 기존 ?�시 ?�결???�거
        this.removeTempConnectionLine();
        
        // 캔버???�치 계산
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // SVG ?�결???�성
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
     * ?�시 ?�결???�데?�트
     * 마우???�치???�라 ?�시 ?�결?�을 ?�데?�트?�니??
     */
    updateTempConnectionLine(startPos, endPos) {
        if (!this.tempConnectionLine) return;
        
        const startX = startPos.x;
        const startY = startPos.y;
        const currentX = endPos.x;
        const currentY = endPos.y;
        
        // 베�???곡선?�로 부?�러???�결??그리�?        const controlPoint1X = startX + (currentX - startX) * 0.5;
        const controlPoint1Y = startY;
        const controlPoint2X = startX + (currentX - startX) * 0.5;
        const controlPoint2Y = currentY;
        
        const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${currentX} ${currentY}`;
        this.tempConnectionLine.path.setAttribute('d', pathData);
    }
    
    /**
     * ?�시 ?�결???�거
     * ?�시 ?�결?�을 DOM?�서 ?�거?�니??
     */
    removeTempConnectionLine() {
        if (this.tempConnectionLine && this.tempConnectionLine.svg) {
            this.tempConnectionLine.svg.remove();
            this.tempConnectionLine = null;
        }
    }
    
    /**
     * ?�래�??�결 메시지 ?�시
     * ?�래�??�결 중임???�리??메시지�??�시?�니??
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
        message.textContent = '?�력 ?�결?�에 ?�아???�결?�세??;
        
        document.body.appendChild(message);
    }
    
    /**
     * ?�래�??�결 메시지 ?�기�?     * ?�래�??�결 메시지�??�거?�니??
     */
    hideDragConnectionMessage() {
        const message = document.getElementById('drag-connection-message');
        if (message) {
            message.remove();
        }
    }
    
    /**
     * ?�결???�블?�릭 처리
     * ?�결???�결?�을 ?�블?�릭?�면 ?�결?�을 ??��?�니??
     * 
     * @param {HTMLElement} connector - ?�결???�소
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     * @param {string} connectorType - ?�결???�??('input' | 'output')
     */
    handleConnectorDoubleClick(connector, nodeElement, connectorType) {
        const nodeId = nodeElement.dataset.nodeId;
        
        try {
            // ?�결???�결??찾기
            const connections = this.findConnectionsByNode(nodeId, connectorType);
            
            if (connections.length === 0) {
                log(`?�드 ${nodeId}??${connectorType} ?�결?�에 ?�결???�이 ?�습?�다.`);
                this.showConnectorTooltip(connector, '?�결???�이 ?�습?�다');
                setTimeout(() => this.hideConnectorTooltip(), 2000);
                return;
            }
            
            // ?�결????��
            connections.forEach(connection => {
                this.deleteConnectionByConnectionId(connection.id);
            });
            
            // ?�각???�드�?            this.showConnectionDeletedFeedback(connector, connections.length);
            
            // ?�결???�각???�태 ?�데?�트
            setTimeout(() => {
                this.updateAllConnectorsVisualState();
            }, 100);
            
            log(`?�드 ${nodeId}??${connectorType} ?�결?�에??${connections.length}개의 ?�결????��??);
            
        } catch (error) {
            logError('?�결????�� ?�패:', error);
        }
    }
    
    /**
     * ?�드???�결?�에 ?�결???�결?�들 찾기
     * @param {string} nodeId - ?�드 ID
     * @param {string} connectorType - ?�결???�??('input' | 'output')
     * @returns {Array} ?�결???�결??배열
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
     * ?�결??ID�??�결????��
     * @param {string} connectionId - ?�결??ID
     */
    deleteConnectionByConnectionId(connectionId) {
        if (!this.connectionManager) {
            logWarn('?�결 관리자가 초기?�되지 ?�았?�니??');
            return;
        }
        
        try {
            // ?�결 관리자????�� 메서???�출
            if (typeof this.connectionManager.deleteConnection === 'function') {
                this.connectionManager.deleteConnection(connectionId);
            } else {
                logWarn('?�결 관리자??deleteConnection 메서?��? ?�습?�다.');
            }
        } catch (error) {
            logError('?�결????�� ?�패:', error);
        }
    }
    
    /**
     * ?�결????�� ?�각???�드�?     * @param {HTMLElement} connector - ?�결???�소
     * @param {number} deletedCount - ??��???�결??개수
     */
    showConnectionDeletedFeedback(connector, deletedCount) {
        // ?�결?�에 ??�� ?�니메이???�과
        connector.style.transform = 'scale(0.8)';
        connector.style.backgroundColor = '#FF3B30';
        connector.style.borderColor = '#FF3B30';
        
        // ?�팁?�로 ??�� ?�인 메시지 ?�시
        this.showConnectorTooltip(connector, `${deletedCount}�??�결????��??);
        
        // 0.3�????�래 ?�태�?복원
        setTimeout(() => {
            connector.style.transform = '';
            connector.style.backgroundColor = '';
            connector.style.borderColor = '';
            this.hideConnectorTooltip();
        }, 300);
    }
    
    /**
     * ?�결???�각???�태 ?�데?�트
     * ?�결???�결?�과 ?�결?��? ?��? ?�결?�을 구분?�여 ?�시?�니??
     * 
     * @param {HTMLElement} connector - ?�결???�소
     * @param {boolean} isConnected - ?�결 ?�태
     */
    updateConnectorVisualState(connector, isConnected) {
        if (isConnected) {
            // ?�결???�태: 초록?�으�??�시
            connector.classList.add('connected');
            connector.style.backgroundColor = '#34C759';
            connector.style.borderColor = '#34C759';
            connector.style.boxShadow = '0 0 8px rgba(52, 199, 89, 0.6)';
        } else {
            // ?�결?��? ?��? ?�태: 기본 ?�상
            connector.classList.remove('connected');
            connector.style.backgroundColor = '#ffffff';
            connector.style.borderColor = '#666';
            connector.style.boxShadow = 'none';
        }
    }
    
    /**
     * 모든 ?�결?�의 ?�각???�태 ?�데?�트
     * ?�드 ?�성 ???�는 ?�결 ?�태 변�????�출?�니??
     */
    updateAllConnectorsVisualState() {
        const allNodes = this.canvas.querySelectorAll('.workflow-node');
        
        allNodes.forEach(node => {
            const nodeId = node.dataset.nodeId;
            
            // ?�력 ?�결???�데?�트
            const inputConnector = node.querySelector('.node-input');
            if (inputConnector) {
                const inputConnections = this.findConnectionsByNode(nodeId, 'input');
                this.updateConnectorVisualState(inputConnector, inputConnections.length > 0);
            }
            
            // 출력 ?�결?�들 ?�데?�트
            const outputConnectors = node.querySelectorAll('.node-output');
            outputConnectors.forEach(outputConnector => {
                const outputConnections = this.findConnectionsByNode(nodeId, 'output');
                this.updateConnectorVisualState(outputConnector, outputConnections.length > 0);
            });
        });
    }
    
    /**
     * ?�결 모드 ?�작
     * 출력 ?�결?�을 ?�릭?�을 ???�결 모드�??�작?�니??
     * 
     * @param {string} nodeId - ?�작 ?�드 ID
     * @param {string} connectorType - ?�결???�??('input' | 'output')
     * @param {string} outputType - 출력 ?�??('true' | 'false' | 'default')
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
            
            // ?�결 모드 UI ?�성??            this.activateConnectionMode();
            
            // ?�결 ?�작???�이?�이??            this.highlightConnectionStart(nodeId, connectorType, outputType);
            
            log(`?�결 모드 ?�작: ${nodeId} (${connectorType}, ${outputType})`);
            
        } catch (error) {
            logError('?�결 모드 ?�작 ?�패:', error);
            this.cancelConnection();
        }
    }
    
    /**
     * ?�결 ?�료
     * ?�력 ?�결?�을 ?�릭?�을 ???�결???�료?�니??
     * 
     * @param {string} nodeId - ?�???�드 ID
     * @param {string} connectorType - ?�결???�??('input' | 'output')
     * @param {string} outputType - 출력 ?�??(?�택?�항)
     */
    completeConnection(nodeId, connectorType, outputType = 'default') {
        try {
            if (!this.isConnecting || !this.connectionStart) {
                logWarn('?�결 모드가 ?�성?�되지 ?�았?�니??');
                return;
            }
            
            const startNodeId = this.connectionStart.nodeId;
            const startConnectorType = this.connectionStart.connectorType;
            const startOutputType = this.connectionStart.outputType;
            
            // ?�결 ?�효??검??            if (!this.validateConnection(startNodeId, nodeId, startConnectorType, connectorType)) {
                this.cancelConnection();
                return;
            }
            
            // ?�결 ?�성
            this.createNodeConnection(startNodeId, nodeId, startOutputType, outputType);
            
            // ?�결 모드 종료
            this.finishConnection();
            
            log(`?�결 ?�료: ${startNodeId} ??${nodeId}`);
            
        } catch (error) {
            logError('?�결 ?�료 ?�패:', error);
            this.cancelConnection();
        }
    }
    
    /**
     * ?�결 취소
     * ESC ?�나 캔버???�릭 ???�결 모드�?취소?�니??
     */
    cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        
        // ?�결 모드 UI 비활?�화
        this.deactivateConnectionMode();
        
        // 모든 ?�이?�이???�거
        this.clearAllHighlights();
        
        log('?�결 모드 취소??);
    }
    
    /**
     * ?�결 ?�료 처리
     * ?�결???�공?�으�??�료?????�리 ?�업???�행?�니??
     */
    finishConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        
        // ?�결 모드 UI 비활?�화
        this.deactivateConnectionMode();
        
        // 모든 ?�이?�이???�거
        this.clearAllHighlights();
    }
    
    /**
     * ?�결 ?�효??검??     * ?�결???�효?��? 검?�합?�다.
     * 
     * @param {string} fromNodeId - ?�작 ?�드 ID
     * @param {string} toNodeId - ?�???�드 ID
     * @param {string} fromType - ?�작 ?�결???�??     * @param {string} toType - ?�???�결???�??     * @returns {boolean} ?�결 ?�효??     */
    validateConnection(fromNodeId, toNodeId, fromType, toType) {
        // ?�기 ?�신과의 ?�결 방�?
        if (fromNodeId === toNodeId) {
            logWarn('?�기 ?�신과는 ?�결?????�습?�다.');
            return false;
        }
        
        // 출력 ???�력 ?�는 ?�력 ??출력 ?�결 ?�용
        if (!((fromType === 'output' && toType === 'input') || (fromType === 'input' && toType === 'output'))) {
            logWarn('출력 ???�력 ?�는 ?�력 ??출력 ?�결�?가?�합?�다.');
            return false;
        }
        
        // 중복 ?�결 방�? (같�? ?�력???�러 ?�결 방�?)
        if (this.hasExistingConnection(toNodeId, 'input')) {
            logWarn('?��? ?�결???�력 ?�결?�입?�다.');
            return false;
        }
        
        return true;
    }
    
    /**
     * 기존 ?�결 ?�인
     * @param {string} nodeId - ?�드 ID
     * @param {string} connectorType - ?�결???�??     * @returns {boolean} 기존 ?�결 존재 ?��?
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
     * ?�드 ?�결 ?�성
     * @param {string} fromNodeId - ?�작 ?�드 ID
     * @param {string} toNodeId - ?�???�드 ID
     * @param {string} fromOutputType - ?�작 출력 ?�??     * @param {string} toOutputType - ?�??출력 ?�??     */
    createNodeConnection(fromNodeId, toNodeId, fromOutputType, toOutputType) {
        // ?�결 관리자가 ?�으�?초기???�도
        if (!this.connectionManager) {
            if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                // ?�역 변?�로 ?�정
                if (window.setConnectionManager) {
                    window.setConnectionManager(this.connectionManager);
                }
                log('?�결 관리자 지??초기???�료');
            } else {
                logWarn('?�결 관리자가 초기?�되지 ?�았?�니??');
                return;
            }
        }
        
        try {
            // ?�결 ?�이???�성
            const connectionData = {
                from: fromNodeId,
                to: toNodeId,
                fromOutputType: fromOutputType,
                toOutputType: toOutputType,
                createdAt: new Date().toISOString()
            };
            
            // ?�결 ?�성
            this.connectionManager.createConnection(fromNodeId, toNodeId);
            
            log('?�드 ?�결 ?�성 ?�료:', connectionData);
            
            // ?�결???�각???�태 ?�데?�트
            setTimeout(() => {
                this.updateAllConnectorsVisualState();
            }, 100);
            
        } catch (error) {
            logError('?�드 ?�결 ?�성 ?�패:', error);
        }
    }
    
    // ==========================================
    // ?�결 모드 UI 관??메서?�들
    // ==========================================
    
    /**
     * ?�결 모드 UI ?�성??     * ?�결 모드????캔버?��? ?�결?�들???��??�을 변경합?�다.
     */
    activateConnectionMode() {
        // 캔버?�에 ?�결 모드 ?�래??추�?
        this.canvas.classList.add('connection-mode');
        
        // 모든 ?�력 ?�결?�을 ?�성??        this.activateInputConnectors();
        
        // ?�결 모드 ?�내 메시지 ?�시
        this.showConnectionModeMessage();
    }
    
    /**
     * ?�결 모드 UI 비활?�화
     * ?�결 모드가 ?�날 ??UI�??�래 ?�태�?복원?�니??
     */
    deactivateConnectionMode() {
        // 캔버?�에???�결 모드 ?�래???�거
        this.canvas.classList.remove('connection-mode');
        
        // 모든 ?�결??비활?�화
        this.deactivateAllConnectors();
        
        // ?�결 모드 ?�내 메시지 ?�기�?        this.hideConnectionModeMessage();
    }
    
    /**
     * ?�력 ?�결???�성??     * ?�결 가?�한 ?�력 ?�결?�들???�이?�이?�합?�다.
     */
    activateInputConnectors() {
        const inputConnectors = this.canvas.querySelectorAll('.node-input');
        inputConnectors.forEach(connector => {
            connector.classList.add('connection-active');
        });
    }
    
    /**
     * ?�결 가?�한 출력 ?�결?�들???�이?�이?�합?�다.
     */
    activateOutputConnectors() {
        const outputConnectors = this.canvas.querySelectorAll('.node-output');
        outputConnectors.forEach(connector => {
            connector.classList.add('connection-active');
        });
    }
    
    /**
     * 모든 ?�결??비활?�화
     * 모든 ?�결?�의 ?�성 ?�태�??�거?�니??
     */
    deactivateAllConnectors() {
        const allConnectors = this.canvas.querySelectorAll('.node-input, .node-output');
        allConnectors.forEach(connector => {
            connector.classList.remove('connection-active', 'connection-highlight');
        });
    }
    
    /**
     * ?�결 ?�작???�이?�이??     * @param {string} nodeId - ?�드 ID
     * @param {string} connectorType - ?�결???�??     * @param {string} outputType - 출력 ?�??     */
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
     * 모든 ?�이?�이???�거
     * 모든 ?�결?�의 ?�이?�이?��? ?�거?�니??
     */
    clearAllHighlights() {
        const highlightedConnectors = this.canvas.querySelectorAll('.connection-highlight');
        highlightedConnectors.forEach(connector => {
            connector.classList.remove('connection-highlight');
        });
    }
    
    /**
     * ?�결 모드 ?�내 메시지 ?�시
     */
    showConnectionModeMessage() {
        let message = document.getElementById('connection-mode-message');
        if (!message) {
            message = document.createElement('div');
            message.id = 'connection-mode-message';
            message.className = 'connection-mode-message';
            message.innerHTML = `
                <div class="message-content">
                    <span class="message-icon">?��</span>
                    <span class="message-text">?�결???�력 ?�결?�을 ?�릭?�세??/span>
                    <span class="message-hint">ESC ?�로 취소</span>
                </div>
            `;
            document.body.appendChild(message);
        }
        
        message.classList.add('show');
    }
    
    /**
     * ?�결 모드 ?�내 메시지 ?�기�?     */
    hideConnectionModeMessage() {
        const message = document.getElementById('connection-mode-message');
        if (message) {
            message.classList.remove('show');
        }
    }
    
    /**
     * ?�결???�팁 ?�시
     * @param {HTMLElement} connector - ?�결???�소
     * @param {string} text - ?�팁 ?�스??     */
    showConnectorTooltip(connector, text) {
        let tooltip = document.getElementById('connector-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'connector-tooltip';
            tooltip.className = 'connector-tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        
        // ?�치 계산
        const rect = connector.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.top - 30 + 'px';
        
        tooltip.classList.add('show');
    }
    
    /**
     * ?�결???�팁 ?�기�?     */
    hideConnectorTooltip() {
        const tooltip = document.getElementById('connector-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }
    
    /**
     * ?�결???�보 ?�시
     * @param {string} nodeId - ?�드 ID
     * @param {string} connectorType - ?�결???�??     */
    showConnectionInfo(nodeId, connectorType) {
        const node = document.getElementById(nodeId);
        if (!node) return;
        
        const nodeTitle = node.querySelector('.node-title');
        const title = nodeTitle ? nodeTitle.textContent : nodeId;
        
        log(`?�결???�보: ${title} (${connectorType})`);
        
        // ?�결???�드???�시
        if (this.connectionManager && this.connectionManager.connections) {
            const connections = Array.from(this.connectionManager.connections.values());
            const relatedConnections = connections.filter(conn => 
                conn.from === nodeId || conn.to === nodeId
            );
            
            if (relatedConnections.length > 0) {
                log('?�결???�드??', relatedConnections);
            }
        }
    }

    /**
     * HTML ?�스케?�프 처리
     * @param {string} text - ?�스케?�프???�스??     * @returns {string} ?�스케?�프???�스??     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * ?�드�?캔버?�에 추�?
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    addNodeToCanvas(nodeElement) {
        const canvasContent = document.getElementById('canvas-content');
        if (canvasContent) {
            canvasContent.appendChild(nodeElement);
            log(`?�드 ${nodeElement.dataset.nodeId}�?canvas-content??추�? ?�료`);
        } else {
            this.canvas.appendChild(nodeElement);
            log(`?�드 ${nodeElement.dataset.nodeId}�?캔버?�에 직접 추�? ?�료 (canvas-content ?�음)`);
        }
        
        
    }
    
    /**
     * ?�드 ?�이???�??     * @param {Object} nodeData - ?�드 ?�이??     */
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
     * ?�결 관리자???�드 ?�록 (지??초기??
     * @param {HTMLElement} nodeElement - ?�드 ?�소
     */
    registerNodeWithConnectionManager(nodeElement) {
        setTimeout(() => {
            if (this.connectionManager) {
                this.connectionManager.bindNodeConnector(nodeElement);
            } else if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                // ?�역 변?�로 ?�정
                if (window.setConnectionManager) {
                    window.setConnectionManager(this.connectionManager);
                }
                this.connectionManager.bindNodeConnector(nodeElement);
            }
        }, 50);
    }
    
    /**
     * ?�드 ??��
     * ?�택???�드�?캔버?��? ?�이?�에???�거?�니??
     */
    deleteNode(node) {
        const nodeId = node.dataset.nodeId;
        // ?�작/종료 ?�드????�� 불�?
        if (nodeId === 'start' || nodeId === 'end') {
            logWarn('?�작/종료 ?�드????��?????�습?�다.');
            return;
        }
        
        // DOM?�서 ?�드 ?�거
        node.remove();
        
        // ?�이?�에???�드 ?�거
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        delete this.nodeData[nodeId];
        
        
        
        // ?�결???�거
        if (this.connectionManager) {
            this.connectionManager.removeNodeConnections(nodeId);
        } else {
            // ?�결??매니?�가 ?�으�?초기???�도
            logWarn('?�결??매니?�가 ?�어???�결???�거�?건너?�니??');
            if (window.ConnectionManager) {
                this.connectionManager = new window.ConnectionManager(this.canvas);
                if (window.setConnectionManager) {
                    window.setConnectionManager(this.connectionManager);
                }
                log('?�결??매니?� 지??초기???�료');
            }
        }
        
        // ?�택 ?�제
        if (this.selectedNode === node) {
            this.selectedNode = null;
        }
        
        log('?�드 ??��??', nodeId);
    }
    
    /**
     * ?�드 ?�니메이??(?�성 ??
     * ?�로 ?�성???�드???�이?�인 ?�니메이?�을 ?�용?�니??
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
     * 모든 ?�드 ?�이??반환
     * ?�재 ?�성??모든 ?�드???�보�?반환?�니??
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
     * 모든 ?�결???�이??반환
     * ?�재 ?�성??모든 ?�결?�의 ?�보�?반환?�니??
     */
    getAllConnections() {
        if (this.connectionManager) {
            return this.connectionManager.getConnections();
        }
        return [];
    }
    
    /**
     * 롱터�??�작
     * ?�결?�을 롱터치하???�결??그리�?모드�??�작?�니??
     */
    startLongTouch(e, connector, nodeElement, connectorType) {
        log(`롱터�??�작: ${connectorType} ?�결??, {
            connector: connector,
            nodeElement: nodeElement,
            delay: this.longTouchDelay
        });
        
        // 기존 ?�?�머가 ?�으�?취소
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
            log('기존 롱터�??�?�머 취소??);
        }
        
        // 롱터�??�?�머 ?�작
        this.longTouchTimer = setTimeout(() => {
            log('롱터�??�?�머 ?�료 - ?�결??그리�?모드 ?�성??);
            this.activateConnectionDrawingMode(e, connector, nodeElement, connectorType);
        }, this.longTouchDelay);
        
        log(`롱터�??�?�머 ?�작??(${this.longTouchDelay}ms ???�성??`);
    }
    
    /**
     * 롱터�?취소
     * 롱터치�? 취소?�고 ?�결??그리�?모드�?비활?�화?�니??
     */
    cancelLongTouch() {
        log('롱터�?취소 ?�도', {
            hasTimer: !!this.longTouchTimer,
            isDrawing: this.isDrawingConnection
        });
        
        if (this.longTouchTimer) {
            clearTimeout(this.longTouchTimer);
            this.longTouchTimer = null;
            log('롱터�??�?�머 취소??);
        }
        
        if (this.isDrawingConnection) {
            log('?�결??그리�?모드 비활?�화 �?..');
            this.deactivateConnectionDrawingMode();
        }
    }
    
    /**
     * ?�결??그리�?모드 ?�성??     * 롱터치�? ?�료?�면 ?�결??그리�?모드�??�작?�니??
     */
    activateConnectionDrawingMode(e, connector, nodeElement, connectorType) {
        log(`?�결??그리�?모드 ?�성?? ${connectorType}`);
        
        this.isDrawingConnection = true;
        this.connectionStartConnector = connector;
        this.connectionStartPoint = {
            x: e.clientX,
            y: e.clientY,
            nodeId: nodeElement.dataset.nodeId,
            connectorType: connectorType
        };
        
        // ?�결???�이?�이??        connector.style.backgroundColor = '#FF6B35';
        connector.style.borderColor = '#FF6B35';
        connector.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.8)';
        
        // 캔버?�에 마우???�벤??추�?
        this.canvas.addEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.addEventListener('mouseup', this.handleConnectionComplete);
        
        // ?�결??그리�?메시지 ?�시
        this.showConnectionDrawingMessage(connectorType);
        
        log('?�결??그리�?모드 ?�성???�료');
    }
    
    /**
     * ?�결??그리�?모드 비활?�화
     * ?�결??그리기�? 취소?�고 모드�?비활?�화?�니??
     */
    deactivateConnectionDrawingMode() {
        log('?�결??그리�?모드 비활?�화');
        
        this.isDrawingConnection = false;
        this.connectionStartPoint = null;
        this.connectionStartConnector = null;
        
        // ?�결???�이?�이???�거
        if (this.connectionStartConnector) {
            this.updateConnectorVisualState(this.connectionStartConnector, false);
        }
        
        // 캔버???�벤???�거
        this.canvas.removeEventListener('mousemove', this.handleConnectionDrawing);
        this.canvas.removeEventListener('mouseup', this.handleConnectionComplete);
        
        // ?�결??그리�?메시지 ?�기�?        this.hideConnectionDrawingMessage();
        
        // ?�시 ?�결???�거
        if (this.connectionManager) {
            this.connectionManager.removeTempConnection();
        }
        
        // 모든 ?�결???�이?�이???�거
        this.clearAllConnectorHighlights();
        
        log('?�결??그리�?모드 비활?�화 ?�료');
    }
    
    /**
     * ?�결??그리�?처리
     * 마우???�동 ???�결?�을 그리�?마그?�틱 기능??처리?�니??
     */
    handleConnectionDrawing = (e) => {
        if (!this.isDrawingConnection || !this.connectionStartPoint) return;
        
        // ?�시 ?�결??그리�?(connectionManager???�임)
        if (this.connectionManager) {
            this.connectionManager.updateTempConnection(
                this.connectionStartPoint.x,
                this.connectionStartPoint.y,
                e.clientX,
                e.clientY
            );
        }
        
        // 마그?�틱 기능: 가까운 ?�결??찾기
        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);
        if (nearbyConnector) {
            this.highlightConnector(nearbyConnector);
        } else {
            this.clearAllConnectorHighlights();
        }
    }
    
    /**
     * ?�결???�료 처리
     * 마우???????�결???�료?�거??취소?�니??
     */
    handleConnectionComplete = (e) => {
        if (!this.isDrawingConnection || !this.connectionStartPoint) return;
        
        // 가까운 ?�결??찾기
        const nearbyConnector = this.findNearbyConnector(e.clientX, e.clientY);
        
        if (nearbyConnector) {
            // ?�결 ?�료
            this.completeConnectionToConnector(nearbyConnector);
        } else {
            // ?�결 취소
            this.deactivateConnectionDrawingMode();
        }
    }
    
    /**
     * 가까운 ?�결??찾기 (마그?�틱 기능)
     * 마우???�치?�서 가까운 ?�결?�을 찾습?�다.
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
     * ?�결???�이?�이??     * ?�결?�을 ?�이?�이?�하??마그?�틱 ?�과�??�시?�니??
     */
    highlightConnector(connector) {
        // 기존 ?�이?�이???�거
        this.clearAllConnectorHighlights();
        
        // ???�결???�이?�이??        connector.style.backgroundColor = '#34C759';
        connector.style.borderColor = '#34C759';
        connector.style.boxShadow = '0 0 15px rgba(52, 199, 89, 0.8)';
        connector.style.transform = 'scale(1.2)';
        connector.classList.add('magnetic-highlight');
    }
    
    /**
     * 모든 ?�결???�이?�이???�거
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
     * ?�결?�으�??�결 ?�료
     * 찾�? ?�결?�으�??�결???�료?�니??
     */
    completeConnectionToConnector(targetConnector) {
        if (!this.connectionStartPoint || !targetConnector) return;
        
        const targetNode = targetConnector.closest('.workflow-node');
        if (!targetNode) return;
        
        const targetNodeId = targetNode.dataset.nodeId;
        const targetConnectorType = targetConnector.classList.contains('node-input') ? 'input' : 'output';
        
        log(`?�결 ?�료: ${this.connectionStartPoint.nodeId}(${this.connectionStartPoint.connectorType}) ??${targetNodeId}(${targetConnectorType})`);
        
        // ?�결 ?�성
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
        
        // ?�결??그리�?모드 비활?�화
        this.deactivateConnectionDrawingMode();
    }
    
    /**
     * ?�결??그리�?메시지 ?�시
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
        message.textContent = `${connectorType === 'output' ? '출력' : '?�력'} ?�결?�에???�결?�을 그리??�?.. ?�른 ?�결?�에 ?�으?�요.`;
        
        document.body.appendChild(message);
    }
    
    /**
     * ?�결??그리�?메시지 ?�기�?     */
    hideConnectionDrawingMessage() {
        const message = document.getElementById('connection-drawing-message');
        if (message) {
            message.remove();
        }
    }
}

// ?�역?�로 ?�용?????�도�?export
window.NodeManager = NodeManager;

// ?�이지 로드 ?�료 ???�드 매니?� ?�스?�스 ?�성
document.addEventListener('DOMContentLoaded', () => {
    log('DOM 로드 ?�료 - ?�드 매니?� ?�스?�스 ?�성');
window.nodeManager = new NodeManager();
    log('?�드 매니?� ?�스?�스 ?�성 ?�료:', window.nodeManager);
});

// ==== ?�드 ?�???��??�트�?(?�적) ====
// �??�드 ?�?�별�??�플�?기능???�록?�는 ?�도
NodeManager.nodeTypeDefinitions = {};

/**
 * ?�적 ?�???�록 ?�수
 * @param {string} type - ?�드 ?�??(?? 'action', 'condition', 'loop')
 * @param {Object} definition - ?�???�의 객체
 * @param {Function} definition.renderContent - ?�드 innerHTML???�성?�는 ?�수
 */
NodeManager.registerNodeType = function (type, definition) {
    if (!NodeManager.nodeTypeDefinitions) {
        NodeManager.nodeTypeDefinitions = {};
    }
    NodeManager.nodeTypeDefinitions[type] = definition;
};
