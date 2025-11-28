import { generateCode } from './generator.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export class Editor {
    constructor(svgElement, previewContainer, codeDisplay) {
        this.svg = svgElement;
        this.previewContainer = previewContainer;
        this.codeDisplay = codeDisplay;
        this.activeLayer = this.svg.querySelector('#active-layer');
        this.ghostLayer = this.svg.querySelector('#ghost-layer');
        this.controlsLayer = this.svg.querySelector('#controls-layer');

        this.mode = 'menu'; // 'menu' or 'close'
        this.generationMethod = 'checkbox'; // 'checkbox' or 'class'

        // Initial State (Standard Hamburger -> Cross)
        this.initialLines = [
            {
                menu: [{ x: 20, y: 30 }, { x: 80, y: 30 }],
                close: [{ x: 20, y: 20 }, { x: 80, y: 80 }]
            },
            {
                menu: [{ x: 20, y: 50 }, { x: 80, y: 50 }],
                close: [{ x: 50, y: 50 }, { x: 50, y: 50 }] // Collapses to center
            },
            {
                menu: [{ x: 20, y: 70 }, { x: 80, y: 70 }],
                close: [{ x: 20, y: 80 }, { x: 80, y: 20 }]
            }
        ];

        // Deep copy initial state
        this.lines = JSON.parse(JSON.stringify(this.initialLines));

        this.draggedPoint = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEvents();
        this.updateOutput();
    }

    reset() {
        // Reset to initial state
        this.lines = JSON.parse(JSON.stringify(this.initialLines));
        this.render();
        this.updateOutput();
    }

    setMode(mode) {
        this.mode = mode;
        this.render();
    }

    render() {
        // Clear controls
        this.controlsLayer.innerHTML = '';
        this.activeLayer.innerHTML = '';
        this.ghostLayer.innerHTML = '';

        this.lines.forEach((line, index) => {
            const activePoints = line[this.mode];
            const ghostPoints = line[this.mode === 'menu' ? 'close' : 'menu'];

            // Draw Ghost Path (Reference)
            const ghostPath = document.createElementNS(SVG_NS, 'path');
            ghostPath.setAttribute('d', `M ${ghostPoints[0].x} ${ghostPoints[0].y} L ${ghostPoints[1].x} ${ghostPoints[1].y}`);
            ghostPath.classList.add('ghost-path');
            this.ghostLayer.appendChild(ghostPath);

            // Draw Active Path
            const activePath = document.createElementNS(SVG_NS, 'path');
            activePath.setAttribute('d', `M ${activePoints[0].x} ${activePoints[0].y} L ${activePoints[1].x} ${activePoints[1].y}`);
            activePath.classList.add('editor-path');
            this.activeLayer.appendChild(activePath);

            // Draw Controls for Active Path
            activePoints.forEach((point, pointIndex) => {
                const circle = document.createElementNS(SVG_NS, 'circle');
                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r', 6);
                circle.classList.add('control-point');
                circle.dataset.lineIndex = index;
                circle.dataset.pointIndex = pointIndex;
                this.controlsLayer.appendChild(circle);
            });
        });
    }

    attachEvents() {
        // Mouse Down (Start Drag)
        this.svg.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('control-point')) {
                const lineIndex = parseInt(e.target.dataset.lineIndex);
                const pointIndex = parseInt(e.target.dataset.pointIndex);
                const currentPoint = this.lines[lineIndex][this.mode][pointIndex];

                this.draggedPoint = {
                    lineIndex,
                    pointIndex,
                    el: e.target,
                    originX: currentPoint.x,
                    originY: currentPoint.y
                };
            }
        });

        // Mouse Move (Dragging)
        window.addEventListener('mousemove', (e) => {
            if (!this.draggedPoint) return;

            const pt = this.getSVGPoint(e);
            let x = pt.x;
            let y = pt.y;

            // Shift Key: Axis Lock
            if (e.shiftKey) {
                const dx = Math.abs(x - this.draggedPoint.originX);
                const dy = Math.abs(y - this.draggedPoint.originY);

                if (dx > dy) {
                    y = this.draggedPoint.originY; // Lock Y (Horizontal movement)
                } else {
                    x = this.draggedPoint.originX; // Lock X (Vertical movement)
                }
            }

            // Grid Snap (5px)
            x = Math.round(x / 5) * 5;
            y = Math.round(y / 5) * 5;

            // Update State
            this.lines[this.draggedPoint.lineIndex][this.mode][this.draggedPoint.pointIndex] = { x, y };

            // Update UI
            this.render();
            this.updateOutput();
        });

        // Mouse Up (End Drag)
        window.addEventListener('mouseup', () => {
            this.draggedPoint = null;
        });
    }

    getSVGPoint(event) {
        const pt = this.svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }

    setMethod(method) {
        this.generationMethod = method;
        this.updateOutput();
    }

    updateOutput() {
        const { html, css, js } = generateCode(this.lines, this.generationMethod);

        // Update Preview
        this.previewContainer.innerHTML = html;
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        this.previewContainer.appendChild(styleEl);

        // For preview interaction in Class mode, we need to add the event listener
        if (this.generationMethod === 'class') {
            const menu = this.previewContainer.querySelector('.hamburger-menu');
            if (menu) {
                menu.addEventListener('click', () => {
                    menu.classList.toggle('is-active');
                });
            }
        }

        // Update Code Display
        let code = `<style>\n${css}\n</style>\n\n${html}`;
        if (js) {
            code += `\n\n<script>\n${js}\n</script>`;
        }
        this.codeDisplay.textContent = code;
    }
}
