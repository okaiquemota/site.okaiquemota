/* Entrega · o motor da página de entrega de fotos
   A página (index.html) só diz onde estão os dados:
     <div id="entrega" data-evento="evento.json" data-modo="casal">
   Daqui pra frente é tudo igual para qualquer casamento, ensaio ou 15 anos. */
import { h, icone, avisar, poucoMovimento, copiar, abrirWhatsApp } from './dom.js';
import { carregarEvento } from './dados.js';
import { criarFavoritas, mensagemSelecao } from './favoritas.js';
import { criarVisor } from './visor.js';
import { criarTrilha } from './trilha.js';
import { figuraFoto } from './layouts.js';
import * as secoes from './secoes.js';

const raiz = document.getElementById('entrega');
document.documentElement.classList.add('js');

iniciar().catch((erro) => {
    console.error(erro);
    raiz.replaceChildren(h('div', { class: 'falhou' },
        h('p', { class: 'rotulo', text: 'Algo não carregou' }),
        h('p', { text: 'Não conseguimos abrir as fotos agora. Atualize a página em alguns instantes.' })));
    raiz.removeAttribute('aria-busy');
});

async function iniciar() {
    const ev = await carregarEvento(raiz.dataset.evento || 'evento.json', raiz.dataset.modo);
    aplicarTema(ev);
    document.title = ev.titulo + (ev.modo === 'convidados' ? ' · Fotos' : '') + ' · ' + ev.fotografo.marca;

    const ctx = {
        favoritas: ev.selecao.ativa ? criarFavoritas(ev.slug) : null,
        trilha: ev.trilha ? criarTrilha(ev.trilha) : null,
        abrirFoto: (id) => visor.abrir(id)
    };
    ctx.enviarSelecao = () => enviarSelecao(ev, ctx);
    const visor = criarVisor(ev, ctx);

    // ---- a página, na ordem da história ----
    const historia = h('main', { class: 'historia', id: 'historia', tabindex: '-1' },
        ev.mostrarCarta && secoes.carta(ev),
        ev.capitulos.map((c) => secoes.capitulo(c, ctx)));
    const vistaFav = ctx.favoritas ? criarVistaFavoritas(ev, ctx, visor) : null;

    raiz.replaceChildren(
        h('a', { class: 'pular', href: '#historia', text: 'Pular para as fotos' }),
        indice(ev, ctx),
        secoes.capa(ev, ctx),
        historia,
        vistaFav && vistaFav.el,
        secoes.levar(ev, ctx),
        secoes.rodape(ev));
    if (ctx.trilha) document.body.append(ctx.trilha.tocador);
    if (ctx.favoritas) {
        document.body.append(barraFavoritas(ev, ctx, vistaFav));
        ctx.favoritas.aoMudar(() => marcarCoracoes(ctx));
    }
    raiz.removeAttribute('aria-busy');

    revelarAoRolar();
    acompanharCapitulos();

    // link direto para uma foto: .../#foto=sim-03
    const m = location.hash.match(/^#foto=(.+)$/);
    if (m) {
        let id;
        try { id = decodeURIComponent(m[1]); } catch (e) { id = ''; }
        if (ev.porId.has(id)) requestAnimationFrame(() => visor.abrir(id));
    }
}

/* Cores do evento: o JSON pode trocar qualquer token (papel, tinta, destaque…) */
function aplicarTema(ev) {
    const el = document.documentElement;
    el.dataset.tema = ev.tema.modo === 'escuro' ? 'escuro' : 'claro';
    el.dataset.modo = ev.modo;
    Object.entries(ev.tema.cores || {}).forEach(([k, v]) => el.style.setProperty('--' + k, v));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(el).getPropertyValue('--papel').trim() || meta.content;
}

/* ---------- Índice: aparece depois da capa, marca o capítulo atual ---------- */
function indice(ev, ctx) {
    const links = ev.capitulos.map((c) => h('a', { href: '#cap-' + c.id, 'aria-label': 'Capítulo ' + c.numero + ': ' + c.titulo, data: { alvo: c.id, rotulo: c.numero + ' · ' + c.titulo } },
        h('span', { class: 'indice-num', text: c.numero }), h('span', { class: 'indice-nome', text: c.titulo })));
    return h('nav', { class: 'indice', 'aria-label': 'Capítulos' },
        h('a', { class: 'indice-marca', href: '#', 'aria-label': ev.titulo + ', voltar ao início', text: ev.monograma }),
        h('div', { class: 'indice-links' }, links),
        h('p', { class: 'indice-atual', 'aria-hidden': 'true' }),
        ctx.trilha ? ctx.trilha.gatilho('gatilho-indice') : h('span'));
}

function acompanharCapitulos() {
    const nav = document.querySelector('.indice');
    const capa = document.querySelector('.capa');
    const atual = nav.querySelector('.indice-atual');
    const links = [...nav.querySelectorAll('[data-alvo]')];
    if (!('IntersectionObserver' in window)) { nav.classList.add('visivel'); return; }

    new IntersectionObserver(([en]) => {
        const passou = !en.isIntersecting;
        nav.classList.toggle('visivel', passou);
        document.documentElement.classList.toggle('passou-capa', passou);
    }, { threshold: 0, rootMargin: '-60px 0px 0px 0px' }).observe(capa);

    const vigia = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => {
            if (!en.isIntersecting) return;
            const id = en.target.dataset.capitulo;
            links.forEach((a) => {
                const sim = a.dataset.alvo === id;
                if (sim) { a.setAttribute('aria-current', 'true'); atual.textContent = a.dataset.rotulo; }
                else a.removeAttribute('aria-current');
            });
            nav.classList.toggle('sobre-escuro', en.target.classList.contains('tom-escuro'));
        });
    }, { rootMargin: '-50% 0px -50% 0px' });
    document.querySelectorAll('.capitulo').forEach((c) => vigia.observe(c));
    // fora dos capítulos (carta, rodapé), o índice volta ao tom normal
    const fora = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => { if (en.isIntersecting) { nav.classList.remove('sobre-escuro'); links.forEach((a) => a.removeAttribute('aria-current')); atual.textContent = ''; } });
    }, { rootMargin: '-50% 0px -50% 0px' });
    document.querySelectorAll('.carta, .levar, .rodape').forEach((s) => fora.observe(s));
}

