import time
import banco_dados

def listar_clientes():
    return banco_dados.ler_registros()

def criar_cliente(dados_novos):
    clientes = banco_dados.ler_registros()
    
    # Gera um ID único baseado no relógio do computador
    dados_novos["id"] = str(int(time.time() * 1000))
    
    clientes.append(dados_novos)
    banco_dados.salvar_registros(clientes)
    return dados_novos

def atualizar_cliente(id_cliente, dados_editados):
    clientes = banco_dados.ler_registros()
    
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