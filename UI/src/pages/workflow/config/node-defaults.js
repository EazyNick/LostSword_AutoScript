/**
 * 노드 기본 설정 데이터
 * 노드 타입별 기본 설명, 색상 등을 정의합니다.
 */

export const NODE_DEFAULT_DESCRIPTIONS = {
    'start': '워크플로우의 시작점입니다.',
    'end': '워크플로우의 종료점입니다.',
    'action': '액션을 수행하는 노드입니다.',
    'condition': '조건을 확인하는 노드입니다.',
    'loop': '반복 작업을 수행하는 노드입니다.',
    'wait': '일정 시간 대기하는 노드입니다.',
    'image-touch': '이미지를 찾아 터치하는 노드입니다.'
};

export const NODE_DEFAULT_COLORS = {
    'start': 'green',
    'end': 'gray',
    'action': 'blue',
    'condition': 'orange',
    'loop': 'purple',
    'wait': 'purple',
    'image-touch': 'blue'
};

export const NODE_DEFAULT_TITLES = {
    'start': '시작',
    'end': '종료',
    'action': '액션 노드',
    'condition': '조건 노드',
    'loop': '반복 노드',
    'wait': '대기 노드',
    'image-touch': '이미지 터치'
};

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

