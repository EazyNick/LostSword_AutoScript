// node-start.js
// 시작 노드 정의 (출력만 있는 노드)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('start', {
        renderContent(nodeData) {
            return `
                <div class="node-content">
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
            `;
        }
    });
})();
