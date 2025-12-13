/**
 * 노드 기본 설정 데이터
 * 서버의 nodes_config.py에서 동적으로 가져옵니다.
 */

import { getNodeRegistry } from '../services/node-registry.js';

// 캐시된 기본값 (서버에서 로드 후 저장)
const NODE_DEFAULT_DESCRIPTIONS = {};
const NODE_DEFAULT_TITLES = {};
let defaultsLoaded = false;

/**
 * 서버에서 노드 설정을 로드하여 기본값 초기화
 * @returns {Promise<void>}
 */
async function loadDefaults() {
    if (defaultsLoaded) {
        return;
    }

    try {
        const registry = getNodeRegistry();
        const configs = await registry.getNodeConfigs();
        const nodeTypes = Object.keys(configs);

        nodeTypes.forEach((type) => {
            const config = configs[type];
            if (config) {
                NODE_DEFAULT_DESCRIPTIONS[type] = config.description || '노드에 대한 설명을 입력하세요.';
                NODE_DEFAULT_TITLES[type] = config.title || `${type} 노드`;
            }
        });

        defaultsLoaded = true;
    } catch (error) {
        console.warn('[node-defaults] 기본값 로드 실패:', error);
    }
}

/**
 * 노드 타입별 기본 설명 가져오기
 * @param {string} type - 노드 타입
 * @returns {string} 기본 설명
 */
export function getDefaultDescription(type) {
    // 이미 로드된 경우 동기 반환
    if (defaultsLoaded) {
        return NODE_DEFAULT_DESCRIPTIONS[type] || '노드에 대한 설명을 입력하세요.';
    }

    // 아직 로드되지 않은 경우 기본값 반환 (비동기 로드는 백그라운드에서 진행)
    loadDefaults().catch((err) => console.warn('[node-defaults] 로드 실패:', err));
    return '노드에 대한 설명을 입력하세요.';
}

/**
 * 노드 타입별 기본 제목 가져오기
 * @param {string} type - 노드 타입
 * @returns {string} 기본 제목
 */
export function getDefaultTitle(type) {
    // 이미 로드된 경우 동기 반환
    if (defaultsLoaded) {
        return NODE_DEFAULT_TITLES[type] || `${type} 노드`;
    }

    // 아직 로드되지 않은 경우 기본값 반환 (비동기 로드는 백그라운드에서 진행)
    loadDefaults().catch((err) => console.warn('[node-defaults] 로드 실패:', err));
    return `${type} 노드`;
}

/**
 * 기본값 강제 로드 (초기화 시 호출)
 * @returns {Promise<void>}
 */
export async function initializeDefaults() {
    await loadDefaults();
}
