// node-loop.js
// 반복 노드 정의 (예: for / while 느낌)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('loop', {
        renderContent(nodeData) {
            // loop도 조건처럼 True/False 두 갈래를 줄 수도 있고,
            // 단순 액션처럼 한 출력만 줄 수도 있음.
            // 일단 예시로 "반복 종료 후 다음" 한 출력만 둔 버전.
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon">🔁</div>
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
