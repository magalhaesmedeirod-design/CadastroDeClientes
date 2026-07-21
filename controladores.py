import time
import re
import banco_dados

class ErroValidacao(ValueError):
    pass

def somente_digitos(valor):
    return re.sub(r"\D", "", str(valor or ""))

def validar_dados(dados):
    limites = {"nome": 120, "email": 254, "logradouro": 100, "complemento": 60, "bairro": 80}
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
