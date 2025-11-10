// node-action.js
// 공통 액션 노드 정의 (기본 노드 형태)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('action', {
        /**
         * 액션 노드 내용 생성
         * @param {Object} nodeData
         */
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });

    // fallback용 default도 같은 모양으로 등록해두면 안전함
    window.NodeManager.registerNodeType('default', {
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
