/**
 * 워크플로우 실행 서비스
 * 워크플로우 실행 및 애니메이션을 담당합니다.
 */

export class WorkflowExecutionService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
        this.isCancelled = false; // 실행 취소 플래그
        this.isRunningAllScripts = false; // 전체 스크립트 실행 중인지 여부
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

        if (nodes.length === 0) {
            if (toastManager) {
                toastManager.warning('실행할 노드가 없습니다.');
            }
            return;
        }

        // 노드 데이터를 FastAPI 형식으로 변환
        const workflowData = this.prepareWorkflowData(nodes);

        // 실행할 노드가 없으면 종료
        if (!workflowData.nodes || workflowData.nodes.length === 0) {
            if (toastManager) {
                toastManager.warning('실행할 노드가 없습니다. 시작 노드에서 연결된 노드가 있는지 확인하세요.');
            }
            return;
        }

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

        // 전체 노드 개수 계산 (start와 end 포함)
        // prepareWorkflowData에서 start와 end를 제외하므로, 실제 화면의 모든 노드 개수를 계산
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
                    // 실행 대상에 포함되지 않은 분기 경로 노드 (end 제외)
                    if (!executedNodeIds.has(conn.to) && conn.to !== 'end') {
                        conditionBranchNodes.add(conn.to);
                    }
                });
            }
        });

        // 전체 노드 수에서 조건 노드의 실행 안 된 분기 경로 노드만 제외
        // End 노드는 포함 (정상 완료 시 성공으로 카운팅, 에러 발생 시 중단으로 카운팅)
        const totalNodeCount = allNodes.length - conditionBranchNodes.size;

        // End 노드 존재 여부 확인 (정상 완료 시 성공으로 카운팅하기 위해)
        const endNodeExists = Array.from(allNodes).some((node) => {
            const nodeId = node.id || node.dataset.nodeId;
            const nodeType = this.workflowPage.getNodeType(node);
            const title = node.querySelector('.node-title')?.textContent || '';
            return nodeId === 'end' || nodeType === 'end' || title.includes('종료');
        });

        // 디버깅: 노드 카운팅 정보 로깅
        const logger = this.workflowPage.getLogger();
        logger.log('[WorkflowExecutionService] 노드 카운팅 초기화:', {
            전체노드수: allNodes.length,
            조건분기제외: conditionBranchNodes.size,
            End노드존재: endNodeExists,
            최종노드수: totalNodeCount,
            실행대상노드: executedNodeIds.size,
            조건분기노드목록: Array.from(conditionBranchNodes)
        });

        let successCount = 0;
        let failCount = 0;
        let cancelledCount = 0;
        let currentNodeIndex = -1; // 현재 실행 중인 노드 인덱스 추적

        // Start 노드는 항상 성공으로 카운팅 (실행은 안 하지만 성공으로 간주)
        successCount = 1;

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
                            execution_mode: 'sequential'
                        })
                    });

                    const result = await response.json();

                    // 3. 실행 완료 UI 표시
                    const nodeResult = result.data?.results?.[0];

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
                        // 전체 스크립트 실행 중이면 모달 표시하지 않음 (에러는 상위에서 처리)
                        // 단일 스크립트 실행 시에만 모달 표시
                        if (!this.isRunningAllScripts && modalManager) {
                            const isImageTouchError =
                                errorMessage.includes('폴더') ||
                                errorMessage.includes('folder_path') ||
                                nodeData.type === 'image-touch';

                            if (isImageTouchError) {
                                modalManager.showAlert(`이미지 터치 노드 오류: ${nodeTitle}`, errorMessage);
                            } else {
                                modalManager.showAlert(`노드 실행 오류: ${nodeTitle}`, errorMessage);
                            }
                        }

                        failCount++;
                        throw new Error(`노드 "${nodeTitle}" 실행 실패: ${errorMessage}`);
                    } else {
                        // 성공 시
                        successCount++;
                        this.showNodeCompleted(nodeElement);
                    }
                } catch (error) {
                    // 네트워크 에러 또는 서버 에러 등
                    const logger = this.workflowPage.getLogger();
                    logger.error(`[WorkflowExecutionService] 노드 실행 오류 (${nodeData.id}):`, error);
                    this.showNodeError(nodeElement);

                    const nodeTitle = nodeData.data?.title || nodeData.type || nodeData.id;
                    const errorMessage = error.message || '알 수 없는 오류';

                    // 이미지 터치 노드의 폴더 경로 관련 에러인지 확인
                    const isImageTouchError =
                        errorMessage.includes('폴더') ||
                        errorMessage.includes('folder_path') ||
                        nodeData.type === 'image-touch';

                    // 에러 발생 시 실행 중단 (에러를 throw하여 상위로 전파)
                    // 전체 스크립트 실행 중이면 모달 표시하지 않음 (에러는 상위에서 처리)
                    // 단일 스크립트 실행 시에만 모달 표시
                    if (!this.isRunningAllScripts && modalManager) {
                        // 모달이 아직 표시되지 않은 경우에만 표시 (위에서 이미 표시했을 수 있음)
                        const modalAlreadyShown = document.querySelector('.modal.show') !== null;
                        if (!modalAlreadyShown) {
                            if (isImageTouchError) {
                                modalManager.showAlert(`이미지 터치 노드 오류: ${nodeTitle}`, errorMessage);
                            } else {
                                modalManager.showAlert(`노드 실행 오류: ${nodeTitle}`, errorMessage);
                            }
                        }
                    }

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
                // 모든 노드가 정상적으로 실행 완료된 경우, End 노드를 성공으로 카운팅
                // End 노드는 실행 대상에서 제외되지만, 워크플로우 완료 시 성공으로 간주
                if (endNodeExists && failCount === 0) {
                    // 에러가 없고 End 노드가 있으면 End 노드를 성공으로 카운팅
                    successCount++;
                    logger.log('[WorkflowExecutionService] End 노드를 성공으로 카운팅');
                }

                cancelledCount = totalNodeCount - successCount - failCount;
            }

            // 모든 노드 실행 완료 (0개여도 모두 표시)
            // 전체 스크립트 실행 중이면 토스트만 표시, 단일 실행이면 모달 표시
            if (this.isRunningAllScripts) {
                // 전체 스크립트 실행 중: 토스트만 표시 (노드 개수)
                if (toastManager) {
                    const statusMessage = this.isCancelled
                        ? `실행 취소 (성공 노드: ${successCount}개, 실패 노드: ${failCount}개, 중단 노드: ${cancelledCount}개)`
                        : `실행 완료 (성공 노드: ${successCount}개, 실패 노드: ${failCount}개, 중단 노드: ${cancelledCount}개)`;
                    if (this.isCancelled) {
                        toastManager.warning(statusMessage);
                    } else if (failCount > 0) {
                        toastManager.error(statusMessage);
                    } else {
                        toastManager.success(statusMessage);
                    }
                }
            } else {
                // 단일 스크립트 실행: 모달 표시 (노드 개수)
                if (modalManager) {
                    const statusMessage = this.isCancelled
                        ? '실행이 취소되었습니다.'
                        : '워크플로우 실행이 완료되었습니다.';
                    modalManager.showAlert(
                        this.isCancelled ? '실행 취소' : '실행 완료',
                        `${statusMessage}\n\n성공 노드: ${successCount}개\n실패 노드: ${failCount}개\n중단 노드: ${cancelledCount}개`
                    );
                } else if (toastManager) {
                    toastManager.success(`워크플로우 실행 완료 (${workflowData.nodes.length}개 노드)`);
                }
            }
        } catch (error) {
            console.error('워크플로우 실행 오류:', error);
            // 중단된 노드 개수 계산
            // 에러가 발생한 노드는 이미 failCount에 포함되어 있음
            // 에러 발생 시 End 노드는 중단으로 카운팅 (성공으로 카운팅하지 않음)
            // 성공한 노드 + 실패한 노드 + 중단된 노드 = 총 노드 수
            // 따라서: 중단 노드 = 총 노드 수 - 성공 노드 - 실패 노드
            cancelledCount = totalNodeCount - successCount - failCount;

            // 디버깅: 계산 결과 확인
            const logger = this.workflowPage.getLogger();
            logger.log('[WorkflowExecutionService] 노드 카운팅 계산:', {
                totalNodeCount: `전체 노드(Start/End 포함): ${totalNodeCount}`,
                successCount: `Start(1) + 실행 성공(${successCount - 1}) = ${successCount}`,
                failCount,
                cancelledCount: `실행 안 된 노드들(대기, 종료 등): ${cancelledCount}`,
                currentNodeIndex,
                계산: `${totalNodeCount} - ${successCount} - ${failCount} = ${cancelledCount}`
            });
            // 전체 스크립트 실행 중이면 토스트만 표시하고 에러를 다시 throw하여 상위로 전파
            if (this.isRunningAllScripts) {
                if (toastManager) {
                    toastManager.error(
                        `실행 중단 (성공 노드: ${successCount}개, 실패 노드: ${failCount}개, 중단 노드: ${cancelledCount}개) - ${error.message}`
                    );
                }
                // 전체 스크립트 실행 중이면 에러를 다시 throw하여 sidebar에서 실패로 처리
                throw error;
            } else {
                if (modalManager) {
                    modalManager.showAlert(
                        '실행 중단',
                        `워크플로우 실행 중 오류가 발생하여 실행이 중단되었습니다.\n\n성공 노드: ${successCount}개\n실패 노드: ${failCount}개\n중단 노드: ${cancelledCount}개\n\n오류: ${error.message}`
                    );
                } else if (toastManager) {
                    toastManager.error(`워크플로우 실행 중 오류가 발생했습니다: ${error.message}`);
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
    prepareWorkflowData(nodes) {
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
            const queue = ['start']; // BFS를 위한 큐

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

                        // 종료 노드가 아니면 추가
                        if (nextId !== 'end') {
                            ordered.push(nextElement);
                            queue.push(nextId);
                        } else {
                            // 종료 노드에 도달하면 종료
                            break;
                        }
                    }
                }
            }
        }

        // 연결이 없거나 시작 노드가 없으면 X 좌표 순서로 정렬
        if (ordered.length === 0) {
            ordered = nodeList.sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));
        }

        // 시작/종료 노드는 실행 대상에서 제외
        const executableNodes = ordered.filter((node) => {
            const id = node.id || node.dataset.nodeId;
            const title = node.querySelector('.node-title')?.textContent || '';
            return id !== 'start' && id !== 'end' && !title.includes('시작') && !title.includes('종료');
        });

        return {
            nodes: executableNodes.map((node) => ({
                id: node.id || node.dataset.nodeId,
                type: this.workflowPage.getNodeType(node),
                data: this.workflowPage.getNodeData(node)
            })),
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
}
