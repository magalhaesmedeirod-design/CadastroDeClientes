let cacheClientes = [];
let fotoBase64 = "";
let paginaAtual = 1;
const clientesPorPagina = 6;
let idiomaAtual = localStorage.getItem('idiomaSistema') || 'pt-BR';

const traducoes = {
    'pt-BR': { panel:'Painel', home:'Início', clients:'Clientes', homeText:'Selecione “Clientes” na barra lateral para gerenciar o sistema.', search:'Pesquisar por nome, bairro ou CPF...', add:'+ Adicionar Cliente', name:'Nome', email:'E-mail', phone:'Telefone', cityState:'Bairro', previous:'« Anterior', next:'Próximo »', newClient:'Cadastrar Novo Cliente', editClient:'Informações / Editar Cliente', main:'Dados Principais', contact:'Canais de Contato', address:'Endereço', save:'Salvar', delete:'Excluir Cliente', back:'Voltar', fullName:'Nome completo', number:'Número', street:'Rua (ex.: Rua das Flores)', complement:'Complemento (opcional)', neighborhood:'Bairro', city:'Cidade', required:'Este campo é obrigatório.', noFile:'Nenhum arquivo selecionado', selectPhoto:'Selecionar Foto', photoRequired:'Selecione uma foto, por favor', confirmDelete:'Tem certeza que deseja remover permanentemente este cadastro?', saveError:'Não foi possível salvar o cadastro.' },
    en: { panel:'Dashboard', home:'Home', clients:'Clients', homeText:'Select “Clients” in the sidebar to manage the system.', search:'Search by name, neighborhood or CPF...', add:'+ Add Client', name:'Name', email:'Email', phone:'Phone', cityState:'Neighborhood', previous:'« Previous', next:'Next »', newClient:'Register New Client', editClient:'Client Information / Edit', main:'Main Information', contact:'Contact Information', address:'Address', save:'Save', delete:'Delete Client', back:'Back', fullName:'Full name', number:'Number', street:'Street (e.g. Main Street)', complement:'Complement (optional)', neighborhood:'Neighborhood', city:'City', required:'This field is required.', noFile:'No file selected', selectPhoto:'Select Photo', photoRequired:'Please select a photo', confirmDelete:'Are you sure you want to permanently remove this client?', saveError:'Could not save the client.' },
    fr: { panel:'Tableau de bord', home:'Accueil', clients:'Clients', homeText:'Sélectionnez « Clients » dans la barre latérale pour gérer le système.', search:'Rechercher par nom, quartier ou CPF...', add:'+ Ajouter un client', name:'Nom', email:'E-mail', phone:'Téléphone', cityState:'Quartier', previous:'« Précédent', next:'Suivant »', newClient:'Enregistrer un nouveau client', editClient:'Informations / Modifier le client', main:'Informations principales', contact:'Coordonnées', address:'Adresse', save:'Enregistrer', delete:'Supprimer le client', back:'Retour', fullName:'Nom complet', number:'Numéro', street:'Rue (ex. rue des Fleurs)', complement:'Complément (facultatif)', neighborhood:'Quartier', city:'Ville', required:'Ce champ est obligatoire.', noFile:'Aucun fichier sélectionné', selectPhoto:'Sélectionner une photo', photoRequired:'Veuillez sélectionner une photo', confirmDelete:'Voulez-vous vraiment supprimer définitivement ce client ?', saveError:'Impossible d’enregistrer le client.' },
    'zh-CN': { panel:'管理面板', home:'首页', clients:'客户', homeText:'在侧边栏中选择“客户”以管理系统。', search:'按姓名、城市或 CPF 搜索...', add:'+ 添加客户', name:'姓名', email:'电子邮箱', phone:'电话', cityState:'城市/州', previous:'« 上一页', next:'下一页 »', newClient:'登记新客户', editClient:'客户信息 / 编辑', main:'基本信息', contact:'联系信息', address:'地址', save:'保存', delete:'删除客户', back:'返回', fullName:'全名', number:'门牌号', street:'街道、道路或地址', complement:'补充信息（可选）', neighborhood:'街区', city:'城市', required:'此字段为必填项。', noFile:'未选择文件', selectPhoto:'选择照片', photoRequired:'请选择一张照片', confirmDelete:'确定要永久删除此客户吗？', saveError:'无法保存客户资料。' }
};
if (!traducoes[idiomaAtual]) idiomaAtual = 'pt-BR';

