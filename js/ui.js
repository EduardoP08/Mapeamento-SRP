import { state } from './state.js';
import { canvas, sidebar, drawer, toggleDrawerBtn, selectModeBtn, multiSelectModeBtn, deleteModeBtn, deleteAllBtn, fileInput, nameInput, loginBtn, userDisplay, userName, logoutBtn, authModal, closeAuthModal, loginTab, registerTab, loginForm, registerForm, loginSubmit, registerSubmit, googleLogin, loginError, registerError, cloudModal, closeCloudModal, cloudModalTitle, saveCloudForm, loadCloudList, mapNameInput, saveCloudSubmit, mapsList, cloudError, toolbarMapName, saveAsNewBtn, zoomInBtn, zoomOutBtn, fontSizeInput, widthLabel, widthInput, heightLabel, heightInput, radiusLabel, radiusInput, angleInput, angleNumberInput, colorInput, colorLabel, nameColorInput, seatColorInput, counterEnabledInput, counterEnabledLabel, cornerSeatsInput, cornerSeatsLabel, seatsInput, seatsLabel, seatColorLabel, seatWarning, duplicateBtn, deleteBtn, addSquareBtn, addRoundBtn, addSeatBtn, addRoundSeatBtn, addCustomAreaBtn, addCustomCircleAreaBtn, addLabelBtn, halfCircleInput, halfCircleLabel, seatCounter } from './dom.js';
import { draw, getCanvasCoords } from './canvas.js';
import { serializeLayout, deserializeLayout, getItemDetails } from './layout.js';
import { loginUser, registerUser, loginWithGoogle, logoutUser } from './auth.js';
import { saveMapToCloud, loadMapsFromCloud, renameMapInCloud, deleteMapFromCloud, saveItemToCloud, loadItemsFromCloud, renameItemInCloud, deleteItemFromCloud } from './cloud.js';
import { Table } from './table.js';
import { menuZoomInBtn, menuZoomOutBtn, showGridBtn, showMeasuresBtn, posXInput, posYInput, objectToolbar, rotateLeftBtn, rotateRightBtn, floatingDuplicateBtn, floatingSaveBtn, floatingDeleteBtn, floatingLockBtn, saveItemBtn, savedTables, savedSeats, savedAreas, savedLabels, savedGroups, savedItemModal, savedItemModalTitle, closeSavedItemModal, cancelSavedItemBtn, savedItemName, savedItemError, saveSavedItemBtn, deleteSavedItemBtn, undoBtn, redoBtn, toolbarUndoBtn, toolbarRedoBtn } from './dom.js';

const tooltip = document.createElement('div');
tooltip.className = 'popover-tooltip';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

// saveMode: 'cloud' | 'local' | 'rename'
let saveMode = 'cloud';
let pendingRenameMapId = null;
let pendingNewAfterSave = false;
let dragFrameId = null;
let pendingDragX = null;
let pendingDragY = null;
let dragSnapTargets = [];
const undoHistory = [];
const redoHistory = [];
const HISTORY_LIMIT = 10;
let historySuspended = false;
let dragHistorySnapshot = null;
let multiSelectionStart = null;
let multiSelectionRect = null;
let groupToSave = null;
let groupDragOffsets = [];
let temporaryShiftSelection = false;
let nextGroupId = 1;
const SNAP_DISTANCE = 8;

function captureHistoryState() {
    return JSON.stringify({
        layout: serializeLayout(),
        selectedIndex: state.selectedTable ? state.tables.indexOf(state.selectedTable) : -1
    });
}

function updateHistoryButtons() {
    if (undoBtn) undoBtn.disabled = undoHistory.length === 0;
    if (redoBtn) redoBtn.disabled = redoHistory.length === 0;
    if (toolbarUndoBtn) toolbarUndoBtn.disabled = undoHistory.length === 0;
    if (toolbarRedoBtn) toolbarRedoBtn.disabled = redoHistory.length === 0;
}

function clearHistory() {
    undoHistory.length = 0;
    redoHistory.length = 0;
    updateHistoryButtons();
}

function recordHistory(snapshot = captureHistoryState()) {
    if (historySuspended) return;
    if (undoHistory[undoHistory.length - 1] !== snapshot) {
        undoHistory.push(snapshot);
        if (undoHistory.length > HISTORY_LIMIT) undoHistory.shift();
    }
    redoHistory.length = 0;
    updateHistoryButtons();
}

function pushHistoryEntry(history, snapshot) {
    history.push(snapshot);
    if (history.length > HISTORY_LIMIT) history.shift();
}

function restoreHistoryState(snapshot) {
    const historyState = JSON.parse(snapshot);
    historySuspended = true;
    deserializeLayout(historyState.layout);
    const selectedTable = historyState.selectedIndex >= 0
        ? state.tables[historyState.selectedIndex]
        : null;
    selectTable(selectedTable || null);
    historySuspended = false;
    draw();
}

function undo() {
    if (!undoHistory.length) return;
    pushHistoryEntry(redoHistory, captureHistoryState());
    restoreHistoryState(undoHistory.pop());
    updateHistoryButtons();
}

function redo() {
    if (!redoHistory.length) return;
    pushHistoryEntry(undoHistory, captureHistoryState());
    restoreHistoryState(redoHistory.pop());
    updateHistoryButtons();
}

function getSnappedDragPosition(x, y) {
    let snappedX = x;
    let snappedY = y;
    let closestX = SNAP_DISTANCE + 1;
    let closestY = SNAP_DISTANCE + 1;
    const snapLines = [];

    for (const target of dragSnapTargets) {
        const distanceX = Math.abs(x - target.x);
        const distanceY = Math.abs(y - target.y);

        if (distanceX < closestX) {
            closestX = distanceX;
            snappedX = target.x;
        }
        if (distanceY < closestY) {
            closestY = distanceY;
            snappedY = target.y;
        }
    }

    if (closestX <= SNAP_DISTANCE) {
        snapLines.push({
            x1: snappedX,
            y1: 0,
            x2: snappedX,
            y2: canvas.height / (state.canvasScale || 1)
        });
    }
    if (closestY <= SNAP_DISTANCE) {
        snapLines.push({
            x1: 0,
            y1: snappedY,
            x2: canvas.width / (state.canvasScale || 1),
            y2: snappedY
        });
    }

    return { x: snappedX, y: snappedY, snapLines };
}

function applyPendingDrag() {
    dragFrameId = null;
    if (!state.isDragging || !state.selectedTable || pendingDragX === null) return;
    const snappedPosition = getSnappedDragPosition(pendingDragX, pendingDragY);
    if (state.selectedTables.length && groupDragOffsets.length) {
        const anchor = groupDragOffsets.find(entry => entry.table === state.selectedTable);
        const deltaX = snappedPosition.x - (anchor?.x || state.selectedTable.x);
        const deltaY = snappedPosition.y - (anchor?.y || state.selectedTable.y);
        state.selectedTables.forEach(table => {
            const offset = groupDragOffsets.find(entry => entry.table === table);
            table.x = offset.x + deltaX;
            table.y = offset.y + deltaY;
        });
    } else {
        state.selectedTable.x = snappedPosition.x;
        state.selectedTable.y = snappedPosition.y;
    }
    state.alignmentLine = snappedPosition.snapLines;
    draw();
}

function scheduleDragUpdate(x, y) {
    pendingDragX = x;
    pendingDragY = y;
    if (dragFrameId === null) {
        dragFrameId = requestAnimationFrame(applyPendingDrag);
    }
}

