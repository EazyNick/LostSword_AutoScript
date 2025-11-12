/**
 * 워크플로우 페이지 메인 컨트롤러 클래스
 * ES6 모듈 방식으로 작성됨
 * 
 * 이 클래스는 워크플로우 편집 페이지의 전체적인 흐름을 관리합니다.
 * 주요 기능:
 * - 헤더 버튼 이벤트 처리 (저장, 노드 추가, 실행)
 * - 컴포넌트 간 통신 및 통합
 * - 워크플로우 데이터 관리
 * - 초기 노드 생성 및 설정
 * - 키보드 단축키 처리
 */

// ES6 모듈 import - 명시적 의존성 관리
import { getSidebarInstance } from '../../js/components/sidebar.js';
import { ConnectionManager, setConnectionManager } from '../../js/components/connection.js';
import { getModalManagerInstance } from '../../js/utils/modal.js';
import { NodeAPI } from '../../js/api/nodeapi.js';

/**
 * 의존성 관리 헬퍼 함수들
 * 
 * 주의: 다른 컴포넌트들이 아직 ES6 모듈로 전환되지 않아서
 * 전역 변수(window)에 의존해야 합니다.
 * 
 * 향후 각 컴포넌트가 ES6 모듈로 전환되면:
 * - import로 변경
 * - 의존성 주입 패턴 사용
 * - 또는 이벤트 기반 통신으로 전환
 */

/**
 * 전역 의존성 추상화
 * 아직 ES6 모듈로 전환되지 않은 컴포넌트들을 위한 추상화 레이어
 * 
 * 주의: 브라우저 전용 애플리케이션이므로 window는 항상 존재합니다.
 */
const GlobalDependencies = {
    /**
     * NodeManager 가져오기
     * TODO: NodeManager ES6 모듈 전환 시 import로 변경
     */
    getNodeManager: () => {
        return window.nodeManager || null;
    },
    
    /**
     * ConnectionManager 인스턴스 가져오기
     * TODO: ConnectionManager 인스턴스 관리 개선
     */
    getConnectionManagerInstance: () => {
        return window.connectionManager || null;
    }
};

/**
 * 편의 함수들
 * ES6 모듈로 전환된 것은 import 사용, 아직 전환되지 않은 것은 전역 fallback 사용
 */
const getNodeManager = () => GlobalDependencies.getNodeManager();
const getSidebarManager = () => getSidebarInstance();
const getModalManager = () => getModalManagerInstance();
const getNodeAPI = () => NodeAPI;
const getConnectionManager = () => ConnectionManager;

/**
 * WorkflowPage 클래스
 * 워크플로우 편집 페이지의 전체적인 흐름을 관리합니다.
 */
export class WorkflowPage {
    constructor() {
        this.init();
    }
    
    /**
     * 초기화 메서드
     * 페이지 로드 시 필요한 모든 설정을 수행합니다.
     */
    init() {
        this.setupEventListeners();
        this.setupComponentIntegration();
        this.createInitialNodes();
    }
    
