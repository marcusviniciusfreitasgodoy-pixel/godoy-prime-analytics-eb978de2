#!/usr/bin/env python3
"""
carregar_itbi_smf.py: carga mensal do ITBI por escritura (planilhas da SMF) no
Godoy Prime Analytics.

O que faz, nesta ordem:
  1. raspa a página da SMF e baixa os xlsx ITBI_TRANSACOES_* (ou usa --fonte-dir);
  2. lê as escrituras, filtra por bairro e ano, classifica tipologia e uso com as
     mesmas regras do app e aplica LIMITES_INGESTAO (_shared/itbiIngestion.ts);
  3. geocodifica pelo Número de porta da Prefeitura (gratuito; cache em disco);
  4. grava em public.itbi_escrituras (upsert por hash, nunca duplica);
  5. chama public.itbi_consolidar_smf(inicio, fim[, bairro]), que reconstrói as
     linhas de itbi_transactions do período a partir das escrituras, preservando
     microbairro e geocodificação, e atualiza itbi_price_index;
  6. registra a execução em etl_log (fonte 'smf').

Fonte: https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro
(página WordPress; os links mudam a cada republicação, por isso a página é raspada
em toda execução). As planilhas só trazem transferências de 100%.

Uso típico:
    # piloto, sem gravar nada (gera CSV com o que entraria)
    python3 -I carregar_itbi_smf.py --bairro "BARRA DA TIJUCA" --desde 2019 --dry-run

    # carga de verdade (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente)
    python3 -I carregar_itbi_smf.py --desde 2019

Opções:
    --bairro NOME       filtra um bairro (repetível). Sem --bairro carrega a cidade inteira.
    --desde ANO         ano mínimo (padrão 2019).
    --dry-run           não grava; escreve um CSV com o que seria gravado.
    --sem-consolidar    grava itbi_escrituras mas não chama itbi_consolidar_smf.
    --fonte-dir DIR     usa xlsx já baixados nesse diretório em vez de raspar a página.
    --cache-dir DIR     downloads e cache de portas (padrão ./cache_smf).
    --sem-geo           pula a geocodificação (lat/lon ficam nulos).
    --saida ARQ         caminho do CSV do dry-run.

Só biblioteca padrão + openpyxl. Rode sempre com `python3 -I`.
"""
import argparse, csv, hashlib, json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request
from collections import Counter, defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
PAGINA_SMF = "https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro"
NP_URL = "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Numero_de_porta/FeatureServer/0/query?"
LOG_URL = "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query?"
NOMES_ARCGIS = os.path.join(AQUI, "data", "cl_nomes_arcgis.json")  # cl -> nome como a camada 8 escreve
TOL_NUMERO = 300  # porta vizinha aceita até esta diferença de numeração

# Mesmos limites de supabase/functions/_shared/itbiIngestion.ts (LIMITES_INGESTAO)
LIMITES = dict(areaMinM2=20, areaMaxM2=5000, valorMin=30_000, valorMax=200_000_000,
               valorM2Min=500, valorM2Max=300_000, percentualMin=90)

# Abreviações de tipo de via usadas pela Prefeitura (camada 8 / SMF 2025+)
TIPO_VIA = {"AVENIDA": "AVN", "ESTRADA": "EST", "TRAVESSA": "TRV", "PRACA": "PCA", "LARGO": "LGO",
            "LADEIRA": "LAD", "ALAMEDA": "ALA", "BECO": "BCO", "CAMINHO": "CAM", "RODOVIA": "ROD"}

# ----------------------------------------------------------------------------- util
def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)

def clean(v):
    """Desfaz o escape _x0020_ que o exportador da SMF deixa nas strings."""
    if isinstance(v, str):
        return re.sub(r"_x([0-9A-Fa-f]{4})_", lambda m: chr(int(m.group(1), 16)), v).strip()
    return v

def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v)
    try:
        return float(s.replace(".", "").replace(",", ".")) if "," in s else float(s)
    except ValueError:
        return None

