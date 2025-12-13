/**
 * 사용자 설정 관련 API 호출 함수들
 * ES6 모듈 방식으로 작성됨
 */

import { apiCall } from './api.js';

/**
 * 로거 유틸리티 가져오기 (전역 fallback 포함)
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * UserSettingsAPI 객체
 * 사용자 설정 관련 API 호출을 담당합니다.
 */
export const UserSettingsAPI = {
    /**
     * 모든 사용자 설정 조회
     * @returns {Promise<Object>} 설정 키-값 쌍 객체
     */
    async getAllSettings() {
        const logger = getLogger();
        logger.log('[UserSettingsAPI] getAllSettings() 호출됨');

        try {
            const result = await apiCall('/api/config/user-settings');
            logger.log('[UserSettingsAPI] ✅ 모든 설정 조회 성공:', result);
            // 변경된 응답 형식: {success: true, message: "...", data: {...}}
            return result.data || result; // 하위 호환성 유지
        } catch (error) {
            logger.error('[UserSettingsAPI] ❌ 설정 조회 실패:', error);
            throw error;
        }
    },

    /**
     * 특정 사용자 설정 조회
     * @param {string} key - 설정 키
     * @returns {Promise<string|null>} 설정 값 (없으면 null)
     */
    async getSetting(key) {
        const logger = getLogger();
        logger.log(`[UserSettingsAPI] getSetting() 호출됨 - 키: ${key}`);

        try {
            const result = await apiCall(`/api/config/user-settings/${key}`);
            // 변경된 응답 형식: {success: true, message: "...", data: {key, value}}
            const settingData = result.data || result; // 하위 호환성 유지
            logger.log(`[UserSettingsAPI] ✅ 설정 조회 성공 - 키: ${key}, 값: ${settingData.value}`);
            return settingData.value;
        } catch (error) {
            // 404 에러는 설정이 없는 것이므로 null 반환 (정상적인 경우)
            const errorMessage = error.message || '';
            const errorString = errorMessage.toString();

            // NotFoundError 또는 404 에러 체크
            if (
                error.name === 'NotFoundError' ||
                error.status === 404 ||
                errorMessage.includes('404') ||
                errorMessage.includes('찾을 수 없습니다') ||
                errorMessage.includes('Not Found') ||
                errorString.includes('404') ||
                errorString.includes('찾을 수 없습니다')
            ) {
                logger.log(`[UserSettingsAPI] 설정을 찾을 수 없음 (정상, 처음 사용 시) - 키: ${key}`);
                return null;
            }

            // 다른 에러도 폴백으로 null 반환 (로컬 스토리지 사용)
            logger.log(`[UserSettingsAPI] 설정 조회 실패, null 반환 (폴백) - 키: ${key}, 에러: ${errorMessage}`);
            return null;
        }
    },

    /**
     * 사용자 설정 저장
     * @param {string} key - 설정 키
     * @param {string|number|Object} value - 설정 값
     * @returns {Promise<Object>} 저장 결과
     */
    async saveSetting(key, value) {
        const logger = getLogger();
        logger.log(`[UserSettingsAPI] saveSetting() 호출됨 - 키: ${key}, 값: ${value}`);

        try {
            const result = await apiCall(`/api/config/user-settings/${key}`, {
                method: 'PUT',
                body: JSON.stringify({ value: value })
            });
            logger.log(`[UserSettingsAPI] ✅ 설정 저장 성공 - 키: ${key}`);
            return result;
        } catch (error) {
            logger.error(`[UserSettingsAPI] ❌ 설정 저장 실패 - 키: ${key}`, error);
            throw error;
        }
    },

    /**
     * 사용자 설정 삭제
     * @param {string} key - 설정 키
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteSetting(key) {
        const logger = getLogger();
        logger.log(`[UserSettingsAPI] deleteSetting() 호출됨 - 키: ${key}`);

        try {
            const result = await apiCall(`/api/config/user-settings/${key}`, {
                method: 'DELETE'
            });
            logger.log(`[UserSettingsAPI] ✅ 설정 삭제 성공 - 키: ${key}`);
            return result;
        } catch (error) {
            logger.error(`[UserSettingsAPI] ❌ 설정 삭제 실패 - 키: ${key}`, error);
            throw error;
        }
    }
};

// 전역 호환성을 위한 설정
if (typeof window !== 'undefined') {
    window.UserSettingsAPI = UserSettingsAPI;
}
