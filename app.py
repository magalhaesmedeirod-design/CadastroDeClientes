from flask import Flask, jsonify, request, send_from_directory
import controladores

app = Flask(__name__)

# ---- ROTAS PARA CONECTAR O SEU FRONT-END ----
@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def servir_arquivos_front(path):
    return send_from_directory("public", path)

# ---- ROTAS DA API QUE FAZEM O CRUD ----
@app.route("/api/clientes", methods=["GET"])
def api_listar():
    return jsonify(controladores.listar_clientes())

@app.route("/api/clientes", methods=["POST"])
def api_criar():
    try:
        novo_cliente = controladores.criar_cliente(request.get_json(silent=True) or {})
        return jsonify(novo_cliente), 201
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400

@app.route("/api/clientes/<string:id_cliente>", methods=["PUT"])
def api_editar(id_cliente):
    try:
        cliente_atualizado = controladores.atualizar_cliente(id_cliente, request.get_json(silent=True) or {})
    except controladores.ErroValidacao as erro:
        return jsonify({"erro": str(erro)}), 400
    if cliente_atualizado:
        return jsonify(cliente_atualizado)
    return jsonify({"erro": "Cliente nao encontrado"}), 404

@app.route("/api/clientes/<string:id_cliente>", methods=["DELETE"])
def api_deletar(id_cliente):
    sucesso = controladores.deletar_cliente(id_cliente)
    if sucesso:
        return jsonify({"mensagem": "Removido com sucesso"})
    return jsonify({"erro": "Cliente nao encontrado"}), 404

if __name__ == "__main__":
    app.run(port=3000, debug=True)
