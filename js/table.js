function hexToRgba(hex, alpha) {
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(ch => ch + ch).join('');
    }
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class Table {
    constructor(type, x, y, width, height, radius, angle, color, name, seats, nameColor = '#000000', cornerSeats = true, seatColor = '#dddddd', counterEnabled = true, fontSize = 24, isHalfCircle = false) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.radius = radius;
        this.angle = angle;
        this.color = color;
        this.name = name;
        this.seats = seats;
        this.nameColor = nameColor;
        this.cornerSeats = cornerSeats;
        this.seatColor = seatColor;
        this.counterEnabled = counterEnabled;
        this.fontSize = fontSize;
        this.isHalfCircle = isHalfCircle;
    }

    draw(ctx, isSelected = false, isHovered = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = isSelected ? '#000' : '#8a8a8a';
        ctx.lineWidth = isSelected || isHovered ? 4 : 2;

        if (this.type === 'square') {
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            this.drawSeatsSquare(ctx);
        } else if (this.type === 'round') {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            this.drawSeatsRound(ctx);
        } else if (this.type === 'seat') {
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else if (this.type === 'roundSeat') {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'customArea') {
            ctx.fillStyle = hexToRgba(this.color, 0.15);
            ctx.strokeStyle = this.color;
            ctx.setLineDash([10, 5]);
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.setLineDash([]);
        } else if (this.type === 'customCircleArea') {
            ctx.fillStyle = hexToRgba(this.color, 0.15);
            ctx.strokeStyle = this.color;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            if (this.isHalfCircle) {
                ctx.moveTo(-this.radius, 0);
                ctx.arc(0, 0, this.radius, Math.PI, 0, false);
                ctx.lineTo(-this.radius, 0);
                ctx.closePath();
            } else {
                ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            }
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (this.type === 'label') {
            // Labels são apenas texto, sem forma
            // Não precisa fazer nada aqui
        }

        ctx.restore();

        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `${this.fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let textX = this.x;
            let textY = this.y;
            if (this.type === 'customCircleArea' && this.isHalfCircle) {
                const offset = (4 * this.radius) / (3 * Math.PI);
                const angleRad = this.angle * Math.PI / 180;
                textX = this.x + offset * Math.sin(angleRad);
                textY = this.y - offset * Math.cos(angleRad);
            }

            ctx.fillText(this.name, textX, textY);
        }
    }

    drawSeatsSquare(ctx) {
        const seatWidth = 40;
        const seatDepth = 40;
        const offset = 10;
        const positions = [];

        const topBottomSeats = Math.floor(this.width / 50);
        const leftRightSeats = this.cornerSeats ? Math.floor(this.height / 50) : 0;
        const maxSeatsPerSide = [topBottomSeats, topBottomSeats, leftRightSeats, leftRightSeats];
        const sidesOrder = this.cornerSeats ? [0, 1, 2, 3] : [0, 1];

        const counts = [0, 0, 0, 0];
        let seatsToPlace = Math.min(this.seats, maxSeatsPerSide.reduce((sum, value) => sum + value, 0));
        let sideIndex = 0;
        let cyclesWithoutPlacement = 0;

        while (seatsToPlace > 0 && cyclesWithoutPlacement < sidesOrder.length) {
            const side = sidesOrder[sideIndex];
            if (counts[side] < maxSeatsPerSide[side]) {
                counts[side]++;
                seatsToPlace--;
                cyclesWithoutPlacement = 0;
            } else {
                cyclesWithoutPlacement++;
            }
            sideIndex = (sideIndex + 1) % sidesOrder.length;
        }

        const s = 50;
        const maxNTop = Math.floor((this.width - seatWidth) / s) + 1;
        const nTop = Math.min(counts[0], maxNTop);
        if (nTop > 0) {
            const totalWidth = (nTop - 1) * s + seatWidth;
            const leftX = -totalWidth / 2;
            for (let i = 0; i < nTop; i++) {
                const x = leftX + i * s + seatWidth / 2;
                const y = -this.height / 2 - offset - seatDepth / 2;
                positions.push({ x, y, rotation: 0 });
            }
        }

        const maxNBottom = Math.floor((this.width - seatWidth) / s) + 1;
        const nBottom = Math.min(counts[1], maxNBottom);
        if (nBottom > 0) {
            const totalWidth = (nBottom - 1) * s + seatWidth;
            const leftX = -totalWidth / 2;
            for (let i = 0; i < nBottom; i++) {
                const x = leftX + i * s + seatWidth / 2;
                const y = this.height / 2 + offset + seatDepth / 2;
                positions.push({ x, y, rotation: 0 });
            }
        }

        const maxNLeft = Math.floor((this.height - seatWidth) / s) + 1;
        const nLeft = Math.min(counts[2], maxNLeft);
        if (nLeft > 0) {
            const totalHeight = (nLeft - 1) * s + seatWidth;
            const leftY = -totalHeight / 2;
            for (let i = 0; i < nLeft; i++) {
                const x = -this.width / 2 - offset - seatDepth / 2;
                const y = leftY + i * s + seatWidth / 2;
                positions.push({ x, y, rotation: Math.PI / 2 });
            }
        }

        const maxNRight = Math.floor((this.height - seatWidth) / s) + 1;
        const nRight = Math.min(counts[3], maxNRight);
        if (nRight > 0) {
            const totalHeight = (nRight - 1) * s + seatWidth;
            const leftY = -totalHeight / 2;
            for (let i = nRight - 1; i >= 0; i--) {
                const x = this.width / 2 + offset + seatDepth / 2;
                const y = leftY + i * s + seatWidth / 2;
                positions.push({ x, y, rotation: Math.PI / 2 });
            }
        }

        positions.forEach(pos => {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.rotation);
            ctx.fillStyle = this.seatColor;
            ctx.fillRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.strokeRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.restore();
        });
    }

    drawSeatsRound(ctx) {
        const seatWidth = 40;
        const seatDepth = 40;
        const offset = 10;
        const angleStep = (2 * Math.PI) / this.seats;

        for (let i = 0; i < this.seats; i++) {
            const angle = i * angleStep;
            const distance = this.radius + offset + seatDepth / 2;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillStyle = this.seatColor;
            ctx.fillRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.strokeRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.restore();
        }
    }

    isPointInside(x, y) {
        // Para labels, apenas verifica se está próximo ao texto (20px de margem)
        if (this.type === 'label') {
            const textWidth = this.name.length * (this.fontSize * 0.6);
            const textHeight = this.fontSize;
            return Math.abs(x - this.x) <= textWidth / 2 + 20 && Math.abs(y - this.y) <= textHeight / 2 + 10;
        }

        const dx = x - this.x;
        const dy = y - this.y;
        const cos = Math.cos(-this.angle * Math.PI / 180);
        const sin = Math.sin(-this.angle * Math.PI / 180);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        if (this.type === 'square' || this.type === 'seat' || this.type === 'customArea') {
            return Math.abs(rx) <= this.width / 2 && Math.abs(ry) <= this.height / 2;
        }
        if (this.type === 'round' || this.type === 'roundSeat' || this.type === 'customCircleArea') {
            const insideCircle = rx * rx + ry * ry <= this.radius * this.radius;
            if (!insideCircle) {
                return false;
            }
            if (this.type === 'customCircleArea' && this.isHalfCircle) {
                return ry <= 0;
            }
            return true;
        }
        return false;
    }
}