function flushPendingDrag() {
    if (dragFrameId !== null) {
        cancelAnimationFrame(dragFrameId);
        dragFrameId = null;
    }
    if (state.selectedTable && pendingDragX !== null) {
        const snappedPosition = getSnappedDragPosition(pendingDragX, pendingDragY);
        if (state.selectedTables.length && groupDragOffsets.length) {
            const anchor = groupDragOffsets.find(entry => entry.table === state.selectedTable);
            const deltaX = snappedPosition.x - (anchor?.x || state.selectedTable.x);
            const deltaY = snappedPosition.y - (anchor?.y || state.selectedTable.y);
            state.selectedTables.forEach(table => {
                const offset = groupDragOffsets.find(entry => entry.table === table);
                table.x = offset.x + deltaX;
                table.y = offset.y + deltaY;
            });
        } else {
            state.selectedTable.x = snappedPosition.x;
            state.selectedTable.y = snappedPosition.y;
        }
        state.alignmentLine = snappedPosition.snapLines;
    }
    pendingDragX = null;
    pendingDragY = null;
    dragSnapTargets = [];
}

function finishPendingNewIfRequested() {
    if (pendingNewAfterSave) {
        pendingNewAfterSave = false;
        state.tables = [];
        state.nextTableNumber = 1;
        state.selectedTable = null;
        state.currentCloudMapId = null;
        sidebar.classList.remove('show');
        if (toolbarMapName) toolbarMapName.value = 'Novo mapa';
        clearHistory();
        draw();
    }
}
// Zoom state: percent and mapping (100% -> scale 0.4)
let zoomPercent = 100;
const ZOOM_MIN = 25;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10; // percent per step (buttons click)

function applyZoomPercent(newPercent, focusClientX, focusClientY) {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newPercent));
    const beforeScale = state.canvasScale || 1;
    const afterScale = clamped * 0.004; // mapping: 100 -> 0.4

    // compute focus point in canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const clientX = (typeof focusClientX === 'number') ? focusClientX : (rect.left + rect.width / 2);
    const clientY = (typeof focusClientY === 'number') ? focusClientY : (rect.top + rect.height / 2);
    const x = (clientX - rect.left - state.canvasOffsetX) / beforeScale;
    const y = (clientY - rect.top - state.canvasOffsetY) / beforeScale;

    state.canvasOffsetX -= (afterScale - beforeScale) * x;
    state.canvasOffsetY -= (afterScale - beforeScale) * y;

    zoomPercent = clamped;
    state.canvasScale = afterScale;
    updateObjectToolbarPosition();
    draw();
}

function updateZoomControlsPosition() {
    const zoomControls = document.getElementById('zoomControls');
    if (!zoomControls) return;
    // If sidebar is visible, shift zoom controls left by sidebar width + 10px margin
    if (sidebar.classList.contains('show')) {
        const sbWidth = sidebar.getBoundingClientRect().width || 320;
        zoomControls.style.right = `${sbWidth + 10}px`;
    } else {
        zoomControls.style.right = `10px`;
    }
}

