/* Entrega · as seções da página, na ordem da história:
   capa → carta → capítulos → para guardar → assinatura do fotógrafo. */
import { h, icone, abrirWhatsApp } from './dom.js';
import { desenharBloco } from './layouts.js';
import { formatarData } from './dados.js';

/* ---------- Capa ---------- */
export function capa(ev, ctx) {
    const f = ev.capa && ev.capa.foto;
    const layout = (ev.capa && ev.capa.layout) === 'tela-cheia' ? 'tela-cheia' : 'editorial';
    const nomes = ev.nomes && ev.nomes.length ? ev.nomes : [ev.titulo];

    // "Vinícius" em cima, "& Stefany" embaixo: o & entra na linha do segundo nome
    const titulo = h('h1', { class: 'capa-nomes', 'aria-label': ev.titulo },
        nomes.map((n, i) => h('span', { class: 'capa-linha', 'aria-hidden': 'true' },
            i > 0 && h('span', { class: 'capa-e', text: '&' }), n)));

    const foto = f && h('div', { class: 'capa-foto' },
        h('img', {
            src: f.src,
            srcset: f.mini !== f.src ? f.mini + ' ' + f.larguraMini + 'w, ' + f.src + ' ' + f.larguraWeb + 'w' : null,
            sizes: layout === 'tela-cheia' ? '100vw' : '(max-width: 860px) 100vw, 55vw',
            width: String(f.largura), height: String(f.altura),
            alt: f.alt, fetchpriority: 'high', decoding: 'async',
            style: f.foco ? { objectPosition: f.foco } : null
        }));

    return h('header', { class: 'capa capa-' + layout },
        foto,
        h('div', { class: 'capa-texto' },
            h('p', { class: 'rotulo capa-tipo' }, ev.tipo, ev.tipo && ev.dataTexto ? h('span', { class: 'ponto', 'aria-hidden': 'true', text: '·' }) : null, ev.dataTexto && h('time', { datetime: ev.data, text: ev.dataTexto })),
            titulo,
            ev.epigrafe && h('p', { class: 'capa-epigrafe', text: ev.epigrafe }),
            ev.local && h('p', { class: 'rotulo capa-local', text: ev.local }),
            h('div', { class: 'capa-acoes' },
                h('a', { class: 'botao-linha', href: '#historia' }, h('span', { text: 'Começar a história' }), icone('baixo')),
                ctx.trilha && ctx.trilha.gatilho())));
}

/* ---------- Carta aos noivos ---------- */
export function carta(ev) {
    const c = ev.carta;
    return h('section', { class: 'carta', id: 'carta', 'aria-labelledby': 'carta-titulo' },
        h('p', { class: 'rotulo', 'data-revela': '', text: 'Uma carta' }),
        h('h2', { class: 'carta-titulo', id: 'carta-titulo', 'data-revela': '', text: c.titulo || ev.titulo }),
        h('div', { class: 'carta-texto' }, (c.paragrafos || []).map((p) => h('p', { 'data-revela': '', text: p }))),
        h('div', { class: 'carta-assina', 'data-revela': '' },
            h('span', { class: 'assinatura', role: 'img', 'aria-label': 'Assinatura de ' + ev.fotografo.nome }),
            c.assinatura && h('span', { class: 'carta-de', text: '— ' + c.assinatura })));
}

/* ---------- Um capítulo: a abertura e os blocos de fotos ---------- */
export function capitulo(c, ctx) {
    const id = 'cap-' + c.id;
    const n = c.blocos.reduce((s, b) => s + (b.fotos ? b.fotos.length : 0), 0);
    return h('section', { class: 'capitulo' + (c.tom === 'escuro' ? ' tom-escuro' : ''), id, 'aria-labelledby': id + '-titulo', data: { capitulo: c.id } },
        h('header', { class: 'capitulo-abre' },
            h('span', { class: 'capitulo-numeral', 'aria-hidden': 'true', text: c.numero }),
            h('p', { class: 'rotulo', 'data-revela': '', text: 'Capítulo ' + c.numero }),
            h('h2', { class: 'capitulo-titulo', id: id + '-titulo', 'data-revela': '', text: c.titulo }),
            c.subtitulo && h('p', { class: 'capitulo-sub', 'data-revela': '' }, h('span', { text: c.subtitulo }), h('span', { class: 'capitulo-conta', text: n + (n === 1 ? ' foto' : ' fotos') })),
            c.texto && h('p', { class: 'capitulo-texto', 'data-revela': '', text: c.texto })),
        h('div', { class: 'capitulo-blocos' }, c.blocos.map((b) => desenharBloco(b, ctx))));
}

