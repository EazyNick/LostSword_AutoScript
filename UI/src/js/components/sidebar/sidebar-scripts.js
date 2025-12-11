/**
 * SidebarManager 스크립트 관리
 *
 * 이 모듈은 사이드바의 스크립트 관련 모든 비즈니스 로직을 담당합니다.
 * - 스크립트 CRUD 작업 (생성, 조회, 수정, 삭제)
 * - 스크립트 목록 로드 및 순서 관리
 * - 스크립트 실행 (단일 및 전체 실행)
 * - 스크립트 선택 및 포커스 관리
 *
 * @module sidebar-scripts
 */

import { ScriptAPI } from '../../api/scriptapi.js';
import { UserSettingsAPI } from '../../api/user-settings-api.js';
import { getModalManagerInstance } from '../../utils/modal.js';
import { getLogger, formatDate } from './sidebar-utils.js';

/**
 * 스크립트 관리 클래스
 *
 * SidebarManager의 스크립트 관련 기능을 담당하는 클래스입니다.
 * 서버와의 통신, 스크립트 데이터 관리, 실행 로직 등을 처리합니다.
 *
 * @class SidebarScriptManager
 */
export class SidebarScriptManager {
    /**
     * SidebarScriptManager 생성자
     *
     * @param {SidebarManager} sidebarManager - 부모 SidebarManager 인스턴스
     */
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
        this.scriptAPI = ScriptAPI;
        this.userSettingsAPI = UserSettingsAPI;
    }

    /**
     * 서버에서 스크립트 목록을 가져와서 로드
     *
     * 서버의 스크립트 목록을 조회하여 사이드바에 표시할 형식으로 변환합니다.
     * 저장된 포커스된 스크립트 ID를 복원하여 이전 선택 상태를 유지합니다.
     *
     * @returns {Promise<void>}
     * @throws {Error} 서버 통신 실패 시
     */
    async loadScriptsFromServer() {
        const logger = getLogger();
        const log = logger.log;
        const logWarn = logger.warn;
        const logError = logger.error;

        log('[Sidebar] loadScriptsFromServer() 시작');
        log('[Sidebar] ScriptAPI 상태:', this.scriptAPI !== undefined ? '존재' : '없음');
        log('[Sidebar] apiCall 상태:', typeof window.apiCall);

        try {
            // ScriptAPI는 이미 import되었으므로 바로 사용 가능
            if (this.scriptAPI && typeof this.scriptAPI.getAllScripts === 'function') {
                log('[Sidebar] ✅ ScriptAPI.getAllScripts() 호출 준비 완료');
                log('[Sidebar] 서버에 스크립트 목록 요청 전송...');

                const scripts = await this.scriptAPI.getAllScripts();

                log('[Sidebar] ✅ 서버에서 스크립트 목록 받음:', scripts);
                log(`[Sidebar] 받은 스크립트 개수: ${scripts.length}개`);

                // 서버에서 이미 execution_order 기준으로 정렬되어 반환되므로 별도 정렬 불필요

                // 서버 데이터를 사이드바 형식으로 변환
                // DB의 active 필드를 유지 (서버에서 받은 active 값 사용)
                this.sidebarManager.scripts = scripts.map((script, index) => ({
                    id: script.id,
                    name: script.name,
                    description: script.description || '',
                    date: formatDate(script.updated_at || script.created_at),
                    active: index === 0, // 첫 번째 스크립트를 기본 선택 (로컬 선택 상태)
                    dbActive: script.active !== undefined ? script.active : true // DB의 active 필드 (실제 활성화 상태)
                }));

                // DB에서 받은 순서가 이미 execution_order로 정렬되어 있으므로 별도 순서 적용 불필요
                // (서버에서 ORDER BY execution_order로 정렬하여 반환)

                // 저장된 포커스된 스크립트 ID 복원
                let focusedScriptIndex = 0; // 기본값: 첫 번째 스크립트
                try {
                    const focusedScriptId = await this.userSettingsAPI.getSetting('focused-script-id');
                    if (focusedScriptId) {
                        const scriptId = parseInt(focusedScriptId, 10);
                        const foundIndex = this.sidebarManager.scripts.findIndex((script) => script.id === scriptId);
                        if (foundIndex !== -1) {
                            focusedScriptIndex = foundIndex;
                            log(`[Sidebar] 저장된 포커스된 스크립트 복원: ID=${scriptId}, Index=${foundIndex}`);
                        } else {
                            log(
                                `[Sidebar] 저장된 포커스된 스크립트를 찾을 수 없음: ID=${scriptId}, 첫 번째 스크립트 선택`
                            );
                        }
                    }
                } catch (error) {
                    log('[Sidebar] 포커스된 스크립트 복원 실패 (첫 번째 스크립트 선택):', error);
                }

                // 포커스된 스크립트 활성화
                if (this.sidebarManager.scripts.length > 0) {
                    this.sidebarManager.currentScriptIndex = focusedScriptIndex;
                    // 선택된 스크립트 활성화 (selectScript 호출하지 않고 직접 설정하여 중복 저장 방지)
                    this.sidebarManager.scripts.forEach((script, idx) => {
                        script.active = idx === focusedScriptIndex;
                    });
                    this.sidebarManager.uiManager.updateHeader();
                }

                // UI 업데이트
                this.sidebarManager.uiManager.loadScripts();

                // 포커스된 스크립트 선택 이벤트 발생
                if (this.sidebarManager.scripts.length > 0) {
                    this.sidebarManager.dispatchScriptChangeEvent();
                }
            } else {
                logWarn('[Sidebar] ⚠️ ScriptAPI를 사용할 수 없습니다. 기본 스크립트를 사용합니다.');
                logWarn('[Sidebar] ScriptAPI:', this.scriptAPI);
                logWarn('[Sidebar] window.apiCall:', window.apiCall);
                // API가 없을 때의 폴백 (개발용)
                this.sidebarManager.scripts = [
                    {
                        id: 1,
                        name: '로그인 테스트',
                        description: '사용자 로그인 프로세스 검증',
                        date: '2024. 1. 1.',
                        active: true
                    }
                ];
                this.sidebarManager.uiManager.loadScripts();
            }
        } catch (error) {
            logError('[Sidebar] ❌ 스크립트 목록 로드 실패:', error);
            logError('[Sidebar] 에러 상세:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            // 에러 발생 시 빈 목록 또는 기본값 표시
            this.sidebarManager.scripts = [];
            this.sidebarManager.uiManager.loadScripts();
        }
    }

    /**
     * 스크립트 순서 변경
     */
    reorderScripts(fromIndex, toIndex) {
        const logger = getLogger();
        const log = logger.log;

        // 인덱스 범위 확인
        if (
            fromIndex < 0 ||
            fromIndex >= this.sidebarManager.scripts.length ||
            toIndex < 0 ||
            toIndex > this.sidebarManager.scripts.length
        ) {
            log(`[Sidebar] ⚠️ 유효하지 않은 인덱스 - fromIndex: ${fromIndex}, toIndex: ${toIndex}`);
            return;
        }

        // 같은 위치면 변경하지 않음
        if (fromIndex === toIndex) {
            return;
        }

        log(`[Sidebar] 스크립트 순서 변경 - ${fromIndex} -> ${toIndex}`);

        // 배열에서 항목 이동
        const [movedScript] = this.sidebarManager.scripts.splice(fromIndex, 1);

        // toIndex가 배열 길이를 초과하지 않도록 조정
        const adjustedToIndex = Math.min(toIndex, this.sidebarManager.scripts.length);
        this.sidebarManager.scripts.splice(adjustedToIndex, 0, movedScript);

        // 현재 선택된 스크립트 인덱스 업데이트
        if (this.sidebarManager.currentScriptIndex === fromIndex) {
            // 이동한 스크립트가 현재 선택된 스크립트인 경우
            this.sidebarManager.currentScriptIndex = adjustedToIndex;
        } else if (fromIndex < adjustedToIndex) {
            // 아래로 이동한 경우
            if (
                this.sidebarManager.currentScriptIndex > fromIndex &&
                this.sidebarManager.currentScriptIndex <= adjustedToIndex
            ) {
                this.sidebarManager.currentScriptIndex--;
            }
        } else {
            // 위로 이동한 경우
            if (
                this.sidebarManager.currentScriptIndex >= adjustedToIndex &&
                this.sidebarManager.currentScriptIndex < fromIndex
            ) {
                this.sidebarManager.currentScriptIndex++;
            }
        }

        // UI 업데이트
        this.sidebarManager.uiManager.loadScripts();

        // 순서 저장 (비동기) - DB에 execution_order 업데이트
        this.saveScriptOrderToDB().catch((error) => {
            const logger = getLogger();
            logger.error('[Sidebar] 스크립트 실행 순서 DB 저장 실패:', error);
        });

        log('[Sidebar] ✅ 스크립트 순서 변경 완료');
    }

    /**
     * 스크립트 실행 순서를 DB에 저장 (execution_order 업데이트)
     */
    async saveScriptOrderToDB() {
        const logger = getLogger();
        const log = logger.log;
        const logWarn = logger.warn;
        const logError = logger.error;

        // 현재 순서대로 execution_order 설정 (0부터 시작)
        // 이 순서는 '전체 실행' 시에도 사용됨
        const scriptOrders = this.sidebarManager.scripts.map((script, index) => ({
            id: script.id,
            order: index
        }));

        try {
            // ScriptAPI를 통해 DB에 실행 순서 업데이트
            if (this.scriptAPI && typeof this.scriptAPI.updateScriptOrder === 'function') {
                await this.scriptAPI.updateScriptOrder(scriptOrders);
                log('[Sidebar] 스크립트 실행 순서 DB에 저장됨:', scriptOrders);
            } else {
                logWarn('[Sidebar] ScriptAPI.updateScriptOrder를 사용할 수 없습니다.');
            }
        } catch (error) {
            logError('[Sidebar] 스크립트 실행 순서 DB 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 스크립트 순서를 서버에 저장 (기존 방식 - 호환성 유지)
     */
    async saveScriptOrder() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        const order = this.sidebarManager.scripts.map((script) => script.id);

        try {
            // 서버에 저장 시도
            if (this.userSettingsAPI) {
                await this.userSettingsAPI.saveSetting('script-order', JSON.stringify(order));
                log('[Sidebar] 스크립트 순서 서버에 저장됨:', order);
            } else {
                // 폴백: 로컬 스토리지에 저장
                localStorage.setItem('script-order', JSON.stringify(order));
                log('[Sidebar] 스크립트 순서 로컬 스토리지에 저장됨:', order);
            }
        } catch (error) {
            logError('[Sidebar] 서버 저장 실패, 로컬 스토리지에 저장:', error);
            // 서버 저장 실패 시 로컬 스토리지에 저장 (폴백)
            localStorage.setItem('script-order', JSON.stringify(order));
        }
    }

    /**
     * 서버에서 스크립트 순서 로드
     */
    async loadScriptOrder() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        try {
            let savedOrder = null;

            // 서버에서 로드 시도
            if (this.userSettingsAPI) {
                try {
                    const orderStr = await this.userSettingsAPI.getSetting('script-order');
                    if (orderStr) {
                        savedOrder = JSON.parse(orderStr);
                        log('[Sidebar] 스크립트 순서 서버에서 로드됨:', savedOrder);
                    }
                } catch (error) {
                    log('[Sidebar] 서버에서 설정을 찾을 수 없음, 로컬 스토리지 확인');
                }
            }

            // 서버에 없으면 로컬 스토리지에서 로드
            if (!savedOrder) {
                const orderStr = localStorage.getItem('script-order');
                if (orderStr) {
                    savedOrder = JSON.parse(orderStr);
                    log('[Sidebar] 스크립트 순서 로컬 스토리지에서 로드됨:', savedOrder);
                }
            }

            return savedOrder;
        } catch (error) {
            logError('[Sidebar] 스크립트 순서 로드 실패:', error);
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
        const scriptMap = new Map(this.sidebarManager.scripts.map((script) => [script.id, script]));

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
        for (const script of this.sidebarManager.scripts) {
            if (!usedIds.has(script.id)) {
                orderedScripts.push(script);
            }
        }

        this.sidebarManager.scripts = orderedScripts;
        log('[Sidebar] 저장된 순서 적용 완료');
    }

    /**
     * 스크립트 선택
     */
    async selectScript(index) {
        // 이전 스크립트 정보 저장 (스크립트 변경 전에)
        const previousScript = this.sidebarManager.getCurrentScript();
        this.sidebarManager.previousScript = previousScript;

        // 모든 스크립트 비활성화
        this.sidebarManager.scripts.forEach((script) => (script.active = false));

        // 선택된 스크립트 활성화
        this.sidebarManager.scripts[index].active = true;
        this.sidebarManager.currentScriptIndex = index;

        // 포커스된 스크립트 ID 저장 (비동기, 에러 무시)
        const selectedScript = this.sidebarManager.scripts[index];
        if (selectedScript && selectedScript.id) {
            try {
                await this.userSettingsAPI.saveSetting('focused-script-id', selectedScript.id.toString());
                const logger = getLogger();
                logger.log(`[Sidebar] 포커스된 스크립트 ID 저장됨: ${selectedScript.id}`);
            } catch (error) {
                // 에러는 무시 (설정 저장 실패해도 스크립트 선택은 계속 진행)
                const logger = getLogger();
                logger.log('[Sidebar] 포커스된 스크립트 ID 저장 실패 (무시):', error);
            }
        }

        // UI 업데이트
        this.sidebarManager.uiManager.loadScripts();

        // 헤더 업데이트
        this.sidebarManager.uiManager.updateHeader();

        // 이벤트 발생
        this.sidebarManager.dispatchScriptChangeEvent();

        const logger = getLogger();
        logger.log('스크립트 선택됨:', this.sidebarManager.scripts[index].name);
    }

    /**
     * 스크립트 추가 모달 표시
     */
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

    /**
     * 스크립트 추가
     */
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
            if (this.scriptAPI) {
                log('[Sidebar] 서버에 스크립트 생성 요청 전송...');
                // 서버에 스크립트 생성 요청
                const result = await this.scriptAPI.createScript(scriptName, scriptDescription || '');
                log('[Sidebar] ✅ 서버에서 스크립트 생성 성공 응답 받음:', result);
                log('[Sidebar] 생성된 스크립트 ID:', result.id);
                log('[Sidebar] 생성된 스크립트 이름:', result.name);

                // 클라이언트에서 목록에 추가 (효율적인 방식)
                log('[Sidebar] 클라이언트에서 스크립트 목록 업데이트 시작');
                const newScript = {
                    id: result.id,
                    name: result.name,
                    description: result.description || '',
                    date: formatDate(result.updated_at || result.created_at),
                    active: false
                };

                // 목록 맨 앞에 추가 (최신 스크립트가 위에 오도록)
                this.sidebarManager.scripts.unshift(newScript);
                log('[Sidebar] 스크립트 목록에 추가됨 - ID:', result.id, '이름:', result.name);

                // 순서 저장 (비동기)
                this.saveScriptOrder().catch((error) => {
                    logger.error('[Sidebar] 스크립트 순서 저장 실패:', error);
                });

                // UI 업데이트
                this.sidebarManager.uiManager.loadScripts();

                // 새로 생성된 스크립트를 선택 (맨 앞에 추가했으므로 인덱스 0)
                log('[Sidebar] 새로 생성된 스크립트 선택 - 인덱스: 0');
                await this.selectScript(0);

                // 헤더 업데이트
                this.sidebarManager.uiManager.updateHeader();

                log('[Sidebar] ✅ 스크립트 추가 완료');
                log('[Sidebar] 현재 스크립트 개수:', this.sidebarManager.scripts.length);
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

                this.sidebarManager.scripts.push(newScript);
                this.sidebarManager.uiManager.loadScripts();
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

    /**
     * 스크립트 삭제
     */
    async deleteScript(index) {
        if (index < 0 || index >= this.sidebarManager.scripts.length) {
            const logger = getLogger();
            logger.log('[Sidebar] ⚠️ 유효하지 않은 스크립트 인덱스:', index);
            return;
        }

        const script = this.sidebarManager.scripts[index];

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
                    if (this.scriptAPI) {
                        log('[Sidebar] 서버에 스크립트 삭제 요청 전송...');
                        // 서버에 삭제 요청
                        const result = await this.scriptAPI.deleteScript(script.id);
                        log('[Sidebar] ✅ 서버에서 스크립트 삭제 성공 응답 받음:', result);

                        // 클라이언트에서 목록에서 삭제 (효율적인 방식)
                        log('[Sidebar] 클라이언트에서 스크립트 목록 업데이트 시작');
                        const deletedIndex = this.sidebarManager.scripts.findIndex((s) => s.id === script.id);
                        if (deletedIndex >= 0) {
                            this.sidebarManager.scripts.splice(deletedIndex, 1);
                            log('[Sidebar] 스크립트 목록에서 삭제됨 - 인덱스:', deletedIndex);
                        }

                        // 현재 선택된 스크립트 인덱스 조정
                        if (this.sidebarManager.currentScriptIndex >= deletedIndex && deletedIndex >= 0) {
                            this.sidebarManager.currentScriptIndex = Math.max(
                                0,
                                this.sidebarManager.currentScriptIndex - 1
                            );
                        }

                        // 순서 저장 (비동기)
                        this.saveScriptOrder().catch((error) => {
                            logger.error('[Sidebar] 스크립트 순서 저장 실패:', error);
                        });

                        // UI 업데이트
                        this.sidebarManager.uiManager.loadScripts();

                        // 삭제된 스크립트가 현재 선택된 스크립트였던 경우
                        if (this.sidebarManager.scripts.length > 0) {
                            // 첫 번째 스크립트 선택
                            log('[Sidebar] 첫 번째 스크립트 선택');
                            await this.selectScript(0);
                        } else {
                            // 스크립트가 모두 삭제된 경우
                            log('[Sidebar] 모든 스크립트가 삭제됨');
                            this.sidebarManager.currentScriptIndex = -1;
                            this.sidebarManager.uiManager.updateHeader();
                            // 헤더 초기화
                            const titleEl = document.querySelector('.script-title');
                            const descEl = document.querySelector('.script-description');
                            if (titleEl) {
                                titleEl.textContent = '스크립트 없음';
                            }
                            if (descEl) {
                                descEl.textContent = '새 스크립트를 추가하세요.';
                            }
                        }

                        log('[Sidebar] ✅ 스크립트 삭제 완료:', script.name);
                        log('[Sidebar] 남은 스크립트 개수:', this.sidebarManager.scripts.length);

                        // 성공 메시지 표시
                        modalManager.showAlert('삭제 완료', `"${script.name}" 스크립트가 삭제되었습니다.`);
                    } else {
                        log('[Sidebar] ⚠️ ScriptAPI를 사용할 수 없음. 로컬 폴백 사용');
                        // API가 없을 때의 폴백
                        this.sidebarManager.scripts.splice(index, 1);

                        // 현재 선택된 스크립트가 삭제된 경우
                        if (this.sidebarManager.currentScriptIndex >= index) {
                            this.sidebarManager.currentScriptIndex = Math.max(
                                0,
                                this.sidebarManager.currentScriptIndex - 1
                            );
                        }

                        this.sidebarManager.uiManager.loadScripts();
                        this.sidebarManager.uiManager.updateHeader();
                        this.sidebarManager.dispatchScriptChangeEvent();

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

        // 실행 중 플래그 설정 (중복 실행 방지 / 취소 처리)
        if (this.sidebarManager.isRunningAllScripts === true) {
            // 실행 중인 경우 취소 처리
            log('[Sidebar] 실행 취소 요청');
            this.sidebarManager.cancelExecution();
            return;
        }

        this.sidebarManager.isRunningAllScripts = true;
        this.sidebarManager.isCancelled = false; // 취소 플래그 초기화

        // 버튼 상태 설정 (다른 버튼 비활성화, 실행 중인 버튼 활성화)
        this.sidebarManager.setButtonsState('running', 'run-all-scripts-btn');

        // 서버에서 최신 스크립트 목록 조회 (DB의 active 필드 기준)
        log('[Sidebar] 서버에서 최신 스크립트 목록 조회 중...');
        let allScripts = [];
        try {
            if (this.scriptAPI && typeof this.scriptAPI.getAllScripts === 'function') {
                allScripts = await this.scriptAPI.getAllScripts();
                log(`[Sidebar] 서버에서 ${allScripts.length}개 스크립트 조회 완료`);
            } else {
                logWarn('[Sidebar] ScriptAPI를 사용할 수 없습니다. 로컬 스크립트 목록 사용');
                allScripts = this.sidebarManager.scripts;
            }
        } catch (error) {
            logError('[Sidebar] 스크립트 목록 조회 실패, 로컬 스크립트 목록 사용:', error);
            allScripts = this.sidebarManager.scripts;
        }

        // DB의 active 필드를 기준으로 활성화된 스크립트만 필터링
        // active가 true이거나 undefined인 경우 활성으로 간주 (기본값 1)
        const activeScripts = allScripts.filter((script) => {
            const isActive = script.active !== undefined ? script.active : true;
            return isActive === true || isActive === 1;
        });

        if (activeScripts.length === 0) {
            logWarn('[Sidebar] 실행할 활성화된 스크립트가 없습니다.');
            const modalManager = getModalManagerInstance();
            if (modalManager) {
                modalManager.showAlert('알림', '실행할 활성화된 스크립트가 없습니다.');
            }
            this.sidebarManager.isRunningAllScripts = false;
            this.sidebarManager.setButtonsState('idle');
            return;
        }

        // 스크립트 개수 기준 카운터 (try-catch 블록 밖에서 선언)
        let successCount = 0;
        let failCount = 0;
        const totalCount = activeScripts.length;

        // 스크립트 실행 결과 수집 (실행 결과 모달 표시용)
        const scriptResults = [];

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

            log(`[Sidebar] 총 ${totalCount}개 활성화된 스크립트 실행 시작`);

            // 최상단 스크립트부터 순차적으로 실행 (활성화된 스크립트만)
            for (let i = 0; i < activeScripts.length; i++) {
                // 취소 플래그 체크
                if (this.sidebarManager.isCancelled) {
                    log('[Sidebar] 실행이 취소되었습니다.');
                    // 실행 취소 시 남은 스크립트들을 중단으로 표시
                    for (let j = i + 1; j < activeScripts.length; j++) {
                        const remainingScript = activeScripts[j];
                        scriptResults.push({
                            name: remainingScript.name || remainingScript.id || '알 수 없는 스크립트',
                            status: 'cancelled',
                            message: '실행 취소로 인해 실행되지 않음'
                        });
                    }

                    if (modalManager) {
                        const { getResultModalManagerInstance } = await import('../../utils/result-modal.js');
                        const resultModalManager = getResultModalManagerInstance();
                        resultModalManager.showExecutionResult('실행 취소', {
                            successCount,
                            failCount,
                            cancelledCount: activeScripts.length - successCount - failCount,
                            scripts: scriptResults,
                            summaryLabel: '스크립트'
                        });
                    }
                    break;
                }

                const script = activeScripts[i];
                log(`[Sidebar] 스크립트 ${i + 1}/${activeScripts.length} 실행 중: ${script.name} (ID: ${script.id})`);

                try {
                    // 1. 스크립트 선택 (포커스)
                    // allScripts 배열에서 실제 인덱스를 찾아야 함
                    const actualIndex = allScripts.findIndex((s) => s.id === script.id);
                    if (actualIndex === -1) {
                        logWarn(
                            `[Sidebar] 스크립트 "${script.name}" (ID: ${script.id})를 스크립트 목록에서 찾을 수 없습니다. 건너뜀.`
                        );
                        failCount++;
                        continue;
                    }
                    log(`[Sidebar] 스크립트 "${script.name}" 선택 중... (실제 인덱스: ${actualIndex})`);
                    // selectScript는 this.scripts 배열의 인덱스를 기대하므로,
                    // 먼저 this.scripts를 업데이트한 후 선택
                    const localIndex = this.sidebarManager.scripts.findIndex((s) => s.id === script.id);
                    if (localIndex !== -1) {
                        await this.selectScript(localIndex);
                    } else {
                        // 로컬에 없으면 서버에서 다시 로드
                        await this.loadScriptsFromServer();
                        const newLocalIndex = this.sidebarManager.scripts.findIndex((s) => s.id === script.id);
                        if (newLocalIndex !== -1) {
                            await this.selectScript(newLocalIndex);
                        } else {
                            logWarn(
                                `[Sidebar] 스크립트 "${script.name}" (ID: ${script.id})를 로컬에서 찾을 수 없습니다. 건너뜀.`
                            );
                            failCount++;
                            continue;
                        }
                    }

                    // 2. 스크립트 로드 완료 대기 (노드들이 화면에 렌더링될 때까지)
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // 3. WorkflowPage 인스턴스 가져오기
                    const workflowPage = getWorkflowPage();
                    if (!workflowPage || !workflowPage.executionService) {
                        logWarn(
                            `[Sidebar] WorkflowPage 또는 ExecutionService를 찾을 수 없습니다. 스크립트 "${script.name}" 건너뜀.`
                        );
                        failCount++;
                        continue;
                    }

                    // 4. 현재 화면의 노드들이 있는지 확인
                    const nodes = document.querySelectorAll('.workflow-node');
                    if (nodes.length === 0) {
                        logWarn(`[Sidebar] 스크립트 "${script.name}"에 실행할 노드가 없습니다.`);
                        // 노드가 없는 스크립트는 성공으로 카운트 (스크립트 단위로 카운트)
                        successCount++;
                        scriptResults.push({
                            name: script.name || script.id || '알 수 없는 스크립트',
                            status: 'success',
                            message: '실행할 노드가 없음'
                        });
                        continue;
                    }

                    log(`[Sidebar] 스크립트 "${script.name}" 실행 시작 - 노드 개수: ${nodes.length}개`);

                    // 5. 기존 실행 방식 사용 (노드 하나씩 서버에 요청)
                    try {
                        // 취소 플래그와 전체 실행 플래그를 executionService에 전달
                        workflowPage.executionService.isCancelled = this.sidebarManager.isCancelled;
                        workflowPage.executionService.isRunningAllScripts = true; // 전체 스크립트 실행 중임을 표시
                        await workflowPage.executionService.execute();

                        // 취소되었는지 확인
                        if (this.sidebarManager.isCancelled || workflowPage.executionService.isCancelled) {
                            log('[Sidebar] 실행이 취소되었습니다.');
                            break;
                        }

                        successCount++;
                        log(`[Sidebar] ✅ 스크립트 "${script.name}" 실행 완료`);
                        scriptResults.push({
                            name: script.name || script.id || '알 수 없는 스크립트',
                            status: 'success',
                            message: '정상 실행 완료'
                        });
                    } catch (execError) {
                        failCount++;
                        logError(`[Sidebar] ❌ 스크립트 "${script.name}" 실행 중 오류 발생:`, execError);
                        logError('[Sidebar] 에러 상세:', {
                            name: execError.name,
                            message: execError.message,
                            stack: execError.stack
                        });
                        scriptResults.push({
                            name: script.name || script.id || '알 수 없는 스크립트',
                            status: 'failed',
                            error: execError.message,
                            message: execError.message
                        });
                        // 에러 발생 시 해당 스크립트는 실패로 처리하고 다음 스크립트 계속 실행
                        continue;
                    }

                    // 스크립트 간 대기 시간 (선택적, 필요시 조정)
                    if (i < activeScripts.length - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    failCount++;
                    logError(`[Sidebar] ❌ 스크립트 "${script.name}" 처리 중 오류 발생:`, error);
                    logError('[Sidebar] 에러 상세:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                    scriptResults.push({
                        name: script.name || script.id || '알 수 없는 스크립트',
                        status: 'failed',
                        error: error.message,
                        message: error.message
                    });
                    // 에러 발생 시 해당 스크립트는 실패로 처리하고 다음 스크립트 계속 실행
                    continue;
                }
            }

            log(`[Sidebar] 모든 스크립트 실행 완료 - 성공: ${successCount}개, 실패: ${failCount}개`);

            // 실행 결과 모달 표시 (가운데 팝업)
            if (modalManager) {
                const title = this.sidebarManager.isCancelled ? '실행 취소' : '실행 완료';
                const cancelledCount = activeScripts.length - successCount - failCount;
                const { getResultModalManagerInstance } = await import('../../utils/result-modal.js');
                const resultModalManager = getResultModalManagerInstance();
                resultModalManager.showExecutionResult(title, {
                    successCount,
                    failCount,
                    cancelledCount,
                    scripts: scriptResults,
                    summaryLabel: '스크립트'
                });
            }
        } catch (error) {
            logError('[Sidebar] ❌ 모든 스크립트 실행 중 오류 발생:', error);
            logError('[Sidebar] 에러 상세:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            const modalManager = getModalManagerInstance();
            if (modalManager) {
                const cancelledCount = activeScripts.length - successCount - failCount;
                const { getResultModalManagerInstance } = await import('../../utils/result-modal.js');
                const resultModalManager = getResultModalManagerInstance();
                resultModalManager.showExecutionResult('실행 오류', {
                    successCount,
                    failCount,
                    cancelledCount,
                    scripts: scriptResults,
                    summaryLabel: '스크립트'
                });
            }
        } finally {
            // 실행 중 플래그 해제
            this.sidebarManager.isRunningAllScripts = false;
            this.sidebarManager.isCancelled = false;

            // executionService의 전체 실행 플래그도 초기화
            const workflowPage = getWorkflowPage();
            if (workflowPage && workflowPage.executionService) {
                workflowPage.executionService.isRunningAllScripts = false;
            }

            // 버튼 상태 복원
            this.sidebarManager.setButtonsState('idle');
        }
    }

    /**
     * 스크립트 변경 전 현재 워크플로우 저장
     * 노드가 삭제되기 전에 현재 상태를 저장합니다.
     */
    saveCurrentWorkflowBeforeSwitch() {
        const logger = getLogger();
        const log = logger.log;

        // 현재 스크립트 정보 가져오기
        const currentScript = this.sidebarManager.getCurrentScript();
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
        const viewportPosition = this.sidebarManager.getCurrentViewportPosition();

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
        const existingIndex = savedWorkflows.findIndex((w) => w.script && w.script.id === scriptId);
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
     * 스크립트 데이터 저장/로드
     */
    saveScripts() {
        localStorage.setItem('workflow-scripts', JSON.stringify(this.sidebarManager.scripts));
    }

    loadScriptsFromStorage() {
        const saved = localStorage.getItem('workflow-scripts');
        if (saved) {
            try {
                this.sidebarManager.scripts = JSON.parse(saved);
                this.sidebarManager.uiManager.loadScripts();
                this.sidebarManager.uiManager.updateHeader();
            } catch (error) {
                console.error('스크립트 로드 실패:', error);
            }
        }
    }
}
