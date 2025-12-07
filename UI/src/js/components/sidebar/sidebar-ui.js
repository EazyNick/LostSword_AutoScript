/**
 * SidebarManager UI 관련 기능
 * UI 렌더링 및 업데이트를 담당
 */

import { getLogger } from './sidebar-utils.js';
import { UserSettingsAPI } from '../../api/user-settings-api.js';

/**
 * UI 관리 클래스
 */
export class SidebarUIManager {
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
    }

    /**
     * 스크립트 목록 렌더링
     */
    loadScripts() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        log('[Sidebar] loadScripts() 호출됨');
        log(`[Sidebar] 렌더링할 스크립트 개수: ${this.sidebarManager.scripts.length}개`);

        const scriptList = document.querySelector('.script-list');
        if (!scriptList) {
            logError('[Sidebar] ❌ .script-list 요소를 찾을 수 없습니다!');
            logError('[Sidebar] DOM 상태 확인 필요');
            return;
        }

        log('[Sidebar] ✅ .script-list 요소 찾음');
        scriptList.innerHTML = '';

        if (this.sidebarManager.scripts.length === 0) {
            // 스크립트가 없을 때 메시지 표시
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'script-empty-message';
            emptyMessage.style.cssText = 'padding: 20px; text-align: center; color: #a0aec0; font-size: 14px;';
            emptyMessage.textContent = '스크립트가 없습니다. + 버튼을 눌러 새 스크립트를 추가하세요.';
            scriptList.appendChild(emptyMessage);
            log('[Sidebar] 빈 스크립트 목록 메시지 표시');
            return;
        }

        this.sidebarManager.scripts.forEach((script, index) => {
            log(`[Sidebar] 스크립트 ${index + 1} 렌더링 중: ${script.name}`);

            const scriptItem = document.createElement('div');
            // DB의 active 필드를 기준으로 비활성화 클래스 추가
            const isDbActive = script.dbActive !== undefined ? script.dbActive : true;
            const isDbActiveValue = isDbActive === true || isDbActive === 1;
            scriptItem.className = `script-item ${script.active ? 'active' : ''} ${!isDbActiveValue ? 'inactive' : ''}`;
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
            this.sidebarManager.eventHandler.setupDragAndDrop(scriptItem, index);

            // 스크립트 항목 클릭 이벤트 (삭제 버튼 제외)
            scriptItem.addEventListener('click', (e) => {
                // 삭제 버튼이나 드래그 핸들 클릭 시에는 선택 이벤트 발생하지 않도록
                if (e.target.closest('.script-delete-btn') || e.target.closest('.script-drag-handle')) {
                    return;
                }
                log('사이드바 스크립트 클릭됨:', script.name, '인덱스:', index);
                this.sidebarManager.selectScript(index);
            });

            // 삭제 버튼 클릭 이벤트
            const deleteBtn = scriptItem.querySelector('.script-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 스크립트 선택 이벤트 방지
                log('[Sidebar] 삭제 버튼 클릭됨 - 스크립트:', script.name, '인덱스:', index);
                this.sidebarManager.deleteScript(index);
            });

            scriptList.appendChild(scriptItem);
        });

        log(`[Sidebar] ✅ 스크립트 목록 렌더링 완료: ${this.sidebarManager.scripts.length}개 항목`);
    }

    /**
     * 헤더 업데이트
     */
    updateHeader() {
        // 에디터 페이지일 때만 헤더 업데이트
        if (window.pageRouter && window.pageRouter.currentPage === 'editor') {
            const selectedScript = this.sidebarManager.scripts[this.sidebarManager.currentScriptIndex];
            if (selectedScript) {
                const titleEl = document.querySelector('.script-title');
                const descEl = document.querySelector('.script-description');
                if (titleEl) {
                    titleEl.textContent = selectedScript.name || '스크립트';
                }
                if (descEl) {
                    descEl.textContent = selectedScript.description || '워크플로우를 편집하세요';
                }
            }
        }
    }

    /**
     * 사이드바 너비 변경 시 관련 요소들도 함께 조정
     */
    adjustLayoutForSidebarWidth(width, isResizing = false) {
        // 좌측 최상단 프로필 영역 너비 조정
        const topProfile = document.querySelector('.top-left-profile');
        if (topProfile) {
            // 리사이즈 중일 때는 transition 비활성화 및 클래스 추가
            if (isResizing) {
                topProfile.classList.add('resizing');
                topProfile.style.transition = 'none';
            } else {
                topProfile.classList.remove('resizing');
                topProfile.style.transition = '';
            }
            topProfile.style.width = `${width}px`;
        }

        // 헤더의 left 값 조정
        const header = document.querySelector('.top-header');
        if (header) {
            if (isResizing) {
                header.style.transition = 'none';
            } else {
                header.style.transition = '';
            }
            header.style.left = `${width}px`;
        }

        // 메인 컨텐츠의 left와 width 조정
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            if (isResizing) {
                mainContent.style.transition = 'none';
            } else {
                mainContent.style.transition = '';
            }
            mainContent.style.left = `${width}px`;
            mainContent.style.width = `calc(100vw - ${width}px)`;
        }

        // CSS 변수로 사이드바 너비 설정 (토스트/모달 위치 계산용)
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);

        // 토스트 위치 업데이트
        if (window.toastManager && typeof window.toastManager.updatePosition === 'function') {
            window.toastManager.updatePosition();
        }
    }

    /**
     * 사이드바 너비를 서버에 저장
     */
    async saveSidebarWidth(width) {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        try {
            // 서버에 저장 시도
            if (UserSettingsAPI) {
                await UserSettingsAPI.saveSetting('sidebar-width', width.toString());
                log(`[Sidebar] 사이드바 너비 서버에 저장됨: ${width}px`);
            } else {
                // 폴백: 로컬 스토리지에 저장
                localStorage.setItem('sidebar-width', width.toString());
                log(`[Sidebar] 사이드바 너비 로컬 스토리지에 저장됨: ${width}px`);
            }
        } catch (error) {
            logError('[Sidebar] 서버 저장 실패, 로컬 스토리지에 저장:', error);
            // 서버 저장 실패 시 로컬 스토리지에 저장 (폴백)
            localStorage.setItem('sidebar-width', width.toString());
        }
    }

    /**
     * 서버에서 사이드바 너비 로드
     */
    async loadSidebarWidth() {
        const logger = getLogger();
        const log = logger.log;
        const logError = logger.error;

        try {
            let savedWidth = null;

            // 서버에서 로드 시도
            if (UserSettingsAPI) {
                try {
                    savedWidth = await UserSettingsAPI.getSetting('sidebar-width');
                    if (savedWidth) {
                        log(`[Sidebar] 사이드바 너비 서버에서 로드됨: ${savedWidth}px`);
                    }
                } catch (error) {
                    log('[Sidebar] 서버에서 설정을 찾을 수 없음, 로컬 스토리지 확인');
                }
            }

            // 서버에 없으면 로컬 스토리지에서 로드
            if (!savedWidth) {
                savedWidth = localStorage.getItem('sidebar-width');
                if (savedWidth) {
                    log(`[Sidebar] 사이드바 너비 로컬 스토리지에서 로드됨: ${savedWidth}px`);
                }
            }

            if (savedWidth) {
                const width = parseInt(savedWidth);
                if (width && width >= 250 && width <= 600) {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.style.width = `${width}px`;
                        log(`[Sidebar] 사이드바 너비 적용됨: ${width}px`);
                        // 관련 요소들도 함께 조정
                        this.adjustLayoutForSidebarWidth(width);
                    }
                }
            }
        } catch (error) {
            logError('[Sidebar] 사이드바 너비 로드 실패:', error);
        }
    }
}
