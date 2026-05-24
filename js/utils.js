export function getAuthErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-email':
            return 'Email inválido.';
        case 'auth/user-disabled':
            return 'Usuário desabilitado.';
        case 'auth/user-not-found':
            return 'Usuário não encontrado.';
        case 'auth/wrong-password':
            return 'Senha incorreta.';
        case 'auth/email-already-in-use':
            return 'Email já está em uso.';
        case 'auth/weak-password':
            return 'Senha muito fraca.';
        case 'auth/popup-closed-by-user':
            return 'Popup fechado pelo usuário.';
        case 'auth/cancelled-popup-request':
            return 'Requisição cancelada.';
        case 'auth/popup-blocked':
            return 'Popup bloqueado pelo navegador.';
        default:
            return 'Erro de autenticação.';
    }
}
