/**
 * 로그 관련 API 호출 함수들
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
 * LogAPI 객체
 * 노드 실행 로그 관련 API 호출을 담당합니다.
 */
export const LogAPI = {
    /**
     * 노드 실행 로그 생성
     * @param {Object} logData - 로그 데이터
     * @returns {Promise<Object>} 생성된 로그 정보
     */
    async createNodeExecutionLog(logData) {
        try {
            const result = await apiCall('/api/logs/node-execution', {
                method: 'POST',
                body: JSON.stringify(logData)
            });
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[LogAPI] ❌ 로그 생성 실패:', error);
            throw error;
        }
    },

    /**
     * 노드 실행 로그 조회
     * @param {Object} filters - 필터 옵션 (execution_id, script_id, node_id, limit, offset)
     * @returns {Promise<Array>} 로그 목록
     */
    async getNodeExecutionLogs(filters = {}) {
        try {
            // 쿼리 파라미터 생성
            const params = new URLSearchParams();
            if (filters.execution_id) {
                params.append('execution_id', filters.execution_id);
            }
            if (filters.script_id) {
                params.append('script_id', filters.script_id);
            }
            if (filters.node_id) {
                params.append('node_id', filters.node_id);
            }
            if (filters.limit) {
                params.append('limit', filters.limit);
            }
            if (filters.offset) {
                params.append('offset', filters.offset);
            }

            const queryString = params.toString();
            const endpoint = `/api/logs/node-execution${queryString ? `?${queryString}` : ''}`;

            const result = await apiCall(endpoint);
            // 응답 형식: {success: true, message: "...", data: [...], count: N}
            const logs = result.data || result; // 하위 호환성 유지
            return logs;
        } catch (error) {
            const logger = getLogger();
            logger.error('[LogAPI] ❌ 로그 조회 실패:', error);
            throw error;
        }
    },

    /**
     * 로그 저장 완료 확인 (서버에서 완료될 때까지 대기)
     * @param {string} executionId - 실행 ID
     * @param {string} expectedStatus - 예상 상태 ('completed' 또는 'failed', 선택사항)
     * @returns {Promise<Object>} 로그 저장 완료 여부
     */
    async checkLogsReady(executionId, expectedStatus = null) {
        const logger = getLogger();
        logger.log('[LogAPI] checkLogsReady() 호출됨');
        logger.log('[LogAPI] executionId:', executionId, 'expectedStatus:', expectedStatus);

        try {
            const params = new URLSearchParams();
            params.append('execution_id', executionId);
            if (expectedStatus) {
                params.append('expected_status', expectedStatus);
            }

            const endpoint = `/api/logs/node-execution/check-ready?${params.toString()}`;

            const startTime = performance.now();
            const result = await apiCall(endpoint);
            const endTime = performance.now();

            logger.log('[LogAPI] ✅ 로그 저장 완료 확인 성공:', result);
            logger.log(`[LogAPI] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);

            return result;
        } catch (error) {
            logger.error('[LogAPI] ❌ 로그 저장 완료 확인 실패:', error);
            throw error;
        }
    },

    /**
     * 실패한 노드 실행 로그 조회
     * @param {Object} filters - 필터 옵션 (script_id, limit)
     * @returns {Promise<Array>} 실패한 로그 목록
     */
    async getFailedNodeExecutionLogs(filters = {}) {
        try {
            // 쿼리 파라미터 생성
            const params = new URLSearchParams();
            if (filters.script_id) {
                params.append('script_id', filters.script_id);
            }
            if (filters.limit) {
                params.append('limit', filters.limit);
            }

            const queryString = params.toString();
            const endpoint = `/api/logs/node-execution/failed${queryString ? `?${queryString}` : ''}`;

            const result = await apiCall(endpoint);
            // 응답 형식: {success: true, message: "...", data: [...], count: N}
            const logs = result.data || result; // 하위 호환성 유지
            return logs;
        } catch (error) {
            const logger = getLogger();
            logger.error('[LogAPI] ❌ 실패한 로그 조회 실패:', error);
            throw error;
        }
    },

    /**
     * 특정 노드 실행 로그 삭제
     * @param {number} logId - 로그 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteNodeExecutionLog(logId) {
        const logger = getLogger();
        logger.log('[LogAPI] deleteNodeExecutionLog() 호출됨');
        logger.log('[LogAPI] 로그 ID:', logId);

        try {
            const result = await apiCall(`/api/logs/node-execution/${logId}`, {
                method: 'DELETE'
            });

            logger.log('[LogAPI] ✅ 로그 삭제 성공:', result);
            return result;
        } catch (error) {
            logger.error('[LogAPI] ❌ 로그 삭제 실패:', error);
            throw error;
        }
    },

    /**
     * 실행 ID별 모든 노드 실행 로그 삭제
     * @param {string} executionId - 실행 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteNodeExecutionLogsByExecutionId(executionId) {
        try {
            const result = await apiCall(`/api/logs/node-execution/execution/${executionId}`, {
                method: 'DELETE'
            });
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[LogAPI] ❌ 실행 ID별 로그 삭제 실패:', error);
            throw error;
        }
    },

    /**
     * 모든 노드 실행 로그 삭제
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteAllNodeExecutionLogs() {
        try {
            const result = await apiCall('/api/logs/node-execution', {
                method: 'DELETE'
            });
            return result;
        } catch (error) {
            const logger = getLogger();
            logger.error('[LogAPI] ❌ 전체 로그 삭제 실패:', error);
            throw error;
        }
    }
};
