/**
 * 워크플로우 로드 서비스
 * 서버에서 워크플로우 데이터를 가져와 화면에 표시하는 로직을 담당합니다.
 */

import { getDefaultDescription } from '../config/node-defaults.js';
import { NODE_TYPES } from '../constants/node-types.js';
import { ScriptAPI } from '../../../js/api/scriptapi.js';

export class WorkflowLoadService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 스크립트 데이터 로드
     * @param {Object} script - 스크립트 정보
     */
    async load(script) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        const logError = logger.error;
        
        log('[WorkflowPage] loadScriptData() 호출됨');
        log('[WorkflowPage] 로드할 스크립트:', { id: script?.id, name: script?.name });
        
        if (!script || !script.id) {
            logError('[WorkflowPage] ⚠️ 유효하지 않은 스크립트 정보:', script);
            return;
        }
        
        // 연결선 매니저 초기화 확인
        this.workflowPage.ensureConnectionManagerInitialized();
        
        const nodeManager = this.workflowPage.getNodeManager();
        
        // 기존 노드들 제거
        this.clearExistingNodes(nodeManager);
        
        try {
            if (ScriptAPI && script.id) {
                const response = await ScriptAPI.getScript(script.id);
                log('[WorkflowPage] ✅ 서버에서 스크립트 정보 받음:', response);
                
                const nodes = response.nodes || [];
                // 서버에서 connections 배열을 직접 받거나, 없으면 노드의 connected_to에서 생성
                let connections = response.connections || [];
                
                // connections가 없으면 노드의 connected_to에서 생성 (하위 호환성)
                if (connections.length === 0) {
                    connections = this.buildConnectionsFromNodes(nodes);
                }
                
                log(`[WorkflowPage] 서버에서 받은 노드 개수: ${nodes.length}개`);
                log(`[WorkflowPage] 연결 개수: ${connections.length}개`);
                log(`[WorkflowPage] 연결 정보:`, connections);
                
                if (nodes.length > 0) {
                    // 서버에서 불러온 노드에 start/end가 포함되어 있는지 확인
                    const hasStartNode = nodes.some(n => (n.id === 'start' || n.type === 'start'));
                    const hasEndNode = nodes.some(n => (n.id === 'end' || n.type === 'end'));
                    
                    log(`[WorkflowPage] 서버 노드 확인 - start: ${hasStartNode}, end: ${hasEndNode}`);
                    
                    await this.renderNodes(nodes, connections, nodeManager);
                } else {
                    // 노드가 없을 때만 기본 경계 노드 생성
                    log('[WorkflowPage] 노드가 없어 기본 경계 노드 생성');
                    this.workflowPage.createDefaultBoundaryNodes();
                }
            } else {
                logError('[WorkflowPage] ⚠️ ScriptAPI를 사용할 수 없거나 script.id가 없습니다.');
                this.workflowPage.createDefaultBoundaryNodes();
            }
        } catch (error) {
            logError('[WorkflowPage] ❌ 노드 데이터 로드 실패:', error);
            this.workflowPage.createDefaultBoundaryNodes();
        }
    }

    /**
     * 기존 노드들 제거
     * 스크립트 전환 시 또는 초기 로드 시 호출됩니다.
     * 스크립트 전환 시이므로 시작/종료 노드도 포함하여 모든 노드를 강제 삭제합니다.
     */
    clearExistingNodes(nodeManager) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        
        log('[WorkflowPage] 기존 노드 제거 시작');
        
        if (!nodeManager) {
            log('[WorkflowPage] ⚠️ NodeManager를 찾을 수 없습니다.');
            return;
        }
        
        // nodeManager의 nodes 배열에서 제거 (스크립트 전환 시이므로 강제 삭제)
        if (nodeManager.nodes && nodeManager.nodes.length > 0) {
            const nodesToDelete = [...nodeManager.nodes]; // 복사본 생성
            log(`[WorkflowPage] NodeManager에서 제거할 노드 개수: ${nodesToDelete.length}개`);
            
            nodesToDelete.forEach(nodeObj => {
                if (nodeObj && nodeObj.element) {
                    try {
                        // 스크립트 전환 시이므로 시작/종료 노드도 강제 삭제
                        nodeManager.deleteNode(nodeObj.element, true);
                    } catch (error) {
                        log(`[WorkflowPage] 노드 삭제 중 오류: ${error}`);
                    }
                }
            });
        }
        
        // DOM에서도 직접 제거 (혹시 남아있는 경우)
        const existingNodes = document.querySelectorAll('.workflow-node');
        if (existingNodes.length > 0) {
            log(`[WorkflowPage] DOM에서 추가로 제거할 노드 개수: ${existingNodes.length}개`);
            existingNodes.forEach(node => {
                try {
                    if (nodeManager) {
                        // 스크립트 전환 시이므로 시작/종료 노드도 강제 삭제
                        nodeManager.deleteNode(node, true);
                    } else {
                        node.remove();
                    }
                } catch (error) {
                    log(`[WorkflowPage] DOM 노드 삭제 중 오류: ${error}`);
                }
            });
        }
        
        // nodeData도 초기화
        if (nodeManager.nodeData) {
            nodeManager.nodeData = {};
            log('[WorkflowPage] nodeData 초기화 완료');
        }
        
        log('[WorkflowPage] ✅ 기존 노드 제거 완료');
    }

    /**
     * 노드들의 연결 정보로부터 connections 배열 생성
     */
    buildConnectionsFromNodes(nodes) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        
        const connections = [];
        
        nodes.forEach(node => {
            let connectedTo = node.connected_to;
            
            // connected_to가 문자열인 경우 JSON 파싱
            if (typeof connectedTo === 'string') {
                try {
                    connectedTo = JSON.parse(connectedTo);
                } catch (e) {
                    log(`[WorkflowPage] ⚠️ 노드 ${node.id}의 connected_to 파싱 실패: ${e.message}`);
                    connectedTo = [];
                }
            }
            
            // 배열이 아니거나 비어있으면 건너뛰기
            if (!Array.isArray(connectedTo) || connectedTo.length === 0) {
                return;
            }
            
            // 각 연결에 대해 connections 배열에 추가
            // 새로운 형식: {"to": "node_id", "outputType": "true"/"false"/null}
            // 기존 형식: "node_id" (문자열)
            connectedTo.forEach(connItem => {
                if (!connItem) return;
                
                // 새로운 형식 (객체)
                if (typeof connItem === 'object' && connItem.to) {
                    connections.push({
                        from: node.id,
                        to: connItem.to,
                        outputType: connItem.outputType || null
                    });
                    log(`[WorkflowPage] 연결 추가: ${node.id} → ${connItem.to} (outputType: ${connItem.outputType || 'null'})`);
                }
                // 기존 형식 (문자열) - 하위 호환성
                else if (typeof connItem === 'string') {
                    connections.push({
                        from: node.id,
                        to: connItem,
                        outputType: null
                    });
                    log(`[WorkflowPage] 연결 추가: ${node.id} → ${connItem}`);
                }
            });
        });
        
        log(`[WorkflowPage] ✅ 생성된 연결 개수: ${connections.length}개`);
        return connections;
    }

    /**
     * 노드들을 화면에 렌더링
     */
    async renderNodes(nodes, connections, nodeManager) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        
        log('[WorkflowPage] 노드 데이터가 있음. 화면에 그리기 시작...');
        log('[WorkflowPage] 노드 목록:', nodes.map(n => ({ id: n.id, type: n.type })));
        
        // 연결선 매니저가 완전히 초기화될 때까지 대기
        setTimeout(() => {
            log('[WorkflowPage] 노드 생성 시작');
            
            // 노드들 생성 (비동기 처리)
            (async () => {
                for (let index = 0; index < nodes.length; index++) {
                    const nodeData = nodes[index];
                    await this.createNodeFromServerData(nodeData, nodeManager);
                    
                    log(`[WorkflowPage] 노드 ${index + 1}/${nodes.length} 생성 중:`, {
                        id: nodeData.id,
                        type: nodeData.type
                    });
                }
                
                log('[WorkflowPage] 모든 노드 생성 완료');
                
                // 노드가 DOM에 완전히 렌더링될 때까지 대기
                requestAnimationFrame(() => {
                    this.restoreConnections(connections, nodeManager);
                    this.workflowPage.fitNodesToView();
                    
                    // 뷰포트 조정 후 연결선 위치를 다시 한 번 업데이트
                    setTimeout(() => {
                        if (nodeManager && nodeManager.connectionManager && connections.length > 0) {
                            log('[WorkflowPage] 뷰포트 조정 후 연결선 위치 최종 업데이트');
                            nodeManager.connectionManager.updateAllConnections();
                        }
                        log('[WorkflowPage] ✅ 스크립트 데이터 로드 및 화면 그리기 완료');
                    }, 150);
                });
            })();
        }, 100);
    }

    /**
     * 서버 데이터로부터 노드 생성
     */
    async createNodeFromServerData(nodeData, nodeManager) {
        const originalX = nodeData.position?.x || 0;
        const originalY = nodeData.position?.y || 0;
        
        // API 응답 형식을 NodeManager 형식으로 변환
        const nodeDataForManager = {
            id: nodeData.id,
            title: nodeData.data?.title || nodeData.id,
            type: nodeData.type,
            color: nodeData.data?.color || 'blue',
            x: originalX,
            y: originalY,
            ...nodeData.data
        };
        
        // parameters 복원
        if (nodeData.parameters && Object.keys(nodeData.parameters).length > 0) {
            if (nodeManager && nodeManager.nodeData) {
                if (!nodeManager.nodeData[nodeData.id]) {
                    nodeManager.nodeData[nodeData.id] = {};
                }
                
                const nodeType = nodeData.type;
                if (nodeType === NODE_TYPES.IMAGE_TOUCH && nodeData.parameters.folder_path) {
                    nodeManager.nodeData[nodeData.id].folder_path = nodeData.parameters.folder_path;
                    nodeDataForManager.folder_path = nodeData.parameters.folder_path;
                } else if (nodeType === NODE_TYPES.CONDITION && nodeData.parameters.condition) {
                    nodeManager.nodeData[nodeData.id].condition = nodeData.parameters.condition;
                    nodeDataForManager.condition = nodeData.parameters.condition;
                } else if (nodeType === NODE_TYPES.WAIT && nodeData.parameters.wait_time !== undefined) {
                    nodeManager.nodeData[nodeData.id].wait_time = nodeData.parameters.wait_time;
                    nodeDataForManager.wait_time = nodeData.parameters.wait_time;
                } else if (nodeType === 'process-focus') {
                    // 프로세스 포커스 노드: 프로세스 정보 복원 (비동기로 검증)
                    await this.restoreProcessFocusNode(nodeData, nodeManager, nodeDataForManager);
                }
            }
        }
        
        // description 복원
        if (nodeData.description) {
            if (nodeManager && nodeManager.nodeData) {
                if (!nodeManager.nodeData[nodeData.id]) {
                    nodeManager.nodeData[nodeData.id] = {};
                }
                nodeManager.nodeData[nodeData.id].description = nodeData.description;
                nodeDataForManager.description = nodeData.description;
            }
        }
        
        // 타입 저장
        if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeData.id]) {
            nodeManager.nodeData[nodeData.id].type = nodeData.type;
        }
        
        if (nodeManager) {
            nodeManager.createNode(nodeDataForManager);
            
            // 프로세스 포커스 노드인 경우, 노드 생성 후 내용 업데이트
            if (nodeData.type === 'process-focus' && nodeManager.nodeData[nodeData.id]) {
                const processData = nodeManager.nodeData[nodeData.id];
                if (processData.process_name || processData.process_id) {
                    // 노드가 생성된 후 내용 업데이트
                    setTimeout(() => {
                        const nodeElement = document.getElementById(nodeData.id) || 
                                          document.querySelector(`[data-node-id="${nodeData.id}"]`);
                        if (nodeElement && nodeManager.generateNodeContent) {
                            // generateNodeContent는 전체 HTML(커넥터 포함)을 반환하므로 그대로 사용
                            const updatedContent = nodeManager.generateNodeContent({
                                ...nodeDataForManager,
                                ...processData
                            });
                            
                            // 전체 innerHTML 업데이트
                            nodeElement.innerHTML = updatedContent;
                            
                            // 이벤트 리스너 재설정
                            if (nodeManager.setupNodeEventListeners) {
                                nodeManager.setupNodeEventListeners(nodeElement);
                            }
                            
                            // ConnectionManager에 노드 커넥터 다시 바인딩
                            if (nodeManager.registerNodeWithConnectionManager) {
                                nodeManager.registerNodeWithConnectionManager(nodeElement);
                            }
                            
                            // 드래그 컨트롤러 다시 연결
                            if (nodeManager.dragController) {
                                nodeManager.dragController.attachNode(nodeElement);
                            }
                        }
                    }, 100);
                }
            }
        }
    }

    /**
     * 연결선 복원
     */
    restoreConnections(connections, nodeManager) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        
        log('[WorkflowPage] 연결선 복원 준비');
        log(`[WorkflowPage] connections.length: ${connections.length}`);
        
        if (connections.length > 0) {
            if (nodeManager && nodeManager.connectionManager) {
                log('[WorkflowPage] 연결선 복원 시작');
                
                const formattedConnections = connections.map(conn => ({
                    from: conn.from,
                    to: conn.to,
                    outputType: conn.outputType || null  // 조건 노드의 출력 타입 복원
                }));
                
                log('[WorkflowPage] 연결선 데이터:', formattedConnections);
                
                try {
                    nodeManager.connectionManager.setConnections(formattedConnections);
                    log('[WorkflowPage] ✅ setConnections 호출 완료');
                    
                    setTimeout(() => {
                        log('[WorkflowPage] 연결선 위치 재계산 및 업데이트 시작');
                        try {
                            nodeManager.connectionManager.updateAllConnections();
                            log('[WorkflowPage] ✅ 연결선 복원 완료');
                        } catch (error) {
                            log(`[WorkflowPage] ❌ updateAllConnections 실패: ${error.message}`);
                            console.error(error);
                        }
                    }, 100);
                } catch (error) {
                    log(`[WorkflowPage] ❌ setConnections 실패: ${error.message}`);
                    console.error(error);
                }
            } else {
                log('[WorkflowPage] ⚠️ 연결선 매니저가 없습니다.');
            }
        } else {
            log('[WorkflowPage] ⚠️ 연결이 없어서 연결선을 그릴 수 없습니다.');
        }
    }

    /**
     * 프로세스 포커스 노드 복원 및 검증
     * 저장된 프로세스가 현재 프로세스 목록에 있는지 확인하고, 없으면 선택 안된 상태로 처리
     */
    async restoreProcessFocusNode(nodeData, nodeManager, nodeDataForManager) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        
        const params = nodeData.parameters || {};
        const savedProcessId = params.process_id;
        const savedHwnd = params.hwnd;
        const savedProcessName = params.process_name;
        const savedWindowTitle = params.window_title;
        
        // 프로세스 정보가 없으면 저장하지 않음
        if (!savedProcessId && !savedHwnd) {
            log(`[WorkflowPage] 프로세스 포커스 노드 ${nodeData.id}: 저장된 프로세스 정보 없음`);
            return;
        }
        
        try {
            // 현재 프로세스 목록 가져오기
            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/processes/list`);
            const result = await response.json();
            
            if (!result.success || !result.processes) {
                log(`[WorkflowPage] 프로세스 목록 조회 실패, 프로세스 정보 저장 안 함`);
                return;
            }
            
            // 저장된 프로세스가 현재 목록에 있는지 확인
            let foundProcess = null;
            let foundWindow = null;
            
            for (const process of result.processes) {
                // process_id로 매칭
                if (savedProcessId && process.process_id === savedProcessId) {
                    // hwnd로도 매칭 확인
                    if (savedHwnd) {
                        foundWindow = process.windows.find(w => w.hwnd === savedHwnd);
                        if (foundWindow) {
                            foundProcess = process;
                            break;
                        }
                    } else {
                        // hwnd가 없으면 프로세스명과 창 제목으로 매칭
                        if (savedProcessName && savedWindowTitle) {
                            foundWindow = process.windows.find(w => 
                                w.title === savedWindowTitle
                            );
                            if (foundWindow) {
                                foundProcess = process;
                                break;
                            }
                        } else {
                            // 첫 번째 창 사용
                            if (process.windows && process.windows.length > 0) {
                                foundProcess = process;
                                foundWindow = process.windows[0];
                                break;
                            }
                        }
                    }
                }
            }
            
            if (foundProcess && foundWindow) {
                // 프로세스를 찾았으면 정보 저장
                nodeManager.nodeData[nodeData.id].process_id = foundProcess.process_id;
                nodeManager.nodeData[nodeData.id].hwnd = foundWindow.hwnd;
                nodeManager.nodeData[nodeData.id].process_name = foundProcess.process_name;
                nodeManager.nodeData[nodeData.id].window_title = foundWindow.title;
                
                nodeDataForManager.process_id = foundProcess.process_id;
                nodeDataForManager.hwnd = foundWindow.hwnd;
                nodeDataForManager.process_name = foundProcess.process_name;
                nodeDataForManager.window_title = foundWindow.title;
                
                log(`[WorkflowPage] 프로세스 포커스 노드 ${nodeData.id}: 프로세스 복원 성공 - ${foundProcess.process_name} (${foundWindow.title})`);
            } else {
                // 프로세스를 찾지 못했으면 선택 안된 상태로 처리
                log(`[WorkflowPage] 프로세스 포커스 노드 ${nodeData.id}: 저장된 프로세스를 찾을 수 없음 (${savedProcessName || savedProcessId}), 선택 안된 상태로 처리`);
                // 프로세스 정보는 저장하지 않음 (선택 안된 상태)
            }
        } catch (error) {
            log(`[WorkflowPage] 프로세스 목록 조회 중 오류: ${error.message}, 프로세스 정보 저장 안 함`);
        }
    }
}

