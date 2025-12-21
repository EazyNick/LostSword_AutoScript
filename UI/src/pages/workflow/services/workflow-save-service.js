/**
 * 워크플로우 저장 서비스
 * 워크플로우 데이터를 서버에 저장하는 로직을 담당합니다.
 */

import { getNodeRegistry } from './node-registry.js';
import { t } from '../../../js/utils/i18n.js';

export class WorkflowSaveService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 워크플로우 저장
     * @param {Object} options - 저장 옵션
     * @param {boolean} options.useToast - Toast 알림 사용 여부
     * @param {boolean} options.showAlert - 팝업 알림 표시 여부 (기본값: true)
     */
    async save(options = {}) {
        const sidebarManager = this.workflowPage.getSidebarManager();
        const currentScript = sidebarManager ? sidebarManager.getCurrentScript() : null;
        const modalManager = this.workflowPage.getModalManager();

        if (!currentScript || !currentScript.id) {
            this.showError(t('common.noScriptSelected'), options.useToast);
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

                this.showSuccess(t('common.workflowSaved'), options.useToast, options.showAlert);
            } else {
                // API를 사용할 수 없는 경우 로컬 스토리지에 저장 (fallback)
                this.workflowPage.saveWorkflowToLocalStorage();
            }
        } catch (error) {
            console.error('워크플로우 저장 실패:', error);
            this.showError(`${t('common.saveError')}: ${error.message}`, options.useToast, options.showAlert);
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
                            // boolean 타입은 false도 유효한 값이므로 별도 처리
                            if (paramConfig.type === 'boolean') {
                                // boolean은 undefined, null이 아닌 경우 모두 저장 (false도 유효)
                                if (nodeData[paramKey] !== undefined && nodeData[paramKey] !== null) {
                                    parameters[paramKey] = Boolean(nodeData[paramKey]);
                                } else if (paramConfig.default !== undefined) {
                                    parameters[paramKey] = Boolean(paramConfig.default);
                                }
                            } else {
                                // 다른 타입은 기존 로직 사용
                                if (
                                    nodeData[paramKey] !== undefined &&
                                    nodeData[paramKey] !== null &&
                                    nodeData[paramKey] !== ''
                                ) {
                                    parameters[paramKey] = nodeData[paramKey];
                                }
                                // 값이 없고 기본값이 있으면 기본값 사용
                                else if (paramConfig.default !== undefined && paramConfig.default !== null) {
                                    parameters[paramKey] = paramConfig.default;
                                }
                            }
                        }
                    }

                    // 필수 파라미터 검증 (기본값 적용 후)
                    if (parametersToExtract) {
                        const missingRequiredParams = [];
                        for (const [paramKey, paramConfig] of Object.entries(parametersToExtract)) {
                            if (paramConfig.required === true) {
                                // 기본값이 있으면 필수 파라미터 검증 통과
                                if (paramConfig.default !== undefined && paramConfig.default !== null) {
                                    continue;
                                }
                                // 기본값이 없고 값도 없으면 에러
                                if (
                                    parameters[paramKey] === undefined ||
                                    parameters[paramKey] === null ||
                                    parameters[paramKey] === ''
                                ) {
                                    missingRequiredParams.push(paramKey);
                                }
                            }
                        }
                        if (missingRequiredParams.length > 0) {
                            throw new Error(
                                `노드 '${node.id}' (${nodeType})에 필수 파라미터가 없습니다: ${missingRequiredParams.join(', ')}`
                            );
                        }
                    }
                }
            }

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
    async showSuccess(message, useToast, showAlert = true) {
        if (useToast) {
            // 토스트 메시지 사용 (Ctrl+S, 자동 저장 등)
            const toastManager = this.workflowPage.getToastManager();
            if (toastManager) {
                toastManager.success(message);
            }
        } else if (showAlert) {
            // 모달 팝업 사용 (저장 버튼 클릭 시, showAlert가 true인 경우만)
            const modalManager = this.workflowPage.getModalManager();
            if (modalManager) {
                await modalManager.showCenterAlert(t('common.saveComplete'), message);
            }
        }
    }

    /**
     * 에러 메시지 표시
     */
    async showError(message, useToast, showAlert = true) {
        if (useToast) {
            // 토스트 메시지 사용 (Ctrl+S, 자동 저장 등)
            const toastManager = this.workflowPage.getToastManager();
            if (toastManager) {
                toastManager.error(message);
            }
        } else if (showAlert) {
            // 모달 팝업 사용 (저장 버튼 클릭 시, showAlert가 true인 경우만)
            const modalManager = this.workflowPage.getModalManager();
            if (modalManager) {
                await modalManager.showCenterAlert(t('common.saveFailed'), message);
            }
        }
    }
}
