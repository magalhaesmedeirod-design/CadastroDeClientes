import time
import re
import banco_dados

class ErroValidacao(ValueError):
    pass

def somente_digitos(valor):
    return re.sub(r"\D", "", str(valor or ""))

def validar_dados(dados):
    limites = {"nome": 60, "email": 100, "logradouro": 60, "complemento": 40, "bairro": 40, "cidade": 40}
    limpos = {campo: str(dados.get(campo, "")).strip() for campo in limites}
    for campo, limite in limites.items():
        if campo != "complemento" and not limpos[campo]:
            raise ErroValidacao(f"{campo.capitalize()} é obrigatório.")
        if len(limpos[campo]) > limite:
            raise ErroValidacao(f"{campo.capitalize()} ultrapassa o limite de {limite} caracteres.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", limpos["email"]):
        raise ErroValidacao("E-mail inválido.")
    cpf = somente_digitos(dados.get("cpf"))
    if len(cpf) != 11:
        raise ErroValidacao("CPF deve seguir o formato 000.000.000-00.")
    telefone = somente_digitos(dados.get("telefone"))
    if len(telefone) != 11:
        raise ErroValidacao("Telefone deve seguir o formato (00) 00000-0000.")
    cep = somente_digitos(dados.get("cep"))
    if len(cep) != 8:
        raise ErroValidacao("CEP deve seguir o formato 00000-000.")
    return {**dados, **limpos, "cpf": f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}", "telefone": f"({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}", "cep": f"{cep[:5]}-{cep[5:]}"}

def listar_clientes():
    return banco_dados.ler_registros()

def criar_cliente(dados_novos):
    clientes = banco_dados.ler_registros()
    dados_novos = validar_dados(dados_novos)
    
    # Gera um ID único baseado no relógio do computador
    dados_novos["id"] = str(int(time.time() * 1000))
    
    clientes.append(dados_novos)
    banco_dados.salvar_registros(clientes)
    return dados_novos

def atualizar_cliente(id_cliente, dados_editados):
    clientes = banco_dados.ler_registros()
    dados_editados = validar_dados(dados_editados)
    
    for index, cliente in enumerate(clientes):
        if cliente["id"] == id_cliente:
            dados_editados["id"] = id_cliente
            clientes[index] = dados_editados
            banco_dados.salvar_registros(clientes)
            return dados_editados
            
    return None

def deletar_cliente(id_cliente):
    clientes = banco_dados.ler_registros()
    nova_lista = [c for c in clientes if c["id"] != id_cliente]
    
    if len(nova_lista) < len(clientes):
        banco_dados.salvar_registros(nova_lista)
        return True
        
    return False


def normalizar_placa(valor):
    return re.sub(r"[^A-Za-z0-9]", "", str(valor or "")).upper()


def validar_veiculo(dados):
    campos = {"placa": 10, "marca": 50, "modelo": 60, "ano_fabricacao": 4,
              "ano_modelo": 4, "cor": 30, "proprietario_id": 30}
    limpos = {campo: str(dados.get(campo, "")).strip() for campo in campos}
    for campo, limite in campos.items():
        if not limpos[campo]:
            raise ErroValidacao(f"{campo.replace('_', ' ').capitalize()} é obrigatório.")
        if len(limpos[campo]) > limite:
            raise ErroValidacao(f"{campo.replace('_', ' ').capitalize()} ultrapassa o limite de {limite} caracteres.")
    placa = normalizar_placa(limpos["placa"])
    if len(placa) < 6 or len(placa) > 7:
        raise ErroValidacao("Placa inválida.")
    if not limpos["ano_fabricacao"].isdigit() or not limpos["ano_modelo"].isdigit():
        raise ErroValidacao("Os anos devem conter quatro números.")
    proprietario = next((cliente for cliente in banco_dados.ler_registros()
                         if cliente.get("id") == limpos["proprietario_id"]), None)
    if not proprietario:
        raise ErroValidacao("Selecione um proprietário cadastrado.")
    foto = str(dados.get("foto", "")).strip()
    if foto and not foto.startswith("data:image/"):
        raise ErroValidacao("A foto selecionada é inválida.")
    return {**limpos, "placa": placa, "proprietario_nome": proprietario.get("nome", ""), "foto": foto}


def listar_veiculos():
    return banco_dados.ler_veiculos()


def criar_veiculo(dados_novos):
    veiculos = banco_dados.ler_veiculos()
    dados_novos = validar_veiculo(dados_novos)
    if any(normalizar_placa(veiculo.get("placa")) == dados_novos["placa"] for veiculo in veiculos):
        raise ErroValidacao("Já existe um veículo cadastrado com esta placa.")
    dados_novos["id"] = str(int(time.time() * 1000))
    veiculos.append(dados_novos)
    banco_dados.salvar_veiculos(veiculos)
    return dados_novos


def atualizar_veiculo(id_veiculo, dados_editados):
    veiculos = banco_dados.ler_veiculos()
    dados_editados = validar_veiculo(dados_editados)
    if any(veiculo.get("id") != id_veiculo and normalizar_placa(veiculo.get("placa")) == dados_editados["placa"] for veiculo in veiculos):
        raise ErroValidacao("Já existe um veículo cadastrado com esta placa.")
    for indice, veiculo in enumerate(veiculos):
        if veiculo.get("id") == id_veiculo:
            dados_editados["id"] = id_veiculo
            veiculos[indice] = dados_editados
            banco_dados.salvar_veiculos(veiculos)
            return dados_editados
    return None


def deletar_veiculo(id_veiculo):
    veiculos = banco_dados.ler_veiculos()
    nova_lista = [veiculo for veiculo in veiculos if veiculo.get("id") != id_veiculo]
    if len(nova_lista) < len(veiculos):
        banco_dados.salvar_veiculos(nova_lista)
        return True
    return False
