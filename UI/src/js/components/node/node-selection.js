// node-selection.js
// ?¸ë“œ ? íƒ ?„ë‹´ ì»¨íŠ¸ë¡¤ëŸ¬

(function () {
    class NodeSelectionController {
        /**
         * @param {NodeManager} nodeManager
         */
        constructor(nodeManager) {
            this.nodeManager = nodeManager;
        }

        /**
         * ?¸ë“œ ? íƒ
         * @param {HTMLElement} node
         */
        selectNode(node) {
            const nm = this.nodeManager;

            // ê¸°ì¡´ ? íƒ ?´ì œ
            if (nm.selectedNode && nm.selectedNode !== node) {
                this.deselectNode();
            }

            nm.selectedNode = node;

            if (node) {
                node.classList.add('selected');
                log('?¸ë“œ ? íƒ??', node.id);
            }
        }

        /**
         * ? íƒ ?´ì œ
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