function downloadJson() {
    const blob = new Blob([serializeLayout()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const base = (toolbarMapName && toolbarMapName.value) ? toolbarMapName.value.trim() : 'layout';
    const safe = base.replace(/[<>:\\"/\\|?*\x00-\x1F]/g, '_') || 'layout';
    link.download = `${safe}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function downloadCanvasPng() {
    const link = document.createElement('a');
    const base = (toolbarMapName && toolbarMapName.value) ? toolbarMapName.value.trim() : 'layout';
    const safe = base.replace(/[<>:\\"/\\|?*\x00-\x1F]/g, '_') || 'layout';
    link.download = `${safe}.png`;
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
            clearHistory();
            draw();
            // Atualiza nome na toolbar com o nome do arquivo (sem extensão)
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            toolbarMapName.value = baseName || 'Novo Mapeamento';
            // Arquivo local não corresponde a um mapa da nuvem
            state.currentCloudMapId = null;
        } catch (error) {
            alert('Falha ao carregar arquivo: ' + error.message);
        }
        fileInput.value = '';
        closeFileMenu();
    };
    reader.readAsText(file);
}

function updateSizeFieldsVisibility(table) {
    const setVisibility = (id, visible) => {
        const element = document.getElementById(id);
        if (element) element.style.display = visible ? '' : 'none';
    };
    const setInputGroupVisibility = (input, visible) => {
        const group = input.closest('.color-field');
        if (group) group.style.display = visible ? '' : 'none';
    };

    if (!table) {
        widthLabel.style.display = 'none';
        widthInput.style.display = 'none';
        heightLabel.style.display = 'none';
        heightInput.style.display = 'none';
        radiusLabel.style.display = 'none';
        radiusInput.style.display = 'none';
        cornerSeatsLabel.style.display = 'none';
        setVisibility('widthField', false);
        setVisibility('heightField', false);
        setVisibility('radiusField', false);
        setVisibility('seatsSection', false);
        setInputGroupVisibility(colorInput, false);
        setInputGroupVisibility(seatColorInput, false);
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
        setVisibility('widthField', false);
        setVisibility('heightField', false);
        setVisibility('radiusField', false);
        setVisibility('seatsSection', false);
        setInputGroupVisibility(colorInput, false);
        setInputGroupVisibility(seatColorInput, false);
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
        setVisibility('widthField', true);
        setVisibility('heightField', true);
        setVisibility('radiusField', false);
        setVisibility('seatsSection', table.type === 'square');
        setInputGroupVisibility(colorInput, true);
        setInputGroupVisibility(seatColorInput, table.type === 'square');
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
        setVisibility('widthField', false);
        setVisibility('heightField', false);
        setVisibility('radiusField', true);
        setVisibility('seatsSection', table.type === 'round');
        setInputGroupVisibility(colorInput, true);
        setInputGroupVisibility(seatColorInput, table.type === 'round');
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
        setVisibility('widthField', false);
        setVisibility('heightField', false);
        setVisibility('radiusField', false);
        setVisibility('seatsSection', false);
        setInputGroupVisibility(colorInput, true);
        setInputGroupVisibility(seatColorInput, false);
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

const tableTypeLabels = {
    square: 'Mesa Quadrada',
    round: 'Mesa Redonda',
    seat: 'Assento Quadrado',
    roundSeat: 'Assento Redondo',
    customArea: 'Área Quadrada',
    customCircleArea: 'Área Redonda',
    label: 'Etiqueta'
};

function updateObjectToolbarPosition() {
    if (!objectToolbar || !state.selectedTable || !sidebar.classList.contains('show')) return;
    floatingLockBtn.style.display = 'none';
    const rect = canvas.getBoundingClientRect();
    const scale = state.canvasScale || 1;
    const table = state.selectedTable;
    const screenX = rect.left + state.canvasOffsetX + table.x * scale;
    const angle = (table.angle || 0) * Math.PI / 180;
    const halfWidth = table.width ? table.width / 2 : (table.radius || 0);
    const halfHeight = table.height ? table.height / 2 : (table.radius || 0);
    const rotatedHalfHeight = Math.abs(Math.cos(angle) * halfHeight) + Math.abs(Math.sin(angle) * halfWidth);
    const screenY = rect.top + state.canvasOffsetY + (table.y - rotatedHalfHeight) * scale;
    objectToolbar.style.left = `${screenX}px`;
    objectToolbar.style.top = `${Math.max(66, screenY - 8)}px`;
    objectToolbar.classList.add('show');
}

function updateFloatingLockIcon() {
    if (!floatingLockBtn) return;
    floatingLockBtn.title = state.groupLocked ? 'Destravar grupo' : 'Travar grupo';
    floatingLockBtn.setAttribute('aria-label', state.groupLocked ? 'Destravar grupo' : 'Travar grupo');
    floatingLockBtn.innerHTML = state.groupLocked
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v1"/></svg>';
}

function hideObjectToolbar() {
    if (objectToolbar) objectToolbar.classList.remove('show');
}

function serializeTableItem(table) {
    return {
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
        isHalfCircle: table.isHalfCircle
    };
}

async function saveSelectedItem() {
    if (!state.selectedTable) return;
    if (!state.currentUser) {
        showAuthModal();
        return;
    }

    showSavedItemModal(null, state.selectedTable.name || 'Meu item');
}

function createTableFromSavedItem(itemData) {
    const item = typeof itemData.item === 'string' ? JSON.parse(itemData.item) : itemData.item;
    const customizationName = String(item.name ?? '');
    const isNumberedTable = (item.type === 'square' || item.type === 'round') && /^\d+$/.test(customizationName.trim());
    const tableName = isNumberedTable ? String(state.nextTableNumber++) : customizationName;
    const { x, y } = getWindowCenterCanvasCoords();
    const table = new Table(
        item.type, x, y, item.width, item.height, item.radius, item.angle,
        item.color, tableName, item.seats, item.nameColor, item.cornerSeats,
        item.seatColor, item.counterEnabled, item.fontSize, item.isHalfCircle
    );
    recordHistory();
    state.tables.push(table);
    selectTable(table);
    draw();
}

const savedItemGroups = {
    square: savedTables,
    round: savedTables,
    seat: savedSeats,
    roundSeat: savedSeats,
    customArea: savedAreas,
    customCircleArea: savedAreas,
    label: savedLabels
};

const savedItemIcons = {
    square: 'fa-square',
    round: 'fa-circle',
    seat: 'fa-square',
    roundSeat: 'fa-circle',
    customArea: 'fa-vector-square',
    customCircleArea: 'fa-circle',
    label: 'fa-tag'
};

let selectedSavedItem = null;
let tableToSave = null;

function hideSavedItemModal() {
    if (savedItemModal) savedItemModal.style.display = 'none';
    selectedSavedItem = null;
    tableToSave = null;
    groupToSave = null;
}

function showSavedItemModal(item, initialName = '') {
    selectedSavedItem = item;
    tableToSave = item || groupToSave ? null : state.selectedTable;
    savedItemModalTitle.textContent = item ? 'Editar item salvo' : 'Salvar item';
    deleteSavedItemBtn.style.display = item ? '' : 'none';
    savedItemName.value = item ? (item.name || '') : initialName;
    savedItemError.style.display = 'none';
    savedItemModal.style.display = 'block';
    savedItemName.focus();
}

function renderSavedItem(item) {
    const savedData = JSON.parse(item.item);
    const group = savedData.type === 'group' ? savedGroups : savedItemGroups[savedData.type];
    if (!group) return;

    const row = document.createElement('div');
    row.className = 'saved-item-row';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'saved-item-button';
    addButton.title = `Adicionar ${item.name}`;
    addButton.innerHTML = `<i class="fas ${savedData.type === 'group' ? 'fa-object-group' : savedItemIcons[savedData.type]}" aria-hidden="true"></i>`;
    const name = document.createElement('span');
    name.textContent = item.name;
    addButton.appendChild(name);
    addButton.addEventListener('click', () => {
        try {
            const createdTables = savedData.type === 'group' ? createTablesFromSavedGroup(item) : [createTableFromSavedItem(item)];
            if (savedData.type === 'group') {
                recordHistory();
                state.tables.push(...createdTables);
                state.selectedTables = createdTables;
                state.selectedTable = null;
                state.mode = 'multi';
                state.groupLocked = true;
                updateFloatingLockIcon();
                sidebar.classList.remove('show');
                updateMultiToolbarPosition();
                draw();
            }
        } catch (error) {
            alert(`Não foi possível adicionar o item: ${error.message}`);
        }
    });

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'saved-item-edit';
    editButton.title = 'Editar item salvo';
    editButton.setAttribute('aria-label', `Editar ${item.name}`);
    editButton.innerHTML = '<i class="fas fa-pencil-alt" aria-hidden="true"></i>';
    editButton.addEventListener('click', () => showSavedItemModal(item));

    row.append(addButton, editButton);
    group.appendChild(row);
}

async function loadSavedItems() {
    const groups = [...Object.values(savedItemGroups), savedGroups].filter(Boolean);
    groups.forEach(group => { group.innerHTML = ''; });
    if (!state.currentUser) return;

    try {
        const items = await loadItemsFromCloud();
        items.forEach(renderSavedItem);
    } catch (error) {
        groups.forEach(group => {
            group.innerHTML = '<span class="saved-items-empty">Não foi possível carregar.</span>';
        });
    }
}

async function saveEditedItemName() {
    const name = savedItemName.value.trim();
    if ((!selectedSavedItem && !tableToSave && !groupToSave) || !name) {
        savedItemError.textContent = 'Informe um nome para o item.';
        savedItemError.style.display = 'block';
        return;
    }
    try {
        if (groupToSave) {
            await saveItemToCloud(name, serializeGroup(groupToSave));
        } else if (tableToSave) {
            await saveItemToCloud(name, serializeTableItem(tableToSave));
            alert('Item salvo com sucesso.');
        } else {
            await renameItemInCloud(selectedSavedItem.id, name);
        }
        hideSavedItemModal();
        await loadSavedItems();
    } catch (error) {
        savedItemError.textContent = `Não foi possível ${tableToSave ? 'salvar' : 'renomear'} o item: ${error.message}`;
        savedItemError.style.display = 'block';
    }
}

async function deleteSelectedSavedItem() {
    if (!selectedSavedItem || !window.confirm(`Apagar o item "${selectedSavedItem.name}"?`)) return;
    try {
        await deleteItemFromCloud(selectedSavedItem.id);
        hideSavedItemModal();
        await loadSavedItems();
    } catch (error) {
        savedItemError.textContent = `Não foi possível apagar: ${error.message}`;
        savedItemError.style.display = 'block';
    }
}

export function selectTable(table, showToolbar = true) {
    state.selectedTable = table;
    if (table) {
        sidebar.classList.add('show');
        const customizeTitle = document.getElementById('customizeTitle');
        if (customizeTitle) customizeTitle.textContent = tableTypeLabels[table.type] || 'Item';
        nameInput.value = table.name;
        widthInput.value = table.width;
        heightInput.value = table.height;
        radiusInput.value = table.radius;
        angleInput.value = table.angle;
        angleNumberInput.value = table.angle;
        colorInput.value = table.color;
        nameColorInput.value = table.nameColor;
        const colorHexInput = document.getElementById('colorHex');
        const nameColorHexInput = document.getElementById('nameColorHex');
        const seatColorHexInput = document.getElementById('seatColorHex');
        if (colorHexInput) colorHexInput.value = table.color.toUpperCase();
        if (nameColorHexInput) nameColorHexInput.value = table.nameColor.toUpperCase();
        if (seatColorHexInput) seatColorHexInput.value = table.seatColor.toUpperCase();
        seatColorInput.value = table.seatColor;
        fontSizeInput.value = table.fontSize;
        counterEnabledInput.checked = table.counterEnabled !== false;
        cornerSeatsInput.checked = table.cornerSeats;
        halfCircleInput.checked = table.isHalfCircle === true;
        seatsInput.value = table.seats;
        posXInput.value = Math.round(table.x);
        posYInput.value = Math.round(table.y);
        updateSizeFieldsVisibility(table);
        updateSeatWarning(table);
        if (showToolbar) {
            updateObjectToolbarPosition();
        } else {
            hideObjectToolbar();
        }
    } else {
        sidebar.classList.remove('show');
        const customizeTitle = document.getElementById('customizeTitle');
        if (customizeTitle) customizeTitle.textContent = 'Item';
        halfCircleInput.checked = false;
        updateSizeFieldsVisibility(null);
        updateSeatWarning(null);
        hideObjectToolbar();
    }
    // Update zoom controls position when sidebar visibility changes
    updateZoomControlsPosition();
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
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'flex';
        userName.textContent = `Olá, ${state.currentUserData?.name || user.displayName || user.email}`;
        loadSavedItems();
    } else {
        if (loginBtn) loginBtn.style.display = '';
        if (userName) userName.textContent = '';
        if (userDisplay) userDisplay.style.display = 'none';
        loadSavedItems();
    }
}

// Initialize login UI based on current state
try { updateUIForUser(state.currentUser); } catch (e) { /* ignore */ }

function showCloudModal(isSave) {
    cloudModal.style.display = 'block';
    cloudError.textContent = '';
    cloudError.style.display = 'none';
    if (isSave) {
        // Ajusta o titulo conforme a operacao de mapa.
        if (saveMode === 'rename') {
            cloudModalTitle.textContent = 'Renomear mapa';
        } else {
            cloudModalTitle.textContent = 'Salvar na nuvem';
        }
        saveCloudForm.style.display = 'block';
        loadCloudList.style.display = 'none';
        // Preenche o campo de nome com o que está na toolbar
        mapNameInput.value = toolbarMapName.value || 'Novo Mapeamento';
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
    cloudError.style.display = 'none';
}

function formatDate(ts) {
    if (!ts) return '—';
    let d;
    // Firestore Timestamp has toDate()
    if (typeof ts.toDate === 'function') {
        d = ts.toDate();
    } else if (typeof ts === 'number') {
        d = new Date(ts);
    } else {
        d = new Date(ts);
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

async function loadMapsList() {
    try {
        const maps = await loadMapsFromCloud();
        mapsList.innerHTML = '';

        if (maps.length === 0) {
            mapsList.innerHTML = '<div class="list-group-item">Nenhum mapa encontrado.</div>';
            return;
        }

        maps.forEach(map => {
            const item = document.createElement('div');
            item.className = 'list-group-item map-item';
            
            // Elemento do nome clicável para carregar
            const nameSpan = document.createElement('span');
            nameSpan.className = 'map-item-name';
            nameSpan.textContent = map.name;
            nameSpan.addEventListener('click', () => {
                deserializeLayout(map.elements);
                state.selectedTable = null;
                sidebar.classList.remove('show');
                clearHistory();
                draw();
                // Marca que o mapa atual foi carregado da nuvem
                state.currentCloudMapId = map.id || null;
                // Atualiza o campo de nome da toolbar com o nome do mapa
                toolbarMapName.value = map.name || 'Novo Mapeamento';
                hideCloudModal();
            });

            // Data formatada do último salvamento
            const dateSpan = document.createElement('span');
            dateSpan.className = 'map-item-date';
            dateSpan.textContent = formatDate(map.date);
            dateSpan.title = dateSpan.textContent;
            
            // Container de ações
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'map-item-actions';
            
            // Botão renomear
            const renameBtn = document.createElement('button');
            renameBtn.className = 'btn btn-sm btn-warning';
            renameBtn.title = 'Renomear mapa';
            renameBtn.innerHTML = '<i class="fas fa-pencil" style="font-size: 14px;"></i>';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Usar o modal de salvar para renomear
                saveMode = 'rename';
                pendingRenameMapId = map.id;
                mapNameInput.value = map.name || '';
                showCloudModal(true);
            });
            
            // Botão excluir
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.title = 'Excluir mapa';
            deleteBtn.innerHTML = '<i class="fas fa-trash" style="font-size: 14px;"></i>';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza que deseja excluir "${map.name}"?`)) {
                    try {
                        await deleteMapFromCloud(map.id);
                        await loadMapsList(); // Recarrega lista
                    } catch (error) {
                        cloudError.textContent = 'Erro ao excluir mapa.';
                        cloudError.style.display = 'block';
                    }
                }
            });
            
            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);
            
            item.appendChild(nameSpan);
            item.appendChild(dateSpan);
            item.appendChild(actionsDiv);
            mapsList.appendChild(item);
        });
    } catch (error) {
        cloudError.textContent = 'Erro ao carregar mapas.';
        cloudError.style.display = 'block';
    }
}

