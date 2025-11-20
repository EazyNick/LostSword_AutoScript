/**
 * 노드 추가 모달 관리
 * 노드 추가 모달의 UI 생성 및 이벤트 처리를 담당합니다.
 */

import { NODE_TYPES, NODE_TYPE_LABELS } from '../constants/node-types.js';
import { getDefaultTitle, getDefaultColor } from '../config/node-defaults.js';
import { NodeValidationUtils } from '../utils/node-validation-utils.js';
import { getNodeRegistry } from '../services/node-registry.js';

export class AddNodeModal {
    constructor(workflowPage) {
        this.workflowPage = workflowPage;
    }

    /**
     * 노드 추가 모달 표시
     */
    show() {
        const modalManager = this.workflowPage.getModalManager();
        if (!modalManager) {
            console.error('ModalManager를 사용할 수 없습니다.');
            return;
        }

        const content = this.generateModalContent();
        modalManager.show(content);

        this.setupEventListeners();
    }

    /**
     * 모달 HTML 콘텐츠 생성
     */
    generateModalContent() {
        const registry = getNodeRegistry();
        const nodeTypeOptions = Object.entries(NODE_TYPE_LABELS)
            .map(([value, label]) => {
                const config = registry.getConfig(value);
                // 경계 노드는 선택 목록에서 제외 (자동 생성되므로)
                if (config && config.isBoundary) {
                    return '';
                }
                return `<option value="${value}">${label}</option>`;
            })
            .filter(opt => opt !== '')
            .join('');

        return `
            <h3>노드 추가</h3>
            <div class="form-group">
                <label for="node-type">노드 타입:</label>
                <select id="node-type">
                    ${nodeTypeOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="node-title">노드 제목:</label>
                <input type="text" id="node-title" placeholder="노드 제목을 입력하세요">
            </div>
            <div class="form-group" id="node-custom-settings" style="display: none;">
                <!-- 동적으로 생성되는 노드별 특수 설정 영역 -->
            </div>
            <div class="form-group">
                <label for="node-color">노드 색상:</label>
                <select id="node-color">
                    <option value="blue">파란색</option>
                    <option value="orange">주황색</option>
                    <option value="green">초록색</option>
                    <option value="purple">보라색</option>
                </select>
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

        // 노드 타입 변경 시 특수 설정 표시/숨김
        if (nodeTypeSelect && customSettings) {
            const updateCustomSettings = () => {
                const selectedType = nodeTypeSelect.value;
                const config = registry.getConfig(selectedType);
                
                if (config && config.requiresFolderPath) {
                    // 폴더 경로가 필요한 노드 (예: image-touch)
                    customSettings.innerHTML = `
                        <label for="node-folder-path">이미지 폴더 경로:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="node-folder-path" placeholder="예: C:\\images\\touch" style="flex: 1;">
                            <button type="button" id="browse-folder-btn" class="btn btn-secondary">폴더 선택</button>
                        </div>
                        <small style="color: #666; font-size: 12px;">이미지 파일 이름 순서대로 화면에서 찾아 터치합니다.</small>
                    `;
                    customSettings.style.display = 'block';
                    
                    // 폴더 선택 버튼 이벤트 리스너 재설정
                    const browseBtn = document.getElementById('browse-folder-btn');
                    if (browseBtn) {
                        browseBtn.addEventListener('click', () => this.handleFolderSelection());
                    }
                } else {
                    customSettings.innerHTML = '';
                    customSettings.style.display = 'none';
                }
                
                // 기본 제목 설정
                const titleInput = document.getElementById('node-title');
                if (titleInput && !titleInput.value && config) {
                    titleInput.value = config.title || getDefaultTitle(selectedType);
                }
                
                // 기본 색상 설정
                const colorSelect = document.getElementById('node-color');
                if (colorSelect && config) {
                    colorSelect.value = config.color || 'blue';
                }
            };
            
            nodeTypeSelect.addEventListener('change', updateCustomSettings);
            // 초기 설정
            updateCustomSettings();
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

            const response = await fetch('http://localhost:8000/api/folder/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success && data.folder_path) {
                document.getElementById('node-folder-path').value = data.folder_path;

                // 이미지 개수 확인
                try {
                    const imageListResponse = await fetch(
                        `http://localhost:8000/api/images/list?folder_path=${encodeURIComponent(data.folder_path)}`
                    );
                    const imageListData = await imageListResponse.json();
                    if (imageListData.success) {
                        const count = imageListData.count || 0;
                        const infoText = count > 0 ? `${count}개 이미지 파일 발견` : '이미지 파일 없음';
                        document.getElementById('node-folder-path').title = infoText;
                    }
                } catch (e) {
                    console.warn('이미지 목록 조회 실패:', e);
                }
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
     * 노드 추가 처리
     */
    handleAddNode() {
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
        
        let nodeTitle = document.getElementById('node-title').value;
        let nodeColor = document.getElementById('node-color').value;

        // 시작/종료 노드는 기본 색상과 제목 설정
        if (nodeType === NODE_TYPES.START) {
            if (!nodeTitle) nodeTitle = getDefaultTitle(NODE_TYPES.START);
            if (!nodeColor || nodeColor === 'blue') nodeColor = getDefaultColor(NODE_TYPES.START);
        } else if (nodeType === NODE_TYPES.END) {
            if (!nodeTitle) nodeTitle = getDefaultTitle(NODE_TYPES.END);
            if (!nodeColor || nodeColor === 'blue') nodeColor = getDefaultColor(NODE_TYPES.END);
        } else {
            if (!nodeTitle) nodeTitle = getDefaultTitle(nodeType);
        }

        const nodeData = {
            id: nodeType === NODE_TYPES.START ? 'start' : 
                (nodeType === NODE_TYPES.END ? 'end' : `node_${Date.now()}`),
            type: nodeType,
            title: nodeTitle,
            color: nodeColor,
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100
        };

        // 설정 파일에서 특수 설정 확인
        const registry = getNodeRegistry();
        const config = registry.getConfig(nodeType);
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
        }

        // WorkflowPage의 createNodeFromData 메서드 호출
        this.workflowPage.createNodeFromData(nodeData);

        const modalManager = this.workflowPage.getModalManager();
        if (modalManager) {
            modalManager.close();
        }
    }
}

