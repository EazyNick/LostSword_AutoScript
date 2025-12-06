/**
 * 워크플로우 저장 서비스
 * 워크플로우 데이터를 서버에 저장하는 로직을 담당합니다.
 */

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
            const nodesForAPI = this.prepareNodesForAPI(nodes, nodeManager);
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
    prepareNodesForAPI(nodes, nodeManager) {
        return nodes.map((node) => {
            // parameters 추출 (노드 실행에 필요한 핵심 매개변수만)
            const parameters = {};
            if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[node.id]) {
                const nodeData = nodeManager.nodeData[node.id];
                const nodeType = nodeData.type || node.type;

                if (nodeType === 'image-touch') {
                    if (nodeData.folder_path) {
                        parameters.folder_path = nodeData.folder_path;
                    }
                } else if (nodeType === 'condition') {
                    if (nodeData.condition) {
                        parameters.condition = nodeData.condition;
                    }
                } else if (nodeType === 'wait') {
                    if (nodeData.wait_time !== undefined) {
                        parameters.wait_time = nodeData.wait_time;
                    }
                } else if (nodeType === 'process-focus') {
                    // 프로세스 포커스 노드: 프로세스 정보 저장
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

            // description 추출
            let description = null;
            if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[node.id]) {
                description = nodeManager.nodeData[node.id].description || null;
            }

            return {
                id: node.id,
                type: node.type,
                position: {
                    x: node.x,
                    y: node.y
                },
                data: {
                    title: node.title,
                    ...node
                },
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
