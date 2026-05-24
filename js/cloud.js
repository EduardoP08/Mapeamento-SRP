import { db } from '../firebase.js';
import { state } from './state.js';
import { serializeLayout } from './layout.js';
import { doc, setDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

export async function saveMapToCloud(name) {
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

    await setDoc(doc(collection(db, 'maps')), mapData);
    return true;
}

export async function loadMapsFromCloud() {
    if (!state.currentUser) {
        return [];
    }

    const q = query(collection(db, 'maps'), where('user.id', '==', state.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const maps = [];
    querySnapshot.forEach((docItem) => {
        maps.push({ id: docItem.id, ...docItem.data() });
    });
    return maps;
}
