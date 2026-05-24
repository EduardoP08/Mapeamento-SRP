import { state } from './state.js';
import { canvas, sidebar, drawer, toggleDrawerBtn, selectModeBtn, deleteModeBtn, deleteAllBtn, fileMenuBtn, fileMenuOverlay, saveJsonBtn, loadJsonBtn, downloadPngBtn, closeFileMenuBtn, fileInput, nameInput, zoomRange, zoomValue, loginBtn, userDisplay, userName, logoutBtn, authModal, closeAuthModal, loginTab, registerTab, loginForm, registerForm, loginSubmit, registerSubmit, googleLogin, loginError, registerError, saveCloudBtn, loadCloudBtn, cloudModal, closeCloudModal, cloudModalTitle, saveCloudForm, loadCloudList, mapNameInput, saveCloudSubmit, mapsList, cloudError, fontSizeInput, widthLabel, widthInput, heightLabel, heightInput, radiusLabel, radiusInput, angleInput, angleNumberInput, colorInput, colorLabel, nameColorInput, seatColorInput, counterEnabledInput, counterEnabledLabel, cornerSeatsInput, cornerSeatsLabel, seatsInput, seatsLabel, seatColorLabel, seatWarning, duplicateBtn, deleteBtn, addSquareBtn, addRoundBtn, addSeatBtn, addRoundSeatBtn, addCustomAreaBtn, addCustomCircleAreaBtn, addLabelBtn, halfCircleInput, halfCircleLabel, seatCounter } from './dom.js';
import { draw, getCanvasCoords } from './canvas.js';
import { serializeLayout, deserializeLayout, getItemDetails } from './layout.js';
import { loginUser, registerUser, loginWithGoogle, logoutUser } from './auth.js';
import { saveMapToCloud, loadMapsFromCloud } from './cloud.js';
import { Table } from './table.js';

const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.background = 'white';
tooltip.style.border = '1px solid black';
tooltip.style.padding = '5px';
tooltip.style.display = 'none';
tooltip.style.pointerEvents = 'none';
tooltip.style.zIndex = '1000';
document.body.appendChild(tooltip);

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
        try {
            deserializeLayout(reader.result);
            state.selectedTable = null;
            sidebar.classList.remove('show');
            draw();
        } catch (error) {
            alert('Falha ao carregar arquivo: ' + error.message);
        }
        fileInput.value = '';
        closeFileMenu();
    };
    reader.readAsText(file);
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

    if (table.type === 'label') {
        // Para labels, mostrar apenas: nome, fontSize, nameColor, angle
        widthLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightLabel.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'none';
        radiusInput.style.display = 'none';
        cornerSeatsLabel.style.display = 'none';
        counterEnabledLabel.style.display = 'none';
        seatColorLabel.style.display = 'none';
        seatColorInput.style.display = 'none';
        seatsLabel.style.display = 'none';
        seatsInput.style.display = 'none';
        halfCircleLabel.style.display = 'none';
        colorLabel.style.display = 'none';
        colorInput.style.display = 'none';
    } else if (table.type === 'square' || table.type === 'seat' || table.type === 'customArea') {
        widthLabel.style.display = 'block';
        widthInput.style.display = 'block';
        heightLabel.style.display = 'block';
        heightInput.style.display = 'block';
        radiusLabel.style.display = 'none';
        radiusInput.style.display = 'none';
        cornerSeatsLabel.style.display = table.type === 'square' ? 'block' : 'none';
        counterEnabledLabel.style.display = table.type === 'seat' ? 'block' : 'none';
        seatColorLabel.style.display = table.type === 'square' ? 'block' : 'none';
        seatColorInput.style.display = table.type === 'square' ? 'block' : 'none';
        seatsLabel.style.display = (table.type === 'square' || table.type === 'seat') ? 'block' : 'none';
        seatsInput.style.display = (table.type === 'square' || table.type === 'seat') ? 'block' : 'none';
        halfCircleLabel.style.display = 'none';
        colorLabel.style.display = 'block';
        colorInput.style.display = 'block';
        updateMaxSeats(table);
    } else if (table.type === 'round' || table.type === 'roundSeat' || table.type === 'customCircleArea') {
        widthLabel.style.display = 'none';
        heightLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'block';
        radiusInput.style.display = 'block';
        cornerSeatsLabel.style.display = 'none';
        counterEnabledLabel.style.display = table.type === 'roundSeat' ? 'block' : 'none';
        seatColorLabel.style.display = table.type === 'round' ? 'block' : 'none';
        seatColorInput.style.display = table.type === 'round' ? 'block' : 'none';
        seatsLabel.style.display = (table.type === 'round' || table.type === 'roundSeat') ? 'block' : 'none';
        seatsInput.style.display = (table.type === 'round' || table.type === 'roundSeat') ? 'block' : 'none';
        halfCircleLabel.style.display = table.type === 'customCircleArea' ? 'block' : 'none';
        colorLabel.style.display = 'block';
        colorInput.style.display = 'block';
        updateMaxSeats(table);
    } else {
        widthLabel.style.display = 'none';
        heightLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'block';
        radiusInput.style.display = 'block';
        cornerSeatsLabel.style.display = 'none';
        counterEnabledLabel.style.display = 'none';
        seatColorLabel.style.display = 'block';
        seatColorInput.style.display = 'block';
        seatsLabel.style.display = 'block';
        seatsInput.style.display = 'block';
        halfCircleLabel.style.display = 'none';
        updateMaxSeats(table);
    }
}