if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getCanvasCoords(e);
        temporaryShiftSelection = state.mode === 'select' && e.shiftKey;
        const clickedTable = findTableAt(x, y);
        if (clickedTable?.groupId && !temporaryShiftSelection && (state.mode === 'select' || state.mode === 'multi')) {
            selectLockedGroup(clickedTable);
            state.selectedTable = clickedTable;
            pendingDragX = clickedTable.x;
            pendingDragY = clickedTable.y;
            groupDragOffsets = state.selectedTables.map(table => ({ table, x: table.x, y: table.y }));
            dragHistorySnapshot = captureHistoryState();
            state.isDragging = true;
            state.dragOffsetX = x - clickedTable.x;
            state.dragOffsetY = y - clickedTable.y;
            state.isPanning = false;
            draw();
            return;
        }
        if (state.selectedTables.length && !state.selectedTables.includes(clickedTable)) {
            state.mode = 'select';
            state.selectedTables = [];
            state.selectedTable = null;
            state.groupLocked = false;
            temporaryShiftSelection = false;
            updateFloatingLockIcon();
            hideObjectToolbar();
            if (canvas) canvas.style.cursor = 'crosshair';
        }
        if ((state.mode === 'multi' || temporaryShiftSelection) && !(state.selectedTables.length && state.selectedTables.includes(clickedTable))) {
            multiSelectionStart = { x, y };
            state.multiSelectionRect = { x, y, width: 0, height: 0 };
            state.isPanning = false;
            state.isDragging = false;
            draw();
        } else if ((state.mode === 'select' || state.mode === 'multi') && state.selectedTables.length) {
            const selectedTable = findTableAt(x, y);
            if (selectedTable && state.selectedTables.includes(selectedTable)) {
                state.selectedTable = selectedTable;
                pendingDragX = selectedTable.x;
                pendingDragY = selectedTable.y;
                groupDragOffsets = state.selectedTables.map(table => ({ table, x: table.x, y: table.y }));
                dragHistorySnapshot = captureHistoryState();
                state.isDragging = true;
                state.dragOffsetX = x - selectedTable.x;
                state.dragOffsetY = y - selectedTable.y;
                state.isPanning = false;
            }
        } else if (state.mode === 'select') {
            let found = false;
            let selectedTable = null;
            selectedTable = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
            if (!selectedTable) {
                selectedTable = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
            }
            if (!selectedTable) {
                selectedTable = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
            }
            if (!selectedTable) {
                selectedTable = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
            }
            if (selectedTable) {
                if (selectLockedGroup(selectedTable)) {
                    draw();
                    return;
                }
                state.selectedTables = [];
                state.groupLocked = false;
                state.selectedTable = selectedTable;
                pendingDragX = selectedTable.x;
                pendingDragY = selectedTable.y;
                dragHistorySnapshot = captureHistoryState();
                dragSnapTargets = state.tables
                    .filter(table => table !== selectedTable)
                    .map(table => ({ x: table.x, y: table.y }));
                state.isDragging = true;
                state.dragOffsetX = x - selectedTable.x;
                state.dragOffsetY = y - selectedTable.y;
                selectTable(selectedTable, false);
                found = true;
                state.isPanning = false;
            } else {
                state.selectedTables = [];
                state.groupLocked = false;
                selectTable(null);
                state.isPanning = true;
                state.panLastX = e.clientX;
                state.panLastY = e.clientY;
            }
            draw();
        } else if (state.mode === 'delete') {
            let tableToDelete = null;
            tableToDelete = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
            if (!tableToDelete) {
                tableToDelete = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
            }
            if (!tableToDelete) {
                tableToDelete = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
            }
            if (!tableToDelete) {
                tableToDelete = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
            }
            if (tableToDelete) {
                recordHistory();
                const index = state.tables.indexOf(tableToDelete);
                state.tables.splice(index, 1);
                draw();
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (multiSelectionStart) {
            const { x, y } = getCanvasCoords(e);
            state.multiSelectionRect = {
                x: Math.min(multiSelectionStart.x, x),
                y: Math.min(multiSelectionStart.y, y),
                width: Math.abs(x - multiSelectionStart.x),
                height: Math.abs(y - multiSelectionStart.y)
            };
            draw();
        } else if (state.isDragging && state.selectedTable) {
            const { x, y } = getCanvasCoords(e);
            let newX = x - state.dragOffsetX;
            let newY = y - state.dragOffsetY;
            scheduleDragUpdate(newX, newY);
        } else if (state.isPanning) {
            const deltaX = e.clientX - state.panLastX;
            const deltaY = e.clientY - state.panLastY;
            state.canvasOffsetX += deltaX;
            state.canvasOffsetY += deltaY;
            state.panLastX = e.clientX;
            state.panLastY = e.clientY;
            draw();
        } else {
            const { x, y } = getCanvasCoords(e);
            let hoveredTable = null;
            hoveredTable = state.tables.find(t => t.type === 'label' && t.isPointInside(x, y));
            if (!hoveredTable) {
                hoveredTable = state.tables.find(t => (t.type === 'seat' || t.type === 'roundSeat') && t.isPointInside(x, y));
            }
            if (!hoveredTable) {
                hoveredTable = state.tables.find(t => (t.type === 'square' || t.type === 'round') && t.isPointInside(x, y));
            }
            if (!hoveredTable) {
                hoveredTable = state.tables.find(t => (t.type === 'customArea' || t.type === 'customCircleArea') && t.isPointInside(x, y));
            }
            if (state.hoveredTable !== hoveredTable) {
                state.hoveredTable = hoveredTable;
                draw();
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (multiSelectionStart) {
            if (state.multiSelectionRect.width > 4 && state.multiSelectionRect.height > 4) {
                selectTablesInRect(state.multiSelectionRect);
                state.groupLocked = false;
            }
            multiSelectionStart = null;
            state.multiSelectionRect = null;
            temporaryShiftSelection = false;
            draw();
            return;
        }
        flushPendingDrag();
        if (dragHistorySnapshot && dragHistorySnapshot !== captureHistoryState()) {
            recordHistory(dragHistorySnapshot);
        }
        dragHistorySnapshot = null;
        state.isDragging = false;
        groupDragOffsets = [];
        state.isPanning = false;
        state.alignmentLine = null;
        if (state.selectedTable && posXInput && posYInput) {
            posXInput.value = Math.round(state.selectedTable.x);
            posYInput.value = Math.round(state.selectedTable.y);
        }
        if (state.selectedTables.length) {
            updateMultiToolbarPosition();
        } else if (state.selectedTable && state.mode === 'select') {
            updateObjectToolbarPosition();
        }
        draw();
    });

    canvas.addEventListener('mouseleave', () => {
        multiSelectionStart = null;
        state.multiSelectionRect = null;
        temporaryShiftSelection = false;
        flushPendingDrag();
        if (dragHistorySnapshot && dragHistorySnapshot !== captureHistoryState()) {
            recordHistory(dragHistorySnapshot);
        }
        dragHistorySnapshot = null;
        state.isDragging = false;
        groupDragOffsets = [];
        state.isPanning = false;
        state.alignmentLine = null;
        state.hoveredTable = null;
        draw();
    });
}

// Zoom via roda do mouse: sincroniza com o slider e centraliza no cursor
function handleCanvasWheel(e) {
    e.preventDefault();
    const step = 5; // percent per wheel step
    const deltaSign = Math.sign(e.deltaY); // positive => scroll down (zoom out)
    const newValue = zoomPercent - deltaSign * ZOOM_STEP;
    applyZoomPercent(newValue, e.clientX, e.clientY);
}

if (canvas) canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

if (toggleDrawerBtn) toggleDrawerBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
});

