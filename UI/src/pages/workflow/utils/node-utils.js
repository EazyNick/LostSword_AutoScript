/**
 * 노드 관련 유틸리티 함수
 */

/**
 * HTML 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 HTML
 */
export function escapeHtml(text) {
    if (!text) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 노드 타입 가져오기
 * @param {HTMLElement} nodeElement - 노드 요소
 * @returns {string} 노드 타입
 */
export function getNodeType(nodeElement) {
    // 노드 요소에서 타입 추출
    const nodeId = nodeElement.id || nodeElement.dataset.nodeId;
    const nodeManager = window.nodeManager;

    if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
        const savedType = nodeManager.nodeData[nodeId].type;
        if (savedType) {
            return savedType;
        }
    }

    // 제목 기반으로 타입 추정
    const title = nodeElement.querySelector('.node-title')?.textContent || '';
    if (title.includes('시작') || nodeId === 'start') {
        return 'start';
    }
    if (title.includes('종료') || nodeId === 'end') {
        return 'end';
    }
    if (title.includes('조건')) {
        return 'condition';
    }
    if (title.includes('반복')) {
        return 'loop';
    }
    if (title.includes('대기')) {
        return 'wait';
    }
    if (title.includes('이미지')) {
        return 'image-touch';
    }

    return 'action'; // 기본값
}

/**
 * 노드 데이터 가져오기
 * @param {HTMLElement} nodeElement - 노드 요소
 * @returns {Object|null} 노드 데이터
 */
export function getNodeData(nodeElement) {
    const nodeId = nodeElement.id || nodeElement.dataset.nodeId;
    const nodeManager = window.nodeManager;

    if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
        return nodeManager.nodeData[nodeId];
    }

    return null;
}
