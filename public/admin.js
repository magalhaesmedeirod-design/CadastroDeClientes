const $ = seletor => document.querySelector(seletor);
const telas = ['inicio', 'clientes', 'form-cliente', 'veiculos', 'form-veiculo', 'usuarios', 'form-usuario', 'perfil'];
let clientes = [], usuarios = [], veiculos = [], paginaClientes = 1, paginaVeiculos = 1, perfilAtual = null;
const CLIENTES_POR_PAGINA = 6;
const camposCliente = ['id', 'nome', 'cpf', 'email', 'telefone', 'cep', 'logradouro', 'bairro', 'cidade', 'complemento'];
const clienteInput = Object.fromEntries(camposCliente.map(campo => [campo, $(`#cliente-${campo}`)]));

function seguro(valor) { const el = document.createElement('span'); el.textContent = valor ?? '—'; return el.innerHTML; }
function data(valor) { return valor ? new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(valor)) : 'Nunca acessou'; }
function erro(texto) { $('#alerta').textContent = texto; $('#alerta').hidden = false; window.scrollTo({top: 0, behavior: 'smooth'}); }
function limparErro() { $('#alerta').hidden = true; }
function mostrarTela(nome, alterarHash = true) { telas.forEach(tela => $(`#tela-${tela}`).hidden = tela !== nome); if (alterarHash) window.location.hash = nome; if (nome === 'clientes') carregarClientes(); if (nome === 'veiculos') carregarVeiculos(); if (nome === 'usuarios') carregarUsuarios(); if (nome === 'perfil') carregarPerfil(); window.scrollTo({top: 0, behavior: 'smooth'}); }
function mascara(campo, limite, formatar) { campo.addEventListener('input', () => campo.value = formatar(campo.value.replace(/\D/g, '').slice(0, limite))); }
function mascaraTelefone(campo) { mascara(campo, 11, v => v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')); }
mascara(clienteInput.cpf, 11, v => v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'));
mascaraTelefone(clienteInput.telefone); mascara(clienteInput.cep, 8, v => v.replace(/^(\d{5})(\d)/, '$1-$2')); mascaraTelefone($('#usuario-telefone')); mascaraTelefone($('#perfil-telefone'));

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);
  const conteudo = await resposta.text();
  let dados = {};
  try { dados = conteudo ? JSON.parse(conteudo) : {}; } catch (_) {}
  if (!resposta.ok) throw new Error(dados.erro || `Não foi possível concluir a operação (erro ${resposta.status}).`);
  return dados;
}
async function carregarResumo() { try { const dados = await requisicao('/api/admin/resumo'); usuarios = dados.usuarios || []; clientes = dados.clientes || []; $('#qtd-usuarios').textContent = usuarios.filter(u => !u.superusuario).length; $('#qtd-admins').textContent = usuarios.filter(u => u.superusuario).length; $('#qtd-clientes').textContent = clientes.length; } catch (e) { erro(e.message); } }

function renderizarClientes() { const termo = $('#busca-clientes').value.trim().toLowerCase(), digitos = termo.replace(/\D/g, ''); const lista = clientes.filter(c => !termo || (c.nome || '').toLowerCase().includes(termo) || (c.cidade || '').toLowerCase().includes(termo) || (digitos && (c.cpf || '').replace(/\D/g, '').includes(digitos))); const totalPaginas = Math.max(1, Math.ceil(lista.length / CLIENTES_POR_PAGINA)); paginaClientes = Math.min(paginaClientes, totalPaginas); const pagina = lista.slice((paginaClientes - 1) * CLIENTES_POR_PAGINA, paginaClientes * CLIENTES_POR_PAGINA); $('#total-clientes').textContent = `${lista.length} cliente${lista.length === 1 ? '' : 's'} encontrado${lista.length === 1 ? '' : 's'}.`; $('#linhas-clientes').innerHTML = pagina.map(c => `<tr><td><button class="btn btn-link link-success p-0 text-start text-decoration-none" data-editar-cliente="${seguro(c.id)}">${seguro(c.nome)}</button></td><td>${seguro(c.cpf)}</td><td>${seguro(c.email)}</td><td>${seguro(c.telefone)}</td><td>${seguro(c.cidade)}</td></tr>`).join(''); $('#sem-clientes').hidden = pagina.length > 0; document.querySelectorAll('[data-editar-cliente]').forEach(btn => btn.onclick = () => editarCliente(btn.dataset.editarCliente)); renderizarPaginacaoClientes(totalPaginas); }
function renderizarPaginacaoClientes(total) { const botao = (texto, pagina, desabilitado = false, ativo = false) => `<li class="page-item ${desabilitado ? 'disabled' : ''} ${ativo ? 'active' : ''}"><button class="page-link" data-pagina-cliente="${pagina}" ${desabilitado || ativo ? 'disabled' : ''}>${texto}</button></li>`; const itens = [botao('Anterior', paginaClientes - 1, paginaClientes === 1)]; for (let pagina = 1; pagina <= total; pagina++) itens.push(botao(pagina, pagina, false, pagina === paginaClientes)); itens.push(botao('Próxima', paginaClientes + 1, paginaClientes === total)); $('#paginacao-clientes').innerHTML = itens.join(''); document.querySelectorAll('[data-pagina-cliente]').forEach(btn => btn.onclick = () => { paginaClientes = Number(btn.dataset.paginaCliente); renderizarClientes(); }); }
async function carregarClientes() { try { clientes = await requisicao('/api/clientes'); renderizarClientes(); } catch (e) { erro(e.message); } }
function novoCliente() { $('#form-cliente').reset(); clienteInput.id.value = ''; $('#titulo-cliente').textContent = 'Cadastrar cliente'; $('#btn-excluir-cliente').hidden = true; mostrarTela('form-cliente'); }
function editarCliente(id) { const cliente = clientes.find(c => c.id === id); if (!cliente) return; camposCliente.forEach(campo => clienteInput[campo].value = cliente[campo] || ''); $('#titulo-cliente').textContent = 'Editar cliente'; $('#btn-excluir-cliente').hidden = false; mostrarTela('form-cliente'); }
function dadosCliente() { return Object.fromEntries(camposCliente.filter(c => c !== 'id').map(c => [c, clienteInput[c].value])); }
async function salvarCliente(event) { event.preventDefault(); const id = clienteInput.id.value; try { await requisicao(id ? `/api/clientes/${encodeURIComponent(id)}` : '/api/clientes', {method: id ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dadosCliente())}); mostrarTela('clientes'); } catch (e) { erro(e.message); } }
async function excluirCliente() { const id = clienteInput.id.value; if (!id || !confirm('Deseja excluir este cliente permanentemente?')) return; try { await requisicao(`/api/clientes/${encodeURIComponent(id)}`, {method: 'DELETE'}); mostrarTela('clientes'); } catch (e) { erro(e.message); } }

