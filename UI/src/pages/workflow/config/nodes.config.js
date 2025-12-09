/**
 * 노드 설정 파일
 *
 * 새로운 노드를 추가하려면 이 파일에 노드 정보를 추가하고,
 * 해당 노드의 기능을 구현한 JS 파일을 생성하세요.
 *
 * 예시:
 * 1. 아래에 노드 정보 추가:
 *    'my-node': {
 *      label: '내 노드',
 *      title: '내 노드',
 *      description: '내 노드 설명',
 *      script: 'node-my-node.js',
 *      isBoundary: false
 *    }
 *
 * 2. UI/src/js/components/node/node-my-node.js 파일 생성
 * 3. 해당 파일에서 NodeManager.registerNodeType('my-node', {...}) 호출
 */

export const NODES_CONFIG = {
    start: {
        label: '시작 노드',
        title: '시작',
        description: '워크플로우의 시작점입니다.',
        script: 'node-start.js',
        isBoundary: true,
        category: 'system'
    },
    end: {
        label: '종료 노드',
        title: '종료',
        description: '워크플로우의 종료점입니다.',
        script: 'node-end.js',
        isBoundary: true,
        category: 'system'
    },
    condition: {
        label: '조건 노드',
        title: '조건 노드',
        description: '조건을 확인하는 노드입니다.',
        script: 'node-condition.js',
        isBoundary: false,
        category: 'logic'
    },
    loop: {
        label: '반복 노드',
        title: '반복 노드',
        description: '반복 작업을 수행하는 노드입니다.',
        script: 'node-loop.js',
        isBoundary: false,
        category: 'logic'
    },
    wait: {
        label: '대기 노드',
        title: '대기',
        description: '일정 시간 대기하는 노드입니다.',
        script: 'node-wait.js',
        isBoundary: false,
        category: 'action'
    },
    'image-touch': {
        label: '이미지 터치 노드',
        title: '이미지 터치',
        description: '이미지를 찾아 터치하는 노드입니다.',
        script: 'node-image-touch.js',
        isBoundary: false,
        category: 'action',
        // 특수 설정: 이미지 터치 노드는 추가 설정이 필요함
        requiresFolderPath: true
    },
    'process-focus': {
        label: '화면 포커스',
        title: '화면 포커스',
        description: '선택한 프로세스의 창을 화면 최상단에 포커스합니다.',
        script: 'node-process-focus.js',
        isBoundary: false,
        category: 'action'
    }
};

/**
 * 노드 설정 가져오기
 * @param {string} nodeType - 노드 타입
 * @returns {Object|null} 노드 설정 객체
 */
export function getNodeConfig(nodeType) {
    return NODES_CONFIG[nodeType] || null;
}

/**
 * 모든 노드 타입 목록 가져오기
 * @returns {string[]} 노드 타입 배열
 */
export function getAllNodeTypes() {
    return Object.keys(NODES_CONFIG);
}

/**
 * 경계 노드인지 확인
 * @param {string} nodeType - 노드 타입
 * @returns {boolean}
 */
export function isBoundaryNode(nodeType) {
    const config = getNodeConfig(nodeType);
    return config ? config.isBoundary : false;
}

/**
 * 노드 라벨 가져오기
 * @param {string} nodeType - 노드 타입
 * @returns {string}
 */
export function getNodeLabel(nodeType) {
    const config = getNodeConfig(nodeType);
    return config ? config.label : nodeType;
}
