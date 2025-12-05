/**
 * 실제 노드 종류 정의
 * 노드 타입(대분류)별로 사용 가능한 실제 노드 종류를 정의합니다.
 */

export const ACTION_NODE_TYPES = {
    action: {
        'http-api-request': {
            label: 'HTTP API 요청',
            description: '외부 API에 HTTP 요청을 보냅니다.',
            icon: '🌐'
        }
        // 향후 추가될 액션 노드들:
        // "file-read": {...},
        // "file-write": {...},
    },
    condition: {
        // 조건 노드 종류들
    },
    wait: {
        // 대기 노드 종류들
    }
};

/**
 * 특정 노드 타입의 실제 노드 종류 목록 가져오기
 * @param {string} nodeType - 노드 타입 (예: "action")
 * @returns {Object} 실제 노드 종류 딕셔너리
 */
export function getActionNodeTypes(nodeType) {
    return ACTION_NODE_TYPES[nodeType] || {};
}

/**
 * 특정 실제 노드 종류의 설정 가져오기
 * @param {string} nodeType - 노드 타입 (예: "action")
 * @param {string} actionNodeType - 실제 노드 종류 (예: "http-api-request")
 * @returns {Object|null} 노드 설정 객체 또는 null
 */
export function getActionNodeConfig(nodeType, actionNodeType) {
    const actionNodes = ACTION_NODE_TYPES[nodeType];
    if (!actionNodes) {
        return null;
    }
    return actionNodes[actionNodeType] || null;
}

/**
 * 모든 노드 타입별 실제 노드 종류 가져오기
 * @returns {Object} 모든 실제 노드 종류 딕셔너리
 */
export function getAllActionNodeTypes() {
    return ACTION_NODE_TYPES;
}
