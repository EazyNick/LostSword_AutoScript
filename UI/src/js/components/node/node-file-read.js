// node-file-read.js
// 파일 읽기 노드 정의

(function () {
    if (!window.NodeManager) {
        return;
    }

    window.NodeManager.registerNodeType('file-read', {
        /**
         * 파일 읽기 노드 내용 생성
         * @param {Object} nodeData
         */
        renderContent(nodeData) {
            const filePath = nodeData.file_path || '파일 경로 미설정';
            const encoding = nodeData.encoding || 'utf-8';
            const description = `파일: ${filePath} (${encoding})`;

            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon-box">
                        <div class="node-icon">📄</div>
                    </div>
                    <div class="node-text-area">
                        <div class="node-title">${this.escapeHtml(nodeData.title || '파일 읽기')}</div>
                        <div class="node-description">${this.escapeHtml(description)}</div>
                    </div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
