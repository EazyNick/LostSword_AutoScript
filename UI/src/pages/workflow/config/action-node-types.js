/**
 * 상세 노드 타입 관리
 *
 * 서버의 nodes_config.py에서 정의된 상세 노드 타입 정보를 사용합니다.
 * 서버에서 대분류 노드 타입 아래에 detailTypes 필드로 정의된 하위 카테고리를 가져옵니다.
 *
 * @module action-node-types
 */

import { getNodeRegistry } from '../services/node-registry.js';

/**
 * 특정 노드 타입의 상세 노드 타입 목록 가져오기
 *
 * 서버의 nodes_config.py에서 정의된 detailTypes를 가져옵니다.
 *
 * @param {string} nodeType - 노드 타입 (예: "action")
 * @returns {Promise<Object>} 상세 노드 타입 딕셔너리
 * @example
 * const detailTypes = await getDetailNodeTypes('action');
 * // { click: { label: '클릭', description: '...', icon: '🖱️' }, ... }
 */
export async function getDetailNodeTypes(nodeType) {
    const registry = getNodeRegistry();
    const configs = await registry.getNodeConfigs();
    const config = configs[nodeType];

    if (!config || !config.detailTypes) {
        return {};
    }

    return config.detailTypes || {};
}

/**
 * 특정 상세 노드 타입의 설정 가져오기
 *
 * @param {string} nodeType - 노드 타입 (예: "action")
 * @param {string} detailNodeType - 상세 노드 타입 (예: "http-api-request")
 * @returns {Promise<Object|null>} 노드 설정 객체 또는 null
 * @example
 * const config = await getDetailNodeConfig('action', 'http-api-request');
 * // { label: 'HTTP API 요청', description: '...', icon: '🌐' }
 */
export async function getDetailNodeConfig(nodeType, detailNodeType) {
    const detailTypes = await getDetailNodeTypes(nodeType);
    return detailTypes[detailNodeType] || null;
}

/**
 * 모든 노드 타입별 상세 노드 타입 가져오기
 *
 * @returns {Promise<Object>} 모든 상세 노드 타입 딕셔너리
 * @example
 * const allDetailTypes = await getAllDetailNodeTypes();
 * // { action: { click: {...}, combat: {...}, ... }, ... }
 */
export async function getAllDetailNodeTypes() {
    const registry = getNodeRegistry();
    const configs = await registry.getNodeConfigs();
    const result = {};

    for (const [nodeType, config] of Object.entries(configs)) {
        if (config.detailTypes) {
            result[nodeType] = config.detailTypes;
        }
    }

    return result;
}
