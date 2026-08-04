import os
from functools import wraps

from flask import Flask, jsonify, request, Response, send_from_directory, session
import controladores
import contas
import banco_dados

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "troque-esta-chave-em-producao")


def login_obrigatorio(funcao):
    @wraps(funcao)
    def decorador(*args, **kwargs):
        if not session.get("usuario_cliente"):
            return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 401
        return funcao(*args, **kwargs)
    return decorador


def admin_obrigatorio(funcao):
    @wraps(funcao)
    def decorador(*args, **kwargs):
        if not session.get("usuario_admin") or not session.get("superusuario"):
            return jsonify({"erro": "Acesso restrito a superusuários."}), 403
        return funcao(*args, **kwargs)
    return decorador


def cliente_da_conta(usuario):
    """Localiza o cadastro de cliente vinculado ao e-mail da conta."""
    conta = contas.obter_conta_publica(usuario)
    if not conta:
        return None
    email = str(conta.get("email", "")).strip().casefold()
    return next((cliente for cliente in controladores.listar_clientes()
                 if str(cliente.get("email", "")).strip().casefold() == email), None)


def _escapar_pdf(texto):
    texto = str(texto or "")
    return texto.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _gerar_pdf_cliente(cliente, apartamentos, vagas, veiculos):
    conteudo = []
    
    conteudo.append("q")
    conteudo.append("0.126 0.353 0.247 rg")
    conteudo.append("0 700 612 92 re f")
    conteudo.append("Q")
    
    conteudo.append("BT /F2 28 Tf 50 760 Td (RELATORIO DO CLIENTE) Tj ET")
    conteudo.append("BT /F1 10 Tf 50 730 Td (Gerado em 04 de agosto de 2026) Tj ET")
    
    conteudo.append("q 0.8 0.8 0.8 rg 50 710 512 0.5 re f Q")
    
    y = 690
    conteudo.append(f"BT /F2 12 Tf 50 {y} Td (Dados Cadastrais) Tj ET")
    y -= 20
    
    dados_cadastro = [
        ("Nome:", cliente.get('nome', '')),
        ("CPF:", cliente.get('cpf', '')),
        ("E-mail:", cliente.get('email', '')),
        ("Telefone:", cliente.get('telefone', '')),
        ("CEP:", cliente.get('cep', '')),
        ("Logradouro:", cliente.get('logradouro', '')),
        ("Bairro:", cliente.get('bairro', '')),
        ("Cidade:", cliente.get('cidade', '')),
    ]
    
    col1_x, col2_x = 50, 310
    linha_atual = 0
    for i, (rotulo, valor) in enumerate(dados_cadastro):
        if i > 0 and i % 2 == 0:
            y -= 16
        x = col1_x if i % 2 == 0 else col2_x
        conteudo.append(f"BT /F2 9 Tf {x} {y} Td ({_escapar_pdf(rotulo)}) Tj ET")
        conteudo.append(f"BT /F1 9 Tf {x + 60} {y} Td ({_escapar_pdf(valor)}) Tj ET")
    
    y -= 30
    conteudo.append(f"q 0.8 0.8 0.8 rg 50 {y} 512 0.5 re f Q")
    
    conta_vinculada = None
    email_cliente = str(cliente.get("email", "")).strip().casefold()
    if email_cliente:
        conta_vinculada = next((item for item in contas.listar_contas_publicas() if str(item.get("email", "")).strip().casefold() == email_cliente), None)
    
    if conta_vinculada:
        y -= 20
        conteudo.append(f"BT /F2 12 Tf 50 {y} Td (Conta Associada) Tj ET")
        y -= 18
        conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Usuario:) Tj ET")
        conteudo.append(f"BT /F1 9 Tf 110 {y} Td ({_escapar_pdf(conta_vinculada.get('usuario', ''))}) Tj ET")
        y -= 14
        conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Ultimo acesso:) Tj ET")
        conteudo.append(f"BT /F1 9 Tf 110 {y} Td ({_escapar_pdf(str(conta_vinculada.get('ultimo_login', 'Nunca acessou')))}) Tj ET")
        y -= 14
        conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Total de acessos:) Tj ET")
        conteudo.append(f"BT /F1 9 Tf 110 {y} Td ({conta_vinculada.get('total_logins', 0)}) Tj ET")
        y -= 25
    else:
        y -= 20
    
    conteudo.append(f"q 0.8 0.8 0.8 rg 50 {y} 512 0.5 re f Q")
    
    y -= 20
    conteudo.append(f"BT /F2 12 Tf 50 {y} Td (Apartamentos) Tj ET")
    y -= 16
    
    if apartamentos:
        for apartamento in apartamentos:
            conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Numero:) Tj ET")
            conteudo.append(f"BT /F1 9 Tf 120 {y} Td ({_escapar_pdf(apartamento.get('numero', ''))}) Tj ET")
            conteudo.append(f"BT /F2 9 Tf 250 {y} Td (Andar:) Tj ET")
            conteudo.append(f"BT /F1 9 Tf 310 {y} Td ({_escapar_pdf(apartamento.get('andar', ''))}) Tj ET")
            y -= 13
            conteudo.append(f"BT /F1 9 Tf 50 {y} Td ({_escapar_pdf(apartamento.get('proprietario_nome', ''))}) Tj ET")
            pessoas = [p.get("nome", "") for p in apartamento.get("pessoas", []) if p.get("nome")]
            if pessoas:
                y -= 12
                conteudo.append(f"BT /F1 8 Tf 50 {y} Td (Pessoas: {_escapar_pdf(', '.join(pessoas))}) Tj ET")
            y -= 14
    else:
        conteudo.append(f"BT /F1 9 Tf 50 {y} Td (Nenhum apartamento vinculado) Tj ET")
        y -= 14
    
    y -= 10
    conteudo.append(f"q 0.8 0.8 0.8 rg 50 {y} 512 0.5 re f Q")
    
    y -= 20
    conteudo.append(f"BT /F2 12 Tf 50 {y} Td (Vagas) Tj ET")
    y -= 16
    
    if vagas:
        for vaga in vagas:
            placas = ", ".join(v.get("placa", "") for v in vaga.get("veiculos", []) if v.get("placa"))
            conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Vaga:) Tj ET")
            conteudo.append(f"BT /F1 9 Tf 100 {y} Td ({_escapar_pdf(vaga.get('numero', ''))}) Tj ET")
            y -= 12
            vaga_desc = f"Apt. {_escapar_pdf(vaga.get('apartamento_numero', ''))} - {_escapar_pdf(placas or 'Nenhum')}"
            conteudo.append(f"BT /F1 9 Tf 50 {y} Td ({vaga_desc}) Tj ET")
            y -= 14
    else:
        conteudo.append(f"BT /F1 9 Tf 50 {y} Td (Nenhuma vaga vinculada) Tj ET")
        y -= 14
    
    y -= 10
    conteudo.append(f"q 0.8 0.8 0.8 rg 50 {y} 512 0.5 re f Q")
    
    y -= 20
    conteudo.append(f"BT /F2 12 Tf 50 {y} Td (Veiculos) Tj ET")
    y -= 16
    
    if veiculos:
        for veiculo in veiculos:
            conteudo.append(f"BT /F2 9 Tf 50 {y} Td (Placa:) Tj ET")
            conteudo.append(f"BT /F1 9 Tf 100 {y} Td ({_escapar_pdf(veiculo.get('placa', ''))}) Tj ET")
            y -= 12
            conteudo.append(f"BT /F1 9 Tf 50 {y} Td ({_escapar_pdf(veiculo.get('marca', '') + ' ' + veiculo.get('modelo', ''))} - {_escapar_pdf(veiculo.get('cor', ''))}) Tj ET")
            y -= 14
    else:
        conteudo.append(f"BT /F1 9 Tf 50 {y} Td (Nenhum veiculo vinculado) Tj ET")
    
    stream = "\n".join(conteudo)
    objetos = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    ]
    stream_bytes = stream.encode("latin-1", "ignore")
    objetos.append(f"6 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1") + stream_bytes + b"\nendstream\nendobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for objeto in objetos:
        offsets.append(len(pdf))
        pdf.extend(objeto)

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objetos) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1"))
    return bytes(pdf)