def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def cl_norm(d):
    """Código do logradouro com 6 dígitos; '000000' quando a SMF deixou em branco."""
    try:
        return f"{int(str(d.get('cl') or '').strip()):06d}"
    except ValueError:
        return "000000"

def http_json(url, tentativas=4, timeout=180, data=None, headers=None, method=None):
    for t in range(tentativas):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                corpo = r.read()
                return json.loads(corpo) if corpo else None
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")[:400]
            if e.code < 500 or t == tentativas - 1:
                raise RuntimeError(f"HTTP {e.code}: {msg}")
            log("  retry", t + 1, e.code, msg)
        except Exception as e:  # noqa
            if t == tentativas - 1:
                raise
            log("  retry", t + 1, e)
        time.sleep(5 * (t + 1))

# ------------------------------------------------------------------ classificação
def classificar_uso(uso_smf):
    u = (uso_smf or "").upper()
    if "NAO RESIDENCIAL" in u or "NÃO RESIDENCIAL" in u or "COMERCIAL" in u:
        return "Comercial"
    if "TERRITORIAL" in u:
        return "Territorial"
    if u == "RESIDENCIAL":
        return "Residencial"
    return "Outro"  # AREA COMUM, VAGA VINCULADA, vazio

def classificar_tipologia(tip_smf):
    """classificarTipologia do app (Apartamento, Casa, Terreno, Comercial) mais a
    classe Outro para o que o app empurrava para Apartamento por falta de regra."""
    t = (tip_smf or "").lower()
    if any(k in t for k in ("vaga", "garagem", "galpao", "galpão", "industria", "armazem", "deposito",
                            "telheiro", "clube", "colegio", "creche", "hospital", "clinica",
                            "hotel/motel", "cinema", "teatro", "constr sec", "especial", "unid. hoteleira")):
        return "Outro"
    if any(k in t for k in ("apartamento", "apto", "flat", "cobertura", "apart-hotel")):
        return "Apartamento"
    if any(k in t for k in ("casa", "sobrado", "residencia")):
        return "Casa"
    if any(k in t for k in ("terreno", "lote")):
        return "Terreno"
    if any(k in t for k in ("sala", "loja", "sobreloja", "escritório", "escritorio")):
        return "Comercial"
    return "Outro"

def validar(valor, area, percentual):
    """Mesma ordem de validarFeatureItbi: obrigatórios, percentual, faixas."""
    if valor is None or area is None or valor <= 0 or area <= 0:
        return False, "dados_invalidos"
    if percentual < LIMITES["percentualMin"]:
        return False, "percentual"
    vm2 = valor / area
    if not (LIMITES["areaMinM2"] <= area <= LIMITES["areaMaxM2"]):
        return False, "fora_da_faixa"
    if not (LIMITES["valorMin"] <= valor <= LIMITES["valorMax"]):
        return False, "fora_da_faixa"
    if not (LIMITES["valorM2Min"] <= vm2 <= LIMITES["valorM2Max"]):
        return False, "fora_da_faixa"
    return True, None

# ------------------------------------------------------------------- nome da rua
def nome_canonico(cl, candidatos, nomes_arcgis):
    """Nome como itbi_transactions já escreve (grafia da camada 8: maiúsculas,
    sem acento, tipo de via abreviado). Prioridade: camada 8 > SMF 2025+ >
    SMF 2019-2024 normalizado."""
    a = nomes_arcgis.get(cl)
    if a and a.get("logradouro"):
        return a["logradouro"].upper()
    recentes = [n for recente, n in candidatos if recente]
    if recentes:
        return recentes[0].upper()
    nome = sem_acento(candidatos[0][1]).upper().strip() if candidatos else "SEM LOGRADOURO"
    partes = nome.split(" ", 1)
    if len(partes) == 2 and partes[0] in TIPO_VIA:
        nome = TIPO_VIA[partes[0]] + " " + partes[1]
    return re.sub(r"\s+", " ", nome)