function updateMaxSeats(table) {
    if (!table) {
        seatsInput.removeAttribute('max');
        seatsInput.min = 0;
        return;
    }

    if (table.type === 'square') {
        const widthSeats = Math.floor(table.width / 50);
        const heightSeats = Math.floor(table.height / 50);
        let maxSeats;
        if (table.cornerSeats) {
            maxSeats = 2 * widthSeats + 2 * heightSeats;
        } else {
            maxSeats = 2 * widthSeats;
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

export function selectTable(table) {
    state.selectedTable = table;
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
        halfCircleInput.checked = table.isHalfCircle === true;
        seatsInput.value = table.seats;
        updateSizeFieldsVisibility(table);
        updateSeatWarning(table);
    } else {
        sidebar.classList.remove('show');
        halfCircleInput.checked = false;
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

function showAuthModal() {
    authModal.style.display = 'block';
}

function hideAuthModal() {
    authModal.style.display = 'none';
    loginError.textContent = '';
    registerError.textContent = '';
}

function switchToLogin() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
}

function switchToRegister() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
}

export function updateUIForUser(user) {
    if (user && state.currentUserData) {
        loginBtn.style.display = 'none';
        userDisplay.style.display = 'inline';
        userName.textContent = `Olá, ${state.currentUserData.name || user.email}`;
        saveCloudBtn.style.display = 'block';
        loadCloudBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'inline';
        userDisplay.style.display = 'none';
        saveCloudBtn.style.display = 'none';
        loadCloudBtn.style.display = 'none';
    }
}

function showCloudModal(isSave) {
    cloudModal.style.display = 'block';
    cloudError.textContent = '';
    if (isSave) {
        cloudModalTitle.textContent = 'Salvar na nuvem';
        saveCloudForm.style.display = 'block';
        loadCloudList.style.display = 'none';
        mapNameInput.focus();
    } else {
        cloudModalTitle.textContent = 'Carregar da nuvem';
        saveCloudForm.style.display = 'none';
        loadCloudList.style.display = 'block';
        loadMapsList();
    }
}

function hideCloudModal() {
    cloudModal.style.display = 'none';
    cloudError.textContent = '';
}

async function loadMapsList() {
    try {
        const maps = await loadMapsFromCloud();
        mapsList.innerHTML = '';

        if (maps.length === 0) {
            mapsList.innerHTML = '<li>Nenhum mapa encontrado.</li>';
            return;
        }

        maps.forEach(map => {
            const li = document.createElement('li');
            li.textContent = map.name;
            li.addEventListener('click', () => {
                deserializeLayout(map.elements);
                state.selectedTable = null;
                sidebar.classList.remove('show');
                draw();
                hideCloudModal();
            });
            mapsList.appendChild(li);
        });
    } catch (error) {
        cloudError.textContent = 'Erro ao carregar mapas.';
    }
}

canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getCanvasCoords(e);
    if (state.mode === 'select') {
        let found = false;
        let selectedTable = null;
        
        // Prioridade de seleção: assentos → mesas → áreas customizadas → etiquetas
        // 1. Procura etiquetas primeiro (prioridade)
        selectedTable = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
        
        // 2. Se não encontrou etiqueta, procura assentos
        if (!selectedTable) {
            selectedTable = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
        }
        
        // 3. Se não encontrou assento, procura mesas
        if (!selectedTable) {
            selectedTable = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
        }
        
        // 4. Se não encontrou mesa, procura áreas customizadas
        if (!selectedTable) {
            selectedTable = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
        }
        
        if (selectedTable) {
            state.selectedTable = selectedTable;
            state.isDragging = true;
            state.dragOffsetX = x - selectedTable.x;
            state.dragOffsetY = y - selectedTable.y;
            selectTable(selectedTable);
            found = true;
            state.isPanning = false;
        } else {
            selectTable(null);
            state.isPanning = true;
            state.panLastX = e.clientX;
            state.panLastY = e.clientY;
        }
        draw();
    } else if (state.mode === 'delete') {
        // Aplicar mesma prioridade de seleção para deletar
        let tableToDelete = null;
        
        // 1. Procura etiquetas primeiro (prioridade)
        tableToDelete = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
        
        // 2. Se não encontrou etiqueta, procura assentos
        if (!tableToDelete) {
            tableToDelete = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
        }
        
        // 3. Se não encontrou assento, procura mesas
        if (!tableToDelete) {
            tableToDelete = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
        }
        
        // 4. Se não encontrou mesa, procura áreas customizadas
        if (!tableToDelete) {
            tableToDelete = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
        }
        
        if (tableToDelete) {
            const index = state.tables.indexOf(tableToDelete);
            state.tables.splice(index, 1);
            draw();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (state.isDragging && state.selectedTable) {
        const { x, y } = getCanvasCoords(e);
        let newX = x - state.dragOffsetX;
        let newY = y - state.dragOffsetY;
        state.alignmentLine = null;

        for (let table of state.tables) {
            if (table === state.selectedTable) continue;
            if (Math.abs(newX - table.x) <= 5) {
                newX = table.x;
                state.alignmentLine = { x1: newX, y1: Math.min(newY, table.y), x2: newX, y2: Math.max(newY, table.y) };
                break;
            }
            if (Math.abs(newY - table.y) <= 5) {
                newY = table.y;
                state.alignmentLine = { x1: Math.min(newX, table.x), y1: newY, x2: Math.max(newX, table.x), y2: newY };
                break;
            }
        }

        state.selectedTable.x = newX;
        state.selectedTable.y = newY;
        draw();
    } else if (state.isPanning) {
        const deltaX = e.clientX - state.panLastX;
        const deltaY = e.clientY - state.panLastY;
        state.canvasOffsetX += deltaX;
        state.canvasOffsetY += deltaY;
        state.panLastX = e.clientX;
        state.panLastY = e.clientY;
        draw();
    } else {
        // Detectar hover com prioridade: assentos → mesas → áreas customizadas → etiquetas
        const { x, y } = getCanvasCoords(e);
        let hoveredTable = null;
        
        // 1. Procura etiquetas primeiro (prioridade)
        hoveredTable = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
        
        // 2. Se não encontrou etiqueta, procura assentos
        if (!hoveredTable) {
            hoveredTable = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
        }
        
        // 3. Se não encontrou assento, procura mesas
        if (!hoveredTable) {
            hoveredTable = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
        }
        
        // 4. Se não encontrou mesa, procura áreas customizadas
        if (!hoveredTable) {
            hoveredTable = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
        }
        
        // Se mudou o hover, redesenhar
        if (state.hoveredTable !== hoveredTable) {
            state.hoveredTable = hoveredTable;
            draw();
        }
    }
});

canvas.addEventListener('mouseup', () => {
    state.isDragging = false;
    state.isPanning = false;
    state.alignmentLine = null;
    draw();
});

canvas.addEventListener('mouseleave', () => {
    state.isDragging = false;
    state.isPanning = false;
    state.alignmentLine = null;
    state.hoveredTable = null;
    draw();
});

// Zoom via roda do mouse: sincroniza com o slider e centraliza no cursor
function handleCanvasWheel(e) {
    e.preventDefault();
    const step = 5; // percent per wheel step
    const min = parseInt(zoomRange.min, 10);
    const max = parseInt(zoomRange.max, 10);
    const current = parseInt(zoomRange.value, 10);
    const deltaSign = Math.sign(e.deltaY); // positive => scroll down (zoom out)
    let newValue = current - deltaSign * step;
    newValue = Math.max(min, Math.min(max, newValue));

    const beforeScale = state.canvasScale;
    const afterScale = newValue / 100;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.canvasOffsetX) / beforeScale;
    const y = (e.clientY - rect.top - state.canvasOffsetY) / beforeScale;

    // Ajusta offset para que o ponto sob o cursor permaneça no mesmo lugar
    state.canvasOffsetX -= (afterScale - beforeScale) * x;
    state.canvasOffsetY -= (afterScale - beforeScale) * y;

    zoomRange.value = newValue;
    zoomRange.dispatchEvent(new Event('input'));
}

canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

toggleDrawerBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
});

