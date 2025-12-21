/**
 * 노드 관련 유틸리티 함수
 */

/**
 * HTML 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 HTML
 */
export function escapeHtml(text) {
    // text가 null, undefined, 또는 빈 문자열이면 빈 문자열 반환
    if (text === null || text === undefined || text === '') {
        return '';
    }
    // div: 임시 DOM 요소 (HTML 이스케이프용)
    const div = document.createElement('div');
    // textContent로 설정하면 HTML 특수문자가 자동으로 이스케이프됨
    div.textContent = text;
    // innerHTML로 가져오면 이스케이프된 HTML 문자열 반환
    return div.innerHTML;
}

/**
 * 노드 타입 가져오기
 * @param {HTMLElement} nodeElement - 노드 요소
 * @returns {string} 노드 타입
 */
export function getNodeType(nodeElement) {
    // 노드 요소에서 타입 추출
    // nodeId: 노드 ID (id 속성 또는 dataset.nodeId에서 가져옴)
    const nodeId = nodeElement.id || nodeElement.dataset.nodeId;
    // nodeManager: 전역 노드 관리자 (노드 데이터 접근용)
    const nodeManager = window.nodeManager;

    // nodeManager의 nodeData에서 타입 가져오기 (우선순위 1)
    if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
        // savedType: 저장된 노드 타입
        const savedType = nodeManager.nodeData[nodeId].type;
        // savedType이 있으면 반환
        if (savedType) {
            return savedType;
        }
    }

    // 제목 기반으로 타입 추정 (우선순위 2)
    // title: 노드 제목 (타입 추정용)
    const title = nodeElement.querySelector('.node-title')?.textContent || '';
    // 제목에 '시작'이 포함되거나 nodeId가 'start'이면 시작 노드
    if (title.includes('시작') || nodeId === 'start') {
        return 'start';
    }
    // 제목에 '조건'이 포함되면 조건 노드
    if (title.includes('조건')) {
        return 'condition';
    }
    // 제목에 '반복'이 포함되면 반복 노드
    if (title.includes('반복')) {
        return 'loop';
    }
    // 제목에 '대기'가 포함되면 대기 노드
    if (title.includes('대기')) {
        return 'wait';
    }
    // 제목에 '이미지'가 포함되면 이미지 터치 노드
    if (title.includes('이미지')) {
        return 'image-touch';
    }

    // 기본값: action 노드
    return 'action';
}

/**
 * 노드 데이터 가져오기
 * @param {HTMLElement} nodeElement - 노드 요소
 * @returns {Object|null} 노드 데이터
 */
export function getNodeData(nodeElement) {
    // nodeId: 노드 ID (id 속성 또는 dataset.nodeId에서 가져옴)
    const nodeId = nodeElement.id || nodeElement.dataset.nodeId;
    // nodeManager: 전역 노드 관리자 (노드 데이터 접근용)
    const nodeManager = window.nodeManager;

    // nodeManager의 nodeData에서 노드 데이터 가져오기
    if (nodeManager && nodeManager.nodeData && nodeManager.nodeData[nodeId]) {
        return nodeManager.nodeData[nodeId];
    }

    // 노드 데이터가 없으면 null 반환
    return null;
}
