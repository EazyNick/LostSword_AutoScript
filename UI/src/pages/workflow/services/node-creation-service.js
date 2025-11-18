/**
 * 노드 생성 서비스
 * 노드 생성 및 초기 설정을 담당합니다.
 */

import { NODE_TYPES } from '../constants/node-types.js';

export class NodeCreationService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 데이터로부터 노드 생성
     * @param {Object} nodeData - 노드 데이터
     */
    createFromData(nodeData) {
        const nodeManager = this.workflowPage.getNodeManager();
        if (!nodeManager) {
            console.error('NodeManager를 찾을 수 없습니다.');
            return null;
        }
        
        const createdNode = nodeManager.createNode(nodeData);
        const nodeType = nodeData.type;
        
        // 이미지 터치 노드인 경우 이미지 개수 확인 및 표시
        if (nodeType === NODE_TYPES.IMAGE_TOUCH && nodeData.folder_path) {
            this.updateImageCountForNode(createdNode, nodeData, nodeManager);
        }
        
        return createdNode;
    }

    /**
     * 이미지 개수 업데이트
     */
    async updateImageCountForNode(nodeElement, nodeData, nodeManager) {
        try {
            const response = await fetch(
                `http://localhost:8000/api/images/list?folder_path=${encodeURIComponent(nodeData.folder_path)}`
            );
            const data = await response.json();
            
            if (data.success && nodeElement) {
                const count = data.count || 0;
                nodeData.image_count = count;
                
                // NodeManager의 노드 데이터에도 이미지 개수 저장
                if (nodeManager.nodeData && nodeManager.nodeData[nodeData.id]) {
                    nodeManager.nodeData[nodeData.id].image_count = count;
                }
                
                const infoElement = nodeElement.querySelector('.node-info');
                if (infoElement) {
                    infoElement.textContent = `${count}개 이미지`;
                } else if (count > 0) {
                    const contentElement = nodeElement.querySelector('.node-content');
                    if (contentElement) {
                        const info = document.createElement('div');
                        info.className = 'node-info';
                        info.textContent = `${count}개 이미지`;
                        contentElement.appendChild(info);
                    }
                }
            }
        } catch (e) {
            console.warn('이미지 개수 조회 실패:', e);
        }
    }

    /**
     * 기본 경계 노드 생성
     */
    createDefaultBoundaryNodes() {
        const nodeManager = this.workflowPage.getNodeManager();
        if (!nodeManager) {
            console.error('NodeManager를 찾을 수 없습니다.');
            return;
        }
        
        // 이미 start/end 노드가 있는지 확인
        const nodeElements = nodeManager.nodes ? nodeManager.nodes.map(n => n.element) : [];
        const nodeData = nodeManager.nodeData || {};
        
        const hasStartNode = nodeElements.some(nodeElement => {
            const nodeId = nodeElement.id || nodeElement.dataset?.nodeId;
            return nodeId === 'start' || 
                   nodeData[nodeId]?.type === 'start' ||
                   nodeElement.querySelector('.node-title')?.textContent?.includes('시작');
        });
        
        const hasEndNode = nodeElements.some(nodeElement => {
            const nodeId = nodeElement.id || nodeElement.dataset?.nodeId;
            return nodeId === 'end' || 
                   nodeData[nodeId]?.type === 'end' ||
                   nodeElement.querySelector('.node-title')?.textContent?.includes('종료');
        });
        
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        log(`[NodeCreationService] 기본 경계 노드 생성 시도 - start 존재: ${hasStartNode}, end 존재: ${hasEndNode}`);
        
        const baseX = 0;
        const baseY = 0;
        
        const boundaryNodes = [];
        
        // start 노드가 없을 때만 추가
        if (!hasStartNode) {
            boundaryNodes.push({
                id: 'start',
                type: 'start',
                title: '시작',
                color: 'green',
                x: baseX - 200,
                y: baseY
            });
        }
        
        // end 노드가 없을 때만 추가
        if (!hasEndNode) {
            boundaryNodes.push({
                id: 'end',
                type: 'end',
                title: '종료',
                color: 'gray',
                x: baseX + 200,
                y: baseY
            });
        }
        
        if (boundaryNodes.length === 0) {
            log('[NodeCreationService] 이미 경계 노드가 존재하여 기본 경계 노드를 생성하지 않습니다.');
            return;
        }
        
        log(`[NodeCreationService] ${boundaryNodes.length}개의 경계 노드 생성 중...`);
        
        boundaryNodes.forEach(nodeData => {
            try {
                nodeManager.createNode(nodeData);
                log(`[NodeCreationService] 경계 노드 생성 완료: ${nodeData.id}`);
            } catch (error) {
                console.error('노드 생성 실패:', error);
            }
        });
        
        // 연결선 매니저가 초기화되면 위치 업데이트
        setTimeout(() => {
            if (nodeManager && nodeManager.connectionManager) {
                nodeManager.connectionManager.updateAllConnections();
            }
            
            // 기본 노드들이 화면에 보이도록 뷰포트 조정
            this.workflowPage.fitNodesToView();
        }, 300);
    }
}

