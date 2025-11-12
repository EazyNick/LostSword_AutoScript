// node-wait.js
// 대기 노드 정의 (타이머/딜레이용)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('wait', {
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon">⏱</div>
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
