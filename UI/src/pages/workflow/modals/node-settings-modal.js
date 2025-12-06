/**
 * 노드 설정 모달 관리
 * 노드 설정 모달의 UI 생성 및 이벤트 처리를 담당합니다.
 */

import { getDefaultDescription } from '../config/node-defaults.js';
import { NODE_TYPES, isBoundaryNode, NODE_TYPE_LABELS } from '../constants/node-types.js';
import { escapeHtml, getNodeType, getNodeData } from '../utils/node-utils.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';
import { getActionNodeTypes, getActionNodeConfig } from '../config/action-node-types.js';

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
        const nodeData = getNodeData(nodeElement);

        // 노드 타입 확인
        const nodeType = nodeData?.type || getNodeType(nodeElement);
        const currentTitle = nodeElement.querySelector('.node-title')?.textContent || '';
        const currentActionNodeType = nodeData?.action_node_type || '';

        // description이 없으면 기본 설명 사용
        const currentDescription = nodeData?.description || getDefaultDescription(nodeType);

        log(
            `[WorkflowPage] 노드 설정 모달 열기: ${nodeId}, 타입: ${nodeType}, 실제 노드 종류: ${currentActionNodeType}`
        );

        // 노드 타입별 설정 UI 생성
        const typeSpecificSettings = this.generateTypeSpecificSettings(nodeType, nodeData);

        // 모달 콘텐츠 생성
        const content = this.generateModalContent(
            nodeType,
            currentTitle,
            currentDescription,
            typeSpecificSettings,
            currentActionNodeType
        );

        modalManager.show(content);

        // 이벤트 리스너 설정
        this.setupEventListeners(nodeElement, nodeId, nodeType, nodeData);

        // 출력 미리보기 영역에 로딩 상태 클래스 추가
        const outputPreview = document.getElementById('node-output-preview');
        if (outputPreview) {
            outputPreview.classList.add('node-preview-loading-state');
        }

        // 입력/출력 미리보기 업데이트
        this.updateInputOutputPreview(nodeElement, nodeId, nodeType, nodeData);
    }

    /**
     * 실제 노드 종류 선택란 업데이트
     */
    updateActionNodeTypeSelect(nodeType) {
        const actionNodeTypeGroup = document.getElementById('edit-action-node-type-group');
        const actionNodeTypeSelect = document.getElementById('edit-action-node-type');

        if (!actionNodeTypeGroup) {
            return;
        }

        if (isBoundaryNode(nodeType)) {
            actionNodeTypeGroup.style.display = 'none';
            return;
        }

        actionNodeTypeGroup.style.display = 'block';

        // 현재 선택된 값 유지
        const currentValue = actionNodeTypeSelect ? actionNodeTypeSelect.value : '';

        // 새로운 선택란 생성
        const newSelect = this.generateActionNodeTypeSelect(nodeType, currentValue);
        if (actionNodeTypeSelect) {
            actionNodeTypeSelect.outerHTML = newSelect;
        } else {
            actionNodeTypeGroup.insertAdjacentHTML('beforeend', newSelect);
        }

        // 이벤트 리스너 재설정
        const newActionNodeTypeSelect = document.getElementById('edit-action-node-type');
        if (newActionNodeTypeSelect) {
            const nodeElement =
                document.querySelector('.workflow-node.selected') || document.querySelector('[data-node-id]');
            newActionNodeTypeSelect.addEventListener('change', async () => {
                const newActionNodeType = newActionNodeTypeSelect.value;
                if (nodeElement) {
                    const updatedNodeData = getNodeData(nodeElement);
                    updatedNodeData.action_node_type = newActionNodeType;
                    const settingsContainer = document.getElementById('edit-node-type-settings');
                    await this.handleActionNodeTypeChange(
                        nodeType,
                        newActionNodeType,
                        updatedNodeData,
                        settingsContainer
                    );
                    await this.updateOutputPreview(nodeType, updatedNodeData, nodeElement);
                }
            });
        }
    }

    /**
     * 실제 노드 종류 변경 처리
     */
    async handleActionNodeTypeChange(nodeType, actionNodeType, nodeData, settingsContainer) {
        if (!settingsContainer) {
            return;
        }

        // 실제 노드 종류별 설정 UI 생성
        const settings = this.generateActionNodeTypeSettings(nodeType, actionNodeType, nodeData);

        // 기존 설정 제거
        const existingSettings = settingsContainer.querySelectorAll('.form-group');
        existingSettings.forEach((el) => {
            // 입력/출력 미리보기는 유지
            if (!el.id || (!el.id.includes('input-preview') && !el.id.includes('output-preview'))) {
                el.remove();
            }
        });

        // 새로운 설정 추가 (미리보기 앞에)
        const previewSection = settingsContainer.querySelector('.form-group[style*="border-top"]');
        if (previewSection && settings) {
            previewSection.insertAdjacentHTML('beforebegin', settings);
        } else if (settings) {
            settingsContainer.insertAdjacentHTML('afterbegin', settings);
        }

        // 설정 변경 이벤트 리스너 설정
        this.setupActionNodeTypeEventListeners(actionNodeType);
    }

    /**
     * 실제 노드 종류별 설정 UI 생성
     */
    generateActionNodeTypeSettings(nodeType, actionNodeType, nodeData) {
        if (!actionNodeType) {
            return '';
        }

        switch (actionNodeType) {
            case 'http-api-request':
                const url = nodeData?.url || '';
                const method = nodeData?.method || 'GET';
                const headers = nodeData?.headers || '{}';
                const body = nodeData?.body || '';
                const timeout = nodeData?.timeout || 30;

                return `
                    <div class="form-group node-settings-form-group">
                        <label for="edit-http-url" class="node-settings-label">요청 URL:</label>
                        <input type="text" id="edit-http-url" value="${escapeHtml(url)}" placeholder="https://api.example.com/endpoint" class="node-settings-input">
                    </div>
                    <div class="form-group node-settings-form-group">
                        <label for="edit-http-method" class="node-settings-label">HTTP 메서드:</label>
                        <select id="edit-http-method" class="node-settings-select">
                            <option value="GET" ${method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="DELETE" ${method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            <option value="PATCH" ${method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                        </select>
                    </div>
                    <div class="form-group node-settings-form-group">
                        <label for="edit-http-headers" class="node-settings-label">HTTP 헤더 (JSON):</label>
                        <textarea id="edit-http-headers" rows="3" placeholder='{"Content-Type": "application/json"}' class="node-settings-textarea">${escapeHtml(typeof headers === 'string' ? headers : JSON.stringify(headers, null, 2))}</textarea>
                    </div>
                    <div class="form-group node-settings-form-group">
                        <label for="edit-http-body" class="node-settings-label">요청 본문 (JSON 또는 텍스트):</label>
                        <textarea id="edit-http-body" rows="4" placeholder='{"key": "value"}' class="node-settings-textarea">${escapeHtml(typeof body === 'string' ? body : JSON.stringify(body, null, 2))}</textarea>
                    </div>
                    <div class="form-group node-settings-form-group">
                        <label for="edit-http-timeout" class="node-settings-label">타임아웃 (초):</label>
                        <input type="number" id="edit-http-timeout" value="${timeout}" min="1" max="300" class="node-settings-input">
                    </div>
                `;
            default:
                return '';
        }
    }

    /**
     * 실제 노드 종류별 이벤트 리스너 설정
     */
    setupActionNodeTypeEventListeners(actionNodeType) {
        // 설정 변경 시 미리보기 업데이트 (debounce)
        let previewUpdateTimer = null;
        const updatePreviewDebounced = () => {
            clearTimeout(previewUpdateTimer);
            previewUpdateTimer = setTimeout(async () => {
                const nodeElement =
                    document.querySelector('.workflow-node.selected') || document.querySelector('[data-node-id]');
                if (nodeElement) {
                    const updatedNodeData = getNodeData(nodeElement);
                    const updatedNodeType = updatedNodeData?.type || getNodeType(nodeElement);
                    await this.updateOutputPreview(updatedNodeType, updatedNodeData, nodeElement);
                }
            }, 500);
        };

        switch (actionNodeType) {
            case 'http-api-request':
                // HTTP 설정 변경 시 미리보기 업데이트
                const urlInput = document.getElementById('edit-http-url');
                const methodSelect = document.getElementById('edit-http-method');
                const headersTextarea = document.getElementById('edit-http-headers');
                const bodyTextarea = document.getElementById('edit-http-body');
                const timeoutInput = document.getElementById('edit-http-timeout');

                if (urlInput) {
                    urlInput.addEventListener('input', updatePreviewDebounced);
                }
                if (methodSelect) {
                    methodSelect.addEventListener('change', updatePreviewDebounced);
                }
                if (headersTextarea) {
                    headersTextarea.addEventListener('input', updatePreviewDebounced);
                }
                if (bodyTextarea) {
                    bodyTextarea.addEventListener('input', updatePreviewDebounced);
                }
                if (timeoutInput) {
                    timeoutInput.addEventListener('input', updatePreviewDebounced);
                }
                break;
        }
    }

    /**
     * 타입별 설정 UI 생성
     */
    generateTypeSpecificSettings(nodeType, nodeData) {
        if (nodeType === NODE_TYPES.IMAGE_TOUCH) {
            const folderPath = nodeData?.folder_path || '';
            const imageCount = nodeData?.image_count || 0;
            const imageCountText =
                imageCount > 0
                    ? ` <span class="node-settings-help-text" style="font-weight: normal;">(${imageCount}개 이미지)</span>`
                    : '';
            return `
                <div class="form-group node-settings-form-group">
                    <label for="edit-node-folder-path" class="node-settings-label">이미지 폴더 경로${imageCountText}:</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="edit-node-folder-path" value="${escapeHtml(folderPath)}" placeholder="예: C:\\images\\touch" class="node-settings-input" style="flex: 1;">
                        <button type="button" id="edit-browse-folder-btn" class="btn btn-secondary">폴더 선택</button>
                    </div>
                    <small class="node-settings-help-text">이미지 파일 이름 순서대로 화면에서 찾아 터치합니다.</small>
                </div>
            `;
        } else if (nodeType === NODE_TYPES.CONDITION) {
            const condition = nodeData?.condition || '';
            return `
                <div class="form-group node-settings-form-group">
                    <label for="edit-node-condition" class="node-settings-label">조건 설정:</label>
                    <input type="text" id="edit-node-condition" value="${escapeHtml(condition)}" placeholder="조건을 입력하세요" class="node-settings-input">
                </div>
            `;
        } else if (nodeType === NODE_TYPES.WAIT) {
            const waitTime = nodeData?.wait_time || 1;
            return `
                <div class="form-group node-settings-form-group">
                    <label for="edit-node-wait-time" class="node-settings-label">대기 시간 (초):</label>
                    <input type="number" id="edit-node-wait-time" value="${waitTime}" min="0" step="0.1" class="node-settings-input">
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
    generateModalContent(nodeType, currentTitle, currentDescription, typeSpecificSettings, currentActionNodeType = '') {
        const nodeTypeSelect = isBoundaryNode(nodeType)
            ? `<input type="text" value="${NODE_TYPE_LABELS[nodeType] || nodeType}" disabled class="node-settings-disabled-input">
               <small class="node-settings-help-text">시작/종료 노드는 타입을 변경할 수 없습니다.</small>`
            : this.generateNodeTypeSelect(nodeType);

        // 실제 노드 종류 선택란 생성
        const actionNodeTypeSelect = this.generateActionNodeTypeSelect(nodeType, currentActionNodeType);

        return `
            <h3>노드 설정</h3>
            <div class="form-group node-settings-form-group">
                <label for="edit-node-title" class="node-settings-label">노드 제목:</label>
                <input type="text" id="edit-node-title" value="${escapeHtml(currentTitle)}" placeholder="노드 제목을 입력하세요" class="node-settings-input">
            </div>
            <div class="form-group node-settings-form-group">
                <label for="edit-node-type" class="node-settings-label">노드 타입:</label>
                ${nodeTypeSelect}
            </div>
            <div class="form-group node-settings-form-group" id="edit-action-node-type-group" style="display: ${isBoundaryNode(nodeType) ? 'none' : 'block'};">
                <label for="edit-action-node-type" class="node-settings-label">실제 노드 종류:</label>
                ${actionNodeTypeSelect}
            </div>
            <div id="edit-node-type-settings">
                ${typeSpecificSettings}
            </div>
            <div class="form-group node-settings-form-group">
                <label for="edit-node-description" class="node-settings-label">설명:</label>
                <textarea id="edit-node-description" rows="3" placeholder="노드에 대한 설명을 입력하세요 (선택사항)" class="node-settings-textarea">${escapeHtml(currentDescription)}</textarea>
            </div>
            <div class="form-group node-settings-form-group node-settings-section-divider">
                <label class="node-settings-label node-settings-preview-label">입력 미리보기:</label>
                <div id="node-input-preview" class="node-settings-preview-input">
                    <span class="node-settings-preview-placeholder">이전 노드의 출력이 여기에 표시됩니다.</span>
                </div>
                <small class="node-settings-help-text">이 노드로 전달되는 입력 데이터입니다. (읽기 전용 - 이전 노드의 출력)</small>
            </div>
            <div class="form-group node-settings-form-group node-settings-section-divider">
                <label class="node-settings-label node-settings-preview-label">출력 미리보기:</label>
                <div id="node-output-preview" class="node-settings-preview-output">
                    <textarea readonly class="node-settings-textarea node-preview-textarea node-preview-loading-textarea">계산 중...</textarea>
                </div>
                <small class="node-settings-help-text">이 노드가 반환하는 출력 데이터입니다. 값을 직접 수정할 수 있으며, 저장 버튼을 눌러야 변경사항이 적용됩니다.</small>
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
            .map(
                ([value, label]) =>
                    `<option value="${value}" ${currentType === value ? 'selected' : ''}>${label}</option>`
            )
            .join('');

        return `<select id="edit-node-type" class="node-settings-select">${options}</select>`;
    }

    /**
     * 실제 노드 종류 선택 드롭다운 생성
     */
    generateActionNodeTypeSelect(nodeType, currentActionNodeType = '') {
        const actionNodes = getActionNodeTypes(nodeType);
        const actionNodeKeys = Object.keys(actionNodes);

        if (actionNodeKeys.length === 0) {
            return `<select id="edit-action-node-type" disabled class="node-settings-disabled-select">
                <option value="">사용 가능한 실제 노드 종류가 없습니다</option>
            </select>
            <small class="node-settings-help-text">이 노드 타입에는 실제 노드 종류가 없습니다.</small>`;
        }

        const options = actionNodeKeys
            .map((key) => {
                const config = actionNodes[key];
                const label = config.label || key;
                const icon = config.icon || '';
                return `<option value="${key}" ${currentActionNodeType === key ? 'selected' : ''}>${icon} ${label}</option>`;
            })
            .join('');

        // "없음" 옵션 추가
        const noneOption = `<option value="" ${currentActionNodeType === '' ? 'selected' : ''}>없음 (기본 동작)</option>`;

        return `<select id="edit-action-node-type" class="node-settings-select">
            ${noneOption}
            ${options}
        </select>
        <small class="node-settings-help-text">이 노드가 수행할 실제 동작을 선택하세요.</small>`;
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
            nodeTypeSelect.addEventListener('change', async () => {
                const newType = nodeTypeSelect.value;
                await this.handleTypeChange(newType, nodeType, nodeData, settingsContainer, descriptionTextarea);

                // 실제 노드 종류 선택란 업데이트
                this.updateActionNodeTypeSelect(newType);

                // 타입 변경 시 출력 미리보기도 업데이트
                const updatedNodeData = getNodeData(nodeElement);
                await this.updateOutputPreview(newType, updatedNodeData, nodeElement);
            });
        }

        // 실제 노드 종류 변경 시 설정 UI 업데이트
        const actionNodeTypeSelect = document.getElementById('edit-action-node-type');
        if (actionNodeTypeSelect && !isBoundaryNode(nodeType)) {
            actionNodeTypeSelect.addEventListener('change', async () => {
                const newActionNodeType = actionNodeTypeSelect.value;
                // 실제 노드 종류별 설정 UI 업데이트
                await this.handleActionNodeTypeChange(nodeType, newActionNodeType, nodeData, settingsContainer);

                // 출력 미리보기 업데이트
                const updatedNodeData = getNodeData(nodeElement);
                updatedNodeData.action_node_type = newActionNodeType;
                await this.updateOutputPreview(nodeType, updatedNodeData, nodeElement);
            });
        }

        // 설정 변경 시 미리보기 업데이트 (debounce)
        let previewUpdateTimer = null;
        const updatePreviewDebounced = () => {
            clearTimeout(previewUpdateTimer);
            previewUpdateTimer = setTimeout(async () => {
                const updatedNodeData = getNodeData(nodeElement);
                const updatedNodeType = updatedNodeData?.type || getNodeType(nodeElement);
                await this.updateOutputPreview(updatedNodeType, updatedNodeData, nodeElement);
            }, 500);
        };

        // 폴더 경로 변경 시
        const folderPathInput = document.getElementById('edit-node-folder-path');
        if (folderPathInput) {
            folderPathInput.addEventListener('input', updatePreviewDebounced);
        }

        // 대기 시간 변경 시
        const waitTimeInput = document.getElementById('edit-node-wait-time');
        if (waitTimeInput) {
            waitTimeInput.addEventListener('input', updatePreviewDebounced);
        }

        // 프로세스 선택 변경 시
        const processSelect = document.getElementById('edit-node-process-select');
        if (processSelect) {
            processSelect.addEventListener('change', updatePreviewDebounced);
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
        existingTypeSettings.forEach((el) => el.remove());

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
        if (!btn) {
            return;
        }

        const originalText = btn.textContent;

        try {
            btn.disabled = true;
            btn.textContent = '폴더 선택 중...';

            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/folder/select`, {
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
            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/images/list?folder_path=${encodeURIComponent(folderPath)}`);
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

        if (!processSelect || !refreshBtn) {
            return;
        }

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
     * 입력/출력 미리보기 업데이트 (실제 실행)
     */
    async updateInputOutputPreview(nodeElement, nodeId, nodeType, nodeData) {
        await this.updateInputPreview(nodeId, nodeElement);
        await this.updateOutputPreview(nodeType, nodeData, nodeElement);
    }

    /**
     * 입력 미리보기 업데이트 (이전 노드 실행)
     */
    async updateInputPreview(nodeId, nodeElement) {
        const inputPreview = document.getElementById('node-input-preview');
        if (!inputPreview) {
            return;
        }

        // 로딩 상태 표시 (시각적 피드백) - 실제 값과 동일한 textarea 스타일
        inputPreview.innerHTML = `
            <textarea readonly class="node-settings-textarea node-preview-textarea node-preview-loading-textarea">계산 중...</textarea>
        `;
        inputPreview.classList.add('node-preview-loading-state');

        try {
            // 이전 노드들의 실행 경로 찾기
            const previousNodes = this.getPreviousNodeChain(nodeId);

            if (previousNodes.length === 0) {
                inputPreview.classList.remove('node-preview-loading-state');
                inputPreview.innerHTML =
                    '<span class="node-settings-preview-placeholder">입력 없음 (이전 노드가 없거나 연결되지 않음)</span>';
                return;
            }

            // 이전 노드들을 순차적으로 실행
            let lastOutput = null;
            for (const prevNode of previousNodes) {
                const result = await this.executeNodeForPreview(prevNode);
                if (result && result.output !== undefined) {
                    lastOutput = result.output;
                } else if (result) {
                    lastOutput = result;
                }
            }

            // 로딩 상태 제거
            inputPreview.classList.remove('node-preview-loading-state');

            // 마지막 노드의 출력을 입력으로 표시 (읽기 전용)
            if (lastOutput !== null) {
                // 객체나 배열인 경우 JSON 문자열로 표시, 아니면 그대로 표시
                if (lastOutput !== null && typeof lastOutput === 'object') {
                    const jsonString = JSON.stringify(lastOutput, null, 2);
                    inputPreview.innerHTML = `<textarea readonly class="node-settings-textarea node-preview-textarea">${escapeHtml(jsonString)}</textarea>`;
                } else {
                    inputPreview.innerHTML = `<textarea readonly class="node-settings-textarea node-preview-textarea">${escapeHtml(String(lastOutput))}</textarea>`;
                }
            } else {
                inputPreview.innerHTML =
                    '<span class="node-settings-preview-placeholder">입력 없음 (이전 노드 실행 결과 없음)</span>';
            }
        } catch (error) {
            console.error('입력 미리보기 실행 오류:', error);
            inputPreview.classList.remove('node-preview-loading-state');
            inputPreview.innerHTML = `<span style="color: #d32f2f;">실행 오류: ${error.message}</span>`;
        }
    }

    /**
     * 출력 미리보기 업데이트 (현재 노드 실행)
     */
    async updateOutputPreview(nodeType, nodeData, nodeElement) {
        const outputPreview = document.getElementById('node-output-preview');
        if (!outputPreview) {
            return;
        }

        // 이미 textarea가 있고 사용자가 수정 중이면 업데이트하지 않음 (포커스가 있으면)
        const existingTextarea = document.getElementById('edit-node-output-value');
        if (existingTextarea && document.activeElement === existingTextarea) {
            return; // 사용자가 수정 중이면 업데이트하지 않음
        }

        // 로딩 상태 표시 (시각적 피드백) - 실제 값과 동일한 textarea 스타일
        outputPreview.innerHTML = `
            <textarea readonly class="node-settings-textarea node-preview-textarea node-preview-loading-textarea">계산 중...</textarea>
        `;
        outputPreview.classList.add('node-preview-loading-state');

        try {
            // 저장된 출력 오버라이드 값이 있으면 사용, 없으면 노드 실행
            const outputOverride = nodeData?.output_override;
            let displayValue;

            if (outputOverride !== undefined && outputOverride !== null) {
                // 오버라이드된 값이 있으면 그것을 사용
                if (typeof outputOverride === 'object') {
                    displayValue = JSON.stringify(outputOverride, null, 2);
                } else {
                    displayValue = String(outputOverride);
                }
            } else {
                // 없으면 노드 실행 결과 사용
                const result = await this.executeNodeForPreview({
                    id: nodeElement.id || nodeElement.dataset.nodeId,
                    type: nodeType,
                    data: nodeData
                });

                if (result) {
                    // output 필드가 있으면 그것을, 없으면 전체 결과를 표시
                    const displayResult = result.output !== undefined ? result.output : result;

                    if (displayResult !== null && typeof displayResult === 'object') {
                        displayValue = JSON.stringify(displayResult, null, 2);
                    } else {
                        displayValue = String(displayResult);
                    }
                } else {
                    displayValue = '';
                }
            }

            // 로딩 상태 제거
            outputPreview.classList.remove('node-preview-loading-state');

            // 출력 표시 (항상 편집 가능)
            if (displayValue !== null && displayValue !== undefined) {
                outputPreview.innerHTML = `<textarea id="edit-node-output-value" class="node-settings-textarea node-preview-textarea">${escapeHtml(displayValue)}</textarea>`;
            } else {
                outputPreview.innerHTML =
                    '<textarea id="edit-node-output-value" class="node-settings-textarea node-preview-textarea"></textarea>';
            }
        } catch (error) {
            console.error('출력 미리보기 실행 오류:', error);
            outputPreview.classList.remove('node-preview-loading-state');
            outputPreview.innerHTML = `<span style="color: #d32f2f;">실행 오류: ${error.message}</span>`;
        }
    }

    /**
     * 데이터를 textarea 스타일로 렌더링
     */
    renderDataAsCards(data, depth = 0) {
        if (data === null || data === undefined) {
            return `<div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                <div class="node-preview-field-label">값:</div>
                <textarea readonly class="node-settings-textarea node-preview-textarea">null</textarea>
            </div>`;
        }

        const type = Array.isArray(data) ? 'array' : typeof data;

        if (type === 'object' && !Array.isArray(data)) {
            // 객체인 경우
            const keys = Object.keys(data);
            if (keys.length === 0) {
                return `<div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                    <div class="node-preview-field-label">값:</div>
                    <textarea readonly class="node-settings-textarea node-preview-textarea">{} (빈 객체)</textarea>
                </div>`;
            }

            let html = '';
            keys.forEach((key) => {
                const value = data[key];
                const valueType = Array.isArray(value) ? 'array' : typeof value;
                const isComplex = (valueType === 'object' && value !== null) || valueType === 'array';

                const displayValue = isComplex
                    ? JSON.stringify(value, null, 2)
                    : this.renderValueAsText(value, valueType);

                html += `
                    <div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                        <div class="node-preview-field-label">${escapeHtml(key)}:</div>
                        <textarea readonly class="node-settings-textarea node-preview-textarea">${escapeHtml(displayValue)}</textarea>
                        ${isComplex ? this.renderDataAsCards(value, depth + 1) : ''}
                    </div>
                `;
            });
            return html;
        } else if (type === 'array') {
            // 배열인 경우
            if (data.length === 0) {
                return `<div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                    <div class="node-preview-field-label">값:</div>
                    <textarea readonly class="node-settings-textarea node-preview-textarea">[] (빈 배열)</textarea>
                </div>`;
            }

            let html = '';
            data.forEach((item, index) => {
                const itemType = Array.isArray(item) ? 'array' : typeof item;
                const isComplex = (itemType === 'object' && item !== null) || itemType === 'array';

                const displayValue = isComplex ? JSON.stringify(item, null, 2) : this.renderValueAsText(item, itemType);

                html += `
                    <div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                        <div class="node-preview-field-label">[${index}]:</div>
                        <textarea readonly class="node-settings-textarea node-preview-textarea">${escapeHtml(displayValue)}</textarea>
                        ${isComplex ? this.renderDataAsCards(item, depth + 1) : ''}
                    </div>
                `;
            });
            return html;
        } else {
            // 원시 타입인 경우
            const displayValue = this.renderValueAsText(data, type);
            return `<div class="node-preview-field-box" style="margin-left: ${depth * 16}px;">
                <div class="node-preview-field-label">값:</div>
                <textarea readonly class="node-settings-textarea node-preview-textarea">${escapeHtml(displayValue)}</textarea>
            </div>`;
        }
    }

    /**
     * 값을 텍스트로 렌더링
     */
    renderValueAsText(value, type) {
        if (value === null) {
            return 'null';
        }

        switch (type) {
            case 'string':
                return String(value);
            case 'number':
                return String(value);
            case 'boolean':
                return value ? 'true' : 'false';
            default:
                return String(value);
        }
    }

    /**
     * 값을 렌더링
     */
    renderValue(value, type) {
        if (value === null) {
            return '<span class="node-preview-null-value">null</span>';
        }

        switch (type) {
            case 'string':
                return `<span class="node-preview-string-value">${escapeHtml(String(value))}</span>`;
            case 'number':
                return `<span class="node-preview-number-value">${value}</span>`;
            case 'boolean':
                return `<span class="node-preview-boolean-value">${value ? 'true' : 'false'}</span>`;
            default:
                return `<span>${escapeHtml(String(value))}</span>`;
        }
    }

    /**
     * 이전 노드 체인 가져오기 (시작 노드부터 현재 노드까지)
     */
    getPreviousNodeChain(nodeId) {
        const nodeManager = this.workflowPage.getNodeManager();
        if (!nodeManager || !nodeManager.connectionManager) {
            return [];
        }

        const connections = nodeManager.connectionManager.getConnections();
        if (!connections || connections.length === 0) {
            return [];
        }

        // 역방향으로 노드 체인 구성
        const nodeChain = [];
        let currentNodeId = nodeId;

        while (currentNodeId) {
            // 현재 노드로 들어오는 연결 찾기
            const inputConnection = connections.find((conn) => conn.to === currentNodeId);
            if (!inputConnection) {
                break;
            }

            const previousNodeId = inputConnection.from;
            if (previousNodeId === currentNodeId) {
                break;
            }

            const previousNodeElement = document.getElementById(previousNodeId);
            if (!previousNodeElement) {
                break;
            }

            const previousNodeData = getNodeData(previousNodeElement);
            const previousNodeType = previousNodeData?.type || getNodeType(previousNodeElement);

            // 시작 노드도 체인에 포함
            nodeChain.unshift({
                id: previousNodeId,
                type: previousNodeType,
                data: previousNodeData,
                element: previousNodeElement
            });

            // 시작 노드에 도달하면 종료
            if (previousNodeType === 'start' || previousNodeId === 'start') {
                break;
            }

            currentNodeId = previousNodeId;
        }

        return nodeChain;
    }

    /**
     * 미리보기용 노드 실행
     */
    async executeNodeForPreview(nodeInfo) {
        try {
            // 노드 데이터를 API 형식으로 변환
            const nodeData = {
                id: nodeInfo.id,
                type: nodeInfo.type,
                data: this.prepareNodeDataForExecution(nodeInfo.type, nodeInfo.data)
            };

            // 서버에 실행 요청
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

            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data?.results?.[0]) {
                const nodeResult = result.data.results[0];

                // 에러가 있으면 throw
                if (nodeResult.error) {
                    throw new Error(nodeResult.error);
                }

                return nodeResult;
            } else {
                throw new Error('노드 실행 결과를 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('노드 실행 오류:', error);
            throw error;
        }
    }

    /**
     * 노드 실행을 위한 데이터 준비
     */
    prepareNodeDataForExecution(nodeType, nodeData) {
        if (!nodeData) {
            return {};
        }

        const prepared = {
            title: nodeData.title || '',
            ...nodeData
        };

        // 노드 타입별 특수 처리
        switch (nodeType) {
            case 'image-touch':
                if (nodeData.folder_path) {
                    prepared.folder_path = nodeData.folder_path;
                }
                break;
            case 'wait':
                if (nodeData.wait_time !== undefined) {
                    prepared.wait_time = nodeData.wait_time;
                }
                break;
            case 'process-focus':
                if (nodeData.process_id !== undefined) {
                    prepared.process_id = nodeData.process_id;
                }
                if (nodeData.hwnd !== undefined) {
                    prepared.hwnd = nodeData.hwnd;
                }
                if (nodeData.process_name) {
                    prepared.process_name = nodeData.process_name;
                }
                if (nodeData.window_title) {
                    prepared.window_title = nodeData.window_title;
                }
                break;
            case 'condition':
                if (nodeData.condition) {
                    prepared.condition = nodeData.condition;
                }
                break;
            case 'click':
                if (nodeData.x !== undefined) {
                    prepared.x = nodeData.x;
                }
                if (nodeData.y !== undefined) {
                    prepared.y = nodeData.y;
                }
                break;
        }

        return prepared;
    }

    /**
     * 프로세스 목록 로드
     */
    async loadProcessList(selectElement, nodeData) {
        try {
            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/processes/list`);
            const data = await response.json();

            if (data.success && data.processes) {
                // 기존 옵션 제거 (첫 번째 옵션 제외)
                while (selectElement.options.length > 1) {
                    selectElement.remove(1);
                }

                // 프로세스 목록 추가
                data.processes.forEach((process) => {
                    process.windows.forEach((window, index) => {
                        const option = document.createElement('option');
                        const value = `${process.process_id}|${window.hwnd}`;
                        option.value = value;
                        option.dataset.processName = process.process_name;
                        option.dataset.windowTitle = window.title;

                        // 표시 텍스트: 프로세스명 - 창제목 (여러 창이면 인덱스 표시)
                        const displayText =
                            process.window_count > 1
                                ? `${process.process_name} - ${window.title} (${index + 1})`
                                : `${process.process_name} - ${window.title}`;
                        option.textContent = displayText;

                        // 현재 선택된 프로세스와 일치하면 선택
                        if (nodeData?.process_id == process.process_id && nodeData?.hwnd == window.hwnd) {
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
