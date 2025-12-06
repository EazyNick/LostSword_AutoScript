// node-end.js
// 종료 노드 정의 (입력만 있는 노드)

(function () {
    if (!window.NodeManager) {
        return;
    }

    window.NodeManager.registerNodeType('end', {
        renderContent(nodeData) {
            const icon = window.NodeIcons ? window.NodeIcons.getIcon('end', nodeData) : '■';
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon-box">
                        <div class="node-icon">${icon}</div>
                    </div>
                    <div class="node-text-area">
                        <div class="node-title">${this.escapeHtml(nodeData.title || '종료')}</div>
                        <div class="node-description">워크플로우 종료점</div>
                    </div>
                </div>
            `;
        }
    });
})();
