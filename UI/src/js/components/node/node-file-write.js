// node-file-write.js
// 파일 쓰기 노드 정의

(function () {
    if (!window.NodeManager) {
        return;
    }

    window.NodeManager.registerNodeType('file-write', {
        /**
         * 파일 쓰기 노드 내용 생성
         * @param {Object} nodeData
         */
        renderContent(nodeData) {
            const filePath = nodeData.file_path || '파일 경로 미설정';
            const mode = nodeData.mode || 'write';
            const modeText = mode === 'append' ? '추가' : '쓰기';
            const description = `파일: ${filePath} (${modeText} 모드)`;

            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon-box">
                        <div class="node-icon">✍️</div>
                    </div>
                    <div class="node-text-area">
                        <div class="node-title">${this.escapeHtml(nodeData.title || '파일 쓰기')}</div>
                        <div class="node-description">${this.escapeHtml(description)}</div>
                    </div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