selectModeBtn.addEventListener('click', () => {
    state.mode = 'select';
    canvas.style.cursor = 'crosshair';
});

deleteModeBtn.addEventListener('click', () => {
    state.mode = 'delete';
    canvas.style.cursor = 'pointer';
});

zoomRange.addEventListener('input', () => {
    state.canvasScale = zoomRange.value / 100;
    zoomValue.textContent = `${zoomRange.value}%`;
    draw();
});

function setInitialZoom() {
    state.canvasScale = zoomRange.value / 100;
    zoomValue.textContent = `${zoomRange.value}%`;
}
setInitialZoom();

function getWindowCenterCanvasCoords() {
    const rect = canvas.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return {
        x: (centerX - rect.left - state.canvasOffsetX) / state.canvasScale,
        y: (centerY - rect.top - state.canvasOffsetY) / state.canvasScale,
    };
}

deleteAllBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir todas as mesas?')) {
        state.tables = [];
        state.nextTableNumber = 1;
        state.selectedTable = null;
        sidebar.classList.remove('show');
        draw();
    }
});

fileMenuBtn.addEventListener('click', openFileMenu);
saveJsonBtn.addEventListener('click', downloadJson);
loadJsonBtn.addEventListener('click', () => fileInput.click());
downloadPngBtn.addEventListener('click', downloadCanvasPng);
closeFileMenuBtn.addEventListener('click', closeFileMenu);
fileInput.addEventListener('change', handleFileInputChange);
fileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === fileMenuOverlay) {
        closeFileMenu();
    }
});

nameInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.name = nameInput.value;
        draw();
    }
});

fontSizeInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.fontSize = parseInt(fontSizeInput.value, 10);
        draw();
    }
});

widthInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'square' || state.selectedTable.type === 'seat' || state.selectedTable.type === 'customArea')) {
        state.selectedTable.width = parseInt(widthInput.value, 10);
        updateMaxSeats(state.selectedTable);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

heightInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'square' || state.selectedTable.type === 'seat' || state.selectedTable.type === 'customArea')) {
        state.selectedTable.height = parseInt(heightInput.value, 10);
        updateMaxSeats(state.selectedTable);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

radiusInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'round' || state.selectedTable.type === 'roundSeat' || state.selectedTable.type === 'customCircleArea')) {
        state.selectedTable.radius = parseInt(radiusInput.value, 10);
        updateMaxSeats(state.selectedTable);
        draw();
    }
});

halfCircleInput.addEventListener('change', () => {
    if (state.selectedTable && state.selectedTable.type === 'customCircleArea') {
        state.selectedTable.isHalfCircle = halfCircleInput.checked;
        draw();
    }
});

angleInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.angle = parseInt(angleInput.value, 10);
        angleNumberInput.value = angleInput.value;
        draw();
    }
});

angleNumberInput.addEventListener('input', () => {
    if (state.selectedTable) {
        let value = parseInt(angleNumberInput.value, 10);
        if (isNaN(value)) value = 0;
        if (value < 0) value = 0;
        if (value > 360) value = 360;
        state.selectedTable.angle = value;
        angleInput.value = value;
        angleNumberInput.value = value;
        draw();
    }
});

colorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.color = colorInput.value;
        draw();
    }
});

nameColorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.nameColor = nameColorInput.value;
        draw();
    }
});

seatColorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.seatColor = seatColorInput.value;
        draw();
    }
});

counterEnabledInput.addEventListener('change', () => {
    if (state.selectedTable) {
        state.selectedTable.counterEnabled = counterEnabledInput.checked;
        draw();
    }
});