# ---- ROTAS PARA CONECTAR O SEU FRONT-END ----
@app.route("/")
def index():
    if not session.get("usuario_cliente"):
        return send_from_directory("public", "login.html")
    return send_from_directory("public", "index.html")


@app.route("/cadastro")
def cadastro():
    return send_from_directory("public", "cadastro.html")


@app.route("/admin")
def painel_admin():
    if not session.get("usuario_admin"):
        return send_from_directory("public", "admin-login.html")
    return send_from_directory("public", "admin.html")


@app.route("/admin.html")
@app.route("/admin/<path:pagina>")
def proteger_paginas_admin(pagina=None):
    """Evita que o painel seja aberto diretamente fora da rota protegida."""
    if not session.get("usuario_admin"):
        return send_from_directory("public", "admin-login.html")
    return send_from_directory("public", "admin.html")


@app.route("/admin/cadastro")
def cadastro_admin():
    if session.get("usuario_admin"):
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
    session.pop("usuario", None)  # Remove apenas a sessão antiga, se existir.
    session["usuario_cliente"] = conta["usuario"]
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
    session.pop("usuario", None)  # Compatibilidade com sessões anteriores.
    session["usuario_admin"] = conta["usuario"]
    session["superusuario"] = True
    contas.registrar_login(conta["usuario"])
    return jsonify({"mensagem": "Login administrativo realizado com sucesso."})


