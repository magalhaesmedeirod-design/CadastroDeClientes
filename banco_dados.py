import os
import json

DATA_FILE = "dados_clientes.txt"
VEHICLES_FILE = "dados_veiculos.json"

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


def ler_veiculos():
    if not os.path.exists(VEHICLES_FILE):
        with open(VEHICLES_FILE, "w", encoding="utf-8") as arquivo:
            json.dump([], arquivo)
    with open(VEHICLES_FILE, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_veiculos(veiculos):
    with open(VEHICLES_FILE, "w", encoding="utf-8") as arquivo:
        json.dump(veiculos, arquivo, indent=2, ensure_ascii=False)
