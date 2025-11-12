// node-canvas.js
// Î¨¥Ìïú Ï∫îÎ≤Ñ??/ ?®Îãù / Ï§??¥Îãπ Ïª®Ìä∏Î°§Îü¨

(function () {
    class NodeCanvasController {
        /**
         * @param {NodeManager} nodeManager
         */
        constructor(nodeManager) {
            this.nodeManager = nodeManager;
            this.canvas = nodeManager.canvas;

            this.isPanning = false;
            this.panStart = { x: 0, y: 0 };
            this.panScrollStart = { left: 0, top: 0 };

            this.canvasTransform = {
                x: -50000,
                y: -50000,
                scale: 1
            };

            this.isZooming = false;
        }

        /**
         * Ï∫îÎ≤Ñ??Í¥Ä??Î™®Îì† ?¥Î≤§??Î∞îÏù∏??
         */
        bindEvents() {
            const canvas = this.canvas;
            if (!canvas) return;

            // ÎßàÏö∞????+ Ctrl : Ï§?/ Í∑∏ÎÉ• ??: ?ºÍ∑∏ÎßàÏãù ?®Îãù
            canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

            // Ï§ëÍ∞Ñ Î≤ÑÌäº ?úÎûòÍ∑??®Îãù
            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    log('ÎßàÏö∞????Î≤ÑÌäº ?ÑÎ¶Ñ - ?®Îãù ?úÏûë');
                    this.startPan(e);

                    const handleMove = (moveEvent) => {
                        if (this.isPanning) {
                            this.handlePan(moveEvent);
                        }
                    };

                    const handleUp = () => {
                        log('ÎßàÏö∞????Í∞êÏ? - ?®Îãù Ï¢ÖÎ£å');
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                        document.removeEventListener('mouseleave', handleUp);
                        if (this.isPanning) {
                            this.endPan();
                        }
                    };

                    document.addEventListener('mousemove', handleMove);
                    document.addEventListener('mouseup', handleUp);
                    document.addEventListener('mouseleave', handleUp);
                }
            });

            // ?ÑÏó≠ mouseup ?ºÎ°ú???®Îãù Í∞ïÏ†ú Ï¢ÖÎ£å
            document.addEventListener('mouseup', () => {
                if (this.isPanning) {
                    log('?ÑÏó≠ mouseup - ?®Îãù Í∞ïÏ†ú Ï¢ÖÎ£å');
                    this.endPan();
                }
            });

            // Ïª®ÌÖç?§Ìä∏ Î©îÎâ¥ ÎßâÍ∏∞
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // ?¨Ïª§??Í¥ÄÎ¶?
            canvas.addEventListener('focus', () => {
                this.nodeManager.isCanvasFocused = true;
                log('Ï∫îÎ≤Ñ???¨Ïª§?§Îê®');
            });

            canvas.addEventListener('blur', () => {
                this.nodeManager.isCanvasFocused = false;
                log('Ï∫îÎ≤Ñ???¨Ïª§???¥Ï†ú??);
            });

            canvas.addEventListener('mouseenter', () => {
                canvas.focus();
                log('ÎßàÏö∞??ÏßÑÏûÖ?ºÎ°ú Ï∫îÎ≤Ñ???¨Ïª§???§Ï†ï');
            });

            canvas.addEventListener('click', (e) => {
                canvas.focus();
                log('=== Ï∫îÎ≤Ñ???¥Î¶≠ ?îÎ≤ÑÍπ?===');
                log(`- ?¥Î¶≠ ?ÑÏπò: (${e.clientX}, ${e.clientY})`);
                log(`- Î¨¥Ìïú Ï∫îÎ≤Ñ??Î™®Îìú: ${this.nodeManager.isInfiniteCanvas}`);
                log(`- ?®Îãù Ï§? ${this.isPanning}`);
            });

            // auxclick(Ï§ëÍ∞Ñ Î≤ÑÌäº ?¥Î¶≠) ?ÑÏ†Ñ Î¨¥Ïãú
            canvas.addEventListener('auxclick', (e) => {
                log('auxclick ?¥Î≤§??Î¨¥Ïãú (?®Îãù Î∞©Ìï¥ Î∞©Ï?):', e.button);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });

            // Î¶¨ÏÇ¨?¥Ï¶à ??Ï∫îÎ≤Ñ???§ÌÅ¨Î°?Í∞Ä?•ÏÑ± Î≥¥Ïû•
            window.addEventListener('resize', () => {
                this.ensureCanvasScrollable();
            });
        }

        /**
         * ???¥Î≤§?? Ctrl+??= Ï§? ?òÎ®∏ÏßÄ = ?®Îãù
         */
        handleWheel(e) {
            log('Wheel ?¥Î≤§??', {
                ctrlKey: e.ctrlKey,
                deltaY: e.deltaY,
                isPanning: this.isPanning
            });

            // ?®Îãù Ï§ëÏù¥Î©?Í∑∏ÎÉ• ÎßâÍ∏∞
            if (this.isPanning) {
                e.preventDefault();
                return;
            }

            if (e.ctrlKey) {
                // Ï§?
                e.preventDefault();
                e.stopPropagation();

                this.canvas.focus();
                this.nodeManager.isCanvasFocused = true;

                this.handleCanvasZoom(e);
            } else {
                // ?ºÍ∑∏ÎßàÏãù ?®Îãù
                e.preventDefault();
                this.handleWheelPan(e);
            }
        }

        /**
         * ??Í∏∞Î∞ò ?®Îãù (?ºÍ∑∏Îß??§Ì???
         */
        handleWheelPan(e) {
            const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
            const deltaY = e.deltaY || (e.shiftKey ? 0 : e.deltaY);

            if (!this.canvasTransform) {
                this.canvasTransform = { x: -50000, y: -50000, scale: 1 };
            }

            const newX = this.canvasTransform.x + deltaX;
            const newY = this.canvasTransform.y + deltaY;

            const canvasContent = document.getElementById('canvas-content');
            let currentScale = this.canvasTransform.scale;
            if (canvasContent) {
                const currentTransform = canvasContent.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        currentScale = parseFloat(scaleMatch[1]) || 1;
                    }
                }
            }

            this.updateCanvasTransform(newX, newY, currentScale);

            if (Math.random() < 0.1) {
                log(
                    `?ºÍ∑∏Îß?Î∞©Ïãù ???®Îãù: translate(${Math.round(newX)}, ${Math.round(newY)})`
                );
            }
        }

        /**
         * ?®Îãù ?úÏûë (Ï§ëÍ∞ÑÎ≤ÑÌäº)
         */
        startPan(e) {
            if (this.isPanning) return;

            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };

            if (!this.canvasTransform) {
                this.canvasTransform = { x: -50000, y: -50000, scale: 1 };
            }

            this.panScrollStart = {
                left: this.canvasTransform.x,
                top: this.canvasTransform.y
            };

            this.canvas.classList.add('panning');
            this.canvas.style.cursor = 'grabbing';

            // ?∏Îìú ?†ÌÉù ?¥Ï†ú
            if (typeof this.nodeManager.deselectNode === 'function') {
                this.nodeManager.deselectNode();
            }

            log(
                `?ºÍ∑∏Îß?Î∞©Ïãù ?®Îãù ?úÏûë: ÎßàÏö∞??${this.panStart.x}, ${this.panStart.y}) Transform(${Math.round(this.panScrollStart.left)}, ${Math.round(this.panScrollStart.top)})`
            );
        }

        /**
         * ?®Îãù Ï§?
         */
        handlePan(e) {
            if (!this.isPanning) return;

            const deltaX = e.clientX - this.panStart.x;
            const deltaY = e.clientY - this.panStart.y;

            if (!this.canvasTransform) {
                this.canvasTransform = { x: -50000, y: -50000, scale: 1 };
            }

            const newX = this.panScrollStart.left + deltaX;
            const newY = this.panScrollStart.top + deltaY;

            const canvasContent = document.getElementById('canvas-content');
            let currentScale = this.canvasTransform.scale;
            if (canvasContent) {
                const currentTransform = canvasContent.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        currentScale = parseFloat(scaleMatch[1]) || 1;
                    }
                }
            }

            this.updateCanvasTransform(newX, newY, currentScale);

            if (Math.random() < 0.02) {
                log(
                    `?ºÍ∑∏Îß?Î∞©Ïãù ?úÎûòÍ∑??®Îãù: translate(${Math.round(newX)}, ${Math.round(newY)})`
                );
            }
        }

        /**
         * ?®Îãù Ï¢ÖÎ£å
         */
        endPan() {
            log('endPan() ?∏Ï∂ú??- ?ÑÏû¨ ?®Îãù ?ÅÌÉú:', this.isPanning);

            this.isPanning = false;
            this.panStart = { x: 0, y: 0 };
            this.panScrollStart = { left: 0, top: 0 };

            this.canvas.classList.remove('panning');
            this.canvas.style.cursor = 'default';

            log('?®Îãù Î™®Îìú Ï¢ÖÎ£å ?ÑÎ£å');
        }

        /**
         * Transform ?ÖÎç∞?¥Ìä∏ (translate + scale)
         */
        updateCanvasTransform(x, y, scale = 1) {
            if (this.isZooming) {
                log('updateCanvasTransform: Ï§?Ï§ëÏù¥ÎØÄÎ°??§Ìñâ Í±¥ÎÑà?Ä');
                return;
            }

            let canvasContent = document.getElementById('canvas-content');

            if (!canvasContent) {
                log('canvas-content ?ÜÏùå ???ôÏ†Å ?ùÏÑ±');

                const existingNodes = Array.from(this.canvas.children);

                canvasContent = document.createElement('div');
                canvasContent.id = 'canvas-content';
                canvasContent.className = 'canvas-content';

                this.canvas.innerHTML = '';
                this.canvas.appendChild(canvasContent);

                existingNodes.forEach((node) => {
                    const currentLeft = node.style.left;
                    const currentTop = node.style.top;
                    canvasContent.appendChild(node);
                    node.style.left = currentLeft;
                    node.style.top = currentTop;
                });
            }

            // scale Í∏∞Î≥∏Í∞íÏù¥Î©?Í∏∞Ï°¥ scale ?†Ï?
            let currentScale = scale;
            if (scale === 1) {
                const currentTransform = canvasContent.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        currentScale = parseFloat(scaleMatch[1]) || 1;
                        log('updateCanvasTransform: Í∏∞Ï°¥ Ï§??†Ï?', currentScale);
                    }
                }
            }

            this.canvasTransform = { x, y, scale: currentScale };
            canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${currentScale})`;

            log(
                `updateCanvasTransform: translate(${x}, ${y}) scale(${currentScale})`
            );

            // ?úÎûòÍ∑?Ï§??ÑÎãê ?åÎßå ?∞Í≤∞???ÑÏ≤¥ ?ÖÎç∞?¥Ìä∏
            if (window.connectionManager && !this.nodeManager.isDragging) {
                window.connectionManager.updateConnections();
            }
        }

        /**
         * Î¨¥Ìïú Ï∫îÎ≤Ñ???§ÌÅ¨Î°?Î≥¥Ïû•
         */
        ensureCanvasScrollable() {
            if (this.nodeManager.isInfiniteCanvas) {
                log('?ºÍ∑∏Îß?Î∞©Ïãù Î¨¥Ìïú Ï∫îÎ≤Ñ??Î™®Îìú ?úÏÑ±??);

                this.canvasTransform = { x: -50000, y: -50000, scale: 1 };

                const setupFigmaStyleCanvas = () => {
                    let canvasContent = document.getElementById('canvas-content');

                    if (!canvasContent) {
                        log('canvas-content ?ÜÏùå ???ôÏ†Å ?ùÏÑ±');

                        const existingNodes = Array.from(this.canvas.children);

                        canvasContent = document.createElement('div');
                        canvasContent.id = 'canvas-content';
                        canvasContent.className = 'canvas-content';

                        this.canvas.innerHTML = '';
                        this.canvas.appendChild(canvasContent);

                        existingNodes.forEach((node) => {
                            const currentLeft = node.style.left;
                            const currentTop = node.style.top;
                            canvasContent.appendChild(node);
                            node.style.left = currentLeft;
                            node.style.top = currentTop;
                        });

                        log('canvas-content ?ùÏÑ± Î∞??∏Îìú ?¥Îèô ?ÑÎ£å');
                    }

                    const screenCenterX = this.canvas.clientWidth / 2;
                    const screenCenterY = this.canvas.clientHeight / 2;

                    const nodes = canvasContent.querySelectorAll('.workflow-node');
                    nodes.forEach((node, index) => {
                        const nodeWidth = 200;
                        const nodeHeight = 80;
                        const spacing = 250;

                        const nodeX =
                            screenCenterX + (index - 1) * spacing - nodeWidth / 2;
                        const nodeY = screenCenterY - nodeHeight / 2;

                        log(
                            `?∏Îìú ${node.dataset.nodeId} ?ÑÏπò Ï°∞Ï†ï:`,
                            node.style.left,
                            node.style.top,
                            '??,
                            nodeX,
                            nodeY
                        );

                        node.style.left = nodeX + 'px';
                        node.style.top = nodeY + 'px';
                    });

                    canvasContent.style.transform = 'translate(0px, 0px)';

                    this.canvasTransform = { x: 0, y: 0, scale: 1 };
                };

                setTimeout(setupFigmaStyleCanvas, 300);
                return;
            }

            // (Î¨¥ÌïúÏ∫îÎ≤Ñ??Î™®ÎìúÍ∞Ä ?ÑÎãê ???àÏ†Ñ Î∞©Ïãù???ÑÏöî?òÎ©¥ ?¨Í∏∞ Íµ¨ÌòÑ)
        }

        /**
         * Ctrl+??Ï§?
         */
        handleCanvasZoom(e) {
            log('handleCanvasZoom ?∏Ï∂ú??', {
                clientX: e.clientX,
                clientY: e.clientY,
                deltaY: e.deltaY
            });

            this.isZooming = true;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const canvasContent = document.getElementById('canvas-content');
            if (!canvasContent) {
                logWarn('canvas-contentÎ•?Ï∞æÏùÑ ???ÜÏäµ?àÎã§.');
                this.isZooming = false;
                return;
            }

            const transform =
                canvasContent.style.transform ||
                'translate(-50000px, -50000px) scale(1)';

            let currentX = -50000,
                currentY = -50000,
                currentScale = 1;

            const translateMatch = transform.match(
                /translate\(([^,]+)px,\s*([^)]+)px\)/
            );
            if (translateMatch) {
                currentX = parseFloat(translateMatch[1]) || -50000;
                currentY = parseFloat(translateMatch[2]) || -50000;
            }

            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                currentScale = parseFloat(scaleMatch[1]) || 1;
            }

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(5, currentScale * zoomFactor));

            const zoomRatio = newScale / currentScale;

            const newX = mouseX - (mouseX - currentX) * zoomRatio;
            const newY = mouseY - (mouseY - currentY) * zoomRatio;

            const newTransform = `translate(${newX}px, ${newY}px) scale(${newScale})`;
            canvasContent.style.transform = newTransform;

            this.canvasTransform = { x: newX, y: newY, scale: newScale };

            this.showZoomLevel(newScale);

            log(
                `Ï∫îÎ≤Ñ??Ï§??àÎ≤® Î≥ÄÍ≤? ${currentScale.toFixed(
                    2
                )}x ??${newScale.toFixed(2)}x`
            );

            setTimeout(() => {
                this.isZooming = false;
                log('Ï§??ÑÎ£å - ?åÎûòÍ∑??¥Ï†ú');
            }, 100);
        }

        /**
         * ?ÅÎã® Ï§??àÎ≤® ?úÏãú UI
         */
        showZoomLevel(zoomLevel) {
            const existing = document.getElementById('zoom-indicator');
            if (existing) existing.remove();

            const indicator = document.createElement('div');
            indicator.id = 'zoom-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            indicator.textContent = `${(zoomLevel * 100).toFixed(0)}%`;

            document.body.appendChild(indicator);

            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
            }, 2000);
        }
    }

    window.NodeCanvasController = NodeCanvasController;
})();
