/**
 * 설정 페이지 관리 클래스
 * ES6 모듈 방식으로 작성됨
 */

import { getThemeManagerInstance } from '../../js/utils/theme-manager.js';

/**
 * 로거 유틸리티 가져오기
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * SettingsManager 클래스
 * 설정 페이지의 데이터 로드 및 UI 업데이트를 담당합니다.
 */
export class SettingsManager {
    constructor() {
        // 테마 관리자에서 현재 테마 가져오기
        const themeManager = getThemeManagerInstance();
        const currentTheme = themeManager ? themeManager.getCurrentTheme() : 'dark';

        this.settings = {
            // 외관 설정
            appearance: {
                theme: currentTheme, // 'light', 'dark', 'system'
                language: 'ko' // 'ko', 'en'
            },
            // 실행 설정
            execution: {
                defaultTimeout: 30, // 초
                retryCount: 3, // 회
                parallelExecution: false // 병렬 실행 여부
            },
            // 스크린샷 설정
            screenshot: {
                autoScreenshot: true, // 자동 스크린샷
                screenshotOnError: true, // 오류 시 스크린샷
                savePath: './screenshots', // 저장 경로
                imageFormat: 'PNG' // 'PNG', 'JPEG'
            },
            // 알림 설정
            notifications: {
                completionNotification: true, // 완료 알림
                errorNotification: true, // 오류 알림
                notificationSound: true // 알림 소리
            }
        };
    }

    /**
     * 설정 페이지 초기화
     */
    async init() {
        const logger = getLogger();
        logger.log('[Settings] 설정 페이지 초기화 시작');

        await this.loadSettings();
        this.renderSettings();
        this.setupEventListeners();
    }

    /**
     * 설정 데이터 로드
     */
    async loadSettings() {
        const logger = getLogger();
        logger.log('[Settings] 설정 데이터 로드 시작');

        try {
            // 로컬 스토리지에서 설정 로드
            const savedSettings = localStorage.getItem('app-settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // 테마는 테마 관리자에서 가져오기
                const themeManager = getThemeManagerInstance();
                if (themeManager && parsed.appearance) {
                    parsed.appearance.theme = themeManager.getCurrentTheme();
                }
                this.settings = { ...this.settings, ...parsed };
            } else {
                // 테마 관리자에서 현재 테마 가져오기
                const themeManager = getThemeManagerInstance();
                if (themeManager) {
                    this.settings.appearance.theme = themeManager.getCurrentTheme();
                }
            }

            // 서버에서 스크린샷 설정 로드 (서버 설정이 우선)
            try {
                const { UserSettingsAPI } = await import('../../js/api/user-settings-api.js');
                if (UserSettingsAPI) {
                    const autoScreenshot = await UserSettingsAPI.getSetting('screenshot.autoScreenshot');
                    const screenshotOnError = await UserSettingsAPI.getSetting('screenshot.screenshotOnError');
                    const savePath = await UserSettingsAPI.getSetting('screenshot.savePath');
                    const imageFormat = await UserSettingsAPI.getSetting('screenshot.imageFormat');

                    if (autoScreenshot !== null) {
                        this.settings.screenshot.autoScreenshot = autoScreenshot === 'true' || autoScreenshot === true;
                    }
                    if (screenshotOnError !== null) {
                        this.settings.screenshot.screenshotOnError =
                            screenshotOnError === 'true' || screenshotOnError === true;
                    }
                    if (savePath !== null) {
                        this.settings.screenshot.savePath = savePath;
                    }
                    if (imageFormat !== null) {
                        this.settings.screenshot.imageFormat = imageFormat;
                    }
                    logger.log('[Settings] 서버에서 스크린샷 설정 로드 완료');
                }
            } catch (serverError) {
                logger.warn('[Settings] 서버 설정 로드 실패 (로컬 설정 사용):', serverError);
            }
        } catch (error) {
            logger.error('[Settings] 설정 데이터 로드 실패:', error);
            // 테마 관리자에서 현재 테마 가져오기
            const themeManager = getThemeManagerInstance();
            if (themeManager) {
                this.settings.appearance.theme = themeManager.getCurrentTheme();
            }
        }
    }

