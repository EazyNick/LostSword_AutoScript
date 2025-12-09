/**
 * 워크플로우 저장 서비스
 * 워크플로우 데이터를 서버에 저장하는 로직을 담당합니다.
 */

import { getNodeRegistry } from './node-registry.js';

export class WorkflowSaveService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 워크플로우 저장
     * @param {Object} options - 저장 옵션
     * @param {boolean} options.useToast - Toast 알림 사용 여부
     */
    async save(options = {}) {
        const sidebarManager = this.workflowPage.getSidebarManager();
        const currentScript = sidebarManager ? sidebarManager.getCurrentScript() : null;
        const modalManager = this.workflowPage.getModalManager();

        if (!currentScript || !currentScript.id) {
            this.showError('저장할 스크립트가 선택되지 않았습니다.', options.useToast);
            return;
        }

        try {
            const nodeManager = this.workflowPage.getNodeManager();
            const nodes = nodeManager ? nodeManager.getAllNodes() : [];
            const connections = nodeManager ? nodeManager.getAllConnections() : [];

            // NodeManager 형식을 API 형식으로 변환
            const nodesForAPI = await this.prepareNodesForAPI(nodes, nodeManager);
            const connectionsForAPI = this.prepareConnectionsForAPI(connections);

            // 백엔드 API에 저장
            const nodeAPI = this.workflowPage.getNodeAPI();
            if (nodeAPI) {
                const logger = this.workflowPage.getLogger();
                logger.log('[WorkflowPage] 저장 요청 시작:', {
                    scriptId: currentScript.id,
                    nodeCount: nodes.length,
                    connectionCount: connections.length
                });

                const response = await nodeAPI.updateNodesBatch(currentScript.id, nodesForAPI, connectionsForAPI);

                logger.log('[WorkflowPage] 저장 완료 응답:', response);

                this.showSuccess('워크플로우가 성공적으로 저장되었습니다.', options.useToast);
            } else {
                // API를 사용할 수 없는 경우 로컬 스토리지에 저장 (fallback)
                this.workflowPage.saveWorkflowToLocalStorage();
            }
        } catch (error) {
            console.error('워크플로우 저장 실패:', error);
            this.showError(`저장 중 오류가 발생했습니다: ${error.message}`, options.useToast);
        }
    }

    /**
     * 노드 데이터를 API 형식으로 변환
     */
    async prepareNodesForAPI(nodes, nodeManager) {
        const registry = getNodeRegistry();
        const allConfigs = await registry.getNodeConfigs();

        return nodes.map((node) => {
            // parameters 추출 (nodes_config.py에서 정의한 파라미터 동적 추출)
            const parameters = {};
            if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[node.id]) {
                const nodeData = nodeManager.nodeData[node.id];
                const nodeType = nodeData.type || node.type;
                const config = allConfigs[nodeType];

                // nodes_config.py에서 정의한 파라미터 추출
                if (config) {
                    // 상세 노드 타입이 있으면 상세 노드 타입의 파라미터 우선 사용
                    const detailNodeType = nodeData.action_node_type;
                    let parametersToExtract = null;

                    if (detailNodeType && config.detailTypes?.[detailNodeType]?.parameters) {
                        parametersToExtract = config.detailTypes[detailNodeType].parameters;
                    } else if (config.parameters) {
                        parametersToExtract = config.parameters;
                    }

                    // 파라미터 정의에 따라 nodeData에서 값 추출
                    if (parametersToExtract) {
                        for (const [paramKey, paramConfig] of Object.entries(parametersToExtract)) {
                            if (
                                nodeData[paramKey] !== undefined &&
                                nodeData[paramKey] !== null &&
                                nodeData[paramKey] !== ''
                            ) {
                                parameters[paramKey] = nodeData[paramKey];
                            }
                        }
                    }
                }

                // 레거시 하위 호환성 (파라미터로 처리되지 않은 경우)
                // image-touch
                if (nodeType === 'image-touch' && !parameters.folder_path && nodeData.folder_path) {
                    parameters.folder_path = nodeData.folder_path;
                }
                // condition
                if (nodeType === 'condition' && !parameters.condition && nodeData.condition) {
                    parameters.condition = nodeData.condition;
                }
                // wait
                if (nodeType === 'wait' && !parameters.wait_time && nodeData.wait_time !== undefined) {
                    parameters.wait_time = nodeData.wait_time;
                }
                // process-focus
                if (nodeType === 'process-focus') {
                    if (nodeData.process_id !== undefined) {
                        parameters.process_id = nodeData.process_id;
                    }
                    if (nodeData.hwnd !== undefined) {
                        parameters.hwnd = nodeData.hwnd;
                    }
                    if (nodeData.process_name) {
                        parameters.process_name = nodeData.process_name;
                    }
                    if (nodeData.window_title) {
                        parameters.window_title = nodeData.window_title;
                    }
                }
            }

            console.log(`[WorkflowSaveService] 노드 ${node.id} 파라미터:`, parameters);

            // description 추출
            let description = null;
            if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[node.id]) {
                description = nodeManager.nodeData[node.id].description || null;
            }

            // data 필드에 파라미터도 포함 (하위 호환성 및 UI 표시용)
            const nodeDataForAPI = {
                title: node.title,
                ...node
            };

            // 파라미터를 data에도 포함 (UI에서 표시하기 위해)
            Object.assign(nodeDataForAPI, parameters);

            return {
                id: node.id,
                type: node.type,
                position: {
                    x: node.x,
                    y: node.y
                },
                data: nodeDataForAPI,
                parameters: parameters,
                description: description
            };
        });
    }

    /**
     * 연결 데이터를 API 형식으로 변환
     */
    prepareConnectionsForAPI(connections) {
        return connections.map((conn) => ({
            from: conn.from || conn.fromNodeId,
            to: conn.to || conn.toNodeId,
            outputType: conn.outputType || null // 조건 노드의 경우 'true' 또는 'false'
        }));
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message, useToast) {
        if (useToast) {
            const toastManager = this.workflowPage.getToastManager();
            if (toastManager) {
                toastManager.success(message);
            }
        } else {
            const modalManager = this.workflowPage.getModalManager();
            if (modalManager) {
                modalManager.showAlert('저장 완료', message);
            }
        }
    }

    /**
     * 에러 메시지 표시
     */
    showError(message, useToast) {
        if (useToast) {
            const toastManager = this.workflowPage.getToastManager();
            if (toastManager) {
                toastManager.error(message);
            }
        } else {
            const modalManager = this.workflowPage.getModalManager();
            if (modalManager) {
                modalManager.showAlert('저장 실패', message);
            }
        }
    }
}
