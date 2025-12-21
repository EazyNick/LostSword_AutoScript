/**
 * 노드 설정 모달 관리
 * 노드 설정 모달의 UI 생성 및 이벤트 처리를 담당합니다.
 */

import { getDefaultDescription } from '../config/node-defaults.js';
import { NODE_TYPES, isBoundaryNode, NODE_TYPE_LABELS } from '../constants/node-types.js';
import { escapeHtml, getNodeType, getNodeData } from '../utils/node-utils.js';
import { extractOutputVariables, getNodeResult, collectPreviousNodeVariables } from '../utils/node-output-parser.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';
import { getDetailNodeTypes, getDetailNodeConfig } from '../config/action-node-types.js';
import { generateParameterForm, extractParameterValues } from '../utils/parameter-form-generator.js';
import { getNodeRegistry } from '../services/node-registry.js';
import { generatePreviewOutput as generateNodePreviewOutput } from '../config/node-preview-outputs.js';
import {
    generateInputPreview,
    generateOutputPreview,
    collectPreviousNodeOutput,
    generatePreviewFromSchema
} from '../config/node-preview-generator.js';

export class NodeSettingsModal {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 설정 모달 표시
     * @param {HTMLElement} nodeElement - 설정할 노드 요소
     */
    async show(nodeElement) {
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
            `[WorkflowPage] 노드 설정 모달 열기: ${nodeId}, 타입: ${nodeType}, 상세 노드 타입: ${currentActionNodeType}`
        );

        // 노드 타입별 설정 UI 생성 (비동기)
        const typeSpecificSettings = await this.generateTypeSpecificSettings(nodeType, nodeData);

        // 모달 콘텐츠 생성
        const content = await this.generateModalContent(
            nodeType,
            currentTitle,
            currentDescription,
            typeSpecificSettings,
            currentActionNodeType
        );

        modalManager.show(content);

        // 이벤트 리스너 설정
        this.setupEventListeners(nodeElement, nodeId, nodeType, nodeData);

        // 입력/출력 미리보기 업데이트 (즉시 표시)
        this.updateInputOutputPreview(nodeElement, nodeId, nodeType, nodeData);

        // 이전 노드 출력 변수 목록 표시
        this.updatePreviousNodeVariables(nodeId);

