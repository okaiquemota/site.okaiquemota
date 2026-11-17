/* Entrega · experiência sonora
   Nada toca sozinho: a música só começa quando alguém aperta o botão.
   Entra e sai devagar (fade) e fica num tocador pequeno no canto. */
import { h, icone } from './dom.js';

export function criarTrilha(trilha) {
    const audio = new Audio();
    audio.src = trilha.src;
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;

    const VOLUME = 0.55;
    let fade = 0;
    const gatilhos = new Set();

    function rampa(alvo, ms, depois) {
        cancelAnimationFrame(fade);
        const v0 = audio.volume, t0 = performance.now();
        const passo = (t) => {
            const k = Math.min(1, (t - t0) / ms);
            audio.volume = Math.max(0, Math.min(1, v0 + (alvo - v0) * k));
            if (k < 1) fade = requestAnimationFrame(passo);
            else if (depois) depois();
        };
        fade = requestAnimationFrame(passo);
    }

    const rotulo = h('span', { class: 'tocador-titulo' },
        h('span', { class: 'tocador-nome', text: trilha.titulo || 'Trilha' }),
        trilha.autor && h('span', { class: 'tocador-autor', text: trilha.autor }));
    const ondas = h('span', { class: 'tocador-ondas', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
    const botao = h('button', { class: 'tocador-botao', type: 'button', 'aria-label': 'Pausar a trilha', onclick: () => alternar() }, ondas);
    const tocador = h('div', { class: 'tocador', role: 'region', 'aria-label': 'Trilha sonora', hidden: true }, botao, rotulo);

    function estado() {
        const tocando = !audio.paused;
        tocador.classList.toggle('tocando', tocando);
        botao.setAttribute('aria-label', tocando ? 'Pausar a trilha' : 'Tocar a trilha');
        gatilhos.forEach((b) => {
            b.setAttribute('aria-pressed', tocando ? 'true' : 'false');
            const t = b.querySelector('.gatilho-texto');
            if (t) t.textContent = tocando ? 'Pausar a trilha' : 'Ouvir enquanto vê';
        });
    }
    audio.addEventListener('play', estado);
    audio.addEventListener('pause', estado);

    async function tocar() {
        tocador.hidden = false;
        requestAnimationFrame(() => tocador.classList.add('visivel'));
        try { await audio.play(); rampa(VOLUME, 2200); }
        catch (e) { tocador.hidden = true; }
    }
    function pausar() { rampa(0, 700, () => audio.pause()); }
    function alternar() { if (audio.paused) tocar(); else pausar(); }

    return {
        tocador,
        alternar,
        /** um botão "Ouvir enquanto vê" em qualquer lugar da página */
        gatilho(classe) {
            const b = h('button', { class: 'gatilho-som ' + (classe || ''), type: 'button', 'aria-pressed': 'false', onclick: alternar },
                icone('som'), h('span', { class: 'gatilho-texto', text: 'Ouvir enquanto vê' }));
            gatilhos.add(b);
            return b;
        }
    };
}