    /**
     * 이벤트 리스너 설정
     * 헤더 버튼들과 컴포넌트 이벤트를 처리합니다.
     */
    setupEventListeners() {
        // === 헤더 버튼 이벤트 ===
        
        // 저장 버튼
        document.querySelector('.save-btn').addEventListener('click', () => {
            this.saveWorkflow();
        });
        
        // 노드 추가 버튼
        document.querySelector('.add-node-btn').addEventListener('click', () => {
            this.showAddNodeModal();
        });
        
        // 실행 버튼
        document.querySelector('.run-btn').addEventListener('click', () => {
            this.runWorkflow();
        });
        
        // === 페이지 이벤트 ===
        
        // 페이지를 떠날 때 자동 저장
        window.addEventListener('beforeunload', () => {
            this.autoSaveCurrentWorkflow();
        });
        
        // 페이지 숨김 시 자동 저장 (모바일/탭 전환 시)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.autoSaveCurrentWorkflow();
            }
        });
        
        // 컴포넌트 이벤트 리스너 설정
        this.setupComponentEventListeners();
    }
    
    /**
     * 컴포넌트 이벤트 리스너 설정
     * 다른 컴포넌트들에서 발생하는 이벤트를 처리합니다.
     */
    setupComponentEventListeners() {
        // 스크립트 변경 이벤트 (사이드바에서 스크립트 선택 시)
        document.addEventListener('scriptChanged', (e) => {
            this.onScriptChanged(e);
        });
        
        // 노드 선택 이벤트 (노드 매니저에서 노드 선택 시)
        document.addEventListener('nodeSelected', (e) => {});
        
        // 노드 선택 해제 이벤트
        document.addEventListener('nodeDeselected', () => {});
    }
    
    /**
     * 컴포넌트 통합 설정
     * 각 컴포넌트들이 서로 연동될 수 있도록 설정합니다.
     */
    setupComponentIntegration() {
        // 컴포넌트들이 로드된 후 초기화
        setTimeout(() => {
            const nodeManager = getNodeManager();
            const sidebarManager = getSidebarManager();
            
            if (nodeManager) {}
            
            if (sidebarManager) {
                // 초기 로드시 현재 스크립트의 워크플로우를 로드하고,
                // 저장된 상태가 없다면 시작/종료 기본 노드를 생성
                const current = sidebarManager.getCurrentScript();
                if (current) {
                    this.loadScriptData(current);
                }
            }
        }, 100);
    }
    
    /**
     * 초기 노드 생성
     * 페이지 로드 시 기본 노드들을 생성합니다.
     */
    createInitialNodes() {
        // 컴포넌트들이 로드된 후 초기 노드 생성
        const initNodes = () => {
            const nodeManager = getNodeManager();
            const ConnectionManager = getConnectionManager();
            
            if (nodeManager && nodeManager.canvas) {
                // 연결 관리자 확인 및 초기화
                if (!nodeManager.connectionManager && ConnectionManager) {
                    nodeManager.connectionManager = new ConnectionManager(nodeManager.canvas);
                }
                
                // 초기 진입 시에는 저장된 스크립트 상태를 우선 로드하므로 여기서는 별도 생성하지 않음
            } else {
                setTimeout(initNodes, 100);
            }
        };
        
        // 즉시 실행
        initNodes();
    }
    
    /**
     * 기본 시작/종료 노드 생성
     * 페이지 로드 시 워크플로우 경계 노드를 생성합니다.
     */
    createDefaultBoundaryNodes() {
        const baseX = 50000; // 무한 캔버스 기준점
        const baseY = 50000; // 무한 캔버스 기준점
        
        const boundaryNodes = [
            {
                id: 'start',
                type: 'start',
                title: '시작',
                color: 'blue',
                x: baseX - 200,
                y: baseY - 100
            },
            {
                id: 'end',
                type: 'end',
                title: '종료',
                color: 'orange',
                x: baseX + 200,
                y: baseY - 100
            }
        ];
        
        const nodeManager = getNodeManager();
        
        boundaryNodes.forEach(nodeData => {
            try {
                if (nodeManager) {
                    nodeManager.createNode(nodeData);
                }
            } catch (error) {
                console.error('노드 생성 실패:', error);
            }
        });
        
        // 연결선 매니저가 초기화되면 위치 업데이트만 수행
        setTimeout(() => {
            if (nodeManager && nodeManager.connectionManager) {
                nodeManager.connectionManager.updateAllConnections();
            }
        }, 300);
    }
    
    /**
     * 노드 추가 모달 표시
     * 새 노드를 추가하기 위한 모달 창을 표시합니다.
     */
    showAddNodeModal() {
        const modalManager = getModalManager();
        if (!modalManager) {
            console.error('ModalManager를 사용할 수 없습니다.');
            return;
        }
        
        const content = `
            <h3>노드 추가</h3>
            <div class="form-group">
                <label for="node-type">노드 타입:</label>
                <select id="node-type">
                    <option value="action">액션 노드</option>
                    <option value="condition">조건 노드</option>
                    <option value="loop">반복 노드</option>
                    <option value="wait">대기 노드</option>
                </select>
            </div>
            <div class="form-group">
                <label for="node-title">노드 제목:</label>
                <input type="text" id="node-title" placeholder="노드 제목을 입력하세요">
            </div>
            <div class="form-group">
                <label for="node-color">노드 색상:</label>
                <select id="node-color">
                    <option value="blue">파란색</option>
                    <option value="orange">주황색</option>
                    <option value="green">초록색</option>
                    <option value="purple">보라색</option>
                </select>
            </div>
            <div class="form-actions">
                <button id="add-node-confirm" class="btn btn-primary">추가</button>
                <button id="add-node-cancel" class="btn btn-secondary">취소</button>
            </div>
        `;
        
        modalManager.show(content);
        
        // 이벤트 리스너 추가
        document.getElementById('add-node-confirm').addEventListener('click', () => {
            this.addNode();
        });
        
        document.getElementById('add-node-cancel').addEventListener('click', () => {
            modalManager.close();
        });
    }
    
    /**
     * 노드 추가 처리
     * 모달에서 입력된 정보로 새 노드를 생성합니다.
     */
    addNode() {
        const nodeType = document.getElementById('node-type').value;
        const nodeTitle = document.getElementById('node-title').value || `${nodeType} 노드`;
        const nodeColor = document.getElementById('node-color').value;
        
        const nodeData = {
            id: `node_${Date.now()}`,
            type: nodeType,
            title: nodeTitle,
            color: nodeColor,
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100
        };
        
        const nodeManager = getNodeManager();
        if (nodeManager) {
            nodeManager.createNode(nodeData);
        }
        
        const modalManager = getModalManager();
        if (modalManager) {
            modalManager.close();
        }
    }
    
    /**
     * 워크플로우 저장
     * 현재 워크플로우 상태를 백엔드 API에 저장합니다.
     */
    async saveWorkflow() {
        const sidebarManager = getSidebarManager();
        const currentScript = sidebarManager ? sidebarManager.getCurrentScript() : null;
        
        const modalManager = getModalManager();
        
        if (!currentScript || !currentScript.id) {
            if (modalManager) {
                modalManager.showAlert('저장 실패', '저장할 스크립트가 선택되지 않았습니다.');
            }
            return;
        }
        
        try {
            const nodeManager = getNodeManager();
            // 현재 노드와 연결선 정보 가져오기
            const nodes = nodeManager ? nodeManager.getAllNodes() : [];
            const connections = nodeManager ? nodeManager.getAllConnections() : [];
            
            // NodeManager 형식을 API 형식으로 변환
            const nodesForAPI = nodes.map(node => ({
                id: node.id,
                type: node.type,
                position: {
                    x: node.x,
                    y: node.y
                },
                data: {
                    title: node.title,
                    color: node.color,
                    ...node
                }
            }));
            
            // 연결 형식 변환
            const connectionsForAPI = connections.map(conn => ({
                from: conn.from || conn.fromNodeId,
                to: conn.to || conn.toNodeId
            }));
            
            // 백엔드 API에 저장
            const nodeAPI = getNodeAPI();
            if (nodeAPI) {
                await nodeAPI.updateNodesBatch(currentScript.id, nodesForAPI, connectionsForAPI);
                
                if (modalManager) {
                    modalManager.showAlert('저장 완료', '워크플로우가 성공적으로 저장되었습니다.');
                }
                console.log('워크플로우 저장 완료:', {
                    scriptId: currentScript.id,
                    nodeCount: nodes.length,
                    connectionCount: connections.length
                });
            } else {
                // API를 사용할 수 없는 경우 로컬 스토리지에 저장 (fallback)
                this.saveWorkflowToLocalStorage();
            }
        } catch (error) {
            console.error('워크플로우 저장 실패:', error);
            if (modalManager) {
                modalManager.showAlert('저장 실패', `저장 중 오류가 발생했습니다: ${error.message}`);
            }
        }
    }
    
    /**
     * 로컬 스토리지에 저장 (fallback)
     */
    saveWorkflowToLocalStorage() {
        const viewportPosition = this.getCurrentViewportPosition();
        const sidebarManager = getSidebarManager();
        const nodeManager = getNodeManager();
        
        const workflowData = {
            script: sidebarManager ? sidebarManager.getCurrentScript() : null,
            nodes: nodeManager ? nodeManager.getAllNodes() : [],
            connections: nodeManager ? nodeManager.getAllConnections() : [],
            viewport: viewportPosition,
            timestamp: new Date().toISOString()
        };
        
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = workflowData.script ? workflowData.script.id : 'default';
        
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
        } else {
            savedWorkflows.push(workflowData);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        console.log('로컬 스토리지에 저장됨 (fallback):', workflowData);
    }
    
    /**
     * 현재 캔버스 뷰포트 위치 가져오기
     * Transform 기반 패닝과 스크롤 기반 패닝 모두 지원
     */
    getCurrentViewportPosition() {
        const canvasContent = document.getElementById('canvas-content');
        
        if (canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const transform = canvasContent.style.transform || 'translate(-50000px, -50000px) scale(1)';
            
            // Transform 파싱
            let x = -50000, y = -50000, scale = 1;
            
            const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (translateMatch) {
                x = parseFloat(translateMatch[1]) || -50000;
                y = parseFloat(translateMatch[2]) || -50000;
            }
            
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                scale = parseFloat(scaleMatch[1]) || 1;
            }
            
            return { x, y, scale, mode: 'transform' };
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                const x = canvas.scrollLeft || 0;
                const y = canvas.scrollTop || 0;
                
                return { x, y, scale: 1, mode: 'scroll' };
            }
        }
        
        // 기본값 반환
        return { x: -50000, y: -50000, scale: 1, mode: 'transform' };
    }
    
    /**
     * 캔버스 뷰포트 위치 복원
     * 저장된 뷰포트 위치로 캔버스를 이동시킵니다.
     */
    restoreViewportPosition(viewportData) {
        if (!viewportData) {
            return;
        }
        
        const canvasContent = document.getElementById('canvas-content');
        
        if (viewportData.mode === 'transform' && canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const { x, y, scale } = viewportData;
            canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        } else if (viewportData.mode === 'scroll') {
            // 스크롤 기반 패닝 (전통적 방식)
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                canvas.scrollLeft = viewportData.x || 0;
                canvas.scrollTop = viewportData.y || 0;
            }
        }
    }
    
    /**
     * 워크플로우 실행
     * 현재 워크플로우를 실행합니다. (현재는 시뮬레이션 모드)
     */
    async runWorkflow() {
        const modalManager = getModalManager();
        const nodes = document.querySelectorAll('.workflow-node');
        if (nodes.length === 0) {
            if (modalManager) {
                modalManager.showAlert('실행 불가', '실행할 노드가 없습니다.');
            }
            return;
        }
        
        // 노드 데이터를 FastAPI 형식으로 변환
        const workflowData = this.prepareWorkflowData(nodes);
        
        try {
            // UI 테스트를 위해 서버 호출 비활성화
            
            // 시뮬레이션된 실행 결과
            const result = { success: true, data: { message: '워크플로우 실행 완료' } };
            
            if (result.success) {
                // 실행 애니메이션
                this.animateWorkflowExecution(nodes);
                if (modalManager) {
                    modalManager.showAlert('실행 완료', '워크플로우가 성공적으로 실행되었습니다.');
                }
            } else {
                if (modalManager) {
                    modalManager.showAlert('실행 실패', result.error || '워크플로우 실행 중 오류가 발생했습니다.');
                }
            }
        } catch (error) {
            console.error('워크플로우 실행 오류:', error);
            if (modalManager) {
                modalManager.showAlert('실행 오류', '워크플로우 실행 중 오류가 발생했습니다.');
            }
        }
    }
    
    /**
     * 워크플로우 데이터 준비
     * DOM 노드들을 서버에서 처리할 수 있는 형식으로 변환합니다.
     */
    prepareWorkflowData(nodes) {
        // 연결을 따라 실행 순서를 계산 (start → ... → end)
        const nodeList = Array.from(nodes);
        const byId = new Map(nodeList.map(n => [n.id || n.dataset.nodeId, n]));
        
        let ordered = [];
        const nodeManager = getNodeManager();
        const connections = (nodeManager && nodeManager.connectionManager)
            ? nodeManager.connectionManager.getConnections()
            : [];
        if (byId.has('start') && connections && connections.length > 0) {
            const nextMap = new Map();
            connections.forEach(c => {
                nextMap.set(c.from, c.to);
            });
            // start에서 출발해 직선 경로를 따라가며 수집 (분기 없음 가정)
            const visited = new Set();
            let cur = 'start';
            while (nextMap.has(cur) && !visited.has(cur)) {
                visited.add(cur);
                const to = nextMap.get(cur);
                if (byId.has(to)) {
                    ordered.push(byId.get(to));
                }
                cur = to;
                if (cur === 'end') break;
            }
        }
        
        // 연결 경로를 찾지 못한 경우 좌→우 정렬로 대체
        if (ordered.length === 0) {
            ordered = nodeList.sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));
        }
        
        // 시작/종료 노드는 실행 대상에서 제외
        const executableNodes = ordered.filter(node => {
            const id = node.id || node.dataset.nodeId;
            const title = node.querySelector('.node-title')?.textContent || '';
            return id !== 'start' && id !== 'end' && !title.includes('시작') && !title.includes('종료');
        });
        
        return {
            nodes: executableNodes.map(node => ({
                id: node.id,
                type: this.getNodeType(node),
                data: this.getNodeData(node)
            })),
            execution_mode: 'sequential'
        };
    }
    
    /**
     * 노드 타입 결정
     * 노드의 제목을 기반으로 노드 타입을 결정합니다.
     */
    getNodeType(node) {
        // 경계 노드 우선 처리
        const nodeId = node.id || node.dataset.nodeId;
        if (nodeId === 'start') return 'start';
        if (nodeId === 'end') return 'end';
        
        const title = node.querySelector('.node-title').textContent;
        
        // 노드 제목에 따라 타입 결정
        if (title.includes('페이지 이동') || title.includes('이동')) return 'navigate';
        if (title.includes('입력') || title.includes('클릭')) return 'click';
        if (title.includes('확인') || title.includes('조건')) return 'condition';
        if (title.includes('수집')) return 'collect';
        if (title.includes('전투')) return 'battle';
        if (title.includes('이동')) return 'move';
        if (title.includes('대기')) return 'wait';
        
        return 'action'; // 기본값
    }
    
    /**
     * 노드 데이터 추출
     * 노드에서 실행에 필요한 데이터를 추출합니다.
     */
    getNodeData(node) {
        const title = node.querySelector('.node-title').textContent;
        
        // 노드 타입에 따른 기본 데이터
        const baseData = {
            title: title,
            timestamp: new Date().toISOString()
        };
        
        // 노드 타입별 특화 데이터
        if (title.includes('페이지 이동')) {
            return {
                ...baseData,
                destination: 'login_page',
                method: 'navigate'
            };
        } else if (title.includes('아이디 입력')) {
            return {
                ...baseData,
                x: 500,
                y: 300,
                text: 'test_user',
                method: 'input'
            };
        } else if (title.includes('로그인 성공 확인')) {
            return {
                ...baseData,
                condition: 'login_success',
                method: 'check'
            };
        }
        
        return baseData;
    }
    
    /**
     * 워크플로우 실행 애니메이션
     * 노드들이 순차적으로 실행되는 시각적 효과를 제공합니다.
     */
    animateWorkflowExecution(nodes) {
        const modalManager = getModalManager();
        
        // 모든 노드에 실행 중 클래스 추가
        nodes.forEach(node => {
            node.classList.add('executing');
        });
        
        // 연결선도 실행 상태로 변경
        this.updateConnectionStates('executing');
        
        // 순차적으로 노드 실행 애니메이션
        nodes.forEach((node, index) => {
            setTimeout(() => {
                // 실행 중 애니메이션
                node.classList.remove('executing');
                node.classList.add('completed');
                
                // 연결선 상태 업데이트
                this.updateConnectionStates('completed');
                
                // 실행 완료 애니메이션
                setTimeout(() => {
                    node.classList.remove('completed');
                    this.updateConnectionStates('normal');
                }, 1000);
            }, index * 1500);
        });
        
        // 전체 실행 완료
        setTimeout(() => {
            if (modalManager) {
                modalManager.showAlert('실행 완료', '워크플로우 실행이 완료되었습니다.');
            }
        }, nodes.length * 1500 + 1000);
    }
    
    /**
     * 연결선 상태 업데이트
     * 연결선의 시각적 상태를 변경합니다.
     */
    updateConnectionStates(state) {
        const connectionLines = document.querySelectorAll('.connection-line');
        connectionLines.forEach(line => {
            line.classList.remove('executing', 'completed', 'failed');
            if (state !== 'normal') {
                line.classList.add(state);
            }
        });
    }
    
    /**
     * 스크립트 변경 처리
     * 사이드바에서 다른 스크립트를 선택했을 때 호출됩니다.
     */
    onScriptChanged(event) {
        const { script, previousScript } = event.detail;
        
        // 스크립트가 변경되었을 때의 처리
        
        // 이전 스크립트가 있으면 먼저 저장 (노드가 삭제되기 전에)
        if (previousScript) {
            this.saveWorkflowForScript(previousScript);
            
            // 저장 완료 후 새 스크립트 로드
            setTimeout(() => {
                this.loadScriptData(script);
            }, 100);
        } else {
            // 이전 스크립트가 없으면 바로 로드
            this.loadScriptData(script);
        }
    }
    
    /**
     * 특정 스크립트의 워크플로우 저장
     * 현재 상태를 지정된 스크립트로 저장합니다.
     */
    saveWorkflowForScript(script) {
        if (!script) {
            return;
        }
        
        const nodeManager = getNodeManager();
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = nodeManager ? nodeManager.getAllNodes() : [];
        const currentConnections = nodeManager ? nodeManager.getAllConnections() : [];
        
        // 노드가 없어도 저장 (초기 상태도 보존)
        
        // 현재 캔버스 뷰포트 위치 가져오기
        const viewportPosition = this.getCurrentViewportPosition();
        
        const workflowData = {
            script: script,
            nodes: currentNodes,
            connections: currentConnections,
            viewport: viewportPosition,
            timestamp: new Date().toISOString()
        };
        
        // 로컬 스토리지에 저장 (기존 데이터 업데이트 방식)
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = script.id;
        
        // 기존 스크립트 데이터가 있으면 업데이트, 없으면 새로 추가
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
        } else {
            savedWorkflows.push(workflowData);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        
        // 저장 후 상태 확인
        this.debugStorageState();
    }
    
    /**
     * 현재 워크플로우 자동 저장
     * 스크립트 변경 시 현재 상태를 자동으로 저장합니다.
     */
    autoSaveCurrentWorkflow() {
        const sidebarManager = getSidebarManager();
        // 현재 스크립트 정보 가져오기
        const currentScript = sidebarManager ? sidebarManager.getCurrentScript() : null;
        if (!currentScript) {
            return;
        }
        
        const nodeManager = getNodeManager();
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = nodeManager ? nodeManager.getAllNodes() : [];
        const currentConnections = nodeManager ? nodeManager.getAllConnections() : [];
        
        // 노드가 없으면 저장하지 않음 (초기 상태)
        if (currentNodes.length === 0) {
            return;
        }
        
        // 현재 캔버스 뷰포트 위치 가져오기
        const viewportPosition = this.getCurrentViewportPosition();
        
        const workflowData = {
            script: currentScript,
            nodes: currentNodes,
            connections: currentConnections,
            viewport: viewportPosition,
            timestamp: new Date().toISOString()
        };
        
        // 로컬 스토리지에 저장 (기존 데이터 업데이트 방식)
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = currentScript.id;
        
        // 기존 스크립트 데이터가 있으면 업데이트, 없으면 새로 추가
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
        } else {
            savedWorkflows.push(workflowData);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        
        // 저장 후 상태 확인
        this.debugStorageState();
    }
    
    /**
     * 로컬 스토리지 상태 디버깅
     */
    debugStorageState() {
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        
        savedWorkflows.forEach((workflow, index) => {
            console.log(`워크플로우 ${index + 1}:`, {
                scriptName: workflow.script ? workflow.script.name : 'Unknown',
                scriptId: workflow.script ? workflow.script.id : 'Unknown',
                nodeCount: workflow.nodes ? workflow.nodes.length : 0,
                connectionCount: workflow.connections ? workflow.connections.length : 0,
                hasViewport: !!workflow.viewport
            });
        });
    }
    
    /**
     * 스크립트 데이터 로드
     * 백엔드 API에서 노드 정보를 가져와서 화면에 표시합니다.
     */
    async loadScriptData(script) {
        // 연결선 매니저 초기화 확인 및 보장
        this.ensureConnectionManagerInitialized();
        
        const nodeManager = getNodeManager();
        // 기존 노드들 제거
        const existingNodes = document.querySelectorAll('.workflow-node');
        existingNodes.forEach(node => {
            if (nodeManager) {
                nodeManager.deleteNode(node);
            }
        });
        
        try {
            const nodeAPI = getNodeAPI();
            // 백엔드 API에서 노드 정보 가져오기
            if (nodeAPI && script && script.id) {
                const response = await nodeAPI.getNodesByScript(script.id);
                
                console.log('백엔드에서 노드 정보 로드:', response);
                
                const nodes = response.nodes || [];
                const connections = response.connections || [];
                
                if (nodes.length > 0) {
                    // 연결선 매니저가 완전히 초기화될 때까지 대기
                    setTimeout(() => {
                        // 노드들 생성
                        nodes.forEach((nodeData) => {
                            // API 응답 형식을 NodeManager 형식으로 변환
                            const nodeDataForManager = {
                                id: nodeData.id,
                                title: nodeData.data?.title || nodeData.id,
                                type: nodeData.type,
                                color: nodeData.data?.color || 'blue',
                                x: nodeData.position?.x || 0,
                                y: nodeData.position?.y || 0,
                                ...nodeData.data
                            };
                            
                            if (nodeManager) {
                                nodeManager.createNode(nodeDataForManager);
                            }
                        });
                        
                        // 연결들 복원
                        if (connections.length > 0 && nodeManager && nodeManager.connectionManager) {
                            // 연결 형식 변환 (API 형식 -> ConnectionManager 형식)
                            const formattedConnections = connections.map(conn => ({
                                from: conn.from,
                                to: conn.to
                            }));
                            
                            nodeManager.connectionManager.setConnections(formattedConnections);
                        }
                    }, 100);
                } else {
                    // 저장된 노드가 없는 최초 스크립트라면 경계 노드 자동 생성
                    setTimeout(() => {
                        this.createDefaultBoundaryNodes();
                    }, 50);
                }
            } else {
                console.warn('NodeAPI를 사용할 수 없거나 script.id가 없습니다. 기본 노드 생성으로 대체합니다.');
                // API를 사용할 수 없는 경우 기본 노드 생성
                setTimeout(() => {
                    this.createDefaultBoundaryNodes();
                }, 50);
            }
        } catch (error) {
            console.error('노드 데이터 로드 실패:', error);
            // 에러 발생 시 기본 노드 생성
            setTimeout(() => {
                this.createDefaultBoundaryNodes();
            }, 50);
        }
    }
    
    /**
     * 연결선 매니저 초기화 보장
     * 스크립트 변경 시 연결선 매니저가 제대로 초기화되도록 보장합니다.
     */
    ensureConnectionManagerInitialized() {
        const nodeManager = getNodeManager();
        const ConnectionManager = getConnectionManager();
        
        if (!nodeManager) {
            console.warn('노드 매니저가 없습니다.');
            return;
        }
        
        // 연결선 매니저가 없거나 제대로 초기화되지 않은 경우
        const connectionManagerInstance = GlobalDependencies.getConnectionManagerInstance();
        if (!nodeManager.connectionManager || !connectionManagerInstance) {
            if (ConnectionManager && nodeManager.canvas) {
                // 새로운 연결선 매니저 생성
                nodeManager.connectionManager = new ConnectionManager(nodeManager.canvas);
                
                // 전역 변수로 설정 (다른 파일과의 호환성 유지)
                setConnectionManager(nodeManager.connectionManager);
            } else {
                console.warn('연결선 매니저 초기화 실패: ConnectionManager 클래스 또는 캔버스를 찾을 수 없습니다.');
            }
        }
    }
    
    /**
     * 키보드 단축키 설정
     * 사용자가 키보드로 빠르게 작업할 수 있도록 단축키를 제공합니다.
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const nodeManager = getNodeManager();
            const modalManager = getModalManager();
            
            // Ctrl + S: 저장
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveWorkflow();
            }
            
            // Ctrl + N: 새 노드 추가
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showAddNodeModal();
            }
            
            // F5: 실행 (Ctrl + F5는 브라우저 파워 새로고침으로 허용)
            if (e.key === 'F5' && !e.ctrlKey) {
                e.preventDefault();
                this.runWorkflow();
            }
            
            // Ctrl + R: 실행
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.runWorkflow();
            }
            
            // Delete: 선택된 노드 삭제
            if (e.key === 'Delete' && nodeManager && nodeManager.selectedNode) {
                e.preventDefault();
                nodeManager.deleteNode(nodeManager.selectedNode);
            }
            
            // Escape: 모달 닫기 또는 노드 선택 해제
            if (e.key === 'Escape') {
                if (modalManager && modalManager.isOpen()) {
                    modalManager.close();
                } else if (nodeManager && nodeManager.selectedNode) {
                    nodeManager.deselectNode();
                }
            }
        });
    }
}

/**
 * WorkflowPage 인스턴스 싱글톤
 * ES6 모듈에서 명시적으로 인스턴스를 관리
 */
