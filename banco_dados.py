import os
import json

DATA_FILE = "dados_clientes.txt"
VEHICLES_FILE = "dados_veiculos.json"
APARTMENTS_FILE = "dados_apartamentos.json"
PARKING_SPACES_FILE = "dados_vagas.json"

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


def _ler_lista(caminho):
    if not os.path.exists(caminho):
        with open(caminho, "w", encoding="utf-8") as arquivo:
            json.dump([], arquivo)
    with open(caminho, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _salvar_lista(caminho, registros):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(registros, arquivo, indent=2, ensure_ascii=False)


def ler_apartamentos(): return _ler_lista(APARTMENTS_FILE)
def salvar_apartamentos(registros): _salvar_lista(APARTMENTS_FILE, registros)
def ler_vagas(): return _ler_lista(PARKING_SPACES_FILE)
def salvar_vagas(registros): _salvar_lista(PARKING_SPACES_FILE, registros)
