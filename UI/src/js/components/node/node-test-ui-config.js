// node-test-ui-config.js
// UI 테스트 노드 정의

(function () {
    // NodeManager가 로드될 때까지 대기
    if (!window.NodeManager) {
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
        window.NodeManager.registerNodeType('testUIconfig', {
            /**
             * UI 테스트 노드 내용 생성
             * @param {Object} nodeData - 노드 데이터
             */
            renderContent(nodeData) {
                const testValue = nodeData.test_value || '기본값';
                const testNumber = nodeData.test_number || 10;
                const testBoolean = nodeData.test_boolean !== undefined ? nodeData.test_boolean : true;

                const description = `값: ${testValue}, 숫자: ${testNumber}, 옵션: ${testBoolean ? 'ON' : 'OFF'}`;

                return `
                    <div class="node-input"></div>
                    <div class="node-content">
                        <div class="node-icon-box">
                            <div class="node-icon">🧪</div>
                        </div>
                        <div class="node-text-area">
                            <div class="node-title">${this.escapeHtml(nodeData.title || 'UI 테스트')}</div>
                            <div class="node-description">${this.escapeHtml(description)}</div>
                        </div>
                    </div>
                    <div class="node-output"></div>
                    <div class="node-settings">⚙</div>
                `;
            }
        });

        console.log('[node-test-ui-config] UI 테스트 노드 타입 등록 완료');
    }

    // 즉시 등록 시도
    if (window.NodeManager && window.NodeManager.registerNodeType) {
        registerNode();
    }
})();
