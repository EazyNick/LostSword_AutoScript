// 사이드바 컴포넌트 클래스
class SidebarManager {
    constructor() {
        this.scripts = [
            {
                id: 1,
                name: '로그인 테스트',
                description: '사용자 로그인 프로세스 검증',
                date: '2024. 1. 1.',
                active: true
            },
            {
                id: 2,
                name: '결제 프로세스 테스트',
                description: '온라인 결제 과정 검증',
                date: '2024. 1. 2.',
                active: false
            }
        ];
        
        this.currentScriptIndex = 0;
        this.previousScript = null; // 이전 스크립트 정보 저장
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadScripts();
    }
    
    setupEventListeners() {
        // 스크립트 추가 버튼
        document.querySelector('.add-script-btn').addEventListener('click', () => {
            this.showAddScriptModal();
        });
    }
    
    loadScripts() {
        const scriptList = document.querySelector('.script-list');
        scriptList.innerHTML = '';
        
        this.scripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = `script-item ${script.active ? 'active' : ''}`;
            
            scriptItem.innerHTML = `
                <div class="script-icon">📄</div>
                <div class="script-info">
                    <div class="script-name">${script.name}</div>
                    <div class="script-desc">${script.description}</div>
                    <div class="script-date">
                        <span class="date-icon">🕐</span>
                        <span class="date-text">${script.date}</span>
                    </div>
                </div>
            `;
            
            scriptItem.addEventListener('click', () => {
                console.log('사이드바 스크립트 클릭됨:', script.name, '인덱스:', index);
                this.selectScript(index);
            });
            
            scriptList.appendChild(scriptItem);
        });
    }
    
    selectScript(index) {
        // 이전 스크립트 정보 저장 (스크립트 변경 전에)
        const previousScript = this.getCurrentScript();
        this.previousScript = previousScript;
        
        // 모든 스크립트 비활성화
        this.scripts.forEach(script => script.active = false);
        
        // 선택된 스크립트 활성화
        this.scripts[index].active = true;
        this.currentScriptIndex = index;
        
        // UI 업데이트
        this.loadScripts();
        
        // 헤더 업데이트
        this.updateHeader();
        
        // 이벤트 발생
        this.dispatchScriptChangeEvent();
        
        console.log('스크립트 선택됨:', this.scripts[index].name);
    }
    
    updateHeader() {
        const selectedScript = this.scripts[this.currentScriptIndex];
        document.querySelector('.script-title').textContent = selectedScript.name;
        document.querySelector('.script-description').textContent = selectedScript.description;
    }
    
    showAddScriptModal() {
        const content = `
            <h3>새 스크립트 추가</h3>
            <div class="form-group">
                <label for="script-name">스크립트 이름:</label>
                <input type="text" id="script-name" placeholder="스크립트 이름을 입력하세요">
            </div>
            <div class="form-group">
                <label for="script-description">설명:</label>
                <textarea id="script-description" placeholder="스크립트 설명을 입력하세요"></textarea>
            </div>
            <div class="form-actions">
                <button id="add-script-confirm" class="btn btn-primary">추가</button>
                <button id="add-script-cancel" class="btn btn-secondary">취소</button>
            </div>
        `;
        
        window.modalManager.show(content);
        
        // 이벤트 리스너 추가
        document.getElementById('add-script-confirm').addEventListener('click', () => {
            this.addScript();
        });
        
        document.getElementById('add-script-cancel').addEventListener('click', () => {
            window.modalManager.close();
        });
    }
    
    addScript() {
        const scriptName = document.getElementById('script-name').value;
        const scriptDescription = document.getElementById('script-description').value;
        
        if (!scriptName.trim()) {
            window.modalManager.showAlert('오류', '스크립트 이름을 입력해주세요.');
            return;
        }
        
        const newScript = {
            id: Date.now(),
            name: scriptName,
            description: scriptDescription || '설명 없음',
            date: new Date().toLocaleDateString('ko-KR'),
            active: false
        };
        
        this.scripts.push(newScript);
        this.loadScripts();
        window.modalManager.close();
        
        console.log('스크립트 추가됨:', newScript);
    }
    
    deleteScript(index) {
        if (index < 0 || index >= this.scripts.length) return;
        
        const script = this.scripts[index];
        
        window.modalManager.showConfirm(
            '스크립트 삭제',
            `"${script.name}" 스크립트를 삭제하시겠습니까?`,
            () => {
                this.scripts.splice(index, 1);
                
                // 현재 선택된 스크립트가 삭제된 경우
                if (this.currentScriptIndex >= index) {
                    this.currentScriptIndex = Math.max(0, this.currentScriptIndex - 1);
                }
                
                this.loadScripts();
                this.updateHeader();
                this.dispatchScriptChangeEvent();
                
                console.log('스크립트 삭제됨:', script.name);
            }
        );
    }
    
    getCurrentScript() {
        return this.scripts[this.currentScriptIndex];
    }
    
    getPreviousScript() {
        return this.previousScript || null;
    }
    
    /**
     * 스크립트 변경 전 현재 워크플로우 저장
     * 노드가 삭제되기 전에 현재 상태를 저장합니다.
     */
    saveCurrentWorkflowBeforeSwitch() {
        // 현재 스크립트 정보 가져오기
        const currentScript = this.getCurrentScript();
        if (!currentScript) {
            console.log('현재 스크립트 정보가 없어서 저장 건너뜀');
            return;
        }
        
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = window.nodeManager ? window.nodeManager.getAllNodes() : [];
        const currentConnections = window.nodeManager ? window.nodeManager.getAllConnections() : [];
        
        console.log('사이드바에서 스크립트 전환 전 저장할 데이터:', {
            script: currentScript.name,
            scriptId: currentScript.id,
            nodes: currentNodes.length,
            connections: currentConnections.length
        });
        
        // 노드 데이터 상세 로그
        if (currentNodes.length > 0) {
            console.log('저장할 노드 데이터:', currentNodes);
        }
        
        // 노드가 없어도 저장 (초기 상태도 보존)
        console.log('사이드바에서 노드 개수:', currentNodes.length, '연결선 개수:', currentConnections.length);
        
        // 현재 캔버스 뷰포트 위치 가져오기
        const viewportPosition = this.getCurrentViewportPosition();
        
        const workflowData = {
            script: currentScript,
            nodes: currentNodes,
            connections: currentConnections,
            viewport: viewportPosition,
            timestamp: new Date().toISOString()
        };
        
        // 로컬 스토리지에 저장 (기존 데이터 업데이트 방식)
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = currentScript.id;
        
        // 기존 스크립트 데이터가 있으면 업데이트, 없으면 새로 추가
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
            console.log('사이드바에서 기존 스크립트 데이터 업데이트:', scriptId);
        } else {
            savedWorkflows.push(workflowData);
            console.log('사이드바에서 새 스크립트 데이터 추가:', scriptId);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        console.log('사이드바에서 스크립트 전환 전 저장 완료:', workflowData);
    }
    
    /**
     * 현재 캔버스 뷰포트 위치 가져오기
     */
    getCurrentViewportPosition() {
        const canvasContent = document.getElementById('canvas-content');
        
        if (canvasContent) {
            // Transform 기반 패닝 (피그마 방식)
            const transform = canvasContent.style.transform || 'translate(-50000px, -50000px) scale(1)';
            
            // Transform 파싱
            let x = -50000, y = -50000, scale = 1;
            
            const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (translateMatch) {
                x = parseFloat(translateMatch[1]) || -50000;
                y = parseFloat(translateMatch[2]) || -50000;
            }
            
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                scale = parseFloat(scaleMatch[1]) || 1;
            }
            
            return { x, y, scale, mode: 'transform' };
        } else {
            // 스크롤 기반 패닝 (전통적 방식)
            const canvas = document.getElementById('workflow-canvas');
            if (canvas) {
                const x = canvas.scrollLeft || 0;
                const y = canvas.scrollTop || 0;
                return { x, y, scale: 1, mode: 'scroll' };
            }
        }
        
        // 기본값 반환
        return { x: -50000, y: -50000, scale: 1, mode: 'transform' };
    }
    
    getAllScripts() {
        return this.scripts;
    }
    
    dispatchScriptChangeEvent() {
        const event = new CustomEvent('scriptChanged', {
            detail: {
                script: this.getCurrentScript(),
                previousScript: this.getPreviousScript(),
                index: this.currentScriptIndex
            }
        });
        document.dispatchEvent(event);
    }
    
    // 스크립트 데이터 저장/로드
    saveScripts() {
        localStorage.setItem('workflow-scripts', JSON.stringify(this.scripts));
    }
    
    loadScriptsFromStorage() {
        const saved = localStorage.getItem('workflow-scripts');
        if (saved) {
            try {
                this.scripts = JSON.parse(saved);
                this.loadScripts();
                this.updateHeader();
            } catch (error) {
                console.error('스크립트 로드 실패:', error);
            }
        }
    }
}

// 전역 사이드바 매니저 인스턴스
window.sidebarManager = new SidebarManager();