const camposVeiculo = ['id', 'placa', 'marca', 'modelo', 'ano_fabricacao', 'ano_modelo', 'cor', 'proprietario_id', 'proprietario_email', 'foto'];
const veiculoInput = Object.fromEntries(camposVeiculo.map(campo => [campo, $(`#veiculo-${campo}`)]));

function preencherProprietarios(selecionado = '') {
  const opcoes = clientes.map(cliente => `<option value="${seguro(cliente.id)}">${seguro(cliente.nome)}</option>`).join('');
  veiculoInput.proprietario_id.innerHTML = '<option value="">Selecione um cliente</option>' + opcoes;
  veiculoInput.proprietario_id.value = selecionado;
  const cliente = clientes.find(item => item.id === selecionado);
  veiculoInput.proprietario_email.value = cliente ? cliente.email || '' : '';
}
function previewFotoVeiculo(foto = '') { $('#area-foto-veiculo').hidden = !foto; $('#preview-foto-veiculo').src = foto || ''; }
function normalizarBusca(valor) { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function renderizarVeiculos() {
  const termo = normalizarBusca($('#busca-veiculos').value.trim());
  const lista = veiculos.filter(v => !termo || [v.proprietario_nome, v.placa, v.cor].some(campo => normalizarBusca(campo).includes(termo)));
  const totalPaginas = Math.max(1, Math.ceil(lista.length / CLIENTES_POR_PAGINA)); paginaVeiculos = Math.min(paginaVeiculos, totalPaginas);
  const pagina = lista.slice((paginaVeiculos - 1) * CLIENTES_POR_PAGINA, paginaVeiculos * CLIENTES_POR_PAGINA);
  $('#total-veiculos').textContent = `${lista.length} veículo${lista.length === 1 ? '' : 's'} encontrado${lista.length === 1 ? '' : 's'}.`;
  $('#linhas-veiculos').innerHTML = pagina.map(v => `<tr><td>${v.foto ? `<img src="${seguro(v.foto)}" alt="" class="rounded" style="width:48px;height:36px;object-fit:cover">` : '—'}</td><td><button class="btn btn-link link-success p-0 text-start text-decoration-none" data-editar-veiculo="${seguro(v.id)}">${seguro(v.placa)}</button></td><td>${seguro(v.marca)} ${seguro(v.modelo)}</td><td>${seguro(v.cor)}</td><td>${seguro(v.proprietario_nome)}</td></tr>`).join('');
  $('#sem-veiculos').hidden = pagina.length > 0;
  document.querySelectorAll('[data-editar-veiculo]').forEach(btn => btn.onclick = () => editarVeiculo(btn.dataset.editarVeiculo));
  const botao = (texto, numero, desabilitado = false, ativo = false) => `<li class="page-item ${desabilitado ? 'disabled' : ''} ${ativo ? 'active' : ''}"><button class="page-link" data-pagina-veiculo="${numero}" ${desabilitado || ativo ? 'disabled' : ''}>${texto}</button></li>`;
  const itens = [botao('Anterior', paginaVeiculos - 1, paginaVeiculos === 1)]; for (let numero = 1; numero <= totalPaginas; numero++) itens.push(botao(numero, numero, false, numero === paginaVeiculos)); itens.push(botao('Próxima', paginaVeiculos + 1, paginaVeiculos === totalPaginas));
  $('#paginacao-veiculos').innerHTML = itens.join(''); document.querySelectorAll('[data-pagina-veiculo]').forEach(btn => btn.onclick = () => { paginaVeiculos = Number(btn.dataset.paginaVeiculo); renderizarVeiculos(); });
}
async function carregarVeiculos() { try { [veiculos, clientes] = await Promise.all([requisicao('/api/admin/veiculos'), carregarProprietarios()]); renderizarVeiculos(); } catch (e) { erro(e.message); } }
async function carregarProprietarios() {
  const resumo = await requisicao('/api/admin/resumo');
  clientes = Array.isArray(resumo.clientes) ? resumo.clientes : [];
  return clientes;
}
async function novoVeiculo() { try { await carregarProprietarios(); $('#form-veiculo').reset(); preencherProprietarios(); veiculoInput.id.value = ''; veiculoInput.foto.value = ''; previewFotoVeiculo(); $('#titulo-veiculo').textContent = 'Cadastrar veículo'; $('#btn-excluir-veiculo').hidden = true; mostrarTela('form-veiculo'); } catch (e) { erro(`Não foi possível carregar os clientes para seleção: ${e.message}`); } }
async function editarVeiculo(id) { try { await carregarProprietarios(); const veiculo = veiculos.find(v => v.id === id); if (!veiculo) return; camposVeiculo.forEach(campo => veiculoInput[campo].value = veiculo[campo] || ''); preencherProprietarios(veiculo.proprietario_id); previewFotoVeiculo(veiculo.foto); $('#arquivo-foto-veiculo').value = ''; $('#titulo-veiculo').textContent = 'Editar veículo'; $('#btn-excluir-veiculo').hidden = false; mostrarTela('form-veiculo'); } catch (e) { erro(`Não foi possível carregar os clientes para seleção: ${e.message}`); } }
function dadosVeiculo() { return Object.fromEntries(camposVeiculo.filter(campo => campo !== 'id').map(campo => [campo, veiculoInput[campo].value])); }
async function salvarVeiculo(event) { event.preventDefault(); const id = veiculoInput.id.value; try { await requisicao(id ? `/api/admin/veiculos/${encodeURIComponent(id)}` : '/api/admin/veiculos', {method: id ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dadosVeiculo())}); mostrarTela('veiculos'); } catch (e) { erro(e.message); } }
async function excluirVeiculo() { const id = veiculoInput.id.value; if (!id || !confirm('Deseja excluir este veículo permanentemente?')) return; try { await requisicao(`/api/admin/veiculos/${encodeURIComponent(id)}`, {method: 'DELETE'}); mostrarTela('veiculos'); } catch (e) { erro(e.message); } }

