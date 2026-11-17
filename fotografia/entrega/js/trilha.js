/* Entrega · experiência sonora
   Nada toca sozinho: a música só começa quando alguém toca no ícone de som.
   Só ícone, sem texto: parado mostra o alto-falante; tocando, as ondinhas
   se mexem. Entra e sai devagar (fade). */
import { h, icone } from './dom.js';

export function criarTrilha(trilha) {
    const audio = new Audio();
    audio.src = trilha.src;
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;

    const VOLUME = 0.55;
    let fade = 0;
    const botoes = new Set();

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

    function estado() {
        const tocando = !audio.paused;
        botoes.forEach((b) => {
            b.setAttribute('aria-pressed', tocando ? 'true' : 'false');
            b.setAttribute('aria-label', tocando ? 'Pausar a música' : 'Tocar a música');
        });
    }
    audio.addEventListener('play', estado);
    audio.addEventListener('pause', estado);

    async function tocar() {
        try { await audio.play(); rampa(VOLUME, 2200); } catch (e) { /* o navegador recusou: fica parado */ }
    }
    function pausar() { rampa(0, 700, () => audio.pause()); }
    function alternar() { if (audio.paused) tocar(); else pausar(); }

    return {
        alternar,
        /** o ícone de som, em qualquer lugar da página (todos ficam em sincronia) */
        botao(classe) {
            const b = h('button', {
                class: 'som ' + (classe || ''), type: 'button',
                'aria-pressed': 'false', 'aria-label': 'Tocar a música',
                title: trilha.titulo || 'Música', onclick: alternar
            },
                icone('som', 'som-parado'),
                h('span', { class: 'som-ondas', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')));
            botoes.add(b);
            return b;
        }
    };
}
