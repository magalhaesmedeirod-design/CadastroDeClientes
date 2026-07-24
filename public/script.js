const clientesPorPagina = 6;
let clientes = [];
let paginaAtual = 1;
let fotoBase64 = '';

const telas = ['home', 'clientes', 'formulario'];
const $ = (seletor) => document.querySelector(seletor);
const inputs = Object.fromEntries(['id', 'nome', 'cpf', 'foto', 'email', 'telefone', 'cep', 'logradouro', 'bairro', 'cidade', 'complemento'].map(nome => [nome, $(`#input-${nome}`)]));
const form = $('#form-cliente');
const seletorIdioma = $('#input-idioma');
const sidebar = $('#sidebar');
const conteudoPrincipal = $('#conteudo-principal');
const btnToggleSidebar = $('#btn-toggle-sidebar');

async function sairDoSistema() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    window.location.assign('/');
  }
}

function mostrarTela(nome, atualizarHash = true) {
  telas.forEach(tela => $(`#tela-${tela}`).hidden = tela !== nome);
  if (atualizarHash) window.location.hash = nome;
  if (nome === 'clientes') carregarClientes();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function textoSeguro(valor) {
  const elemento = document.createElement('span');
  elemento.textContent = valor ?? '';
  return elemento.innerHTML;
}

function clientesFiltrados() {
  const termo = $('#campo-busca').value.trim().toLocaleLowerCase('pt-BR');
  const cpfTermo = termo.replace(/\D/g, '');
  if (!termo) return clientes;
  return clientes.filter(cliente => {
    const nome = (cliente.nome || '').toLocaleLowerCase('pt-BR');
    const cidade = (cliente.cidade || '').toLocaleLowerCase('pt-BR');
    const cpf = (cliente.cpf || '').replace(/\D/g, '');
    return nome.includes(termo) || cidade.includes(termo) || (cpfTermo && cpf.includes(cpfTermo));
  });
}

function renderizarClientes() {
  const filtrados = clientesFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / clientesPorPagina));
  paginaAtual = Math.min(paginaAtual, totalPaginas);
  const inicio = (paginaAtual - 1) * clientesPorPagina;
  const pagina = filtrados.slice(inicio, inicio + clientesPorPagina);
  $('#total-clientes').textContent = `${filtrados.length} cliente${filtrados.length === 1 ? '' : 's'} encontrado${filtrados.length === 1 ? '' : 's'}.`;
  $('#linhas-tabela').innerHTML = pagina.map(cliente => `
    <tr><td><button class="btn btn-link p-0 text-start text-decoration-none" type="button" data-editar="${textoSeguro(cliente.id)}">${textoSeguro(cliente.nome)}</button></td>
    <td>${textoSeguro(cliente.cpf || 'Não informado')}</td><td>${textoSeguro(cliente.email || '')}</td>
    <td>${textoSeguro(cliente.telefone || '')}</td><td>${textoSeguro(cliente.cidade || 'Não informada')}</td></tr>`).join('');
  $('#sem-clientes').hidden = pagina.length > 0;
  $('#linhas-tabela').querySelectorAll('[data-editar]').forEach(botao => botao.addEventListener('click', () => editarCliente(botao.dataset.editar)));
  renderizarPaginacao(totalPaginas);
}

function renderizarPaginacao(total) {
  const itens = [];
  const botao = (rotulo, pagina, desabilitado = false, ativo = false) => `<li class="page-item ${desabilitado ? 'disabled' : ''} ${ativo ? 'active' : ''}"><button class="page-link" type="button" data-pagina="${pagina}" ${desabilitado || ativo ? 'disabled' : ''}>${rotulo}</button></li>`;
  itens.push(botao('Anterior', paginaAtual - 1, paginaAtual === 1));
  for (let pagina = 1; pagina <= total; pagina++) itens.push(botao(pagina, pagina, false, pagina === paginaAtual));
  itens.push(botao('Próxima', paginaAtual + 1, paginaAtual === total));
  $('#paginacao').innerHTML = itens.join('');
  $('#paginacao').querySelectorAll('[data-pagina]').forEach(botao => botao.addEventListener('click', () => { paginaAtual = Number(botao.dataset.pagina); renderizarClientes(); }));
}

async function carregarClientes() {
  try {
    const resposta = await fetch('/api/clientes');
    if (!resposta.ok) throw new Error('Não foi possível carregar os clientes.');
    clientes = await resposta.json();
    renderizarClientes();
  } catch (erro) {
    $('#linhas-tabela').innerHTML = '';
    $('#sem-clientes').hidden = false;
    $('#sem-clientes').textContent = erro.message;
  }
}

function limparValidacao() {
  form.querySelectorAll('.is-invalid').forEach(campo => campo.classList.remove('is-invalid'));
  $('#mensagem-formulario').hidden = true;
}

function novoCliente() {
  form.reset(); limparValidacao(); fotoBase64 = '';
  $('#nome-arquivo').textContent = 'Nenhum arquivo selecionado.';
  $('#titulo-formulario').textContent = 'Cadastrar cliente';
  $('#btn-excluir-cliente').disabled = true;
  mostrarTela('formulario');
}

function editarCliente(id) {
  const cliente = clientes.find(item => item.id === id);
  if (!cliente) return;
  limparValidacao();
  Object.keys(inputs).forEach(campo => { if (campo !== 'foto') inputs[campo].value = cliente[campo] || ''; });
  fotoBase64 = cliente.foto || '';
  $('#nome-arquivo').textContent = fotoBase64 ? 'Imagem já salva no cadastro.' : 'Nenhum arquivo selecionado.';
  $('#titulo-formulario').textContent = 'Editar cliente';
  $('#btn-excluir-cliente').disabled = false;
  mostrarTela('formulario');
}

