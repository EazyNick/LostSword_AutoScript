/**
 * 노드 업데이트 서비스
 * 노드 설정 변경 및 DOM 업데이트를 담당합니다.
 */

import { NODE_TYPES } from '../constants/node-types.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';

export class NodeUpdateService {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 업데이트
     * @param {HTMLElement} nodeElement - 업데이트할 노드 요소
     * @param {string} nodeId - 노드 ID
     */
    update(nodeElement, nodeId) {
        const logger = this.workflowPage.getLogger();
        const log = logger.log;
        const logError = logger.error;
        
        const nodeManager = this.workflowPage.getNodeManager();
        if (!nodeManager) {
            logError('NodeManager를 찾을 수 없습니다.');
            return;
        }
        
        // 폼에서 데이터 가져오기
        const formData = this.extractFormData(nodeElement, nodeId, nodeManager);
        
        // NodeManager의 노드 데이터 업데이트
        this.updateNodeData(nodeId, formData, nodeManager);
        
        // 노드 DOM 업데이트
        this.updateNodeDOM(nodeElement, formData, nodeManager);
        
        // 이미지 터치 노드인 경우 추가 처리
        if (formData.type === NODE_TYPES.IMAGE_TOUCH && formData.folder_path) {
            this.updateImageTouchNode(nodeElement, nodeId, formData, nodeManager);
        }
        
        log(`[WorkflowPage] 노드 업데이트 완료: ${nodeId}`);
        
        // 모달 닫기
        const modalManager = this.workflowPage.getModalManager();
        if (modalManager) {
            modalManager.close();
        }
        
        // 연결선 업데이트
        if (window.connectionManager) {
            setTimeout(() => {
                window.connectionManager.updateConnections();
            }, 100);
        }
    }

    /**
     * 폼에서 데이터 추출
     */
    extractFormData(nodeElement, nodeId, nodeManager) {
        const newTitle = document.getElementById('edit-node-title').value;
        const currentType = nodeManager.nodeData && nodeManager.nodeData[nodeId] 
            ? (nodeManager.nodeData[nodeId].type || nodeElement.dataset.nodeType)
            : nodeElement.dataset.nodeType;
        const isStartOrEnd = currentType === 'start' || currentType === 'end';
        let newType = isStartOrEnd ? currentType : (document.getElementById('edit-node-type')?.value || currentType);
        
        // 노드 타입 변경 시 검증 (시작/종료 노드로 변경하려는 경우)
        if (!isStartOrEnd && newType !== currentType) {
            const validation = NodeValidationUtils.validateNodeTypeChange(newType, nodeId, nodeManager);
            if (!validation.canChange) {
                const modalManager = this.workflowPage.getModalManager();
                if (modalManager) {
                    modalManager.showAlert('타입 변경 불가', validation.message);
                } else {
                    alert(validation.message);
                }
                // 원래 타입으로 되돌리기
                const nodeTypeSelect = document.getElementById('edit-node-type');
                if (nodeTypeSelect) {
                    nodeTypeSelect.value = currentType;
                }
                newType = currentType; // 원래 타입 유지
            }
        }
        
        const newColor = document.getElementById('edit-node-color').value;
        
        const position = {
            x: parseFloat(nodeElement.style.left) || 0,
            y: parseFloat(nodeElement.style.top) || 0
        };
        
        const updatedNodeData = {
            id: nodeId,
            type: newType,
            title: newTitle,
            color: newColor,
            x: position.x,
            y: position.y
        };
        
        // description 가져오기
        const description = document.getElementById('edit-node-description')?.value || '';
        if (description) {
            updatedNodeData.description = description;
        }
        
        // 타입별 추가 데이터
        if (newType === NODE_TYPES.IMAGE_TOUCH) {
            const folderPath = document.getElementById('edit-node-folder-path')?.value || '';
            if (folderPath) {
                updatedNodeData.folder_path = folderPath;
            }
        } else if (newType === NODE_TYPES.CONDITION) {
            const condition = document.getElementById('edit-node-condition')?.value || '';
            if (condition) {
                updatedNodeData.condition = condition;
            }
        } else if (newType === NODE_TYPES.WAIT) {
            const waitTime = document.getElementById('edit-node-wait-time')?.value || '1';
            updatedNodeData.wait_time = parseFloat(waitTime) || 1;
        }
        
        return updatedNodeData;
    }

    /**
     * 노드 데이터 업데이트
     */
    updateNodeData(nodeId, nodeData, nodeManager) {
        if (nodeManager.nodeData) {
            if (!nodeManager.nodeData[nodeId]) {
                nodeManager.nodeData[nodeId] = {};
            }
            
            // description 저장
            if (nodeData.description) {
                nodeManager.nodeData[nodeId].description = nodeData.description;
            } else {
                nodeManager.nodeData[nodeId].description = null;
            }
            
            // 나머지 데이터 업데이트
            Object.assign(nodeManager.nodeData[nodeId], nodeData, {
                updatedAt: new Date().toISOString()
            });
        }
    }

    /**
     * 노드 DOM 업데이트
     */
    updateNodeDOM(nodeElement, nodeData, nodeManager) {
        // 색상 클래스 업데이트
        nodeElement.className = nodeElement.className.replace(/node-\w+/g, '');
        nodeElement.classList.add(`workflow-node`, `node-${nodeData.color}`);
        
        // 노드 타입별 콘텐츠 재생성
        const nodeContent = nodeManager.generateNodeContent(nodeData);
        
        // 기존 연결점 정보 저장
        const existingInput = nodeElement.querySelector('.node-input');
        const existingOutput = nodeElement.querySelector('.node-output');
        const existingSettings = nodeElement.querySelector('.node-settings');
        
        const inputConnector = existingInput ? existingInput.outerHTML : '<div class="node-input"></div>';
        let outputConnector = '<div class="node-output"></div>';
        if (existingOutput) {
            outputConnector = existingOutput.outerHTML;
        } else {
            const outputsContainer = nodeElement.querySelector('.node-outputs');
            if (outputsContainer) {
                outputConnector = outputsContainer.outerHTML;
            }
        }
        
        nodeElement.innerHTML = `
            ${inputConnector}
            ${nodeContent}
            ${outputConnector}
            ${existingSettings ? existingSettings.outerHTML : `<div class="node-settings" data-node-id="${nodeData.id}">⚙</div>`}
        `;
        
        // 이벤트 리스너 다시 설정
        nodeManager.setupNodeEventListeners(nodeElement);
        if (nodeManager.connectionHandler) {
            nodeManager.connectionHandler.setupConnectionEvents(nodeElement);
        }
        
        // 드래그 컨트롤러 다시 연결
        if (nodeManager.dragController) {
            nodeManager.dragController.attachNode(nodeElement);
        }
    }

    /**
     * 이미지 터치 노드 업데이트
     */
    updateImageTouchNode(nodeElement, nodeId, nodeData, nodeManager) {
        // 이미지 개수 확인
        fetch(`http://localhost:8000/api/images/list?folder_path=${encodeURIComponent(nodeData.folder_path)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const count = data.count || 0;
                    nodeData.image_count = count;
                    
                    // NodeManager의 노드 데이터에도 이미지 개수 저장
                    if (nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
                        nodeManager.nodeData[nodeId].image_count = count;
                    }
                    
                    const descriptionElement = nodeElement.querySelector('.node-description');
                    const infoElement = nodeElement.querySelector('.node-info');
                    
                    if (descriptionElement) {
                        descriptionElement.textContent = nodeData.folder_path;
                    }
                    
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
            })
            .catch(e => {
                console.warn('이미지 개수 조회 실패:', e);
            });
    }
}

