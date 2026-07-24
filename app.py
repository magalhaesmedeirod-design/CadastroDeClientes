import os
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory, session
import controladores
import contas

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "troque-esta-chave-em-producao")


def login_obrigatorio(funcao):
    @wraps(funcao)
    def decorador(*args, **kwargs):
        if not session.get("usuario"):
            return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 401
        return funcao(*args, **kwargs)
    return decorador


def admin_obrigatorio(funcao):
    @wraps(funcao)
    def decorador(*args, **kwargs):
        if not session.get("superusuario"):
            return jsonify({"erro": "Acesso restrito a superusuários."}), 403
        return funcao(*args, **kwargs)
    return decorador

# ---- ROTAS PARA CONECTAR O SEU FRONT-END ----
@app.route("/")
def index():
    if not session.get("usuario"):
        return send_from_directory("public", "login.html")
    return send_from_directory("public", "index.html")


@app.route("/cadastro")
def cadastro():
    return send_from_directory("public", "cadastro.html")


@app.route("/admin")
def painel_admin():
    if not session.get("superusuario"):
        return send_from_directory("public", "admin-login.html")
    return send_from_directory("public", "admin.html")


@app.route("/admin.html")
@app.route("/admin/<path:pagina>")
def proteger_paginas_admin(pagina=None):
    """Evita que o painel seja aberto diretamente fora da rota protegida."""
    if not session.get("superusuario"):
        return send_from_directory("public", "admin-login.html")
    return send_from_directory("public", "admin.html")


@app.route("/admin/cadastro")
def cadastro_admin():
    if session.get("superusuario"):
        return send_from_directory("public", "admin.html")
    if contas.existe_superusuario():
        return send_from_directory("public", "admin-login.html")
    return send_from_directory("public", "admin-cadastro.html")


@app.route("/api/login", methods=["POST"])
def api_login():
    dados = request.get_json(silent=True) or {}
    usuario = str(dados.get("usuario", "")).strip()
    senha = str(dados.get("senha", ""))
    conta = contas.autenticar(usuario, senha)
    if not conta:
        return jsonify({"erro": "Usuário ou senha inválidos."}), 401
    session.clear()
    session["usuario"] = conta["usuario"]
    if conta.get("superusuario", False):
        session["superusuario"] = True
    contas.registrar_login(conta["usuario"])
    return jsonify({"mensagem": "Login realizado com sucesso."})


@app.route("/api/cadastro", methods=["POST"])
def api_cadastro():
    try:
        conta = contas.criar_conta(request.get_json(silent=True) or {})
        return jsonify({"mensagem": "Conta criada com sucesso.", "conta": conta}), 201
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/login", methods=["POST"])
def api_admin_login():
    dados = request.get_json(silent=True) or {}
    conta = contas.autenticar(dados.get("usuario", ""), str(dados.get("senha", "")), somente_superusuario=True)
    if not conta:
        return jsonify({"erro": "Credenciais de superusuário inválidas."}), 401
    session.clear()
    session["usuario"] = conta["usuario"]
    session["superusuario"] = True
    contas.registrar_login(conta["usuario"])
    return jsonify({"mensagem": "Login administrativo realizado com sucesso."})


@app.route("/api/admin/cadastro", methods=["POST"])
def api_admin_cadastro():
    if not session.get("superusuario") and contas.existe_superusuario():
        return jsonify({"erro": "Faça login como superusuário para criar outra conta administrativa."}), 403
    try:
        conta = contas.criar_conta(request.get_json(silent=True) or {}, superusuario=True)
        return jsonify({"mensagem": "Superusuário criado com sucesso.", "conta": conta}), 201
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/usuarios/sugestao", methods=["GET"])
def api_sugerir_usuario():
    return jsonify({"usuario": contas.sugerir_usuario(request.args.get("base", ""))})


@app.route("/api/admin/usuarios", methods=["GET"])
@admin_obrigatorio
def api_admin_listar_usuarios():
    return jsonify(contas.listar_contas_publicas())


@app.route("/api/admin/usuarios", methods=["POST"])
@admin_obrigatorio
def api_admin_criar_usuario():
    try:
        conta = contas.criar_conta(request.get_json(silent=True) or {}, bool((request.get_json(silent=True) or {}).get("superusuario")))
        return jsonify(conta), 201
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/usuarios/<string:usuario>", methods=["PUT", "DELETE"])
@admin_obrigatorio
def api_admin_gerenciar_usuario(usuario):
    if request.method == "DELETE":
        if usuario == session.get("usuario"):
            return jsonify({"erro": "Use a tela Meu perfil para alterar sua conta; não é possível excluir a própria sessão."}), 400
        if not contas.deletar_conta(usuario):
            return jsonify({"erro": "Usuário não encontrado."}), 404
        return jsonify({"mensagem": "Usuário removido com sucesso."})
    try:
        conta = contas.atualizar_conta(usuario, request.get_json(silent=True) or {}, permitir_alterar_tipo=True)
        if usuario == session.get("usuario"):
            session["usuario"] = conta["usuario"]
            session["superusuario"] = conta["superusuario"]
        return jsonify(conta)
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/perfil", methods=["GET", "PUT"])
@admin_obrigatorio
def api_admin_perfil():
    if request.method == "GET":
        return jsonify(contas.obter_conta_publica(session["usuario"]))
    try:
        conta = contas.atualizar_conta(session["usuario"], request.get_json(silent=True) or {})
        session["usuario"] = conta["usuario"]
        return jsonify(conta)
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/resumo", methods=["GET"])
@admin_obrigatorio
def api_admin_resumo():
    return jsonify({"usuarios": contas.listar_contas_publicas(), "clientes": controladores.listar_clientes()})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada."})

@app.route("/<path:path>")
def servir_arquivos_front(path):
    return send_from_directory("public", path)

# ---- ROTAS DA API QUE FAZEM O CRUD ----
@app.route("/api/clientes", methods=["GET"])
@login_obrigatorio
def api_listar():
    return jsonify(controladores.listar_clientes())

@app.route("/api/clientes", methods=["POST"])
@login_obrigatorio
def api_criar():
    try:
        novo_cliente = controladores.criar_cliente(request.get_json(silent=True) or {})
        return jsonify(novo_cliente), 201
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400

@app.route("/api/clientes/<string:id_cliente>", methods=["PUT"])
@login_obrigatorio
def api_editar(id_cliente):
    try:
        cliente_atualizado = controladores.atualizar_cliente(id_cliente, request.get_json(silent=True) or {})
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400
    if cliente_atualizado:
        return jsonify(cliente_atualizado)
    return jsonify({"erro": "Cliente nao encontrado"}), 404

@app.route("/api/clientes/<string:id_cliente>", methods=["DELETE"])
@login_obrigatorio
def api_deletar(id_cliente):
    sucesso = controladores.deletar_cliente(id_cliente)
    if sucesso:
        return jsonify({"mensagem": "Removido com sucesso"})
    return jsonify({"erro": "Cliente nao encontrado"}), 404

if __name__ == "__main__":
    app.run(port=3000, debug=True)
