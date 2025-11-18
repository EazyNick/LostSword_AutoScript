/**
 * 노드 설정 모달 관리
 * 노드 설정 모달의 UI 생성 및 이벤트 처리를 담당합니다.
 */

import { getDefaultDescription } from '../config/node-defaults.js';
import { NODE_TYPES, isBoundaryNode, NODE_TYPE_LABELS } from '../constants/node-types.js';
import { escapeHtml, getNodeType, getNodeData } from '../utils/node-utils.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';

export class NodeSettingsModal {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 설정 모달 표시
     * @param {HTMLElement} nodeElement - 설정할 노드 요소
     */
    show(nodeElement) {
        const modalManager = this.workflowPage.getModalManager();
        if (!modalManager) {
            console.error('ModalManager를 사용할 수 없습니다.');
            return;
        }

        const logger = this.workflowPage.getLogger();
        const log = logger.log;

        const nodeId = nodeElement.id || nodeElement.dataset.nodeId;
        const nodeManager = this.workflowPage.getNodeManager();
        
        // 저장된 노드 데이터 가져오기
        let nodeData = getNodeData(nodeElement);
        
        // 노드 타입 확인
        const nodeType = nodeData?.type || getNodeType(nodeElement);
        const currentTitle = nodeElement.querySelector('.node-title')?.textContent || '';
        const currentColor = nodeElement.className.match(/node-(\w+)/)?.[1] || 'blue';
        
        // description이 없으면 기본 설명 사용
        const currentDescription = nodeData?.description || getDefaultDescription(nodeType);
        
        log(`[WorkflowPage] 노드 설정 모달 열기: ${nodeId}, 타입: ${nodeType}`);
        
        // 노드 타입별 설정 UI 생성
        const typeSpecificSettings = this.generateTypeSpecificSettings(nodeType, nodeData);
        
        // 모달 콘텐츠 생성
        const content = this.generateModalContent(
            nodeType,
            currentTitle,
            currentColor,
            currentDescription,
            typeSpecificSettings
        );
        
        modalManager.show(content);
        
        // 이벤트 리스너 설정
        this.setupEventListeners(nodeElement, nodeId, nodeType, nodeData);
    }

    /**
     * 타입별 설정 UI 생성
     */
    generateTypeSpecificSettings(nodeType, nodeData) {
        if (nodeType === NODE_TYPES.IMAGE_TOUCH) {
            const folderPath = nodeData?.folder_path || '';
            const imageCount = nodeData?.image_count || 0;
            const imageCountText = imageCount > 0 ? ` <span style="color: #666; font-weight: normal;">(${imageCount}개 이미지)</span>` : '';
            return `
                <div class="form-group">
                    <label for="edit-node-folder-path">이미지 폴더 경로${imageCountText}:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="edit-node-folder-path" value="${escapeHtml(folderPath)}" placeholder="예: C:\\images\\touch" style="flex: 1;">
                        <button type="button" id="edit-browse-folder-btn" class="btn btn-secondary">폴더 선택</button>
                    </div>
                    <small style="color: #666; font-size: 12px;">이미지 파일 이름 순서대로 화면에서 찾아 터치합니다.</small>
                </div>
            `;
        } else if (nodeType === NODE_TYPES.CONDITION) {
            const condition = nodeData?.condition || '';
            return `
                <div class="form-group">
                    <label for="edit-node-condition">조건 설정:</label>
                    <input type="text" id="edit-node-condition" value="${escapeHtml(condition)}" placeholder="조건을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `;
        } else if (nodeType === NODE_TYPES.WAIT) {
            const waitTime = nodeData?.wait_time || 1;
            return `
                <div class="form-group">
                    <label for="edit-node-wait-time">대기 시간 (초):</label>
                    <input type="number" id="edit-node-wait-time" value="${waitTime}" min="0" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            `;
        }
        return '';
    }

    /**
     * 모달 콘텐츠 생성
     */
    generateModalContent(nodeType, currentTitle, currentColor, currentDescription, typeSpecificSettings) {
        const nodeTypeSelect = isBoundaryNode(nodeType)
            ? `<input type="text" value="${NODE_TYPE_LABELS[nodeType] || nodeType}" disabled style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5; color: #666;">
               <small style="color: #666; font-size: 12px;">시작/종료 노드는 타입을 변경할 수 없습니다.</small>`
            : this.generateNodeTypeSelect(nodeType);

        return `
            <h3>노드 설정</h3>
            <div class="form-group">
                <label for="edit-node-title">노드 제목:</label>
                <input type="text" id="edit-node-title" value="${escapeHtml(currentTitle)}" placeholder="노드 제목을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="form-group">
                <label for="edit-node-type">노드 타입:</label>
                ${nodeTypeSelect}
            </div>
            <div id="edit-node-type-settings">
                ${typeSpecificSettings}
            </div>
            <div class="form-group">
                <label for="edit-node-description">설명:</label>
                <textarea id="edit-node-description" rows="3" placeholder="노드에 대한 설명을 입력하세요 (선택사항)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(currentDescription)}</textarea>
            </div>
            <div class="form-group">
                <label for="edit-node-color">노드 색상:</label>
                <select id="edit-node-color" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="blue" ${currentColor === 'blue' ? 'selected' : ''}>파란색</option>
                    <option value="orange" ${currentColor === 'orange' ? 'selected' : ''}>주황색</option>
                    <option value="green" ${currentColor === 'green' ? 'selected' : ''}>초록색</option>
                    <option value="purple" ${currentColor === 'purple' ? 'selected' : ''}>보라색</option>
                    <option value="red" ${currentColor === 'red' ? 'selected' : ''}>빨간색</option>
                    <option value="gray" ${currentColor === 'gray' ? 'selected' : ''}>회색</option>
                </select>
            </div>
            <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="edit-node-save" class="btn btn-primary">저장</button>
                <button id="edit-node-cancel" class="btn btn-secondary">취소</button>
            </div>
        `;
    }