# ---------------------------------------------------------------------- download
def links_da_pagina():
    req = urllib.request.Request(PAGINA_SMF, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "ignore")
    links = sorted(set(re.findall(r'href="([^"]*ITBI_TRANSACOES[^"]*\.xlsx)"', html, flags=re.I)))
    if not links:
        raise RuntimeError("nenhum link ITBI_TRANSACOES*.xlsx na página da SMF; a página mudou?")
    return links

def baixar(links, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    arquivos = []
    for u in links:
        nome = os.path.basename(urllib.parse.urlparse(u).path)
        dest = os.path.join(cache_dir, nome)
        if not os.path.exists(dest):
            log("baixando", nome)
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=600) as r, open(dest, "wb") as f:
                f.write(r.read())
        arquivos.append(dest)
    return arquivos

# ------------------------------------------------------------------------ leitura
def ler_planilhas(arquivos, bairros, desde):
    import openpyxl, warnings
    warnings.filterwarnings("ignore")
    alias = {"nm_bairro_norm": "bairro", "DESCRICAO": "descricao", "valor_transacoes": "vl_declarado"}
    linhas = []
    for arq in arquivos:
        ws = openpyxl.load_workbook(arq, read_only=True).worksheets[0]
        it = ws.iter_rows(values_only=True)
        hdr = [alias.get(clean(h), clean(h)) for h in next(it)]
        n = 0
        for r in it:
            d = dict(zip(hdr, (clean(v) for v in r)))
            n += 1
            if d.get("ano") is None or int(d["ano"]) < desde:
                continue
            b = str(d.get("bairro") or "").upper().strip()
            if bairros and b not in bairros:
                continue
            d["arquivo"] = os.path.basename(arq)
            linhas.append(d)
        log(f"{os.path.basename(arq)}: {n} linhas lidas, {len(linhas)} acumuladas no filtro")
    return linhas