function linhaUsuario(u, comTelefone = false) { return `<tr><td>${seguro(u.usuario)}</td><td>${seguro(u.email)}</td>${comTelefone ? `<td>${seguro(u.telefone)}</td>` : ''}<td>${data(u.ultimo_login)}</td><td>${u.total_logins || 0}</td><td class="text-end"><button class="btn btn-sm btn-outline-success" data-editar-usuario="${seguro(u.usuario)}"><i class="bi bi-pencil"></i></button></td></tr>`; }
function renderizarUsuarios() { const superusuarios = usuarios.filter(u => u.superusuario), clientesAcesso = usuarios.filter(u => !u.superusuario); $('#linhas-superusuarios').innerHTML = superusuarios.length ? superusuarios.map(u => linhaUsuario(u, true)).join('') : '<tr><td colspan="6" class="text-center text-body-secondary py-4">Nenhum superusuário cadastrado.</td></tr>'; $('#linhas-usuarios').innerHTML = clientesAcesso.length ? clientesAcesso.map(u => linhaUsuario(u)).join('') : '<tr><td colspan="5" class="text-center text-body-secondary py-4">Nenhum cliente com acesso cadastrado.</td></tr>'; document.querySelectorAll('[data-editar-usuario]').forEach(btn => btn.onclick = () => editarUsuario(btn.dataset.editarUsuario)); }
async function carregarUsuarios() { try { usuarios = await requisicao('/api/admin/usuarios'); renderizarUsuarios(); } catch (e) { erro(e.message); } }
function configurarTipoUsuario(superusuario) { $('#usuario-super').value = String(superusuario); $('#linha-telefone-usuario').hidden = !superusuario; $('#usuario-telefone').required = superusuario; if (!superusuario) $('#usuario-telefone').value = ''; }
function novoUsuario(superusuario) { $('#form-usuario').reset(); $('#usuario-original').value = ''; configurarTipoUsuario(superusuario); $('#titulo-usuario').textContent = superusuario ? 'Novo superusuário' : 'Novo cliente com acesso'; $('#ajuda-senha').textContent = '(mínimo 6 caracteres)'; $('#usuario-senha').required = true; $('#btn-excluir-usuario').hidden = true; mostrarTela('form-usuario'); }
function editarUsuario(nome) { const u = usuarios.find(item => item.usuario === nome); if (!u) return; $('#usuario-original').value = u.usuario; $('#usuario-nome').value = u.usuario; $('#usuario-email').value = u.email; $('#usuario-telefone').value = u.telefone || ''; $('#usuario-senha').value = ''; $('#usuario-senha').required = false; configurarTipoUsuario(!!u.superusuario); $('#titulo-usuario').textContent = `Editar ${u.superusuario ? 'superusuário' : 'cliente'}: ${u.usuario}`; $('#ajuda-senha').textContent = '(deixe em branco para manter)'; $('#btn-excluir-usuario').hidden = false; mostrarTela('form-usuario'); }
function dadosUsuario() { return {usuario: $('#usuario-nome').value, email: $('#usuario-email').value, telefone: $('#usuario-telefone').value, senha: $('#usuario-senha').value, superusuario: $('#usuario-super').value === 'true'}; }
async function salvarUsuario(event) { event.preventDefault(); const original = $('#usuario-original').value, dados = dadosUsuario(); try { await requisicao(original ? `/api/admin/usuarios/${encodeURIComponent(original)}` : '/api/admin/usuarios', {method: original ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados)}); mostrarTela('usuarios'); } catch (e) { erro(e.message); } }
async function excluirUsuario() { const usuario = $('#usuario-original').value; if (!usuario || !confirm(`Remover a conta ${usuario}?`)) return; try { await requisicao(`/api/admin/usuarios/${encodeURIComponent(usuario)}`, {method: 'DELETE'}); mostrarTela('usuarios'); } catch (e) { erro(e.message); } }

