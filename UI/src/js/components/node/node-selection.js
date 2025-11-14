// node-selection.js
// 노드 선택 담당 컨트롤러

(function () {
    class NodeSelectionController {
        /**
         * @param {NodeManager} nodeManager
         */
        constructor(nodeManager) {
            this.nodeManager = nodeManager;
        }

        /**
         * 노드 선택
         * @param {HTMLElement} node
         */
        selectNode(node) {
            const nm = this.nodeManager;

            // 기존 선택 해제
            if (nm.selectedNode && nm.selectedNode !== node) {
                this.deselectNode();
            }

            nm.selectedNode = node;

            if (node) {
                node.classList.add('selected');
                log('노드 선택됨:', node.id);
            }
        }

        /**
         * 선택 해제
         */
        deselectNode() {
            const nm = this.nodeManager;
            if (nm.selectedNode) {
                nm.selectedNode.classList.remove('selected');
                nm.selectedNode = null;
            }
        }
    }

    window.NodeSelectionController = NodeSelectionController;
})();
