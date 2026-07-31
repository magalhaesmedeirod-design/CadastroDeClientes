const $ = seletor => document.querySelector(seletor);
const telas = ['inicio', 'veiculos', 'apartamentos', 'perfil'];
let perfil = null;
let veiculos = [];
let apartamentos = [];
let modoVeiculos = 'tabela';

function textoSeguro(valor) { const elemento = document.createElement('span'); elemento.textContent = valor ?? '—'; return elemento.innerHTML; }
function mostrarErro(texto) { $('#alerta').textContent = texto; $('#alerta').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function ocultarErro() { $('#alerta').hidden = true; }
async function requisicao(url, opcoes = {}) { const resposta = await fetch(url, opcoes); const dados = await resposta.json().catch(() => ({})); if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.'); return dados; }
function mostrarTela(tela, alterarHash = true) { telas.forEach(nome => $(`#tela-${nome}`).hidden = nome !== tela); document.querySelectorAll('[data-tela]').forEach(link => link.classList.toggle('active', link.dataset.tela === tela)); if (alterarHash) location.hash = tela; if (tela === 'veiculos') carregarVeiculos(); if (tela === 'apartamentos') carregarApartamentos(); if (tela === 'perfil') carregarPerfil(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function fotoVeiculo(veiculo, classe) { return veiculo.foto ? `<img class="${classe}" src="${textoSeguro(veiculo.foto)}" alt="Foto do veículo">` : `<div class="${classe} d-grid place-items-center text-secondary"><i class="bi bi-car-front fs-3"></i></div>`; }
function abrirDetalhes(id) { const veiculo = veiculos.find(item => item.id === id); if (!veiculo) return; $('#detalhes-veiculo').innerHTML = `${veiculo.foto ? `<img class="vehicle-card-photo mb-3" src="${textoSeguro(veiculo.foto)}" alt="Foto do veículo">` : ''}<div class="row g-3"><div class="col-6"><div class="detail-label">Placa</div><strong>${textoSeguro(veiculo.placa)}</strong></div><div class="col-6"><div class="detail-label">Cor</div><strong>${textoSeguro(veiculo.cor)}</strong></div><div class="col-6"><div class="detail-label">Marca</div><strong>${textoSeguro(veiculo.marca)}</strong></div><div class="col-6"><div class="detail-label">Modelo</div><strong>${textoSeguro(veiculo.modelo)}</strong></div><div class="col-6"><div class="detail-label">Ano de fabricação</div><strong>${textoSeguro(veiculo.ano_fabricacao)}</strong></div><div class="col-6"><div class="detail-label">Ano do modelo</div><strong>${textoSeguro(veiculo.ano_modelo)}</strong></div></div>`; bootstrap.Modal.getOrCreateInstance($('#modal-veiculo')).show(); }
function renderizarVeiculos() { const vazio = veiculos.length === 0; $('#sem-veiculos').hidden = !vazio; $('#veiculos-tabela').hidden = vazio || modoVeiculos !== 'tabela'; $('#veiculos-cards').hidden = vazio || modoVeiculos !== 'cards'; $('#linhas-veiculos').innerHTML = veiculos.map(v => `<tr data-veiculo="${textoSeguro(v.id)}"><td class="ps-4"><div class="d-flex align-items-center gap-3">${fotoVeiculo(v, 'vehicle-photo')}<div><strong>${textoSeguro(v.marca)} ${textoSeguro(v.modelo)}</strong><div class="small text-secondary">${textoSeguro(v.ano_modelo)}</div></div></div></td><td>${textoSeguro(v.placa)}</td><td>${textoSeguro(v.cor)}</td><td class="text-end pe-4"><i class="bi bi-chevron-right text-secondary"></i></td></tr>`).join(''); $('#veiculos-cards').innerHTML = veiculos.map(v => `<div class="col-sm-6 col-lg-4"><article class="portal-card vehicle-item h-100 p-3" data-veiculo="${textoSeguro(v.id)}">${fotoVeiculo(v, 'vehicle-card-photo')}<div class="pt-3"><div class="d-flex justify-content-between gap-2"><h2 class="h5 mb-1">${textoSeguro(v.marca)} ${textoSeguro(v.modelo)}</h2><span class="badge text-bg-light border">${textoSeguro(v.placa)}</span></div><p class="text-secondary mb-0">${textoSeguro(v.cor)} · Modelo ${textoSeguro(v.ano_modelo)}</p></div></article></div>`).join(''); document.querySelectorAll('[data-veiculo]').forEach(item => item.onclick = () => abrirDetalhes(item.dataset.veiculo)); }
async function carregarVeiculos() { try { veiculos = await requisicao('/api/meus-veiculos'); $('#qtd-veiculos').textContent = veiculos.length; renderizarVeiculos(); } catch (erro) { mostrarErro(erro.message); } }

function renderizarApartamentos() {
  $('#sem-apartamentos').hidden = apartamentos.length > 0;
  $('#lista-apartamentos').innerHTML = apartamentos.map(a => {
    const moradores = (a.pessoas || []).map(p => textoSeguro(p.nome)).join(', ') || 'Nenhum morador atribuído';
    const vagas = (a.vagas || []).map(v => `<li><strong>${textoSeguro(v.numero)}</strong>${v.veiculos?.length ? ` — ${v.veiculos.map(c => textoSeguro(c.placa)).join(', ')}` : ' — sem veículos atribuídos'}</li>`).join('') || '<li>Não há vagas cadastradas.</li>';
    const vinculo = a.vinculo === 'morador' ? 'Você mora neste apartamento' : 'Você é o proprietário';
    return `<div class="col-lg-6"><article class="portal-card p-4 h-100"><div class="d-flex justify-content-between gap-3 mb-3"><div><p class="text-secondary mb-1">Apartamento</p><h2 class="h4 mb-0">${textoSeguro(a.numero)}</h2></div><span class="badge text-bg-light border align-self-start">Andar ${textoSeguro(a.andar)}</span></div><p class="text-success fw-semibold small"><i class="bi bi-house-check me-1"></i>${vinculo}</p><div class="mb-3"><div class="detail-label">Moradores atribuídos</div><p class="mb-0">${moradores}</p></div><div><div class="detail-label">Vagas deste apartamento</div><ul class="mb-0 ps-3">${vagas}</ul></div></article></div>`;
  }).join('');
}
async function carregarApartamentos() { try { apartamentos = await requisicao('/api/meus-apartamentos'); renderizarApartamentos(); } catch (erro) { mostrarErro(erro.message); } }

function mostrarPerfil(edicao = false) { $('#perfil-visualizacao').hidden = edicao; $('#form-perfil').hidden = !edicao; if (!edicao && perfil) { $('#perfil-usuario-exibido').textContent = perfil.usuario; $('#perfil-email-exibido').textContent = perfil.email; } }
async function carregarPerfil() { try { perfil = await requisicao('/api/meu-perfil'); $('#nome-usuario').textContent = perfil.usuario; $('#email-resumo').textContent = perfil.email; $('#perfil-usuario').value = perfil.usuario; $('#perfil-email').value = perfil.email; $('#perfil-senha').value = ''; mostrarPerfil(false); } catch (erro) { mostrarErro(erro.message); } }
async function salvarPerfil(evento) { evento.preventDefault(); try { perfil = await requisicao('/api/meu-perfil', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: $('#perfil-usuario').value, email: $('#perfil-email').value, senha: $('#perfil-senha').value }) }); $('#nome-usuario').textContent = perfil.usuario; $('#email-resumo').textContent = perfil.email; mostrarPerfil(false); } catch (erro) { mostrarErro(erro.message); } }

document.querySelectorAll('[data-tela]').forEach(link => link.onclick = () => { ocultarErro(); mostrarTela(link.dataset.tela); });
$('#btn-tabela').onclick = () => { modoVeiculos = 'tabela'; $('#btn-tabela').classList.add('active'); $('#btn-cards').classList.remove('active'); renderizarVeiculos(); };
$('#btn-cards').onclick = () => { modoVeiculos = 'cards'; $('#btn-cards').classList.add('active'); $('#btn-tabela').classList.remove('active'); renderizarVeiculos(); };
$('#btn-editar-perfil').onclick = () => mostrarPerfil(true);
$('#btn-cancelar-perfil').onclick = () => { $('#perfil-usuario').value = perfil.usuario; $('#perfil-email').value = perfil.email; $('#perfil-senha').value = ''; mostrarPerfil(false); };
$('#form-perfil').onsubmit = salvarPerfil;
$('#btn-sair').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.assign('/'); };
const estilosTemaCliente = document.createElement('style');
estilosTemaCliente.textContent = `html[data-tema-cliente="sereno"]{--ink:#26323a;--muted:#69777d;--line:#dce5e6;--surface:#fff;--canvas:#f4f7f7;--accent:#39726c;--accent-soft:#e7f1ef}html[data-tema-cliente="lavanda"]{--ink:#302d48;--muted:#706b83;--line:#ded8eb;--surface:#fff;--canvas:#f8f6fc;--accent:#72559c;--accent-soft:#eee8f7}html[data-tema-cliente="noite"]{--ink:#e7f1ed;--muted:#b1c1bb;--line:#33473f;--surface:#18231f;--canvas:#101714;--accent:#72c39b;--accent-soft:#203d31}html[data-tema-cliente="noite"] .topbar{background:rgba(24,35,31,.94)!important}html[data-tema-cliente="noite"] .text-dark{color:#e7f1ed!important}html[data-tema-cliente="noite"] .btn-outline-secondary{color:#c5d4cf;border-color:#52665e}html[data-tema-cliente="noite"] .table{--bs-table-bg:#18231f;--bs-table-color:#e7f1ed}html[data-tema-cliente="noite"] .modal-content{background:#18231f;color:#e7f1ed}html[data-tema-cliente="grafite"]{--ink:#e6eaf2;--muted:#abb6ca;--line:#344158;--surface:#1b2434;--canvas:#111827;--accent:#76a8fa;--accent-soft:#20365d}html[data-tema-cliente="grafite"] .topbar{background:rgba(27,36,52,.94)!important}html[data-tema-cliente="grafite"] .text-dark{color:#e6eaf2!important}html[data-tema-cliente="grafite"] .btn-outline-secondary{color:#c7d2e8;border-color:#52627d}html[data-tema-cliente="grafite"] .table{--bs-table-bg:#1b2434;--bs-table-color:#e6eaf2}html[data-tema-cliente="grafite"] .modal-content{background:#1b2434;color:#e6eaf2}`;
document.head.appendChild(estilosTemaCliente);
function aplicarTemaCliente(tema) { document.documentElement.dataset.temaCliente = tema; localStorage.setItem('temaCliente', tema); document.querySelectorAll('[data-tema-cliente]').forEach(botao => botao.classList.toggle('active', botao.dataset.temaCliente === tema)); }
document.querySelectorAll('[data-tema-cliente]').forEach(botao => botao.onclick = () => aplicarTemaCliente(botao.dataset.temaCliente));
aplicarTemaCliente(localStorage.getItem('temaCliente') || 'sereno');
const ajusteSombrasTemaCliente = document.createElement('style');
ajusteSombrasTemaCliente.textContent = `
html[data-tema-cliente="sereno"]{--canvas:#fff;--surface:#fff;--line:#e6e8eb;--accent-soft:#f1f5f4}html[data-tema-cliente="sereno"] .portal-card{box-shadow:0 .55rem 1.4rem rgba(32,33,36,.10)}
html[data-tema-cliente="lavanda"]{--ink:#302b3b;--muted:#686176;--line:#d9d0e6;--surface:#fff;--canvas:#f8f5fc;--accent:#8a5db4;--accent-soft:#eee6f7}html[data-tema-cliente="lavanda"] .topbar{background:rgba(255,255,255,.95)!important}html[data-tema-cliente="lavanda"] .portal-card{box-shadow:0 .65rem 1.5rem rgba(89,64,118,.14)}
html[data-tema-cliente="noite"] .portal-card{box-shadow:0 .7rem 1.6rem rgba(0,0,0,.34)}html[data-tema-cliente="noite"] .vehicle-item:hover{box-shadow:0 .9rem 1.8rem rgba(69,183,122,.28)}
html[data-tema-cliente="grafite"] .portal-card{box-shadow:0 .7rem 1.6rem rgba(0,0,0,.42)}html[data-tema-cliente="grafite"] .vehicle-item:hover{box-shadow:0 .9rem 1.8rem rgba(90,145,240,.3)}
html[data-tema-cliente="gotico"]{
    --ink:#f5f3ff;
    --muted:#b8a9d9;
    --line:#3b245c;
    --surface:#151018;
    --canvas:#09070d;
    --accent:#8b5cf6;
    --accent-soft:#241438;
}

html[data-tema-cliente="gotico"] .topbar{
    background:rgba(15,10,20,.95)!important;
}

html[data-tema-cliente="gotico"] .portal-card{
    box-shadow:0 .7rem 1.8rem rgba(139,92,246,.25);
}
 .portal-card{
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}

.portal-card:hover{
    transform: translateY(-6px);
}   
    html[data-tema-cliente="gotico"] .portal-card:hover{
    border-color:#8b5cf6;
    box-shadow:
        0 0 15px rgba(139,92,246,.55),
        0 0 30px rgba(139,92,246,.35);
}

html[data-tema-cliente="grafite"] .portal-card:hover{
    border-color:#3b82f6;
    box-shadow:
        0 0 15px rgba(59,130,246,.55),
        0 0 30px rgba(59,130,246,.35);
}

html[data-tema-cliente="noite"] .portal-card:hover{
    border-color:#22c55e;
    box-shadow:
        0 0 15px rgba(34,197,94,.55),
        0 0 30px rgba(34,197,94,.35);
}

html[data-tema-cliente="lavanda"] .portal-card:hover{
    border-color:#d8b4fe;
    box-shadow:
        0 0 15px rgba(216,180,254,.55),
        0 0 30px rgba(216,180,254,.35);
}

html[data-tema-cliente="sereno"] .portal-card:hover{
    border-color:#cbd5e1;
    box-shadow:
        0 0 15px rgba(203,213,225,.7),
        0 0 30px rgba(203,213,225,.4);
}
`;
document.head.appendChild(ajusteSombrasTemaCliente);
const ajusteLegibilidadeTemaCliente = document.createElement('style');
ajusteLegibilidadeTemaCliente.textContent = `html[data-tema-cliente="sereno"] .table,html[data-tema-cliente="lavanda"] .table{--bs-table-bg:#fff;--bs-table-color:#202124;--bs-table-hover-bg:#f4f5f5;--bs-table-hover-color:#202124}html[data-tema-cliente="lavanda"] .table{--bs-table-hover-bg:#f4effa;--bs-table-hover-color:#302b3b}html[data-tema-cliente="lavanda"] .table th,html[data-tema-cliente="lavanda"] .table td{color:#302b3b!important}html[data-tema-cliente="sereno"] .table th,html[data-tema-cliente="sereno"] .table td{color:#202124!important}html[data-tema-cliente="sereno"] .dropdown-item,html[data-tema-cliente="lavanda"] .dropdown-item{color:#111!important}html[data-tema-cliente="sereno"] .dropdown-item:hover,html[data-tema-cliente="lavanda"] .dropdown-item:hover{background:#eee!important;color:#000!important}`;
document.head.appendChild(ajusteLegibilidadeTemaCliente);
const ajusteBotoesTemaCliente = document.createElement('style');
ajusteBotoesTemaCliente.textContent = `
html[data-tema-cliente="sereno"] .btn-success{background:#39726c;border-color:#39726c}html[data-tema-cliente="sereno"] .btn-success:hover{background:#2c5c57;border-color:#2c5c57}
html[data-tema-cliente="lavanda"] .btn-success{background:#ad5f8d;border-color:#ad5f8d}html[data-tema-cliente="lavanda"] .btn-success:hover{background:#914568;border-color:#914568}html[data-tema-cliente="lavanda"] .view-toggle .btn.active{background:#ad5f8d;border-color:#ad5f8d}
html[data-tema-cliente="noite"] .btn-success{background:#3b956b;border-color:#3b956b}html[data-tema-cliente="noite"] .btn-success:hover{background:#56ae7e;border-color:#56ae7e}html[data-tema-cliente="noite"] .view-toggle .btn.active{background:#3b956b;border-color:#3b956b}
html[data-tema-cliente="grafite"] .btn-success{background:#4c80d4;border-color:#4c80d4}html[data-tema-cliente="grafite"] .btn-success:hover{background:#6699ed;border-color:#6699ed}html[data-tema-cliente="grafite"] .view-toggle .btn.active{background:#4c80d4;border-color:#4c80d4}
`;
document.head.appendChild(ajusteBotoesTemaCliente);
const destaqueTemaCliente = document.createElement('style');
destaqueTemaCliente.textContent = `
html[data-tema-cliente="sereno"] [data-tema-cliente].active{background:#39726c!important;color:#fff!important;border-color:#39726c!important}
html[data-tema-cliente="lavanda"] [data-tema-cliente].active{background:#ad5f8d!important;color:#fff!important;border-color:#ad5f8d!important}
html[data-tema-cliente="noite"] [data-tema-cliente].active{background:#3b956b!important;color:#fff!important;border-color:#3b956b!important}
html[data-tema-cliente="grafite"] [data-tema-cliente].active{background:#4c80d4!important;color:#fff!important;border-color:#4c80d4!important}
html[data-tema-cliente="gotico"] [data-tema-cliente].active{background:#7c3aed!important;color:#fff!important;border-color:#7c3aed!important}
`;
document.head.appendChild(destaqueTemaCliente);
window.addEventListener('hashchange', () => { const tela = location.hash.slice(1); if (telas.includes(tela)) mostrarTela(tela, false); });
(async () => { await Promise.all([carregarPerfil(), carregarVeiculos(), carregarApartamentos()]); mostrarTela(telas.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio', false); })();
