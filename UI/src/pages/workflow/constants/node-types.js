/**
 * 노드 타입 상수 정의
 */

export const NODE_TYPES = {
    START: 'start',
    END: 'end',
    ACTION: 'action',
    CONDITION: 'condition',
    LOOP: 'loop',
    WAIT: 'wait',
    IMAGE_TOUCH: 'image-touch'
};

export const NODE_TYPE_LABELS = {
    [NODE_TYPES.START]: '시작 노드',
    [NODE_TYPES.END]: '종료 노드',
    [NODE_TYPES.ACTION]: '액션 노드',
    [NODE_TYPES.CONDITION]: '조건 노드',
    [NODE_TYPES.LOOP]: '반복 노드',
    [NODE_TYPES.WAIT]: '대기 노드',
    [NODE_TYPES.IMAGE_TOUCH]: '이미지 터치 노드'
};

/**
 * 시작/종료 노드인지 확인
 * @param {string} type - 노드 타입
 * @returns {boolean}
 */
export function isBoundaryNode(type) {
    return type === NODE_TYPES.START || type === NODE_TYPES.END;
}

