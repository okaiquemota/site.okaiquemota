/* Entrega · visor (a foto em tela cheia)
   <dialog> modal: o navegador já prende o foco dentro dele e fecha no Esc.
   Setas e arrastar trocam de foto; F favorita; B baixa; S faz o stories.
   O endereço ganha #foto=id, então dá pra mandar o link de uma foto só. */
import { h, icone, avisar, poucoMovimento } from './dom.js';
import { gerarStories } from './stories.js';

export function criarVisor(evento, ctx) {
    let lista = evento.fotos;
    let atual = 0;
    let pedido = 0;
    let quemAbriu = null;

    const img = h('img', { class: 'visor-img', alt: '', draggable: false });
    const capitulo = h('p', { class: 'visor-capitulo' });
    const conta = h('p', { class: 'visor-conta' });
    const vivo = h('p', { class: 'visualmente-escondido', 'aria-live': 'polite' });

    const btnFechar = h('button', { class: 'visor-btn visor-fechar', type: 'button', 'aria-label': 'Fechar', onclick: () => fechar() }, icone('fechar'));
    const btnAnt = h('button', { class: 'visor-btn visor-ant', type: 'button', 'aria-label': 'Foto anterior', onclick: () => ir(-1) }, icone('esq'));
    const btnProx = h('button', { class: 'visor-btn visor-prox', type: 'button', 'aria-label': 'Próxima foto', onclick: () => ir(1) }, icone('dir'));

    const btnFav = ctx.favoritas && h('button', { class: 'visor-acao visor-fav', type: 'button', 'aria-pressed': 'false', 'aria-keyshortcuts': 'F', onclick: () => favoritar() },
        icone('coracao'), h('span', { class: 'visor-acao-texto', text: 'Favoritar' }));
    const btnBaixar = h('a', { class: 'visor-acao', download: '', 'aria-keyshortcuts': 'B' },
        icone('baixar'), h('span', { class: 'visor-acao-texto', text: 'Baixar' }));
    const btnStories = h('button', { class: 'visor-acao', type: 'button', 'aria-keyshortcuts': 'S', onclick: () => stories() },
        icone('stories'), h('span', { class: 'visor-acao-texto', text: 'Stories' }));

    const palco = h('div', { class: 'visor-palco' }, img);
    const dialogo = h('dialog', { class: 'visor', 'aria-label': 'Foto ampliada' },
        h('div', { class: 'visor-topo' }, h('div', { class: 'visor-info' }, capitulo, conta), btnFechar),
        palco, btnAnt, btnProx,
        h('div', { class: 'visor-acoes' }, btnFav, btnBaixar, btnStories),
        vivo);
    document.body.append(dialogo);

    function mostra(k) {
        atual = (k + lista.length) % lista.length;
        const f = lista[atual];
        const este = ++pedido;
        img.classList.add('trocando');
        // primeiro a versão leve (já está no cache da página), depois a grande
        const leve = new Image();
        leve.src = f.mini;
        const entra = (src) => {
            if (este !== pedido) return;
            img.src = src;
            img.alt = f.alt;
            img.width = f.largura;
            img.height = f.altura;
            requestAnimationFrame(() => img.classList.remove('trocando'));
        };
        (leve.complete ? Promise.resolve() : new Promise((ok) => { leve.onload = leve.onerror = ok; })).then(() => {
            entra(f.mini);
            const grande = new Image();
            grande.onload = () => { if (este === pedido) img.src = f.src; };
            grande.src = f.src;
        });

        capitulo.textContent = f.capitulo ? f.capitulo.numero + ' · ' + f.capitulo.titulo : '';
        conta.textContent = (atual + 1) + ' / ' + lista.length;
        vivo.textContent = 'Foto ' + (atual + 1) + ' de ' + lista.length + (f.alt ? ': ' + f.alt : '');
        btnBaixar.href = f.original;
        btnBaixar.setAttribute('download', f.nomeArquivo);
        btnBaixar.setAttribute('aria-label', 'Baixar em alta resolução');
        if (btnFav) marcaFav();
        const sozinha = lista.length < 2;
        btnAnt.hidden = btnProx.hidden = sozinha;
        history.replaceState(null, '', '#foto=' + encodeURIComponent(f.id));
        // a próxima e a anterior já vão carregando
        [1, -1].forEach((d) => { new Image().src = lista[(atual + d + lista.length) % lista.length].src; });
    }

    function ir(d) { if (lista.length > 1) mostra(atual + d); }

    function marcaFav() {
        const on = ctx.favoritas.tem(lista[atual].id);
        btnFav.setAttribute('aria-pressed', on ? 'true' : 'false');
        btnFav.querySelector('.visor-acao-texto').textContent = on ? 'Favorita' : 'Favoritar';
    }
    function favoritar() {
        const on = ctx.favoritas.alternar(lista[atual].id);
        avisar(on ? 'Adicionada às favoritas' : 'Tirada das favoritas');
    }
    if (ctx.favoritas) ctx.favoritas.aoMudar(() => { if (dialogo.open) marcaFav(); });

    let gerando = false;
    async function stories() {
        if (gerando) return;
        gerando = true;
        btnStories.classList.add('ocupado');
        avisar('Preparando a imagem para os stories…');
        try {
            const r = await gerarStories(lista[atual], evento);
            if (r === 'baixado') avisar('Imagem 9:16 baixada. É só postar nos stories.');
            else if (r === 'compartilhado') avisar('Pronto!');
        } catch (e) {
            avisar('Não deu para gerar a imagem agora. Tente de novo.');
        } finally {
            gerando = false;
            btnStories.classList.remove('ocupado');
        }
    }

    function abrir(id, origem) {
        const k = lista.findIndex((f) => f.id === id);
        if (k < 0) return;
        quemAbriu = origem || document.activeElement;
        mostra(k);
        if (!dialogo.open) dialogo.showModal();
        document.documentElement.classList.add('visor-aberto');
    }
    function fechar() { dialogo.close(); }

    dialogo.addEventListener('close', () => {
        document.documentElement.classList.remove('visor-aberto');
        history.replaceState(null, '', location.pathname + location.search);
        // volta o foco (e a página) para a foto que estava aberta
        const fig = document.querySelector('.foto[data-id="' + CSS.escape(lista[atual].id) + '"] .foto-abrir');
        const alvo = fig || quemAbriu;
        if (alvo && alvo.focus) {
            alvo.focus({ preventScroll: true });
            if (fig) fig.scrollIntoView({ block: 'nearest', behavior: poucoMovimento() ? 'auto' : 'smooth' });
        }
    });

    dialogo.addEventListener('keydown', (ev) => {
        if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
        const k = ev.key.toLowerCase();
        if (k === 'arrowleft') { ev.preventDefault(); ir(-1); }
        else if (k === 'arrowright') { ev.preventDefault(); ir(1); }
        else if (k === 'f' && btnFav) favoritar();
        else if (k === 'b') btnBaixar.click();
        else if (k === 's') stories();
    });

    // arrastar para os lados troca; para baixo fecha
    let x0 = null, y0 = 0, arrastou = false;
    palco.addEventListener('pointerdown', (ev) => { x0 = ev.clientX; y0 = ev.clientY; arrastou = false; });
    palco.addEventListener('pointermove', (ev) => {
        if (x0 === null || ev.pointerType === 'mouse') return;
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        img.style.transform = Math.abs(dx) > Math.abs(dy) ? 'translateX(' + dx * 0.4 + 'px)' : 'translateY(' + Math.max(0, dy) * 0.4 + 'px)';
    });
    const solta = (ev) => {
        if (x0 === null) return;
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        x0 = null;
        img.style.transform = '';
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { arrastou = true; ir(dx < 0 ? 1 : -1); }
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { arrastou = true; fechar(); }
    };
    palco.addEventListener('pointerup', solta);
    palco.addEventListener('pointercancel', () => { x0 = null; img.style.transform = ''; });
    // clicar no escuro em volta da foto fecha
    palco.addEventListener('click', (ev) => {
        if (!arrastou && ev.target === palco) fechar();
        arrastou = false;
    });

    return {
        abrir,
        /** em "só favoritas", o visor passa só por elas */
        usarLista(fotos) { lista = fotos.length ? fotos : evento.fotos; }
    };
}
