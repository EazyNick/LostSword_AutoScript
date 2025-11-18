/**
 * 워크플로우 페이지 메인 컨트롤러 클래스
 * ES6 모듈 방식으로 작성됨
 * 
 * 이 클래스는 워크플로우 편집 페이지의 전체적인 흐름을 관리합니다.
 * 실제 동작 코드는 모두 서비스/모달/유틸리티로 분리되어 있습니다.
 */

// ES6 모듈 import - 명시적 의존성 관리
import { getSidebarInstance } from '../../js/components/sidebar.js';
import { ConnectionManager, setConnectionManager } from '../../js/components/connection.js';
import { getModalManagerInstance } from '../../js/utils/modal.js';
import { getToastManagerInstance } from '../../js/utils/toast.js';
import { NodeAPI } from '../../js/api/nodeapi.js';

// Workflow 페이지 모듈 import
import { AddNodeModal } from './modals/add-node-modal.js';
import { NodeSettingsModal } from './modals/node-settings-modal.js';
import { WorkflowSaveService } from './services/workflow-save-service.js';
import { WorkflowLoadService } from './services/workflow-load-service.js';
import { WorkflowExecutionService } from './services/workflow-execution-service.js';
import { NodeUpdateService } from './services/node-update-service.js';
import { NodeCreationService } from './services/node-creation-service.js';
import { ViewportUtils } from './utils/viewport-utils.js';
import { StorageUtils } from './utils/storage-utils.js';
import { getNodeType, getNodeData, escapeHtml } from './utils/node-utils.js';

/**
 * 로거 유틸리티 가져오기 (전역 fallback 포함)
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn)
    };
};

/**
 * 의존성 관리 헬퍼 함수들
 */
