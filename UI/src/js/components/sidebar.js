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
                this.selectScript(index);
            });
            
            scriptList.appendChild(scriptItem);
        });
    }
    
    selectScript(index) {
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
    
    getAllScripts() {
        return this.scripts;
    }
    
    dispatchScriptChangeEvent() {
        const event = new CustomEvent('scriptChanged', {
            detail: {
                script: this.getCurrentScript(),
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
