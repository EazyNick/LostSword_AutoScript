// 사이드바 컴포넌트 클래스
// ES6 모듈 방식으로 작성됨

/**
 * ES6 모듈 import
 * 명시적 의존성 관리
 */
import { ScriptAPI } from '../api/scriptapi.js';
import { getModalManagerInstance } from '../utils/modal.js';

/**
 * 로거 유틸리티 import (전역 fallback 포함)
 */
const getLogger = () => {
    // ES6 모듈에서 import 시도 (다른 파일이 ES6 모듈로 변경되면 사용)
    try {
        // 동적 import는 나중에 추가 가능
        return {
            log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
            warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
            error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
        };
    } catch (e) {
        // 전역 fallback
        return {
            log: window.log || console.log,
            warn: window.logWarn || console.warn,
            error: window.logError || console.error
        };
    }
};

// getScriptAPI 함수 제거 - ScriptAPI를 직접 import하여 사용

/**
 * SidebarManager 클래스
 * 사이드바의 스크립트 목록 관리 및 UI 제어를 담당합니다.
 */
export class SidebarManager {
    /**
     * SidebarManager 생성자 (Constructor)
     * 
     * Constructor란?
     * 클래스 인스턴스가 생성될 때 자동으로 호출되는 메서드입니다.
     * 사이드바의 초기 상태를 설정하고, DOM이 준비되면 초기화 작업을 시작합니다.
     * 
     * 주요 역할:
     * 1. 인스턴스 변수 초기화 (스크립트 목록, 현재 선택 인덱스 등)
     * 2. DOM 로드 상태 확인 후 init() 메서드 호출
     * 3. 서버에서 스크립트 목록을 불러오는 작업 시작
     */
    constructor() {
        // 스크립트 목록 배열 초기화 (서버에서 로드된 스크립트들을 저장)
        this.scripts = []; // 초기값은 빈 배열, 서버에서 로드
        
        // 현재 선택된 스크립트의 인덱스 (0부터 시작)
        this.currentScriptIndex = 0;
        
        // 이전에 선택했던 스크립트 정보 저장 (변경 감지 등에 사용)
        this.previousScript = null; // 이전 스크립트 정보 저장
        
        // DOM 로드 상태에 따라 초기화 시점 결정
        // document.readyState가 'loading'이면 아직 DOM이 로드 중이므로
        // DOMContentLoaded 이벤트를 기다린 후 init() 호출
        if (document.readyState === 'loading') {
            // DOM이 완전히 로드될 때까지 대기
            document.addEventListener('DOMContentLoaded', () => {
                // 이벤트 루프의 다음 틱에서 실행 (다른 스크립트들이 먼저 로드되도록)
                setTimeout(() => this.init(), 0);
            });
        } else {
            // DOM이 이미 로드된 상태라면 즉시 init() 호출
            // setTimeout을 사용하여 이벤트 루프의 다음 틱에서 실행
            setTimeout(() => this.init(), 0);
        }
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadScriptsFromServer();
    }
    
