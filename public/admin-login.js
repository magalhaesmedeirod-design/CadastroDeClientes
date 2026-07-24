const formLogin = document.querySelector('#form-login');
const usuario = document.querySelector('#input-usuario');
const senha = document.querySelector('#input-senha');
const mensagem = document.querySelector('#mensagem-login');
const botao = document.querySelector('#btn-entrar');

document.querySelector('#btn-mostrar-senha').addEventListener('click', () => {
  const visivel = senha.type === 'text';
  senha.type = visivel ? 'password' : 'text';
  document.querySelector('#btn-mostrar-senha').innerHTML = `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`;
  document.querySelector('#btn-mostrar-senha').setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault(); mensagem.hidden = true;
  [usuario, senha].forEach(campo => campo.classList.toggle('is-invalid', !campo.value.trim()));
  if (!usuario.value.trim() || !senha.value.trim()) return;
  botao.disabled = true;
  try {
    const resposta = await fetch('/api/admin/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({usuario: usuario.value.trim(), senha: senha.value}) });
    const retorno = await resposta.json();
    if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível entrar.');
    window.location.assign('/admin');
  } catch (erro) { mensagem.textContent = erro.message; mensagem.hidden = false; botao.disabled = false; }
});
