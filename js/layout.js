import { state } from './state.js';
import { Table } from './table.js';
import { seatCounter } from './dom.js';

export function serializeLayout() {
    return JSON.stringify({
        nextTableNumber: state.nextTableNumber,
        tables: state.tables.map(table => ({
            type: table.type,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            radius: table.radius,
            angle: table.angle,
            color: table.color,
            name: table.name,
            seats: table.seats,
            nameColor: table.nameColor,
            cornerSeats: table.cornerSeats,
            seatColor: table.seatColor,
            counterEnabled: table.counterEnabled,
            fontSize: table.fontSize,
            isHalfCircle: table.isHalfCircle,
            groupId: table.groupId || null
        }))
    }, null, 2);
}

export function deserializeLayout(json) {
    const data = JSON.parse(json);
    if (!Array.isArray(data.tables)) {
        throw new Error('Arquivo inválido');
    }

    state.tables = data.tables.map(item => {
        const table = new Table(
            item.type,
            item.x,
            item.y,
            item.width,
            item.height,
            item.radius,
            item.angle,
            item.color,
            item.name,
            item.seats,
            item.nameColor,
            item.cornerSeats,
            item.seatColor,
            item.counterEnabled,
            item.fontSize,
            item.isHalfCircle
        );
        if (item.groupId) table.groupId = item.groupId;
        return table;
    });

    state.nextTableNumber = typeof data.nextTableNumber === 'number' ? data.nextTableNumber : 1;
    if (state.nextTableNumber <= 1) {
        let maxNumeric = 0;
        state.tables.forEach(table => {
            const num = parseInt(table.name, 10);
            if (!isNaN(num) && num > maxNumeric) {
                maxNumeric = num;
            }
        });
        state.nextTableNumber = maxNumeric + 1;
    }

    state.selectedTable = null;
    return true;
}

export function updateSeatCounter() {
    const totalSeats = state.tables.reduce((sum, table) => {
        if ((table.type === 'seat' || table.type === 'roundSeat') && !table.counterEnabled) {
            return sum;
        }
        return sum + table.seats;
    }, 0);
    seatCounter.textContent = `Assentos: ${totalSeats}`;
}

export function getItemDetails() {
    const details = {
        squareCount: 0,
        roundCount: 0,
        seatEnabledCount: 0,
        seatDisabledCount: 0,
        roundSeatEnabledCount: 0,
        roundSeatDisabledCount: 0
    };

    state.tables.forEach(table => {
        if (table.type === 'square') {
            details.squareCount++;
        } else if (table.type === 'round') {
            details.roundCount++;
        } else if (table.type === 'seat') {
            if (table.counterEnabled) {
                details.seatEnabledCount++;
            } else {
                details.seatDisabledCount++;
            }
        } else if (table.type === 'roundSeat') {
            if (table.counterEnabled) {
                details.roundSeatEnabledCount++;
            } else {
                details.roundSeatDisabledCount++;
            }
        }
    });

    return details;
}