    /**
     * 서버에서 스크립트 목록을 가져와서 로드
     */
    async loadScriptsFromServer() {
        const logger = getLogger();
        const log = logger.log;
        const logWarn = logger.warn;
        const logError = logger.error;
        
        log('[Sidebar] loadScriptsFromServer() 시작');
        log('[Sidebar] ScriptAPI 상태:', ScriptAPI !== undefined ? '존재' : '없음');
        log('[Sidebar] apiCall 상태:', typeof window.apiCall);
        
        try {
            // ScriptAPI는 이미 import되었으므로 바로 사용 가능
            if (ScriptAPI && typeof ScriptAPI.getAllScripts === 'function') {
                log('[Sidebar] ✅ ScriptAPI.getAllScripts() 호출 준비 완료');
                log('[Sidebar] 서버에 스크립트 목록 요청 전송...');
                
                const scripts = await ScriptAPI.getAllScripts();
                
                log('[Sidebar] ✅ 서버에서 스크립트 목록 받음:', scripts);
                log(`[Sidebar] 받은 스크립트 개수: ${scripts.length}개`);
                
                // 서버 데이터를 사이드바 형식으로 변환
                this.scripts = scripts.map((script, index) => ({
                    id: script.id,
                    name: script.name,
                    description: script.description || '',
                    date: this.formatDate(script.updated_at || script.created_at),
                    active: index === 0 // 첫 번째 스크립트를 기본 선택
                }));
                
                // 첫 번째 스크립트가 있으면 활성화
                if (this.scripts.length > 0) {
                    this.currentScriptIndex = 0;
                    this.updateHeader();
                }
                
                // UI 업데이트
                this.loadScripts();
                
                // 첫 번째 스크립트 선택 이벤트 발생
                if (this.scripts.length > 0) {
                    this.dispatchScriptChangeEvent();
                }
            } else {
                logWarn('[Sidebar] ⚠️ ScriptAPI를 사용할 수 없습니다. 기본 스크립트를 사용합니다.');
                logWarn('[Sidebar] ScriptAPI:', ScriptAPI);
                logWarn('[Sidebar] window.apiCall:', window.apiCall);
                // API가 없을 때의 폴백 (개발용)
                this.scripts = [
                    {
                        id: 1,
                        name: '로그인 테스트',
                        description: '사용자 로그인 프로세스 검증',
                        date: '2024. 1. 1.',
                        active: true
                    }
                ];
                this.loadScripts();
            }
        } catch (error) {
            logError('[Sidebar] ❌ 스크립트 목록 로드 실패:', error);
            logError('[Sidebar] 에러 상세:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            // 에러 발생 시 빈 목록 또는 기본값 표시
            this.scripts = [];
            this.loadScripts();
        }
    }
    
    /**
     * 날짜 포맷팅 (서버 날짜 형식을 클라이언트 형식으로 변환)
     * @param {string} dateString - ISO 날짜 문자열
     * @returns {string} 포맷된 날짜 문자열
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}. ${month}. ${day}.`;
        } catch (error) {
            console.error('날짜 포맷팅 실패:', error);
            return '';
        }
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
        
        if (this.scripts.length === 0) {
            // 스크립트가 없을 때 메시지 표시
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'script-empty-message';
            emptyMessage.style.cssText = 'padding: 20px; text-align: center; color: #a0aec0; font-size: 14px;';
            emptyMessage.textContent = '스크립트가 없습니다. + 버튼을 눌러 새 스크립트를 추가하세요.';
            scriptList.appendChild(emptyMessage);
            return;
        }
        
        const logger = getLogger();
        const log = logger.log;
        
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
                log('사이드바 스크립트 클릭됨:', script.name, '인덱스:', index);
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
        
        const logger = getLogger();
        logger.log('스크립트 선택됨:', this.scripts[index].name);
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
        
        const modalManager = getModalManagerInstance();
        modalManager.show(content);
        
        // 이벤트 리스너 추가
        document.getElementById('add-script-confirm').addEventListener('click', () => {
            this.addScript();
        });
        
        document.getElementById('add-script-cancel').addEventListener('click', () => {
            modalManager.close();
        });
    }
    
    async addScript() {
        const logger = getLogger();
        const log = logger.log;
        const scriptName = document.getElementById('script-name').value;
        const scriptDescription = document.getElementById('script-description').value;
        
        const modalManager = getModalManagerInstance();
        
        if (!scriptName.trim()) {
            modalManager.showAlert('오류', '스크립트 이름을 입력해주세요.');
            return;
        }
        
        try {
            if (ScriptAPI) {
                // 서버에 스크립트 생성 요청
                const result = await ScriptAPI.createScript(scriptName, scriptDescription || '');
                log('서버에 스크립트 생성됨:', result);
                
                // 서버에서 다시 목록을 가져와서 업데이트
                await this.loadScriptsFromServer();
                
                // 새로 생성된 스크립트를 선택
                const newScriptIndex = this.scripts.findIndex(s => s.id === result.id);
                if (newScriptIndex >= 0) {
                    this.selectScript(newScriptIndex);
                }
            } else {
                // API가 없을 때의 폴백
                const newScript = {
                    id: Date.now(),
                    name: scriptName,
                    description: scriptDescription || '설명 없음',
                    date: new Date().toLocaleDateString('ko-KR'),
                    active: false
                };
                
                this.scripts.push(newScript);
                this.loadScripts();
            }
            
            modalManager.close();
        } catch (error) {
            console.error('스크립트 추가 실패:', error);
            modalManager.showAlert('오류', `스크립트 추가 실패: ${error.message}`);
        }
    }
    
    async deleteScript(index) {
        if (index < 0 || index >= this.scripts.length) return;
        
        const script = this.scripts[index];
        
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;
        const modalManager = getModalManagerInstance();
        
        modalManager.showConfirm(
            '스크립트 삭제',
            `"${script.name}" 스크립트를 삭제하시겠습니까?`,
            async () => {
                try {
                    if (ScriptAPI) {
                        // 서버에 삭제 요청
                        await ScriptAPI.deleteScript(script.id);
                        log('서버에서 스크립트 삭제됨:', script.id);
                        
                        // 서버에서 다시 목록을 가져와서 업데이트
                        await this.loadScriptsFromServer();
                        
                        // 현재 선택된 스크립트가 삭제된 경우 첫 번째 스크립트 선택
                        if (this.scripts.length > 0) {
                            this.selectScript(0);
                        } else {
                            this.updateHeader();
                        }
                    } else {
                        // API가 없을 때의 폴백
                        this.scripts.splice(index, 1);
                        
                        // 현재 선택된 스크립트가 삭제된 경우
                        if (this.currentScriptIndex >= index) {
                            this.currentScriptIndex = Math.max(0, this.currentScriptIndex - 1);
                        }
                        
                        this.loadScripts();
                        this.updateHeader();
                        this.dispatchScriptChangeEvent();
                    }
                    
                    log('스크립트 삭제됨:', script.name);
                } catch (error) {
                    logError('스크립트 삭제 실패:', error);
                    modalManager.showAlert('오류', `스크립트 삭제 실패: ${error.message}`);
                }
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
        const logger = getLogger();
        const log = logger.log;
        
        // 현재 스크립트 정보 가져오기
        const currentScript = this.getCurrentScript();
        if (!currentScript) {
            log('현재 스크립트 정보가 없어서 저장 건너뜀');
            return;
        }
        
        // 현재 노드와 연결선 정보 가져오기
        const currentNodes = window.nodeManager ? window.nodeManager.getAllNodes() : [];
        const currentConnections = window.nodeManager ? window.nodeManager.getAllConnections() : [];
        
        log('사이드바에서 스크립트 전환 전 저장할 데이터:', {
            script: currentScript.name,
            scriptId: currentScript.id,
            nodes: currentNodes.length,
            connections: currentConnections.length
        });
        
        // 노드 데이터 상세 로그
        if (currentNodes.length > 0) {
            log('저장할 노드 데이터:', currentNodes);
        }
        
        // 노드가 없어도 저장 (초기 상태도 보존)
        log('사이드바에서 노드 개수:', currentNodes.length, '연결선 개수:', currentConnections.length);
        
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
            log('사이드바에서 기존 스크립트 데이터 업데이트:', scriptId);
        } else {
            savedWorkflows.push(workflowData);
            log('사이드바에서 새 스크립트 데이터 추가:', scriptId);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
        log('사이드바에서 스크립트 전환 전 저장 완료:', workflowData);
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

/**
 * 사이드바 초기화 함수
 * ES6 모듈에서 export하여 외부에서 호출 가능
 * 
 * @param {Object} options - 초기화 옵션
 * @param {Function} options.onReady - 초기화 완료 콜백
 * @returns {Promise<SidebarManager>} 초기화된 SidebarManager 인스턴스
 */
export async function initializeSidebar(options = {}) {
    const logger = getLogger();
    const log = logger.log;
    const logError = logger.error;
    
    log('[sidebar.js] Sidebar 초기화 시작');
    log('[sidebar.js] 현재 상태 - apiCall:', window.apiCall !== undefined ? '존재' : '없음', 'ScriptAPI:', ScriptAPI !== undefined ? '존재' : '없음');
    
    /**
     * 스크립트 로딩 확인 함수
     * 브라우저 전용 애플리케이션이므로 window는 항상 존재합니다.
     * ScriptAPI는 이미 import되었으므로 항상 존재합니다.
     */
    function checkScriptsLoaded() {
        const apiLoaded = window.apiCall !== undefined;
        // ScriptAPI는 이미 import되었으므로 항상 존재
        const scriptApiLoaded = ScriptAPI !== undefined;
        
        log('[sidebar.js] 스크립트 로딩 상태 확인:', {
            apiCall: apiLoaded ? '로드됨' : '로드 안됨',
            ScriptAPI: scriptApiLoaded ? '로드됨' : '로드 안됨',
            window_apiCall: window.apiCall,
            ScriptAPI: ScriptAPI
        });
        
        return apiLoaded && scriptApiLoaded;
    }
    
    // apiCall이 로드될 때까지 기다리기 (ScriptAPI는 이미 import되었으므로 대기 불필요)
    let attempts = 0;
    const maxAttempts = 10; // 최대 0.5초 대기
    
    while (!checkScriptsLoaded() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        // 10번마다 로그 출력
        if (attempts % 10 === 0) {
            log(`[sidebar.js] 초기화 대기 중... (${attempts}/${maxAttempts})`);
            checkScriptsLoaded();
        }
    }
    
    if (window.apiCall === undefined) {
        logError('[sidebar.js] ❌ apiCall이 로드되지 않았습니다.');
        logError('[sidebar.js] api.js 파일이 로드되었는지 브라우저 개발자 도구의 Network 탭에서 확인하세요.');
    } else {
        log('[sidebar.js] ✅ apiCall 로드 확인됨');
    }
    
    // ScriptAPI는 이미 import되었으므로 항상 존재
    log('[sidebar.js] ✅ ScriptAPI 로드 확인됨 (import)');
    
    // 이제 SidebarManager 인스턴스 생성
    const sidebarManager = new SidebarManager();
    window.sidebarManager = sidebarManager; // 전역 호환성 유지
    log('[sidebar.js] SidebarManager 인스턴스 생성 완료');
    
    if (options.onReady) {
        options.onReady(sidebarManager);
    }
    
    return sidebarManager;
}

/**
 * SidebarManager 인스턴스 가져오기
 * ES6 모듈에서 명시적으로 인스턴스를 가져올 수 있도록 제공
 * 
 * @returns {SidebarManager|null} SidebarManager 인스턴스 또는 null
 */
export function getSidebarInstance() {
    // 먼저 전역 변수 확인 (기존 코드 호환성)
    if (window.sidebarManager) {
        return window.sidebarManager;
    }
    
    // 인스턴스가 없으면 null 반환
    // 호출하는 쪽에서 필요시 initializeSidebar()를 호출해야 함
    return null;
}

/**
 * 자동 초기화 (기존 IIFE 방식과의 호환성 유지)
 * 페이지 로드 완료 후 자동으로 사이드바를 초기화합니다.
 */
export function autoInitializeSidebar() {
    const logger = getLogger();
    const log = logger.log;
    
    log('[sidebar.js] 스크립트 파일 로드됨');
    
    // 모든 스크립트가 로드된 후 초기화
    if (document.readyState === 'complete') {
        // 이미 로드 완료된 경우 약간의 지연 후 실행 (스크립트 실행 완료 대기)
        setTimeout(() => initializeSidebar(), 200);
    } else {
        // window.onload는 모든 리소스(이미지, 스크립트 등)가 로드된 후 실행
        window.addEventListener('load', () => {
            log('[sidebar.js] window.onload 이벤트 발생');
            // 추가로 약간의 지연을 두어 스크립트 실행이 완료되도록 함
            setTimeout(() => initializeSidebar(), 200);
        });
    }
}

// 자동 초기화 실행 (기존 IIFE 방식과 동일한 동작)
// ES6 모듈이 아닌 경우에만 실행 (스크립트 태그로 로드된 경우)
// 주의: ES6 모듈로 사용할 때는 명시적으로 import하여 사용해야 합니다.
// 브라우저 전용 애플리케이션이므로 window는 항상 존재합니다.
if (!window.__ES6_MODULE_LOADED__) {
    autoInitializeSidebar();
}
