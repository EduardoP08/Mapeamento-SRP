import { db } from '../firebase.js';
import { state } from './state.js';
import { serializeLayout } from './layout.js';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function saveMapToCloud(name, mapId = null) {
    if (!state.currentUser) {
        throw new Error('Usuário não autenticado');
    }

    const mapData = {
        name,
        elements: serializeLayout(),
        user: {
            id: state.currentUser.uid,
            name: state.currentUserData?.name,
            email: state.currentUser.email
        }
    };

    // Define timestamp de último salvamento. Usa serverTimestamp() para hora do servidor.
    mapData.date = serverTimestamp();
    // Se for criação, também seta createdAt; se for update, manter o createdAt existente
    if (!mapId) mapData.createdAt = serverTimestamp();

    if (mapId) {
        const mapRef = doc(db, 'maps', mapId);
        // Merge para não sobrescrever campos que não enviamos
        await setDoc(mapRef, mapData, { merge: true });
        return mapId;
    } else {
        const newRef = doc(collection(db, 'maps'));
        await setDoc(newRef, mapData);
        return newRef.id;
    }
}

export async function loadMapsFromCloud() {
    if (!state.currentUser) {
        return [];
    }
    // Busca mapas do usuário; ordenação é feita localmente para evitar necessidade de índice composto
    const q = query(collection(db, 'maps'), where('user.id', '==', state.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const maps = [];
    querySnapshot.forEach((docItem) => {
        maps.push({ id: docItem.id, ...docItem.data() });
    });
    // Ordena localmente por campo `date` (Firestore Timestamp) — docs sem `date` ficam no final
    maps.sort((a, b) => {
        const aMs = a.date && typeof a.date.toMillis === 'function' ? a.date.toMillis() : (a.date ? new Date(a.date).getTime() : 0);
        const bMs = b.date && typeof b.date.toMillis === 'function' ? b.date.toMillis() : (b.date ? new Date(b.date).getTime() : 0);
        return bMs - aMs;
    });
    return maps;
}

export async function renameMapInCloud(mapId, newName) {
    if (!state.currentUser) {
        throw new Error('Usuário não autenticado');
    }
    
    const mapRef = doc(db, 'maps', mapId);
    await updateDoc(mapRef, { name: newName });
    return true;
}

export async function deleteMapFromCloud(mapId) {
    if (!state.currentUser) {
        throw new Error('Usuário não autenticado');
    }
    
    const mapRef = doc(db, 'maps', mapId);
    await deleteDoc(mapRef);
    return true;
}

export async function saveItemToCloud(name, item) {
    if (!state.currentUser) {
        throw new Error('Usuário não autenticado');
    }

    const itemData = {
        item: JSON.stringify(item),
        name,
        user: {
            id: state.currentUser.uid,
            name: state.currentUserData?.name || state.currentUser.displayName || '',
            email: state.currentUser.email || ''
        },
        createdAt: serverTimestamp()
    };

    const itemRef = await addDoc(collection(db, 'items'), itemData);
    return itemRef.id;
}

export async function loadItemsFromCloud() {
    if (!state.currentUser) return [];

    const q = query(collection(db, 'items'), where('user.id', '==', state.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach(itemDoc => {
        const data = itemDoc.data();
        items.push({ id: itemDoc.id, ...data });
    });
    items.sort((first, second) => {
        const firstTime = first.createdAt?.toMillis?.() || 0;
        const secondTime = second.createdAt?.toMillis?.() || 0;
        return secondTime - firstTime;
    });
    return items;
}

export async function renameItemInCloud(itemId, newName) {
    if (!state.currentUser) throw new Error('Usuário não autenticado');
    await updateDoc(doc(db, 'items', itemId), { name: newName });
    return true;
}

export async function deleteItemFromCloud(itemId) {
    if (!state.currentUser) throw new Error('Usuário não autenticado');
    await deleteDoc(doc(db, 'items', itemId));
    return true;
}
