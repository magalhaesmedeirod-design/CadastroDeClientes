let cacheClientes = [];
let fotoBase64 = "";
let paginaAtual = 1;
const clientesPorPagina = 6;

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
    numero: document.getElementById('input-numero'),
    complemento: document.getElementById('input-complemento'),
    bairro: document.getElementById('input-bairro'),
    cidade: document.getElementById('input-cidade'),
    uf: document.getElementById('input-uf')
};

const textoNomeArquivo = document.getElementById('nome-arquivo');
const msgErroFoto = document.getElementById('erro-foto');

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
        const cidadeCliente = c.cidade ? c.cidade.toLowerCase() : "";
        const cpfCliente = c.cpf ? c.cpf.replace(/\D/g, "") : "";
        const termoLimpo = termoBusca.replace(/\D/g, "");

        // 1. Se a busca bater com uma cidade existente, exibe SOMENTE aquela cidade
        if (cidadeCliente === termoBusca || cidadeCliente.includes(termoBusca)) {
            return cidadeCliente.includes(termoBusca);
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
            <td>${c.cidade}/${c.uf}</td>
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
        (c.cidade && c.cidade.toLowerCase().includes(termoBusca)) || 
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
    textoNomeArquivo.textContent = "Nenhum arquivo selecionado";
    msgErroFoto.style.display = 'none';
    form.querySelectorAll('.erro-campo').forEach(s => s.style.display = 'none');
    form.querySelectorAll('input').forEach(i => i.style.borderColor = '');
    document.getElementById('titulo-formulario').innerText = 'Cadastrar Novo Cliente';
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
    inputs.numero.value = c.numero;
    inputs.complemento.value = c.complemento || '';
    inputs.bairro.value = c.bairro;
    inputs.cidade.value = c.cidade;
    inputs.uf.value = c.uf;
    fotoBase64 = c.foto || '';
    textoNomeArquivo.textContent = fotoBase64 ? "Imagem salva no registro" : "Nenhum arquivo selecionado";
    document.getElementById('titulo-formulario').innerText = 'Informações / Editar Cliente';
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
            campo.style.borderColor = '#ff4444';
            const spanErro = campo.nextElementSibling;
            if (spanErro && spanErro.classList.contains('erro-campo')) {
                spanErro.style.display = 'block';
            }
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
        numero: inputs.numero.value,
        complemento: inputs.complemento.value,
        bairro: inputs.bairro.value,
        cidade: inputs.cidade.value,
        uf: inputs.uf.value
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
    } catch (err) {
        console.error("Erro ao enviar dados para o Python:", err);
    }
}

async function ejecutarExclusao() {
    const id = inputs.id.value;
    if (!id || !confirm("Tem certeza que deseja remover permanentemente este cadastro?")) return;
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