@app.route("/api/admin/cadastro", methods=["POST"])
def api_admin_cadastro():
    if not session.get("usuario_admin") and contas.existe_superusuario():
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
        if usuario == session.get("usuario_admin"):
            return jsonify({"erro": "Use a tela Meu perfil para alterar sua conta; não é possível excluir a própria sessão."}), 400
        if not contas.deletar_conta(usuario):
            return jsonify({"erro": "Usuário não encontrado."}), 404
        return jsonify({"mensagem": "Usuário removido com sucesso."})
    try:
        conta = contas.atualizar_conta(usuario, request.get_json(silent=True) or {}, permitir_alterar_tipo=True)
        if usuario == session.get("usuario_admin"):
            session["usuario_admin"] = conta["usuario"]
            session["superusuario"] = conta["superusuario"]
        return jsonify(conta)
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/perfil", methods=["GET", "PUT"])
@admin_obrigatorio
def api_admin_perfil():
    if request.method == "GET":
        return jsonify(contas.obter_conta_publica(session["usuario_admin"]))
    try:
        conta = contas.atualizar_conta(session["usuario_admin"], request.get_json(silent=True) or {})
        session["usuario_admin"] = conta["usuario"]
        return jsonify(conta)
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/resumo", methods=["GET"])
@admin_obrigatorio
def api_admin_resumo():
    return jsonify({"usuarios": contas.listar_contas_publicas(), "clientes": controladores.listar_clientes(), "veiculos": controladores.listar_veiculos(), "apartamentos": controladores.listar_apartamentos(), "vagas": controladores.listar_vagas()})


@app.route("/api/admin/apartamentos", methods=["GET", "POST"])
@admin_obrigatorio
def api_admin_apartamentos():
    if request.method == "GET": return jsonify(controladores.listar_apartamentos())
    try: return jsonify(controladores.criar_apartamento(request.get_json(silent=True) or {})), 201
    except controladores.ErroValidacao as erro: return jsonify({"erro": str(erro)}), 400

