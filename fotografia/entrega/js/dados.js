/* Entrega · dados
   Lê o evento (hoje um evento.json ao lado da página; amanhã a API do painel
   ou o Supabase) e devolve tudo pronto pra desenhar: endereços resolvidos,
   fotos numeradas e capítulos filtrados pelo modo (casal ou convidados).
   Os componentes só conhecem o formato que sai daqui. */

/**
 * @typedef {Object} Foto
 * @property {string} id            único no evento (vai no endereço: #foto=id)
 * @property {string} [arquivo]     nome do arquivo; com `midia`, vira src/mini/original
 * @property {string} [src]         versão para a tela (~1600–2048px no lado maior)
 * @property {string} [mini]        versão leve para a página (~800px)
 * @property {string} [original]    alta resolução para baixar
 * @property {number} largura       proporção da foto (largura da versão `src`)
 * @property {number} altura
 * @property {number} [miniLargura] largura real da `mini`, se fugir da regra
 * @property {string} alt           descrição do que se vê (leitor de tela)
 * @property {string} [foco]        ponto que não pode ser cortado no mosaico, "50% 30%"
 *
 * @typedef {Object} Bloco
 * @property {'panoramica'|'unica'|'dupla'|'trio'|'mosaico'|'citacao'|'texto'} layout
 * @property {Foto[]} [fotos]
 * @property {string} [texto] @property {string} [autor] @property {string} [legenda]
 * @property {'esquerda'|'direita'|'centro'} [alinhamento] @property {'deslocada'} [variante]
 *
 * @typedef {Object} Capitulo
 * @property {string} id @property {string} numero @property {string} titulo
 * @property {string} [subtitulo] @property {string} [texto]
 * @property {boolean} [privado]   some no link dos convidados (making of)
 * @property {'escuro'} [tom]      o capítulo anoitece
 * @property {Bloco[]} [blocos]    curadoria manual; sem ela, use `fotos` e o layout é automático
 * @property {Foto[]} [fotos]
 */

const PADRAO = {
    fotografo: {
        nome: 'Kaique Mota',
        marca: 'Kaique Mota Fotografia',
        site: 'https://okaiquemota.com.br/fotografia/',
        siteRotulo: 'okaiquemota.com.br/fotografia',
        whatsapp: '5516982157266',
        instagram: 'okaiquemota'
    },
    midia: { web: '', mini: '', original: '', ladoMaiorWeb: 2048, ladoMaiorMini: 800 },
    tema: { modo: 'claro', cores: {} },
    selecao: { ativa: true, limite: 0 },
    downloads: {},
    convidados: { carta: false },
    creditos: []
};

/** Onde buscar o evento. Trocar por outra fonte é só ensinar este mapa. */
const FONTES = {
    // "evento.json" ou qualquer endereço do próprio site
    json: async (origem) => {
        const url = new URL(origem, document.baseURI);
        const r = await fetch(url, { credentials: 'same-origin' });
        if (!r.ok) throw new Error('Não deu para abrir ' + url.pathname + ' (' + r.status + ')');
        return { bruto: await r.json(), base: url };
    }
    // painel: async (slug) => { const r = await fetch('/api/entregas/' + slug); ... }
    // supabase: async (slug) => { ...select * from entregas where slug = ... }
};

export async function carregarEvento(origem, modo) {
    const { bruto, base } = await FONTES.json(origem);
    return normalizar(bruto, base, modo);
}

