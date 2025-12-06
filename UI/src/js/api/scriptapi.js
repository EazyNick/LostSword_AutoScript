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
     * 특정 스크립트 조회 (노드 정보 포함)
     * @param {number} scriptId - 스크립트 ID
     * @returns {Promise<Object>} 스크립트 정보 (노드 및 연결 정보 포함)
     */
    async getScript(scriptId) {
        const logger = getLogger();
        logger.log('[ScriptAPI] getScript() 호출됨');
        logger.log('[ScriptAPI] 조회할 스크립트 ID:', scriptId);
        logger.log('[ScriptAPI] API 요청 시작: GET /api/scripts/' + scriptId);

        try {
            const startTime = performance.now();
            const result = await apiCall(`/api/scripts/${scriptId}`);
            const endTime = performance.now();

            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 스크립트 ID: ${result.id}, 이름: ${result.name}`);
            logger.log(`[ScriptAPI] 노드 개수: ${result.nodes ? result.nodes.length : 0}개`);
            logger.log(`[ScriptAPI] 연결 개수: ${result.connections ? result.connections.length : 0}개`);

            if (result.nodes && result.nodes.length > 0) {
                logger.log(
                    '[ScriptAPI] 노드 목록:',
                    result.nodes.map((n) => ({
                        id: n.id,
                        type: n.type,
                        connected_to: n.connected_to,
                        connected_from: n.connected_from
                    }))
                );

                // 연결 정보가 있는 노드 확인
                const nodesWithConnections = result.nodes.filter(
                    (n) =>
                        (n.connected_to && Array.isArray(n.connected_to) && n.connected_to.length > 0) ||
                        (n.connected_from && Array.isArray(n.connected_from) && n.connected_from.length > 0)
                );
                logger.log(`[ScriptAPI] 연결 정보가 있는 노드 개수: ${nodesWithConnections.length}개`);
                if (nodesWithConnections.length > 0) {
                    logger.log(
                        '[ScriptAPI] 연결 정보가 있는 노드:',
                        nodesWithConnections.map((n) => ({
                            id: n.id,
                            connected_to: n.connected_to,
                            connected_from: n.connected_from
                        }))
                    );
                }
            }

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
    },

    /**
     * 스크립트 실행
     * @param {number} scriptId - 스크립트 ID
     * @param {Array} nodes - 실행할 노드 배열
     * @returns {Promise<Object>} 실행 결과
     */
    async executeScript(scriptId, nodes) {
        const logger = getLogger();
        logger.log('[ScriptAPI] executeScript() 호출됨');
        logger.log('[ScriptAPI] 실행할 스크립트 ID:', scriptId);
        logger.log('[ScriptAPI] 노드 개수:', nodes.length);
        logger.log('[ScriptAPI] API 요청 시작: POST /api/scripts/' + scriptId + '/execute');

        try {
            const startTime = performance.now();
            const result = await apiCall(`/api/scripts/${scriptId}/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    nodes: nodes,
                    execution_mode: 'sequential'
                })
            });
            const endTime = performance.now();

            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 실행 성공: ${result.success}`);
            logger.log(`[ScriptAPI] 실행 결과 개수: ${result.results ? result.results.length : 0}개`);

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
     * 스크립트 활성/비활성 상태 토글
     * @param {number} scriptId - 스크립트 ID
     * @param {boolean} active - 활성화 여부
     * @returns {Promise<Object>} 업데이트 결과
     */
    async toggleScriptActive(scriptId, active) {
        const logger = getLogger();
        logger.log('[ScriptAPI] toggleScriptActive() 호출됨');
        logger.log('[ScriptAPI] 스크립트 ID:', scriptId);
        logger.log('[ScriptAPI] 활성 상태:', active);
        logger.log('[ScriptAPI] API 요청 시작: PATCH /api/scripts/' + scriptId + '/active');

        try {
            const startTime = performance.now();
            const result = await apiCall(`/api/scripts/${scriptId}/active`, {
                method: 'PATCH',
                body: JSON.stringify({ active: active })
            });
            const endTime = performance.now();

            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            logger.log(`[ScriptAPI] 업데이트된 활성 상태: ${result.active}`);

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

    async updateScriptOrder(scriptOrders) {
        const logger = getLogger();
        logger.log('[ScriptAPI] updateScriptOrder() 호출됨');
        logger.log('[ScriptAPI] 스크립트 순서:', scriptOrders);
        logger.log('[ScriptAPI] API 요청 시작: PATCH /api/scripts/order');

        try {
            const startTime = performance.now();
            const result = await apiCall('/api/scripts/order', {
                method: 'PATCH',
                body: JSON.stringify(scriptOrders)
            });
            const endTime = performance.now();

            logger.log('[ScriptAPI] ✅ API 응답 받음:', result);
            logger.log(`[ScriptAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
            return result;
        } catch (error) {
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
