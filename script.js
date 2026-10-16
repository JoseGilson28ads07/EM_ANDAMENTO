/* =====================================================
   PIT LANE F1: script.js (usado em admin.html)
   Só DOM e Web Storage, sem bibliotecas.
   Tudo fica em UMA chave do localStorage ("usuarios"), com um array em JSON:
   [{ id, data, nome, email }]
   ===================================================== */
"use strict";

// Chave única do localStorage
const CHAVE_STORAGE = "usuarios";

// Confere o formato básico do e-mail: texto@dominio.ext (sem espaços)
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Elementos da página (os ids existem em admin.html)
const formulario = document.getElementById("form-usuario");
const campoNome = document.getElementById("nome-usuario");
const campoEmail = document.getElementById("email-usuario");
const botaoLimpar = document.getElementById("btn-limpar");
const campoPesquisa = document.getElementById("pesquisa");
const botaoExcluirTodos = document.getElementById("btn-excluir-todos");
const lista = document.getElementById("lista-usuarios");
const mensagemVazia = document.getElementById("mensagem-vazia");
const mensagem = document.getElementById("mensagem");

/* ---------- Armazenamento ---------- */

// Lê o array de usuários do localStorage. Se não houver nada ou o JSON estiver quebrado, devolve [].
function carregarUsuarios() {
  try {
    const texto = localStorage.getItem(CHAVE_STORAGE);
    if (texto === null) {
      return [];
    }
    const dados = JSON.parse(texto);
    // Garante que o conteúdo é um array de objetos antes de usar
    return Array.isArray(dados) ? dados.filter((u) => u && typeof u === "object") : [];
  } catch (erro) {
    console.error("Não foi possível ler os usuários do localStorage:", erro);
    return [];
  }
}

// Grava o array inteiro como JSON na chave única. Devolve true se deu certo e false se falhou.
function salvarUsuarios(usuarios) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(usuarios));
    return true;
  } catch (erro) {
    console.error("Não foi possível salvar os usuários no localStorage:", erro);
    return false;
  }
}

/* ---------- Funções de apoio ---------- */