function t(chave) { return traducoes[idiomaAtual][chave] || traducoes['pt-BR'][chave] || chave; }
function textoDoElemento(elemento, texto) {
    const noTexto = [...elemento.childNodes].find(no => no.nodeType === Node.TEXT_NODE && no.nodeValue.trim());
    if (noTexto) noTexto.nodeValue = `\n                ${texto}\n            `;
    else elemento.textContent = texto;
}
function aplicarIdioma() {
    document.documentElement.lang = idiomaAtual;
    document.title = `${t('panel')} - ${t('clients')}`;
    textoDoElemento(document.querySelector('.sidebar h3'), t('panel'));
    textoDoElemento(document.getElementById('btn-nav-home'), t('home'));
    textoDoElemento(document.getElementById('btn-nav-clientes'), t('clients'));
    document.querySelector('#tela-home h1').textContent = t('home');
    document.querySelector('#tela-home p').textContent = t('homeText');
    document.getElementById('campo-busca').placeholder = t('search');
    document.getElementById('btn-abrir-cadastro').textContent = t('add');
    const cabecalhos = document.querySelectorAll('thead th');
    [t('name'), 'CPF', t('email'), t('phone'), t('cityState')].forEach((texto, i) => cabecalhos[i].textContent = texto);
    document.getElementById('btn-pag-anterior').textContent = t('previous');
    document.getElementById('btn-pag-proximo').textContent = t('next');
    const legendas = document.querySelectorAll('legend');
    [t('main'), t('contact'), t('address')].forEach((texto, i) => legendas[i].textContent = texto);
    Object.assign(inputs.nome, { placeholder:t('fullName') });
    Object.assign(inputs.numero, { placeholder:t('number') });
    Object.assign(inputs.logradouro, { placeholder:t('street') });
    Object.assign(inputs.complemento, { placeholder:t('complement') });
    Object.assign(inputs.bairro, { placeholder:t('neighborhood') });
    Object.assign(inputs.cidade, { placeholder:t('city') });
    document.querySelectorAll('.erro-campo').forEach(el => el.textContent = t('required'));
    textoDoElemento(document.querySelector('.btn-upload'), t('selectPhoto'));
    if (!fotoBase64) textoNomeArquivo.textContent = t('noFile');
    msgErroFoto.textContent = t('photoRequired');
    textoDoElemento(form.querySelector('[type="submit"]'), t('save'));
    textoDoElemento(document.getElementById('btn-excluir-cliente'), t('delete'));
    textoDoElemento(document.getElementById('btn-cancelar'), t('back'));
    if (!inputs.id.value) document.getElementById('titulo-formulario').textContent = t('newClient');
}

const telas = {
    home: document.getElementById('tela-home'),
    clientes: document.getElementById('tela-clientes'),
    formulario: document.getElementById('tela-formulario')
};

const form = document.getElementById('form-cliente');
const inputs = {
    id: document.getElementById('input-id'),
    nome: document.getElementById('input-nome'),
    cpf: document.getElementById('input-cpf'),
    foto: document.getElementById('input-foto'),
    email: document.getElementById('input-email'),
    telefone: document.getElementById('input-telefone'),
    cep: document.getElementById('input-cep'),
    logradouro: document.getElementById('input-logradouro'),
    numero: document.getElementById('input-numero'),
    complemento: document.getElementById('input-complemento'),
    bairro: document.getElementById('input-bairro'),
    cidade: document.getElementById('input-cidade'),
    uf: document.getElementById('input-uf')
};

