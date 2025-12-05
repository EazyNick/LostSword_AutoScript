// node-end.js
// 종료 노드 정의 (입력만 있는 노드)

(function () {
    if (!window.NodeManager) {
        return;
    }

    window.NodeManager.registerNodeType('end', {
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
            `;
        }
    });
})();
