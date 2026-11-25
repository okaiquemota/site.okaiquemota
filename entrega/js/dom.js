/* Entrega · peças pequenas de DOM
   Tudo é montado com textContent e propriedades (nunca innerHTML com dado),
   então um texto vindo do painel não vira código na página. Estilos só pelo
   CSSOM (el.style), que a Content-Security-Policy permite. */

export function h(tag, props, ...filhos) {
    const el = document.createElement(tag);
    if (props) {
        for (const [k, v] of Object.entries(props)) {
            if (v === undefined || v === null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'text') el.textContent = v;
            else if (k === 'style') Object.assign(el.style, v);
            else if (k === 'data') Object.assign(el.dataset, v);
            else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
            else if (k === 'value' || (k in el && typeof v !== 'string')) el[k] = v;
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    anexar(el, filhos);
    return el;
}

function anexar(el, filhos) {
    filhos.flat(Infinity).forEach((f) => {
        if (f === null || f === undefined || f === false) return;
        el.append(f instanceof Node ? f : document.createTextNode(String(f)));
    });
}

const SVG = 'http://www.w3.org/2000/svg';
const ICONES = {
    coracao: 'M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z',
    baixar: 'M12 4v11M7 10.5l5 5 5-5M5 19.5h14',
    stories: 'M8 3.5h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2ZM9.5 17h5',
    fechar: 'M6 6l12 12M18 6 6 18',
    esq: 'M15 5l-7 7 7 7',
    dir: 'M9 5l7 7-7 7',
    baixo: 'M12 5v14M6 13l6 6 6-6',
    play: 'M8 5.5v13l10.5-6.5Z',
    pausa: 'M8.5 5.5v13M15.5 5.5v13',
    som: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    enviar: 'M4 12 20 4l-6 16-3-7Z M11 13l9-9',
    grade: 'M4.5 4.5h6v6h-6ZM13.5 4.5h6v6h-6ZM4.5 13.5h6v6h-6ZM13.5 13.5h6v6h-6Z',
    copiar: 'M9 9h10v10H9ZM5 15V5h10'
};

export function icone(nome, classe) {
    const s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'ic' + (classe ? ' ' + classe : ''));
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', ICONES[nome] || '');
    s.append(p);
    return s;
}

/* Um aviso curto no pé da tela ("Link copiado"), lido também pelo leitor de tela */
let caixaAviso;
let timerAviso;
export function avisar(texto) {
    if (!caixaAviso) {
        caixaAviso = h('p', { class: 'aviso', role: 'status', 'aria-live': 'polite' });
        document.body.append(caixaAviso);
    }
    caixaAviso.textContent = texto;
    caixaAviso.classList.add('aviso-on');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => caixaAviso.classList.remove('aviso-on'), 2800);
}

export const poucoMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch (e) {
        const t = h('textarea', { value: texto, readOnly: true, style: { position: 'fixed', opacity: '0' } });
        document.body.append(t); t.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        t.remove();
        return ok;
    }
}

export function abrirWhatsApp(numero, texto) {
    const url = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
    const j = window.open(url, '_blank');
    if (j) j.opener = null;
    else location.href = url;
}

/* Nomes e expressões que não podem se partir no fim da linha ("Kevin MacLeod", "CC BY 4.0") */
export const junto = (texto) => String(texto).replace(/ /g, '\u00a0');

/* Tira a "viúva": a última palavra de um parágrafo nunca fica sozinha numa linha.
   Troca o último espaço do texto por um espaço que não quebra (só se a última palavra for curta). */
export function semViuva(el) {
    if (el.closest('.visualmente-escondido') || el.classList.contains('palavras')) return;
    const nos = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (!n.parentElement.closest('.visualmente-escondido')) nos.push(n);
    if (nos.map((x) => x.data).join('').trim().split(/\s+/).length < 4) return;
    for (let i = nos.length - 1; i >= 0; i--) {
        const t = nos[i].data.replace(/\s+$/, '');
        const k = t.lastIndexOf(' ');
        if (k < 0) { if (t.length) return; continue; }
        if (t.length - k > 16) return;
        nos[i].data = t.slice(0, k) + '\u00a0' + t.slice(k + 1) + nos[i].data.slice(t.length);
        return;
    }
}
