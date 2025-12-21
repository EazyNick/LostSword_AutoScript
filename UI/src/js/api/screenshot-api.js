/**
 * 스크린샷 API
 * Python 서버로 스크린샷 캡처 및 저장 요청을 보냅니다.
 */

import { UserSettingsAPI } from './user-settings-api.js';
import { apiCall } from './api.js';

/**
 * 로거 유틸리티 가져오기 (전역 fallback 포함)
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        warn: window.logWarn || (window.Logger ? window.Logger.warn.bind(window.Logger) : console.warn),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * 자동 스크린샷 설정 확인
 *
 * @returns {Promise<boolean>} 자동 스크린샷이 활성화되어 있는지 여부
 */
async function isAutoScreenshotEnabled() {
    try {
        const setting = await UserSettingsAPI.getSetting('screenshot.autoScreenshot');
        // 설정이 없으면 기본값 true 반환 (로컬 스토리지에서도 확인)
        if (setting === null) {
            // 로컬 스토리지에서 확인
            const localSettings = localStorage.getItem('app-settings');
            if (localSettings) {
                const parsed = JSON.parse(localSettings);
                return parsed?.screenshot?.autoScreenshot !== false; // 기본값 true
            }
            return true; // 기본값
        }
        return setting === 'true' || setting === true;
    } catch (error) {
        const logger = getLogger();
        logger.error('[Screenshot] 자동 스크린샷 설정 확인 실패:', error);
        return false; // 에러 시 비활성화로 처리
    }
}

/**
 * 노드 실행 완료 후 Python 서버에 스크린샷 캡처 및 저장 요청
 *
 * @param {string} nodeId - 노드 ID
 * @param {string} nodeType - 노드 타입
 * @param {string} scriptName - 스크립트 이름
 * @param {string} nodeName - 노드 이름
 * @param {boolean} isRunningAllScripts - 전체 실행 여부 (true: 전체 실행, false: 단일 실행)
 * @param {string} executionStartTime - 실행 시작 시간 (ISO 형식)
 * @param {number|null} scriptExecutionOrder - 전체 실행 시 스크립트 실행 순서 (1부터 시작, 단일 실행 시 null)
 * @returns {Promise<void>}
 */
export async function captureAndSaveScreenshot(
    nodeId,
    nodeType,
    scriptName = 'Unknown',
    nodeName = '',
    isRunningAllScripts = false,
    executionStartTime = '',
    scriptExecutionOrder = null
) {
    const logger = getLogger();

    try {
        // 자동 스크린샷 설정 확인
        const isEnabled = await isAutoScreenshotEnabled();
        if (!isEnabled) {
            logger.log('[Screenshot] 자동 스크린샷이 비활성화되어 있습니다.');
            return;
        }

        // 설정에서 저장 경로와 이미지 형식 가져오기
        const savePath = (await UserSettingsAPI.getSetting('screenshot.savePath')) || './screenshots';
        const imageFormat = (await UserSettingsAPI.getSetting('screenshot.imageFormat')) || 'PNG';

        // 파일명에 사용할 안전한 이름 생성 (특수문자 제거)
        const safeScriptName = (scriptName || 'Unknown').replace(/[<>:"/\\|?*]/g, '_').trim();
        const safeNodeName = (nodeName || nodeId).replace(/[<>:"/\\|?*]/g, '_').trim();

        // 파일명 생성 (타임스탬프 + 스크립트명 + 노드명 + 노드 ID)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = imageFormat.toLowerCase() === 'jpeg' ? 'jpg' : 'png';
        const filename = `screenshot_${timestamp}_${safeScriptName}_${safeNodeName}_${nodeId}.${extension}`;

        // Python 서버로 스크린샷 캡처 및 저장 요청
        // apiCall에서 이미 응답 데이터를 로깅하므로 여기서는 중복 로깅 제거
        await apiCall('/api/screenshots/capture', {
            method: 'POST',
            body: JSON.stringify({
                filename: filename,
                save_path: savePath,
                image_format: imageFormat,
                node_id: nodeId,
                node_type: nodeType,
                script_name: scriptName,
                node_name: nodeName,
                is_running_all_scripts: isRunningAllScripts,
                execution_start_time: executionStartTime || new Date().toISOString(),
                script_execution_order: scriptExecutionOrder
            })
        });
    } catch (error) {
        logger.error('[Screenshot] 스크린샷 처리 중 오류:', error);
    }
}