@app.route("/api/admin/apartamentos/<string:ident>", methods=["PUT", "DELETE"])
@admin_obrigatorio
def api_admin_gerenciar_apartamento(ident):
    try:
        if request.method == "DELETE":
            if controladores.deletar_apartamento(ident): return jsonify({"mensagem": "Apartamento removido com sucesso."})
            return jsonify({"erro": "Apartamento não encontrado."}), 404
        item = controladores.atualizar_apartamento(ident, request.get_json(silent=True) or {})
        return (jsonify(item), 200) if item else (jsonify({"erro": "Apartamento não encontrado."}), 404)
    except controladores.ErroValidacao as erro: return jsonify({"erro": str(erro)}), 400

@app.route("/api/admin/vagas", methods=["GET", "POST"])
@admin_obrigatorio
def api_admin_vagas():
    if request.method == "GET": return jsonify(controladores.listar_vagas())
    try: return jsonify(controladores.criar_vaga(request.get_json(silent=True) or {})), 201
    except controladores.ErroValidacao as erro: return jsonify({"erro": str(erro)}), 400

@app.route("/api/admin/vagas/<string:ident>", methods=["PUT", "DELETE"])
@admin_obrigatorio
def api_admin_gerenciar_vaga(ident):
    try:
        if request.method == "DELETE":
            if controladores.deletar_vaga(ident): return jsonify({"mensagem": "Vaga removida com sucesso."})
            return jsonify({"erro": "Vaga não encontrada."}), 404
        item = controladores.atualizar_vaga(ident, request.get_json(silent=True) or {})
        return (jsonify(item), 200) if item else (jsonify({"erro": "Vaga não encontrada."}), 404)
    except controladores.ErroValidacao as erro: return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/veiculos", methods=["GET", "POST"])
@admin_obrigatorio
def api_admin_veiculos():
    if request.method == "GET":
        return jsonify(controladores.listar_veiculos())
    try:
        return jsonify(controladores.criar_veiculo(request.get_json(silent=True) or {})), 201
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/admin/veiculos/<string:id_veiculo>", methods=["PUT", "DELETE"])
@admin_obrigatorio
def api_admin_gerenciar_veiculo(id_veiculo):
    if request.method == "DELETE":
        if controladores.deletar_veiculo(id_veiculo):
            return jsonify({"mensagem": "Veículo removido com sucesso."})
        return jsonify({"erro": "Veículo não encontrado."}), 404
    try:
        veiculo = controladores.atualizar_veiculo(id_veiculo, request.get_json(silent=True) or {})
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400
    if veiculo:
        return jsonify(veiculo)
    return jsonify({"erro": "Veículo não encontrado."}), 404


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("usuario_cliente", None)
    return jsonify({"mensagem": "Sessão encerrada."})


@app.route("/api/admin/logout", methods=["POST"])
def api_admin_logout():
    session.pop("usuario_admin", None)
    session.pop("superusuario", None)
    return jsonify({"mensagem": "Sessão administrativa encerrada."})


@app.route("/api/meu-perfil", methods=["GET", "PUT"])
@login_obrigatorio
def api_meu_perfil():
    if request.method == "GET":
        return jsonify(contas.obter_conta_publica(session["usuario_cliente"]))
    try:
        cliente = cliente_da_conta(session["usuario_cliente"])
        conta = contas.atualizar_conta(session["usuario_cliente"], request.get_json(silent=True) or {})
        # A conta e o cadastro de cliente são vinculados pelo e-mail.
        if cliente and cliente.get("email") != conta["email"]:
            clientes = controladores.listar_clientes()
            for item in clientes:
                if item.get("id") == cliente.get("id"):
                    item["email"] = conta["email"]
                    break
            banco_dados.salvar_registros(clientes)
        session["usuario_cliente"] = conta["usuario"]
        return jsonify(conta)
    except contas.ErroConta as erro:
        return jsonify({"erro": str(erro)}), 400


