// node-example.js
// 예시 노드 정의
//
// 이 파일은 새로운 노드를 만들 때 참고할 수 있는 템플릿입니다.
// 실제 사용하려면:
// 1. 파일명을 node-{노드이름}.js로 변경
// 2. registerNodeType의 첫 번째 인자를 노드 타입으로 변경
// 3. renderContent 함수를 원하는 대로 수정
// 4. nodes.config.js에 노드 정보 추가

(function () {
    // NodeManager가 로드될 때까지 대기
    if (!window.NodeManager) {
        // NodeManager가 아직 로드되지 않았으면 재시도
        const checkAndRegister = () => {
            if (window.NodeManager && window.NodeManager.registerNodeType) {
                registerNode();
            } else {
                setTimeout(checkAndRegister, 50);
            }
        };
        checkAndRegister();
        return;
    }

    // 노드 타입 등록
    function registerNode() {
        window.NodeManager.registerNodeType('example', {
            /**
             * 예시 노드 내용 생성
             * @param {Object} nodeData - 노드 데이터
             *
             * nodeData에는 다음 속성들이 포함됩니다:
             * - id: 노드 ID
             * - type: 노드 타입 ('example')
             * - title: 노드 제목
             * - color: 노드 색상
             * - x, y: 노드 위치
             * - 기타 사용자 정의 속성들
             */
            renderContent(nodeData) {
                // 기본 노드 구조
                return `
                    <div class="node-input"></div>
                    <div class="node-content">
                        <div class="node-title">${this.escapeHtml(nodeData.title || '예시 노드')}</div>
                        <div class="node-description">${this.escapeHtml(nodeData.description || '')}</div>
                    </div>
                    <div class="node-output"></div>
                    <div class="node-settings">⚙</div>
                `;
            }
        });

        console.log('[node-example] 예시 노드 타입 등록 완료');
    }

    // 즉시 등록 시도
    if (window.NodeManager && window.NodeManager.registerNodeType) {
        registerNode();
    }
})();
