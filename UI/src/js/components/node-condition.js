// node-condition.js
// 조건 노드 정의 (True / False 출력 두 개)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('condition', {
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon">🔐</div>
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-outputs">
                    <div class="node-output true-output">
                        <div class="output-dot true-dot"></div>
                        <span class="output-label">True</span>
                    </div>
                    <div class="node-output false-output">
                        <div class="output-dot false-dot"></div>
                        <span class="output-label">False</span>
                    </div>
                </div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
