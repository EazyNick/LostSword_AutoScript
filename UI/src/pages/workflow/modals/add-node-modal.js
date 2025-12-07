/**
 * 노드 추가 모달 관리
 * 노드 추가 모달의 UI 생성 및 이벤트 처리를 담당합니다.
 */

import { NODE_TYPES, NODE_TYPE_LABELS } from '../constants/node-types.js';
import { getDefaultTitle, getDefaultDescription } from '../config/node-defaults.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';
import { getNodeRegistry } from '../services/node-registry.js';
import { getDetailNodeTypes, getDetailNodeConfig } from '../config/action-node-types.js';

export class AddNodeModal {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 추가 모달 표시
     */
    async show() {
        const modalManager = this.workflowPage.getModalManager();
        if (!modalManager) {
            console.error('ModalManager를 사용할 수 없습니다.');
            return;
        }

        const content = await this.generateModalContent();
        modalManager.show(content);

        this.setupEventListeners();
    }

    /**
     * 모달 HTML 콘텐츠 생성
     */
    async generateModalContent() {
        const registry = getNodeRegistry();
        const nodeTypeOptionsPromises = Object.entries(NODE_TYPE_LABELS).map(async ([value, label]) => {
            const config = await registry.getConfig(value);
            // 경계 노드는 선택 목록에서 제외 (자동 생성되므로)
            if (config && config.isBoundary) {
                return '';
            }
            return `<option value="${value}">${label}</option>`;
        });
        const nodeTypeOptions = (await Promise.all(nodeTypeOptionsPromises)).filter((opt) => opt !== '').join('');

        return `
            <h3>노드 추가</h3>
            <div class="form-group">
                <label for="node-type">노드 타입:</label>
                <select id="node-type">
                    ${nodeTypeOptions}
                </select>
            </div>
            <div class="form-group" id="detail-node-type-group" style="display: block;">
                <label for="detail-node-type">상세 노드 타입:</label>
                <select id="detail-node-type">
                    <option value="" selected>없음 (기본 동작)</option>
                </select>
                <small style="color: #666; font-size: 12px; display: block; margin-top: 4px;">이 노드가 수행할 상세 동작을 선택하세요.</small>
            </div>
            <div class="form-group">
                <label for="node-title">노드 제목:</label>
                <input type="text" id="node-title" placeholder="노드 제목을 입력하세요">
            </div>
            <div class="form-group">
                <label for="node-description">설명:</label>
                <textarea id="node-description" rows="3" placeholder="노드에 대한 설명을 입력하세요 (선택사항)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <div class="form-group" id="node-custom-settings" style="display: none;">
                <!-- 동적으로 생성되는 노드별 특수 설정 영역 -->
            </div>
            <div class="form-actions">
                <button id="add-node-confirm" class="btn btn-primary">추가</button>
                <button id="add-node-cancel" class="btn btn-secondary">취소</button>
            </div>
        `;
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        const modalManager = this.workflowPage.getModalManager();
        const nodeTypeSelect = document.getElementById('node-type');
        const customSettings = document.getElementById('node-custom-settings');
        const registry = getNodeRegistry();

        // 상세 노드 타입 선택 그룹
        const detailNodeTypeGroup = document.getElementById('detail-node-type-group');
        const detailNodeTypeSelect = document.getElementById('detail-node-type');

        // 노드 타입 변경 시 특수 설정 표시/숨김 (먼저 정의하여 다른 함수에서 사용 가능하도록)
        let updateCustomSettings = null;
        if (nodeTypeSelect && customSettings) {
            updateCustomSettings = async () => {
                const selectedType = nodeTypeSelect.value;
                const config = await registry.getConfig(selectedType);

                // 상세 노드 타입 설정이 있는지 확인
                const currentDetailNodeType = detailNodeTypeSelect ? detailNodeTypeSelect.value : '';
                const tempDiv = document.createElement('div');
                const detailNodeTypeSettings = await this.updateDetailNodeTypeSettings(
                    selectedType,
                    currentDetailNodeType,
                    tempDiv
                );

                if (config && config.requiresFolderPath) {
                    // 폴더 경로가 필요한 노드 (예: image-touch)
                    const folderPathHtml = `
                        <label for="node-folder-path">이미지 폴더 경로:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="node-folder-path" placeholder="예: C:\\images\\touch" style="flex: 1;">
                            <button type="button" id="browse-folder-btn" class="btn btn-secondary">폴더 선택</button>
                        </div>
                        <small style="color: #666; font-size: 12px;">이미지 파일 이름 순서대로 화면에서 찾아 터치합니다.</small>
                    `;
                    customSettings.innerHTML = detailNodeTypeSettings + folderPathHtml;
                    customSettings.style.display = 'block';

                    // 폴더 선택 버튼 이벤트 리스너 재설정
                    const browseBtn = document.getElementById('browse-folder-btn');
                    if (browseBtn) {
                        const newBtn = browseBtn.cloneNode(true);
                        browseBtn.parentNode.replaceChild(newBtn, browseBtn);
                        newBtn.addEventListener('click', () => this.handleFolderSelection());
                    }
                } else if (selectedType === 'process-focus') {
                    // 프로세스 포커스 노드: 프로세스 선택 UI
                    const processFocusHtml = `
                        <label for="node-process-select">프로세스 선택:</label>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <select id="node-process-select" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="">프로세스를 선택하세요</option>
                            </select>
                            <button type="button" id="refresh-processes-btn" class="btn btn-secondary">새로고침</button>
                        </div>
                        <input type="hidden" id="node-process-id">
                        <input type="hidden" id="node-process-hwnd">
                        <input type="hidden" id="node-process-name">
                        <input type="hidden" id="node-window-title">
                        <small style="color: #666; font-size: 12px;">화면에 보이는 프로세스만 표시됩니다. 선택한 프로세스가 실행 시 화면 최상단에 포커스됩니다.</small>
                    `;
                    customSettings.innerHTML = detailNodeTypeSettings + processFocusHtml;
                    customSettings.style.display = 'block';

                    // 프로세스 목록 로드
                    this.loadProcessListForAddModal();

                    // 새로고침 버튼 이벤트
                    const refreshBtn = document.getElementById('refresh-processes-btn');
                    if (refreshBtn) {
                        refreshBtn.addEventListener('click', () => {
                            refreshBtn.disabled = true;
                            refreshBtn.textContent = '새로고침 중...';
                            this.loadProcessListForAddModal().finally(() => {
                                refreshBtn.disabled = false;
                                refreshBtn.textContent = '새로고침';
                            });
                        });
                    }

                    // 프로세스 선택 이벤트
                    const processSelect = document.getElementById('node-process-select');
                    if (processSelect) {
                        processSelect.addEventListener('change', (e) => {
                            const selectedValue = e.target.value;
                            if (selectedValue) {
                                const [processId, hwnd] = selectedValue.split('|');
                                const option = e.target.options[e.target.selectedIndex];
                                const processName = option.dataset.processName || '';
                                const windowTitle = option.dataset.windowTitle || '';

                                document.getElementById('node-process-id').value = processId;
                                document.getElementById('node-process-hwnd').value = hwnd;
                                document.getElementById('node-process-name').value = processName;
                                document.getElementById('node-window-title').value = windowTitle;
                            } else {
                                document.getElementById('node-process-id').value = '';
                                document.getElementById('node-process-hwnd').value = '';
                                document.getElementById('node-process-name').value = '';
                                document.getElementById('node-window-title').value = '';
                            }
                        });
                    }
                } else {
                    // 상세 노드 타입 설정만 표시 (있는 경우)
                    if (detailNodeTypeSettings) {
                        customSettings.innerHTML = detailNodeTypeSettings;
                        customSettings.style.display = 'block';
                    } else {
                        customSettings.innerHTML = '';
                        customSettings.style.display = 'none';
                    }
                }

                // 기본 제목 설정 (nodes.config.js의 title 사용)
                const titleInput = document.getElementById('node-title');
                if (titleInput && config) {
                    // 노드 타입 변경 시 항상 nodes.config.js의 title로 초기화
                    titleInput.value = config.title || getDefaultTitle(selectedType);
                } else if (titleInput) {
                    // config가 없어도 기본값 설정
                    titleInput.value = getDefaultTitle(selectedType);
                }

                // 기본 설명 설정 (nodes.config.js의 description 사용)
                const descriptionInput = document.getElementById('node-description');
                if (descriptionInput && config) {
                    // 노드 타입 변경 시 항상 nodes.config.js의 description으로 초기화
                    descriptionInput.value = config.description || getDefaultDescription(selectedType);
                } else if (descriptionInput) {
                    // config가 없어도 기본값 설정
                    descriptionInput.value = getDefaultDescription(selectedType);
                }
            };

            nodeTypeSelect.addEventListener('change', updateCustomSettings);
            // 초기 설정
            updateCustomSettings().catch((err) => console.error('updateCustomSettings error:', err));
        }

        // 노드 타입 변경 시 상세 노드 타입 선택란 업데이트
        if (nodeTypeSelect && detailNodeTypeGroup && detailNodeTypeSelect) {
            const updateDetailNodeTypeSelect = async () => {
                const selectedType = nodeTypeSelect.value;
                const registry = getNodeRegistry();
                const config = await registry.getConfig(selectedType);
                
                // 경계 노드(start, end)는 상세 노드 타입 선택란을 표시하지 않음
                if (config && config.isBoundary) {
                    detailNodeTypeGroup.style.display = 'none';
                    return;
                }
                
                // 경계 노드가 아니면 항상 상세 노드 타입 선택란 표시
                detailNodeTypeGroup.style.display = 'block';
                
                const detailNodeTypes = await getDetailNodeTypes(selectedType);
                const detailNodeKeys = Object.keys(detailNodeTypes);

                // 상세 노드 타입 옵션 생성 (항상 "없음" 옵션 포함, 기본 선택)
                detailNodeTypeSelect.innerHTML = '<option value="" selected>없음 (기본 동작)</option>';
                
                // 상세 노드 타입이 있으면 추가
                detailNodeKeys.forEach((key) => {
                    const detailConfig = detailNodeTypes[key];
                    const label = detailConfig.label || key;
                    const icon = detailConfig.icon || '';
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = `${icon} ${label}`;
                    detailNodeTypeSelect.appendChild(option);
                });
                
                // 기본값으로 "없음" 선택 보장
                detailNodeTypeSelect.value = '';
            };

            // 상세 노드 타입 변경 시 특수 설정 업데이트
            const handleDetailNodeTypeChange = () => {
                // updateCustomSettings를 다시 호출하여 상세 노드 타입 설정을 반영
                if (updateCustomSettings) {
                    updateCustomSettings().catch((err) => console.error('updateCustomSettings error:', err));
                }
            };

            nodeTypeSelect.addEventListener('change', () => {
                updateDetailNodeTypeSelect().catch((err) => console.error('updateDetailNodeTypeSelect error:', err));
                // 노드 타입 변경 시 상세 노드 타입도 초기화
                detailNodeTypeSelect.value = '';
                // updateCustomSettings 호출
                if (updateCustomSettings) {
                    updateCustomSettings().catch((err) => console.error('updateCustomSettings error:', err));
                }
            });

            detailNodeTypeSelect.addEventListener('change', handleDetailNodeTypeChange);

            // 초기 설정
            updateDetailNodeTypeSelect().catch((err) => console.error('updateDetailNodeTypeSelect error:', err));
        }

        // 폴더 선택 버튼은 동적으로 생성되므로 updateCustomSettings에서 처리됨

        // 확인 버튼
        const confirmBtn = document.getElementById('add-node-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.handleAddNode();
            });
        }

        // 취소 버튼
        const cancelBtn = document.getElementById('add-node-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (modalManager) {
                    modalManager.close();
                }
            });
        }
    }

    /**
     * 폴더 선택 처리
     */
    async handleFolderSelection() {
        const btn = document.getElementById('browse-folder-btn');
        const originalText = btn.textContent;

        try {
            btn.disabled = true;
            btn.textContent = '폴더 선택 중...';

            const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBaseUrl}/api/folder/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            // 변경된 응답 형식: {success: true/false, message: "...", data: {folder_path: "..."}}
            if (result.success && result.data?.folder_path) {
                const folderPath = result.data.folder_path;
                document.getElementById('node-folder-path').value = folderPath;

                // 이미지 개수 확인
                try {
                    const imageListResponse = await fetch(
                        `${apiBaseUrl}/api/images/list?folder_path=${encodeURIComponent(folderPath)}`
                    );
                    const imageListResult = await imageListResponse.json();
                    // 변경된 응답 형식: {success: true, message: "...", data: [...], count: N}
                    if (imageListResult.success) {
                        const count = imageListResult.count || imageListResult.data?.length || 0;
                        const infoText = count > 0 ? `${count}개 이미지 파일 발견` : '이미지 파일 없음';
                        document.getElementById('node-folder-path').title = infoText;
                    }
                } catch (e) {
                    console.warn('이미지 목록 조회 실패:', e);
                }
            } else if (result.message) {
                alert(result.message);
            } else if (!result.success) {
                alert('폴더 선택에 실패했습니다.');
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
     * 노드 추가 처리
     */
    async handleAddNode() {
        const nodeType = document.getElementById('node-type').value;
        const nodeManager = this.workflowPage.getNodeManager();

        // 시작/종료 노드 개수 검증
        const validation = NodeValidationUtils.validateBoundaryNodeCount(nodeType, nodeManager);
        if (!validation.canAdd) {
            const modalManager = this.workflowPage.getModalManager();
            if (modalManager) {
                modalManager.showAlert('노드 추가 불가', validation.message);
            } else {
                alert(validation.message);
            }
            return;
        }

        let nodeTitle = document.getElementById('node-title').value.trim();
        let nodeDescription = document.getElementById('node-description').value.trim();

        // nodes.config.js에서 기본 제목 가져오기
        const registry = getNodeRegistry();
        const config = await registry.getConfig(nodeType);
        const defaultTitle = config?.title || getDefaultTitle(nodeType);
        const defaultDescription = config?.description || getDefaultDescription(nodeType);

        // 제목이 비어있으면 nodes.config.js의 title 사용
        if (!nodeTitle) {
            nodeTitle = defaultTitle;
        }

        // 설명이 비어있으면 nodes.config.js의 description 사용
        if (!nodeDescription) {
            nodeDescription = defaultDescription;
        }

        // 상세 노드 타입 가져오기
        const detailNodeTypeSelect = document.getElementById('detail-node-type');
        const detailNodeType = detailNodeTypeSelect ? detailNodeTypeSelect.value : '';

        const nodeData = {
            id: nodeType === NODE_TYPES.START ? 'start' : nodeType === NODE_TYPES.END ? 'end' : `node_${Date.now()}`,
            type: nodeType,
            title: nodeTitle,
            description: nodeDescription,
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100
        };

        // 상세 노드 타입이 선택된 경우 추가
        if (detailNodeType) {
            nodeData.action_node_type = detailNodeType;

            // 상세 노드 타입별 특수 설정 처리
            if (detailNodeType === 'http-api-request') {
                const httpUrl = document.getElementById('node-http-url')?.value.trim();
                const httpMethod = document.getElementById('node-http-method')?.value || 'GET';
                const httpHeaders = document.getElementById('node-http-headers')?.value.trim();
                const httpBody = document.getElementById('node-http-body')?.value.trim();

                if (!httpUrl) {
                    alert('API URL을 입력해주세요.');
                    return;
                }

                nodeData.http_url = httpUrl;
                nodeData.http_method = httpMethod;

                if (httpHeaders) {
                    try {
                        nodeData.http_headers = JSON.parse(httpHeaders);
                    } catch (e) {
                        alert('Headers가 유효한 JSON 형식이 아닙니다.');
                        return;
                    }
                }

                if (httpBody) {
                    try {
                        nodeData.http_body = JSON.parse(httpBody);
                    } catch (e) {
                        alert('Body가 유효한 JSON 형식이 아닙니다.');
                        return;
                    }
                }
            }
        }

        // 설정 파일에서 특수 설정 확인 (위에서 이미 선언된 registry와 config 재사용)
        if (config && config.requiresFolderPath) {
            const folderPathInput = document.getElementById('node-folder-path');
            if (folderPathInput) {
                const folderPath = folderPathInput.value;
                if (!folderPath) {
                    alert('이미지 폴더 경로를 입력해주세요.');
                    return;
                }
                nodeData.folder_path = folderPath;
            }
        } else if (nodeType === 'process-focus') {
            // 프로세스 포커스 노드: 프로세스 정보 추가
            const processId = document.getElementById('node-process-id')?.value;
            const hwnd = document.getElementById('node-process-hwnd')?.value;
            const processName = document.getElementById('node-process-name')?.value;
            const windowTitle = document.getElementById('node-window-title')?.value;

            if (!processId) {
                alert('프로세스를 선택해주세요.');
                return;
            }

            nodeData.process_id = parseInt(processId);
            if (hwnd) {
                nodeData.hwnd = parseInt(hwnd);
            }
            if (processName) {
                nodeData.process_name = processName;
            }
            if (windowTitle) {
                nodeData.window_title = windowTitle;
            }
        }

        // WorkflowPage의 createNodeFromData 메서드 호출
        this.workflowPage.createNodeFromData(nodeData);

        const modalManager = this.workflowPage.getModalManager();
        if (modalManager) {
            modalManager.close();
        }

        // 노드 생성 후 자동 저장
        try {
            await this.workflowPage.saveWorkflow({ useToast: true });
        } catch (error) {
            console.error('노드 생성 후 자동 저장 실패:', error);
            // 저장 실패해도 노드는 생성되었으므로 사용자에게 알리지 않음
        }
    }

    /**
     * 노드 추가 모달용 프로세스 목록 로드
     */
    async loadProcessListForAddModal() {
        const selectElement = document.getElementById('node-process-select');
        if (!selectElement) {
            return;
        }

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
     * 상세 노드 타입 변경 시 특수 설정 HTML 생성
     *
     * 이 메서드는 상세 노드 타입에 따른 설정 HTML을 생성하여 반환합니다.
     * customSettings 요소에 직접 설정하거나, 다른 설정과 병합할 수 있도록 HTML 문자열을 반환합니다.
     *
     * @param {string} nodeType - 노드 타입 (예: "action")
     * @param {string} detailNodeType - 상세 노드 타입 (예: "http-api-request")
     * @param {HTMLElement} customSettings - 특수 설정 컨테이너 (HTML을 설정하거나 읽기용)
     * @returns {Promise<string>} 생성된 HTML 문자열 (detailNodeType이 없으면 빈 문자열)
     */
    async updateDetailNodeTypeSettings(nodeType, detailNodeType, customSettings) {
        if (!detailNodeType || !customSettings) {
            // 상세 노드 타입이 선택되지 않았거나 "없음"인 경우 빈 문자열 반환
            return '';
        }

        const config = await getDetailNodeConfig(nodeType, detailNodeType);
        if (!config) {
            return '';
        }

        // HTTP API 요청 노드의 경우 특수 설정 HTML 생성
        if (detailNodeType === 'http-api-request') {
            const html = `
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #ddd;">
                    <label for="node-http-url" style="display: block; margin-bottom: 4px; font-weight: 500;">API URL:</label>
                    <input type="text" id="node-http-url" placeholder="https://api.example.com/endpoint" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">
                    <label for="node-http-method" style="display: block; margin-bottom: 4px; font-weight: 500;">HTTP Method:</label>
                    <select id="node-http-method" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px;">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                    <label for="node-http-headers" style="display: block; margin-bottom: 4px; font-weight: 500;">Headers (JSON):</label>
                    <textarea id="node-http-headers" rows="3" placeholder='{"Content-Type": "application/json"}' style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; font-family: monospace; resize: vertical;"></textarea>
                    <label for="node-http-body" style="display: block; margin-bottom: 4px; font-weight: 500;">Body (JSON):</label>
                    <textarea id="node-http-body" rows="4" placeholder='{"key": "value"}' style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; resize: vertical;"></textarea>
                </div>
            `;
            // customSettings가 있으면 설정 (기존 내용과 병합하기 위해 innerHTML에 추가하지 않음)
            // 대신 HTML 문자열을 반환하여 호출자가 병합할 수 있도록 함
            return html;
        }

        // 다른 상세 노드 타입의 경우 빈 문자열 반환
        return '';
    }
}
