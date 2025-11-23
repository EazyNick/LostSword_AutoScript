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
        } else if (nodeType === 'process-focus') {
            const processName = nodeData?.process_name || '';
            const windowTitle = nodeData?.window_title || '';
            const processId = nodeData?.process_id || '';
            const hwnd = nodeData?.hwnd || '';
            return `
                <div class="form-group">
                    <label for="edit-node-process-select">프로세스 선택:</label>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <select id="edit-node-process-select" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">프로세스를 선택하세요</option>
                        </select>
                        <button type="button" id="edit-refresh-processes-btn" class="btn btn-secondary">새로고침</button>
                    </div>
                    <input type="hidden" id="edit-node-process-id" value="${processId}">
                    <input type="hidden" id="edit-node-process-hwnd" value="${hwnd}">
                    <input type="hidden" id="edit-node-process-name" value="${escapeHtml(processName)}">
                    <input type="hidden" id="edit-node-window-title" value="${escapeHtml(windowTitle)}">
                    <small style="color: #666; font-size: 12px;">화면에 보이는 프로세스만 표시됩니다. 선택한 프로세스가 실행 시 화면 최상단에 포커스됩니다.</small>
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

        // 프로세스 선택 관련
        if (nodeType === 'process-focus') {
            this.setupProcessSelection(nodeData);
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

            // 프로세스 선택 설정
            if (selectedType === 'process-focus') {
                this.setupProcessSelection(nodeData);
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

    /**
     * 프로세스 선택 설정
     */
    async setupProcessSelection(nodeData) {
        const processSelect = document.getElementById('edit-node-process-select');
        const refreshBtn = document.getElementById('edit-refresh-processes-btn');
        
        if (!processSelect || !refreshBtn) return;

        // 프로세스 목록 로드
        await this.loadProcessList(processSelect, nodeData);

        // 새로고침 버튼 이벤트
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '새로고침 중...';
            try {
                await this.loadProcessList(processSelect, nodeData);
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '새로고침';
            }
        });

        // 프로세스 선택 이벤트
        processSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue) {
                const [processId, hwnd] = selectedValue.split('|');
                const option = e.target.options[e.target.selectedIndex];
                const processName = option.dataset.processName || '';
                const windowTitle = option.dataset.windowTitle || '';

                document.getElementById('edit-node-process-id').value = processId;
                document.getElementById('edit-node-process-hwnd').value = hwnd;
                document.getElementById('edit-node-process-name').value = processName;
                document.getElementById('edit-node-window-title').value = windowTitle;
            } else {
                document.getElementById('edit-node-process-id').value = '';
                document.getElementById('edit-node-process-hwnd').value = '';
                document.getElementById('edit-node-process-name').value = '';
                document.getElementById('edit-node-window-title').value = '';
            }
        });
    }

    /**
     * 프로세스 목록 로드
     */
    async loadProcessList(selectElement, nodeData) {
        try {
            const response = await fetch('http://localhost:8000/api/processes/list');
            const data = await response.json();

            if (data.success && data.processes) {
                // 기존 옵션 제거 (첫 번째 옵션 제외)
                while (selectElement.options.length > 1) {
                    selectElement.remove(1);
                }

                // 프로세스 목록 추가
                data.processes.forEach(process => {
                    process.windows.forEach((window, index) => {
                        const option = document.createElement('option');
                        const value = `${process.process_id}|${window.hwnd}`;
                        option.value = value;
                        option.dataset.processName = process.process_name;
                        option.dataset.windowTitle = window.title;
                        
                        // 표시 텍스트: 프로세스명 - 창제목 (여러 창이면 인덱스 표시)
                        const displayText = process.window_count > 1 
                            ? `${process.process_name} - ${window.title} (${index + 1})`
                            : `${process.process_name} - ${window.title}`;
                        option.textContent = displayText;

                        // 현재 선택된 프로세스와 일치하면 선택
                        if (nodeData?.process_id == process.process_id && 
                            nodeData?.hwnd == window.hwnd) {
                            option.selected = true;
                        }

                        selectElement.appendChild(option);
                    });
                });
            } else {
                console.error('프로세스 목록 로드 실패:', data);
            }
        } catch (error) {
            console.error('프로세스 목록 로드 중 오류:', error);
            alert('프로세스 목록을 불러오는데 실패했습니다. 서버가 실행 중인지 확인하세요.');
        }
    }
}