function exibirPerfil(edicao = false) { $('#perfil-visualizacao').hidden = edicao; $('#form-perfil').hidden = !edicao; if (!edicao && perfilAtual) { $('#perfil-nome-exibido').textContent = perfilAtual.usuario; $('#perfil-email-exibido').textContent = perfilAtual.email; $('#perfil-telefone-exibido').textContent = perfilAtual.telefone || 'Não informado'; } }
async function carregarPerfil() { try { perfilAtual = await requisicao('/api/admin/perfil'); $('#perfil-usuario').value = perfilAtual.usuario; $('#perfil-email').value = perfilAtual.email; $('#perfil-telefone').value = perfilAtual.telefone || ''; $('#perfil-senha').value = ''; exibirPerfil(false); } catch (e) { erro(e.message); } }
async function salvarPerfil(event) { event.preventDefault(); try { perfilAtual = await requisicao('/api/admin/perfil', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({usuario: $('#perfil-usuario').value, email: $('#perfil-email').value, telefone: $('#perfil-telefone').value, senha: $('#perfil-senha').value})}); $('#perfil-senha').value = ''; exibirPerfil(false); } catch (e) { erro(e.message); } }
function alternarSenha(input, botao) { const visivel = input.type === 'text'; input.type = visivel ? 'password' : 'text'; botao.innerHTML = `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`; }

