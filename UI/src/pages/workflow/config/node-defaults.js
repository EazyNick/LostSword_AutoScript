/**
 * 노드 기본 설정 데이터
 * nodes.config.js에서 동적으로 생성됩니다.
 */

import { NODES_CONFIG, getAllNodeTypes, getNodeConfig } from './nodes.config.js';

// 설정 파일에서 동적으로 기본값 생성
const nodeTypes = getAllNodeTypes();

export const NODE_DEFAULT_DESCRIPTIONS = {};
export const NODE_DEFAULT_COLORS = {};
export const NODE_DEFAULT_TITLES = {};

nodeTypes.forEach((type) => {
    const config = getNodeConfig(type);
    if (config) {
        NODE_DEFAULT_DESCRIPTIONS[type] = config.description || '노드에 대한 설명을 입력하세요.';
        NODE_DEFAULT_COLORS[type] = config.color || 'blue';
        NODE_DEFAULT_TITLES[type] = config.title || `${type} 노드`;
    }
});

/**
 * 노드 타입별 기본 설명 가져오기
 * @param {string} type - 노드 타입
 * @returns {string} 기본 설명
 */
export function getDefaultDescription(type) {
    return NODE_DEFAULT_DESCRIPTIONS[type] || '노드에 대한 설명을 입력하세요.';
}

/**
 * 노드 타입별 기본 색상 가져오기
 * @param {string} type - 노드 타입
 * @returns {string} 기본 색상
 */
export function getDefaultColor(type) {
    return NODE_DEFAULT_COLORS[type] || 'blue';
}

/**
 * 노드 타입별 기본 제목 가져오기
 * @param {string} type - 노드 타입
 * @returns {string} 기본 제목
 */
export function getDefaultTitle(type) {
    return NODE_DEFAULT_TITLES[type] || `${type} 노드`;
}
