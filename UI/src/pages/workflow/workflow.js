/**
 * 워크플로우 페이지 메인 컨트롤러 클래스
 * 
 * 이 클래스는 워크플로우 편집 페이지의 전체적인 흐름을 관리합니다.
 * 주요 기능:
 * - 헤더 버튼 이벤트 처리 (저장, 노드 추가, 실행)
 * - 컴포넌트 간 통신 및 통합
 * - 워크플로우 데이터 관리
 * - 초기 노드 생성 및 설정
 * - 키보드 단축키 처리
 */
class WorkflowPage {
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
            console.log('스크립트 변경됨:', e.detail.script.name);
            this.onScriptChanged(e);
        });
        
        // 노드 선택 이벤트 (노드 매니저에서 노드 선택 시)
        document.addEventListener('nodeSelected', (e) => {
            console.log('노드 선택됨:', e.detail.node.id);
        });
        
        // 노드 선택 해제 이벤트
        document.addEventListener('nodeDeselected', () => {
            console.log('노드 선택 해제됨');
        });
    }
    
    /**
     * 컴포넌트 통합 설정
     * 각 컴포넌트들이 서로 연동될 수 있도록 설정합니다.
     */
    setupComponentIntegration() {
        // 컴포넌트들이 로드된 후 초기화
        setTimeout(() => {
            if (window.nodeManager) {
                console.log('노드 매니저 초기화 완료');
            }
            
            if (window.minimapManager) {
                console.log('미니맵 매니저 초기화 완료');
            }
            
            if (window.sidebarManager) {
                console.log('사이드바 매니저 초기화 완료');
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
            if (window.nodeManager && window.nodeManager.canvas) {
                console.log('노드 매니저와 캔버스 확인됨, 초기화 시작');
                
                // 연결 관리자 확인 및 초기화
                if (!window.nodeManager.connectionManager && window.ConnectionManager) {
                    window.nodeManager.connectionManager = new window.ConnectionManager(window.nodeManager.canvas);
                    console.log('워크플로우에서 연결 관리자 초기화 완료');
                }
                
                // 미니맵 관리자 확인 및 초기화 (이미 존재하면 참조만 설정)
                if (!window.nodeManager.minimapManager) {
                    if (window.minimapManager) {
                        // 이미 생성된 미니맵 매니저 사용
                        window.nodeManager.minimapManager = window.minimapManager;
                        console.log('워크플로우에서 기존 미니맵 관리자 참조 설정 완료');
                    } else if (window.MinimapManager) {
                        // 미니맵 매니저가 없으면 새로 생성
                        const minimapContent = document.getElementById('minimap-content');
                        if (minimapContent) {
                            window.nodeManager.minimapManager = new window.MinimapManager(window.nodeManager.canvas, minimapContent);
                            console.log('워크플로우에서 미니맵 관리자 초기화 완료');
                        }
                    }
                }
                
                // 기존 노드가 없을 때만 초기 노드 생성
                const existingNodes = document.querySelectorAll('.workflow-node');
                console.log('기존 노드 개수:', existingNodes.length);
                if (existingNodes.length === 0) {
                    console.log('초기 노드 생성 시작');
                    this.createSampleNodes();
                } else {
                    console.log('기존 노드가 있어서 초기 노드 생성 건너뜀');
                }
            } else {
                console.log('노드 매니저 또는 캔버스를 찾을 수 없음, 재시도...');
                setTimeout(initNodes, 100);
            }
        };
        
        // 즉시 실행
        initNodes();
    }
    
    /**
     * 샘플 노드 생성
     * 데모용 기본 노드들을 생성합니다.
     */
    createSampleNodes() {
        // 무한 캔버스 좌표계에 맞게 노드들을 배치
        // Transform이 translate(-50000px, -50000px)이므로 노드들은 양수 좌표에 배치
        const baseX = 50000; // 무한 캔버스 기준점
        const baseY = 50000; // 무한 캔버스 기준점
        
        const sampleNodes = [
            {
                id: 'node1',
                type: 'navigate',
                title: '페이지 이동',
                color: 'blue',
                x: baseX - 300,
                y: baseY - 100
            },
            {
                id: 'node2',
                type: 'click',
                title: '아이디 입력',
                color: 'blue',
                x: baseX - 50,
                y: baseY - 100
            },
            {
                id: 'node3',
                type: 'condition',
                title: '로그인 성공 확인',
                color: 'orange',
                x: baseX + 200,
                y: baseY - 100
            }
        ];
        
        console.log('샘플 노드 생성 시작, 노드 개수:', sampleNodes.length);
        
        // 샘플 노드들 생성
        sampleNodes.forEach((nodeData, index) => {
            console.log(`노드 ${index + 1} 생성 중:`, nodeData.title);
            try {
                window.nodeManager.createNode(nodeData);
                console.log(`노드 ${index + 1} 생성 완료`);
            } catch (error) {
                console.error(`노드 ${index + 1} 생성 실패:`, error);
            }
        });
        
        // 초기 연결 생성
        setTimeout(() => {
            if (window.nodeManager.connectionManager) {
                console.log('초기 연결 생성 시작');
                const connections = [
                    { id: 'node1-node2', from: 'node1', to: 'node2' },
                    { id: 'node2-node3', from: 'node2', to: 'node3' }
                ];
                window.nodeManager.connectionManager.setConnections(connections);
                console.log('초기 연결 생성 완료');
                
                // 연결선 위치 정확히 맞추기 위해 추가 업데이트
                setTimeout(() => {
                    if (window.nodeManager.connectionManager) {
                        console.log('연결선 위치 재조정 시작');
                        window.nodeManager.connectionManager.updateAllConnections();
                        console.log('연결선 위치 재조정 완료');
                        
                        // 초기 노드와 연결선 생성 완료 후 자동 저장
                        setTimeout(() => {
                            console.log('초기 노드 생성 완료 - 자동 저장 시작');
                            if (window.sidebarManager) {
                                window.sidebarManager.saveCurrentWorkflowBeforeSwitch();
                            } else {
                                console.log('사이드바 매니저가 없어서 초기 저장 건너뜀');
                            }
                        }, 200);
                    }
                }, 100);
            } else {
                console.log('연결 관리자가 없어서 연결 생성 건너뜀');
            }
        }, 500);
        
        console.log('초기 노드 생성 완료');
        
        // 노드 생성 완료 후 연결선 업데이트
        setTimeout(() => {
            if (window.nodeManager.connectionManager) {
                console.log('노드 생성 후 연결선 업데이트');
                window.nodeManager.connectionManager.updateAllConnections();
            }
        }, 1000);
    }
    
    /**
     * 노드 추가 모달 표시
     * 새 노드를 추가하기 위한 모달 창을 표시합니다.
     */
    showAddNodeModal() {
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
        
        window.modalManager.show(content);
        
        // 이벤트 리스너 추가
        document.getElementById('add-node-confirm').addEventListener('click', () => {
            this.addNode();
        });
        
        document.getElementById('add-node-cancel').addEventListener('click', () => {
            window.modalManager.close();
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
        
        if (window.nodeManager) {
            window.nodeManager.createNode(nodeData);
        }
        
        window.modalManager.close();
        console.log('노드 추가됨:', nodeData);
    }
    
    /**
     * 워크플로우 저장
     * 현재 워크플로우 상태를 로컬 스토리지에 저장합니다.
     */
    saveWorkflow() {
        // 현재 캔버스 뷰포트 위치 가져오기
        const viewportPosition = this.getCurrentViewportPosition();
        
        const workflowData = {
            script: window.sidebarManager ? window.sidebarManager.getCurrentScript() : null,
            nodes: window.nodeManager ? window.nodeManager.getAllNodes() : [],
            connections: window.nodeManager ? window.nodeManager.getAllConnections() : [],
            viewport: viewportPosition, // 캔버스 뷰포트 위치 추가
            timestamp: new Date().toISOString()
        };
        
        // 로컬 스토리지에 저장 (기존 데이터 업데이트 방식으로 변경)
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = workflowData.script ? workflowData.script.id : 'default';
        
        // 기존 스크립트 데이터가 있으면 업데이트, 없으면 새로 추가
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
            console.log('기존 스크립트 데이터 업데이트:', scriptId);
        } else {
            savedWorkflows.push(workflowData);
            console.log('새 스크립트 데이터 추가:', scriptId);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        
        window.modalManager.showAlert('저장 완료', '워크플로우가 성공적으로 저장되었습니다.');
        console.log('워크플로우 저장:', workflowData);
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
            
            console.log('현재 뷰포트 위치 (Transform 모드):', { x, y, scale });
            return { x, y, scale, mode: 'transform' };
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                const x = canvas.scrollLeft || 0;
                const y = canvas.scrollTop || 0;
                console.log('현재 뷰포트 위치 (스크롤 모드):', { x, y });
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
            console.log('뷰포트 데이터가 없어서 기본 위치로 설정');
            return;
        }
        
        console.log('뷰포트 위치 복원 시작:', viewportData);
        
        const canvasContent = document.getElementById('canvas-content');
        
        if (viewportData.mode === 'transform' && canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const { x, y, scale } = viewportData;
            canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            console.log(`뷰포트 복원 (Transform): translate(${x}, ${y}) scale(${scale})`);
        } else if (viewportData.mode === 'scroll') {
            // 스크롤 기반 패닝 (전통적 방식)
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                canvas.scrollLeft = viewportData.x || 0;
                canvas.scrollTop = viewportData.y || 0;
                console.log(`뷰포트 복원 (스크롤): (${viewportData.x}, ${viewportData.y})`);
            }
        }
        
        // 미니맵 뷰포트 업데이트
        if (window.minimapManager) {
            setTimeout(() => {
                window.minimapManager.updateViewport();
            }, 100);
        }
    }
    
    /**
     * 워크플로우 실행
     * 현재 워크플로우를 실행합니다. (현재는 시뮬레이션 모드)
     */
    async runWorkflow() {
        const nodes = document.querySelectorAll('.workflow-node');
        if (nodes.length === 0) {
            window.modalManager.showAlert('실행 불가', '실행할 노드가 없습니다.');
            return;
        }
        
        console.log('워크플로우 실행 시작');
        
        // 노드 데이터를 FastAPI 형식으로 변환
        const workflowData = this.prepareWorkflowData(nodes);
        
        try {
            // UI 테스트를 위해 서버 호출 비활성화
            console.log('워크플로우 실행 (시뮬레이션 모드):', workflowData);
            
            // 시뮬레이션된 실행 결과
            const result = { success: true, data: { message: '워크플로우 실행 완료' } };
            
            if (result.success) {
                // 실행 애니메이션
                this.animateWorkflowExecution(nodes);
                window.modalManager.showAlert('실행 완료', '워크플로우가 성공적으로 실행되었습니다.');
            } else {
                window.modalManager.showAlert('실행 실패', result.error || '워크플로우 실행 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('워크플로우 실행 오류:', error);
            window.modalManager.showAlert('실행 오류', '워크플로우 실행 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 워크플로우 데이터 준비
     * DOM 노드들을 서버에서 처리할 수 있는 형식으로 변환합니다.
     */
    prepareWorkflowData(nodes) {
        // 노드들을 순서대로 정렬 (왼쪽부터)
        const sortedNodes = Array.from(nodes).sort((a, b) => {
            return parseInt(a.style.left) - parseInt(b.style.left);
        });
        
        return {
            nodes: sortedNodes.map(node => ({
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
            window.modalManager.showAlert('실행 완료', '워크플로우 실행이 완료되었습니다.');
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
        console.log('새 스크립트 로드:', script.name);
        console.log('이전 스크립트:', previousScript ? previousScript.name : '없음');
        
        // 이전 스크립트가 있으면 먼저 저장 (노드가 삭제되기 전에)
        if (previousScript) {
            console.log('워크플로우에서 이전 스크립트 저장 시도:', previousScript.name);
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
            console.log('스크립트 정보가 없어서 저장 건너뜀');
            return;
        }
        
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = window.nodeManager ? window.nodeManager.getAllNodes() : [];
        const currentConnections = window.nodeManager ? window.nodeManager.getAllConnections() : [];
        
        console.log('스크립트 저장할 데이터:', {
            script: script.name,
            nodes: currentNodes.length,
            connections: currentConnections.length
        });
        
        // 노드가 없어도 저장 (초기 상태도 보존)
        console.log('노드 개수:', currentNodes.length, '연결선 개수:', currentConnections.length);
        
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
            console.log('기존 스크립트 데이터 업데이트:', scriptId);
        } else {
            savedWorkflows.push(workflowData);
            console.log('새 스크립트 데이터 추가:', scriptId);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        console.log('스크립트 저장 완료:', workflowData);
        
        // 저장 후 상태 확인
        this.debugStorageState();
    }
    
    /**
     * 현재 워크플로우 자동 저장
     * 스크립트 변경 시 현재 상태를 자동으로 저장합니다.
     */
    autoSaveCurrentWorkflow() {
        // 현재 스크립트 정보 가져오기
        const currentScript = window.sidebarManager ? window.sidebarManager.getCurrentScript() : null;
        if (!currentScript) {
            console.log('현재 스크립트 정보가 없어서 자동 저장 건너뜀');
            return;
        }
        
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = window.nodeManager ? window.nodeManager.getAllNodes() : [];
        const currentConnections = window.nodeManager ? window.nodeManager.getAllConnections() : [];
        
        console.log('자동 저장할 데이터:', {
            script: currentScript.name,
            nodes: currentNodes.length,
            connections: currentConnections.length
        });
        
        // 노드가 없으면 저장하지 않음 (초기 상태)
        if (currentNodes.length === 0) {
            console.log('노드가 없어서 자동 저장 건너뜀');
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
            console.log('기존 스크립트 데이터 업데이트:', scriptId);
        } else {
            savedWorkflows.push(workflowData);
            console.log('새 스크립트 데이터 추가:', scriptId);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        console.log('자동 저장 완료:', workflowData);
        
        // 저장 후 상태 확인
        this.debugStorageState();
    }
    
    /**
     * 로컬 스토리지 상태 디버깅
     */
    debugStorageState() {
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        console.log('=== 로컬 스토리지 상태 ===');
        console.log('총 저장된 워크플로우 개수:', savedWorkflows.length);
        savedWorkflows.forEach((workflow, index) => {
            console.log(`워크플로우 ${index + 1}:`, {
                scriptName: workflow.script ? workflow.script.name : 'Unknown',
                scriptId: workflow.script ? workflow.script.id : 'Unknown',
                nodeCount: workflow.nodes ? workflow.nodes.length : 0,
                connectionCount: workflow.connections ? workflow.connections.length : 0,
                hasViewport: !!workflow.viewport
            });
        });
        console.log('=== 로컬 스토리지 상태 끝 ===');
    }
    
    /**
     * 스크립트 데이터 로드
     * 저장된 워크플로우 데이터에서 해당 스크립트의 데이터를 찾아 로드합니다.
     */
    loadScriptData(script) {
        console.log('스크립트 데이터 로드 시작:', script.name, 'ID:', script.id);
        
        // 연결선 매니저 초기화 확인 및 보장
        this.ensureConnectionManagerInitialized();
        
        // 저장된 워크플로우 데이터에서 해당 스크립트의 데이터를 찾아 로드
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        console.log('저장된 모든 워크플로우:', savedWorkflows);
        
        // 로컬 스토리지 상태 디버깅
        this.debugStorageState();
        
        const scriptWorkflow = savedWorkflows.find(w => w.script && w.script.id === script.id);
        console.log('찾은 스크립트 워크플로우:', scriptWorkflow);
        
        if (scriptWorkflow && scriptWorkflow.nodes && scriptWorkflow.nodes.length > 0) {
            console.log('저장된 스크립트 데이터 발견:', scriptWorkflow.nodes.length + '개 노드');
            console.log('저장된 노드 데이터:', scriptWorkflow.nodes);
            
            // 기존 노드들 제거 (연결선도 함께 제거됨)
            const existingNodes = document.querySelectorAll('.workflow-node');
            console.log('기존 노드 제거 시작:', existingNodes.length + '개');
            existingNodes.forEach(node => {
                if (window.nodeManager) {
                    window.nodeManager.deleteNode(node);
                }
            });
            
            // 연결선 매니저가 완전히 초기화될 때까지 대기
            setTimeout(() => {
                // 저장된 노드들 복원
                console.log('노드 복원 시작:', scriptWorkflow.nodes.length + '개 노드');
                scriptWorkflow.nodes.forEach((nodeData, index) => {
                    console.log(`노드 ${index + 1} 복원:`, nodeData);
                    if (window.nodeManager) {
                        window.nodeManager.createNode(nodeData);
                    }
                });
                
                // 저장된 연결들 복원
                if (scriptWorkflow.connections && window.nodeManager.connectionManager) {
                    console.log('연결선 복원 시작:', scriptWorkflow.connections.length + '개 연결선');
                    window.nodeManager.connectionManager.setConnections(scriptWorkflow.connections);
                }
                
                // 저장된 뷰포트 위치 복원
                if (scriptWorkflow.viewport) {
                    console.log('뷰포트 위치 복원 시작:', scriptWorkflow.viewport);
                    this.restoreViewportPosition(scriptWorkflow.viewport);
                }
                
                console.log('스크립트 데이터 로드 완료:', scriptWorkflow.nodes.length + '개 노드');
            }, 100);
        } else {
            console.log('저장된 스크립트 데이터가 없습니다.');
            console.log('스크립트 워크플로우 상태:', {
                exists: !!scriptWorkflow,
                hasNodes: !!(scriptWorkflow && scriptWorkflow.nodes),
                nodeCount: scriptWorkflow ? scriptWorkflow.nodes.length : 0
            });
            
            // 기존 노드들 제거
            const existingNodes = document.querySelectorAll('.workflow-node');
            console.log('기존 노드 제거 시작 (데이터 없음):', existingNodes.length + '개');
            existingNodes.forEach(node => {
                if (window.nodeManager) {
                    window.nodeManager.deleteNode(node);
                }
            });
        }
    }
    
    /**
     * 연결선 매니저 초기화 보장
     * 스크립트 변경 시 연결선 매니저가 제대로 초기화되도록 보장합니다.
     */
    ensureConnectionManagerInitialized() {
        console.log('연결선 매니저 초기화 확인 중...');
        
        if (!window.nodeManager) {
            console.warn('노드 매니저가 없습니다.');
            return;
        }
        
        // 연결선 매니저가 없거나 제대로 초기화되지 않은 경우
        if (!window.nodeManager.connectionManager || !window.connectionManager) {
            console.log('연결선 매니저 재초기화 시작...');
            
            if (window.ConnectionManager && window.nodeManager.canvas) {
                // 새로운 연결선 매니저 생성
                window.nodeManager.connectionManager = new window.ConnectionManager(window.nodeManager.canvas);
                
                // 전역 변수로 설정
                if (window.setConnectionManager) {
                    window.setConnectionManager(window.nodeManager.connectionManager);
                }
                
                console.log('연결선 매니저 재초기화 완료');
            } else {
                console.warn('연결선 매니저 초기화 실패: ConnectionManager 클래스 또는 캔버스를 찾을 수 없습니다.');
            }
        } else {
            console.log('연결선 매니저가 이미 초기화되어 있습니다.');
        }
    }
    
    /**
     * 키보드 단축키 설정
     * 사용자가 키보드로 빠르게 작업할 수 있도록 단축키를 제공합니다.
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
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
            if (e.key === 'Delete' && window.nodeManager && window.nodeManager.selectedNode) {
                e.preventDefault();
                window.nodeManager.deleteNode(window.nodeManager.selectedNode);
            }
            
            // Escape: 모달 닫기 또는 노드 선택 해제
            if (e.key === 'Escape') {
                if (window.modalManager && window.modalManager.isOpen()) {
                    window.modalManager.close();
                } else if (window.nodeManager && window.nodeManager.selectedNode) {
                    window.nodeManager.deselectNode();
                }
            }
        });
    }
}

/**
 * 페이지 초기화
 * DOM이 완전히 로드된 후 워크플로우 페이지를 초기화합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
    const workflowPage = new WorkflowPage();
    workflowPage.setupKeyboardShortcuts();
    
    // 전역 변수로 노출 (디버깅 및 외부 접근용)
    window.workflowPage = workflowPage;
    
    console.log('워크플로우 페이지 초기화 완료');
});