/* ---------- Para guardar: o pacote completo e a seleção para o álbum ---------- */
export function levar(ev, ctx) {
    const p = ev.downloads.pacote || {};
    const cartoes = [];

    cartoes.push(cartao(
        'Todas as fotos',
        ev.fotos.length + ' fotos em alta resolução, num arquivo só.' + (p.tamanho ? ' (' + p.tamanho + ')' : ''),
        p.url
            ? h('a', { class: 'botao', href: p.url, target: '_blank', rel: 'noopener' }, icone('baixar'), h('span', { text: 'Baixar tudo' }))
            : h('span', { class: 'botao botao-off', 'aria-disabled': 'true' }, h('span', { text: 'Disponível em breve' })),
        'Uma foto só? Abra a foto e use o botão Baixar.'));

    if (ev.selecao.ativa && ctx.favoritas) {
        const conta = h('span', { class: 'cartao-conta' });
        const enviar = h('button', { class: 'botao', type: 'button', onclick: () => ctx.enviarSelecao() }, icone('enviar'), h('span', { text: 'Enviar seleção' }));
        const atualiza = () => {
            const t = ctx.favoritas.total();
            conta.textContent = t ? t + (t === 1 ? ' foto marcada' : ' fotos marcadas') + (ev.selecao.limite ? ' de ' + ev.selecao.limite : '') : 'Nenhuma foto marcada ainda';
            enviar.disabled = !t;
        };
        ctx.favoritas.aoMudar(atualiza);
        atualiza();
        cartoes.push(cartao('Seleção para o álbum',
            'Marquem com o coração as fotos que não podem faltar' + (ev.selecao.limite ? ' (até ' + ev.selecao.limite + ')' : '') + ' e mandem a lista para o ' + ev.fotografo.nome.split(' ')[0] + '.',
            h('div', { class: 'cartao-acoes' }, enviar, conta)));
    }

    return h('section', { class: 'levar', id: 'levar', 'aria-labelledby': 'levar-titulo' },
        h('div', { class: 'levar-cabeca', 'data-revela': '' },
            h('p', { class: 'rotulo', text: 'Para guardar' }),
            h('h2', { class: 'levar-titulo', id: 'levar-titulo', text: 'Leve com vocês' })),
        h('div', { class: 'cartoes' }, cartoes),
        ev.downloads.validade && h('p', { class: 'levar-nota', 'data-revela': '' },
            'As fotos ficam nesta página até ' + formatarData(ev.downloads.validade) + '. Baixem antes dessa data para guardar para sempre.'));
}

function cartao(titulo, texto, acao, nota) {
    return h('article', { class: 'cartao', 'data-revela': '' },
        h('h3', { class: 'cartao-titulo', text: titulo }),
        h('p', { class: 'cartao-texto', text: texto }),
        acao,
        nota && h('p', { class: 'cartao-nota', text: nota }));
}

/* ---------- Assinatura do fotógrafo, créditos e o convite discreto ---------- */
export function rodape(ev) {
    const fot = ev.fotografo;
    const creditos = (ev.creditos || []).filter((c) => c && c.nome);
    const msg = 'Oi, ' + fot.nome.split(' ')[0] + '! Vi as fotos de ' + ev.titulo + ' e queria um orçamento.';
    return h('footer', { class: 'rodape' },
        h('div', { class: 'rodape-assina', 'data-revela': '' },
            h('span', { class: 'assinatura', role: 'img', 'aria-label': 'Assinatura de ' + fot.nome }),
            h('p', { class: 'rodape-marca', text: fot.marca }),
            h('a', { class: 'link', href: fot.site, text: fot.siteRotulo || fot.site })),
        creditos.length > 0 && h('dl', { class: 'creditos', 'data-revela': '' },
            h('p', { class: 'rotulo creditos-titulo', text: ev.titulo + ' · ' + formatarData(ev.data, true) }),
            creditos.map((c) => h('div', { class: 'credito' }, h('dt', { text: c.papel }), h('dd', { text: c.nome })))),
        h('div', { class: 'rodape-cta', 'data-revela': '' },
            h('p', { class: 'rodape-cta-titulo', text: 'Gostou do que viu?' }),
            h('p', { class: 'rodape-cta-texto', text: 'Se a sua história também merece ser contada assim, vamos conversar.' }),
            h('div', { class: 'rodape-cta-acoes' },
                h('button', { class: 'botao botao-claro', type: 'button', onclick: () => abrirWhatsApp(fot.whatsapp, msg) }, h('span', { text: 'Pedir orçamento' })),
                h('a', { class: 'botao-linha', href: fot.site }, h('span', { text: 'Conhecer o trabalho' }), icone('dir')))),
        h('p', { class: 'rodape-fim' }, '© ' + new Date().getFullYear() + ' ' + fot.nome + '. Fotos para uso pessoal; para publicar com fins comerciais, fale com o fotógrafo.'));
}