let workflowPageInstance = null;

/**
 * WorkflowPage 인스턴스 가져오기
 * ES6 모듈에서 명시적으로 인스턴스를 가져올 수 있도록 제공
 * 
 * @returns {WorkflowPage|null} WorkflowPage 인스턴스 또는 null
 */
export function getWorkflowPageInstance() {
    return workflowPageInstance;
}

export function initializeWorkflowPage(options = {}) {
    const workflowPage = new WorkflowPage();
    workflowPage.setupKeyboardShortcuts();
    
    // 싱글톤 인스턴스 저장
    workflowPageInstance = workflowPage;
    
    // 전역 변수로 노출 제거 (ES6 모듈 원칙 준수)
    // 디버깅이 필요한 경우: import { getWorkflowPageInstance } from './workflow.js' 사용
    // 기존 코드 호환성을 위해 필요시에만 주석 해제:
    // if (typeof window !== 'undefined') {
    //     window.workflowPage = workflowPage;
    // }
    
    if (options.onReady) {
        options.onReady(workflowPage);
    }
    
    return workflowPage;
}

/**
 * 자동 초기화 (기존 방식과의 호환성 유지)
 * DOM이 완전히 로드된 후 워크플로우 페이지를 초기화합니다.
 */
export function autoInitializeWorkflowPage() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeWorkflowPage();
        });
    } else {
        // DOM이 이미 로드된 경우
        initializeWorkflowPage();
    }
}

// 자동 초기화 실행 (기존 방식과 동일한 동작)
// ES6 모듈이 아닌 경우에만 실행 (스크립트 태그로 로드된 경우)
// 주의: ES6 모듈로 사용할 때는 명시적으로 import하여 사용해야 합니다.
if (!window.__ES6_MODULE_LOADED__) {
    autoInitializeWorkflowPage();
}