// Gera um id único simples (data em milissegundos + número aleatório)
function gerarId() {
  return Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

// Deixa o texto em minúsculas e sem acentos, para pesquisar sem diferenciar "José" de "jose"
function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Mostra uma mensagem de feedback (erro ou sucesso) no parágrafo role="status"
function mostrarMensagem(texto, ehErro) {
  mensagem.textContent = texto;
  mensagem.classList.toggle("admin-msg--erro", Boolean(ehErro));
}

// Monta um <li> para um usuário. Usa textContent (e não innerHTML), então qualquer "<tag>"
// digitada no nome ou no e-mail aparece como texto e nunca vira HTML (evita injeção de HTML).
function criarItem(usuario) {
  const nome = String(usuario.nome ?? "");

  const item = document.createElement("li");
  item.className = "usuario";
  item.dataset.id = String(usuario.id);

  const info = document.createElement("div");
  info.className = "usuario-info";

  const data = document.createElement("span");
  data.className = "usuario-data";
  data.textContent = String(usuario.data ?? "");

  const campoDoNome = document.createElement("strong");
  campoDoNome.className = "usuario-nome";
  campoDoNome.textContent = nome;

  const email = document.createElement("span");
  email.className = "usuario-email";
  email.textContent = String(usuario.email ?? "");

  info.append(data, campoDoNome, email);

  // Botão acessível: o aria-label diz qual usuário será excluído
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "btn btn-outline btn-sm";
  botao.textContent = "Excluir";
  botao.setAttribute("aria-label", "Excluir usuário " + nome);
  botao.addEventListener("click", () => excluirUsuario(usuario.id));

  item.append(info, botao);
  return item;
}

/* ---------- Ações da página ---------- */

// Recria a <ul> a partir do localStorage. Se houver filtro, mostra só os usuários que combinam.
function renderizarLista(filtro = "") {
  const todos = carregarUsuarios();
  const termo = normalizarTexto(filtro);

  const visiveis =
    termo === ""
      ? todos
      : todos.filter(
          (u) => normalizarTexto(u.nome).includes(termo) || normalizarTexto(u.email).includes(termo)
        );

  lista.textContent = ""; // remove os itens antigos
  visiveis.forEach((usuario) => lista.appendChild(criarItem(usuario)));

  // Lista vazia: esconde a <ul> e mostra a mensagem
  lista.hidden = visiveis.length === 0;
  mensagemVazia.hidden = visiveis.length > 0;
  mensagemVazia.textContent =
    todos.length === 0 ? "Nenhum usuário cadastrado." : "Nenhum usuário encontrado para a pesquisa.";
}

// Evento de envio do formulário: valida, cria o objeto, salva, mostra na lista e limpa o formulário
function cadastrarUsuario(evento) {
  evento.preventDefault(); // impede o recarregamento da página

  const nome = campoNome.value.trim().replace(/\s+/g, " ");
  const email = campoEmail.value.trim();

  // O "required" do HTML aceita só espaços, então conferimos de novo aqui
  if (nome === "") {
    mostrarMensagem("Informe o nome do usuário.", true);
    campoNome.focus();
    return;
  }
  if (!EMAIL_VALIDO.test(email)) {
    mostrarMensagem("Informe um e-mail válido, como nome@dominio.com.", true);
    campoEmail.focus();
    return;
  }

  const usuarios = carregarUsuarios();
  usuarios.push({
    id: gerarId(),
    data: new Date().toLocaleString("pt-BR"), // data e hora do envio
    nome: nome,
    email: email,
  });

  if (!salvarUsuarios(usuarios)) {
    mostrarMensagem("Não foi possível salvar. Verifique se o navegador permite armazenamento local.", true);
    return;
  }

  campoPesquisa.value = ""; // limpa a pesquisa para o novo usuário aparecer na lista
  renderizarLista();
  limparFormulario();
  mostrarMensagem('Usuário "' + nome + '" cadastrado com sucesso.', false);
}

// Remove um usuário pelo id (do localStorage e da tela)
function excluirUsuario(id) {
  // Guarda a posição do item para devolver o foco do teclado a um botão próximo depois
  const posicao = Array.from(lista.children).findIndex((li) => li.dataset.id === String(id));

  const restantes = carregarUsuarios().filter((u) => String(u.id) !== String(id));
  if (!salvarUsuarios(restantes)) {
    mostrarMensagem("Não foi possível excluir o usuário.", true);
    return;
  }

  renderizarLista(campoPesquisa.value); // mantém a pesquisa atual
  mostrarMensagem("Usuário excluído.", false);

  const botoes = lista.querySelectorAll("button");
  const alvo = botoes[Math.min(Math.max(posicao, 0), botoes.length - 1)];
  (alvo || campoPesquisa).focus();
}

// Apaga todos os usuários depois de pedir confirmação
function excluirTodos() {
  if (carregarUsuarios().length === 0) {
    mostrarMensagem("Não há usuários para excluir.", true);
    return;
  }
  if (!confirm("Tem certeza de que deseja excluir TODOS os usuários? Esta ação não pode ser desfeita.")) {
    return; // o usuário cancelou
  }

  try {
    localStorage.removeItem(CHAVE_STORAGE); // apaga a lista e a própria chave
  } catch (erro) {
    console.error("Não foi possível apagar os usuários do localStorage:", erro);
  }

  campoPesquisa.value = "";
  renderizarLista();
  mostrarMensagem("Todos os usuários foram excluídos.", false);
}

// Filtra a lista pelo texto digitado (nome OU e-mail, sem diferenciar maiúsculas e acentos)
function pesquisarUsuarios() {
  renderizarLista(campoPesquisa.value);
}

// Limpa os campos do formulário de entrada e a mensagem
function limparFormulario() {
  formulario.reset();
  mostrarMensagem("", false);
  campoNome.focus();
}

/* ---------- Inicialização ---------- */
if (formulario && lista) {
  formulario.addEventListener("submit", cadastrarUsuario);
  botaoLimpar.addEventListener("click", limparFormulario);
  botaoExcluirTodos.addEventListener("click", excluirTodos);
  campoPesquisa.addEventListener("input", pesquisarUsuarios);

  // Ao abrir a página, carrega a lista salva no localStorage
  renderizarLista();
}