const textoNomeArquivo = document.getElementById('nome-arquivo');
const msgErroFoto = document.getElementById('erro-foto');
const seletorIdioma = document.getElementById('input-idioma');
seletorIdioma.value = idiomaAtual;
seletorIdioma.addEventListener('change', () => {
    if (seletorIdioma.value === 'browser') {
        alert('Para outros idiomas, use a opção “Traduzir” do navegador. Os idiomas Português, English, Français e 中文 são traduzidos diretamente pelo sistema.');
        seletorIdioma.value = idiomaAtual;
        return;
    }
    idiomaAtual = seletorIdioma.value;
    localStorage.setItem('idiomaSistema', idiomaAtual);
    aplicarIdioma();
});

function navegarPara(nomeDaTela) {
    Object.keys(telas).forEach(chave => {
        telas[chave].style.display = (chave === nomeDaTela) ? 'block' : 'none';
    });
    if (nomeDaTela === 'clientes') {
        window.location.hash = `pagina=${paginaAtual}`;
        buscarClientesDoServidor();
    } else {
        window.location.hash = nomeDaTela;
    }
}

document.getElementById('btn-nav-home').addEventListener('click', () => navegarPara('home'));
document.getElementById('btn-nav-clientes').addEventListener('click', () => navegarPara('clientes'));
document.getElementById('btn-abrir-cadastro').addEventListener('click', prepararNovoCadastro);
document.getElementById('btn-cancelar').addEventListener('click', () => navegarPara('clientes'));
const btnMenu = document.getElementById('btn-menu');
btnMenu.addEventListener('click', () => {
    const celular = window.matchMedia('(max-width: 640px)').matches;
    const classe = celular ? 'menu-aberto' : 'menu-recolhido';
    const visivel = celular
        ? document.body.classList.toggle(classe)
        : !document.body.classList.toggle(classe);
    btnMenu.setAttribute('aria-expanded', visivel);
});

// Ouvinte de busca inteligente: reseta a página atual ao digitar para não quebrar a exibição
document.getElementById('campo-busca').addEventListener('input', () => {
    paginaAtual = 1;
    window.location.hash = `pagina=1`;
    renderizarSistema();
});

document.getElementById('btn-excluir-cliente').addEventListener('click', ejecutarExclusao);
form.addEventListener('submit', encaminharFormulario);

// Máscara de CPF automática
inputs.cpf.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v;
});

// Captura e conversão da imagem do explorador de arquivos
inputs.foto.addEventListener('change', function(e) {
    const arquivo = e.target.files[0];
    if (arquivo) {
        textoNomeArquivo.textContent = arquivo.name;
        msgErroFoto.style.display = 'none';
        const leitor = new FileReader();
        leitor.onload = function(evento) { 
            fotoBase64 = evento.target.result; 
        };
        leitor.readAsDataURL(arquivo);
    } else {
        textoNomeArquivo.textContent = "Nenhum arquivo selecionado";
        fotoBase64 = "";
    }
});

async function buscarClientesDoServidor() {
    try {
        const resposta = await fetch('/api/clientes');
        cacheClientes = await resposta.json();
        renderizarSistema();
    } catch (erro) {
        console.error("Erro ao conectar com o back-end Python:", erro);
    }
}