/* ---------- Aparecer ao rolar ---------- */
let vigiaRevela;
function revelarAoRolar(dentro) {
    const els = (dentro || document).querySelectorAll('[data-revela]:not(.visivel)');
    if (!('IntersectionObserver' in window) || poucoMovimento()) { els.forEach((el) => el.classList.add('visivel')); return; }
    vigiaRevela = vigiaRevela || new IntersectionObserver((entradas) => {
        entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visivel'); vigiaRevela.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => vigiaRevela.observe(el));
}

/* ---------- Corações: todos os da página acompanham a lista ---------- */
function marcarCoracoes(ctx) {
    document.querySelectorAll('[data-fav]').forEach((b) => {
        const on = ctx.favoritas.tem(b.dataset.fav);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.closest('.foto').classList.toggle('favorita', on);
    });
}

/* ---------- Só as favoritas: uma vista à parte, na ordem da história ---------- */
function criarVistaFavoritas(ev, ctx, visor) {
    const grade = h('div', { class: 'grade-favoritas' });
    const conta = h('p', { class: 'vista-conta' });
    const vazia = h('p', { class: 'vista-vazia', text: 'Nenhuma favorita ainda. Abra uma foto e toque no coração.' });
    const el = h('section', { class: 'vista-favoritas', id: 'favoritas', 'aria-labelledby': 'favoritas-titulo', hidden: true, tabindex: '-1' },
        h('header', { class: 'vista-cabeca' },
            h('p', { class: 'rotulo', text: 'Seleção para o álbum' }),
            h('h2', { class: 'vista-titulo', id: 'favoritas-titulo', text: 'Suas favoritas' }),
            conta,
            h('div', { class: 'vista-acoes' },
                h('button', { class: 'botao', type: 'button', onclick: () => ctx.enviarSelecao() }, icone('enviar'), h('span', { text: 'Enviar para o ' + ev.fotografo.nome.split(' ')[0] })),
                h('button', { class: 'botao botao-claro', type: 'button', onclick: async () => {
                    const fotos = favoritasEmOrdem(ev, ctx);
                    avisar((await copiar(mensagemSelecao(ev, fotos))) ? 'Lista copiada' : 'Não deu para copiar');
                } }, icone('copiar'), h('span', { text: 'Copiar lista' })),
                h('button', { class: 'botao-linha', type: 'button', onclick: () => api.mostrar(false) }, h('span', { text: 'Voltar para a história' })))),
        vazia, grade);

    const api = {
        el,
        ativa: false,
        mostrar(sim) {
            api.ativa = sim;
            document.documentElement.classList.toggle('vendo-favoritas', sim);
            document.getElementById('historia').hidden = sim;
            el.hidden = !sim;
            const fotos = favoritasEmOrdem(ev, ctx);
            if (sim) {
                grade.replaceChildren(...fotos.map((f) => {
                    const fig = figuraFoto(f, ctx, { sizes: '(max-width: 720px) 50vw, 30vw' });
                    fig.style.setProperty('--r', f.proporcao.toFixed(4));
                    fig.classList.add('favorita');
                    return fig;
                }));
                atualizaConta();
                el.scrollIntoView({ behavior: 'auto', block: 'start' });
                el.focus({ preventScroll: true });
            } else {
                document.getElementById('historia').scrollIntoView({ behavior: 'auto', block: 'start' });
            }
            visor.usarLista(sim ? fotos : []);
            document.dispatchEvent(new CustomEvent('entrega:vista', { detail: { favoritas: sim } }));
        }
    };
    function atualizaConta() {
        const t = ctx.favoritas.total();
        conta.textContent = t + (t === 1 ? ' foto' : ' fotos') + (ev.selecao.limite ? ' de até ' + ev.selecao.limite : '');
        vazia.hidden = t > 0;
    }
    // desmarcar aqui não some com a foto na hora (o visor está passando por elas); só apaga
    ctx.favoritas.aoMudar(() => { if (api.ativa) atualizaConta(); });
    return api;
}

function favoritasEmOrdem(ev, ctx) { return ev.fotos.filter((f) => ctx.favoritas.tem(f.id)); }

/* ---------- Barra flutuante: quantas favoritas, ver só elas e enviar ---------- */
function barraFavoritas(ev, ctx, vista) {
    const num = h('span', { class: 'barra-num' });
    const limite = ev.selecao.limite;
    const ver = h('button', { class: 'barra-btn', type: 'button', 'aria-label': 'Ver favoritas', onclick: () => vista.mostrar(!vista.ativa) }, icone('grade'), h('span', { class: 'barra-ver', text: 'Ver favoritas' }));
    const enviar = h('button', { class: 'barra-btn barra-enviar', type: 'button', onclick: () => ctx.enviarSelecao() }, icone('enviar'), h('span', { text: 'Enviar seleção' }));
    const barra = h('div', { class: 'barra', role: 'region', 'aria-label': 'Favoritas' },
        h('span', { class: 'barra-conta' }, icone('coracao'), num),
        ver, enviar);

    const atualiza = () => {
        const t = ctx.favoritas.total();
        num.textContent = t + (limite ? ' / ' + limite : '');
        num.setAttribute('aria-label', t + (t === 1 ? ' favorita' : ' favoritas') + (limite ? ' de ' + limite : ''));
        barra.classList.toggle('passou-limite', !!limite && t > limite);
        barra.classList.toggle('visivel', t > 0 || vista.ativa);
    };
    ctx.favoritas.aoMudar(atualiza);
    document.addEventListener('entrega:vista', (e) => {
        const t = e.detail.favoritas ? 'Ver a história' : 'Ver favoritas';
        ver.querySelector('.barra-ver').textContent = t;
        ver.setAttribute('aria-label', t);
        atualiza();
    });
    atualiza();
    return barra;
}

function enviarSelecao(ev, ctx) {
    const fotos = favoritasEmOrdem(ev, ctx);
    if (!fotos.length) { avisar('Marque pelo menos uma foto com o coração.'); return; }
    if (ev.selecao.limite && fotos.length > ev.selecao.limite) {
        avisar('Passou de ' + ev.selecao.limite + ' fotos. Pode mandar assim: a gente ajusta junto.');
    }
    abrirWhatsApp(ev.fotografo.whatsapp, mensagemSelecao(ev, fotos));
}
