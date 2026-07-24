const formCadastro = document.querySelector('#form-cadastro');
const inputNovoUsuario = document.querySelector('#input-novo-usuario');
const inputEmailCadastro = document.querySelector('#input-email-cadastro');
const inputNovaSenha = document.querySelector('#input-nova-senha');
const mensagemCadastro = document.querySelector('#mensagem-cadastro');
const botaoCriarConta = document.querySelector('#btn-criar-conta');

function mostrarErroCadastro(texto) {
  mensagemCadastro.textContent = texto;
  mensagemCadastro.hidden = false;
}

async function sugerirUsuario() {
  if (inputNovoUsuario.value.trim()) return;
  const base = inputEmailCadastro.value.split('@')[0].trim();
  if (!base) return;
  const resposta = await fetch(`/api/usuarios/sugestao?base=${encodeURIComponent(base)}`);
  if (resposta.ok) inputNovoUsuario.value = (await resposta.json()).usuario;
}

inputEmailCadastro.addEventListener('blur', () => { sugerirUsuario().catch(() => {}); });

formCadastro.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagemCadastro.hidden = true;
  const gmailValido = /^[^\s@]+@gmail\.com$/i.test(inputEmailCadastro.value.trim());
  inputEmailCadastro.classList.toggle('is-invalid', !gmailValido);
  [inputNovoUsuario, inputNovaSenha].forEach(campo => campo.classList.toggle('is-invalid', !campo.value.trim()));
  if (!inputNovoUsuario.value.trim() || !inputNovaSenha.value.trim() || !gmailValido) return;

  botaoCriarConta.disabled = true;
  botaoCriarConta.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Criando conta...';
  try {
    const resposta = await fetch('/api/cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: inputNovoUsuario.value, email: inputEmailCadastro.value, senha: inputNovaSenha.value }) });
    const retorno = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível criar a conta.');
    window.location.assign('/');
  } catch (erro) {
    mostrarErroCadastro(erro.message);
    botaoCriarConta.disabled = false;
    botaoCriarConta.innerHTML = '<i class="bi bi-person-check me-2"></i>Criar conta';
  }
});

document.querySelector('#btn-mostrar-nova-senha').addEventListener('click', () => {
  const visivel = inputNovaSenha.type === 'text';
  inputNovaSenha.type = visivel ? 'password' : 'text';
  document.querySelector('#btn-mostrar-nova-senha').innerHTML = `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`;
});
