const formLogin = document.querySelector('#form-login');
const inputUsuario = document.querySelector('#input-usuario');
const inputSenha = document.querySelector('#input-senha');
const mensagemLogin = document.querySelector('#mensagem-login');
const botaoEntrar = document.querySelector('#btn-entrar');

function mostrarErroLogin(texto) {
  mensagemLogin.textContent = texto;
  mensagemLogin.hidden = false;
}

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  mensagemLogin.hidden = true;

  [inputUsuario, inputSenha].forEach(campo =>
    campo.classList.toggle('is-invalid', !campo.value.trim())
  );

  if (!inputUsuario.value.trim() || !inputSenha.value.trim()) return;

  botaoEntrar.disabled = true;
  botaoEntrar.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Entrando...';

  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: inputUsuario.value.trim(),
        senha: inputSenha.value
      })
    });

    const retorno = await resposta.json();

    if (!resposta.ok) {
      throw new Error(retorno.erro || 'Não foi possível realizar o login.');
    }

    window.location.assign('/');

  } catch (erro) {

    mostrarErroLogin(erro.message);

    botaoEntrar.disabled = false;
    botaoEntrar.innerHTML =
      '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
  }
});

document.querySelector('#btn-mostrar-senha').addEventListener('click', () => {

  const visivel = inputSenha.type === 'text';

  inputSenha.type = visivel ? 'password' : 'text';

  document.querySelector('#btn-mostrar-senha').innerHTML =
    `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`;

  document.querySelector('#btn-mostrar-senha')
    .setAttribute(
      'aria-label',
      visivel ? 'Mostrar senha' : 'Ocultar senha'
    );

});

/* ===========================
   TEMA DO LOGIN
=========================== */

const tema = localStorage.getItem('temaCliente') || 'sereno';

document.documentElement.dataset.temaCliente = tema;

const estiloLogin = document.createElement('style');

estiloLogin.textContent = `

body{
    transition:background .35s ease,color .35s ease;
}

#card-login{
    transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease,
        background .25s ease;
}

#card-login:hover{
    transform:translateY(-6px);
}

/* ================= SERENO ================= */

html[data-tema-cliente="sereno"] body{
    background:#f8f9fa;
}

html[data-tema-cliente="sereno"] #card-login{
    background:#fff;
    box-shadow:0 0 15px rgba(203,213,225,.35);
}

html[data-tema-cliente="sereno"] #card-login:hover{
    box-shadow:0 0 28px rgba(203,213,225,.60);
}

/* ================= LAVANDA ================= */

html[data-tema-cliente="lavanda"] body{
    background:#f8f5fc;
}

html[data-tema-cliente="lavanda"] #card-login{
    background:#fff;
    box-shadow:0 0 15px rgba(216,180,254,.35);
}

html[data-tema-cliente="lavanda"] #card-login:hover{
    box-shadow:0 0 30px rgba(216,180,254,.60);
}

/* ================= GRAFITE ================= */

html[data-tema-cliente="grafite"] body{
    background:#1d2125;
}

html[data-tema-cliente="grafite"] #card-login{
    background:#2b3138;
    color:white;
    box-shadow:0 0 15px rgba(59,130,246,.30);
}

html[data-tema-cliente="grafite"] #card-login:hover{
    box-shadow:0 0 30px rgba(59,130,246,.55);
}

/* ================= NOITE ================= */

html[data-tema-cliente="noite"] body{
    background:#08110c;
}

html[data-tema-cliente="noite"] #card-login{
    background:#121916;
    color:white;
    box-shadow:0 0 15px rgba(34,197,94,.30);
}

html[data-tema-cliente="noite"] #card-login:hover{
    box-shadow:0 0 30px rgba(34,197,94,.55);
}

/* ================= GÓTICO ================= */

html[data-tema-cliente="gotico"] body{
    background:#09070d;
}

html[data-tema-cliente="gotico"] #card-login{
    background:#151018;
    color:white;
    box-shadow:0 0 15px rgba(139,92,246,.35);
}

html[data-tema-cliente="gotico"] #card-login:hover{
    box-shadow:0 0 35px rgba(139,92,246,.65);
}

`;

document.head.appendChild(estiloLogin);