    /**
     * 설정 페이지 렌더링
     */
    renderSettings() {
        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) {
            return;
        }

        settingsContent.innerHTML = `
            <!-- 외관 설정 -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h2 class="settings-section-title">외관</h2>
                    <p class="settings-section-subtitle">테마와 디스플레이 설정을 변경합니다</p>
                </div>
                <div class="settings-section-content">
                    <!-- 테마 설정 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🖥️</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">테마</div>
                                <div class="settings-item-description">앱의 전체 테마를 선택합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <div class="theme-buttons">
                                <button class="theme-btn ${this.settings.appearance.theme === 'light' ? 'active' : ''}" data-theme="light">라이트</button>
                                <button class="theme-btn ${this.settings.appearance.theme === 'dark' ? 'active' : ''}" data-theme="dark">다크</button>
                                <button class="theme-btn ${this.settings.appearance.theme === 'system' ? 'active' : ''}" data-theme="system">시스템</button>
                            </div>
                        </div>
                    </div>

                    <!-- 언어 설정 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🌐</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">언어</div>
                                <div class="settings-item-description">인터페이스 언어를 선택합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <select class="settings-select" id="setting-language">
                                <option value="ko" ${this.settings.appearance.language === 'ko' ? 'selected' : ''}>한국어</option>
                                <option value="en" ${this.settings.appearance.language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 실행 설정 -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h2 class="settings-section-title">실행 설정</h2>
                    <p class="settings-section-subtitle">테스트 실행 관련 설정을 변경합니다</p>
                </div>
                <div class="settings-section-content">
                    <!-- 기본 타임아웃 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">⏱️</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">기본 타임아웃</div>
                                <div class="settings-item-description">각 노드의 기본 대기 시간 (초)</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <div class="slider-container">
                                <input type="range" class="settings-slider" id="setting-timeout" min="5" max="120" value="${this.settings.execution.defaultTimeout}" />
                                <span class="slider-value" id="timeout-value">${this.settings.execution.defaultTimeout}초</span>
                            </div>
                        </div>
                    </div>

                    <!-- 재시도 횟수 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🔄</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">재시도 횟수</div>
                                <div class="settings-item-description">실패 시 자동 재시도 횟수</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <select class="settings-select" id="setting-retry-count">
                                <option value="0" ${this.settings.execution.retryCount === 0 ? 'selected' : ''}>0회</option>
                                <option value="1" ${this.settings.execution.retryCount === 1 ? 'selected' : ''}>1회</option>
                                <option value="2" ${this.settings.execution.retryCount === 2 ? 'selected' : ''}>2회</option>
                                <option value="3" ${this.settings.execution.retryCount === 3 ? 'selected' : ''}>3회</option>
                                <option value="5" ${this.settings.execution.retryCount === 5 ? 'selected' : ''}>5회</option>
                            </select>
                        </div>
                    </div>

                    <!-- 병렬 실행 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">⚡</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">병렬 실행</div>
                                <div class="settings-item-description">여러 워크플로우를 동시에 실행합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-parallel" ${this.settings.execution.parallelExecution ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 스크린샷 설정 -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h2 class="settings-section-title">스크린샷</h2>
                    <p class="settings-section-subtitle">스크린샷 캡처 설정을 변경합니다</p>
                </div>
                <div class="settings-section-content">
                    <!-- 자동 스크린샷 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">📷</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">자동 스크린샷</div>
                                <div class="settings-item-description">각 스텝 실행 후 자동으로 스크린샷을 저장합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-auto-screenshot" ${this.settings.screenshot.autoScreenshot ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 오류 발생 시 스크린샷 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">📷</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">오류 발생 시 스크린샷</div>
                                <div class="settings-item-description">테스트 실패 시 스크린샷을 저장합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-screenshot-on-error" ${this.settings.screenshot.screenshotOnError ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 저장 경로 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">📁</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">저장 경로</div>
                                <div class="settings-item-description">스크린샷이 저장될 폴더</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <input type="text" class="settings-input" id="setting-screenshot-path" value="${this.settings.screenshot.savePath}" />
                        </div>
                    </div>

                    <!-- 이미지 형식 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🖼️</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">이미지 형식</div>
                                <div class="settings-item-description">스크린샷 파일 형식</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <select class="settings-select" id="setting-image-format">
                                <option value="PNG" ${this.settings.screenshot.imageFormat === 'PNG' ? 'selected' : ''}>PNG</option>
                                <option value="JPEG" ${this.settings.screenshot.imageFormat === 'JPEG' ? 'selected' : ''}>JPEG</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 알림 설정 -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h2 class="settings-section-title">알림</h2>
                    <p class="settings-section-subtitle">알림 및 소리 설정을 변경합니다</p>
                </div>
                <div class="settings-section-content">
                    <!-- 완료 알림 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🔔</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">완료 알림</div>
                                <div class="settings-item-description">테스트 완료 시 알림을 받습니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-completion-notification" ${this.settings.notifications.completionNotification ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 오류 알림 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🔔</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">오류 알림</div>
                                <div class="settings-item-description">테스트 실패 시 알림을 받습니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-error-notification" ${this.settings.notifications.errorNotification ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 알림 소리 -->
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-icon">🔊</div>
                            <div class="settings-item-text">
                                <div class="settings-item-label">알림 소리</div>
                                <div class="settings-item-description">알림 발생 시 소리를 재생합니다</div>
                            </div>
                        </div>
                        <div class="settings-item-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-notification-sound" ${this.settings.notifications.notificationSound ? 'checked' : ''} />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 키보드 단축키 -->
            <div class="settings-section">
                <div class="settings-section-header">
                    <h2 class="settings-section-title">키보드 단축키</h2>
                    <p class="settings-section-subtitle">자주 사용하는 기능의 단축키입니다</p>
                </div>
                <div class="settings-section-content">
                    <div class="shortcuts-list">
                        <div class="shortcut-item">
                            <span class="shortcut-label">저장</span>
                            <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">실행 취소</span>
                            <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">다시 실행</span>
                            <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Y</kbd></span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">노드 삭제</span>
                            <span class="shortcut-keys"><kbd>Delete</kbd></span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">워크플로우 실행</span>
                            <span class="shortcut-keys"><kbd>F5</kbd></span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">실행 중지</span>
                            <span class="shortcut-keys"><kbd>Esc</kbd></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 설정 저장 버튼 -->
            <div class="settings-footer">
                <button class="btn-save-settings" id="btn-save-settings">
                    설정 저장
                </button>
            </div>
        `;
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 테마 버튼 클릭
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.setTheme(theme);
            });
        });

        // 타임아웃 슬라이더
        const timeoutSlider = document.getElementById('setting-timeout');
        const timeoutValue = document.getElementById('timeout-value');
        if (timeoutSlider && timeoutValue) {
            timeoutSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                timeoutValue.textContent = `${value}초`;
                this.settings.execution.defaultTimeout = value;
            });
        }

        // 설정 저장 버튼
        const saveBtn = document.getElementById('btn-save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // 모든 설정 값 수집
        this.collectSettings();
    }

    /**
     * 설정 값 수집
     */
    collectSettings() {
        // 언어
        const language = document.getElementById('setting-language');
        if (language) {
            language.addEventListener('change', (e) => {
                this.settings.appearance.language = e.target.value;
            });
        }

        // 재시도 횟수
        const retryCount = document.getElementById('setting-retry-count');
        if (retryCount) {
            retryCount.addEventListener('change', (e) => {
                this.settings.execution.retryCount = parseInt(e.target.value);
            });
        }

        // 병렬 실행
        const parallel = document.getElementById('setting-parallel');
        if (parallel) {
            parallel.addEventListener('change', (e) => {
                this.settings.execution.parallelExecution = e.target.checked;
            });
        }

        // 자동 스크린샷
        const autoScreenshot = document.getElementById('setting-auto-screenshot');
        if (autoScreenshot) {
            autoScreenshot.addEventListener('change', (e) => {
                this.settings.screenshot.autoScreenshot = e.target.checked;
            });
        }

        // 오류 시 스크린샷
        const screenshotOnError = document.getElementById('setting-screenshot-on-error');
        if (screenshotOnError) {
            screenshotOnError.addEventListener('change', (e) => {
                this.settings.screenshot.screenshotOnError = e.target.checked;
            });
        }

        // 저장 경로
        const screenshotPath = document.getElementById('setting-screenshot-path');
        if (screenshotPath) {
            screenshotPath.addEventListener('change', (e) => {
                this.settings.screenshot.savePath = e.target.value;
            });
        }

        // 이미지 형식
        const imageFormat = document.getElementById('setting-image-format');
        if (imageFormat) {
            imageFormat.addEventListener('change', (e) => {
                this.settings.screenshot.imageFormat = e.target.value;
            });
        }

        // 완료 알림
        const completionNotification = document.getElementById('setting-completion-notification');
        if (completionNotification) {
            completionNotification.addEventListener('change', (e) => {
                this.settings.notifications.completionNotification = e.target.checked;
            });
        }

        // 오류 알림
        const errorNotification = document.getElementById('setting-error-notification');
        if (errorNotification) {
            errorNotification.addEventListener('change', (e) => {
                this.settings.notifications.errorNotification = e.target.checked;
            });
        }

        // 알림 소리
        const notificationSound = document.getElementById('setting-notification-sound');
        if (notificationSound) {
            notificationSound.addEventListener('change', (e) => {
                this.settings.notifications.notificationSound = e.target.checked;
            });
        }
    }

    /**
     * 테마 설정
     */
    setTheme(theme) {
        this.settings.appearance.theme = theme;

        // 테마 버튼 활성화 상태 업데이트
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach((btn) => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 테마 관리자를 통해 테마 적용
        const themeManager = getThemeManagerInstance();
        if (themeManager) {
            themeManager.applyTheme(theme);
        }

        const logger = getLogger();
        logger.log('[Settings] 테마 변경:', theme);
    }

    /**
     * 설정 저장
     */
    async saveSettings() {
        const logger = getLogger();
        logger.log('[Settings] 설정 저장 시작:', this.settings);

        try {
            // 로컬 스토리지에 저장 (즉시 반영)
            localStorage.setItem('app-settings', JSON.stringify(this.settings));

            // 서버에도 스크린샷 설정 저장
            try {
                const { UserSettingsAPI } = await import('../../js/api/user-settings-api.js');
                if (UserSettingsAPI) {
                    // 스크린샷 설정을 서버에 저장
                    await UserSettingsAPI.saveSetting(
                        'screenshot.autoScreenshot',
                        this.settings.screenshot.autoScreenshot.toString()
                    );
                    await UserSettingsAPI.saveSetting(
                        'screenshot.screenshotOnError',
                        this.settings.screenshot.screenshotOnError.toString()
                    );
                    await UserSettingsAPI.saveSetting('screenshot.savePath', this.settings.screenshot.savePath);
                    await UserSettingsAPI.saveSetting('screenshot.imageFormat', this.settings.screenshot.imageFormat);
                    logger.log('[Settings] 스크린샷 설정 서버에 저장 완료');
                }
            } catch (serverError) {
                logger.warn('[Settings] 서버 저장 실패 (로컬 스토리지만 저장):', serverError);
            }

            logger.log('[Settings] 설정 저장 완료');

            // 저장 완료 알림 (간단한 토스트 메시지)
            this.showSaveNotification();
        } catch (error) {
            logger.error('[Settings] 설정 저장 실패:', error);
        }
    }

    /**
     * 저장 완료 알림 표시
     */
    showSaveNotification() {
        // 간단한 알림 메시지 표시
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.textContent = '설정이 저장되었습니다';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
}

/**
 * SettingsManager 인스턴스 가져오기
 */
let settingsManagerInstance = null;

export function getSettingsManagerInstance() {
    if (!settingsManagerInstance) {
        settingsManagerInstance = new SettingsManager();
    }
    return settingsManagerInstance;
}
