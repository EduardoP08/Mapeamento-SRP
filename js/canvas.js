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

function drawTableMeasure(table) {
    const width = table.width || (table.radius ? table.radius * 2 : 0);
    const height = table.height || (table.radius ? table.radius * 2 : 0);
    if (!width || !height) return;
    const isRound = table.type === 'round' || table.type === 'roundSeat' || table.type === 'customCircleArea';
    const measureText = isRound ? `Ø ${width} cm` : `${width} x ${height} cm`;

    let textY = table.y;
    if (table.type === 'customCircleArea' && table.isHalfCircle) {
        const offset = (4 * table.radius) / (3 * Math.PI);
        const angleRad = table.angle * Math.PI / 180;
        textY -= offset * Math.cos(angleRad);
    }

    ctx.save();
    ctx.fillStyle = '#111';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(measureText, table.x, textY + (table.fontSize || 0) / 2 + 8);
    ctx.restore();
}

export function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(state.canvasScale, 0, 0, state.canvasScale, state.canvasOffsetX, state.canvasOffsetY);
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
        ctx.drawImage(backgroundImage, 0, 0);
    }

    if (state.showGrid) {
        ctx.strokeStyle = 'rgba(90, 90, 90, 0.2)';
        ctx.lineWidth = 1 / state.canvasScale;
        for (let x = 0; x <= canvas.width / state.canvasScale; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height / state.canvasScale);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height / state.canvasScale; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width / state.canvasScale, y);
            ctx.stroke();
        }
    }
    
    // Desenhar em camadas: áreas customizadas (fundo) → mesas → assentos → etiquetas (frente)
    // Camada 1: Áreas customizadas
    state.tables.filter(t => t.type === 'customArea' || t.type === 'customCircleArea')
        .forEach(table => table.draw(ctx, table === state.selectedTable || state.selectedTables.includes(table), table === state.hoveredTable));
    
    // Camada 2: Mesas
    state.tables.filter(t => t.type === 'square' || t.type === 'round')
        .forEach(table => table.draw(ctx, table === state.selectedTable || state.selectedTables.includes(table), table === state.hoveredTable));
    
    // Camada 3: Assentos
    state.tables.filter(t => t.type === 'seat' || t.type === 'roundSeat')
        .forEach(table => table.draw(ctx, table === state.selectedTable || state.selectedTables.includes(table), table === state.hoveredTable));
    
    // Camada 4: Etiquetas (frente)
    state.tables.filter(t => t.type === 'label')
        .forEach(table => {
            const isHovered = table === state.hoveredTable;
            ctx.save();
            ctx.translate(table.x, table.y);
            ctx.rotate(table.angle * Math.PI / 180);
            ctx.fillStyle = table.nameColor;
            ctx.font = `${table.fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(table.name, 0, 0);
            if (table === state.selectedTable || state.selectedTables.includes(table) || isHovered) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                const textWidth = table.name.length * (table.fontSize * 0.6);
                const textHeight = table.fontSize;
                ctx.strokeRect(-textWidth / 2 - 10, -textHeight / 2 - 5, textWidth + 20, textHeight + 10);
            }
            ctx.restore();
        });

    if (state.showMeasures) {
        state.tables
            .filter(table => table.type !== 'label')
            .forEach(drawTableMeasure);
    }

    if (state.alignmentLine) {
        ctx.strokeStyle = '#00a2ff';
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 2 / state.canvasScale;
        ctx.setLineDash([8 / state.canvasScale, 6 / state.canvasScale]);
        const alignmentLines = Array.isArray(state.alignmentLine)
            ? state.alignmentLine
            : [state.alignmentLine];
        alignmentLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
    if (state.multiSelectionRect) {
        const selection = state.multiSelectionRect;
        ctx.strokeStyle = '#1976d2';
        ctx.fillStyle = 'rgba(25, 118, 210, 0.12)';
        ctx.lineWidth = 2 / state.canvasScale;
        ctx.setLineDash([8 / state.canvasScale, 5 / state.canvasScale]);
        ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        ctx.setLineDash([]);
    }
    ctx.restore();
    updateSeatCounter();
}

export function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - state.canvasOffsetX) / state.canvasScale,
        y: (event.clientY - rect.top - state.canvasOffsetY) / state.canvasScale
    };
}