export function normalizar(bruto, base, modo) {
    const ev = mesclar(PADRAO, bruto);
    ev.modo = modo === 'convidados' ? 'convidados' : 'casal';
    const resolve = (u) => (u ? new URL(u, base).href : '');
    const m = ev.midia;

    const prepara = (f, capitulo) => {
        const foto = Object.assign({}, f);
        const arq = foto.arquivo;
        foto.src = resolve(foto.src || (arq && m.web + arq));
        foto.mini = resolve(foto.mini || (arq && (m.mini || m.web) + arq)) || foto.src;
        foto.original = resolve(foto.original || (arq && (m.original || m.web) + arq)) || foto.src;
        foto.largura = Number(foto.largura) || 3;
        foto.altura = Number(foto.altura) || 2;
        foto.proporcao = foto.largura / foto.altura;
        foto.deitada = foto.proporcao > 1.05;
        // larguras reais das duas versões, para o srcset escolher bem
        const ladoW = (lado) => Math.round(foto.deitada ? lado : lado * foto.proporcao);
        foto.larguraWeb = f.src ? foto.largura : ladoW(m.ladoMaiorWeb);
        foto.larguraMini = foto.miniLargura || (f.mini || arq ? ladoW(m.ladoMaiorMini) : foto.larguraWeb);
        foto.nomeArquivo = arq || decodeURIComponent(foto.original.split('/').pop().split('?')[0]);
        foto.alt = foto.alt || '';
        foto.capitulo = capitulo;
        return foto;
    };

    // o link dos convidados não leva os capítulos privados (o making of)
    ev.capitulosOriginais = ev.capitulos || [];
    ev.capitulos = ev.capitulosOriginais.filter((c) => !(ev.modo === 'convidados' && c.privado));

    ev.fotos = [];
    ev.capitulos.forEach((c) => {
        const blocos = c.blocos && c.blocos.length ? c.blocos : montarBlocos(c.fotos || []);
        c.blocos = blocos.map((b) => {
            const bloco = Object.assign({}, b);
            bloco.fotos = (b.fotos || []).map((f) => {
                const foto = prepara(f, c);
                foto.indice = ev.fotos.length;
                ev.fotos.push(foto);
                return foto;
            });
            return bloco;
        });
    });
    ev.porId = new Map(ev.fotos.map((f) => [f.id, f]));

    if (ev.capa && ev.capa.foto) ev.capa.foto = prepara(ev.capa.foto, null);
    if (ev.trilha && ev.trilha.src) ev.trilha.src = resolve(ev.trilha.src);
    else ev.trilha = null;

    const dl = ev.downloads;
    ev.downloads.pacote = ev.modo === 'convidados' ? dl.convidados || {} : dl.completo || {};
    if (ev.downloads.pacote.url) ev.downloads.pacote.url = resolve(ev.downloads.pacote.url);

    ev.mostrarCarta = !!ev.carta && (ev.modo === 'casal' || ev.convidados.carta);
    ev.selecao.ativa = ev.selecao.ativa && ev.modo === 'casal';
    ev.dataTexto = formatarData(ev.data);
    ev.monograma = ev.monograma || (ev.nomes || []).map((n) => n.trim()[0]).join(' & ') || ev.titulo;
    return ev;
}

/* Layout automático: quando o capítulo só tem a lista de fotos.
   Foto deitada sozinha vira panorâmica; duas em pé, dupla; o resto, mosaico. */
export function montarBlocos(fotos) {
    const blocos = [];
    const deitada = (f) => f && Number(f.largura) / Number(f.altura) > 1.05;
    let i = 0;
    while (i < fotos.length) {
        const a = fotos[i], b = fotos[i + 1], c = fotos[i + 2];
        const ultimo = blocos.length ? blocos[blocos.length - 1].layout : null;
        const resta = fotos.length - i;
        // ritmo: panorâmica → dupla → mosaico → panorâmica…, sem repetir o mesmo layout em seguida
        if (deitada(a) && ultimo !== 'panoramica' && (ultimo !== 'dupla' || !b)) { blocos.push({ layout: 'panoramica', fotos: [a] }); i += 1; }
        else if (b && !deitada(a) && !deitada(b) && ultimo !== 'dupla') { blocos.push({ layout: 'dupla', fotos: [a, b] }); i += 2; }
        else if (resta >= 3 && ultimo !== 'mosaico') { const n = resta >= 4 && !deitada(c) ? 4 : 3; blocos.push({ layout: 'mosaico', fotos: fotos.slice(i, i + n) }); i += n; }
        else if (b) { blocos.push({ layout: 'dupla', variante: ultimo === 'dupla' ? 'deslocada' : undefined, fotos: [a, b] }); i += 2; }
        else { blocos.push({ layout: deitada(a) ? 'panoramica' : 'unica', alinhamento: 'centro', fotos: [a] }); i += 1; }
    }
    return blocos;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function formatarData(iso, curto) {
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    if (!a || !m || !d) return iso;
    if (curto) return String(d).padStart(2, '0') + ' · ' + String(m).padStart(2, '0') + ' · ' + a;
    return d + ' de ' + MESES[m - 1] + ' de ' + a;
}

function mesclar(base, extra) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(extra || {}).forEach((k) => {
        const v = extra[k];
        out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? mesclar(base[k], v) : v;
    });
    return out;
}
