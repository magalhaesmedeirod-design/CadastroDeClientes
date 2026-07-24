import json
import os
import re
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

ARQUIVO_CONTAS = "dados_usuarios.json"
PADRAO_USUARIO = re.compile(r"[a-z0-9._-]{3,30}")
PADRAO_GMAIL = re.compile(r"[a-z0-9._%+-]+@gmail\.com")


class ErroConta(ValueError):
    pass


def formatar_telefone(valor):
    telefone = re.sub(r"\D", "", str(valor or ""))
    if len(telefone) != 11:
        raise ErroConta("Informe um telefone válido com DDD, por exemplo (92) 99999-9999.")
    return f"({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}"


def ler_contas():
    if not os.path.exists(ARQUIVO_CONTAS):
        return []
    with open(ARQUIVO_CONTAS, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_contas(contas):
    with open(ARQUIVO_CONTAS, "w", encoding="utf-8") as arquivo:
        json.dump(contas, arquivo, indent=2, ensure_ascii=False)


def sugerir_usuario(base):
    base = re.sub(r"[^a-z0-9._-]", "", str(base or "").lower())[:24] or "usuario"
    existentes = {conta["usuario"].lower() for conta in ler_contas()}
    if base not in existentes:
        return base
    numero = 2
    while f"{base}{numero}" in existentes:
        numero += 1
    return f"{base}{numero}"


def criar_conta(dados, superusuario=False):
    usuario = str(dados.get("usuario", "")).strip().lower()
    email = str(dados.get("email", "")).strip().lower()
    senha = str(dados.get("senha", ""))
    telefone = formatar_telefone(dados.get("telefone")) if superusuario else None
    if not PADRAO_USUARIO.fullmatch(usuario):
        raise ErroConta("O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.")
    if not PADRAO_GMAIL.fullmatch(email):
        raise ErroConta("Informe um endereço Gmail válido, por exemplo nome@gmail.com.")
    if len(senha) < 6:
        raise ErroConta("A senha deve ter pelo menos 6 caracteres.")

    contas = ler_contas()
    if any(conta["usuario"].lower() == usuario for conta in contas):
        raise ErroConta("Este nome de usuário já está em uso.")
    if any(conta["email"].lower() == email for conta in contas):
        raise ErroConta("Este Gmail já está cadastrado.")

    if telefone and any(conta.get("telefone") == telefone for conta in contas):
        raise ErroConta("Este telefone já está cadastrado.")

    conta = {
        "usuario": usuario,
        "email": email,
        "senha": generate_password_hash(senha),
        "criado_em": datetime.now(timezone.utc).isoformat(),
        "ultimo_login": None,
        "total_logins": 0,
        "superusuario": superusuario,
    }
    if telefone:
        conta["telefone"] = telefone
    contas.append(conta)
    salvar_contas(contas)
    return {"usuario": usuario, "email": email, "telefone": telefone}


def autenticar(identificador, senha, somente_superusuario=False):
    identificador = str(identificador or "").strip().lower()
    for conta in ler_contas():
        if (not somente_superusuario or conta.get("superusuario", False)) and identificador in (conta["usuario"].lower(), conta["email"].lower()) and check_password_hash(conta["senha"], senha):
            return conta
    return None


def registrar_login(usuario):
    contas = ler_contas()
    for conta in contas:
        if conta["usuario"] == usuario:
            conta["ultimo_login"] = datetime.now(timezone.utc).isoformat()
            conta["total_logins"] = conta.get("total_logins", 0) + 1
            salvar_contas(contas)
            return


def listar_contas_publicas():
    return [{
        "usuario": conta["usuario"],
        "email": conta["email"],
        "criado_em": conta.get("criado_em"),
        "ultimo_login": conta.get("ultimo_login"),
        "total_logins": conta.get("total_logins", 0),
        "superusuario": conta.get("superusuario", False),
        "telefone": conta.get("telefone"),
    } for conta in ler_contas()]


def existe_superusuario():
    return any(conta.get("superusuario", False) for conta in ler_contas())


def obter_conta_publica(usuario):
    for conta in ler_contas():
        if conta["usuario"] == usuario:
            return {
                "usuario": conta["usuario"], "email": conta["email"], "telefone": conta.get("telefone"),
                "superusuario": conta.get("superusuario", False), "criado_em": conta.get("criado_em"),
                "ultimo_login": conta.get("ultimo_login"), "total_logins": conta.get("total_logins", 0),
            }
    return None


def atualizar_conta(usuario_atual, dados, permitir_alterar_tipo=False):
    contas = ler_contas()
    conta = next((item for item in contas if item["usuario"] == usuario_atual), None)
    if not conta:
        raise ErroConta("Usuário não encontrado.")
    usuario = str(dados.get("usuario") or conta["usuario"]).strip().lower()
    email = str(dados.get("email") or conta["email"]).strip().lower()
    senha = str(dados.get("senha", ""))
    superusuario = bool(dados.get("superusuario", conta.get("superusuario", False))) if permitir_alterar_tipo else conta.get("superusuario", False)
    telefone_informado = dados.get("telefone") or conta.get("telefone")
    telefone = formatar_telefone(telefone_informado) if superusuario else None
    if not PADRAO_USUARIO.fullmatch(usuario):
        raise ErroConta("O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.")
    if not PADRAO_GMAIL.fullmatch(email):
        raise ErroConta("Informe um endereço Gmail válido.")
    if senha and len(senha) < 6:
        raise ErroConta("A nova senha deve ter pelo menos 6 caracteres.")
    if any(item is not conta and item["usuario"].lower() == usuario for item in contas):
        raise ErroConta("Este nome de usuário já está em uso.")
    if any(item is not conta and item["email"].lower() == email for item in contas):
        raise ErroConta("Este Gmail já está cadastrado.")
    if telefone and any(item is not conta and item.get("telefone") == telefone for item in contas):
        raise ErroConta("Este telefone já está cadastrado.")
    conta.update({"usuario": usuario, "email": email, "superusuario": superusuario})
    if senha:
        conta["senha"] = generate_password_hash(senha)
    if telefone:
        conta["telefone"] = telefone
    else:
        conta.pop("telefone", None)
    salvar_contas(contas)
    return obter_conta_publica(usuario)


def deletar_conta(usuario):
    contas = ler_contas()
    restantes = [conta for conta in contas if conta["usuario"] != usuario]
    if len(restantes) == len(contas):
        return False
    salvar_contas(restantes)
    return True
