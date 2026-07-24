const formCadastroAdmin = document.querySelector('#form-cadastro');
const camposAdmin = ['usuario', 'email', 'telefone', 'senha'].map(id => document.querySelector(`#${id}`));
const mensagemCadastroAdmin = document.querySelector('#mensagem-cadastro');
const telefoneAdmin = document.querySelector('#telefone');
const senhaAdmin = document.querySelector('#senha');

telefoneAdmin.addEventListener('input', () => {
  const numeros = telefoneAdmin.value.replace(/\D/g, '').slice(0, 11);
  let formatado = numeros;
  if (numeros.length) formatado = `(${numeros.slice(0, 2)}`;
  if (numeros.length >= 3) formatado += `) ${numeros.slice(2, 7)}`;
  if (numeros.length >= 8) formatado += `-${numeros.slice(7)}`;
  telefoneAdmin.value = formatado;
});

document.querySelector('#btn-mostrar-senha').addEventListener('click', () => {
  const visivel = senhaAdmin.type === 'text';
  senhaAdmin.type = visivel ? 'password' : 'text';
  document.querySelector('#btn-mostrar-senha').innerHTML = `<i class="bi bi-eye${visivel ? '' : '-slash'}"></i>`;
  document.querySelector('#btn-mostrar-senha').setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});
formCadastroAdmin.addEventListener('submit', async evento => {
  evento.preventDefault(); mensagemCadastroAdmin.hidden = true;
  camposAdmin.forEach(campo => campo.classList.toggle('is-invalid', !campo.value.trim()));
  if (camposAdmin.some(campo => !campo.value.trim())) return;
  try {
    const dados = Object.fromEntries(camposAdmin.map(campo => [campo.id, campo.value]));
    const resposta = await fetch('/api/admin/cadastro', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados)});
    const retorno = await resposta.json(); if (!resposta.ok) throw new Error(retorno.erro || 'Não foi possível criar a conta.');
    window.location.assign('/admin');
  } catch (erro) { mensagemCadastroAdmin.textContent = erro.message; mensagemCadastroAdmin.hidden = false; }
});