        // field_path 또는 execution_id 필드 설정 (조건 노드, 엑셀 닫기 노드 등에서 사용)
        // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 설정
        setTimeout(() => {
            const fieldPathInput = document.getElementById('edit-node-field_path');
            const executionIdInput = document.getElementById('edit-node-execution_id');

            if (fieldPathInput) {
                this.setupFieldPathInput(nodeId, fieldPathInput);
            }

            if (executionIdInput) {
                this.setupFieldPathInput(nodeId, executionIdInput);
            }
        }, 100);
    }

    /**
     * 상세 노드 타입 선택란 업데이트
     */
    async updateDetailNodeTypeSelect(nodeType) {
        const detailNodeTypeGroup = document.getElementById('edit-detail-node-type-group');
        const detailNodeTypeSelect = document.getElementById('edit-detail-node-type');

        if (!detailNodeTypeGroup) {
            return;
        }

        if (isBoundaryNode(nodeType)) {
            detailNodeTypeGroup.style.display = 'none';
            return;
        }

        detailNodeTypeGroup.style.display = 'block';

        // 현재 선택된 값 유지
        const currentValue = detailNodeTypeSelect ? detailNodeTypeSelect.value : '';

        // 새로운 선택란 생성
        const newSelect = await this.generateDetailNodeTypeSelect(nodeType, currentValue);
        if (detailNodeTypeSelect) {
            detailNodeTypeSelect.outerHTML = newSelect;
        } else {
            detailNodeTypeGroup.insertAdjacentHTML('beforeend', newSelect);
        }

        // 이벤트 리스너 재설정
        const newDetailNodeTypeSelect = document.getElementById('edit-detail-node-type');
        if (newDetailNodeTypeSelect) {
            const nodeElement =
                document.querySelector('.workflow-node.selected') || document.querySelector('[data-node-id]');
            newDetailNodeTypeSelect.addEventListener('change', async () => {
                const newDetailNodeType = newDetailNodeTypeSelect.value;
                if (nodeElement) {
                    const updatedNodeData = getNodeData(nodeElement);
                    updatedNodeData.action_node_type = newDetailNodeType;
                    const settingsContainer = document.getElementById('edit-node-type-settings');
                    await this.handleDetailNodeTypeChange(
                        nodeType,
                        newDetailNodeType,
                        updatedNodeData,
                        settingsContainer
                    );
                    await this.updateOutputPreview(nodeType, updatedNodeData, nodeElement);
                }
            });
        }
    }

    /**
     * 상세 노드 타입 변경 처리
     */
    async handleDetailNodeTypeChange(nodeType, detailNodeType, nodeData, settingsContainer) {
        if (!settingsContainer) {
            return;
        }

        // 상세 노드 타입별 설정 UI 생성
        const settings = this.generateDetailNodeTypeSettings(nodeType, detailNodeType, nodeData);

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
        this.setupDetailNodeTypeEventListeners(detailNodeType);
    }

    /**
     * 상세 노드 타입별 설정 UI 생성
     */
    generateDetailNodeTypeSettings(nodeType, detailNodeType, nodeData) {
        if (!detailNodeType) {
            return '';
        }

        switch (detailNodeType) {
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
     * 상세 노드 타입별 이벤트 리스너 설정
     */
    setupDetailNodeTypeEventListeners(detailNodeType) {
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

        switch (detailNodeType) {
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
    async generateTypeSpecificSettings(nodeType, nodeData) {
        const registry = getNodeRegistry();
        const config = await registry.getConfig(nodeType);
        const currentDetailNodeType = nodeData?.action_node_type || '';

        // 디버깅: config 확인
        console.log('[NodeSettingsModal] generateTypeSpecificSettings:', {
            nodeType,
            hasConfig: !!config,
            configKeys: config ? Object.keys(config) : [],
            hasParameters: !!config?.parameters,
            parameters: config?.parameters,
            currentDetailNodeType
        });

        // 파라미터 기반 폼 생성
        let parameterFormHtml = '';

        // 상세 노드 타입이 선택된 경우, 상세 노드 타입의 파라미터 우선 사용
        let parametersToUse = null;
        let currentValues = {};

        if (currentDetailNodeType && config?.detailTypes?.[currentDetailNodeType]) {
            const detailConfig = config.detailTypes[currentDetailNodeType];
            if (detailConfig.parameters) {
                parametersToUse = detailConfig.parameters;
                // 현재 값 추출
                currentValues = Object.keys(detailConfig.parameters).reduce((acc, key) => {
                    acc[key] = nodeData?.[key];
                    return acc;
                }, {});
            }
        }

        // 상세 노드 타입에 파라미터가 없으면 노드 레벨 파라미터 사용
        if (!parametersToUse && config?.parameters) {
            parametersToUse = config.parameters;
            // 현재 값 추출
            currentValues = Object.keys(config.parameters).reduce((acc, key) => {
                acc[key] = nodeData?.[key];
                return acc;
            }, {});
        }

        // excel-close 노드의 execution_id 기본값 설정 (값이 없을 때만)
        if (nodeType === 'excel-close' && parametersToUse?.execution_id) {
            if (!currentValues.execution_id || currentValues.execution_id === '') {
                // 이전 노드 확인
                const nodeManager = this.workflowPage.getNodeManager();
                if (nodeManager) {
                    const previousNodes = this.getPreviousNodeChain(nodeData.id);
                    if (previousNodes.length > 0) {
                        const lastNode = previousNodes[previousNodes.length - 1];
                        const lastNodeData = lastNode.data || {};
                        if (lastNodeData.type === 'excel-open') {
                            currentValues.execution_id = 'output.data.execution_id';
                        } else {
                            // 이전 노드가 없거나 엑셀 열기 노드가 아니어도 기본값 설정
                            currentValues.execution_id = 'output.data.execution_id';
                        }
                    } else {
                        // 이전 노드가 없어도 기본값 설정
                        currentValues.execution_id = 'output.data.execution_id';
                    }
                } else {
                    // nodeManager가 없어도 기본값 설정
                    currentValues.execution_id = 'output.data.execution_id';
                }
            }
        }

        let parameterFormResult = { html: '', buttons: [] };
        if (parametersToUse) {
            console.log('[NodeSettingsModal] 파라미터 사용:', {
                parametersToUse: Object.keys(parametersToUse),
                currentValues
            });
            parameterFormResult = generateParameterForm(parametersToUse, 'edit-node-', currentValues);
            parameterFormHtml = parameterFormResult.html;
            console.log('[NodeSettingsModal] 파라미터 폼 생성 결과:', {
                htmlLength: parameterFormHtml.length,
                html: parameterFormHtml.substring(0, 200), // 처음 200자만
                buttons: parameterFormResult.buttons
            });
        } else {
            console.log('[NodeSettingsModal] 파라미터 없음:', {
                hasConfig: !!config,
                hasParameters: !!config?.parameters,
                hasDetailTypes: !!config?.detailTypes,
                currentDetailNodeType
            });
        }

        // 파라미터 폼이 생성된 경우 버튼 정보는 setupEventListeners에서 처리
        // (generateTypeSpecificSettings는 HTML만 반환하므로 여기서는 이벤트 리스너를 설정하지 않음)

        // 파라미터 폼이 있으면 무조건 반환 (레거시 체크 전에)
        if (parameterFormHtml) {
            console.log('[NodeSettingsModal] 파라미터 폼 반환:', parameterFormHtml.length, 'bytes');
            return parameterFormHtml;
        }

        console.log('[NodeSettingsModal] 파라미터 폼 없음, 빈 문자열 반환');
        return parameterFormHtml;
    }

    /**
     * 모달 콘텐츠 생성
     */
    async generateModalContent(
        nodeType,
        currentTitle,
        currentDescription,
        typeSpecificSettings,
        currentDetailNodeType = ''
    ) {
        const nodeTypeSelect = isBoundaryNode(nodeType)
            ? `<input type="text" value="${NODE_TYPE_LABELS[nodeType] || nodeType}" disabled class="node-settings-disabled-input">
               <small class="node-settings-help-text">시작/종료 노드는 타입을 변경할 수 없습니다.</small>`
            : this.generateNodeTypeSelect(nodeType);

        // 상세 노드 타입 선택란 생성
        const detailNodeTypeSelect = await this.generateDetailNodeTypeSelect(nodeType, currentDetailNodeType);

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
            <div class="form-group node-settings-form-group" id="edit-detail-node-type-group" style="display: ${isBoundaryNode(nodeType) ? 'none' : 'block'};">
                <label for="edit-detail-node-type" class="node-settings-label">상세 노드 타입:</label>
                ${detailNodeTypeSelect}
            </div>
            <div id="edit-node-type-settings">
                ${typeSpecificSettings}
            </div>
            <div class="form-group node-settings-form-group">
                <label for="edit-node-description" class="node-settings-label">설명:</label>
                <textarea id="edit-node-description" rows="3" placeholder="노드에 대한 설명을 입력하세요 (선택사항)" class="node-settings-textarea">${escapeHtml(currentDescription)}</textarea>
            </div>
            <div class="form-group node-settings-form-group node-settings-section-divider">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <label class="node-settings-label node-settings-preview-label" style="margin: 0;">입력 데이터:</label>
                    <!-- 이전 노드 정보 표시 -->
                    <div id="node-previous-node-info" class="node-previous-node-info" style="display: none; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary, #666);">
                        <span style="opacity: 0.7;">←</span>
                        <span id="node-previous-node-name-display" style="color: var(--primary-color, #2673ea); font-weight: 500;"></span>
                        <span style="opacity: 0.7;">노드에서 가져옴</span>
                    </div>
                </div>
                
                <!-- 이전 노드 출력 변수 목록 -->
                <div id="node-previous-output-variables" class="node-previous-output-variables" style="margin-bottom: 12px; display: none;">
                    <div class="node-previous-output-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 500; color: var(--text-secondary, #666);">이전 노드 출력 변수:</span>
                        <span id="node-previous-output-node-name" style="font-size: 12px; color: var(--primary-color, #2673ea); font-weight: 500;"></span>
                    </div>
                    <div id="node-previous-output-variables-list" class="node-previous-output-variables-list" style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <!-- 변수 태그들이 여기에 동적으로 추가됨 -->
                    </div>
                </div>
                
                <div style="margin-bottom: 8px;">
                    <button id="node-input-load-from-previous" class="btn btn-small" style="font-size: 12px; padding: 4px 8px;">이전 노드에서 가져오기</button>
                </div>
                <textarea id="node-input-preview" class="node-settings-textarea node-preview-textarea" rows="8" placeholder='{"action": "start", "status": "completed", "output": {}}'></textarea>
                <small class="node-settings-help-text">이 노드로 전달되는 입력 데이터입니다. JSON 형식으로 입력하세요.</small>
            </div>
            <div class="form-group node-settings-form-group node-settings-section-divider">
                <label class="node-settings-label node-settings-preview-label">출력 미리보기:</label>
                <div id="node-output-preview" class="node-settings-preview-output">
                    <textarea readonly class="node-settings-textarea node-preview-textarea node-preview-loading-textarea" rows="8">계산 중...</textarea>
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
     * 상세 노드 타입 선택 드롭다운 생성
     */
    async generateDetailNodeTypeSelect(nodeType, currentDetailNodeType = '') {
        const detailNodeTypes = await getDetailNodeTypes(nodeType);
        const detailNodeKeys = Object.keys(detailNodeTypes);

        // "없음" 옵션 (항상 포함)
        const noneOption = `<option value="" ${currentDetailNodeType === '' ? 'selected' : ''}>없음 (기본 동작)</option>`;

        // 상세 노드 타입 옵션 생성
        const options = detailNodeKeys
            .map((key) => {
                const config = detailNodeTypes[key];
                const label = config.label || key;
                const icon = config.icon || '';
                return `<option value="${key}" ${currentDetailNodeType === key ? 'selected' : ''}>${icon} ${label}</option>`;
            })
            .join('');

        // 상세 노드 타입이 없어도 선택란은 표시 (기본값: "없음"만 표시)
        return `<select id="edit-detail-node-type" class="node-settings-select">
            ${noneOption}
            ${options}
        </select>
        <small class="node-settings-help-text">이 노드가 수행할 상세 동작을 선택하세요.</small>`;
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

                // 상세 노드 타입 선택란 업데이트
                await this.updateDetailNodeTypeSelect(newType);

                // 타입 변경 시 출력 미리보기도 업데이트
                const updatedNodeData = getNodeData(nodeElement);
                await this.updateOutputPreview(newType, updatedNodeData, nodeElement);
            });
        }

        // 상세 노드 타입 변경 시 설정 UI 업데이트
        const detailNodeTypeSelect = document.getElementById('edit-detail-node-type');
        if (detailNodeTypeSelect && !isBoundaryNode(nodeType)) {
            detailNodeTypeSelect.addEventListener('change', async () => {
                const newDetailNodeType = detailNodeTypeSelect.value;
                // 상세 노드 타입별 설정 UI 업데이트
                await this.handleDetailNodeTypeChange(nodeType, newDetailNodeType, nodeData, settingsContainer);

                // 출력 미리보기 업데이트
                const updatedNodeData = getNodeData(nodeElement);
                updatedNodeData.action_node_type = newDetailNodeType;
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

        // 파라미터 폼의 파일/폴더 선택 버튼 이벤트 리스너 설정
        // DOM이 업데이트된 후에 버튼을 찾아야 하므로 약간의 지연
        setTimeout(() => {
            // 모든 folder_path, file_path 버튼 찾기
            const folderPathButtons = document.querySelectorAll('[id$="-folder_path-browse-btn"]');
            console.log('[NodeSettingsModal] 폴더 선택 버튼 개수:', folderPathButtons.length);
            folderPathButtons.forEach((btn) => {
                const fieldId = btn.id.replace('-browse-btn', '');
                console.log('[NodeSettingsModal] 폴더 선택 버튼 찾음:', btn.id, 'fieldId:', fieldId);
                // 기존 이벤트 리스너 제거 후 새로 추가
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[NodeSettingsModal] 폴더 선택 버튼 클릭:', fieldId);
                    try {
                        await this.handleFolderSelection(fieldId);
                    } catch (error) {
                        console.error('[NodeSettingsModal] 폴더 선택 처리 중 오류:', error);
                    }
                });
            });

            const filePathButtons = document.querySelectorAll('[id$="-file_path-browse-btn"]');
            console.log('[NodeSettingsModal] 파일 선택 버튼 개수:', filePathButtons.length);
            filePathButtons.forEach((btn) => {
                const fieldId = btn.id.replace('-browse-btn', '');
                console.log('[NodeSettingsModal] 파일 선택 버튼 찾음:', btn.id, 'fieldId:', fieldId);
                // 기존 이벤트 리스너 제거 후 새로 추가
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[NodeSettingsModal] 파일 선택 버튼 클릭:', fieldId);
                    this.handleFileSelection(fieldId);
                });
            });

            // field_path 또는 execution_id 필드에 이전 노드 출력 변수 목록 추가
            const fieldPathInput = document.getElementById('edit-node-field_path');
            const executionIdInput = document.getElementById('edit-node-execution_id');

            if (fieldPathInput) {
                console.log('[setupEventListeners] field_path 필드 찾음, setupFieldPathInput 호출');
                this.setupFieldPathInput(nodeId, fieldPathInput);
            } else {
                console.log('[setupEventListeners] field_path 필드를 찾을 수 없음');
            }

            if (executionIdInput) {
                console.log('[setupEventListeners] execution_id 필드 찾음, setupFieldPathInput 호출');
                this.setupFieldPathInput(nodeId, executionIdInput);
            }
        }, 100); // 지연 시간 증가

        // 프로세스 선택 관련
        if (nodeType === 'process-focus') {
            this.setupProcessSelection(nodeData);
        }

        // 저장 버튼
        const saveBtn = document.getElementById('edit-node-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.workflowPage.updateNode(nodeElement, nodeId);
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

        // 입력 데이터 관련 이벤트 리스너
        const loadFromPreviousBtn = document.getElementById('node-input-load-from-previous');
        if (loadFromPreviousBtn) {
            loadFromPreviousBtn.addEventListener('click', async () => {
                await this.loadInputFromPreviousNode(nodeId, nodeElement);
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

            // 파라미터 폼의 파일/폴더 선택 버튼 이벤트 리스너 재설정
            setTimeout(() => {
                const folderPathButtons = document.querySelectorAll('[id$="-folder_path-browse-btn"]');
                folderPathButtons.forEach((btn) => {
                    const fieldId = btn.id.replace('-browse-btn', '');
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                    newBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            await this.handleFolderSelection(fieldId);
                        } catch (error) {
                            console.error('[NodeSettingsModal] 폴더 선택 처리 중 오류:', error);
                        }
                    });
                });

                const filePathButtons = document.querySelectorAll('[id$="-file_path-browse-btn"]');
                filePathButtons.forEach((btn) => {
                    const fieldId = btn.id.replace('-browse-btn', '');
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                    newBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleFileSelection(fieldId);
                    });
                });
            }, 50);

            // 프로세스 선택 설정
            if (selectedType === 'process-focus') {
                this.setupProcessSelection(nodeData);
            }
        }
    }

    /**
     * 폴더 선택 처리
     * @param {string} fieldId - 폴더 경로 입력 필드 ID
     */
    async handleFolderSelection(fieldId) {
        if (!fieldId) {
            console.warn('[NodeSettingsModal] fieldId가 제공되지 않았습니다.');
            return;
        }
        console.log('[NodeSettingsModal] handleFolderSelection 호출됨, fieldId:', fieldId);
        const btnId = `${fieldId}-browse-btn`;
        const btn = document.getElementById(btnId);
        if (!btn) {
            console.warn(`[NodeSettingsModal] 폴더 선택 버튼을 찾을 수 없습니다: ${btnId}`);
            // 모든 버튼 ID 확인
            const allButtons = document.querySelectorAll('[id*="browse-btn"]');
            console.log(
                '[NodeSettingsModal] 찾은 모든 browse 버튼:',
                Array.from(allButtons).map((b) => b.id)
            );
            return;
        }
        const originalText = btn.textContent;
        console.log('[NodeSettingsModal] 폴더 선택 버튼 찾음:', btn.id);
        console.log('[NodeSettingsModal] 버튼 상태:', {
            disabled: btn.disabled,
            textContent: btn.textContent
        });

        try {
            console.log('[NodeSettingsModal] 버튼 비활성화 시작');
            btn.disabled = true;
            btn.textContent = '폴더 선택 중...';
            console.log('[NodeSettingsModal] 버튼 비활성화 완료');

            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const apiUrl = `${apiBaseUrl}/api/folder/select`;
            console.log('[NodeSettingsModal] API 호출 시작:', apiUrl);

            // 타임아웃 설정 (30초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[NodeSettingsModal] API 응답 받음:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const result = await response.json();
            console.log('[NodeSettingsModal] API 응답 데이터:', result);
            console.log('[NodeSettingsModal] result.data:', result.data);
            console.log('[NodeSettingsModal] result.data?.folder_path:', result.data?.folder_path);

            // 변경된 응답 형식: {success: true/false, message: "...", data: {folder_path: "..."}}
            // data가 없거나 folder_path가 없는 경우도 처리
            let folderPath = null;
            if (result.success) {
                if (result.data?.folder_path) {
                    folderPath = result.data.folder_path;
                } else if (result.folder_path) {
                    // data 필드가 없고 직접 folder_path가 있는 경우
                    folderPath = result.folder_path;
                } else if (result.data && typeof result.data === 'string') {
                    // data가 문자열인 경우
                    folderPath = result.data;
                }
            }

            if (folderPath) {
                console.log('[NodeSettingsModal] 폴더 경로 받음:', folderPath);
                const inputField = document.getElementById(fieldId);
                if (inputField) {
                    console.log('[NodeSettingsModal] 입력 필드 찾음, 값 설정:', fieldId, folderPath);
                    inputField.value = folderPath;

                    // 입력 이벤트 트리거하여 값 변경 알림
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    inputField.dispatchEvent(new Event('change', { bubbles: true }));

                    // 이미지 개수 확인 및 표시 (folder_path인 경우만)
                    if (fieldId.includes('folder_path')) {
                        this.updateImageCount(folderPath, inputField);
                    }

                    console.log('[NodeSettingsModal] 입력 필드 값 설정 완료:', inputField.value);
                } else {
                    console.warn(`[NodeSettingsModal] 입력 필드를 찾을 수 없습니다: ${fieldId}`);
                }
                // 성공 시 팝업 표시하지 않음
            } else if (!result.success) {
                // 실패 시에만 팝업 표시
                const errorMsg = result.message || '폴더 선택에 실패했습니다.';
                alert(errorMsg);
            }
        } catch (error) {
            console.error('[NodeSettingsModal] 폴더 선택 실패:', error);
            alert('폴더 선택에 실패했습니다. 서버가 실행 중인지 확인하세요.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * 파일 선택 처리
     * @param {string} fieldId - 파일 경로 입력 필드 ID
     */
    async handleFileSelection(fieldId) {
        console.log('[NodeSettingsModal] handleFileSelection 호출됨, fieldId:', fieldId);
        const btnId = `${fieldId}-browse-btn`;
        const btn = document.getElementById(btnId);
        if (!btn) {
            console.warn(`[NodeSettingsModal] 파일 선택 버튼을 찾을 수 없습니다: ${btnId}`);
            // 모든 버튼 ID 확인
            const allButtons = document.querySelectorAll('[id*="browse-btn"]');
            console.log(
                '[NodeSettingsModal] 찾은 모든 browse 버튼:',
                Array.from(allButtons).map((b) => b.id)
            );
            return;
        }
        const originalText = btn.textContent;
        console.log('[NodeSettingsModal] 파일 선택 버튼 찾음:', btn.id);

        try {
            btn.disabled = true;
            btn.textContent = '파일 선택 중...';

            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/file/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            // 변경된 응답 형식: {success: true/false, message: "...", data: {file_path: "..."}}
            if (result.success && result.data?.file_path) {
                const filePath = result.data.file_path;
                const inputField = document.getElementById(fieldId);
                if (inputField) {
                    inputField.value = filePath;
                }
                // 성공 시 팝업 표시하지 않음
            } else if (!result.success) {
                // 실패 시에만 팝업 표시
                const errorMsg = result.message || '파일 선택에 실패했습니다.';
                alert(errorMsg);
            }
        } catch (error) {
            console.error('파일 선택 실패:', error);
            alert('파일 선택에 실패했습니다. 서버가 실행 중인지 확인하세요.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * 이미지 개수 업데이트
     * @param {string} folderPath - 폴더 경로
     * @param {HTMLElement} inputField - 입력 필드 요소 (선택사항)
     */
    async updateImageCount(folderPath, inputField = null) {
        try {
            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/images/list?folder_path=${encodeURIComponent(folderPath)}`);
            const result = await response.json();

            // 변경된 응답 형식: {success: true, message: "...", data: [...], count: N}
            if (result.success && inputField) {
                const count = result.count || result.data?.length || 0;
                // 입력 필드의 라벨 찾기
                const fieldId = inputField.id;
                const label = document.querySelector(`label[for="${fieldId}"]`);
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
     * 입력 미리보기 업데이트 (편집 가능, n8n 스타일)
     */
    async updateInputPreview(nodeId, nodeElement) {
        const inputPreview = document.getElementById('node-input-preview');
        if (!inputPreview) {
            return;
        }

        try {
            // 저장된 입력 데이터가 있으면 사용
            const nodeData = getNodeData(nodeElement);
            if (nodeData?.input_data) {
                // 저장된 입력 데이터가 있으면 표시
                try {
                    const inputData =
                        typeof nodeData.input_data === 'string' ? JSON.parse(nodeData.input_data) : nodeData.input_data;
                    inputPreview.value = JSON.stringify(inputData, null, 2);
                } catch (e) {
                    // JSON 파싱 실패 시 문자열로 표시
                    inputPreview.value =
                        typeof nodeData.input_data === 'string'
                            ? nodeData.input_data
                            : JSON.stringify(nodeData.input_data, null, 2);
                }
                return;
            }

            // 이전 노드의 실제 실행 결과 또는 스키마 기반 예시 생성
            const previousNodes = this.getPreviousNodeChain(nodeId);
            if (previousNodes.length > 0) {
                const registry = getNodeRegistry();
                const lastNode = previousNodes[previousNodes.length - 1];
                const lastNodeType = lastNode.type || lastNode.nodeType;
                const lastNodeData = lastNode.data || {};
                const lastNodeName = lastNodeData.title || lastNode.type || lastNode.id;

                // 이전 노드 이름 표시
                this.updatePreviousNodeInfoDisplay(lastNodeName);

                // loadInputFromPreviousNode와 동일한 로직 사용
                const result = await this.buildPreviousNodeOutput(lastNode, lastNodeType, lastNodeData, registry);

                // 표준 형식으로 표시
                inputPreview.value = JSON.stringify(result, null, 2);
            } else {
                // 이전 노드가 없으면 빈 입력
                this.hidePreviousNodeInfoDisplay();
                inputPreview.value = JSON.stringify({}, null, 2);
            }
        } catch (error) {
            console.error('입력 미리보기 생성 오류:', error);
            inputPreview.value = JSON.stringify({ error: error.message }, null, 2);
        }
    }

    /**
     * 이전 노드에서 입력 데이터 가져오기
     */
    async loadInputFromPreviousNode(nodeId, nodeElement) {
        const inputPreview = document.getElementById('node-input-preview');
        if (!inputPreview) {
            return;
        }

        try {
            const previousNodes = this.getPreviousNodeChain(nodeId);
            if (previousNodes.length === 0) {
                alert('이전 노드가 없습니다.');
                return;
            }

            // 마지막 이전 노드의 실제 실행 결과 또는 스키마 기반 데이터 생성
            const registry = getNodeRegistry();
            const lastNode = previousNodes[previousNodes.length - 1];
            const lastNodeType = lastNode.type || lastNode.nodeType;
            const lastNodeData = lastNode.data || {};
            const lastNodeName = lastNodeData.title || lastNode.type || lastNode.id;

            // buildPreviousNodeOutput 공통 함수 사용
            const inputData = await this.buildPreviousNodeOutput(lastNode, lastNodeType, lastNodeData, registry);

            inputPreview.value = JSON.stringify(inputData, null, 2);

            // 이전 노드 이름 표시
            this.updatePreviousNodeInfoDisplay(lastNodeName);
        } catch (error) {
            console.error('이전 노드에서 데이터 가져오기 오류:', error);
            alert(`오류: ${error.message}`);
        }
    }

    /**
     * 이전 노드 출력 데이터 생성 (공통 로직)
     * @param {Object} lastNode - 마지막 이전 노드 객체
     * @param {string} lastNodeType - 마지막 이전 노드 타입
     * @param {Object} lastNodeData - 마지막 이전 노드 데이터
     * @param {Object} registry - 노드 레지스트리
     * @returns {Object} 표준 형식의 입력 데이터
     */
    async buildPreviousNodeOutput(lastNode, lastNodeType, lastNodeData, registry) {
        // 우선순위: 1) 실제 실행 결과, 2) 스키마 기반 예시, 3) output: {data} 형식
        let previousOutput = null;
        let hasKnownOutput = false;

        // 실제 실행 결과가 있으면 사용 (새로운 표준 형식: {action, status, output: {...}})
        if (lastNodeData.result && lastNodeData.result.output) {
            // 표준 형식의 실행 결과 사용
            previousOutput = lastNodeData.result.output;
            hasKnownOutput = true;

            // 노드 메타데이터를 별도 필드로 추가
            const metadata = lastNodeData.metadata || {};

            // output이 여러 키를 가진 딕셔너리면 data 객체로 래핑 (metadata 제외)
            const outputWithoutMetadata = { ...previousOutput };
            delete outputWithoutMetadata.metadata;
            delete outputWithoutMetadata.id;
            delete outputWithoutMetadata.x;
            delete outputWithoutMetadata.y;
            delete outputWithoutMetadata.createdAt;
            delete outputWithoutMetadata.updatedAt;

            if (
                Object.keys(outputWithoutMetadata).length > 1 ||
                (Object.keys(outputWithoutMetadata).length === 1 && !('data' in outputWithoutMetadata))
            ) {
                previousOutput = {
                    data: outputWithoutMetadata
                };
            } else if (Object.keys(outputWithoutMetadata).length === 0) {
                previousOutput = {
                    data: {}
                };
            } else {
                previousOutput = outputWithoutMetadata;
            }

            // 메타데이터가 있으면 output에 metadata 필드 추가 (data 밖에)
            if (Object.keys(metadata).length > 0) {
                previousOutput.metadata = metadata;
            }
        } else if (lastNodeData.output) {
            // 하위 호환성: output 필드가 직접 있는 경우
            previousOutput = lastNodeData.output;
            hasKnownOutput = true;
        } else {
            // 스키마 기반 예시 생성 시도
            const lastNodeConfig = await registry.getConfig(lastNodeType);
            if (lastNodeConfig?.output_schema) {
                if (lastNodeConfig.output_schema.output && lastNodeConfig.output_schema.output.properties) {
                    previousOutput = generatePreviewFromSchema(
                        lastNodeConfig.output_schema.output.properties,
                        lastNodeData
                    );
                    hasKnownOutput = true;
                }
            }
        }

        // output 데이터를 알 수 없으면 output: {data} 형식으로 설정
        if (!hasKnownOutput || !previousOutput || Object.keys(previousOutput || {}).length === 0) {
            const dataObject = {};
            const standardFields = ['result', 'output', 'type', 'title', 'description', 'action_node_type', 'metadata'];
            const metadataFields = ['id', 'x', 'y', 'createdAt', 'updatedAt'];
            for (const [key, value] of Object.entries(lastNodeData)) {
                if (!standardFields.includes(key) && !metadataFields.includes(key)) {
                    dataObject[key] = value;
                }
            }

            previousOutput = {
                data: Object.keys(dataObject).length > 0 ? dataObject : {}
            };

            const metadata = lastNodeData.metadata || {};
            if (Object.keys(metadata).length > 0) {
                previousOutput.metadata = metadata;
            }
        } else if (previousOutput && typeof previousOutput === 'object' && !Array.isArray(previousOutput)) {
            const metadata = previousOutput.metadata;
            const outputWithoutMetadata = { ...previousOutput };
            delete outputWithoutMetadata.metadata;

            if (!('data' in outputWithoutMetadata)) {
                const outputKeys = Object.keys(outputWithoutMetadata);
                if (outputKeys.length > 0) {
                    previousOutput = {
                        data: outputWithoutMetadata
                    };
                    if (metadata) {
                        previousOutput.metadata = metadata;
                    }
                } else if (metadata) {
                    previousOutput = {
                        data: {},
                        metadata: metadata
                    };
                }
            } else if (metadata) {
                previousOutput.metadata = metadata;
            }
        } else {
            const metadata = lastNodeData.metadata || {};
            if (Object.keys(metadata).length > 0) {
                if (!previousOutput || typeof previousOutput !== 'object' || Array.isArray(previousOutput)) {
                    previousOutput = {
                        data: previousOutput || {}
                    };
                }
                previousOutput.metadata = metadata;
            }
        }

        // 메타데이터 추가 (모든 경우에, 아직 추가되지 않았으면)
        if (previousOutput && typeof previousOutput === 'object' && !Array.isArray(previousOutput)) {
            const metadata = lastNodeData.metadata || {};
            if (Object.keys(metadata).length > 0 && !previousOutput.metadata) {
                previousOutput.metadata = metadata;
            }
        }

        return {
            action: lastNodeType,
            status: 'completed',
            output: previousOutput
        };
    }

    /**
     * 이전 노드 정보 표시 업데이트
     * @param {string} nodeName - 이전 노드 이름
     */
    updatePreviousNodeInfoDisplay(nodeName) {
        const infoDisplay = document.getElementById('node-previous-node-info');
        const nameDisplay = document.getElementById('node-previous-node-name-display');

        if (infoDisplay && nameDisplay && nodeName) {
            nameDisplay.textContent = nodeName;
            infoDisplay.style.display = 'flex';
        } else if (infoDisplay) {
            infoDisplay.style.display = 'none';
        }
    }

    /**
     * 이전 노드 정보 표시 숨기기
     */
    hidePreviousNodeInfoDisplay() {
        const infoDisplay = document.getElementById('node-previous-node-info');
        if (infoDisplay) {
            infoDisplay.style.display = 'none';
        }
    }

    /**
     * 출력 미리보기 업데이트 (스키마 기반, 즉시 표시)
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

        try {
            // 현재 폼에서 파라미터 값 추출 (nodes_config.py에서 정의한 파라미터)
            const registry = getNodeRegistry();
            const config = await registry.getConfig(nodeType);
            const detailNodeType = nodeData?.action_node_type;

            // 현재 폼의 파라미터 값으로 nodeData 업데이트
            const updatedNodeData = { ...nodeData };

            if (config) {
                let parametersToExtract = null;

                // 상세 노드 타입이 있으면 상세 노드 타입의 파라미터 우선 사용
                if (detailNodeType && config.detailTypes?.[detailNodeType]?.parameters) {
                    parametersToExtract = config.detailTypes[detailNodeType].parameters;
                } else if (config.parameters) {
                    parametersToExtract = config.parameters;
                }

                // 폼에서 파라미터 값 추출
                if (parametersToExtract) {
                    const paramValues = extractParameterValues(parametersToExtract, 'edit-node-');
                    Object.assign(updatedNodeData, paramValues);
                    console.log('[NodeSettingsModal] 폼에서 추출한 파라미터 값:', paramValues);
                }
            }

            // 저장된 출력 오버라이드 값이 있으면 사용
            const outputOverride = updatedNodeData?.output_override;
            let displayValue;

            if (outputOverride !== undefined && outputOverride !== null) {
                // 오버라이드된 값이 있으면 그것을 사용
                if (typeof outputOverride === 'object') {
                    displayValue = JSON.stringify(outputOverride, null, 2);
                } else {
                    displayValue = String(outputOverride);
                }
            } else {
                // 스키마 기반 출력 미리보기 생성 (즉시 표시)
                displayValue = generateOutputPreview(nodeType, config || {}, updatedNodeData);
            }

            // 출력 표시 (항상 편집 가능)
            if (displayValue !== null && displayValue !== undefined) {
                outputPreview.innerHTML = `<textarea id="edit-node-output-value" class="node-settings-textarea node-preview-textarea" rows="8">${escapeHtml(displayValue)}</textarea>`;
            } else {
                outputPreview.innerHTML =
                    '<textarea id="edit-node-output-value" class="node-settings-textarea node-preview-textarea" rows="8"></textarea>';
            }
        } catch (error) {
            console.error('출력 미리보기 생성 오류:', error);
            outputPreview.innerHTML = `<span style="color: #d32f2f;">미리보기 생성 오류: ${error.message}</span>`;
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
            const preparedData = await this.prepareNodeDataForExecution(nodeInfo.type, nodeInfo.data);
            const nodeData = {
                id: nodeInfo.id,
                type: nodeInfo.type,
                data: preparedData
            };

            console.log('[NodeSettingsModal] 노드 실행 데이터 준비:', {
                nodeId: nodeInfo.id,
                nodeType: nodeInfo.type,
                preparedData
            });

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

            // 응답 구조 확인 및 로깅
            if (!result.success) {
                const errorMsg = result.message || result.error || '노드 실행에 실패했습니다.';
                console.error('[NodeSettingsModal] 노드 실행 실패:', result);
                throw new Error(errorMsg);
            }

            if (result.data?.results?.[0]) {
                const nodeResult = result.data.results[0];

                // 에러가 있으면 throw
                if (nodeResult.error) {
                    throw new Error(nodeResult.error);
                }

                return nodeResult;
            } else {
                // 결과가 없는 경우 상세 정보 로깅
                console.warn('[NodeSettingsModal] 노드 실행 결과 없음:', result);
                const errorMsg = result.message || '노드 실행 결과를 가져올 수 없습니다.';
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('노드 실행 오류:', error);
            throw error;
        }
    }

    /**
     * 노드 실행을 위한 데이터 준비
     */
    async prepareNodeDataForExecution(nodeType, nodeData) {
        if (!nodeData) {
            console.warn('[prepareNodeDataForExecution] nodeData가 없습니다.');
            return {};
        }

        console.log('[prepareNodeDataForExecution] 시작:', {
            nodeType,
            nodeDataKeys: Object.keys(nodeData),
            nodeData
        });

        const prepared = {
            title: nodeData.title || '',
            ...nodeData
        };

        // nodes_config.py에서 정의한 파라미터 동적 처리
        const registry = getNodeRegistry();
        const config = await registry.getConfig(nodeType);

        if (config) {
            // 상세 노드 타입이 있으면 상세 노드 타입의 파라미터 우선 사용
            const detailNodeType = nodeData.action_node_type;
            let parametersToInclude = null;

            if (detailNodeType && config.detailTypes?.[detailNodeType]?.parameters) {
                parametersToInclude = config.detailTypes[detailNodeType].parameters;
                console.log(
                    '[prepareNodeDataForExecution] 상세 노드 타입 파라미터 사용:',
                    detailNodeType,
                    Object.keys(parametersToInclude)
                );
            } else if (config.parameters) {
                parametersToInclude = config.parameters;
                console.log('[prepareNodeDataForExecution] 노드 레벨 파라미터 사용:', Object.keys(parametersToInclude));
            }

            // 파라미터 정의에 따라 nodeData에서 값 포함
            if (parametersToInclude) {
                for (const [paramKey, paramConfig] of Object.entries(parametersToInclude)) {
                    const value = nodeData[paramKey];
                    console.log(`[prepareNodeDataForExecution] 파라미터 ${paramKey}:`, {
                        value,
                        undefined: value === undefined,
                        null: value === null,
                        empty: value === ''
                    });
                    if (value !== undefined && value !== null && value !== '') {
                        prepared[paramKey] = value;
                        console.log(`[prepareNodeDataForExecution] ✅ ${paramKey} 포함됨: ${value}`);
                    } else {
                        console.log(`[prepareNodeDataForExecution] ❌ ${paramKey} 제외됨 (값 없음)`);
                    }
                }
            }
        }

        console.log('[prepareNodeDataForExecution] 최종 prepared:', {
            keys: Object.keys(prepared),
            prepared,
            hasFolderPath: 'folder_path' in prepared,
            folderPath: prepared.folder_path
        });

        // wait
        if (nodeType === 'wait' && !prepared.wait_time && nodeData.wait_time !== undefined) {
            prepared.wait_time = nodeData.wait_time;
        }
        // process-focus
        if (nodeType === 'process-focus') {
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
        }
        // condition
        if (nodeType === 'condition' && !prepared.condition && nodeData.condition) {
            prepared.condition = nodeData.condition;
        }
        // click
        if (nodeType === 'click') {
            if (nodeData.x !== undefined) {
                prepared.x = nodeData.x;
            }
            if (nodeData.y !== undefined) {
                prepared.y = nodeData.y;
            }
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
            const result = await response.json();

            // 변경된 응답 형식: {success: true, message: "...", data: [...], count: N}
            const processes = result.data || result.processes || [];
            if (result.success && processes.length > 0) {
                // 기존 옵션 제거 (첫 번째 옵션 제외)
                while (selectElement.options.length > 1) {
                    selectElement.remove(1);
                }

                // 프로세스 목록 추가
                processes.forEach((process) => {
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
                console.error('프로세스 목록 로드 실패:', result);
            }
        } catch (error) {
            console.error('프로세스 목록 로드 중 오류:', error);
            alert('프로세스 목록을 불러오는데 실패했습니다. 서버가 실행 중인지 확인하세요.');
        }
    }

    /**
     * 이전 노드 출력 변수 목록 업데이트 (n8n 스타일)
     *
     * 이전 노드의 output 필드에서 변수 목록을 추출하여 태그 형태로 표시합니다.
     * 각 변수를 클릭하면 입력 필드에 자동으로 입력됩니다.
     *
     * @param {string} nodeId - 현재 노드 ID
     */
    async updatePreviousNodeVariables(nodeId) {
        const variablesContainer = document.getElementById('node-previous-output-variables');
        const variablesList = document.getElementById('node-previous-output-variables-list');
        const nodeNameSpan = document.getElementById('node-previous-output-node-name');

        if (!variablesContainer || !variablesList) {
            return;
        }

        try {
            // 이전 노드 체인 가져오기
            const previousNodes = this.getPreviousNodeChain(nodeId);

            if (previousNodes.length === 0) {
                // 이전 노드가 없으면 숨김
                variablesContainer.style.display = 'none';
                return;
            }

            // 마지막 이전 노드의 변수 추출
            const lastNode = previousNodes[previousNodes.length - 1];
            const lastNodeData = lastNode.data || {};
            const lastNodeName = lastNodeData.title || lastNode.type || lastNode.id;

            // 노드 실행 결과 가져오기
            const nodeResult = getNodeResult(lastNodeData);

            if (!nodeResult || !nodeResult.output) {
                // 실행 결과가 없으면 숨김
                variablesContainer.style.display = 'none';
                return;
            }

            // output 변수 추출
            const variables = extractOutputVariables(nodeResult);

            if (variables.length === 0) {
                // 변수가 없으면 숨김
                variablesContainer.style.display = 'none';
                return;
            }

            // 변수 목록 표시
            variablesContainer.style.display = 'block';
            if (nodeNameSpan) {
                nodeNameSpan.textContent = lastNodeName;
            }

            // 기존 변수 태그 제거
            variablesList.innerHTML = '';

            // 각 변수를 태그로 표시
            variables.forEach((variable) => {
                const tag = document.createElement('div');
                tag.className = 'node-output-variable-tag';
                tag.dataset.variableKey = variable.key;
                tag.dataset.variableValue =
                    typeof variable.value === 'string' ? variable.value : JSON.stringify(variable.value);

                // 변수 타입 아이콘
                let typeIcon = '📄';
                if (variable.type === 'string') {
                    typeIcon = '📝';
                } else if (variable.type === 'number') {
                    typeIcon = '🔢';
                } else if (variable.type === 'boolean') {
                    typeIcon = '✓';
                } else if (variable.type === 'array') {
                    typeIcon = '📋';
                } else if (variable.type === 'object') {
                    typeIcon = '📦';
                }

                // 변수 값 미리보기 (최대 50자)
                let valuePreview = String(variable.value);
                if (valuePreview.length > 50) {
                    valuePreview = valuePreview.substring(0, 50) + '...';
                }

                tag.innerHTML = `
                    <span class="node-output-variable-icon">${typeIcon}</span>
                    <span class="node-output-variable-key">${escapeHtml(variable.key)}</span>
                    <span class="node-output-variable-value">${escapeHtml(valuePreview)}</span>
                `;

                // 변수 클릭 시 입력 필드에 변수 값 삽입
                tag.addEventListener('click', () => {
                    // 1. execution_id 필드가 있으면 그곳에 삽입
                    const executionIdInput = document.getElementById('edit-node-execution_id');
                    if (executionIdInput) {
                        // execution_id 변수인 경우 값 삽입, 아니면 키 삽입
                        if (variable.key === 'execution_id') {
                            executionIdInput.value =
                                typeof variable.value === 'string' ? variable.value : String(variable.value);
                            executionIdInput.dispatchEvent(new Event('input', { bubbles: true }));
                        } else {
                            // 다른 변수인 경우 경로 형태로 삽입
                            executionIdInput.value = `output.${variable.key}`;
                            executionIdInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        return;
                    }

                    // 2. field_path 필드가 있으면 그곳에 삽입
                    const fieldPathInput = document.getElementById('edit-node-field_path');
                    if (fieldPathInput) {
                        const cursorPos = fieldPathInput.selectionStart;
                        const textBefore = fieldPathInput.value.substring(0, cursorPos);
                        const textAfter = fieldPathInput.value.substring(fieldPathInput.selectionEnd);
                        const variableKey = variable.key;
                        fieldPathInput.value = textBefore + variableKey + textAfter;
                        const newCursorPos = cursorPos + variableKey.length;
                        fieldPathInput.setSelectionRange(newCursorPos, newCursorPos);
                        fieldPathInput.focus();
                        return;
                    }

                    // 3. 입력 미리보기 필드에 삽입 (기본 동작)
                    const inputPreview = document.getElementById('node-input-preview');
                    if (inputPreview) {
                        const cursorPos = inputPreview.selectionStart;
                        const textBefore = inputPreview.value.substring(0, cursorPos);
                        const textAfter = inputPreview.value.substring(inputPreview.selectionEnd);
                        const variableKey = variable.key;
                        inputPreview.value = textBefore + variableKey + textAfter;
                        const newCursorPos = cursorPos + variableKey.length;
                        inputPreview.setSelectionRange(newCursorPos, newCursorPos);
                        inputPreview.focus();
                    }
                });

                variablesList.appendChild(tag);
            });
        } catch (error) {
            console.error('[NodeSettingsModal] 이전 노드 변수 목록 업데이트 오류:', error);
            variablesContainer.style.display = 'none';
        }
    }

    /**
     * field_path 입력 필드 설정 (이전 노드 출력 변수 목록 추가)
     *
     * @param {string} nodeId - 현재 노드 ID
     * @param {HTMLElement} fieldPathInput - field_path 입력 필드 요소
     */
    async setupFieldPathInput(nodeId, fieldPathInput) {
        if (!fieldPathInput) {
            console.log('[setupFieldPathInput] fieldPathInput이 없습니다.');
            return;
        }

        console.log('[setupFieldPathInput] 시작:', { nodeId, fieldId: fieldPathInput.id });

        const datalistId = fieldPathInput.getAttribute('list');
        const datalist = datalistId ? document.getElementById(datalistId) : null;
        const expandBtn = document.getElementById(`${fieldPathInput.id}-expand-btn`);

        console.log('[setupFieldPathInput] 요소 찾기:', {
            datalistId,
            hasDatalist: !!datalist,
            hasExpandBtn: !!expandBtn
        });

        // 입력 데이터 미리보기에서 데이터 가져오기
        const inputPreview = document.getElementById('node-input-preview');
        if (!inputPreview) {
            console.log('[setupFieldPathInput] 입력 데이터 미리보기를 찾을 수 없습니다.');
            if (datalist) {
                datalist.innerHTML = '';
            }
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            return;
        }

        // 입력 데이터 파싱
        let inputData = null;
        try {
            const inputText = inputPreview.value.trim();
            if (!inputText) {
                console.log('[setupFieldPathInput] 입력 데이터가 비어있습니다.');
                if (datalist) {
                    datalist.innerHTML = '';
                }
                if (expandBtn) {
                    expandBtn.style.display = 'none';
                }
                return;
            }
            inputData = JSON.parse(inputText);
            console.log('[setupFieldPathInput] 입력 데이터 파싱 성공:', inputData);
        } catch (error) {
            console.warn('[setupFieldPathInput] 입력 데이터 파싱 실패:', error);
            if (datalist) {
                datalist.innerHTML = '';
            }
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            return;
        }

        // 모든 가능한 경로 수집 (입력 데이터 기반)
        // allPaths를 외부에서 접근 가능하도록 설정
        let allPaths = [];
        const addNestedPaths = (obj, prefix = '') => {
            if (typeof obj !== 'object' || obj === null) {
                return;
            }

            // 배열인 경우 인덱스 경로 추가
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
                    if (!allPaths.includes(path)) {
                        allPaths.push(path);
                    }
                    // 배열 항목이 객체인 경우 재귀 처리
                    if (typeof item === 'object' && item !== null) {
                        addNestedPaths(item, path);
                    }
                });
                return;
            }

            // 객체인 경우
            for (const [key, value] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (!allPaths.includes(path)) {
                    allPaths.push(path);
                }

                // 재귀적으로 중첩된 객체 처리
                if (typeof value === 'object' && value !== null) {
                    addNestedPaths(value, path);
                }
            }
        };

        // 입력 데이터 전체에서 경로 수집
        addNestedPaths(inputData);

        console.log('[setupFieldPathInput] 수집된 모든 경로:', allPaths);

        if (allPaths.length === 0) {
            console.log('[setupFieldPathInput] 수집된 경로가 없습니다.');
            if (datalist) {
                datalist.innerHTML = '';
            }
            if (expandBtn) {
                expandBtn.style.display = 'none';
            }
            return;
        }

        // datalist에 경로 목록 추가
        if (datalist) {
            datalist.innerHTML = '';

            // 모든 경로를 datalist에 추가
            allPaths.forEach((path) => {
                if (!Array.from(datalist.children).some((opt) => opt.value === path)) {
                    const option = document.createElement('option');
                    option.value = path;
                    datalist.appendChild(option);
                }
            });
        }

        // 입력 데이터 변경 시 경로 목록 업데이트
        const updatePathsFromInput = () => {
            // inputPreview를 다시 찾아서 최신 값 사용
            const currentInputPreview = document.getElementById('node-input-preview');
            if (!currentInputPreview) {
                console.warn('[setupFieldPathInput] 입력 데이터 미리보기를 찾을 수 없습니다 (업데이트)');
                return;
            }

            try {
                const inputText = currentInputPreview.value.trim();
                if (!inputText) {
                    if (datalist) {
                        datalist.innerHTML = '';
                    }
                    if (expandBtn) {
                        expandBtn.style.display = 'none';
                    }
                    allPaths = [];
                    return;
                }

                const newInputData = JSON.parse(inputText);
                const newPaths = [];

                // 재귀 함수 (로컬 스코프)
                const addNestedPathsLocal = (obj, prefix = '') => {
                    if (typeof obj !== 'object' || obj === null) {
                        return;
                    }

                    if (Array.isArray(obj)) {
                        obj.forEach((item, index) => {
                            const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
                            if (!newPaths.includes(path)) {
                                newPaths.push(path);
                            }
                            if (typeof item === 'object' && item !== null) {
                                addNestedPathsLocal(item, path);
                            }
                        });
                        return;
                    }

                    for (const [key, value] of Object.entries(obj)) {
                        const path = prefix ? `${prefix}.${key}` : key;
                        if (!newPaths.includes(path)) {
                            newPaths.push(path);
                        }
                        if (typeof value === 'object' && value !== null) {
                            addNestedPathsLocal(value, path);
                        }
                    }
                };

                addNestedPathsLocal(newInputData);

                // datalist 업데이트
                if (datalist) {
                    datalist.innerHTML = '';
                    newPaths.forEach((path) => {
                        const option = document.createElement('option');
                        option.value = path;
                        datalist.appendChild(option);
                    });
                }

                // allPaths 업데이트 (드롭다운에서 사용)
                allPaths = [...newPaths];

                console.log('[setupFieldPathInput] 입력 데이터 변경으로 경로 업데이트:', newPaths);
            } catch (error) {
                console.warn('[setupFieldPathInput] 입력 데이터 파싱 실패 (업데이트):', error);
            }
        };

        // 입력 데이터 변경 감지 (debounce)
        let updateTimer = null;
        const inputHandler = () => {
            clearTimeout(updateTimer);
            updateTimer = setTimeout(updatePathsFromInput, 500);
        };

        // 이벤트 리스너 추가 (이미 설정되어 있으면 중복 방지)
        if (!inputPreview.dataset.pathUpdateListener) {
            inputPreview.dataset.pathUpdateListener = 'true';
            inputPreview.addEventListener('input', inputHandler);
        }

        // 초기 경로 목록 설정
        updatePathsFromInput();

        // 커스텀 자동완성 기능 설정
        const autocompletePreview = document.getElementById(`${fieldPathInput.id}-autocomplete`);
        console.log('[setupFieldPathInput] 자동완성 미리보기 요소:', {
            autocompleteId: `${fieldPathInput.id}-autocomplete`,
            hasAutocompletePreview: !!autocompletePreview
        });

        if (autocompletePreview) {
            // 이미 이벤트 리스너가 설정되어 있는지 확인 (중복 방지)
            if (fieldPathInput.dataset.autocompleteSetup === 'true') {
                console.log('[setupFieldPathInput] 자동완성 이미 설정됨, 건너뜀');
                return;
            }

            // 마커 설정 (중복 방지)
            fieldPathInput.dataset.autocompleteSetup = 'true';
            console.log('[setupFieldPathInput] 자동완성 이벤트 리스너 설정 시작');

            let currentSuggestion = '';

            // 입력 이벤트: 매칭되는 경로 찾기 및 미리보기 표시
            fieldPathInput.addEventListener('input', (e) => {
                const inputValue = e.target.value;
                console.log('[자동완성] 입력 이벤트:', { inputValue, allPathsCount: allPaths.length });

                if (!inputValue || allPaths.length === 0) {
                    console.log('[자동완성] 입력값이 없거나 경로가 없음');
                    autocompletePreview.textContent = '';
                    currentSuggestion = '';
                    return;
                }

                // 입력값과 매칭되는 경로 찾기 (가장 긴 매칭 경로 우선)
                const matchingPaths = allPaths
                    .filter((path) => path.startsWith(inputValue) && path !== inputValue)
                    .sort((a, b) => a.length - b.length); // 짧은 경로 우선

                console.log('[자동완성] 매칭된 경로:', matchingPaths);

                if (matchingPaths.length > 0) {
                    const matchingPath = matchingPaths[0];
                    // 입력된 부분은 투명하게, 나머지는 회색으로 표시
                    const remaining = matchingPath.substring(inputValue.length);
                    console.log('[자동완성] 미리보기 표시:', { matchingPath, remaining });
                    autocompletePreview.textContent = remaining;
                    currentSuggestion = matchingPath;
                } else {
                    console.log('[자동완성] 매칭되는 경로 없음');
                    autocompletePreview.textContent = '';
                    currentSuggestion = '';
                }
            });

            // Tab 키: 자동완성 적용
            fieldPathInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && currentSuggestion) {
                    console.log('[자동완성] Tab 키로 자동완성 적용:', currentSuggestion);
                    e.preventDefault();
                    fieldPathInput.value = currentSuggestion;
                    autocompletePreview.textContent = '';
                    currentSuggestion = '';
                    // input 이벤트 발생시켜서 다른 리스너들이 반응하도록
                    fieldPathInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (e.key === 'Escape') {
                    console.log('[자동완성] ESC 키로 미리보기 제거');
                    // ESC 키로 미리보기 제거
                    autocompletePreview.textContent = '';
                    currentSuggestion = '';
                }
            });

            // 포커스 아웃 시 미리보기 제거
            fieldPathInput.addEventListener('blur', () => {
                // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록
                setTimeout(() => {
                    autocompletePreview.textContent = '';
                    currentSuggestion = '';
                }, 200);
            });

            console.log('[setupFieldPathInput] 자동완성 이벤트 리스너 설정 완료');
        } else {
            console.warn(
                '[setupFieldPathInput] 자동완성 미리보기 요소를 찾을 수 없습니다:',
                `${fieldPathInput.id}-autocomplete`
            );
        }

        // "펼치기" 버튼 클릭 시 변수 목록 표시 (드롭다운)
        if (expandBtn) {
            expandBtn.style.display = 'block';
            console.log('[setupFieldPathInput] 펼치기 버튼 설정 시작');

            // 기존 이벤트 리스너 제거 후 새로 추가
            const newBtn = expandBtn.cloneNode(true);
            expandBtn.parentNode.replaceChild(newBtn, expandBtn);

            let isDropdownOpen = false;

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[펼치기 버튼] 클릭됨, 현재 상태:', isDropdownOpen);

                // 기존 드롭다운 찾기
                const existingDropdown = fieldPathInput.parentElement.querySelector('.field-path-dropdown');

                if (isDropdownOpen && existingDropdown) {
                    // 드롭다운 닫기
                    console.log('[펼치기 버튼] 드롭다운 닫기');
                    existingDropdown.remove();
                    isDropdownOpen = false;
                    newBtn.querySelector('.expand-icon').textContent = '▼';
                } else {
                    // 드롭다운 열기
                    console.log('[펼치기 버튼] 드롭다운 열기');

                    // 최신 입력 데이터에서 경로 다시 수집
                    const currentInputPreview = document.getElementById('node-input-preview');
                    let currentPaths = [];

                    if (currentInputPreview) {
                        try {
                            const inputText = currentInputPreview.value.trim();
                            if (inputText) {
                                const inputData = JSON.parse(inputText);
                                const tempPaths = [];

                                const collectPaths = (obj, prefix = '') => {
                                    if (typeof obj !== 'object' || obj === null) {
                                        return;
                                    }

                                    if (Array.isArray(obj)) {
                                        obj.forEach((item, index) => {
                                            const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
                                            if (!tempPaths.includes(path)) {
                                                tempPaths.push(path);
                                            }
                                            if (typeof item === 'object' && item !== null) {
                                                collectPaths(item, path);
                                            }
                                        });
                                        return;
                                    }

                                    for (const [key, value] of Object.entries(obj)) {
                                        const path = prefix ? `${prefix}.${key}` : key;
                                        if (!tempPaths.includes(path)) {
                                            tempPaths.push(path);
                                        }
                                        if (typeof value === 'object' && value !== null) {
                                            collectPaths(value, path);
                                        }
                                    }
                                };

                                collectPaths(inputData);
                                currentPaths = tempPaths;
                            }
                        } catch (error) {
                            console.warn('[펼치기 버튼] 입력 데이터 파싱 실패:', error);
                            currentPaths = [...allPaths]; // 기존 경로 사용
                        }
                    } else {
                        currentPaths = [...allPaths]; // 기존 경로 사용
                    }

                    const dropdown = document.createElement('div');
                    dropdown.className = 'field-path-dropdown';
                    dropdown.style.cssText = `
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        margin-top: 4px;
                        background: var(--bg-primary, white);
                        border: 1px solid var(--border-color, #ddd);
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        max-height: 300px;
                        overflow-y: auto;
                        z-index: 1000;
                    `;

                    // 헤더 추가
                    const header = document.createElement('div');
                    header.className = 'field-path-dropdown-header';
                    header.style.cssText = `
                        padding: 10px 12px;
                        font-weight: 600;
                        font-size: 13px;
                        color: var(--text-primary, #333);
                        border-bottom: 1px solid var(--border-color, #e5e7eb);
                        background: var(--bg-secondary, #f5f5f5);
                    `;
                    header.textContent = '입력 데이터에서 선택:';
                    dropdown.appendChild(header);

                    // 모든 경로를 정렬하여 리스트로 표시
                    const sortedPaths = [...currentPaths].sort();

                    if (sortedPaths.length === 0) {
                        const emptyItem = document.createElement('div');
                        emptyItem.className = 'field-path-dropdown-item';
                        emptyItem.style.cssText = `
                            padding: 12px;
                            text-align: center;
                            color: var(--text-secondary, #999);
                            font-size: 13px;
                        `;
                        emptyItem.textContent = '사용 가능한 경로가 없습니다';
                        dropdown.appendChild(emptyItem);
                    } else {
                        // 경로 목록을 리스트 형태로 표시
                        sortedPaths.forEach((path, index) => {
                            const item = document.createElement('div');
                            item.className = 'field-path-dropdown-item';
                            item.dataset.path = path;
                            item.style.cssText = `
                                padding: 12px 16px;
                                cursor: pointer;
                                border-bottom: 1px solid var(--border-color, #e5e7eb);
                                color: var(--text-primary, #333);
                                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                                font-size: 13px;
                                transition: all 0.15s ease;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            `;

                            // 경로 표시
                            const pathText = document.createElement('span');
                            pathText.textContent = path;
                            pathText.style.flex = '1';
                            item.appendChild(pathText);

                            // 선택 아이콘 (호버 시 표시)
                            const selectIcon = document.createElement('span');
                            selectIcon.textContent = '✓';
                            selectIcon.style.cssText = `
                                opacity: 0;
                                color: var(--primary-color, #2673ea);
                                font-weight: bold;
                                transition: opacity 0.15s ease;
                            `;
                            item.appendChild(selectIcon);

                            item.addEventListener('click', () => {
                                console.log('[펼치기 버튼] 경로 선택:', path);
                                fieldPathInput.value = path;
                                fieldPathInput.dispatchEvent(new Event('input', { bubbles: true }));
                                dropdown.remove();
                                isDropdownOpen = false;
                                newBtn.querySelector('.expand-icon').textContent = '▼';
                            });

                            item.addEventListener('mouseenter', () => {
                                item.style.backgroundColor = 'var(--bg-hover, #f5f5f5)';
                                selectIcon.style.opacity = '1';
                            });

                            item.addEventListener('mouseleave', () => {
                                item.style.backgroundColor = 'transparent';
                                selectIcon.style.opacity = '0';
                            });

                            dropdown.appendChild(item);
                        });
                    }

                    // 기존 드롭다운 제거
                    if (existingDropdown) {
                        existingDropdown.remove();
                    }

                    // 드롭다운 추가
                    const inputContainer =
                        fieldPathInput.closest('div[style*="position: relative"]') || fieldPathInput.parentElement;
                    inputContainer.style.position = 'relative';
                    inputContainer.appendChild(dropdown);
                    isDropdownOpen = true;
                    newBtn.querySelector('.expand-icon').textContent = '▲';

                    // 외부 클릭 시 드롭다운 닫기
                    const closeDropdown = (e) => {
                        if (!dropdown.contains(e.target) && e.target !== newBtn && !newBtn.contains(e.target)) {
                            dropdown.remove();
                            isDropdownOpen = false;
                            newBtn.querySelector('.expand-icon').textContent = '▼';
                            document.removeEventListener('click', closeDropdown);
                        }
                    };
                    setTimeout(() => {
                        document.addEventListener('click', closeDropdown);
                    }, 0);
                }
            });

            console.log('[setupFieldPathInput] 펼치기 버튼 설정 완료');
        } else {
            console.warn('[setupFieldPathInput] 펼치기 버튼을 찾을 수 없습니다:', `${fieldPathInput.id}-expand-btn`);
        }
    }
}