function renderizarSistema() {
    console.log("Entrou na renderização");

    const termoBusca = document.getElementById('campo-busca').value.toLowerCase().trim();
    
    // FILTRAGEM CIRÚRGICA: Regras rígidas para isolar Cidade, CPF e Nome Completo
    const filtrados = cacheClientes.filter(c => {
        if (!termoBusca) return true;

        const nomeCliente = c.nome ? c.nome.toLowerCase() : "";
        const bairroCliente = c.bairro ? c.bairro.toLowerCase() : "";
        const cpfCliente = c.cpf ? c.cpf.replace(/\D/g, "") : "";
        const termoLimpo = termoBusca.replace(/\D/g, "");

        // 1. Se a busca bater com uma cidade existente, exibe SOMENTE aquela cidade
        if (bairroCliente === termoBusca || bairroCliente.includes(termoBusca)) {
            return bairroCliente.includes(termoBusca);
        }

        // 2. Se a busca for numérica, isola e filtra SOMENTE pelo CPF exato
        if (termoLimpo.length > 0 && isNaN(termoBusca) === false) {
            return cpfCliente.includes(termoLimpo);
        }

        // 3. Se for nome, separa por espaços e exige que TODOS os sobrenomes digitados existam no cadastro
        const pedacosBusca = termoBusca.split(" ");
        return pedacosBusca.every(pedaco => nomeCliente.includes(pedaco));
    });

    const totalPaginas = Math.ceil(filtrados.length / clientesPorPagina) || 1;
    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
        window.location.hash = `pagina=${paginaAtual}`;
    }

    const inicio = (paginaAtual - 1) * clientesPorPagina;
    const paginaDados = filtrados.slice(inicio, inicio + clientesPorPagina);

    const tbody = document.getElementById('linhas-tabela');

    console.log("tbody =", tbody);
    console.log("cacheClientes =", cacheClientes);
    console.log("Quantidade de clientes =", cacheClientes.length);
    tbody.innerHTML = '';
    paginaDados.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="#" class="link-editar" data-id="${c.id}">${c.nome}</a></td>
            <td>${c.cpf || 'Não informado'}</td>
            <td>${c.email}</td>
            <td>${c.telefone}</td>
            <td>${c.bairro || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.link-editar').forEach(l => {
        l.addEventListener('click', (e) => {
            e.preventDefault();
            carregarClienteNoFormulario(e.target.getAttribute('data-id'));
        });
    });

    const containerNumeros = document.getElementById('numeros-paginas');
    containerNumeros.innerHTML = '';
    for (let i = 1; i <= totalPaginas; i++) {
        const b = document.createElement('button');
        b.textContent = i;
        b.className = `btn-numero-pag ${i === paginaAtual ? 'ativo' : ''}`;
        b.addEventListener('click', () => { 
            paginaAtual = i; 
            window.location.hash = `pagina=${paginaAtual}`;
            renderizarSistema(); 
        });
        containerNumeros.appendChild(b);
    }

    document.getElementById('btn-pag-anterior').disabled = (paginaAtual === 1);
    document.getElementById('btn-pag-proximo').disabled = (paginaAtual === totalPaginas);
}

document.getElementById('btn-pag-anterior').addEventListener('click', () => {
    if (paginaAtual > 1) { 
        paginaAtual--; 
        window.location.hash = `pagina=${paginaAtual}`;
        renderizarSistema(); 
    }
});

document.getElementById('btn-pag-proximo').addEventListener('click', () => {
    const termoBusca = document.getElementById('campo-busca').value.toLowerCase().trim();
    const filtrados = cacheClientes.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(termoBusca)) || 
        (c.bairro && c.bairro.toLowerCase().includes(termoBusca)) ||
        (c.cpf && c.cpf.includes(termoBusca))
    );
    const totalPaginas = Math.ceil(filtrados.length / clientesPorPagina) || 1;
    if (paginaAtual < totalPaginas) { 
        paginaAtual++; 
        window.location.hash = `pagina=${paginaAtual}`;
        renderizarSistema(); 
    }
});

function prepararNovoCadastro() {
    form.reset();
    inputs.id.value = '';
    fotoBase64 = '';
    textoNomeArquivo.textContent = t('noFile');
    msgErroFoto.style.display = 'none';
    form.querySelectorAll('.erro-campo').forEach(s => s.style.display = 'none');
    form.querySelectorAll('input').forEach(i => i.style.borderColor = '');
    document.getElementById('titulo-formulario').innerText = t('newClient');
    document.getElementById('btn-excluir-cliente').style.display = 'none';
    navegarPara('formulario');
}