if (selectModeBtn) selectModeBtn.addEventListener('click', () => {
    state.mode = 'select';
    state.selectedTables = [];
    state.groupLocked = false;
    floatingDeleteBtn.style.display = '';
    updateFloatingLockIcon();
    hideObjectToolbar();
    if (canvas) canvas.style.cursor = 'crosshair';
});

if (multiSelectModeBtn) multiSelectModeBtn.addEventListener('click', () => {
    state.mode = 'multi';
    state.selectedTable = null;
    sidebar.classList.remove('show');
    floatingDeleteBtn.style.display = 'none';
    updateFloatingLockIcon();
    if (canvas) canvas.style.cursor = 'crosshair';
    draw();
});

if (deleteModeBtn) deleteModeBtn.addEventListener('click', () => {
    state.mode = 'delete';
    state.selectedTables = [];
    state.groupLocked = false;
    hideObjectToolbar();
    floatingDeleteBtn.style.display = '';
    updateFloatingLockIcon();
    if (canvas) canvas.style.cursor = 'pointer';
});

function getTableBounds(table) {
    const halfWidth = table.width ? table.width / 2 : (table.radius || 0);
    const halfHeight = table.height ? table.height / 2 : (table.radius || 0);
    const angle = (table.angle || 0) * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(angle) * halfWidth) + Math.abs(Math.sin(angle) * halfHeight);
    const rotatedHeight = Math.abs(Math.sin(angle) * halfWidth) + Math.abs(Math.cos(angle) * halfHeight);
    return { left: table.x - rotatedWidth, right: table.x + rotatedWidth, top: table.y - rotatedHeight, bottom: table.y + rotatedHeight };
}

function findTableAt(x, y) {
    return [...state.tables].reverse().find(table => table.isPointInside(x, y));
}

function updateMultiToolbarPosition() {
    if (!objectToolbar || !state.selectedTables.length) return;
    floatingDeleteBtn.style.display = 'none';
    floatingLockBtn.style.display = '';
    updateFloatingLockIcon();
    const rect = canvas.getBoundingClientRect();
    const center = state.selectedTables.reduce((sum, table) => ({ x: sum.x + table.x, y: sum.y + table.y }), { x: 0, y: 0 });
    center.x /= state.selectedTables.length;
    center.y /= state.selectedTables.length;
    objectToolbar.style.left = `${rect.left + state.canvasOffsetX + center.x * state.canvasScale}px`;
    objectToolbar.style.top = `${Math.max(66, rect.top + state.canvasOffsetY + center.y * state.canvasScale - 80)}px`;
    objectToolbar.classList.add('show');
}

function clearMultiSelection() {
    state.selectedTables = [];
    state.groupLocked = false;
    if (state.mode === 'multi') hideObjectToolbar();
}

function selectTablesInRect(rect) {
    state.selectedTables = state.tables.filter(table => {
        const bounds = getTableBounds(table);
        return bounds.left >= rect.x && bounds.right <= rect.x + rect.width && bounds.top >= rect.y && bounds.bottom <= rect.y + rect.height;
    });
    state.selectedTable = null;
    sidebar.classList.remove('show');
    if (state.selectedTables.length) updateMultiToolbarPosition();
}

function cloneTable(table, x, y, name = table.name) {
    return new table.constructor(table.type, x, y, table.width, table.height, table.radius, table.angle, table.color, name, table.seats, table.nameColor, table.cornerSeats, table.seatColor, table.counterEnabled, table.fontSize, table.isHalfCircle);
}

function serializeGroup(tables) {
    const center = tables.reduce((sum, table) => ({ x: sum.x + table.x, y: sum.y + table.y }), { x: 0, y: 0 });
    center.x /= tables.length;
    center.y /= tables.length;
    return {
        type: 'group',
        x: center.x,
        y: center.y,
        items: tables.map(table => ({ ...serializeTableItem(table), x: table.x - center.x, y: table.y - center.y }))
    };
}