# ------------------------------------------------------------------- geocodificar
def carregar_portas(cls, cache_dir):
    cache = os.path.join(cache_dir, "portas.json")
    portas = json.load(open(cache)) if os.path.exists(cache) else {}
    faltam = [c for c in cls if c not in portas]
    for i in range(0, len(faltam), 60):
        lote = faltam[i:i + 60]
        for c in lote:
            portas.setdefault(c, [])
        off = 0
        while True:
            p = {"where": "cl IN (" + ",".join(f"'{c}'" for c in lote) + ")",
                 "outFields": "cl,np,np_int,cod_lote,cod_quadra,cep,num_pavimentos",
                 "returnGeometry": "true", "outSR": "4326", "resultOffset": off,
                 "resultRecordCount": 2000, "f": "json"}
            r = http_json(NP_URL + urllib.parse.urlencode(p))
            for ft in r.get("features", []):
                a, g = ft["attributes"], ft.get("geometry") or {}
                if g.get("y") is None:
                    continue
                portas[a["cl"]].append({"np": (a["np"] or "").strip(), "np_int": a.get("np_int"),
                                        "cod_lote": a.get("cod_lote"), "cod_quadra": a.get("cod_quadra"),
                                        "cep": a.get("cep"), "num_pavimentos": a.get("num_pavimentos"),
                                        "lat": g["y"], "lon": g["x"]})
            if r.get("exceededTransferLimit") and r.get("features"):
                off += len(r["features"])
            else:
                break
        if (i // 60) % 10 == 0:
            log(f"  portas: {i + len(lote)}/{len(faltam)} ruas consultadas")
    json.dump(portas, open(cache, "w"))
    return portas

def carregar_centros(cls, cache_dir):
    cache = os.path.join(cache_dir, "ruas_centro.json")
    ruas = json.load(open(cache)) if os.path.exists(cache) else {}
    faltam = [c for c in cls if c not in ruas]
    for i in range(0, len(faltam), 50):
        lote = faltam[i:i + 50]
        p = {"where": "cl IN (" + ",".join(f"'{c}'" for c in lote) + ")", "outFields": "cl",
             "returnGeometry": "true", "outSR": "4326", "f": "json"}
        r = http_json(LOG_URL + urllib.parse.urlencode(p))
        acc = defaultdict(list)
        for ft in r.get("features", []):
            for path in (ft.get("geometry") or {}).get("paths", []):
                acc[ft["attributes"]["cl"]] += path
        for c in lote:
            pts = acc.get(c)
            ruas[c] = {"lat": sum(p[1] for p in pts) / len(pts), "lon": sum(p[0] for p in pts) / len(pts)} if pts else None
    json.dump(ruas, open(cache, "w"))
    return ruas

def geocodificar(cl, numero, portas, ruas):
    vazio = dict(np_usado=None, cod_lote=None, cod_quadra=None, cep=None, num_pavimentos=None)
    lst = portas.get(cl) or []
    centro = ruas.get(cl)
    if lst and re.fullmatch(r"\d+", numero or "") and int(numero) > 0:
        for p in lst:
            if p["np"] == numero:
                return dict(lat=p["lat"], lon=p["lon"], np_usado=p["np"], cod_lote=p["cod_lote"],
                            cod_quadra=p["cod_quadra"], cep=p["cep"], num_pavimentos=p["num_pavimentos"]), "exata"
        n = int(numero)
        cand = [p for p in lst if p.get("np_int") is not None and abs(p["np_int"] - n) <= TOL_NUMERO]
        if cand:
            best = min(cand, key=lambda p: abs(p["np_int"] - n) + (0 if (p["np_int"] - n) % 2 == 0 else 0.5))
            return dict(lat=best["lat"], lon=best["lon"], np_usado=best["np"], cod_lote=best["cod_lote"],
                        cod_quadra=best["cod_quadra"], cep=best["cep"], num_pavimentos=best["num_pavimentos"]), f"aproximada (nº {best['np']})"
    if centro:
        return dict(lat=centro["lat"], lon=centro["lon"], **vazio), "aproximada (centro da rua)"
    return dict(lat=None, lon=None, **vazio), "sem"

# ---------------------------------------------------------------------- montagem
def montar_registros(linhas, portas, ruas, com_geo, nomes_arcgis):
    candidatos = defaultdict(list)  # cl -> [(é_arquivo_recente, nome)]
    for d in linhas:
        cl = cl_norm(d)
        par = (d["arquivo"].startswith("ITBI_TRANSACOES_2025"), str(d.get("logradouro") or ""))
        if par not in candidatos[cl]:
            candidatos[cl].append(par)
    nome_cl = {cl: nome_canonico(cl, sorted(c, key=lambda x: not x[0]), nomes_arcgis) for cl, c in candidatos.items()}

    ocorrencia = Counter()
    regs, prec, rej = [], Counter(), Counter()
    for d in linhas:
        cl = cl_norm(d)
        valor, area = num(d.get("vl_declarado")), num(d.get("area"))
        pct = num(d.get("parte_transferida"))
        pct = 100.0 if pct is None else pct
        ok, motivo = validar(valor, area, pct)
        numero = str(d.get("numero") or "").strip()
        compl = str(d.get("COMPLEMENTO") or "").strip() or None
        base = "|".join(str(x) for x in (d["ano"], d["mes"], cl, d.get("trecho"), numero, compl,
                                          d.get("cod_tipologia"), valor, area))
        ocorrencia[base] += 1
        rid = hashlib.sha1(f"{base}|{ocorrencia[base]}".encode()).hexdigest()
        if com_geo and cl != "000000":
            geo, gp = geocodificar(cl, numero, portas, ruas)
        else:
            geo, gp = dict(lat=None, lon=None, np_usado=None, cod_lote=None, cod_quadra=None, cep=None, num_pavimentos=None), ("sem" if com_geo else None)
        prec[gp.split(" (")[0] if gp else "pulada"] += 1
        if not ok:
            rej[motivo] += 1
        regs.append(dict(
            id=rid, ano=int(d["ano"]), mes=int(d["mes"]),
            data_transacao=f"{int(d['ano'])}-{int(d['mes']):02d}-15",
            regiao_fiscal=d.get("regiao_fiscal") or None, cod_bairro=str(d.get("CD_BAIRRO") or "") or None,
            bairro=str(d.get("bairro") or "DESCONHECIDO").upper().strip() or "DESCONHECIDO", cl=cl,
            trecho=int(d["trecho"]) if d.get("trecho") not in (None, "") else None,
            logradouro=nome_cl[cl] if cl != "000000" else sem_acento(str(d.get("logradouro") or "SEM LOGRADOURO")).upper(),
            logradouro_smf=str(d.get("logradouro") or ""), numero=numero or None, complemento=compl,
            cod_tipologia=str(d.get("cod_tipologia") or "") or None, tipologia_smf=d.get("ds_imovel_tipologia") or None,
            tipologia=classificar_tipologia(d.get("ds_imovel_tipologia")),
            uso_smf=d.get("descricao") or None, uso=classificar_uso(d.get("descricao")),
            percentual_transferido=round(pct, 2),
            valor_transacao=round(valor, 2) if valor else 0, area_m2=round(area, 2) if area else 0,
            aceita=ok, motivo_rejeicao=motivo, geo_precisao=gp, arquivo_fonte=d["arquivo"], **geo))
    return regs, prec, rej

# ------------------------------------------------------------------------ gravar
def cabecalhos(key):
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

def upsert_escrituras(regs, url, key, lote=500):
    endpoint = url.rstrip("/") + "/rest/v1/itbi_escrituras?on_conflict=id"
    hdr = {**cabecalhos(key), "Prefer": "resolution=merge-duplicates,return=minimal"}
    gravaveis = [r for r in regs if r["valor_transacao"] > 0 and r["area_m2"] > 0]
    for i in range(0, len(gravaveis), lote):
        corpo = json.dumps(gravaveis[i:i + lote], ensure_ascii=False).encode()
        http_json(endpoint, data=corpo, headers=hdr, method="POST")
        if (i // lote) % 20 == 0:
            log(f"  gravadas {min(i + lote, len(gravaveis))}/{len(gravaveis)}")
    return len(gravaveis)

def consolidar(url, key, inicio, fim, bairro=None):
    endpoint = url.rstrip("/") + "/rest/v1/rpc/itbi_consolidar_smf"
    corpo = json.dumps({"p_inicio": inicio, "p_fim": fim, "p_bairro": bairro}).encode()
    return http_json(endpoint, data=corpo, headers=cabecalhos(key), method="POST", timeout=900)

def registrar_etl(url, key, status, bairro, importados, erro, detalhes, iniciado_em):
    endpoint = url.rstrip("/") + "/rest/v1/etl_log"
    corpo = json.dumps({"fonte": "smf", "bairro": bairro or "TODOS", "status": status,
                        "registros_importados": importados, "registros_com_erro": 0,
                        "erro_mensagem": erro, "detalhes": detalhes,
                        "iniciado_em": iniciado_em, "finalizado_em": time.strftime("%Y-%m-%dT%H:%M:%S%z")},
                       ensure_ascii=False).encode()
    try:
        http_json(endpoint, data=corpo, headers={**cabecalhos(key), "Prefer": "return=minimal"}, method="POST")
    except Exception as e:  # noqa
        log("  aviso: não gravou etl_log:", e)

def escrever_csv(regs, caminho):
    cols = list(regs[0].keys())
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, delimiter=";")
        w.writeheader()
        for r in regs:
            w.writerow({k: (str(v).replace(".", ",") if isinstance(v, float) else v) for k, v in r.items()})

# -------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bairro", action="append", default=[], help="repetível; sem ele = cidade inteira")
    ap.add_argument("--desde", type=int, default=2019)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sem-consolidar", action="store_true")
    ap.add_argument("--fonte-dir")
    ap.add_argument("--cache-dir", default="./cache_smf")
    ap.add_argument("--sem-geo", action="store_true")
    ap.add_argument("--saida")
    a = ap.parse_args()
    bairros = {b.upper().strip() for b in a.bairro}
    iniciado_em = time.strftime("%Y-%m-%dT%H:%M:%S%z")

    nomes_arcgis = json.load(open(NOMES_ARCGIS)) if os.path.exists(NOMES_ARCGIS) else {}
    if not nomes_arcgis:
        log("aviso: data/cl_nomes_arcgis.json ausente; nomes de rua virão da SMF")

    if a.fonte_dir:
        arquivos = sorted(os.path.join(a.fonte_dir, f) for f in os.listdir(a.fonte_dir) if re.match(r"ITBI_TRANSACOES.*\.xlsx$", f, re.I))
        log("usando arquivos locais:", [os.path.basename(x) for x in arquivos])
    else:
        links = links_da_pagina()
        log("links na página da SMF:", *[os.path.basename(l) for l in links])
        arquivos = baixar(links, a.cache_dir)
    if not arquivos:
        sys.exit("nenhum arquivo ITBI_TRANSACOES*.xlsx")

    linhas = ler_planilhas(arquivos, bairros, a.desde)
    if not linhas:
        sys.exit("nenhuma linha no filtro")
    cls = sorted({cl_norm(d) for d in linhas} - {"000000"})
    log(f"{len(linhas)} escrituras, {len(cls)} logradouros")

    portas = ruas = {}
    if not a.sem_geo:
        os.makedirs(a.cache_dir, exist_ok=True)
        portas = carregar_portas(cls, a.cache_dir)
        ruas = carregar_centros(cls, a.cache_dir)

    regs, prec, rej = montar_registros(linhas, portas, ruas, not a.sem_geo, nomes_arcgis)
    log("geocodificação:", dict(prec))
    log("rejeitadas pelas regras do app:", dict(rej) or "nenhuma")
    log("usos:", dict(Counter(r["uso"] for r in regs)))
    log("tipologias:", dict(Counter(r["tipologia"] for r in regs)))
    import calendar
    inicio = min(r["data_transacao"] for r in regs)[:7] + "-01"
    ultimo = max(r["data_transacao"] for r in regs)
    ano_f, mes_f = int(ultimo[:4]), int(ultimo[5:7])
    fim = f"{ano_f}-{mes_f:02d}-{calendar.monthrange(ano_f, mes_f)[1]:02d}"  # nunca "-31" fixo

    if a.dry_run:
        saida = a.saida or f"itbi_escrituras_dryrun_{time.strftime('%Y%m%d')}.csv"
        escrever_csv(regs, saida)
        log(f"DRY-RUN: nada gravado. {len(regs)} linhas em {saida}. Consolidaria {inicio} a {fim}"
            + (f" para {sorted(bairros)}" if bairros else " para a cidade inteira"))
        return

    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (ou use --dry-run)")
    try:
        n = upsert_escrituras(regs, url, key)
        log(f"itbi_escrituras: {n} escrituras gravadas/atualizadas")
        resultado = None
        if not a.sem_consolidar:
            alvos = sorted(bairros) or [None]
            resultado = [consolidar(url, key, inicio, fim, b) for b in alvos]
            log("consolidação:", json.dumps(resultado, ensure_ascii=False))
        registrar_etl(url, key, "concluido", ",".join(sorted(bairros)) or None, n, None,
                      {"periodo": [inicio, fim], "geocodificacao": dict(prec), "rejeitadas": dict(rej),
                       "consolidacao": resultado, "arquivos": [os.path.basename(x) for x in arquivos]}, iniciado_em)
        log("carga concluída")
    except Exception as e:  # noqa
        registrar_etl(url, key, "erro", ",".join(sorted(bairros)) or None, 0, str(e)[:500], None, iniciado_em)
        raise

if __name__ == "__main__":
    main()
