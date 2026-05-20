# Mapeamento de Mesas em Eventos

Um aplicativo web para criar e gerenciar layouts de mesas e assentos em eventos.

## Funcionalidades

- **Desenho de Layouts**: Adicione mesas quadradas, redondas, assentos individuais e assentos redondos.
- **Customização**: Ajuste cores, tamanhos, ângulos e outras propriedades dos itens.
- **Zoom**: Controle o nível de zoom do canvas.
- **Salvar/Carregar**: Salve layouts localmente ou na nuvem (requer login).
- **Autenticação**: Login e cadastro com Firebase Authentication.

## Como Usar

1. **Adicionar Itens**:
   - Clique no botão "☰ Menu" para abrir o drawer lateral.
   - Selecione o tipo de item desejado (mesa quadrada, redonda, assento, etc.).

2. **Selecionar e Editar**:
   - Clique no botão "Selecionar" e clique em um item no canvas.
   - Use a barra lateral direita para editar propriedades.

3. **Arquivo**:
   - Clique em "Arquivo" para abrir o menu.
   - **Salvar neste dispositivo**: Baixa o layout como arquivo JSON.
   - **Carregar do dispositivo**: Carrega um arquivo JSON salvo.
   - **Salvar na nuvem**: Salva o layout no Firestore (requer login).
   - **Carregar da nuvem**: Lista e permite carregar layouts salvos (requer login).
   - **Baixar PNG**: Exporta o canvas como imagem.

4. **Autenticação**:
   - Clique em "Entrar" no canto superior direito.
   - Alternar entre Login e Cadastro.
   - **Login**: Use email/senha ou clique em "Entrar com Google".
   - **Cadastro**: Preencha nome, email, senha e data de nascimento.
   - Após login, o botão mostra o nome do usuário.
   - Clique no nome para fazer logout.

## Estrutura do Banco de Dados (Firestore)

- **users**: `name`, `email`, `birthday`
- **maps**: `name`, `elements` (JSON do layout), `user` (objeto com `id`, `name`, `email`)

## Tecnologias

- HTML5, CSS3, JavaScript (ES6+)
- Firebase (Authentication com Email/Password e Google Sign-In, Firestore)
- Canvas API para renderização

## Executando

Abra `index.html` em um navegador web moderno. Para funcionalidades de nuvem, configure o Firebase no arquivo `firebase.js`.

### Configuração do Firebase Console

Para usar a autenticação com Google:

1. No Firebase Console, vá em **Authentication** → **Sign-in method**
2. Ative o provedor **Google**
3. Configure o **Client ID** e **Client Secret** do seu projeto Google Cloud
4. Adicione os domínios autorizados (ex: `localhost`, `127.0.0.1`)