seatsInput.addEventListener('input', () => {
    if (state.selectedTable) {
        state.selectedTable.seats = parseInt(seatsInput.value, 10);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

cornerSeatsInput.addEventListener('change', () => {
    if (state.selectedTable) {
        state.selectedTable.cornerSeats = cornerSeatsInput.checked;
        updateMaxSeats(state.selectedTable);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

duplicateBtn.addEventListener('click', () => {
    if (!state.selectedTable) {
        return;
    }

    const shouldKeepName = ['seat', 'roundSeat', 'customArea', 'customCircleArea', 'label'].includes(state.selectedTable.type);
    const newName = shouldKeepName ? state.selectedTable.name : String(state.nextTableNumber++);

    const newTable = new state.selectedTable.constructor(
        state.selectedTable.type,
        state.selectedTable.x + 50,
        state.selectedTable.y + 50,
        state.selectedTable.width,
        state.selectedTable.height,
        state.selectedTable.radius,
        state.selectedTable.angle,
        state.selectedTable.color,
        newName,
        state.selectedTable.seats,
        state.selectedTable.nameColor,
        state.selectedTable.cornerSeats,
        state.selectedTable.seatColor,
        state.selectedTable.counterEnabled,
        state.selectedTable.fontSize,
        state.selectedTable.isHalfCircle
    );

    state.tables.push(newTable);
    selectTable(newTable);
    draw();
});

deleteBtn.addEventListener('click', () => {
    if (!state.selectedTable) {
        return;
    }

    const index = state.tables.indexOf(state.selectedTable);
    if (index > -1) {
        state.tables.splice(index, 1);
    }
    selectTable(null);
    draw();
});

addSquareBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const table = new Table('square', x, y, 150, 150, 0, 0, '#a3a3a3', String(state.nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    state.tables.push(table);
    selectTable(table);
    draw();
});

addRoundBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const table = new Table('round', x, y, 0, 0, 60, 0, '#a3a3a3', String(state.nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    state.tables.push(table);
    selectTable(table);
    draw();
});

addSeatBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const seat = new Table('seat', x, y, 40, 40, 0, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    state.tables.push(seat);
    selectTable(seat);
    draw();
});

addRoundSeatBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const roundSeat = new Table('roundSeat', x, y, 0, 0, 20, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    state.tables.push(roundSeat);
    selectTable(roundSeat);
    draw();
});

addCustomAreaBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const customArea = new Table('customArea', x, y, 300, 300, 0, 0, '#8B4513', 'Área Customizada', 0, '#000000', false, '#e7e7e7', false, 24);
    state.tables.push(customArea);
    selectTable(customArea);
    draw();
});

addCustomCircleAreaBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const customCircleArea = new Table('customCircleArea', x, y, 0, 0, 150, 0, '#8B4513', 'Área Circular Customizada', 0, '#000000', false, '#e7e7e7', false, 24, false);
    state.tables.push(customCircleArea);
    selectTable(customCircleArea);
    draw();
});

addLabelBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    const label = new Table('label', x, y, 0, 0, 0, 0, '#000000', 'Etiqueta', 0, '#000000', false, '#e7e7e7', false, 24);
    state.tables.push(label);
    selectTable(label);
    draw();
});

seatCounter.addEventListener('mouseover', (e) => {
    const details = getItemDetails();
    tooltip.innerHTML = `
        <strong>Quantidade de Itens:</strong><br>
        Mesas Quadradas: ${details.squareCount}<br>
        Mesas Redondas: ${details.roundCount}<br>
        Assentos (habilitados): ${details.seatEnabledCount}<br>
        Assentos (desabilitados): ${details.seatDisabledCount}<br>
        Assentos Redondos (habilitados): ${details.roundSeatEnabledCount}<br>
        Assentos Redondos (desabilitados): ${details.roundSeatDisabledCount}
    `;
    const rect = seatCounter.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.display = 'block';
});

seatCounter.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
});

loginBtn.addEventListener('click', showAuthModal);
closeAuthModal.addEventListener('click', hideAuthModal);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        hideAuthModal();
    }
});

loginTab.addEventListener('click', switchToLogin);
registerTab.addEventListener('click', switchToRegister);

loginSubmit.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await loginUser(email, password);
        hideAuthModal();
    } catch (error) {
        loginError.textContent = error.message;
    }
});

registerSubmit.addEventListener('click', async () => {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const birthday = document.getElementById('registerBirthday').value;
    try {
        await registerUser(name, email, password, birthday);
        hideAuthModal();
    } catch (error) {
        registerError.textContent = error.message;
    }
});

googleLogin.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
        hideAuthModal();
    } catch (error) {
        loginError.textContent = error.message;
    }
});

userDisplay.addEventListener('click', () => {
    if (confirm('Deseja fazer logout?')) {
        logoutUser();
    }
});

logoutBtn.addEventListener('click', logoutUser);

saveCloudBtn.addEventListener('click', () => showCloudModal(true));
loadCloudBtn.addEventListener('click', () => showCloudModal(false));
closeCloudModal.addEventListener('click', hideCloudModal);
cloudModal.addEventListener('click', (e) => {
    if (e.target === cloudModal) {
        hideCloudModal();
    }
});

saveCloudSubmit.addEventListener('click', async () => {
    const name = mapNameInput.value.trim();
    if (!name) {
        cloudError.textContent = 'Nome do mapa é obrigatório.';
        return;
    }
    try {
        await saveMapToCloud(name);
        hideCloudModal();
        alert('Mapa salvo com sucesso!');
    } catch (error) {
        cloudError.textContent = 'Erro ao salvar mapa.';
    }
});