document.querySelectorAll('[data-tela]').forEach(el => el.addEventListener('click', () => mostrarTela(el.dataset.tela)));
$('#btn-atualizar').onclick = () => { limparErro(); carregarResumo(); }; $('#btn-novo-cliente').onclick = novoCliente; $('#busca-clientes').oninput = () => { paginaClientes = 1; renderizarClientes(); }; $('#form-cliente').onsubmit = salvarCliente; $('#btn-excluir-cliente').onclick = excluirCliente; $('#btn-novo-cliente-acesso').onclick = () => novoUsuario(false); $('#btn-novo-superusuario').onclick = () => novoUsuario(true); $('#form-usuario').onsubmit = salvarUsuario; $('#btn-excluir-usuario').onclick = excluirUsuario; $('#form-perfil').onsubmit = salvarPerfil; $('#btn-editar-perfil').onclick = () => exibirPerfil(true); $('#btn-cancelar-perfil').onclick = () => { $('#perfil-usuario').value = perfilAtual.usuario; $('#perfil-email').value = perfilAtual.email; $('#perfil-telefone').value = perfilAtual.telefone || ''; $('#perfil-senha').value = ''; exibirPerfil(false); };
$('#btn-novo-veiculo').onclick = novoVeiculo; $('#busca-veiculos').oninput = () => { paginaVeiculos = 1; renderizarVeiculos(); }; $('#form-veiculo').onsubmit = salvarVeiculo; $('#btn-excluir-veiculo').onclick = excluirVeiculo; veiculoInput.proprietario_id.onchange = () => preencherProprietarios(veiculoInput.proprietario_id.value);
$('#arquivo-foto-veiculo').onchange = event => { const arquivo = event.target.files[0]; if (!arquivo) return; if (arquivo.size > 5 * 1024 * 1024) { erro('A foto deve ter no máximo 5 MB.'); event.target.value = ''; return; } const leitor = new FileReader(); leitor.onload = () => { veiculoInput.foto.value = leitor.result; previewFotoVeiculo(leitor.result); }; leitor.readAsDataURL(arquivo); };
$('#btn-ver-senha-usuario').onclick = () => alternarSenha($('#usuario-senha'), $('#btn-ver-senha-usuario')); $('#btn-ver-senha-perfil').onclick = () => alternarSenha($('#perfil-senha'), $('#btn-ver-senha-perfil'));
$('#btn-sair-admin').onclick = async () => { await fetch('/api/logout', {method: 'POST'}); window.location.assign('/admin'); };
$('#input-idioma').value = localStorage.getItem('idiomaSistema') || 'pt-BR'; $('#input-idioma').onchange = () => { localStorage.setItem('idiomaSistema', $('#input-idioma').value); document.documentElement.lang = $('#input-idioma').value; };
window.addEventListener('hashchange', () => { const tela = location.hash.slice(1); if (telas.includes(tela)) mostrarTela(tela, false); });
mostrarTela(telas.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio', false); carregarResumo();
