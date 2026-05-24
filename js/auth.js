import { auth, db } from '../firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { state } from './state.js';
import { getAuthErrorMessage } from './utils.js';

export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        const message = error.code ? getAuthErrorMessage(error.code) : error.message;
        throw new Error(message);
    }
}

export async function registerUser(name, email, password, birthday) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
            name,
            email,
            birthday
        });
        return user;
    } catch (error) {
        console.error('Register error:', error);
        const message = error.code ? getAuthErrorMessage(error.code) : error.message;
        throw new Error(message);
    }
}

export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName || '',
                email: user.email,
                birthday: null
            });
        }

        return user;
    } catch (error) {
        console.error('Google login error:', error);
        const message = error.code ? getAuthErrorMessage(error.code) : error.message;
        throw new Error(message);
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

export function initAuthObserver(onStateChanged) {
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    state.currentUserData = userDoc.data();
                }
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
            }
        } else {
            state.currentUserData = null;
        }
        onStateChanged(user);
    });
}