    /**
     * 노드 타입 선택 드롭다운 생성
     */
    generateNodeTypeSelect(currentType) {
        const options = Object.entries(NODE_TYPE_LABELS)
            .filter(([type]) => !isBoundaryNode(type)) // 시작/종료 노드는 제외
            .map(([value, label]) => 
                `<option value="${value}" ${currentType === value ? 'selected' : ''}>${label}</option>`
            )
            .join('');

        return `<select id="edit-node-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${options}</select>`;
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners(nodeElement, nodeId, nodeType, nodeData) {
        const modalManager = this.workflowPage.getModalManager();
        const nodeTypeSelect = document.getElementById('edit-node-type');
        const settingsContainer = document.getElementById('edit-node-type-settings');
        const descriptionTextarea = document.getElementById('edit-node-description');

        // 노드 타입 변경 시 설정 UI 동적 업데이트
        if (nodeTypeSelect && settingsContainer && !isBoundaryNode(nodeType)) {
            nodeTypeSelect.addEventListener('change', () => {
                this.handleTypeChange(nodeTypeSelect.value, nodeType, nodeData, settingsContainer, descriptionTextarea);
            });
        }

        // 폴더 선택 버튼
        const browseBtn = document.getElementById('edit-browse-folder-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.handleFolderSelection());
        }

        // 저장 버튼
        const saveBtn = document.getElementById('edit-node-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.workflowPage.updateNode(nodeElement, nodeId);
            });
        }

        // 취소 버튼
        const cancelBtn = document.getElementById('edit-node-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (modalManager) {
                    modalManager.close();
                }
            });
        }
    }

    /**
     * 노드 타입 변경 처리
     */
    handleTypeChange(selectedType, oldType, nodeData, settingsContainer, descriptionTextarea) {
        // 시작/종료 노드로 변경하려는 경우 검증
        const nodeId = nodeData?.id || '';
        const nodeManager = this.workflowPage.getNodeManager();
        const validation = NodeValidationUtils.validateNodeTypeChange(selectedType, nodeId, nodeManager);
        
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
                nodeTypeSelect.value = oldType;
            }
            return;
        }
        
        // description 업데이트
        if (descriptionTextarea) {
            const currentDesc = descriptionTextarea.value.trim();
            const oldDefaultDesc = getDefaultDescription(oldType);
            const newDefaultDesc = getDefaultDescription(selectedType);
            
            if (!currentDesc || currentDesc === oldDefaultDesc) {
                descriptionTextarea.value = newDefaultDesc;
            }
        }

        // 타입별 설정 UI 업데이트
        const newSettings = this.generateTypeSpecificSettings(selectedType, nodeData);
        
        // 기존 설정 제거
        const existingTypeSettings = settingsContainer.querySelectorAll('.form-group');
        existingTypeSettings.forEach(el => el.remove());
        
        // 새로운 설정 추가
        if (newSettings) {
            settingsContainer.insertAdjacentHTML('beforeend', newSettings);
            
            // 폴더 선택 버튼 이벤트 재바인딩
            const newBrowseBtn = document.getElementById('edit-browse-folder-btn');
            if (newBrowseBtn) {
                const newBtn = newBrowseBtn.cloneNode(true);
                newBrowseBtn.parentNode.replaceChild(newBtn, newBrowseBtn);
                newBtn.addEventListener('click', () => this.handleFolderSelection());
            }
        }
    }

    /**
     * 폴더 선택 처리
     */
    async handleFolderSelection() {
        const btn = document.getElementById('edit-browse-folder-btn');
        if (!btn) return;

        const originalText = btn.textContent;

        try {
            btn.disabled = true;
            btn.textContent = '폴더 선택 중...';

            const response = await fetch('http://localhost:8000/api/folder/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success && data.folder_path) {
                document.getElementById('edit-node-folder-path').value = data.folder_path;
                
                // 이미지 개수 확인 및 표시
                this.updateImageCount(data.folder_path);
            } else if (data.message) {
                alert(data.message);
            }
        } catch (error) {
            console.error('폴더 선택 실패:', error);
            alert('폴더 선택에 실패했습니다. 서버가 실행 중인지 확인하세요.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * 이미지 개수 업데이트
     */
    async updateImageCount(folderPath) {
        try {
            const response = await fetch(`http://localhost:8000/api/images/list?folder_path=${encodeURIComponent(folderPath)}`);
            const data = await response.json();
            
            if (data.success) {
                const count = data.count || 0;
                const label = document.querySelector('label[for="edit-node-folder-path"]');
                if (label) {
                    const existingCount = label.querySelector('span');
                    if (existingCount) {
                        existingCount.textContent = ` (${count}개 이미지)`;
                    } else {
                        const countSpan = document.createElement('span');
                        countSpan.style.cssText = 'color: #666; font-weight: normal;';
                        countSpan.textContent = ` (${count}개 이미지)`;
                        label.appendChild(countSpan);
                    }
                }
            }
        } catch (e) {
            console.warn('이미지 개수 조회 실패:', e);
        }
    }
}

