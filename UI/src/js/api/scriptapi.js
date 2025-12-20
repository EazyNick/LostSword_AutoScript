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
        try {
            const result = await apiCall('/api/scripts');
            // 변경된 응답 형식: {success: true, message: "...", data: [...], count: N}
            const scripts = result.data || result; // 하위 호환성 유지
            return scripts;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
    },

    /**
     * 특정 스크립트 조회 (노드 정보 포함)
     * @param {number} scriptId - 스크립트 ID
     * @returns {Promise<Object>} 스크립트 정보 (노드 및 연결 정보 포함)
     */
    async getScript(scriptId) {
        try {
            const result = await apiCall(`/api/scripts/${scriptId}`);
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
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

            // 변경된 응답 형식: {success: true, message: "...", data: {id, name, ...}}
            const scriptData = result.data || result; // 하위 호환성 유지
            logger.log(`[ScriptAPI] 생성된 스크립트 ID: ${scriptData.id}`);
            logger.log(`[ScriptAPI] 생성된 스크립트 이름: ${scriptData.name}`);

            return scriptData;
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
        try {
            const result = await apiCall(`/api/scripts/${scriptId}`, {
                method: 'DELETE'
            });
            // 변경된 응답 형식: {success: true, message: "...", data: {id}}
            const deleteData = result.data || result; // 하위 호환성 유지
            return deleteData;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
    },

    /**
     * 스크립트 실행
     * @param {number} scriptId - 스크립트 ID
     * @param {Array} nodes - 실행할 노드 배열
     * @returns {Promise<Object>} 실행 결과
     */
    async executeScript(scriptId, nodes) {
        try {
            const result = await apiCall(`/api/scripts/${scriptId}/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    nodes: nodes,
                    execution_mode: 'sequential'
                })
            });
            // 변경된 응답 형식: {success: true/false, message: "...", data: {results: [...]}}
            const results = result.data?.results || result.results || []; // 하위 호환성 유지

            return {
                success: result.success,
                message: result.message,
                results: results,
                data: result.data // 전체 데이터도 포함
            };
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
    },

    /**
     * 스크립트 활성/비활성 상태 토글
     * @param {number} scriptId - 스크립트 ID
     * @param {boolean} active - 활성화 여부
     * @returns {Promise<Object>} 업데이트 결과
     */
    async toggleScriptActive(scriptId, active) {
        try {
            const result = await apiCall(`/api/scripts/${scriptId}/active`, {
                method: 'PATCH',
                body: JSON.stringify({ active: active })
            });
            // 변경된 응답 형식: {success: true, message: "...", data: {active: true/false}}
            const activeData = result.data || result; // 하위 호환성 유지
            return activeData;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
    },

    async updateScriptOrder(scriptOrders) {
        try {
            const result = await apiCall('/api/scripts/order', {
                method: 'PATCH',
                body: JSON.stringify(scriptOrders)
            });
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[ScriptAPI] ❌ API 요청 실패:', error);
            throw error;
        }
    }
};

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.ScriptAPI = ScriptAPI;
}
