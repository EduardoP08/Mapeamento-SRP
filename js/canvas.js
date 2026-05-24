import { canvas, ctx } from './dom.js';
import { state } from './state.js';
import { updateSeatCounter } from './layout.js';

export const backgroundImage = new Image();
backgroundImage.src = 'images/plantaBaixa.png';
backgroundImage.onload = () => resizeCanvas();

export function resizeCanvas() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - 60;

    if (backgroundImage.complete && backgroundImage.naturalWidth) {
        canvas.width = Math.max(backgroundImage.naturalWidth, screenWidth);
        canvas.height = Math.max(backgroundImage.naturalHeight, screenHeight);
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    } else {
        canvas.width = screenWidth;
        canvas.height = screenHeight;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    }
    draw();
}

window.addEventListener('resize', resizeCanvas);

export function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(state.canvasScale, 0, 0, state.canvasScale, state.canvasOffsetX, state.canvasOffsetY);
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
        ctx.drawImage(backgroundImage, 0, 0);
    }
    
    // Desenhar em camadas: áreas customizadas (fundo) → mesas → assentos → etiquetas (frente)
    // Camada 1: Áreas customizadas
    state.tables.filter(t => t.type === 'customArea' || t.type === 'customCircleArea')
        .forEach(table => table.draw(ctx, table === state.selectedTable, table === state.hoveredTable));
    
    // Camada 2: Mesas
    state.tables.filter(t => t.type === 'square' || t.type === 'round')
        .forEach(table => table.draw(ctx, table === state.selectedTable, table === state.hoveredTable));
    
    // Camada 3: Assentos
    state.tables.filter(t => t.type === 'seat' || t.type === 'roundSeat')
        .forEach(table => table.draw(ctx, table === state.selectedTable, table === state.hoveredTable));
    
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
            if (table === state.selectedTable || isHovered) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                const textWidth = table.name.length * (table.fontSize * 0.6);
                const textHeight = table.fontSize;
                ctx.strokeRect(-textWidth / 2 - 10, -textHeight / 2 - 5, textWidth + 20, textHeight + 10);
            }
            ctx.restore();
        });

    if (state.alignmentLine) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(state.alignmentLine.x1, state.alignmentLine.y1);
        ctx.lineTo(state.alignmentLine.x2, state.alignmentLine.y2);
        ctx.stroke();
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
