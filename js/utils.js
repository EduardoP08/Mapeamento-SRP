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

export function getCloudSaveErrorMessage(error) {
    switch (error?.code) {
        case 'unauthenticated':
            return 'Sua sessão expirou. Entre novamente para salvar o mapa.';
        case 'permission-denied':
            return 'O Firebase recusou o salvamento. Verifique sua conexão e, se persistir, peça ao responsável pelo sistema para revisar as permissões do Firestore.';
        case 'unavailable':
        case 'deadline-exceeded':
            return 'Não foi possível conectar ao Firebase. Verifique sua conexão com a internet e tente novamente.';
        case 'invalid-argument':
            return 'Os dados do mapa foram recusados. Revise o nome do mapa e tente novamente.';
        default:
            return `Não foi possível salvar o mapa.${error?.message ? ` Detalhe: ${error.message}` : ' Tente novamente.'}`;
    }
}
