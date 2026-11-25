/* Entrega · layouts dos capítulos
   Cada bloco do evento.json tem um `layout`. Para criar um novo, escreva a
   função aqui e registre em LAYOUTS: o motor não precisa saber de mais nada. */
import { h, icone } from './dom.js';

/* Uma foto: o botão que abre o visor + o coração (só para o casal) */
export function figuraFoto(foto, ctx, opcoes = {}) {
    const img = h('img', {
        src: foto.mini,
        srcset: foto.mini !== foto.src ? foto.mini + ' ' + foto.larguraMini + 'w, ' + foto.src + ' ' + foto.larguraWeb + 'w' : null,
        sizes: opcoes.sizes || '(max-width: 720px) 100vw, 60vw',
        width: String(foto.largura),
        height: String(foto.altura),
        alt: foto.alt,
        loading: 'lazy',
        decoding: 'async',
        draggable: false,
        style: foto.foco ? { objectPosition: foto.foco } : null
    });
    img.classList.add('carregando');
    const pronto = () => img.classList.remove('carregando');
    img.addEventListener('load', pronto, { once: true });
    img.addEventListener('error', pronto, { once: true });

    const abrir = h('button', {
        class: 'foto-abrir',
        type: 'button',
        'aria-label': 'Ampliar foto: ' + (foto.alt || 'foto ' + (foto.indice + 1)),
        onclick: () => ctx.abrirFoto(foto.id)
    }, img);

    const fig = h('figure', { class: 'foto' + (foto.deitada ? ' foto-deitada' : ' foto-empe'), data: { id: foto.id } }, abrir);
    // a proporção vai para o CSS: é com ela que a foto nunca passa da altura da tela
    fig.style.setProperty('--r', foto.proporcao.toFixed(4));
    // a moldura reserva o espaço da foto antes dela chegar (sem pulos na página)
    if (!opcoes.recorte) fig.style.aspectRatio = foto.largura + ' / ' + foto.altura;

    if (ctx.favoritas) {
        const fav = h('button', {
            class: 'foto-fav',
            type: 'button',
            'aria-pressed': ctx.favoritas.tem(foto.id) ? 'true' : 'false',
            'aria-label': 'Favoritar: ' + (foto.alt || 'foto ' + (foto.indice + 1)),
            data: { fav: foto.id },
            onclick: () => ctx.favoritas.alternar(foto.id)
        }, icone('coracao'));
        fig.append(fav);
    }
    if (opcoes.legenda) fig.append(h('figcaption', { class: 'foto-legenda', text: opcoes.legenda }));
    return fig;
}

const revela = (el, atraso) => { el.setAttribute('data-revela', ''); if (atraso) el.style.setProperty('--atraso', atraso + 'ms'); return el; };

export const LAYOUTS = {
    /* uma foto de ponta a ponta (deitada) ou alta e centralizada (em pé) */
    panoramica(b, ctx) {
        const f = b.fotos[0];
        return h('div', { class: 'bloco bloco-panoramica' + (f.deitada ? '' : ' bloco-panoramica-empe') },
            revela(figuraFoto(f, ctx, { sizes: '100vw' })),
            b.legenda && h('p', { class: 'bloco-legenda', text: b.legenda }));
    },

    /* uma foto com a legenda ao lado, deslocada para um lado como numa revista */
    unica(b, ctx) {
        const lado = b.alinhamento || 'centro';
        return h('div', { class: 'bloco bloco-unica bloco-unica-' + lado },
            revela(figuraFoto(b.fotos[0], ctx, { sizes: '(max-width: 720px) 100vw, 50vw' })),
            b.legenda && revela(h('p', { class: 'bloco-nota', text: b.legenda }), 200));
    },

    /* duas lado a lado, na mesma altura e sem cortar (a largura segue a proporção) */
    dupla(b, ctx) { return fileira(b, ctx, 'dupla'); },
    trio(b, ctx) { return fileira(b, ctx, 'trio'); },

    /* mosaico editorial: uma grande e as outras em volta (corta pelo `foco`) */
    mosaico(b, ctx) {
        const n = Math.min(b.fotos.length, 5);
        const el = h('div', { class: 'bloco bloco-mosaico bloco-mosaico-' + n });
        b.fotos.slice(0, 5).forEach((f, i) => el.append(revela(figuraFoto(f, ctx, { recorte: true, sizes: i === 0 ? '(max-width: 720px) 100vw, 58vw' : '(max-width: 720px) 50vw, 40vw' }), i * 90)));
        b.fotos.slice(5).forEach((f) => el.append(revela(figuraFoto(f, ctx, { recorte: true, sizes: '50vw' }))));
        return el;
    },

    citacao(b) {
        return revela(h('blockquote', { class: 'bloco bloco-citacao' },
            palavras(b.texto),
            b.autor && h('footer', { text: b.autor })));
    },

    /* trechos dos votos, lado a lado (um embaixo do outro no celular) */
    votos(b) {
        return h('div', { class: 'bloco bloco-votos' },
            b.titulo && revela(h('p', { class: 'rotulo bloco-votos-titulo', text: b.titulo })),
            h('div', { class: 'votos' }, (b.trechos || []).map((t, i) => revela(h('blockquote', { class: 'voto' },
                palavras(t.texto),
                t.autor && h('footer', { text: t.autor })), i * 160))));
    },

    texto(b) {
        return revela(h('p', { class: 'bloco bloco-texto', text: b.texto }));
    }
};

/* o texto entra palavra por palavra (cada uma com seu atraso); o leitor de tela lê a frase inteira */
function palavras(texto) {
    const p = h('p', { class: 'palavras' }, h('span', { class: 'visualmente-escondido', text: texto }));
    const ws = texto.split(/\s+/);
    const fim = h('span', { class: 'junto' });
    ws.forEach((w, i) => {
        const s = h('span', { 'aria-hidden': 'true', text: w });
        s.style.setProperty('--i', String(i));
        // as duas últimas palavras ficam na mesma linha (nunca uma palavra sozinha)
        if (ws.length > 3 && i >= ws.length - 2) { fim.append(s); if (i === ws.length - 2) fim.append(' '); }
        else p.append(s, ' ');
    });
    if (fim.childNodes.length) p.append(fim);
    return p;
}

function fileira(b, ctx, tipo) {
    const deslocada = b.variante === 'deslocada';
    const temDeitada = b.fotos.some((f) => f.deitada);
    const el = h('div', { class: 'bloco bloco-fileira bloco-' + tipo + (deslocada ? ' bloco-deslocada' : '') + (temDeitada ? ' bloco-empilha' : '') });
    const largura = Math.round(100 / b.fotos.length);
    b.fotos.forEach((f, i) => {
        const fig = revela(figuraFoto(f, ctx, { sizes: '(max-width: 720px) ' + (temDeitada ? 100 : largura) + 'vw, ' + largura + 'vw' }), i * 110);
        // cada foto cresce na proporção dela: as alturas ficam iguais sem corte
        el.append(fig);
    });
    if (b.legenda) el.append(h('p', { class: 'bloco-legenda', text: b.legenda }));
    return el;
}

export function desenharBloco(b, ctx) {
    const fn = LAYOUTS[b.layout] || LAYOUTS.mosaico;
    if (!LAYOUTS[b.layout]) console.warn('Layout desconhecido, usando mosaico:', b.layout);
    const semFoto = fn === LAYOUTS.citacao || fn === LAYOUTS.texto || fn === LAYOUTS.votos;
    if (!semFoto && !(b.fotos && b.fotos.length)) return null;
    return fn(b, ctx);
}
