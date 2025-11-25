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
        
        // 전체 스크립트 실행 중 플래그 초기화
        this.isRunningAllScripts = false;
        this.isCancelled = false; // 실행 취소 플래그
        
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
                
                // 저장된 순서 적용
                const savedOrder = this.loadScriptOrder();
                if (savedOrder) {
                    this.applyScriptOrder(savedOrder);
                }
                
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
        
        // 모든 스크립트 실행 버튼은 workflow.js에서 등록하므로 여기서는 제거
        // (헤더의 버튼은 workflow.js에서, 사이드바의 버튼이 있다면 여기서 등록)
        // 현재는 헤더에만 버튼이 있으므로 여기서는 등록하지 않음
    }
    
    loadScripts() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;
        
        log('[Sidebar] loadScripts() 호출됨');
        log(`[Sidebar] 렌더링할 스크립트 개수: ${this.scripts.length}개`);
        
        const scriptList = document.querySelector('.script-list');
        if (!scriptList) {
            logError('[Sidebar] ❌ .script-list 요소를 찾을 수 없습니다!');
            logError('[Sidebar] DOM 상태 확인 필요');
            return;
        }
        
        log('[Sidebar] ✅ .script-list 요소 찾음');
        scriptList.innerHTML = '';
        
        if (this.scripts.length === 0) {
            // 스크립트가 없을 때 메시지 표시
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'script-empty-message';
            emptyMessage.style.cssText = 'padding: 20px; text-align: center; color: #a0aec0; font-size: 14px;';
            emptyMessage.textContent = '스크립트가 없습니다. + 버튼을 눌러 새 스크립트를 추가하세요.';
            scriptList.appendChild(emptyMessage);
            log('[Sidebar] 빈 스크립트 목록 메시지 표시');
            return;
        }
        
        this.scripts.forEach((script, index) => {
            log(`[Sidebar] 스크립트 ${index + 1} 렌더링 중: ${script.name}`);
            
            const scriptItem = document.createElement('div');
            scriptItem.className = `script-item ${script.active ? 'active' : ''}`;
            scriptItem.draggable = true;
            scriptItem.dataset.scriptIndex = index;
            
            scriptItem.innerHTML = `
                <div class="script-drag-handle">⋮⋮</div>
                <div class="script-icon">📄</div>
                <div class="script-info">
                    <div class="script-name">${script.name}</div>
                    <div class="script-desc">${script.description}</div>
                    <div class="script-date">
                        <span class="date-icon">🕐</span>
                        <span class="date-text">${script.date}</span>
                    </div>
                </div>
                <button class="script-delete-btn" title="스크립트 삭제" data-script-index="${index}">
                    <span class="delete-icon">🗑️</span>
                </button>
            `;
            
            // 드래그 앤 드롭 이벤트 핸들러
            this.setupDragAndDrop(scriptItem, index);
            
            // 스크립트 항목 클릭 이벤트 (삭제 버튼 제외)
            scriptItem.addEventListener('click', (e) => {
                // 삭제 버튼이나 드래그 핸들 클릭 시에는 선택 이벤트 발생하지 않도록
                if (e.target.closest('.script-delete-btn') || e.target.closest('.script-drag-handle')) {
                    return;
                }
                log('사이드바 스크립트 클릭됨:', script.name, '인덱스:', index);
                this.selectScript(index);
            });
            
            // 삭제 버튼 클릭 이벤트
            const deleteBtn = scriptItem.querySelector('.script-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 스크립트 선택 이벤트 방지
                log('[Sidebar] 삭제 버튼 클릭됨 - 스크립트:', script.name, '인덱스:', index);
                this.deleteScript(index);
            });
            
            scriptList.appendChild(scriptItem);
        });
        
        log(`[Sidebar] ✅ 스크립트 목록 렌더링 완료: ${this.scripts.length}개 항목`);
    }
    
    /**
     * 드래그 앤 드롭 기능 설정
     */
    setupDragAndDrop(scriptItem, index) {
        const logger = getLogger();
        const log = logger.log;
        
        // 드래그 시작
        scriptItem.addEventListener('dragstart', (e) => {
            scriptItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            log(`[Sidebar] 드래그 시작 - 인덱스: ${index}`);
        });
        
        // 드래그 종료
        scriptItem.addEventListener('dragend', (e) => {
            scriptItem.classList.remove('dragging');
            // 모든 드롭 인디케이터 제거
            document.querySelectorAll('.script-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            log(`[Sidebar] 드래그 종료 - 인덱스: ${index}`);
        });
        
        // 드래그 오버 (다른 항목 위로 이동)
        scriptItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const draggingItem = document.querySelector('.script-item.dragging');
            if (draggingItem && draggingItem !== scriptItem) {
                const rect = scriptItem.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                // 항목의 중간 지점을 기준으로 위/아래 결정
                if (y < rect.height / 2) {
                    scriptItem.classList.add('drag-over-top');
                    scriptItem.classList.remove('drag-over-bottom');
                } else {
                    scriptItem.classList.add('drag-over-bottom');
                    scriptItem.classList.remove('drag-over-top');
                }
            }
        });
        
        // 드래그 리브 (항목에서 벗어남)
        scriptItem.addEventListener('dragleave', (e) => {
            scriptItem.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        // 드롭
        scriptItem.addEventListener('drop', (e) => {
            e.preventDefault();
            scriptItem.classList.remove('drag-over-top', 'drag-over-bottom');
            
            const draggingIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const rect = scriptItem.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            // 드롭 위치에 따라 인덱스 결정
            let dropIndex = index;
            if (y < rect.height / 2) {
                // 위쪽에 드롭
                dropIndex = index;
            } else {
                // 아래쪽에 드롭
                dropIndex = index + 1;
            }
            
            if (draggingIndex !== dropIndex && draggingIndex !== dropIndex - 1) {
                log(`[Sidebar] 드롭 - 드래그 인덱스: ${draggingIndex}, 드롭 인덱스: ${dropIndex}`);
                this.reorderScripts(draggingIndex, dropIndex);
            }
        });
    }
    
    /**
     * 스크립트 순서 변경
     */
    reorderScripts(fromIndex, toIndex) {
        const logger = getLogger();
        const log = logger.log;
        
        // 인덱스 범위 확인
        if (fromIndex < 0 || fromIndex >= this.scripts.length || 
            toIndex < 0 || toIndex > this.scripts.length) {
            log(`[Sidebar] ⚠️ 유효하지 않은 인덱스 - fromIndex: ${fromIndex}, toIndex: ${toIndex}`);
            return;
        }
        
        // 같은 위치면 변경하지 않음
        if (fromIndex === toIndex) {
            return;
        }
        
        log(`[Sidebar] 스크립트 순서 변경 - ${fromIndex} -> ${toIndex}`);
        
        // 배열에서 항목 이동
        const [movedScript] = this.scripts.splice(fromIndex, 1);
        
        // toIndex가 배열 길이를 초과하지 않도록 조정
        const adjustedToIndex = Math.min(toIndex, this.scripts.length);
        this.scripts.splice(adjustedToIndex, 0, movedScript);
        
        // 현재 선택된 스크립트 인덱스 업데이트
        if (this.currentScriptIndex === fromIndex) {
            // 이동한 스크립트가 현재 선택된 스크립트인 경우
            this.currentScriptIndex = adjustedToIndex;
        } else if (fromIndex < adjustedToIndex) {
            // 아래로 이동한 경우
            if (this.currentScriptIndex > fromIndex && this.currentScriptIndex <= adjustedToIndex) {
                this.currentScriptIndex--;
            }
        } else {
            // 위로 이동한 경우
            if (this.currentScriptIndex >= adjustedToIndex && this.currentScriptIndex < fromIndex) {
                this.currentScriptIndex++;
            }
        }
        
        // UI 업데이트
        this.loadScripts();
        
        // 순서 저장
        this.saveScriptOrder();
        
        log(`[Sidebar] ✅ 스크립트 순서 변경 완료`);
    }
    
    /**
     * 스크립트 순서를 로컬 스토리지에 저장
     */
    saveScriptOrder() {
        const order = this.scripts.map(script => script.id);
        localStorage.setItem('script-order', JSON.stringify(order));
        const logger = getLogger();
        logger.log('[Sidebar] 스크립트 순서 저장됨:', order);
    }
    
    /**
     * 로컬 스토리지에서 스크립트 순서 로드
     */
    loadScriptOrder() {
        const savedOrder = localStorage.getItem('script-order');
        if (!savedOrder) {
            return null;
        }
        
        try {
            return JSON.parse(savedOrder);
        } catch (error) {
            console.error('스크립트 순서 로드 실패:', error);
            return null;
        }
    }
    
    /**
     * 저장된 순서대로 스크립트 배열 재정렬
     */
    applyScriptOrder(savedOrder) {
        if (!savedOrder || savedOrder.length === 0) {
            return;
        }
        
        const logger = getLogger();
        const log = logger.log;
        
        // ID를 키로 하는 맵 생성
        const scriptMap = new Map(this.scripts.map(script => [script.id, script]));
        
        // 저장된 순서대로 재정렬
        const orderedScripts = [];
        const usedIds = new Set();
        
        // 저장된 순서대로 추가
        for (const id of savedOrder) {
            if (scriptMap.has(id)) {
                orderedScripts.push(scriptMap.get(id));
                usedIds.add(id);
            }
        }
        
        // 저장된 순서에 없는 새 스크립트들을 끝에 추가
        for (const script of this.scripts) {
            if (!usedIds.has(script.id)) {
                orderedScripts.push(script);
            }
        }
        
        this.scripts = orderedScripts;
        log('[Sidebar] 저장된 순서 적용 완료');
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
        const logError = logger.error;
        const scriptName = document.getElementById('script-name').value;
        const scriptDescription = document.getElementById('script-description').value;
        
        const modalManager = getModalManagerInstance();
        
        log('[Sidebar] addScript() 호출됨');
        log('[Sidebar] 입력된 스크립트 이름:', scriptName);
        log('[Sidebar] 입력된 스크립트 설명:', scriptDescription);
        
        if (!scriptName.trim()) {
            log('[Sidebar] ⚠️ 스크립트 이름이 비어있음');
            modalManager.showAlert('오류', '스크립트 이름을 입력해주세요.');
            return;
        }
        
        try {
            if (ScriptAPI) {
                log('[Sidebar] 서버에 스크립트 생성 요청 전송...');
                // 서버에 스크립트 생성 요청
                const result = await ScriptAPI.createScript(scriptName, scriptDescription || '');
                log('[Sidebar] ✅ 서버에서 스크립트 생성 성공 응답 받음:', result);
                log('[Sidebar] 생성된 스크립트 ID:', result.id);
                log('[Sidebar] 생성된 스크립트 이름:', result.name);
                
                // 클라이언트에서 목록에 추가 (효율적인 방식)
                log('[Sidebar] 클라이언트에서 스크립트 목록 업데이트 시작');
                const newScript = {
                    id: result.id,
                    name: result.name,
                    description: result.description || '',
                    date: this.formatDate(result.updated_at || result.created_at),
                    active: false
                };
                
                // 목록 맨 앞에 추가 (최신 스크립트가 위에 오도록)
                this.scripts.unshift(newScript);
                log('[Sidebar] 스크립트 목록에 추가됨 - ID:', result.id, '이름:', result.name);
                
                // 순서 저장
                this.saveScriptOrder();
                
                // UI 업데이트
                this.loadScripts();
                
                // 새로 생성된 스크립트를 선택 (맨 앞에 추가했으므로 인덱스 0)
                log('[Sidebar] 새로 생성된 스크립트 선택 - 인덱스: 0');
                this.selectScript(0);
                
                // 헤더 업데이트
                this.updateHeader();
                
                log('[Sidebar] ✅ 스크립트 추가 완료');
                log('[Sidebar] 현재 스크립트 개수:', this.scripts.length);
            } else {
                log('[Sidebar] ⚠️ ScriptAPI를 사용할 수 없음. 로컬 폴백 사용');
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
            logError('[Sidebar] ❌ 스크립트 추가 실패:', error);
            logError('[Sidebar] 에러 상세:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            modalManager.showAlert('오류', `스크립트 추가 실패: ${error.message}`);
        }
    }
    
    async deleteScript(index) {
        if (index < 0 || index >= this.scripts.length) {
            const logger = getLogger();
            logger.log('[Sidebar] ⚠️ 유효하지 않은 스크립트 인덱스:', index);
            return;
        }
        
        const script = this.scripts[index];
        
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;
        const modalManager = getModalManagerInstance();
        
        log('[Sidebar] deleteScript() 호출됨');
        log('[Sidebar] 삭제 대상 스크립트:', { id: script.id, name: script.name, index: index });
        
        // 사용자 확인 모달 표시 (사용자 경험 향상)
        modalManager.showConfirm(
            '스크립트 삭제',
            `<div style="text-align: center; padding: 10px 0;">
                <p style="font-size: 16px; margin-bottom: 10px; color: #e2e8f0;">
                    <strong>"${script.name}"</strong> 스크립트를 삭제하시겠습니까?
                </p>
                <p style="font-size: 14px; color: #a0aec0; margin-top: 10px;">
                    이 작업은 되돌릴 수 없습니다.
                </p>
            </div>`,
            async () => {
                log('[Sidebar] 사용자가 삭제 확인함');
                
                try {
                    if (ScriptAPI) {
                        log('[Sidebar] 서버에 스크립트 삭제 요청 전송...');
                        // 서버에 삭제 요청
                        const result = await ScriptAPI.deleteScript(script.id);
                        log('[Sidebar] ✅ 서버에서 스크립트 삭제 성공 응답 받음:', result);
                        
                        // 클라이언트에서 목록에서 삭제 (효율적인 방식)
                        log('[Sidebar] 클라이언트에서 스크립트 목록 업데이트 시작');
                        const deletedIndex = this.scripts.findIndex(s => s.id === script.id);
                        if (deletedIndex >= 0) {
                            this.scripts.splice(deletedIndex, 1);
                            log('[Sidebar] 스크립트 목록에서 삭제됨 - 인덱스:', deletedIndex);
                        }
                        
                        // 현재 선택된 스크립트 인덱스 조정
                        if (this.currentScriptIndex >= deletedIndex && deletedIndex >= 0) {
                            this.currentScriptIndex = Math.max(0, this.currentScriptIndex - 1);
                        }
                        
                        // 순서 저장
                        this.saveScriptOrder();
                        
                        // UI 업데이트
                        this.loadScripts();
                        
                        // 삭제된 스크립트가 현재 선택된 스크립트였던 경우
                        if (this.scripts.length > 0) {
                            // 첫 번째 스크립트 선택
                            log('[Sidebar] 첫 번째 스크립트 선택');
                            this.selectScript(0);
                        } else {
                            // 스크립트가 모두 삭제된 경우
                            log('[Sidebar] 모든 스크립트가 삭제됨');
                            this.currentScriptIndex = -1;
                            this.updateHeader();
                            // 헤더 초기화
                            const titleEl = document.querySelector('.script-title');
                            const descEl = document.querySelector('.script-description');
                            if (titleEl) titleEl.textContent = '스크립트 없음';
                            if (descEl) descEl.textContent = '새 스크립트를 추가하세요.';
                        }
                        
                        log('[Sidebar] ✅ 스크립트 삭제 완료:', script.name);
                        log('[Sidebar] 남은 스크립트 개수:', this.scripts.length);
                        
                        // 성공 메시지 표시
                        modalManager.showAlert('삭제 완료', `"${script.name}" 스크립트가 삭제되었습니다.`);
                    } else {
                        log('[Sidebar] ⚠️ ScriptAPI를 사용할 수 없음. 로컬 폴백 사용');
                        // API가 없을 때의 폴백
                        this.scripts.splice(index, 1);
                        
                        // 현재 선택된 스크립트가 삭제된 경우
                        if (this.currentScriptIndex >= index) {
                            this.currentScriptIndex = Math.max(0, this.currentScriptIndex - 1);
                        }
                        
                        this.loadScripts();
                        this.updateHeader();
                        this.dispatchScriptChangeEvent();
                        
                        log('[Sidebar] 로컬에서 스크립트 삭제됨:', script.name);
                    }
                } catch (error) {
                    logError('[Sidebar] ❌ 스크립트 삭제 실패:', error);
                    logError('[Sidebar] 에러 상세:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                    modalManager.showAlert('삭제 실패', `스크립트 삭제 중 오류가 발생했습니다: ${error.message}`);
                }
            },
            () => {
                log('[Sidebar] 사용자가 삭제 취소함');
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
        const logger = getLogger();
        const log = logger.log;
        
        const currentScript = this.getCurrentScript();
        const previousScript = this.getPreviousScript();
        
        log('[Sidebar] dispatchScriptChangeEvent() 호출됨');
        log('[Sidebar] 현재 스크립트:', currentScript);
        log('[Sidebar] 이전 스크립트:', previousScript);
        
        const event = new CustomEvent('scriptChanged', {
            detail: {
                script: currentScript,
                previousScript: previousScript,
                index: this.currentScriptIndex
            }
        });
        
        log('[Sidebar] scriptChanged 이벤트 dispatch 시작');
        document.dispatchEvent(event);
        log('[Sidebar] ✅ scriptChanged 이벤트 dispatch 완료');
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

    /**
     * 모든 스크립트를 순차적으로 실행
     * 최상단 스크립트부터 차례대로 하나씩 실행합니다.
     * 각 스크립트를 선택하고, 기존 실행 방식대로 노드 하나씩 서버에 요청을 보냅니다.
     */
    async runAllScripts() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;
        const logWarn = logger.warn;
        
        log('[Sidebar] runAllScripts() 호출됨');
        
        if (this.scripts.length === 0) {
            logWarn('[Sidebar] 실행할 스크립트가 없습니다.');
            const modalManager = getModalManagerInstance();
            if (modalManager) {
                modalManager.showAlert('알림', '실행할 스크립트가 없습니다.');
            }
            return;
        }

        // 실행 중 플래그 설정 (중복 실행 방지 / 취소 처리)
        if (this.isRunningAllScripts === true) {
            // 실행 중인 경우 취소 처리
            log('[Sidebar] 실행 취소 요청');
            this.cancelExecution();
            return;
        }
        
        this.isRunningAllScripts = true;
        this.isCancelled = false; // 취소 플래그 초기화

        // 버튼 상태 설정 (다른 버튼 비활성화, 실행 중인 버튼 활성화)
        this.setButtonsState('running', 'run-all-scripts-btn');

        // 스크립트 개수 기준 카운터 (try-catch 블록 밖에서 선언)
        let successCount = 0;
        let failCount = 0;
        let cancelledCount = 0;
        const totalCount = this.scripts.length;

        // WorkflowPage 인스턴스 가져오기 (finally 블록에서도 접근 가능하도록 밖에서 정의)
        const getWorkflowPage = () => {
            // window에서 직접 접근 시도
            if (window.workflowPage) {
                return window.workflowPage;
            }
            // 모듈에서 가져오기 시도
            if (window.getWorkflowPageInstance) {
                return window.getWorkflowPageInstance();
            }
            return null;
        };

        try {
            const modalManager = getModalManagerInstance();

            log(`[Sidebar] 총 ${totalCount}개 스크립트 실행 시작`);

            // 최상단 스크립트부터 순차적으로 실행
            for (let i = 0; i < this.scripts.length; i++) {
                // 취소 플래그 체크
                if (this.isCancelled) {
                    log('[Sidebar] 실행이 취소되었습니다.');
                    // 남은 스크립트 개수를 중단 개수로 계산
                    cancelledCount = totalCount - successCount - failCount;
                    if (modalManager) {
                        modalManager.showAlert(
                            '실행 취소',
                            `실행이 취소되었습니다.\n\n성공 스크립트: ${successCount}개\n실패 스크립트: ${failCount}개\n중단 스크립트: ${cancelledCount}개`
                        );
                    }
                    break;
                }
                
                const script = this.scripts[i];
                log(`[Sidebar] 스크립트 ${i + 1}/${this.scripts.length} 실행 중: ${script.name} (ID: ${script.id})`);

                try {
                    // 1. 스크립트 선택 (포커스)
                    log(`[Sidebar] 스크립트 "${script.name}" 선택 중...`);
                    this.selectScript(i);
                    
                    // 2. 스크립트 로드 완료 대기 (노드들이 화면에 렌더링될 때까지)
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 3. WorkflowPage 인스턴스 가져오기
                    const workflowPage = getWorkflowPage();
                    if (!workflowPage || !workflowPage.executionService) {
                        logWarn(`[Sidebar] WorkflowPage 또는 ExecutionService를 찾을 수 없습니다. 스크립트 "${script.name}" 건너뜀.`);
                        failCount++;
                        continue;
                    }

                    // 4. 현재 화면의 노드들이 있는지 확인
                    const nodes = document.querySelectorAll('.workflow-node');
                    if (nodes.length === 0) {
                        logWarn(`[Sidebar] 스크립트 "${script.name}"에 실행할 노드가 없습니다.`);
                        // 노드가 없는 스크립트는 성공으로 카운트 (스크립트 단위로 카운트)
                        successCount++;
                        continue;
                    }

                    log(`[Sidebar] 스크립트 "${script.name}" 실행 시작 - 노드 개수: ${nodes.length}개`);

                    // 5. 기존 실행 방식 사용 (노드 하나씩 서버에 요청)
                    try {
                        // 취소 플래그와 전체 실행 플래그를 executionService에 전달
                        workflowPage.executionService.isCancelled = this.isCancelled;
                        workflowPage.executionService.isRunningAllScripts = true; // 전체 스크립트 실행 중임을 표시
                        await workflowPage.executionService.execute();
                        
                        // 취소되었는지 확인
                        if (this.isCancelled || workflowPage.executionService.isCancelled) {
                            log('[Sidebar] 실행이 취소되었습니다.');
                            // 남은 스크립트 개수를 중단 개수로 계산 (현재 스크립트는 성공으로 카운트하지 않음)
                            cancelledCount = totalCount - successCount - failCount;
                            break;
                        }
                        
                        successCount++;
                        log(`[Sidebar] ✅ 스크립트 "${script.name}" 실행 완료`);
                    } catch (execError) {
                        failCount++;
                        logError(`[Sidebar] ❌ 스크립트 "${script.name}" 실행 중 오류 발생:`, execError);
                        logError('[Sidebar] 에러 상세:', {
                            name: execError.name,
                            message: execError.message,
                            stack: execError.stack
                        });
                        
                        // 에러 발생 시 모든 실행 중단
                        const errorMessage = execError.message || '알 수 없는 오류';
                        if (modalManager) {
                            modalManager.showAlert(
                                '실행 중단',
                                `스크립트 "${script.name}" 실행 중 오류가 발생하여 모든 실행이 중단되었습니다.\n\n오류: ${errorMessage}`
                            );
                        }
                        
                        // 모든 실행 중단
                        throw execError;
                    }

                    // 스크립트 간 대기 시간 (선택적, 필요시 조정)
                    if (i < this.scripts.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                } catch (error) {
                    failCount++;
                    logError(`[Sidebar] ❌ 스크립트 "${script.name}" 처리 중 오류 발생:`, error);
                    logError('[Sidebar] 에러 상세:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                    
                    // 에러 발생 시 모든 실행 중단
                    const errorMessage = error.message || '알 수 없는 오류';
                    if (modalManager) {
                        modalManager.showAlert(
                            '실행 중단',
                            `스크립트 "${script.name}" 처리 중 오류가 발생하여 모든 실행이 중단되었습니다.\n\n오류: ${errorMessage}`
                        );
                    }
                    
                    // 모든 실행 중단
                    throw error;
                }
            }

            // 중단된 스크립트 개수 계산 (취소되지 않았으면 0)
            if (!this.isCancelled) {
                cancelledCount = totalCount - successCount - failCount;
            }
            
            log(`[Sidebar] 모든 스크립트 실행 완료 - 성공: ${successCount}개, 실패: ${failCount}개, 중단: ${cancelledCount}개`);

            // 실행 결과 알림 (0개여도 모두 표시, 스크립트 개수 기준)
            if (modalManager) {
                const statusMessage = this.isCancelled ? '실행이 취소되었습니다.' : '모든 스크립트 실행이 완료되었습니다.';
                modalManager.showAlert(
                    this.isCancelled ? '실행 취소' : '실행 완료',
                    `${statusMessage}\n\n성공 스크립트: ${successCount}개\n실패 스크립트: ${failCount}개\n중단 스크립트: ${cancelledCount}개`
                );
            }

        } catch (error) {
            logError('[Sidebar] ❌ 모든 스크립트 실행 중 오류 발생:', error);
            logError('[Sidebar] 에러 상세:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // 중단된 스크립트 개수 계산
            cancelledCount = totalCount - successCount - failCount;
            
            const modalManager = getModalManagerInstance();
            if (modalManager) {
                modalManager.showAlert(
                    '실행 중단',
                    `스크립트 실행 중 오류가 발생하여 실행이 중단되었습니다.\n\n성공 스크립트: ${successCount}개\n실패 스크립트: ${failCount}개\n중단 스크립트: ${cancelledCount}개\n\n오류: ${error.message}`
                );
            }
        } finally {
            // 실행 중 플래그 해제
            this.isRunningAllScripts = false;
            this.isCancelled = false;
            
            // executionService의 전체 실행 플래그도 초기화
            const workflowPage = getWorkflowPage();
            if (workflowPage && workflowPage.executionService) {
                workflowPage.executionService.isRunningAllScripts = false;
            }

            // 버튼 상태 복원
            this.setButtonsState('idle');
        }
    }
    
    /**
     * 실행 취소
     */
    cancelExecution() {
        const logger = getLogger();
        logger.log('[Sidebar] 실행 취소 요청');
        this.isCancelled = true;
        
        // WorkflowPage의 executionService도 취소
        const getWorkflowPage = () => {
            if (window.workflowPage) {
                return window.workflowPage;
            }
            if (window.getWorkflowPageInstance) {
                return window.getWorkflowPageInstance();
            }
            return null;
        };
        
        const workflowPage = getWorkflowPage();
        if (workflowPage && workflowPage.executionService) {
            workflowPage.executionService.cancel();
        }
    }
    
    /**
     * 버튼 상태 설정
     * @param {string} state - 'idle' | 'running'
     * @param {string} activeButton - 실행 중인 버튼 클래스 ('run-btn' | 'run-all-scripts-btn')
     */
    setButtonsState(state, activeButton = null) {
        const buttons = {
            save: document.querySelector('.save-btn'),
            addNode: document.querySelector('.add-node-btn'),
            run: document.querySelector('.run-btn'),
            runAll: document.querySelector('.run-all-scripts-btn')
        };
        
        if (state === 'running') {
            // 모든 버튼 비활성화
            Object.values(buttons).forEach(btn => {
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.classList.remove('executing');
                }
            });
            
            // 실행 중인 버튼만 활성화 및 실행 중 스타일 적용
            const activeBtn = activeButton === 'run-btn' ? buttons.run : buttons.runAll;
            if (activeBtn) {
                activeBtn.disabled = false;
                activeBtn.style.opacity = '1';
                activeBtn.style.cursor = 'pointer';
                activeBtn.classList.add('executing');
                
                // 버튼 텍스트 변경
                const btnText = activeBtn.querySelector('.btn-text');
                if (btnText) {
                    activeBtn.dataset.originalText = btnText.textContent;
                    btnText.textContent = '취소';
                }
            }
        } else {
            // 모든 버튼 활성화
            Object.values(buttons).forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.classList.remove('executing');
                    
                    // 버튼 텍스트 복원
                    const btnText = btn.querySelector('.btn-text');
                    if (btnText && btn.dataset.originalText) {
                        btnText.textContent = btn.dataset.originalText;
                        delete btn.dataset.originalText;
                    }
                }
            });
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
