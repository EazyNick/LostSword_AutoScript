/**
 * 노드 관련 API
 * ES6 모듈 방식으로 작성됨
 */

import { apiCall } from './api.js';

/**
 * NodeAPI 객체
 * 노드 관련 API 호출을 담당합니다.
 */
export const NodeAPI = {
    /**
     * 스크립트의 모든 노드 조회
     * @param {number} scriptId - 스크립트 ID
     * @returns {Promise<{nodes: Array, connections: Array}>}
     */
    async getNodesByScript(scriptId) {
        return await apiCall(`/api/nodes/script/${scriptId}`);
    },

    /**
     * 노드 생성
     * @param {number} scriptId - 스크립트 ID
     * @param {Object} nodeData - 노드 데이터
     * @returns {Promise<Object>}
     */
    async createNode(scriptId, nodeData) {
        return await apiCall(`/api/nodes/script/${scriptId}`, {
            method: 'POST',
            body: JSON.stringify(nodeData)
        });
    },

    /**
     * 여러 노드 일괄 업데이트
     * @param {number} scriptId - 스크립트 ID
     * @param {Array} nodes - 노드 배열
     * @param {Array} connections - 연결 배열
     * @returns {Promise<Object>}
     */
    async updateNodesBatch(scriptId, nodes, connections = []) {
        return await apiCall(`/api/nodes/script/${scriptId}/batch`, {
            method: 'PUT',
            body: JSON.stringify({ nodes, connections })
        });
    },

    /**
     * 노드 업데이트
     * @param {number} scriptId - 스크립트 ID
     * @param {string} nodeId - 노드 ID
     * @param {Object} nodeData - 노드 데이터
     * @returns {Promise<Object>}
     */
    async updateNode(scriptId, nodeId, nodeData) {
        return await apiCall(`/api/nodes/script/${scriptId}/node/${nodeId}`, {
            method: 'PUT',
            body: JSON.stringify(nodeData)
        });
    },

    /**
     * 노드 삭제
     * @param {number} scriptId - 스크립트 ID
     * @param {string} nodeId - 노드 ID
     * @returns {Promise<Object>}
     */
    async deleteNode(scriptId, nodeId) {
        return await apiCall(`/api/nodes/script/${scriptId}/node/${nodeId}`, {
            method: 'DELETE'
        });
    }
};

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.NodeAPI = NodeAPI;
}
