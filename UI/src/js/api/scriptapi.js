/**
 * 스크립트 관련 API 호출 함수들
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
 * ScriptAPI 객체
 * 스크립트 관련 API 호출을 담당합니다.
 */
export const ScriptAPI = {
    /**
     * 모든 스크립트 목록 조회
     * @returns {Promise<Array>} 스크립트 목록
     */
    async getAllScripts() {
        const logger = getLogger();
        logger.log('[ScriptAPI] getAllScripts() 호출됨');
        logger.log('[ScriptAPI] API 요청 시작: GET /api/scripts');
        
        try {
            const startTime = performance.now();
            const result = await apiCall('/api/scripts');
            const endTime = performance.now();
            
            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 받은 스크립트 개수: ${result.length}개`);
            
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            logger.error('[ScriptAPI] 에러 상세:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * 특정 스크립트 조회
     * @param {number} scriptId - 스크립트 ID
     * @returns {Promise<Object>} 스크립트 정보
     */
    async getScript(scriptId) {
        return await apiCall(`/api/scripts/${scriptId}`);
    },

    /**
     * 새 스크립트 생성
     * @param {string} name - 스크립트 이름
     * @param {string} description - 스크립트 설명
     * @returns {Promise<Object>} 생성된 스크립트 정보
     */
    async createScript(name, description = '') {
        const logger = getLogger();
        logger.log('[ScriptAPI] createScript() 호출됨');
        logger.log('[ScriptAPI] 요청 데이터:', { name, description });
        logger.log('[ScriptAPI] API 요청 시작: POST /api/scripts');
        
        try {
            const startTime = performance.now();
            const result = await apiCall('/api/scripts', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    description: description
                })
            });
            const endTime = performance.now();
            
            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 생성된 스크립트 ID: ${result.id}`);
            logger.log(`[ScriptAPI] 생성된 스크립트 이름: ${result.name}`);
            
            return result;
        } catch (error) {
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            logger.error('[ScriptAPI] 에러 상세:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * 스크립트 삭제
     * @param {number} scriptId - 스크립트 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteScript(scriptId) {
        const logger = getLogger();
        logger.log('[ScriptAPI] deleteScript() 호출됨');
        logger.log('[ScriptAPI] 삭제할 스크립트 ID:', scriptId);
        logger.log('[ScriptAPI] API 요청 시작: DELETE /api/scripts/' + scriptId);
        
        try {
            const startTime = performance.now();
            const result = await apiCall(`/api/scripts/${scriptId}`, {
                method: 'DELETE'
            });
            const endTime = performance.now();
            
            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 삭제된 스크립트 ID: ${result.id}`);
            
            return result;
        } catch (error) {
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            logger.error('[ScriptAPI] 에러 상세:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
};

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.ScriptAPI = ScriptAPI;
}
