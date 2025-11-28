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

        // Initial State (Standard Hamburger -> Cross)
        this.lines = [
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

        this.draggedPoint = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEvents();
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
                this.draggedPoint = {
                    lineIndex: parseInt(e.target.dataset.lineIndex),
                    pointIndex: parseInt(e.target.dataset.pointIndex),
                    el: e.target
                };
            }
        });

        // Mouse Move (Dragging)
        window.addEventListener('mousemove', (e) => {
            if (!this.draggedPoint) return;

            const pt = this.getSVGPoint(e);
            // Snap to grid (optional, let's do 1px snap for now or 5px)
            // pt.x = Math.round(pt.x / 5) * 5;
            // pt.y = Math.round(pt.y / 5) * 5;

            // Update State
            this.lines[this.draggedPoint.lineIndex][this.mode][this.draggedPoint.pointIndex] = { x: pt.x, y: pt.y };

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

    updateOutput() {
        const { html, css } = generateCode(this.lines);

        // Update Preview
        this.previewContainer.innerHTML = html;
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        this.previewContainer.appendChild(styleEl);

        // Update Code Display
        this.codeDisplay.textContent = `<style>\n${css}\n</style>\n\n${html}`;
    }
}
