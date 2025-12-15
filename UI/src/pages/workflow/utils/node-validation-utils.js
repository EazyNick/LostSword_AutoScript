/**
 * 노드 검증 유틸리티
 * 노드 추가/수정 시 유효성 검사를 수행합니다.
 */

import { NODE_TYPES } from '../constants/node-types.js';

export class NodeValidationUtils {
    /**
     * 시작/종료 노드 개수 확인
     * @param {string} nodeType - 확인할 노드 타입
     * @param {NodeManager} nodeManager - NodeManager 인스턴스
     * @returns {Object} { canAdd: boolean, message: string }
     */
    static validateBoundaryNodeCount(nodeType, nodeManager) {
        if (nodeType !== NODE_TYPES.START) {
            return { canAdd: true, message: '' };
        }

        if (!nodeManager) {
            return { canAdd: true, message: '' };
        }

        // nodeManager.nodes 배열에서 DOM 요소 가져오기
        const nodeElements = nodeManager.nodes ? nodeManager.nodes.map((n) => n.element) : [];
        const nodeData = nodeManager.nodeData || {};

        // 시작 노드 확인
        if (nodeType === NODE_TYPES.START) {
            const startNodes = nodeElements.filter((nodeElement) => {
                const nodeId = nodeElement.id || nodeElement.dataset?.nodeId;
                return (
                    nodeId === 'start' ||
                    nodeData[nodeId]?.type === NODE_TYPES.START ||
                    nodeElement.querySelector('.node-title')?.textContent?.includes('시작')
                );
            });

            if (startNodes.length > 0) {
                return {
                    canAdd: false,
                    message: '시작 노드는 이미 존재합니다. 한 스크립트에는 시작 노드를 1개만 가질 수 있습니다.'
                };
            }
        }

        return { canAdd: true, message: '' };
    }

    /**
     * 노드 타입 변경 가능 여부 확인
     * @param {string} newType - 변경하려는 노드 타입
     * @param {string} currentNodeId - 현재 노드 ID
     * @param {NodeManager} nodeManager - NodeManager 인스턴스
     * @returns {Object} { canChange: boolean, message: string }
     */
    static validateNodeTypeChange(newType, currentNodeId, nodeManager) {
        if (newType !== NODE_TYPES.START) {
            return { canChange: true, message: '' };
        }

        if (!nodeManager) {
            return { canChange: true, message: '' };
        }

        // nodeManager.nodes 배열에서 DOM 요소 가져오기
        const nodeElements = nodeManager.nodes ? nodeManager.nodes.map((n) => n.element) : [];
        const nodeData = nodeManager.nodeData || {};

        // 시작 노드로 변경하려는 경우
        if (newType === NODE_TYPES.START) {
            const existingStartNodes = nodeElements.filter((nodeElement) => {
                const nodeId = nodeElement.id || nodeElement.dataset?.nodeId;
                // 현재 노드는 제외
                if (nodeId === currentNodeId) {
                    return false;
                }

                return (
                    nodeId === 'start' ||
                    nodeData[nodeId]?.type === NODE_TYPES.START ||
                    nodeElement.querySelector('.node-title')?.textContent?.includes('시작')
                );
            });

            if (existingStartNodes.length > 0) {
                return {
                    canChange: false,
                    message: '시작 노드는 이미 존재합니다. 한 스크립트에는 시작 노드를 1개만 가질 수 있습니다.'
                };
            }
        }

        return { canChange: true, message: '' };
    }
}