function createTablesFromSavedGroup(itemData) {
    const group = typeof itemData.item === 'string' ? JSON.parse(itemData.item) : itemData.item;
    const center = getWindowCenterCanvasCoords();
    const groupId = `saved-group-${nextGroupId++}`;
    return group.items.map(item => {
        const table = new Table(item.type, center.x + item.x, center.y + item.y, item.width, item.height, item.radius, item.angle, item.color, item.name, item.seats, item.nameColor, item.cornerSeats, item.seatColor, item.counterEnabled, item.fontSize, item.isHalfCircle);
        table.groupId = groupId;
        return table;
    });
}

function duplicateSelectedGroup() {
    if (!state.selectedTables.length) return;
    recordHistory();
    const copies = state.selectedTables.map(table => cloneTable(table, table.x + 50, table.y + 50, table.name));
    const groupId = `group-${nextGroupId++}`;
    copies.forEach(table => { table.groupId = groupId; });
    state.tables.push(...copies);
    state.selectedTables = copies;
    state.selectedTable = null;
    updateMultiToolbarPosition();
    draw();
}

function rotateSelectedGroup(step) {
    if (!state.selectedTables.length) return;
    recordHistory();
    if (!state.groupLocked) {
        state.selectedTables.forEach(table => { table.angle = Math.max(-180, Math.min(180, table.angle + step)); });
    } else {
        const center = state.selectedTables.reduce((sum, table) => ({
            x: sum.x + table.x,
            y: sum.y + table.y
        }), { x: 0, y: 0 });
        center.x /= state.selectedTables.length;
        center.y /= state.selectedTables.length;

        const pivot = state.selectedTables.reduce((closest, table) => {
            const tableDistance = Math.hypot(table.x - center.x, table.y - center.y);
            const closestDistance = Math.hypot(closest.x - center.x, closest.y - center.y);
            return tableDistance < closestDistance ? table : closest;
        });
        const rotation = step * Math.PI / 180;
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);

        state.selectedTables.forEach(table => {
            const relativeX = table.x - pivot.x;
            const relativeY = table.y - pivot.y;
            table.x = pivot.x + relativeX * cosine - relativeY * sine;
            table.y = pivot.y + relativeX * sine + relativeY * cosine;
            table.angle = Math.max(-180, Math.min(180, table.angle + step));
        });
    }
    updateMultiToolbarPosition();
    draw();
}

function selectLockedGroup(table) {
    if (!table?.groupId) return false;
    const group = state.tables.filter(candidate => candidate.groupId === table.groupId);
    if (!group.length) return false;
    state.selectedTables = group;
    state.selectedTable = null;
    state.groupLocked = true;
    updateFloatingLockIcon();
    sidebar.classList.remove('show');
    updateMultiToolbarPosition();
    return true;
}

async function saveSelectedGroup() {
    if (!state.selectedTables.length) return;
    if (!state.currentUser) { showAuthModal(); return; }
    groupToSave = state.selectedTables.slice();
    showSavedItemModal(null, 'Meu agrupamento', true);
}

// Zoom buttons handlers
function zoomFromCenter(direction) {
    const rect = canvas.getBoundingClientRect();
    applyZoomPercent(zoomPercent + direction * ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
}
if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomFromCenter(1));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomFromCenter(-1));
if (menuZoomInBtn) menuZoomInBtn.addEventListener('click', () => zoomFromCenter(1));
if (menuZoomOutBtn) menuZoomOutBtn.addEventListener('click', () => zoomFromCenter(-1));
if (showGridBtn) showGridBtn.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    showGridBtn.innerHTML = state.showGrid
        ? '<i class="fas fa-border-all me-2"></i>Ocultar grade'
        : '<i class="fas fa-border-all me-2"></i>Mostrar grade';
    draw();
});
if (showMeasuresBtn) showMeasuresBtn.addEventListener('click', () => {
    state.showMeasures = !state.showMeasures;
    showMeasuresBtn.innerHTML = state.showMeasures
        ? '<i class="fas fa-ruler me-2"></i>Ocultar medidas'
        : '<i class="fas fa-ruler me-2"></i>Mostrar medidas';
    draw();
});

function setInitialZoom() {
    zoomPercent = 100;
    state.canvasScale = zoomPercent * 0.004;
}
setInitialZoom();
// Ensure zoom controls are positioned correctly on load and resize
updateZoomControlsPosition();
window.addEventListener('resize', updateZoomControlsPosition);
window.addEventListener('resize', updateObjectToolbarPosition);

function getWindowCenterCanvasCoords() {
    const rect = canvas.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return {
        x: (centerX - rect.left - state.canvasOffsetX) / state.canvasScale,
        y: (centerY - rect.top - state.canvasOffsetY) / state.canvasScale,
    };
}

if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir todas as mesas?')) {
        if (state.tables.length) recordHistory();
        state.tables = [];
        state.nextTableNumber = 1;
        state.selectedTable = null;
        sidebar.classList.remove('show');
        draw();
    }
});

// Acoes de arquivo da toolbar
if (saveAsNewBtn) {
    saveAsNewBtn.addEventListener('click', (e) => {
        saveMode = 'cloud-new';
        pendingRenameMapId = null;
        mapNameInput.value = toolbarMapName.value || 'Novo Mapeamento';
        showCloudModal(true);
    });
}
if (fileInput) fileInput.addEventListener('change', handleFileInputChange);

// Toolbar file actions
if (newMapBtn) newMapBtn.addEventListener('click', () => {
    const wantToSave = confirm('Deseja salvar o mapa atual antes de criar um novo? OK = Salvar, Cancel = Não salvar');
    if (wantToSave) {
        pendingNewAfterSave = true;
        saveMode = 'cloud';
        showCloudModal(true);
    } else {
        if (confirm('Tem certeza que deseja criar um novo mapa? Isso apagará o atual.')) {
            state.tables = [];
            state.nextTableNumber = 1;
            state.selectedTable = null;
            state.currentCloudMapId = null;
            sidebar.classList.remove('show');
            if (toolbarMapName) toolbarMapName.value = 'Novo mapa';
            clearHistory();
            draw();
        }
    }
});

