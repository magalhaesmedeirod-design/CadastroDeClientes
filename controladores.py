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
    foto = str(dados.get("foto", "")).strip()
    if foto and not foto.startswith("data:image/"):
        raise ErroValidacao("A foto selecionada é inválida.")
    return {**limpos, "foto": foto, "cpf": f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}", "telefone": f"({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}", "cep": f"{cep[:5]}-{cep[5:]}"}

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
    return {**limpos, "placa": placa, "proprietario_nome": proprietario.get("nome", ""),
            "proprietario_email": proprietario.get("email", ""), "foto": foto}


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
    if any(vaga.get("veiculo_id") == id_veiculo or any(veiculo.get("id") == id_veiculo for veiculo in vaga.get("veiculos", [])) for apartamento in listar_apartamentos() for vaga in apartamento.get("vagas", [])):
        raise ErroValidacao("Nao e possivel excluir um veiculo vinculado a uma vaga.")
    veiculos = banco_dados.ler_veiculos()
    nova_lista = [veiculo for veiculo in veiculos if veiculo.get("id") != id_veiculo]
    if len(nova_lista) < len(veiculos):
        banco_dados.salvar_veiculos(nova_lista)
        return True
    return False


def _texto(dados, campo, limite, rotulo=None):
    valor = str(dados.get(campo, "")).strip()
    if not valor:
        raise ErroValidacao(f"{rotulo or campo.capitalize()} é obrigatório.")
    if len(valor) > limite:
        raise ErroValidacao(f"{rotulo or campo.capitalize()} ultrapassa o limite de {limite} caracteres.")
    return valor


def _clientes_por_ids(ids, proprietario_id=None, apartamento_atual=None):
    clientes = {cliente.get("id"): cliente for cliente in listar_clientes()}
    if not isinstance(ids, list) or not ids:
        raise ErroValidacao("Selecione ao menos uma pessoa atribuída.")
    if len(ids) != len(set(ids)):
        raise ErroValidacao("Uma pessoa não pode ser adicionada duas vezes.")
    resultado = []
    apartamentos = banco_dados.ler_apartamentos()
    for ident in ids:
        cliente = clientes.get(str(ident))
        if not cliente:
            raise ErroValidacao("Uma das pessoas selecionadas não está mais cadastrada.")
        # O proprietário pode ter mais de um imóvel; os demais moradores, não.
        if cliente["id"] != proprietario_id and any(
            apartamento.get("id") != apartamento_atual
            and any(pessoa.get("id") == cliente["id"] for pessoa in apartamento.get("pessoas", []))
            for apartamento in apartamentos
        ):
            raise ErroValidacao(f"{cliente.get('nome', 'Esta pessoa')} já está atribuído a outro apartamento.")
        resultado.append({"id": cliente["id"], "nome": cliente.get("nome", "")})
    return resultado


def _validar_apartamento(dados, apartamento_atual=None):
    numero = _texto(dados, "numero", 20, "Número do apartamento")
    andar = _texto(dados, "andar", 10, "Andar")
    proprietario_id = _texto(dados, "proprietario_id", 30, "Proprietário")
    cliente = next((c for c in listar_clientes() if c.get("id") == proprietario_id), None)
    if not cliente:
        raise ErroValidacao("Selecione um proprietário cadastrado.")
    pessoas = _clientes_por_ids(dados.get("pessoas_ids"), cliente["id"], apartamento_atual)
    return {"numero": numero, "andar": andar, "proprietario_id": cliente["id"], "proprietario_nome": cliente.get("nome", ""), "pessoas": pessoas}


def listar_apartamentos(): return banco_dados.ler_apartamentos()

def criar_apartamento(dados):
    registros = listar_apartamentos(); novo = _validar_apartamento(dados)
    if any(r.get("numero", "").casefold() == novo["numero"].casefold() for r in registros):
        raise ErroValidacao("Já existe um apartamento com este número.")
    novo["id"] = str(int(time.time() * 1000)); novo["vagas"] = []; registros.append(novo); banco_dados.salvar_apartamentos(registros); return novo

def atualizar_apartamento(ident, dados):
    registros = listar_apartamentos(); novo = _validar_apartamento(dados, ident)
    if any(r.get("id") != ident and r.get("numero", "").casefold() == novo["numero"].casefold() for r in registros):
        raise ErroValidacao("Já existe um apartamento com este número.")
    for i, registro in enumerate(registros):
        if registro.get("id") == ident:
            novo["id"] = ident; novo["vagas"] = registro.get("vagas", []); registros[i] = novo; banco_dados.salvar_apartamentos(registros); return novo
    return None

def deletar_apartamento(ident):
    registros = listar_apartamentos(); novos = [r for r in registros if r.get("id") != ident]
    if len(novos) == len(registros): return False
    banco_dados.salvar_apartamentos(novos); return True


def vincular_vaga_apartamento(id_apartamento, id_vaga, ids_veiculos):
    apartamentos = listar_apartamentos()
    vaga = next((v for v in listar_vagas() if v.get("id") == id_vaga), None)
    if not vaga:
        raise ErroValidacao("Vaga não encontrada.")
    if not isinstance(ids_veiculos, list):
        raise ErroValidacao("Selecione pelo menos um veiculo.")
    ids_veiculos = [str(ident).strip() for ident in ids_veiculos if str(ident).strip()]
    if not ids_veiculos:
        raise ErroValidacao("Selecione pelo menos um veiculo.")
    if len(ids_veiculos) != len(set(ids_veiculos)):
        raise ErroValidacao("Um veiculo foi selecionado mais de uma vez.")
    todos_veiculos = listar_veiculos()
    veiculos = [next((v for v in todos_veiculos if v.get("id") == ident), None) for ident in ids_veiculos]
    if any(veiculo is None for veiculo in veiculos):
        raise ErroValidacao("Veiculo nao encontrado.")
    if any(vaga_registrada.get("id") == id_vaga for apartamento in apartamentos for vaga_registrada in apartamento.get("vagas", [])):
        raise ErroValidacao("Esta vaga ja esta vinculada a outro apartamento.")
    veiculos_vinculados = {veiculo.get("id") for apartamento in apartamentos for vaga_registrada in apartamento.get("vagas", []) for veiculo in vaga_registrada.get("veiculos", [])}
    veiculos_vinculados.update(vaga_registrada.get("veiculo_id") for apartamento in apartamentos for vaga_registrada in apartamento.get("vagas", []) if vaga_registrada.get("veiculo_id"))
    if any(ident in veiculos_vinculados for ident in ids_veiculos):
        raise ErroValidacao("Este veiculo ja esta vinculado a uma vaga.")
    for apartamento in apartamentos:
        if apartamento.get("id") == id_apartamento:
            vagas_atuais = apartamento.get("vagas", [])
            if any(v.get("id") == id_vaga for v in vagas_atuais):
                raise ErroValidacao("Esta vaga já está vinculada a este apartamento.")
            veiculos_da_vaga = [{"id": veiculo["id"], "placa": veiculo.get("placa", ""), "nome": " ".join(filter(None, [veiculo.get("marca", ""), veiculo.get("modelo", "")]))} for veiculo in veiculos]
            primeiro_veiculo = veiculos_da_vaga[0]
            vagas_atuais.append({"id": vaga["id"], "nome": vaga.get("nome", ""), "veiculos": veiculos_da_vaga, "veiculo_id": primeiro_veiculo["id"], "veiculo_placa": primeiro_veiculo["placa"], "veiculo_nome": primeiro_veiculo["nome"]})
            apartamento["vagas"] = vagas_atuais
            banco_dados.salvar_apartamentos(apartamentos)
            return apartamento
    raise ErroValidacao("Apartamento não encontrado.")


def _validar_vaga(dados, ident_atual=None):
    nome = _texto(dados, "nome", 60, "Nome da vaga")
    return {"nome": nome}

def listar_vagas(): return banco_dados.ler_vagas()
def criar_vaga(dados):
    registros = listar_vagas(); novo = _validar_vaga(dados)
    if any(r.get("nome", "").casefold() == novo["nome"].casefold() for r in registros): raise ErroValidacao("Já existe uma vaga com este nome.")
    novo["id"] = str(int(time.time() * 1000)); registros.append(novo); banco_dados.salvar_vagas(registros); return novo
def atualizar_vaga(ident, dados):
    registros = listar_vagas(); novo = _validar_vaga(dados, ident)
    if any(r.get("id") != ident and r.get("nome", "").casefold() == novo["nome"].casefold() for r in registros): raise ErroValidacao("Já existe uma vaga com este nome.")
    for i, registro in enumerate(registros):
        if registro.get("id") == ident:
            novo["id"] = ident; registros[i] = novo; banco_dados.salvar_vagas(registros)
            apartamentos = listar_apartamentos()
            alterado = False
            for apartamento in apartamentos:
                for vaga in apartamento.get("vagas", []):
                    if vaga.get("id") == ident:
                        vaga["nome"] = novo["nome"]
                        alterado = True
            if alterado:
                banco_dados.salvar_apartamentos(apartamentos)
            return novo
    return None
def deletar_vaga(ident):
    if any(vaga.get("id") == ident for apartamento in listar_apartamentos() for vaga in apartamento.get("vagas", [])):
        raise ErroValidacao("Nao e possivel excluir uma vaga vinculada a um apartamento.")
    registros = listar_vagas(); novos = [r for r in registros if r.get("id") != ident]
    if len(novos) == len(registros): return False
    banco_dados.salvar_vagas(novos); return True