const GlobalDependencies = {
    getNodeManager: () => window.nodeManager || null,
    getConnectionManagerInstance: () => window.connectionManager || null
};

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
        this.addNodeModal = null;
        this.nodeSettingsModal = null;
        this.saveService = null;
        this.loadService = null;
        this.executionService = null;
        this.updateService = null;
        this.creationService = null;
        
        this.init();
    }
    
    /**
     * 의존성 가져오기 메서드들 (서비스에서 사용)
     */
    getModalManager() { return getModalManager(); }
    getToastManager() { return getToastManagerInstance(); }
    getSidebarManager() { return getSidebarManager(); }
    getNodeManager() { return getNodeManager(); }
    getNodeAPI() { return getNodeAPI(); }
    getLogger() { return getLogger(); }
    
    /**
     * 초기화 메서드
     */
    init() {
        this.addNodeModal = new AddNodeModal(this);
        this.nodeSettingsModal = new NodeSettingsModal(this);
        this.saveService = new WorkflowSaveService(this);
        this.loadService = new WorkflowLoadService(this);
        this.executionService = new WorkflowExecutionService(this);
        this.updateService = new NodeUpdateService(this);
        this.creationService = new NodeCreationService(this);
        
        this.setupEventListeners();
        this.setupComponentEventListeners();
        this.setupComponentIntegration();
        this.setupKeyboardShortcuts();
        this.createInitialNodes();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        document.querySelector('.save-btn')?.addEventListener('click', () => this.saveWorkflow());
        document.querySelector('.add-node-btn')?.addEventListener('click', () => this.showAddNodeModal());
        document.querySelector('.run-btn')?.addEventListener('click', () => this.runWorkflow());
    }
    
    /**
     * 컴포넌트 이벤트 리스너 설정
     */
    setupComponentEventListeners() {
        const logger = getLogger();
        const log = logger.log;
        
        // sidebar.js는 document에 이벤트를 dispatch하므로 document에 리스너 등록
        document.addEventListener('scriptChanged', (e) => {
            log('[WorkflowPage] scriptChanged 이벤트 받음:', e.detail);
            this.onScriptChanged(e);
        });
        
        log('[WorkflowPage] ✅ 컴포넌트 이벤트 리스너 설정 완료');
    }
    
    /**
     * 컴포넌트 통합 설정
     */
    setupComponentIntegration() {
        setTimeout(() => {
            const logger = this.getLogger();
            const log = logger.log;
            
            const nodeManager = getNodeManager();
            const sidebarManager = getSidebarManager();
            
            log('[WorkflowPage] setupComponentIntegration() 실행');
            
            if (nodeManager) {
                nodeManager.setWorkflowPage(this);
                log('[WorkflowPage] ✅ NodeManager에 WorkflowPage 설정 완료');
            } else {
                log('[WorkflowPage] ⚠️ NodeManager를 찾을 수 없습니다');
            }
            
            if (sidebarManager) {
                const current = sidebarManager.getCurrentScript();
                log('[WorkflowPage] 현재 스크립트:', current);
                if (current) {
                    log('[WorkflowPage] 초기 스크립트 로드 시작');
                    this.loadService.load(current);
                } else {
                    log('[WorkflowPage] ⚠️ 현재 스크립트가 없습니다');
                }
            } else {
                log('[WorkflowPage] ⚠️ SidebarManager를 찾을 수 없습니다');
            }
        }, 100);
    }
    
    /**
     * 초기 노드 생성
     */
    createInitialNodes() {
        const initNodes = () => {
            const nodeManager = getNodeManager();
            const ConnectionManager = getConnectionManager();
            
            if (nodeManager && nodeManager.canvas) {
                if (!nodeManager.connectionManager && ConnectionManager) {
                    nodeManager.connectionManager = new ConnectionManager(nodeManager.canvas);
                }
            } else {
                setTimeout(initNodes, 100);
            }
        };
        
        initNodes();
    }
    
    /**
     * 기본 시작/종료 노드 생성
     */
    createDefaultBoundaryNodes() {
        if (this.creationService) {
            this.creationService.createDefaultBoundaryNodes();
        }
    }
    
    /**
     * 모든 노드가 화면에 보이도록 뷰포트 조정
     */
    fitNodesToView() {
        ViewportUtils.fitNodesToView(this);
    }
    
    /**
     * 노드 추가 모달 표시
     */
    showAddNodeModal() {
        if (this.addNodeModal) {
            this.addNodeModal.show();
        }
    }
    
    /**
     * 노드 설정 모달 표시
     */
    showNodeSettingsModal(nodeElement) {
        if (this.nodeSettingsModal) {
            this.nodeSettingsModal.show(nodeElement);
        }
    }
    
    /**
     * 노드 업데이트
     */
    updateNode(nodeElement, nodeId) {
        if (this.updateService) {
            this.updateService.update(nodeElement, nodeId);
        }
    }
    
    /**
     * 노드 데이터로부터 노드 생성
     */
    createNodeFromData(nodeData) {
        if (this.creationService) {
            return this.creationService.createFromData(nodeData);
        }
        return null;
    }
    
    /**
     * 워크플로우 실행
     */
    async runWorkflow() {
        if (this.executionService) {
            return this.executionService.execute();
        }
    }
    
    /**
     * 스크립트 데이터 로드
     */
    async loadScriptData(script) {
        if (this.loadService) {
            return this.loadService.load(script);
        }
    }
    
    /**
     * 워크플로우 저장
     */
    async saveWorkflow(options = {}) {
        if (this.saveService) {
            return this.saveService.save(options);
        }
    }
    
    /**
     * 현재 뷰포트 위치 가져오기
     */
    getCurrentViewportPosition() {
        return ViewportUtils.getCurrentViewportPosition();
    }
    
    /**
     * 뷰포트 위치 복원
     */
    restoreViewportPosition(viewportData) {
        ViewportUtils.restoreViewportPosition(viewportData);
    }
    
    /**
     * 워크플로우 데이터 준비
     */
    prepareWorkflowData(nodes) {
        if (this.executionService) {
            return this.executionService.prepareWorkflowData(nodes);
        }
        return { nodes: [], execution_mode: 'sequential' };
    }
    
    /**
     * 워크플로우 실행 애니메이션
     */
    animateWorkflowExecution(nodes) {
        if (this.executionService) {
            this.executionService.animateExecution(nodes);
        }
    }
    
    /**
     * 특정 스크립트의 워크플로우 저장
     */
    saveWorkflowForScript(script) {
        StorageUtils.saveToLocalStorage(this, script);
    }
    
    /**
     * 현재 워크플로우 자동 저장
     */
    autoSaveCurrentWorkflow() {
        StorageUtils.autoSave(this);
    }
    
    /**
     * 로컬 스토리지 상태 디버깅
     */
    debugStorageState() {
        StorageUtils.debugStorageState();
    }
    
    /**
     * 노드 타입 가져오기
     */
    getNodeType(node) {
        return getNodeType(node);
    }
    
    /**
     * 노드 데이터 가져오기
     */
    getNodeData(node) {
        return getNodeData(node);
    }
    
    /**
     * HTML 이스케이프 헬퍼
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
    
    /**
     * 스크립트 변경 처리
     */
    onScriptChanged(event) {
        const logger = this.getLogger();
        const log = logger.log;
        
        const { script, previousScript } = event.detail;
        
        log('[WorkflowPage] onScriptChanged() 호출됨');
        log('[WorkflowPage] 현재 스크립트:', script);
        log('[WorkflowPage] 이전 스크립트:', previousScript);
        
        if (previousScript) {
            this.saveWorkflowForScript(previousScript);
            setTimeout(() => {
                this.loadScriptData(script);
            }, 100);
        } else {
            this.loadScriptData(script);
        }
    }
    
    /**
     * 연결선 매니저 초기화 보장
     */
    ensureConnectionManagerInitialized() {
        const nodeManager = getNodeManager();
        const ConnectionManager = getConnectionManager();
        
        if (!nodeManager) {
            console.warn('노드 매니저가 없습니다.');
            return;
        }
        
        const connectionManagerInstance = GlobalDependencies.getConnectionManagerInstance();
        if (!nodeManager.connectionManager || !connectionManagerInstance) {
            if (ConnectionManager && nodeManager.canvas) {
                nodeManager.connectionManager = new ConnectionManager(nodeManager.canvas);
                setConnectionManager(nodeManager.connectionManager);
            } else {
                console.warn('연결선 매니저 초기화 실패: ConnectionManager 클래스 또는 캔버스를 찾을 수 없습니다.');
            }
        }
    }
    
    /**
     * 키보드 단축키 설정
     */
    setupKeyboardShortcuts() {
        // capture 단계에서 이벤트를 처리하여 기본 동작을 먼저 막음
        document.addEventListener('keydown', (e) => {
            const nodeManager = getNodeManager();
            const modalManager = getModalManager();
            
            // Ctrl+S 또는 Cmd+S (Mac) - 워크플로우 저장
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.saveWorkflow({ useToast: true });
                return false;
            }
            
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showAddNodeModal();
            }
            
            if (e.key === 'F5' && !e.ctrlKey) {
                e.preventDefault();
                this.runWorkflow();
            }
            
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.runWorkflow();
            }
            
            if (e.key === 'Delete' && nodeManager && nodeManager.selectedNode) {
                e.preventDefault();
                nodeManager.deleteNode(nodeManager.selectedNode);
            }
            
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
 */
let workflowPageInstance = null;

/**
 * WorkflowPage 인스턴스 가져오기
 */
export function getWorkflowPageInstance() {
    return workflowPageInstance;
}

/**
 * WorkflowPage 초기화
 */
export function initializeWorkflowPage(options = {}) {
    const workflowPage = new WorkflowPage();
    workflowPage.setupKeyboardShortcuts();
    
    workflowPageInstance = workflowPage;
    
    if (options.onReady) {
        options.onReady(workflowPage);
    }
    
    return workflowPage;
}

/**
 * 자동 초기화 (기존 방식과의 호환성 유지)
 */
export function autoInitializeWorkflowPage() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeWorkflowPage();
        });
    } else {
        initializeWorkflowPage();
    }
}

// 자동 초기화 실행 (ES6 모듈이 아닌 경우에만)
if (!window.__ES6_MODULE_LOADED__) {
    autoInitializeWorkflowPage();
}