if (openMapBtn) openMapBtn.addEventListener('click', () => showCloudModal(false));
if (saveBtn) saveBtn.addEventListener('click', () => { saveMode = 'cloud'; showCloudModal(true); });
if (saveAsBtn) saveAsBtn.addEventListener('click', () => { saveMode = 'cloud-new'; showCloudModal(true); });
if (importBtn) importBtn.addEventListener('click', () => fileInput.click());
if (exportPngBtn) exportPngBtn.addEventListener('click', downloadCanvasPng);
if (exportJpgBtn) exportJpgBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    const base = (toolbarMapName && toolbarMapName.value) ? toolbarMapName.value.trim() : 'layout';
    const safe = base.replace(/[<>:\\"/\\|?*\x00-\x1F]/g, '_') || 'layout';
    link.download = `${safe}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
});
if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
    downloadJson();
});

// Handle export submenu (prevent parent dropdown from closing)
const exportMenuBtnEl = document.getElementById('exportMenuBtn');
if (exportMenuBtnEl) {
    const submenu = exportMenuBtnEl.nextElementSibling;
    exportMenuBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // close other open submenus
        document.querySelectorAll('.dropdown-menu .dropdown-menu.show').forEach(m => m.classList.remove('show'));
        if (submenu) submenu.classList.toggle('show');
    });
    const parentDropdown = exportMenuBtnEl.closest('.dropdown');
    if (parentDropdown) parentDropdown.addEventListener('hide.bs.dropdown', () => {
        if (submenu) submenu.classList.remove('show');
    });
    // close submenu when clicking elsewhere
    document.addEventListener('click', () => {
        if (submenu) submenu.classList.remove('show');
    });
}

if (undoBtn) undoBtn.addEventListener('click', undo);
if (redoBtn) redoBtn.addEventListener('click', redo);
document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
    } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
    }
});
updateHistoryButtons();

nameInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.name = nameInput.value;
        draw();
    }
});

posXInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.x = Number(posXInput.value) || 0;
        draw();
    }
});

posYInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.y = Number(posYInput.value) || 0;
        draw();
    }
});

function clampNumberInput(input, value) {
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    return Math.max(min, Math.min(max, value));
}

document.querySelectorAll('[data-step-target]').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.stepTarget);
        if (!input) return;
        const current = Number(input.value) || 0;
        input.value = clampNumberInput(input, current + Number(button.dataset.step));
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
});

function updateColorHex(inputId, hexId) {
    const input = document.getElementById(inputId);
    const hexInput = document.getElementById(hexId);
    if (!input || !hexInput) return;
    hexInput.value = input.value.toUpperCase();
}

function bindHexColorInput(inputId, hexId) {
    const input = document.getElementById(inputId);
    const hexInput = document.getElementById(hexId);
    if (!input || !hexInput) return;
    hexInput.addEventListener('change', () => {
        const value = hexInput.value.trim();
        if (/^#[0-9a-f]{6}$/i.test(value)) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            updateColorHex(inputId, hexId);
        }
    });
}

bindHexColorInput('color', 'colorHex');
bindHexColorInput('nameColor', 'nameColorHex');
bindHexColorInput('seatColor', 'seatColorHex');

document.querySelectorAll('.color-swatches').forEach(group => {
    const targetId = group.dataset.colorTarget;
    group.querySelectorAll('[data-color]').forEach(swatch => {
        swatch.style.setProperty('--swatch-color', swatch.dataset.color);
        swatch.addEventListener('click', () => {
            const input = document.getElementById(targetId);
            if (!input) return;
            input.value = swatch.dataset.color;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            updateColorHex(targetId, `${targetId}Hex`);
        });
    });
});

fontSizeInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.fontSize = parseInt(fontSizeInput.value, 10);
        draw();
    }
});

widthInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'square' || state.selectedTable.type === 'seat' || state.selectedTable.type === 'customArea')) {
        recordHistory();
        state.selectedTable.width = parseInt(widthInput.value, 10);
        updateMaxSeats(state.selectedTable);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

heightInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'square' || state.selectedTable.type === 'seat' || state.selectedTable.type === 'customArea')) {
        recordHistory();
        state.selectedTable.height = parseInt(heightInput.value, 10);
        updateMaxSeats(state.selectedTable);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

radiusInput.addEventListener('input', () => {
    if (state.selectedTable && (state.selectedTable.type === 'round' || state.selectedTable.type === 'roundSeat' || state.selectedTable.type === 'customCircleArea')) {
        recordHistory();
        state.selectedTable.radius = parseInt(radiusInput.value, 10);
        updateMaxSeats(state.selectedTable);
        draw();
    }
});

halfCircleInput.addEventListener('change', () => {
    if (state.selectedTable && state.selectedTable.type === 'customCircleArea') {
        recordHistory();
        state.selectedTable.isHalfCircle = halfCircleInput.checked;
        draw();
    }
});

angleInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.angle = parseInt(angleInput.value, 10);
        angleNumberInput.value = angleInput.value;
        draw();
    }
});

angleNumberInput.addEventListener('input', () => {
    if (state.selectedTable) {
        let value = parseInt(angleNumberInput.value, 10);
        if (isNaN(value)) value = 0;
        if (value < -180) value = -180;
        if (value > 180) value = 180;
        recordHistory();
        state.selectedTable.angle = value;
        angleInput.value = value;
        angleNumberInput.value = value;
        draw();
    }
});

colorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.color = colorInput.value;
        updateColorHex('color', 'colorHex');
        draw();
    }
});

nameColorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.nameColor = nameColorInput.value;
        updateColorHex('nameColor', 'nameColorHex');
        draw();
    }
});

seatColorInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.seatColor = seatColorInput.value;
        updateColorHex('seatColor', 'seatColorHex');
        draw();
    }
});

counterEnabledInput.addEventListener('change', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.counterEnabled = counterEnabledInput.checked;
        draw();
    }
});

seatsInput.addEventListener('input', () => {
    if (state.selectedTable) {
        recordHistory();
        state.selectedTable.seats = parseInt(seatsInput.value, 10);
        updateSeatWarning(state.selectedTable);
        draw();
    }
});

cornerSeatsInput.addEventListener('change', () => {
    if (state.selectedTable) {
        recordHistory();
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

    recordHistory();
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

if (deleteBtn) deleteBtn.addEventListener('click', () => {
    if (!state.selectedTable) {
        return;
    }

    recordHistory();
    const index = state.tables.indexOf(state.selectedTable);
    if (index > -1) {
        state.tables.splice(index, 1);
    }
    selectTable(null);
    draw();
});

function rotateSelectedTable(step) {
    if (!state.selectedTable) return;
    recordHistory();
    const nextAngle = Math.max(-180, Math.min(180, state.selectedTable.angle + step));
    state.selectedTable.angle = nextAngle;
    angleInput.value = nextAngle;
    angleNumberInput.value = nextAngle;
    updateObjectToolbarPosition();
    draw();
}

if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => state.selectedTables.length ? rotateSelectedGroup(-45) : rotateSelectedTable(-45));
if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => state.selectedTables.length ? rotateSelectedGroup(45) : rotateSelectedTable(45));
if (floatingDuplicateBtn) floatingDuplicateBtn.addEventListener('click', () => state.selectedTables.length ? duplicateSelectedGroup() : duplicateBtn && duplicateBtn.click());
if (floatingSaveBtn) floatingSaveBtn.addEventListener('click', () => state.selectedTables.length ? saveSelectedGroup() : saveSelectedItem());
if (floatingLockBtn) floatingLockBtn.addEventListener('click', () => {
    if (!state.selectedTables.length) return;
    state.groupLocked = !state.groupLocked;
    if (state.groupLocked) {
        const groupId = `group-${nextGroupId++}`;
        state.selectedTables.forEach(table => { table.groupId = groupId; });
    } else {
        state.selectedTables.forEach(table => { delete table.groupId; });
    }
    updateFloatingLockIcon();
});
if (floatingDeleteBtn) floatingDeleteBtn.addEventListener('click', () => deleteBtn && deleteBtn.click());
if (toolbarUndoBtn) toolbarUndoBtn.addEventListener('click', undo);
if (toolbarRedoBtn) toolbarRedoBtn.addEventListener('click', redo);
if (saveItemBtn) saveItemBtn.addEventListener('click', saveSelectedItem);
if (closeSavedItemModal) closeSavedItemModal.addEventListener('click', hideSavedItemModal);
if (cancelSavedItemBtn) cancelSavedItemBtn.addEventListener('click', hideSavedItemModal);
if (saveSavedItemBtn) saveSavedItemBtn.addEventListener('click', saveEditedItemName);
if (deleteSavedItemBtn) deleteSavedItemBtn.addEventListener('click', deleteSelectedSavedItem);
if (savedItemModal) savedItemModal.addEventListener('click', event => {
    if (event.target === savedItemModal) hideSavedItemModal();
});

[rotateLeftBtn, rotateRightBtn, floatingDuplicateBtn, floatingSaveBtn, floatingLockBtn, floatingDeleteBtn, toolbarUndoBtn, toolbarRedoBtn, saveItemBtn].forEach(button => {
    if (button) button.addEventListener('mousedown', event => event.stopPropagation());
});

document.addEventListener('mousedown', event => {
    if (objectToolbar && !objectToolbar.contains(event.target)) {
        hideObjectToolbar();
    }
    if (state.selectedTables.length && !canvas.contains(event.target)) {
        state.selectedTables = [];
        state.selectedTable = null;
        state.groupLocked = false;
        state.mode = 'select';
        if (canvas) canvas.style.cursor = 'crosshair';
    }
});

if (addSquareBtn) addSquareBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const table = new Table('square', x, y, 150, 150, 0, 0, '#a3a3a3', String(state.nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    state.tables.push(table);
    selectTable(table);
    draw();
});
if (addRoundBtn) addRoundBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const table = new Table('round', x, y, 0, 0, 60, 0, '#a3a3a3', String(state.nextTableNumber++), 8, '#000000', true, '#e7e7e7');
    state.tables.push(table);
    selectTable(table);
    draw();
});
if (addSeatBtn) addSeatBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const seat = new Table('seat', x, y, 40, 40, 0, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    state.tables.push(seat);
    selectTable(seat);
    draw();
});

if (addRoundSeatBtn) addRoundSeatBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const roundSeat = new Table('roundSeat', x, y, 0, 0, 20, 0, '#e7e7e7', '', 1, '#000000', false, '#e7e7e7');
    state.tables.push(roundSeat);
    selectTable(roundSeat);
    draw();
});

if (addCustomAreaBtn) addCustomAreaBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const customArea = new Table('customArea', x, y, 300, 300, 0, 0, '#8B4513', 'Área Customizada', 0, '#000000', false, '#e7e7e7', false, 54);
    state.tables.push(customArea);
    selectTable(customArea);
    draw();
});

if (addCustomCircleAreaBtn) addCustomCircleAreaBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const customCircleArea = new Table('customCircleArea', x, y, 0, 0, 150, 0, '#8B4513', 'Área Circular Customizada', 0, '#000000', false, '#e7e7e7', false, 54, false);
    state.tables.push(customCircleArea);
    selectTable(customCircleArea);
    draw();
});

if (addLabelBtn) addLabelBtn.addEventListener('click', () => {
    const { x, y } = getWindowCenterCanvasCoords();
    recordHistory();
    const label = new Table('label', x, y, 0, 0, 0, 0, '#000000', 'Etiqueta', 0, '#000000', false, '#e7e7e7', false, 54);
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
    // Posicionar o popover abaixo do contador
    const rect = seatCounter.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.display = 'block';
});

if (seatCounter) seatCounter.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
});

// Esconder tooltip em scroll/resize para evitar artefatos
window.addEventListener('scroll', () => { tooltip.style.display = 'none'; }, { passive: true });
window.addEventListener('resize', () => { tooltip.style.display = 'none'; });

if (loginBtn) loginBtn.addEventListener('click', showAuthModal);
if (closeAuthModal) closeAuthModal.addEventListener('click', hideAuthModal);
if (authModal) authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        hideAuthModal();
    }
});

// Definir data máxima de nascimento como hoje
const today = new Date().toISOString().split('T')[0];
const registerBirthdayInput = document.getElementById('registerBirthday');
if (registerBirthdayInput) {
    registerBirthdayInput.max = today;
}

if (loginTab) loginTab.addEventListener('click', switchToLogin);
if (registerTab) registerTab.addEventListener('click', switchToRegister);

// Login with Enter key
if (document.getElementById('loginPassword')) {
    document.getElementById('loginEmail').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('loginForm').style.display !== 'none') {
            if (loginSubmit) loginSubmit.click();
        }
    });
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('loginForm').style.display !== 'none') {
            if (loginSubmit) loginSubmit.click();
        }
    });
}

// Register with Enter key
if (document.getElementById('registerBirthday')) {
    document.getElementById('registerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('registerForm').style.display !== 'none') {
            if (registerSubmit) registerSubmit.click();
        }
    });
    document.getElementById('registerEmail').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('registerForm').style.display !== 'none') {
            if (registerSubmit) registerSubmit.click();
        }
    });
    document.getElementById('registerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('registerForm').style.display !== 'none') {
            if (registerSubmit) registerSubmit.click();
        }
    });
    document.getElementById('registerBirthday').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.getElementById('registerForm').style.display !== 'none') {
            if (registerSubmit) registerSubmit.click();
        }
    });
}

if (loginSubmit) loginSubmit.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Limpar erro anterior
    loginError.textContent = '';
    loginError.style.display = 'none';
    
    try {
        await loginUser(email, password);
        hideAuthModal();
    } catch (error) {
        loginError.textContent = error.message;
        loginError.style.display = 'block';
    }
});

// Register handler
if (registerSubmit) registerSubmit.addEventListener('click', async () => {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const birthday = document.getElementById('registerBirthday').value;
    const birthdayInput = document.getElementById('registerBirthday');
    
    // Limpar erro anterior
    registerError.textContent = '';
    registerError.style.display = 'none';
    
    // Validação de campos vazios
    if (!name || !email || !password || !birthday) {
        registerError.textContent = 'Por favor, preencha todos os campos.';
        registerError.style.display = 'block';
        return;
    }
    
    // Validação de data de nascimento
    const birthDate = new Date(birthday);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (birthDate >= today) {
        registerError.textContent = 'A data de nascimento não pode ser no futuro.';
        registerError.style.display = 'block';
        birthdayInput.focus();
        return;
    }
    
    // Validação de idade mínima (opcional: verificar se tem pelo menos 13 anos)
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        // Se ainda não completou aniversário este ano
    }
    
    try {
        await registerUser(name, email, password, birthday);
        hideAuthModal();
    } catch (error) {
        registerError.textContent = error.message;
        registerError.style.display = 'block';
    }
});

// Google login
if (googleLogin) googleLogin.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
        hideAuthModal();
    } catch (error) {
        loginError.textContent = error.message;
    }
});

// Logout
if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try {
        // Atualizar UI imediatamente ANTES de fazer logout
        updateUIForUser(null);
        
        await logoutUser();
        hideAuthModal();
    } catch (error) {
        console.error(error);
    }
});

saveCloudSubmit.addEventListener('click', async () => {
    const name = mapNameInput.value.trim();
    if (!name) {
        cloudError.textContent = 'Nome do mapa é obrigatório.';
        cloudError.style.display = 'block';
        return;
    }
    try {
        if (saveMode === 'rename' && pendingRenameMapId) {
            await renameMapInCloud(pendingRenameMapId, name);
            pendingRenameMapId = null;
            saveMode = 'cloud';
            // Se o mapa renomeado for o carregado atualmente, atualiza toolbar
            if (state.currentCloudMapId) toolbarMapName.value = name;
            hideCloudModal();
            await loadMapsList();
            alert('Mapa renomeado com sucesso!');
        } else if (saveMode === 'cloud-new') {
            // Força criação de novo mapa na nuvem
            const newId = await saveMapToCloud(name, null);
            state.currentCloudMapId = newId;
            toolbarMapName.value = name;
            hideCloudModal();
            await loadMapsList();
            finishPendingNewIfRequested();
            alert('Mapa salvo como novo com sucesso!');
        } else {
            // default: salvar na nuvem — sobrescreve se o mapa atual foi carregado da nuvem
            if (state.currentCloudMapId) {
                await saveMapToCloud(name, state.currentCloudMapId);
            } else {
                const newId = await saveMapToCloud(name, null);
                state.currentCloudMapId = newId;
            }
            toolbarMapName.value = name;
            hideCloudModal();
            await loadMapsList();
            finishPendingNewIfRequested();
            alert('Mapa salvo com sucesso!');
        }
    } catch (error) {
        cloudError.textContent = 'Erro ao salvar mapa.';
        cloudError.style.display = 'block';
    }
});
closeCloudModal.addEventListener('click', hideCloudModal);
cloudModal.addEventListener('click', (e) => {
    if (e.target === cloudModal) {
        hideCloudModal();
    }
});
