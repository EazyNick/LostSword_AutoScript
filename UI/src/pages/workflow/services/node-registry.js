/**
 * 노드 레지스트리 서비스
 * 
 * nodes.config.js 파일을 읽어서 노드 타입을 동적으로 등록하고
 * 각 노드의 스크립트를 동적으로 로드합니다.
 */

import { NODES_CONFIG, getAllNodeTypes, getNodeConfig } from '../config/nodes.config.js';

export class NodeRegistry {
    constructor() {
        this.loadedScripts = new Set();
        this.nodeConfigs = NODES_CONFIG;
    }

    /**
     * 모든 노드 스크립트 동적 로드
     * @returns {Promise<void>}
     */
    async loadAllNodeScripts() {
        const nodeTypes = getAllNodeTypes();
        const loadPromises = nodeTypes.map(nodeType => this.loadNodeScript(nodeType));
        await Promise.all(loadPromises);
    }

    /**
     * 특정 노드 타입의 스크립트 로드
     * @param {string} nodeType - 노드 타입
     * @returns {Promise<void>}
     */
    async loadNodeScript(nodeType) {
        const config = getNodeConfig(nodeType);
        if (!config || !config.script) {
            console.warn(`[NodeRegistry] 노드 타입 '${nodeType}'의 스크립트가 설정되지 않았습니다.`);
            return;
        }

        // 이미 로드된 스크립트는 건너뛰기
        if (this.loadedScripts.has(config.script)) {
            return;
        }

        const scriptPath = `../../js/components/node/${config.script}`;
        
        return new Promise((resolve, reject) => {
            // 동적 스크립트 로드
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => {
                this.loadedScripts.add(config.script);
                console.log(`[NodeRegistry] 노드 스크립트 로드 완료: ${config.script}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`[NodeRegistry] 노드 스크립트 로드 실패: ${config.script}`);
                // 스크립트가 없어도 계속 진행 (사용자가 아직 만들지 않은 경우)
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 노드 설정 가져오기
     * @param {string} nodeType - 노드 타입
     * @returns {Object|null}
     */
    getConfig(nodeType) {
        return getNodeConfig(nodeType);
    }

    /**
     * 모든 노드 설정 가져오기
     * @returns {Object}
     */
    getAllConfigs() {
        return this.nodeConfigs;
    }

    /**
     * 노드 타입 목록 가져오기
     * @returns {string[]}
     */
    getNodeTypes() {
        return getAllNodeTypes();
    }
}

// 싱글톤 인스턴스
let nodeRegistryInstance = null;

/**
 * 노드 레지스트리 인스턴스 가져오기
 * @returns {NodeRegistry}
 */
export function getNodeRegistry() {
    if (!nodeRegistryInstance) {
        nodeRegistryInstance = new NodeRegistry();
    }
    return nodeRegistryInstance;
}

