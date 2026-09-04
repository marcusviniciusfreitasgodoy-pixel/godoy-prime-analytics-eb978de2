import re, html, sys, unicodedata
src = open(sys.argv[1], encoding='utf-8').read().split('\n')
out = []; toc = []
h2n = 0; h3n = 0
def esc(t): return html.escape(t, quote=False)
def inline(t):
    t = esc(t)
    t = re.sub(r'`([^`]+)`', lambda m: '<code>'+m.group(1)+'</code>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*\n]+?)\*(?![\w*])', r'<em>\1</em>', t)
    return t
def slug(t):
    t = unicodedata.normalize('NFD', t).encode('ascii','ignore').decode().lower()
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return t
def isnum(c):
    c = c.strip()
    return bool(c) and bool(re.fullmatch(r'[−\-+]?[\d.,]+(\s?%)?', c))
i = 0; n = len(src); title=None; meta={}
def flush_para(buf):
    if buf: out.append('<p>'+inline(' '.join(buf))+'</p>')
buf=[]
while i < n:
    line = src[i]
    if line.startswith('```'):
        flush_para(buf); buf=[]
        lang = line[3:].strip(); i += 1; code=[]
        while i < n and not src[i].startswith('```'): code.append(src[i]); i += 1
        out.append('<pre class="code" data-lang="%s"><code>%s</code></pre>' % (esc(lang), esc('\n'.join(code))))
        i += 1; continue
    if line.startswith('# ') and title is None:
        title = line[2:].strip(); i += 1; continue
    m = re.match(r'^(#{2,4}) (.*)$', line)
    if m:
        flush_para(buf); buf=[]
        lvl = len(m.group(1)); text = m.group(2).strip()
        if lvl == 2:
            h3n = 0
            ma = re.match(r'Apêndice ([A-C])\.', text)
            if ma: hid = 'ap'+ma.group(1).lower()
            else:
                h2n += 1; hid = 's%d' % h2n
            toc.append((hid, text))
            out.append('<h2 id="%s">%s</h2>' % (hid, inline(text)))
        elif lvl == 3:
            mn = re.match(r'(\d+)\.(\d+) ', text)
            hid = 's%s-%s' % (mn.group(1), mn.group(2)) if mn else slug(text)
            out.append('<h3 id="%s">%s</h3>' % (hid, inline(text)))
        else:
            mn = re.match(r'(\d+)\.(\d+)\.(\d+) ', text)
            hid = 's%s-%s-%s' % mn.groups() if mn else slug(text)
            out.append('<h4 id="%s">%s</h4>' % (hid, inline(text)))
        i += 1; continue
    if line.strip() == '---':
        flush_para(buf); buf=[]; out.append('<hr>'); i += 1; continue
    if line.startswith('|'):
        flush_para(buf); buf=[]
        rows=[]
        while i < n and src[i].startswith('|'): rows.append(src[i]); i += 1
        cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
        hdr = cells(rows[0]); body = rows[2:] if len(rows) > 1 and re.match(r'^\|[\s:\-|]+\|$', rows[1]) else rows[1:]
        h = '<thead><tr>' + ''.join('<th>'+inline(c)+'</th>' for c in hdr) + '</tr></thead>'
        b = '<tbody>'
        for r in body:
            cs = cells(r)
            b += '<tr>' + ''.join(('<td class="num">' if isnum(c) else '<td>') + inline(c) + '</td>' for c in cs) + '</tr>'
        b += '</tbody>'
        out.append('<div class="table-wrap"><table>' + h + b + '</table></div>'); continue
    if line.startswith('> '):
        flush_para(buf); buf=[]
        q=[]
        while i < n and src[i].startswith('> '): q.append(src[i][2:]); i += 1
        out.append('<blockquote><p>'+inline(' '.join(q))+'</p></blockquote>'); continue
    if re.match(r'^(\d+)\. ', line) or re.match(r'^- ', line):
        flush_para(buf); buf=[]
        ordered = bool(re.match(r'^\d+\. ', line)); items=[]
        while i < n and (re.match(r'^\d+\. ', src[i]) if ordered else src[i].startswith('- ')):
            t = re.sub(r'^(\d+\. |- )', '', src[i]); i += 1
            while i < n and src[i].startswith('  ') and src[i].strip(): t += ' ' + src[i].strip(); i += 1
            items.append(t)
        tag = 'ol' if ordered else 'ul'
        lis = ''
        for t in items:
            if t.startswith('[ ] '): lis += '<li class="check">'+inline(t[4:])+'</li>'
            else: lis += '<li>'+inline(t)+'</li>'
        out.append('<%s>%s</%s>' % (tag, lis, tag)); continue
    if not line.strip():
        flush_para(buf); buf=[]; i += 1; continue
    buf.append(line.strip()); i += 1
flush_para(buf)
# meta from first paragraphs
body = '\n'.join(out)
mv = re.search(r'Versão (\d+\.\d+), consolidada', body)
mc = re.search(r'após o PR #(\d+)', body)
meta_html = ('<div class="meta"><span><b>Versão:</b> %s consolidada</span><span><b>Código:</b> main após PR #%s</span>'
             '<span><b>Data:</b> 2026-09-03</span><span><b>Fonte no repositório:</b> docs/especificacao-metodologia-godoy-prime.md</span>'
             '<span><b>Para:</b> desenvolvedor Prime Circle</span></div>') % (mv.group(1), mc.group(1))
toc_html = '<nav class="toc" aria-label="Sumário"><div class="brand">Godoy Prime Analytics</div><ol>' + ''.join(
    '<li><a href="#%s">%s</a></li>' % (hid, esc(re.sub(r'`','',t))) for hid, t in toc) + '</ol></nav>'
head = open(sys.argv[2], encoding='utf-8').read()
page = head + '<div class="shell">\n' + toc_html + '\n<main>\n<h1>' + esc(title) + '</h1>\n' + meta_html + '\n' + body + '\n</main>\n</div>\n'
open(sys.argv[3], 'w', encoding='utf-8').write(page)
print(len(page), 'bytes;', len(toc), 'seções')
