import os
import json

DATA_FILE = "dados_clientes.txt"

def ler_registros():
    # Se o arquivo não existir, cria ele com uma lista vazia
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
            
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def salvar_registros(lista_clientes):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(lista_clientes, f, indent=2, ensure_ascii=False)