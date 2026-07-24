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
  [inputUsuario, inputSenha].forEach(campo => campo.classList.toggle('is-invalid', !campo.value.trim()));
  if (!inputUsuario.value.trim() || !inputSenha.value.trim()) return;

  botaoEntrar.disabled = true;
  botaoEntrar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Entrando...';
  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: inputUsuario.value.trim(), senha: inputSenha.value })
    });
    const retorno = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível realizar o login.');
    window.location.assign('/');
  } catch (erro) {
    mostrarErroLogin(erro.message);
    botaoEntrar.disabled = false;
    botaoEntrar.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
  }
});

document.querySelector('#btn-mostrar-senha').addEventListener('click', () => {
  const visivel = inputSenha.type === 'text';
  inputSenha.type = visivel ? 'password' : 'text';
  document.querySelector('#btn-mostrar-senha').innerHTML = `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`;
  document.querySelector('#btn-mostrar-senha').setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});
