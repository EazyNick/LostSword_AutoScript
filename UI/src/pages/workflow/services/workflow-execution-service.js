/**
 * 워크플로우 실행 서비스
 * 워크플로우 실행 및 애니메이션을 담당합니다.
 */

export class WorkflowExecutionService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 워크플로우 실행
     */
    async execute() {
        const modalManager = this.workflowPage.getModalManager();
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
                this.animateExecution(nodes);
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
     */
    prepareWorkflowData(nodes) {
        const nodeList = Array.from(nodes);
        const byId = new Map(nodeList.map(n => [n.id || n.dataset.nodeId, n]));
        
        let ordered = [];
        const nodeManager = this.workflowPage.getNodeManager();
        const connections = (nodeManager && nodeManager.connectionManager)
            ? nodeManager.connectionManager.getConnections()
            : [];
            
        if (byId.has('start') && connections && connections.length > 0) {
            const nextMap = new Map();
            connections.forEach(c => {
                nextMap.set(c.from, c.to);
            });
            
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

