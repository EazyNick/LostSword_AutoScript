/**
 * 워크플로우 실행 서비스
 * 워크플로우 실행 및 애니메이션을 담당합니다.
 */

import { getResultModalManagerInstance } from '../../../js/utils/result-modal.js';
import { getNodeRegistry } from './node-registry.js';
import { getDashboardManagerInstance } from '../dashboard.js';
import { captureAndSaveScreenshot } from '../../../js/api/screenshot-api.js';
import { t } from '../../../js/utils/i18n.js';

export class WorkflowExecutionService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
        this.isCancelled = false; // 실행 취소 플래그
        this.isRunningAllScripts = false; // 전체 스크립트 실행 중인지 여부
        this.executionStartTime = null; // 실행 시작 시간
        this.allScriptsExecutionStartTime = null; // 전체 실행 시작 시간 (전체 실행 시 모든 스크립트가 공유)
        this.scriptExecutionOrder = null; // 전체 실행 시 스크립트 실행 순서 (1부터 시작)
    }

    /**
     * 실행 취소
     */
    cancel() {
        this.isCancelled = true;
        const logger = this.workflowPage.getLogger();
        logger.log('[WorkflowExecutionService] 실행 취소 요청됨');
    }

    /**
     * 취소 플래그 초기화
     */
    resetCancelFlag() {
        this.isCancelled = false;
    }

    /**
     * 워크플로우 실행
     * 시작 노드부터 연결된 순서대로 노드를 하나씩 순차적으로 실행합니다.
     * 각 노드마다 클라이언트에서 먼저 실행 UI를 표시한 후 서버에 API 요청을 보냅니다.
     */
    async execute() {
        const toastManager = this.workflowPage.getToastManager();
        const modalManager = this.workflowPage.getModalManager();
        const nodes = document.querySelectorAll('.workflow-node');

        // 실행 시작 시간 기록
        this.executionStartTime = Date.now();

        if (nodes.length === 0) {
            if (toastManager) {
                toastManager.warning('실행할 노드가 없습니다.');
            }
            return;
        }

        // 노드 데이터를 FastAPI 형식으로 변환
        const workflowData = await this.prepareWorkflowData(nodes);

        // 실행할 노드가 없으면 종료
        if (!workflowData.nodes || workflowData.nodes.length === 0) {
            if (toastManager) {
                toastManager.warning('실행할 노드가 없습니다. 시작 노드에서 연결된 노드가 있는지 확인하세요.');
            }
            return;
        }

        // 전체 노드 개수 계산 (시작 노드 포함)
        const totalNodesCount = nodes.length; // 화면의 모든 노드 개수 (시작 노드 포함)

        // 실행 중 플래그 설정 (중복 실행 방지)
        if (this.isExecuting) {
            // 실행 중인 경우 취소 처리
            if (toastManager) {
                toastManager.info('실행을 취소합니다...');
            }
            this.cancel();
            return;
        }
        this.isExecuting = true;
        this.isCancelled = false; // 취소 플래그 초기화
        this.lastExecutionId = null; // 마지막 실행 ID 저장 (로그 확인용)

        // 전체 노드 개수 계산 (start 포함)
        // prepareWorkflowData에서 start를 제외하므로, 실제 화면의 모든 노드 개수를 계산
        const allNodes = document.querySelectorAll('.workflow-node');

        // 조건 노드의 분기 경로 중 실행되지 않은 경로 노드들을 제외한 실제 실행 가능한 노드 수 계산
        // 조건 노드에서 분기가 일어나면 한 경로만 실행되므로, 실행 안 된 경로는 카운팅하지 않음
        const executedNodeIds = new Set(); // 실행 대상 노드 ID
        workflowData.nodes.forEach((node) => {
            executedNodeIds.add(node.id);
        });

        // 조건 노드의 분기 경로 중 실행 안 된 경로 노드 찾기
        const conditionBranchNodes = new Set(); // 조건 노드의 실행 안 된 분기 경로 노드 ID
        const nodeManager = this.workflowPage.getNodeManager();
        const connections =
            nodeManager && nodeManager.connectionManager ? nodeManager.connectionManager.getConnections() : [];

        // 모든 노드에서 조건 노드 찾기
        allNodes.forEach((node) => {
            const nodeId = node.id || node.dataset.nodeId;
            const nodeType = this.workflowPage.getNodeType(node);

            if (nodeType === 'condition') {
                // 조건 노드에서 나가는 모든 연결 찾기
                const branchConnections = connections.filter((c) => c.from === nodeId);
                branchConnections.forEach((conn) => {
                    // 실행 대상에 포함되지 않은 분기 경로 노드
                    if (!executedNodeIds.has(conn.to)) {
                        conditionBranchNodes.add(conn.to);
                    }
                });
            }
        });

        // 전체 노드 수에서 조건 노드의 실행 안 된 분기 경로 노드만 제외
        // 조건 분기 노드는 제외하고 카운팅
        const totalNodeCount = allNodes.length - conditionBranchNodes.size;

        // 디버깅: 노드 카운팅 정보 로깅
        const logger = this.workflowPage.getLogger();
        logger.log('[WorkflowExecutionService] 노드 카운팅 초기화:', {
            전체노드수: allNodes.length,
            조건분기제외: conditionBranchNodes.size,
            최종노드수: totalNodeCount,
            실행대상노드: executedNodeIds.size,
            조건분기노드목록: Array.from(conditionBranchNodes)
        });

        let successCount = 0;
        let failCount = 0;
        let cancelledCount = 0;
        let currentNodeIndex = -1; // 현재 실행 중인 노드 인덱스 추적

        // Start 노드는 항상 성공으로 카운팅 (실행은 하지만 성공으로 간주)
        // 시작 노드가 실행 목록에 포함되어 있으면 카운팅
        if (workflowData.nodes.some((node) => node.id === 'start' || node.type === 'start')) {
            successCount = 1;
        }

        // 노드 실행 결과 수집 (실행 결과 모달 표시용)
        const nodeResults = [];

        // 이전 노드의 실행 결과를 저장 (다음 노드 실행 시 전달)
        let previousNodeResult = null;

        try {
            // 노드를 순차적으로 실행
            for (let i = 0; i < workflowData.nodes.length; i++) {
                currentNodeIndex = i; // 현재 노드 인덱스 업데이트
                // 취소 플래그 체크
                if (this.isCancelled) {
                    const logger = this.workflowPage.getLogger();
                    logger.log('[WorkflowExecutionService] 실행이 취소되었습니다.');
                    // 남은 노드 개수를 중단 개수로 계산
                    cancelledCount = totalNodeCount - successCount - failCount;
                    // 전체 스크립트 실행 중이면 토스트만 표시
                    if (this.isRunningAllScripts) {
                        if (toastManager) {
                            toastManager.warning(
                                `실행 취소 (성공 노드: ${successCount}개, 실패 노드: ${failCount}개, 중단 노드: ${cancelledCount}개)`
                            );
                        }
                    } else {
                        // 실행 취소 시 남은 노드들을 중단으로 표시
                        for (let j = i + 1; j < workflowData.nodes.length; j++) {
                            const remainingNode = workflowData.nodes[j];
                            const remainingNodeTitle =
                                remainingNode.data?.title || remainingNode.type || remainingNode.id;
                            nodeResults.push({
                                name: remainingNodeTitle,
                                status: 'cancelled',
                                message: t('common.cancelledDueToCancellation')
                            });
                        }

                        if (modalManager) {
                            const resultModalManager = getResultModalManagerInstance();
                            resultModalManager.showExecutionResult(t('common.executionCancelled'), {
                                successCount,
                                failCount,
                                cancelledCount,
                                nodes: nodeResults,
                                summaryLabel: t('common.nodes')
                            });
                        } else if (toastManager) {
                            toastManager.warning(t('common.executionCancelledMessage'));
                        }
                    }
                    break;
                }
                const nodeData = workflowData.nodes[i];
                const nodeElement =
                    document.getElementById(nodeData.id) || document.querySelector(`[data-node-id="${nodeData.id}"]`);

                if (!nodeElement) {
                    console.warn(`노드 요소를 찾을 수 없습니다: ${nodeData.id}`);
                    continue;
                }

                // 1. 클라이언트에서 먼저 실행 UI 표시 (깜빡깜빡 애니메이션)
                this.showNodeExecuting(nodeElement);

                // 2. 서버에 단일 노드 실행 요청
                try {
                    const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
                    const response = await fetch(`${apiBaseUrl}/api/execute-nodes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nodes: [nodeData],
                            execution_mode: 'sequential',
                            total_nodes: totalNodesCount, // 전체 노드 개수 (시작 노드 포함)
                            current_node_index: i, // 현재 노드 순번 (0부터 시작)
                            previous_node_result: previousNodeResult // 이전 노드의 실행 결과
                        })
                    });

                    const result = await response.json();

                    // execution_id 저장 (로그 확인용)
                    if (result.data?.execution_id) {
                        this.lastExecutionId = result.data.execution_id;
                    }

                    // 3. 실행 완료 UI 표시
                    const nodeResult = result.data?.results?.[0];

                    // 노드 실행 완료 후 스크린샷 캡처 (비동기, 백그라운드 실행)
                    // 모든 노드에 대해 스크린샷 캡처 (실패한 노드도 포함)
                    // 스크립트 이름과 노드 이름 가져오기
                    const currentScript = this.workflowPage?.getCurrentScript();
                    const scriptName = currentScript?.name || 'Unknown';
                    const nodeName = nodeData.data?.title || nodeData.type || nodeData.id;
                    const isRunningAllScripts = this.isRunningAllScripts || false;
                    // 실행 시작 시간을 ISO 형식으로 변환 (날짜+시간 폴더 생성용)
                    // 전체 실행인 경우 전체 실행 시작 시간을 우선 사용, 없으면 현재 스크립트 실행 시작 시간 사용
                    const executionStartTime =
                        this.isRunningAllScripts && this.allScriptsExecutionStartTime
                            ? this.allScriptsExecutionStartTime
                            : this.executionStartTime
                              ? new Date(this.executionStartTime).toISOString()
                              : new Date().toISOString();
                    // 전체 실행 시 스크립트 실행 순서 전달
                    const scriptExecutionOrder = this.isRunningAllScripts ? this.scriptExecutionOrder : null;

                    // 스크린샷 캡처는 비동기로 실행하여 노드 실행 흐름을 차단하지 않음
                    captureAndSaveScreenshot(
                        nodeData.id,
                        nodeData.type,
                        scriptName,
                        nodeName,
                        isRunningAllScripts,
                        executionStartTime,
                        scriptExecutionOrder
                    ).catch((error) => {
                        const logger = this.workflowPage.getLogger();
                        logger.warn('[WorkflowExecutionService] 스크린샷 캡처 실패 (무시):', error);
                    });

                    // 노드 실행 결과를 DOM에 저장 (새로운 표준 형식: {action, status, output: {...}})
                    if (nodeResult) {
                        // nodeManager에 실행 결과 저장
                        const nodeManager = this.workflowPage.getNodeManager();
                        if (nodeManager && nodeManager.nodeData) {
                            const nodeId = nodeData.id;
                            if (!nodeManager.nodeData[nodeId]) {
                                nodeManager.nodeData[nodeId] = {};
                            }
                            // 실행 결과 저장 (표준 형식: {action, status, output: {...}})
                            nodeManager.nodeData[nodeId].result = nodeResult;
                            // output 필드가 dict인지 확인하고 저장
                            if (nodeResult.output && typeof nodeResult.output === 'object') {
                                nodeManager.nodeData[nodeId].output = nodeResult.output;
                            }
                        }

                        // condition 노드인 경우 결과에 따라 다음 노드 동적으로 선택
                        if (
                            nodeData.type === 'condition' &&
                            nodeResult.output &&
                            typeof nodeResult.output.result === 'boolean'
                        ) {
                            const conditionResult = nodeResult.output.result;
                            const logger = this.workflowPage.getLogger();
                            logger.log(`[WorkflowExecutionService] Condition 노드 결과: ${conditionResult}`);

                            // condition 노드의 연결 정보 가져오기
                            const connectionManager = nodeManager?.connectionManager;
                            if (connectionManager) {
                                const connections = connectionManager.getConnections();
                                const conditionConnections = connections.filter((c) => c.from === nodeData.id);

                                // 실행되지 않은 경로의 노드들을 workflowData.nodes에서 제거
                                const outputTypeToKeep = conditionResult ? 'true' : 'false';
                                const outputTypeToRemove = conditionResult ? 'false' : 'true';

                                // 제거할 노드 ID 찾기 (실행되지 않은 경로)
                                const nodesToRemove = new Set();
                                conditionConnections.forEach((conn) => {
                                    if (conn.outputType === outputTypeToRemove) {
                                        nodesToRemove.add(conn.to);
                                        // 재귀적으로 해당 경로의 모든 하위 노드도 제거
                                        this._collectNodesToRemove(conn.to, connections, nodesToRemove, nodeData.id);
                                    }
                                });

                                // workflowData.nodes에서 제거할 노드들 필터링
                                if (nodesToRemove.size > 0) {
                                    logger.log(
                                        `[WorkflowExecutionService] Condition 결과에 따라 제거할 노드: ${Array.from(nodesToRemove).join(', ')}`
                                    );
                                    workflowData.nodes = workflowData.nodes.filter(
                                        (node) => !nodesToRemove.has(node.id)
                                    );
                                }
                            }
                        }

                        // 이전 노드 결과 업데이트 (다음 노드 실행 시 전달)
                        previousNodeResult = {
                            ...nodeResult,
                            node_id: nodeData.id,
                            node_name: nodeData.data?.title || nodeData.type || nodeData.id
                        };
                    }

                    // 노드 결과에서 에러 확인 (status가 "failed"이거나 error 필드가 있는 경우)
                    const isNodeFailed =
                        nodeResult?.status === 'failed' ||
                        nodeResult?.error ||
                        (nodeResult?.output && nodeResult.output.error);

                    // 서버 레벨 에러 또는 노드 레벨 에러 확인
                    if (result.success === false || isNodeFailed) {
                        // 에러 발생 시
                        this.showNodeError(nodeElement);

                        const nodeTitle = nodeData.data?.title || nodeData.type || nodeData.id;
                        let errorMessage = '알 수 없는 오류';

                        // 에러 메시지 추출 (우선순위: nodeResult.error > nodeResult.output.error > nodeResult.message > result.message)
                        if (nodeResult?.error) {
                            errorMessage = nodeResult.error;
                        } else if (nodeResult?.output?.error) {
                            errorMessage = nodeResult.output.error;
                        } else if (nodeResult?.message) {
                            errorMessage = nodeResult.message;
                        } else if (result.message) {
                            errorMessage = result.message;
                        } else if (result.detail) {
                            errorMessage = result.detail;
                        }

                        // 에러 발생 시 실행 중단 (에러를 throw하여 상위로 전파)
                        // failCount는 catch 블록에서 증가시키므로 여기서는 증가시키지 않음
                        throw new Error(`노드 "${nodeTitle}" 실행 실패: ${errorMessage}`);
                    } else {
                        // 성공 시
                        successCount++;
                        this.showNodeCompleted(nodeElement);

                        // 노드 실행 결과 수집
                        const nodeTitle = nodeData.data?.title || nodeData.type || nodeData.id;
                        nodeResults.push({
                            name: nodeTitle,
                            status: 'success',
                            message: t('common.executionCompletedSuccessfully')
                        });
                    }
                } catch (error) {
                    // 네트워크 에러 또는 서버 에러 등
                    // 노드 실행 실패는 여기서 한 번만 카운팅
                    const logger = this.workflowPage.getLogger();
                    logger.error(`[WorkflowExecutionService] 노드 실행 오류 (${nodeData.id}):`, error);
                    this.showNodeError(nodeElement);

                    // 에러 발생 시에도 스크린샷 캡처 (에러 상황 기록용)
                    const currentScript = this.workflowPage?.getCurrentScript();
                    const scriptName = currentScript?.name || 'Unknown';
                    const nodeName = nodeData.data?.title || nodeData.type || nodeData.id;
                    const isRunningAllScripts = this.isRunningAllScripts || false;
                    // 전체 실행인 경우 전체 실행 시작 시간을 우선 사용, 없으면 현재 스크립트 실행 시작 시간 사용
                    const executionStartTime =
                        this.isRunningAllScripts && this.allScriptsExecutionStartTime
                            ? this.allScriptsExecutionStartTime
                            : this.executionStartTime
                              ? new Date(this.executionStartTime).toISOString()
                              : new Date().toISOString();
                    // 전체 실행 시 스크립트 실행 순서 전달
                    const scriptExecutionOrder = this.isRunningAllScripts ? this.scriptExecutionOrder : null;

                    captureAndSaveScreenshot(
                        nodeData.id,
                        nodeData.type,
                        scriptName,
                        nodeName,
                        isRunningAllScripts,
                        executionStartTime,
                        scriptExecutionOrder
                    ).catch((screenshotError) => {
                        logger.warn(
                            '[WorkflowExecutionService] 에러 발생 시 스크린샷 캡처 실패 (무시):',
                            screenshotError
                        );
                    });

                    const nodeTitle = nodeData.data?.title || nodeData.type || nodeData.id;
                    const errorMessage = error.message || '알 수 없는 오류';

                    // 노드 실행 결과 수집 (실패)
                    nodeResults.push({
                        name: nodeTitle,
                        status: 'failed',
                        error: errorMessage,
                        message: errorMessage
                    });

                    // 노드 실행 실패 카운팅 (한 번만 증가)
                    failCount++;
                    throw error; // 원본 에러를 그대로 전파
                }

                // 취소 플래그 체크
                if (this.isCancelled) {
                    const logger = this.workflowPage.getLogger();
                    logger.log('[WorkflowExecutionService] 실행이 취소되었습니다.');
                    // 남은 노드 개수를 중단 개수로 계산
                    cancelledCount = totalNodeCount - successCount - failCount;
                    // 전체 스크립트 실행 중이면 토스트만 표시
                    if (this.isRunningAllScripts) {
                        if (toastManager) {
                            toastManager.warning(
                                `실행 취소 (성공 노드: ${successCount}개, 실패 노드: ${failCount}개, 중단 노드: ${cancelledCount}개)`
                            );
                        }
                    } else {
                        if (modalManager) {
                            modalManager.showAlert(
                                '실행 취소',
                                `실행이 취소되었습니다.\n\n성공 노드: ${successCount}개\n실패 노드: ${failCount}개\n중단 노드: ${cancelledCount}개`
                            );
                        } else if (toastManager) {
                            toastManager.warning('실행이 취소되었습니다.');
                        }
                    }
                    break;
                }

                // 노드 간 대기 시간 (선택적, 필요시 조정)
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // 중단된 노드 개수 계산 (취소되지 않았으면 0)
            if (!this.isCancelled) {
                cancelledCount = totalNodeCount - successCount - failCount;
            }

            // 모든 노드 실행 완료 (0개여도 모두 표시)
            // 전체 스크립트 실행 중이면 토스트만 표시, 단일 실행이면 모달 표시
            if (this.isRunningAllScripts) {
                // 전체 스크립트 실행 중: 토스트만 표시 (노드 개수)
                if (toastManager) {
                    const statusMessage = this.isCancelled
                        ? `${t('common.executionCancelled')} (${t('common.successNodes')}: ${successCount}, ${t('common.failedNodes')}: ${failCount}, ${t('common.cancelledNodes')}: ${cancelledCount})`
                        : `${t('common.executionCompleted')} (${t('common.successNodes')}: ${successCount}, ${t('common.failedNodes')}: ${failCount}, ${t('common.cancelledNodes')}: ${cancelledCount})`;
                    if (this.isCancelled) {
                        toastManager.warning(statusMessage);
                    } else if (failCount > 0) {
                        toastManager.error(statusMessage);
                    } else {
                        toastManager.success(statusMessage);
                    }
                }
            } else {
                // 단일 스크립트 실행: 실행 결과 모달 표시 (가운데 팝업)
                if (modalManager) {
                    const title = this.isCancelled ? t('common.executionCancelled') : t('common.executionCompleted');
                    const resultModalManager = getResultModalManagerInstance();
                    resultModalManager.showExecutionResult(title, {
                        successCount,
                        failCount,
                        cancelledCount,
                        nodes: nodeResults,
                        summaryLabel: t('common.nodes')
                    });
                } else if (toastManager) {
                    toastManager.success(
                        `${t('common.workflowExecutionCompleted')} (${workflowData.nodes.length} ${t('common.nodes')})`
                    );
                }

                // 폴백 경로에서 실행 기록 페이지에 로그 업데이트 알림 (성공 시)
                // (executeSingleScript를 사용하지 않는 경우에만)
                const currentScript = this.workflowPage?.getCurrentScript();
                if (currentScript && currentScript.id && !this.isRunningAllScripts) {
                    document.dispatchEvent(
                        new CustomEvent('logsUpdated', {
                            detail: {
                                type: 'workflowExecutionCompleted',
                                scriptId: currentScript.id,
                                scriptName: currentScript.name
                            }
                        })
                    );
                }
            }
        } catch (error) {
            console.error('워크플로우 실행 오류:', error);
            // 중단된 노드 개수 계산
            // 에러가 발생한 노드는 이미 failCount에 포함되어 있음
            // 성공한 노드 + 실패한 노드 + 중단된 노드 = 총 노드 수
            // 따라서: 중단 노드 = 총 노드 수 - 성공 노드 - 실패 노드
            cancelledCount = totalNodeCount - successCount - failCount;

            // 디버깅: 계산 결과 확인
            const logger = this.workflowPage.getLogger();
            logger.log('[WorkflowExecutionService] 노드 카운팅 계산:', {
                totalNodeCount: `전체 노드(Start 포함): ${totalNodeCount}`,
                successCount: successCount,
                failCount,
                cancelledCount: `실행 안 된 노드들: ${cancelledCount}`,
                currentNodeIndex,
                계산: `${totalNodeCount} - ${successCount} - ${failCount} = ${cancelledCount}`
            });

            // 단일 스크립트 실행 시 예외 발생 시에도 실행 기록 저장 및 로그 업데이트는 executeSingleScript에서 처리
            // (전체 실행이 아닐 때만 executeSingleScript가 호출되므로 여기서는 제거)

            // 전체 스크립트 실행 중이면 토스트만 표시하고 에러를 다시 throw하여 상위로 전파
            if (this.isRunningAllScripts) {
                if (toastManager) {
                    toastManager.error(
                        `${t('common.executionInterrupted')} (${t('common.successNodes')}: ${successCount}, ${t('common.failedNodes')}: ${failCount}, ${t('common.cancelledNodes')}: ${cancelledCount}) - ${error.message}`
                    );
                }
                // 전체 스크립트 실행 중이면 에러를 다시 throw하여 sidebar에서 실패로 처리
                throw error;
            } else {
                // 실행 중단 시 남은 노드들을 중단으로 표시
                const failedNodeIndex = currentNodeIndex || 0;
                for (let j = failedNodeIndex + 1; j < workflowData.nodes.length; j++) {
                    const remainingNode = workflowData.nodes[j];
                    const remainingNodeTitle = remainingNode.data?.title || remainingNode.type || remainingNode.id;
                    // 이미 추가되지 않은 경우에만 추가
                    const alreadyAdded = nodeResults.some((r) => r.name === remainingNodeTitle);
                    if (!alreadyAdded) {
                        nodeResults.push({
                            name: remainingNodeTitle,
                            status: 'cancelled',
                            message: t('common.cancelledDueToError')
                        });
                    }
                }

                // 폴백 경로에서 실행 기록 페이지에 로그 업데이트 알림 (실패 시)
                const currentScript = this.workflowPage?.getCurrentScript();
                if (currentScript && currentScript.id) {
                    document.dispatchEvent(
                        new CustomEvent('logsUpdated', {
                            detail: {
                                type: 'workflowExecutionFailed',
                                scriptId: currentScript.id,
                                scriptName: currentScript.name
                            }
                        })
                    );
                }

                if (modalManager) {
                    const resultModalManager = getResultModalManagerInstance();
                    resultModalManager.showExecutionResult(t('common.executionInterrupted'), {
                        successCount,
                        failCount,
                        cancelledCount,
                        nodes: nodeResults,
                        summaryLabel: t('common.nodes')
                    });
                } else if (toastManager) {
                    toastManager.error(`${t('common.workflowExecutionError')}: ${error.message}`);
                }
                // 단일 스크립트 실행 중이면 에러를 다시 throw
                throw error;
            }
        } finally {
            // 실행 중 플래그 해제
            this.isExecuting = false;
            // 전체 스크립트 실행 플래그는 sidebar에서 관리하므로 여기서는 초기화하지 않음
        }
    }

    /**
     * 노드 실행 중 UI 표시 (깜빡깜빡 애니메이션)
     */
    showNodeExecuting(nodeElement) {
        nodeElement.classList.add('executing');
        nodeElement.classList.remove('completed', 'error');
    }

    /**
     * 노드 실행 완료 UI 표시
     */
    showNodeCompleted(nodeElement) {
        nodeElement.classList.remove('executing');
        nodeElement.classList.add('completed');

        // 1초 후 완료 상태 제거
        setTimeout(() => {
            nodeElement.classList.remove('completed');
        }, 1000);
    }

    /**
     * 노드 실행 에러 UI 표시
     */
    showNodeError(nodeElement) {
        nodeElement.classList.remove('executing');
        nodeElement.classList.add('error');

        // 2초 후 에러 상태 제거
        setTimeout(() => {
            nodeElement.classList.remove('error');
        }, 2000);
    }

    /**
     * 실행된 노드 순서대로 DOM 요소 가져오기
     */
    getOrderedNodeElements(executedNodes) {
        const nodeElements = [];
        executedNodes.forEach((nodeData) => {
            const element =
                document.getElementById(nodeData.id) || document.querySelector(`[data-node-id="${nodeData.id}"]`);
            if (element) {
                nodeElements.push(element);
            }
        });
        return nodeElements;
    }

    /**
     * 워크플로우 데이터 준비
     * 시작 노드부터 연결된 순서대로 노드를 정렬합니다.
     * 조건 노드의 분기는 현재는 첫 번째 연결만 따라갑니다 (향후 조건 평가 로직 추가 필요).
     */
    async prepareWorkflowData(nodes) {
        const nodeList = Array.from(nodes);
        const byId = new Map(nodeList.map((n) => [n.id || n.dataset.nodeId, n]));

        let ordered = [];
        const nodeManager = this.workflowPage.getNodeManager();
        const connections =
            nodeManager && nodeManager.connectionManager ? nodeManager.connectionManager.getConnections() : [];

        // 시작 노드가 있고 연결이 있으면 연결 순서대로 정렬
        if (byId.has('start') && connections && connections.length > 0) {
            // 연결 맵 생성: from -> [to1, to2, ...] (여러 분기 지원)
            const nextMap = new Map(); // Map<from, Array<{to, outputType}>>

            connections.forEach((c) => {
                if (!nextMap.has(c.from)) {
                    nextMap.set(c.from, []);
                }
                nextMap.get(c.from).push({
                    to: c.to,
                    outputType: c.outputType || null
                });
            });

            // 시작 노드부터 순차적으로 탐색
            const visited = new Set();
            const addedToOrdered = new Set(); // ordered에 추가된 노드 ID 추적 (중복 방지)
            const queue = ['start']; // BFS를 위한 큐

            // 시작 노드를 ordered에 먼저 추가
            if (byId.has('start')) {
                const startElement = byId.get('start');
                ordered.push(startElement);
                addedToOrdered.add('start');
            }

            while (queue.length > 0) {
                const cur = queue.shift();

                // 이미 방문한 노드는 건너뛰기 (순환 방지)
                if (visited.has(cur)) {
                    continue;
                }

                visited.add(cur);

                // 현재 노드에서 나가는 연결이 있으면
                if (nextMap.has(cur)) {
                    const nextNodes = nextMap.get(cur);

                    // 조건 노드가 아닌 경우: 첫 번째 연결만 따라감
                    // 조건 노드인 경우: 향후 조건 평가 결과에 따라 분기 (현재는 첫 번째 연결만)
                    const nextNode = nextNodes[0]; // 현재는 첫 번째 연결만 사용

                    if (nextNode && byId.has(nextNode.to)) {
                        const nextElement = byId.get(nextNode.to);
                        const nextId = nextElement.id || nextElement.dataset.nodeId;

                        // 아직 ordered에 추가되지 않은 노드만 추가
                        if (!addedToOrdered.has(nextId)) {
                            ordered.push(nextElement);
                            addedToOrdered.add(nextId); // 추가된 노드 ID 기록
                            queue.push(nextId);
                        }
                    }
                }
            }
        }

        // 연결이 없거나 시작 노드가 없으면 X 좌표 순서로 정렬
        if (ordered.length === 0) {
            ordered = nodeList.sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));
        }

        // 모든 노드를 실행 대상에 포함 (시작 노드도 포함)
        const executableNodes = ordered;

        // parameters 추출을 위한 설정 가져오기 (nodeManager는 이미 위에서 선언됨)
        const registry = getNodeRegistry();
        const allConfigs = await registry.getNodeConfigs();

        // 각 노드에 대해 parameters 추출 (workflow-save-service.js와 동일한 로직)
        const nodesWithParameters = await Promise.all(
            executableNodes.map(async (node) => {
                const nodeId = node.id || node.dataset.nodeId;
                const nodeType = this.workflowPage.getNodeType(node);
                const nodeData = this.workflowPage.getNodeData(node);

                // parameters 추출
                const parameters = {};
                if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
                    const config = allConfigs[nodeType];

                    if (config) {
                        // 상세 노드 타입이 있으면 상세 노드 타입의 파라미터 우선 사용
                        const detailNodeType = nodeData?.action_node_type;
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
                                    if (nodeData && nodeData[paramKey] !== undefined && nodeData[paramKey] !== null) {
                                        parameters[paramKey] = Boolean(nodeData[paramKey]);
                                    } else if (paramConfig.default !== undefined) {
                                        parameters[paramKey] = Boolean(paramConfig.default);
                                    }
                                } else {
                                    // 다른 타입은 기존 로직 사용
                                    if (
                                        nodeData &&
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
                                    `노드 '${nodeId}' (${nodeType})에 필수 파라미터가 없습니다: ${missingRequiredParams.join(', ')}`
                                );
                            }
                        }
                    }
                }

                return {
                    id: nodeId,
                    type: nodeType,
                    data: nodeData || {},
                    parameters: parameters
                };
            })
        );

        return {
            nodes: nodesWithParameters,
            execution_mode: 'sequential'
        };
    }

    /**
     * 실행 애니메이션
     */
    animateExecution(nodes) {
        const nodeList = Array.from(nodes);
        nodeList.forEach((node, index) => {
            setTimeout(() => {
                node.classList.add('executing');
                setTimeout(() => {
                    node.classList.remove('executing');
                }, 500);
            }, index * 300);
        });
    }

    /**
     * 재귀적으로 제거할 노드 수집 (condition 노드의 실행되지 않은 경로)
     * @param {string} nodeId - 시작 노드 ID
     * @param {Array} connections - 모든 연결 정보
     * @param {Set} nodesToRemove - 제거할 노드 ID 집합
     * @param {string} conditionNodeId - condition 노드 ID (순환 방지용)
     */
    _collectNodesToRemove(nodeId, connections, nodesToRemove, conditionNodeId) {
        // 이미 추가된 노드는 건너뛰기
        if (nodesToRemove.has(nodeId) || nodeId === conditionNodeId) {
            return;
        }

        nodesToRemove.add(nodeId);

        // 해당 노드에서 나가는 연결 찾기
        const outgoingConnections = connections.filter((c) => c.from === nodeId);
        outgoingConnections.forEach((conn) => {
            // 재귀적으로 수집
            if (!nodesToRemove.has(conn.to)) {
                this._collectNodesToRemove(conn.to, connections, nodesToRemove, conditionNodeId);
            }
        });
    }
}