function carregarClienteNoFormulario(id) {
    const c = cacheClientes.find(item => item.id === id);
    if (!c) return;
    msgErroFoto.style.display = 'none';
    form.querySelectorAll('.erro-campo').forEach(s => s.style.display = 'none');
    form.querySelectorAll('input').forEach(i => i.style.borderColor = '');
    
    inputs.id.value = c.id;
    inputs.nome.value = c.nome;
    inputs.cpf.value = c.cpf || '';
    inputs.email.value = c.email;
    inputs.telefone.value = c.telefone;
    inputs.cep.value = c.cep;
    inputs.logradouro.value = c.logradouro || '';
    inputs.bairro.value = c.bairro;
    fotoBase64 = c.foto || '';
    textoNomeArquivo.textContent = fotoBase64 ? 'Imagem salva no registro' : t('noFile');
    document.getElementById('titulo-formulario').innerText = t('editClient');
    document.getElementById('btn-excluir-cliente').style.display = 'inline-block';
    navegarPara('formulario');
}

async function encaminharFormulario(e) {
    if (e) e.preventDefault();
    let valido = true;

    form.querySelectorAll('input').forEach(i => i.style.borderColor = '');
    form.querySelectorAll('.erro-campo').forEach(s => s.style.display = 'none');
    msgErroFoto.style.display = 'none';

    if (!fotoBase64 || fotoBase64.trim() === "") {
        msgErroFoto.style.display = 'block';
        valido = false;
    }

    const obrigatorios = form.querySelectorAll('input[required]');
    obrigatorios.forEach(campo => {
        if (!campo.value.trim()) {
            mostrarErro(campo, 'Este campo é obrigatório.');
            valido = false;
        }
    });

    if (!valido) return;

    const id = inputs.id.value;
    const dados = {
        nome: inputs.nome.value,
        cpf: inputs.cpf.value,
        foto: fotoBase64,
        email: inputs.email.value,
        telefone: inputs.telefone.value,
        cep: inputs.cep.value,
        logradouro: inputs.logradouro.value,
        complemento: inputs.complemento.value,
        bairro: inputs.bairro.value
    };

    const url = id ? `/api/clientes/${id}` : '/api/clientes';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const r = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (r.ok) navegarPara('clientes');
        else {
            const resposta = await r.json();
            alert(resposta.erro || t('saveError'));
        }
    } catch (err) {
        console.error("Erro ao enviar dados para o Python:", err);
    }
}

async function ejecutarExclusao() {
    const id = inputs.id.value;
    if (!id || !confirm(t('confirmDelete'))) return;
    try {
        const r = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (r.ok) navegarPara('clientes');
    } catch (erro) {
        console.error("Erro ao deletar registro no Python:", erro);
    }
}

window.addEventListener('load', async () => {
    try {
        const resposta = await fetch('/api/clientes');
        cacheClientes = await resposta.json();
        
        const hash = window.location.hash;
        if (hash.startsWith('#pagina=')) {
            paginaAtual = parseInt(hash.replace('#pagina=', '')) || 1;
            Object.keys(telas).forEach(ch => telas[ch].style.display = (ch === 'clientes') ? 'block' : 'none');
            renderizarSistema();
        } else if (hash === '#formulario') {
            navegarPara('formulario');
        } else {
            navegarPara('home');
        }
    } catch (e) {
        navegarPara('home');
    }
});

aplicarIdioma();

function aplicarMascara(campo, limite, formatar) {
    campo.addEventListener('input', e => {
        e.target.value = formatar(e.target.value.replace(/\D/g, '').slice(0, limite));
    });
}
aplicarMascara(inputs.telefone, 11, v => v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'));
aplicarMascara(inputs.cep, 8, v => v.replace(/^(\d{5})(\d)/, '$1-$2'));

function mostrarErro(campo, mensagem) {
    campo.style.borderColor = '#ff4444';
    const span = campo.nextElementSibling;
    if (span && span.classList.contains('erro-campo')) {
        span.textContent = mensagem;
        span.style.display = 'block';
    }
}
