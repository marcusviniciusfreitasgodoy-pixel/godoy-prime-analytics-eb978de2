#!/usr/bin/env python3
"""Gera supabase/functions/_shared/itbiSmfNomes.ts a partir de data/cl_nomes_arcgis.json.

Rodar depois de atualizar o JSON (nomes de rua e bairro na grafia da camada 8):
    python3 -I scripts/itbi-smf/gerar_nomes_ts.py
"""
import json, os
from collections import Counter, defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
nomes = json.load(open(os.path.join(AQUI, "data", "cl_nomes_arcgis.json")))
lg = {cl: e["logradouro"].upper() for cl, e in nomes.items() if e.get("logradouro")}
b = defaultdict(Counter)
for e in nomes.values():
    for cod, nm in e["bairros"].items():
        if nm:
            b[str(int(cod))][nm.strip().upper()] += e.get("n", 1)
ba = {c: v.most_common(1)[0][0] for c, v in b.items()}
out = [
    "// GERADO por scripts/itbi-smf/gerar_nomes_ts.py a partir de data/cl_nomes_arcgis.json. Não editar à mão.",
    "// Grafia da camada 8 do ArcGIS (a que itbi_transactions já usa), para a carga da SMF",
    "// gravar logradouro e bairro com o mesmo nome das linhas antigas.",
    "",
    "/** Código do logradouro (6 dígitos) -> nome como a camada 8 escreve (ex.: AVN LUCIO COSTA). */",
    "export const NOMES_LOGRADOURO: Record<string, string> = " + json.dumps(dict(sorted(lg.items())), ensure_ascii=False, separators=(",", ":")) + ";",
    "",
    "/** CD_BAIRRO da SMF (= codbairro da camada 8, sem zeros) -> nome em maiúsculas com acento (ex.: FREGUESIA (JACAREPAGUÁ)). */",
    "export const NOMES_BAIRRO: Record<string, string> = " + json.dumps(dict(sorted(ba.items(), key=lambda kv: int(kv[0]))), ensure_ascii=False, separators=(",", ":")) + ";",
    "",
]
destino = os.path.join(AQUI, "..", "..", "supabase", "functions", "_shared", "itbiSmfNomes.ts")
open(destino, "w").write("\n".join(out))
print(f"{len(lg)} logradouros, {len(ba)} bairros -> {os.path.normpath(destino)}")
