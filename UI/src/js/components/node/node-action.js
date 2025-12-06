// node-action.js
// 공통 액션 노드 정의 (기본 노드 형태)

(function () {
    if (!window.NodeManager) {
        return;
    }

    window.NodeManager.registerNodeType('action', {
        /**
         * 액션 노드 내용 생성
         * @param {Object} nodeData
         */
        renderContent(nodeData) {
            const icon = window.NodeIcons ? window.NodeIcons.getIcon('action', nodeData) : '⚙';
            // 클릭 노드인 경우 설명 변경
            const isClickNode = nodeData.title && (nodeData.title.includes('클릭') || nodeData.title.includes('Click'));
            const description = isClickNode ? '화면 좌표 또는 요소 클릭' : (nodeData.description || '액션을 수행합니다');
            
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon-box">
                        <div class="node-icon">${icon}</div>
                    </div>
                    <div class="node-text-area">
                        <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                        <div class="node-description">${this.escapeHtml(description)}</div>
                    </div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });

    // fallback용 default도 같은 모양으로 등록해두면 안전함
    window.NodeManager.registerNodeType('default', {
        renderContent(nodeData) {
            const icon = window.NodeIcons ? window.NodeIcons.getIcon('default', nodeData) : '⚙';
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon-box">
                        <div class="node-icon">${icon}</div>
                    </div>
                    <div class="node-text-area">
                        <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                        <div class="node-description">${this.escapeHtml(nodeData.description || '')}</div>
                    </div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
