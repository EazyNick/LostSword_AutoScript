/**
 * 노드 타입 상수 정의
 * nodes.config.js에서 동적으로 생성됩니다.
 */

import {
    NODES_CONFIG,
    getAllNodeTypes,
    isBoundaryNode as checkBoundaryNode,
    getNodeLabel
} from '../config/nodes.config.js';

// 설정 파일에서 동적으로 NODE_TYPES 생성
const nodeTypes = getAllNodeTypes();
export const NODE_TYPES = {};
nodeTypes.forEach((type) => {
    // 대문자 상수명 생성 (예: 'image-touch' -> 'IMAGE_TOUCH')
    const constantName = type.toUpperCase().replace(/-/g, '_');
    NODE_TYPES[constantName] = type;
});

// 설정 파일에서 동적으로 NODE_TYPE_LABELS 생성
export const NODE_TYPE_LABELS = {};
nodeTypes.forEach((type) => {
    NODE_TYPE_LABELS[type] = getNodeLabel(type);
});

/**
 * 시작/종료 노드인지 확인
 * @param {string} type - 노드 타입
 * @returns {boolean}
 */
export function isBoundaryNode(type) {
    return checkBoundaryNode(type);
}
