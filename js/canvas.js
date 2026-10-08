import { canvas, ctx } from './dom.js';
import { state } from './state.js';
import { updateSeatCounter } from './layout.js';

export const backgroundImage = new Image();
backgroundImage.src = 'images/plantaBaixa.png';

export function updateBackgroundImage() {
    backgroundImage.src = state.showPlantMeasures
        ? 'images/plantaBaixa.png'
        : 'images/plantaBaixaSemMedidas.png';
}
backgroundImage.onload = () => resizeCanvas();

export function resizeCanvas() {
    const navbar = document.querySelector('.navbar');
    const top = navbar ? navbar.getBoundingClientRect().bottom : 60;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight - top);

    document.documentElement.style.setProperty('--navbar-height', `${top}px`);
    canvas.style.top = `${top}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
    draw();
}

window.addEventListener('resize', resizeCanvas);

function drawTableMeasure(table, targetCtx = ctx) {
    const width = table.width || table.diameter || 0;
    const height = table.height || table.diameter || 0;
    if (!width || !height) return;
    const isRound = table.type === 'round' || table.type === 'roundSeat' || table.type === 'customCircleArea' || table.type === 'customSemiCircleArea';
    const measureText = isRound ? `Ø ${width} cm` : `${width} x ${height} cm`;

    let textY = table.y;
    if (table.type === 'customSemiCircleArea') {
        const offset = (4 * (table.diameter / 2)) / (3 * Math.PI);
        const angleRad = table.angle * Math.PI / 180;
        textY -= offset * Math.cos(angleRad);
    }

    targetCtx.save();
    targetCtx.fillStyle = '#111';
    targetCtx.font = '14px Arial';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'top';
    targetCtx.fillText(measureText, table.x, textY + (table.fontSize || 0) / 2 + 8);
    targetCtx.restore();
}

function drawScene(targetCtx, targetWidth, targetHeight, { scale, offsetX, offsetY, includeOverlays }) {
    targetCtx.save();
    targetCtx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
        targetCtx.drawImage(backgroundImage, 0, 0);
    }

    if (state.showGrid) {
        targetCtx.strokeStyle = 'rgba(90, 90, 90, 0.2)';
        targetCtx.lineWidth = 1 / scale;
        for (let x = 0; x <= targetWidth / scale; x += 50) {
            targetCtx.beginPath();
            targetCtx.moveTo(x, 0);
            targetCtx.lineTo(x, targetHeight / scale);
            targetCtx.stroke();
        }
        for (let y = 0; y <= targetHeight / scale; y += 50) {
            targetCtx.beginPath();
            targetCtx.moveTo(0, y);
            targetCtx.lineTo(targetWidth / scale, y);
            targetCtx.stroke();
        }
    }
    
    // Desenhar em camadas: (fundo) áreas customizadas → mesas → assentos → etiquetas (frente)
    // Camada 1: Áreas customizadas
    state.tables.filter(t => t.type === 'customArea' || t.type === 'customCircleArea' || t.type === 'customSemiCircleArea')
        .forEach(table => table.draw(targetCtx, includeOverlays && table === state.selectedTable, includeOverlays && table === state.hoveredTable));
    
    // Camada 2: Mesas
    state.tables.filter(t => t.type === 'square' || t.type === 'round')
        .forEach(table => table.draw(targetCtx, includeOverlays && table === state.selectedTable, includeOverlays && table === state.hoveredTable));
    
    // Camada 3: Assentos
    state.tables.filter(t => t.type === 'seat' || t.type === 'roundSeat')
        .forEach(table => table.draw(targetCtx, includeOverlays && table === state.selectedTable, includeOverlays && table === state.hoveredTable));
    
    // Camada 4: Etiquetas
    state.tables.filter(t => t.type === 'flowArrow')
        .forEach(table => table.draw(targetCtx, includeOverlays && table === state.selectedTable, includeOverlays && table === state.hoveredTable));

    state.tables.filter(t => t.type === 'label')
        .forEach(table => {
            targetCtx.save();
            targetCtx.translate(table.x, table.y);
            targetCtx.rotate(table.angle * Math.PI / 180);
            targetCtx.fillStyle = table.nameColor;
            targetCtx.font = `${table.fontSize}px Arial`;
            targetCtx.textAlign = 'center';
            targetCtx.textBaseline = 'middle';
            targetCtx.fillText(table.name, 0, 0);
            if (includeOverlays && table === state.selectedTable) {
                targetCtx.strokeStyle = '#000';
                targetCtx.lineWidth = 4;
                const textWidth = table.name.length * (table.fontSize * 0.6);
                const textHeight = table.fontSize;
                targetCtx.strokeRect(-textWidth / 2 - 10, -textHeight / 2 - 5, textWidth + 20, textHeight + 10);
            }
            targetCtx.restore();
        });

    if (state.showMeasures) {
        state.tables
            .filter(table => table.type !== 'label')
            .forEach(table => drawTableMeasure(table, targetCtx));
    }

    if (includeOverlays && state.alignmentLine) {
        targetCtx.strokeStyle = '#00a2ff';
        targetCtx.globalAlpha = 0.95;
        targetCtx.lineWidth = 2 / scale;
        targetCtx.setLineDash([8 / scale, 6 / scale]);
        const alignmentLines = Array.isArray(state.alignmentLine)
            ? state.alignmentLine
            : [state.alignmentLine];
        alignmentLines.forEach(line => {
            targetCtx.beginPath();
            targetCtx.moveTo(line.x1, line.y1);
            targetCtx.lineTo(line.x2, line.y2);
            targetCtx.stroke();
        });
        targetCtx.setLineDash([]);
        targetCtx.globalAlpha = 1;
    }
    if (includeOverlays && state.multiSelectionRect) {
        const selection = state.multiSelectionRect;
        targetCtx.strokeStyle = '#1976d2';
        targetCtx.fillStyle = 'rgba(25, 118, 210, 0.12)';
        targetCtx.lineWidth = 2 / scale;
        targetCtx.setLineDash([8 / scale, 5 / scale]);
        targetCtx.fillRect(selection.x, selection.y, selection.width, selection.height);
        targetCtx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        targetCtx.setLineDash([]);
    }
    targetCtx.restore();
}

export function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScene(ctx, canvas.width, canvas.height, {
        scale: state.canvasScale,
        offsetX: state.canvasOffsetX,
        offsetY: state.canvasOffsetY,
        includeOverlays: true
    });
    updateSeatCounter();
}

export function createExportCanvas() {
    const backgroundWidth = backgroundImage.naturalWidth || canvas.width;
    const backgroundHeight = backgroundImage.naturalHeight || canvas.height;
    const bounds = { left: 0, top: 0, right: backgroundWidth, bottom: backgroundHeight };

    state.tables.forEach(table => {
        let halfWidth = table.width ? table.width / 2 : (table.diameter || 0) / 2;
        let halfHeight = table.height ? table.height / 2 : (table.diameter || 0) / 2;
        if (table.type === 'label') {
            halfWidth = Math.max(halfWidth, (String(table.name || '').length * (table.fontSize || 0) * 0.6 + 20) / 2);
            halfHeight = Math.max(halfHeight, ((table.fontSize || 0) + 10) / 2);
        }
        const angle = (table.angle || 0) * Math.PI / 180;
        const rotatedWidth = Math.abs(Math.cos(angle) * halfWidth) + Math.abs(Math.sin(angle) * halfHeight);
        const rotatedHeight = Math.abs(Math.sin(angle) * halfWidth) + Math.abs(Math.cos(angle) * halfHeight);
        const margin = Math.max(60, (table.fontSize || 0) + 20);
        bounds.left = Math.min(bounds.left, table.x - rotatedWidth - margin);
        bounds.top = Math.min(bounds.top, table.y - rotatedHeight - margin);
        bounds.right = Math.max(bounds.right, table.x + rotatedWidth + margin);
        bounds.bottom = Math.max(bounds.bottom, table.y + rotatedHeight + margin);
    });

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.max(1, Math.ceil(bounds.right - bounds.left));
    exportCanvas.height = Math.max(1, Math.ceil(bounds.bottom - bounds.top));
    drawScene(exportCanvas.getContext('2d'), exportCanvas.width, exportCanvas.height, {
        scale: 1,
        offsetX: -bounds.left,
        offsetY: -bounds.top,
        includeOverlays: false
    });
    return exportCanvas;
}

export function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - state.canvasOffsetX) / state.canvasScale,
        y: (event.clientY - rect.top - state.canvasOffsetY) / state.canvasScale
    };
}
