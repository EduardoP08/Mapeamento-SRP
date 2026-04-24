class Table {
    constructor(type, x, y, width, height, radius, angle, color, name, seats, nameColor = '#000000', cornerSeats = true, seatColor = '#dddddd', counterEnabled = true, fontSize = 24) {
        this.type = type; // 'square' or 'round' or 'seat'
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
    }

    draw(ctx, isSelected = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = isSelected ? '#000' : '#8a8a8a';
        ctx.lineWidth = 2;

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
        }

        ctx.restore();

        // Draw name without rotation, centered on the item
        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `${this.fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.name, this.x, this.y);
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
        const sidesOrder = this.cornerSeats ? [0, 1, 2, 3] : [0, 1]; // top, bottom, left, right

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

        // Top side
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

        // Bottom side
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

        // Left side
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

        // Right side
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

        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.rotation);
            ctx.fillStyle = this.seatColor;
            ctx.fillRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.strokeRect(-seatWidth / 2, -seatDepth / 2, seatWidth, seatDepth);
            ctx.restore();
        }
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
        const dx = x - this.x;
        const dy = y - this.y;
        const cos = Math.cos(-this.angle * Math.PI / 180);
        const sin = Math.sin(-this.angle * Math.PI / 180);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        if (this.type === 'square' || this.type === 'seat') {
            return Math.abs(rx) <= this.width / 2 && Math.abs(ry) <= this.height / 2;
        } else if (this.type === 'round' || this.type === 'roundSeat') {
            return rx * rx + ry * ry <= this.radius * this.radius;
        }
        return false;
    }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sidebar = document.getElementById('sidebar');
const drawer = document.getElementById('drawer');
const toggleDrawerBtn = document.getElementById('toggleDrawer');
const selectModeBtn = document.getElementById('selectMode');
const deleteModeBtn = document.getElementById('deleteMode');
const deleteAllBtn = document.getElementById('deleteAll');
const seatCounter = document.getElementById('seatCounter');
const fileMenuBtn = document.getElementById('fileMenuBtn');
const fileMenuOverlay = document.getElementById('fileMenuOverlay');
const saveJsonBtn = document.getElementById('saveJson');
const loadJsonBtn = document.getElementById('loadJson');
const downloadPngBtn = document.getElementById('downloadPng');
const closeFileMenuBtn = document.getElementById('closeFileMenu');
const fileInput = document.getElementById('fileInput');
const nameInput = document.getElementById('name');
const fontSizeInput = document.getElementById('fontSize');
const widthLabel = document.querySelector('label[for="width"]');
const widthInput = document.getElementById('width');
const heightLabel = document.querySelector('label[for="height"]');
const heightInput = document.getElementById('height');
const radiusLabel = document.querySelector('label[for="radius"]');
const radiusInput = document.getElementById('radius');
const angleInput = document.getElementById('angle');
const angleNumberInput = document.getElementById('angleInput');
const colorInput = document.getElementById('color');
const nameColorInput = document.getElementById('nameColor');
const seatColorInput = document.getElementById('seatColor');
const counterEnabledInput = document.getElementById('counterEnabled');
const counterEnabledLabel = document.getElementById('counterEnabledLabel');
const cornerSeatsInput = document.getElementById('cornerSeats');
const cornerSeatsLabel = document.querySelector('label[for="cornerSeats"]');
const seatsInput = document.getElementById('seats');
const seatColorLabel = document.querySelector('label[for="seatColor"]');
const seatWarning = document.getElementById('seatWarning');
const duplicateBtn = document.getElementById('duplicate');
const deleteBtn = document.getElementById('delete');
const addSquareBtn = document.getElementById('addSquare');
const addRoundBtn = document.getElementById('addRound');
const addSeatBtn = document.getElementById('addSeat');
const addRoundSeatBtn = document.getElementById('addRoundSeat');

let tables = [];
let selectedTable = null;
let mode = 'select'; // 'select', 'delete'
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let nextTableNumber = 1;
let alignmentLine = null;

function serializeLayout() {
    return JSON.stringify({
        nextTableNumber,
        tables: tables.map(table => ({
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
            fontSize: table.fontSize
        }))
    }, null, 2);
}

function deserializeLayout(json) {
    try {
        const data = JSON.parse(json);
        if (!Array.isArray(data.tables)) {
            throw new Error('Arquivo inválido');
        }
        tables = data.tables.map(item => new Table(
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
            item.fontSize
        ));
        nextTableNumber = typeof data.nextTableNumber === 'number' ? data.nextTableNumber : 1;
        if (nextTableNumber <= 1) {
            let maxNumeric = 0;
            tables.forEach(table => {
                const num = parseInt(table.name, 10);
                if (!isNaN(num) && num > maxNumeric) maxNumeric = num;
            });
            nextTableNumber = maxNumeric + 1;
        }
        selectedTable = null;
        sidebar.classList.remove('show');
        draw();
    } catch (err) {
        alert('Falha ao carregar arquivo: ' + err.message);
    }
}

function openFileMenu() {
    fileMenuOverlay.classList.add('show');
}

function closeFileMenu() {
    fileMenuOverlay.classList.remove('show');
}

function downloadJson() {
    const blob = new Blob([serializeLayout()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'layout.json';
    link.click();
    URL.revokeObjectURL(link.href);
}

function downloadCanvasPng() {
    const link = document.createElement('a');
    link.download = 'layout.png';
    link.href = canvas.toDataURL();
    link.click();
}

function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        deserializeLayout(reader.result);
        fileInput.value = '';
        closeFileMenu();
    };
    reader.readAsText(file);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50;
    draw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tables.forEach(table => table.draw(ctx, table === selectedTable));
    
    // Draw alignment line
    if (alignmentLine) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(alignmentLine.x1, alignmentLine.y1);
        ctx.lineTo(alignmentLine.x2, alignmentLine.y2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    updateSeatCounter();
}

function updateSeatCounter() {
    const totalSeats = tables.reduce((sum, table) => {
        if ((table.type === 'seat' || table.type === 'roundSeat') && !table.counterEnabled) {
            return sum;
        }
        return sum + table.seats;
    }, 0);
    seatCounter.textContent = `Assentos: ${totalSeats}`;
}

function getItemDetails() {
    let squareCount = 0;
    let roundCount = 0;
    let seatEnabledCount = 0;
    let seatDisabledCount = 0;
    let roundSeatEnabledCount = 0;
    let roundSeatDisabledCount = 0;

    tables.forEach(table => {
        if (table.type === 'square') {
            squareCount++;
        } else if (table.type === 'round') {
            roundCount++;
        } else if (table.type === 'seat') {
            if (table.counterEnabled) {
                seatEnabledCount++;
            } else {
                seatDisabledCount++;
            }
        } else if (table.type === 'roundSeat') {
            if (table.counterEnabled) {
                roundSeatEnabledCount++;
            } else {
                roundSeatDisabledCount++;
            }
        }
    });

    return { squareCount, roundCount, seatEnabledCount, seatDisabledCount, roundSeatEnabledCount, roundSeatDisabledCount };
}

function updateSizeFieldsVisibility(table) {
    if (!table) {
        widthLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightLabel.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'none';
        radiusInput.style.display = 'none';
        cornerSeatsLabel.style.display = 'none';
        return;
    }

    if (table.type === 'square' || table.type === 'seat') {
        widthLabel.style.display = 'block';
        widthInput.style.display = 'block';
        heightLabel.style.display = 'block';
        heightInput.style.display = 'block';
        radiusLabel.style.display = 'none';
        radiusInput.style.display = 'none';
        cornerSeatsLabel.style.display = table.type === 'square' ? 'block' : 'none';
        counterEnabledLabel.style.display = table.type === 'seat' ? 'block' : 'none';
        seatColorLabel.style.display = table.type === 'seat' ? 'none' : 'block';
        seatColorInput.style.display = table.type === 'seat' ? 'none' : 'block';
        updateMaxSeats(table);
    } else if (table.type === 'round' || table.type === 'roundSeat') {
        widthLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightLabel.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'block';
        radiusInput.style.display = 'block';
        cornerSeatsLabel.style.display = 'none';
        counterEnabledLabel.style.display = table.type === 'roundSeat' ? 'block' : 'none';
        seatColorLabel.style.display = table.type === 'roundSeat' ? 'none' : 'block';
        seatColorInput.style.display = table.type === 'roundSeat' ? 'none' : 'block';
        updateMaxSeats(table);
    } else {
        widthLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightLabel.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'block';
        radiusInput.style.display = 'block';
        cornerSeatsLabel.style.display = 'none';
        counterEnabledLabel.style.display = 'none';
        seatColorLabel.style.display = 'block';
        seatColorInput.style.display = 'block';
        updateMaxSeats(table);
    }
}

function updateMaxSeats(table) {
    if (table.type === 'square') {
        const widthSeats = Math.floor(table.width / 50);
        const heightSeats = Math.floor(table.height / 50);
        let maxSeats;
        if (table.cornerSeats) {
            maxSeats = 2 * widthSeats + 2 * heightSeats;
        } else {
            maxSeats = 2 * widthSeats; // Apenas top e bottom
        }
        seatsInput.max = maxSeats;
        seatsInput.min = 0;
        if (table.seats > maxSeats) {
            table.seats = maxSeats;
            seatsInput.value = maxSeats;
        }
    } else if (table.type === 'round') {
        const circumference = 2 * Math.PI * table.radius;
        const maxSeats = Math.round(circumference / 60);
        seatsInput.max = maxSeats;
        seatsInput.min = 0;
        if (table.seats > maxSeats) {
            table.seats = maxSeats;
            seatsInput.value = maxSeats;
        }
    } else if (table.type === 'seat' || table.type === 'roundSeat') {
        seatsInput.removeAttribute('max');
        seatsInput.min = 0;
    }
}

function selectTable(table) {
    selectedTable = table;
    if (table) {
        sidebar.classList.add('show');
        nameInput.value = table.name;
        widthInput.value = table.width;
        heightInput.value = table.height;
        radiusInput.value = table.radius;
        angleInput.value = table.angle;
        angleNumberInput.value = table.angle;
        colorInput.value = table.color;
        nameColorInput.value = table.nameColor;
        seatColorInput.value = table.seatColor;
        fontSizeInput.value = table.fontSize;
        counterEnabledInput.checked = table.counterEnabled !== false;
        cornerSeatsInput.checked = table.cornerSeats;
        seatsInput.value = table.seats;
        updateSizeFieldsVisibility(table);
        updateSeatWarning(table);
    } else {
        sidebar.classList.remove('show');
        updateSizeFieldsVisibility(null);
        updateSeatWarning(null);
    }
}

function updateSeatWarning(table) {
    if (!table || table.type !== 'square' || table.seats <= 8) {
        seatWarning.style.display = 'none';
        return;
    }
    seatWarning.style.display = 'block';
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (mode === 'select') {
        let found = false;
        for (let table of tables) {
            if (table.isPointInside(x, y)) {
                selectedTable = table;
                isDragging = true;
                dragOffsetX = x - table.x;
                dragOffsetY = y - table.y;
                selectTable(table);
                found = true;
                break;
            }
        }
        if (!found) {
            selectTable(null);
        }
        draw();
    } else if (mode === 'delete') {
        for (let i = tables.length - 1; i >= 0; i--) {
            if (tables[i].isPointInside(x, y)) {
                tables.splice(i, 1);
                draw();
                break;
            }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && selectedTable) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let newX = x - dragOffsetX;
        let newY = y - dragOffsetY;
        
        // Check for alignment
        alignmentLine = null;
        for (let table of tables) {
            if (table === selectedTable) continue;
            
            // Vertical alignment (same x)
            if (Math.abs(newX - table.x) <= 5) {
                newX = table.x;
                alignmentLine = { x1: newX, y1: Math.min(newY, table.y), x2: newX, y2: Math.max(newY, table.y) };
                break; // Prioritize vertical
            }
            
            // Horizontal alignment (same y)
            if (Math.abs(newY - table.y) <= 5) {
                newY = table.y;
                alignmentLine = { x1: Math.min(newX, table.x), y1: newY, x2: Math.max(newX, table.x), y2: newY };
                break; // Prioritize horizontal if no vertical
            }
        }
        
        selectedTable.x = newX;
        selectedTable.y = newY;
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    alignmentLine = null;
    draw();
});

toggleDrawerBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
});

selectModeBtn.addEventListener('click', () => {
    mode = 'select';
    canvas.style.cursor = 'crosshair';
});

deleteModeBtn.addEventListener('click', () => {
    mode = 'delete';
    canvas.style.cursor = 'pointer';
});

deleteAllBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir todas as mesas?')) {
        tables = [];
        selectedTable = null;
        sidebar.classList.remove('show');
        draw();
    }
});

fileMenuBtn.addEventListener('click', () => {
    openFileMenu();
});

saveJsonBtn.addEventListener('click', () => {
    downloadJson();
});

loadJsonBtn.addEventListener('click', () => {
    fileInput.click();
});

downloadPngBtn.addEventListener('click', () => {
    downloadCanvasPng();
});

closeFileMenuBtn.addEventListener('click', () => {
    closeFileMenu();
});

fileInput.addEventListener('change', handleFileInputChange);

fileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === fileMenuOverlay) {
        closeFileMenu();
    }
});

nameInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.name = nameInput.value;
        draw();
    }
});

fontSizeInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.fontSize = parseInt(fontSizeInput.value);
        draw();
    }
});

widthInput.addEventListener('input', () => {
    if (selectedTable && (selectedTable.type === 'square' || selectedTable.type === 'seat')) {
        selectedTable.width = parseInt(widthInput.value);
        updateMaxSeats(selectedTable);
        updateSeatWarning(selectedTable);
        draw();
    }
});

heightInput.addEventListener('input', () => {
    if (selectedTable && (selectedTable.type === 'square' || selectedTable.type === 'seat')) {
        selectedTable.height = parseInt(heightInput.value);
        updateMaxSeats(selectedTable);
        updateSeatWarning(selectedTable);
        draw();
    }
});

radiusInput.addEventListener('input', () => {
    if (selectedTable && (selectedTable.type === 'round' || selectedTable.type === 'roundSeat')) {
        selectedTable.radius = parseInt(radiusInput.value);
        updateMaxSeats(selectedTable);
        draw();
    }
});

angleInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.angle = parseInt(angleInput.value);
        angleNumberInput.value = angleInput.value;
        draw();
    }
});

angleNumberInput.addEventListener('input', () => {
    if (selectedTable) {
        let value = parseInt(angleNumberInput.value);
        if (isNaN(value)) value = 0;
        if (value < 0) value = 0;
        if (value > 360) value = 360;
        selectedTable.angle = value;
        angleInput.value = value;
        angleNumberInput.value = value;
        draw();
    }
});

colorInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.color = colorInput.value;
        draw();
    }
});

nameColorInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.nameColor = nameColorInput.value;
        draw();
    }
});

seatColorInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.seatColor = seatColorInput.value;
        draw();
    }
});

counterEnabledInput.addEventListener('change', () => {
    if (selectedTable) {
        selectedTable.counterEnabled = counterEnabledInput.checked;
        draw();
    }
});

seatsInput.addEventListener('input', () => {
    if (selectedTable) {
        selectedTable.seats = parseInt(seatsInput.value);
        updateSeatWarning(selectedTable);
        draw();
    }
});

cornerSeatsInput.addEventListener('change', () => {
    if (selectedTable) {
        selectedTable.cornerSeats = cornerSeatsInput.checked;
        updateMaxSeats(selectedTable);
        updateSeatWarning(selectedTable);
        draw();
    }
});

duplicateBtn.addEventListener('click', () => {
    if (selectedTable) {
        const newName = (selectedTable.type === 'seat' || selectedTable.type === 'roundSeat') ? selectedTable.name : String(nextTableNumber++);
        const newTable = new Table(
            selectedTable.type,
            selectedTable.x + 50,
            selectedTable.y + 50,
            selectedTable.width,
            selectedTable.height,
            selectedTable.radius,
            selectedTable.angle,
            selectedTable.color,
            newName,
            selectedTable.seats,
            selectedTable.nameColor,
            selectedTable.cornerSeats,
            selectedTable.seatColor,
            selectedTable.counterEnabled,
            selectedTable.fontSize
        );
        tables.push(newTable);
        selectTable(newTable);
        draw();
    }
});

deleteBtn.addEventListener('click', () => {
    if (selectedTable) {
        const index = tables.indexOf(selectedTable);
        if (index > -1) {
            tables.splice(index, 1);
        }
        selectTable(null);
        draw();
    }
});

addSquareBtn.addEventListener('click', () => {
    const table = new Table('square', canvas.width / 2, canvas.height / 2, 150, 150, 0, 0, '#a3a3a3', String(nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    tables.push(table);
    selectTable(table);
    draw();
});

addRoundBtn.addEventListener('click', () => {
    const table = new Table('round', canvas.width / 2, canvas.height / 2, 0, 0, 60, 0, '#a3a3a3', String(nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    tables.push(table);
    selectTable(table);
    draw();
});

addSeatBtn.addEventListener('click', () => {
    const seat = new Table('seat', canvas.width / 2, canvas.height / 2, 40, 40, 0, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    tables.push(seat);
    selectTable(seat);
    draw();
});

addRoundSeatBtn.addEventListener('click', () => {
    const roundSeat = new Table('roundSeat', canvas.width / 2, canvas.height / 2, 0, 0, 20, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    tables.push(roundSeat);
    selectTable(roundSeat);
    draw();
});

// Tooltip for item counter details
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.background = 'white';
tooltip.style.border = '1px solid black';
tooltip.style.padding = '5px';
tooltip.style.display = 'none';
tooltip.style.pointerEvents = 'none';
tooltip.style.zIndex = '1000';
document.body.appendChild(tooltip);

seatCounter.addEventListener('mouseover', (e) => {
    const details = getItemDetails();
    tooltip.innerHTML = `
        <strong>Quantidade de Itens:</strong><br>
        Mesas Quadradas: ${details.squareCount}<br>
        Mesas Redondas: ${details.roundCount}<br>
        Acentos (habilitados): ${details.seatEnabledCount}<br>
        Acentos (desabilitados): ${details.seatDisabledCount}<br>
        Acentos Redondos (habilitados): ${details.roundSeatEnabledCount}<br>
        Acentos Redondos (desabilitados): ${details.roundSeatDisabledCount}
    `;
    const rect = seatCounter.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.display = 'block';
});

seatCounter.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
});

draw();