function validarFormulario() {
  limparValidacao();
  let valido = true;
  form.querySelectorAll('[required]').forEach(campo => {
    if (!campo.value.trim()) { campo.classList.add('is-invalid'); campo.nextElementSibling.textContent = 'Este campo é obrigatório.'; valido = false; }
  });
  return valido;
}

function exibirMensagem(texto, tipo = 'danger') {
  const mensagem = $('#mensagem-formulario');
  mensagem.className = `alert alert-${tipo}`;
  mensagem.textContent = texto;
  mensagem.hidden = false;
}

async function salvarCliente(evento) {
  evento.preventDefault();
  if (!validarFormulario()) return;
  const dados = Object.fromEntries(['nome', 'cpf', 'email', 'telefone', 'cep', 'logradouro', 'bairro', 'cidade', 'complemento'].map(campo => [campo, inputs[campo].value]));
  dados.foto = fotoBase64;
  const id = inputs.id.value;
  try {
    const resposta = await fetch(id ? `/api/clientes/${encodeURIComponent(id)}` : '/api/clientes', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    const retorno = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível salvar o cliente.');
    mostrarTela('clientes');
  } catch (erro) { exibirMensagem(erro.message); }
}

async function excluirCliente() {
  const id = inputs.id.value;
  if (!id || !window.confirm('Deseja excluir este cliente permanentemente?')) return;
  try {
    const resposta = await fetch(`/api/clientes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!resposta.ok) throw new Error('Não foi possível excluir o cliente.');
    mostrarTela('clientes');
  } catch (erro) { exibirMensagem(erro.message); }
}

function aplicarMascara(campo, limite, formatar) { campo.addEventListener('input', () => { campo.value = formatar(campo.value.replace(/\D/g, '').slice(0, limite)); }); }
aplicarMascara(inputs.cpf, 11, v => v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'));
aplicarMascara(inputs.telefone, 11, v => v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'));
aplicarMascara(inputs.cep, 8, v => v.replace(/^(\d{5})(\d)/, '$1-$2'));

inputs.foto.addEventListener('change', () => {
  const arquivo = inputs.foto.files[0];
  if (!arquivo) { fotoBase64 = ''; $('#nome-arquivo').textContent = 'Nenhum arquivo selecionado.'; return; }
  $('#nome-arquivo').textContent = arquivo.name;
  const leitor = new FileReader();
  leitor.addEventListener('load', () => { fotoBase64 = leitor.result; });
  leitor.readAsDataURL(arquivo);
});

document.querySelectorAll('[data-tela]').forEach(elemento => elemento.addEventListener('click', () => mostrarTela(elemento.dataset.tela)));
$('#btn-abrir-cadastro').addEventListener('click', novoCliente);
$('#campo-busca').addEventListener('input', () => { paginaAtual = 1; renderizarClientes(); });
form.addEventListener('submit', salvarCliente);
$('#btn-excluir-cliente').addEventListener('click', excluirCliente);
$('#btn-sair').addEventListener('click', sairDoSistema);
seletorIdioma.value = localStorage.getItem('idiomaSistema') || 'pt-BR';
seletorIdioma.addEventListener('change', () => {
  localStorage.setItem('idiomaSistema', seletorIdioma.value);
  document.documentElement.lang = seletorIdioma.value;
});

function ajustarSidebar(estaVisivel) {
  sidebar.classList.toggle('d-lg-flex', estaVisivel);
  sidebar.classList.toggle('d-lg-none', !estaVisivel);
  conteudoPrincipal.classList.toggle('col-lg-9', estaVisivel);
  conteudoPrincipal.classList.toggle('col-xl-10', estaVisivel);
  conteudoPrincipal.classList.toggle('col-lg-12', !estaVisivel);

  $('#tela-clientes').classList.toggle('col-lg-9', !estaVisivel);
  $('#tela-clientes').classList.toggle('col-xl-10', !estaVisivel);
  $('#tela-clientes').classList.toggle('mx-auto', !estaVisivel);

  $('#tela-formulario').classList.toggle('col-lg-10', estaVisivel);
  $('#tela-formulario').classList.toggle('col-xl-8', estaVisivel);
  $('#tela-formulario').classList.toggle('col-xxl-7', estaVisivel);
  $('#tela-formulario').classList.toggle('col-lg-8', !estaVisivel);
  $('#tela-formulario').classList.toggle('col-xl-7', !estaVisivel);
  $('#tela-formulario').classList.toggle('col-xxl-6', !estaVisivel);
  btnToggleSidebar.classList.toggle('btn-dark', estaVisivel);
  btnToggleSidebar.classList.toggle('border-secondary', estaVisivel);
  btnToggleSidebar.classList.toggle('btn-warning', !estaVisivel);
  btnToggleSidebar.classList.toggle('translate-middle-x', estaVisivel);
  btnToggleSidebar.classList.toggle('ms-3', !estaVisivel);
  btnToggleSidebar.setAttribute('aria-expanded', String(estaVisivel));
  btnToggleSidebar.setAttribute('aria-label', estaVisivel ? 'Ocultar menu lateral' : 'Mostrar menu lateral');
}

window.alternarSidebar = function alternarSidebar() {
  ajustarSidebar(sidebar.classList.contains('d-lg-none'));
};
window.addEventListener('hashchange', () => { const tela = window.location.hash.replace('#', ''); if (telas.includes(tela)) mostrarTela(tela, false); });
mostrarTela(telas.includes(window.location.hash.replace('#', '')) ? window.location.hash.replace('#', '') : 'home', false);
