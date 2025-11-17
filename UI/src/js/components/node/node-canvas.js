// node-canvas.js
// 무한 캔버스 / 패닝 / 줌 컨트롤러

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
         * 캔버스 관련 모든 이벤트 바인딩
         */
        bindEvents() {
            const canvas = this.canvas;
            if (!canvas) return;

            // 마우스 휠 + Ctrl : 줌 / 그냥 휠 : 피그마식 패닝
            canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

            // 중간 버튼 드래그 패닝
            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    log('마우스 중간 버튼 눌림 - 패닝 시작');
                    this.startPan(e);

                    const handleMove = (moveEvent) => {
                        if (this.isPanning) {
                            this.handlePan(moveEvent);
                        }
                    };

                    const handleUp = () => {
                        log('마우스 버튼 뗌 - 패닝 종료');
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

            // 전역 mouseup 으로 패닝 강제 종료
            document.addEventListener('mouseup', () => {
                if (this.isPanning) {
                    log('전역 mouseup - 패닝 강제 종료');
                    this.endPan();
                }
            });

            // 컨텍스트 메뉴 막기
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // 포커스 관련
            canvas.addEventListener('focus', () => {
                this.nodeManager.isCanvasFocused = true;
                log('캔버스 포커스됨');
            });

            canvas.addEventListener('blur', () => {
                this.nodeManager.isCanvasFocused = false;
                log('캔버스 포커스 해제');
            });

            canvas.addEventListener('mouseenter', () => {
                canvas.focus();
                log('마우스 진입으로 캔버스 포커스 지정');
            });

            canvas.addEventListener('click', (e) => {
                canvas.focus();
                log('=== 캔버스 클릭 이벤트 ===');
                log(`- 클릭 위치: (${e.clientX}, ${e.clientY})`);
                log(`- 무한 캔버스 모드: ${this.nodeManager.isInfiniteCanvas}`);
                log(`- 패닝 중 여부: ${this.isPanning}`);
            });

            // auxclick(중간 버튼 클릭) 이벤트 무시 (패닝 방해 방지)
            canvas.addEventListener('auxclick', (e) => {
                log('auxclick 이벤트 무시 (패닝 방해 방지):', e.button);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });

            // 리사이즈 시 캔버스가 항상 스크롤 가능하도록 보장 (노드 위치는 변경하지 않음)
            window.addEventListener('resize', () => {
                this.ensureCanvasContentExists();
            });
        }

        /**
         * 휠 이벤트 처리
         * Ctrl+휠 = 줌 / 그냥 휠 = 패닝
         */
        handleWheel(e) {
            log('Wheel 이벤트:', {
                ctrlKey: e.ctrlKey,
                deltaY: e.deltaY,
                isPanning: this.isPanning
            });

            // 패닝 중이면 그냥 막기
            if (this.isPanning) {
                e.preventDefault();
                return;
            }

            if (e.ctrlKey) {
                // 줌
                e.preventDefault();
                e.stopPropagation();

                this.canvas.focus();
                this.nodeManager.isCanvasFocused = true;

                this.handleCanvasZoom(e);
            } else {
                // 피그마식 패닝
                e.preventDefault();
                this.handleWheelPan(e);
            }
        }

        /**
         * 휠 기반 패닝 (피그마 스타일)
         */
        handleWheelPan(e) {
            const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
            const deltaY = e.deltaY || (e.shiftKey ? 0 : e.deltaY);

            // 실제 DOM의 transform 값을 읽어와서 사용 (동기화 보장)
            const canvasContent = document.getElementById('canvas-content');
            let currentX = -50000;
            let currentY = -50000;
            let currentScale = 1;

            if (canvasContent) {
                const currentTransform = canvasContent.style.transform || 'translate(-50000px, -50000px) scale(1)';
                
                const translateMatch = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (translateMatch) {
                    currentX = parseFloat(translateMatch[1]) || -50000;
                    currentY = parseFloat(translateMatch[2]) || -50000;
                }

                const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                if (scaleMatch) {
                    currentScale = parseFloat(scaleMatch[1]) || 1;
                }
            }

            // 실제 DOM 값으로 동기화
            this.canvasTransform = { x: currentX, y: currentY, scale: currentScale };

            // deltaY 부호를 반전하여 올바른 방향으로 스크롤되도록 수정
            const newX = currentX + deltaX;
            const newY = currentY - deltaY;

            this.updateCanvasTransform(newX, newY, currentScale);

            if (Math.random() < 0.1) {
                log(
                    `피그마 방식 휠 패닝: translate(${Math.round(newX)}, ${Math.round(newY)})`
                );
            }
        }

        /**
         * 패닝 시작 (중간 버튼)
         */
        startPan(e) {
            if (this.isPanning) return;

            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };

            // 실제 DOM의 transform 값을 읽어와서 사용 (동기화 보장)
            const canvasContent = document.getElementById('canvas-content');
            let currentX = -50000;
            let currentY = -50000;
            let currentScale = 1;

            if (canvasContent) {
                const currentTransform = canvasContent.style.transform || 'translate(-50000px, -50000px) scale(1)';
                
                const translateMatch = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (translateMatch) {
                    currentX = parseFloat(translateMatch[1]) || -50000;
                    currentY = parseFloat(translateMatch[2]) || -50000;
                }

                const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                if (scaleMatch) {
                    currentScale = parseFloat(scaleMatch[1]) || 1;
                }
            }

            // 실제 DOM 값으로 동기화
            this.canvasTransform = { x: currentX, y: currentY, scale: currentScale };

            this.panScrollStart = {
                left: currentX,
                top: currentY
            };

            this.canvas.classList.add('panning');
            this.canvas.style.cursor = 'grabbing';

            // 노드 선택 해제
            if (typeof this.nodeManager.deselectNode === 'function') {
                this.nodeManager.deselectNode();
            }

            log(
                `피그마 방식 패닝 시작: 마우스(${this.panStart.x}, ${this.panStart.y}) Transform(${Math.round(this.panScrollStart.left)}, ${Math.round(this.panScrollStart.top)})`
            );
        }

        /**
         * 패닝 진행
         */
        handlePan(e) {
            if (!this.isPanning) return;

            const deltaX = e.clientX - this.panStart.x;
            const deltaY = e.clientY - this.panStart.y;

            const newX = this.panScrollStart.left + deltaX;
            const newY = this.panScrollStart.top + deltaY;

            // 실제 DOM의 scale 값을 읽어와서 사용
            const canvasContent = document.getElementById('canvas-content');
            let currentScale = 1;
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
                    `피그마 방식 드래그 패닝: translate(${Math.round(newX)}, ${Math.round(newY)})`
                );
            }
        }

        /**
         * 패닝 종료
         */
        endPan() {
            log('endPan() 호출 - 현재 패닝 상태:', this.isPanning);

            this.isPanning = false;
            this.panStart = { x: 0, y: 0 };
            this.panScrollStart = { left: 0, top: 0 };

            this.canvas.classList.remove('panning');
            this.canvas.style.cursor = 'default';

            log('패닝 모드 종료 완료');
        }

        /**
         * Transform 업데이트 (translate + scale)
         */
        updateCanvasTransform(x, y, scale = 1) {
            if (this.isZooming) {
                log('updateCanvasTransform: 줌 중이므로 실행 건너뜀');
                return;
            }

            let canvasContent = document.getElementById('canvas-content');

            if (!canvasContent) {
                log('canvas-content 없음 → 동적 생성');

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

            // scale 기본값이면 기존 scale 유지
            let currentScale = scale;
            if (scale === 1) {
                const currentTransform = canvasContent.style.transform;
                if (currentTransform && currentTransform !== 'none') {
                    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        currentScale = parseFloat(scaleMatch[1]) || 1;
                        log('updateCanvasTransform: 기존 스케일', currentScale);
                    }
                }
            }

            this.canvasTransform = { x, y, scale: currentScale };
            canvasContent.style.transform = `translate(${x}px, ${y}px) scale(${currentScale})`;

            log(
                `updateCanvasTransform: translate(${x}, ${y}) scale(${currentScale})`
            );

            // 드래그 중이 아닐 때만 연결선 전체 업데이트
            if (window.connectionManager && !this.nodeManager.isDragging) {
                window.connectionManager.updateConnections();
            }
        }

        /**
         * canvas-content 요소만 확인하고 생성 (노드 위치는 변경하지 않음)
         * resize 이벤트 등에서 사용
         */
        ensureCanvasContentExists() {
            let canvasContent = document.getElementById('canvas-content');

            if (!canvasContent) {
                log('canvas-content 없음 → 동적 생성 (resize)');

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

                // 기존 transform 값 유지
                if (this.canvasTransform) {
                    canvasContent.style.transform = `translate(${this.canvasTransform.x}px, ${this.canvasTransform.y}px) scale(${this.canvasTransform.scale})`;
                } else {
                    canvasContent.style.transform = 'translate(-50000px, -50000px) scale(1)';
                    this.canvasTransform = { x: -50000, y: -50000, scale: 1 };
                }

                log('canvas-content 생성 완료 (기존 transform 유지)');
            }
        }

        /**
         * 무한 캔버스 모드에서 캔버스 크기 보장
         * 초기화 시에만 사용 (노드 위치 재배열 포함)
         */
        ensureCanvasScrollable() {
            if (this.nodeManager.isInfiniteCanvas) {
                log('피그마 방식 무한 캔버스 모드 활성화');

                this.canvasTransform = { x: -50000, y: -50000, scale: 1 };

                const setupFigmaStyleCanvas = () => {
                    let canvasContent = document.getElementById('canvas-content');

                    if (!canvasContent) {
                        log('canvas-content 없음 → 동적 생성');

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

                        log('canvas-content 생성 및 노드 이동 완료');
                    }

                    // 초기화 시에만 노드 위치 재배열
                    const nodes = canvasContent.querySelectorAll('.workflow-node');
                    if (nodes.length > 0) {
                        // 노드가 이미 위치를 가지고 있는지 확인
                        const firstNode = nodes[0];
                        const hasExistingPosition = firstNode.style.left && firstNode.style.top && 
                                                   (parseFloat(firstNode.style.left) !== 0 || parseFloat(firstNode.style.top) !== 0);
                        
                        // 노드 위치가 없을 때만 재배열
                        if (!hasExistingPosition) {
                            const screenCenterX = this.canvas.clientWidth / 2;
                            const screenCenterY = this.canvas.clientHeight / 2;

                            nodes.forEach((node, index) => {
                                const nodeWidth = 200;
                                const nodeHeight = 80;
                                const spacing = 250;

                                const nodeX =
                                    screenCenterX + (index - 1) * spacing - nodeWidth / 2;
                                const nodeY = screenCenterY - nodeHeight / 2;

                                log(
                                    `노드 ${node.dataset.nodeId} 위치 조정:`,
                                    node.style.left,
                                    node.style.top,
                                    '→',
                                    nodeX,
                                    nodeY
                                );

                                node.style.left = nodeX + 'px';
                                node.style.top = nodeY + 'px';
                            });
                        }
                    }

                    canvasContent.style.transform = 'translate(0px, 0px)';

                    this.canvasTransform = { x: 0, y: 0, scale: 1 };
                };

                setTimeout(setupFigmaStyleCanvas, 300);
                return;
            }

            // (무한 캔버스 모드가 아닐 때 이전 방식이 필요하면 여기에 구현)
        }

        /**
         * Ctrl+휠 줌 처리
         */
        handleCanvasZoom(e) {
            log('handleCanvasZoom 호출:', {
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
                logWarn('canvas-content 를 찾을 수 없습니다.');
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
                `캔버스 줌 레벨 변경: ${currentScale.toFixed(
                    2
                )}x → ${newScale.toFixed(2)}x`
            );

            setTimeout(() => {
                this.isZooming = false;
                log('줌 처리 완료 - 플래그 해제');
            }, 100);
        }

        /**
         * 간단 줌 레벨 표시 UI
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