@app.route("/api/meus-veiculos", methods=["GET"])
@login_obrigatorio
def api_meus_veiculos():
    conta = contas.obter_conta_publica(session["usuario_cliente"])
    if not conta:
        return jsonify([])
    email = str(conta.get("email", "")).strip().casefold()
    cliente = cliente_da_conta(session["usuario_cliente"])
    return jsonify([veiculo for veiculo in controladores.listar_veiculos()
                    if str(veiculo.get("proprietario_email", "")).strip().casefold() == email
                    or (cliente and veiculo.get("proprietario_id") == cliente.get("id"))])


@app.route("/api/meus-apartamentos", methods=["GET"])
@login_obrigatorio
def api_meus_apartamentos():
    cliente = cliente_da_conta(session["usuario_cliente"])
    if not cliente:
        return jsonify([])
    apartamentos = []
    for apartamento in controladores.listar_apartamentos():
        if apartamento.get("proprietario_id") == cliente.get("id"):
            apartamentos.append({**apartamento, "vinculo": "proprietario"})
        elif any(pessoa.get("id") == cliente.get("id") for pessoa in apartamento.get("pessoas", [])):
            apartamentos.append({**apartamento, "vinculo": "morador"})
    vagas = controladores.listar_vagas()
    return jsonify([{**apartamento, "vagas": [vaga for vaga in vagas
                                                if vaga.get("apartamento_id") == apartamento.get("id")]}
                    for apartamento in apartamentos])

@app.route("/<path:path>")
def servir_arquivos_front(path):
    return send_from_directory("public", path)

# ---- ROTAS DA API QUE FAZEM O CRUD ----
@app.route("/api/clientes", methods=["GET"])
@admin_obrigatorio
def api_listar():
    return jsonify(controladores.listar_clientes())

@app.route("/api/admin/clientes/<string:id_cliente>/pdf", methods=["GET"])
@admin_obrigatorio
def api_admin_cliente_pdf(id_cliente):
    cliente = next((item for item in controladores.listar_clientes() if item.get("id") == id_cliente), None)
    if not cliente:
        return jsonify({"erro": "Cliente não encontrado."}), 404

    apartamentos = [
        apartamento for apartamento in controladores.listar_apartamentos()
        if apartamento.get("proprietario_id") == cliente.get("id")
        or any(pessoa.get("id") == cliente.get("id") for pessoa in apartamento.get("pessoas", []))
    ]
    vagas = [
        vaga for vaga in controladores.listar_vagas()
        if any(apartamento.get("id") == vaga.get("apartamento_id") for apartamento in apartamentos)
    ]
    veiculos = [
        veiculo for veiculo in controladores.listar_veiculos()
        if veiculo.get("proprietario_id") == cliente.get("id")
    ]

    pdf_bytes = _gerar_pdf_cliente(cliente, apartamentos, vagas, veiculos)
    return Response(pdf_bytes, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename=cliente_{id_cliente}.pdf"})

@app.route("/api/clientes", methods=["POST"])
@admin_obrigatorio
def api_criar():
    try:
        novo_cliente = controladores.criar_cliente(request.get_json(silent=True) or {})
        return jsonify(novo_cliente), 201
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400

@app.route("/api/clientes/<string:id_cliente>", methods=["PUT"])
@admin_obrigatorio
def api_editar(id_cliente):
    try:
        cliente_atualizado = controladores.atualizar_cliente(id_cliente, request.get_json(silent=True) or {})
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400
    if cliente_atualizado:
        return jsonify(cliente_atualizado)
    return jsonify({"erro": "Cliente nao encontrado"}), 404

@app.route("/api/clientes/<string:id_cliente>", methods=["DELETE"])
@admin_obrigatorio
def api_deletar(id_cliente):
    sucesso = controladores.deletar_cliente(id_cliente)
    if sucesso:
        return jsonify({"mensagem": "Removido com sucesso"})
    return jsonify({"erro": "Cliente nao encontrado"}), 404

if __name__ == "__main__":
    app.run(port=3000, debug=True)
