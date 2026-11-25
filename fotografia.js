/* Kaique Mota · Fotografia
   Abas dos pacotes, o filme dos trabalhos, foto grande, formulário e o aparecer ao rolar.
   Sem este arquivo a página continua inteira: os pacotes ficam um embaixo
   do outro e o WhatsApp do rodapé continua lá. */
(function () {
    'use strict';

    document.documentElement.classList.add('js');
    var poucoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    document.querySelectorAll('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // A idade do "Sobre" muda sozinha no aniversário (data no data-nascimento, AAAA-MM-DD).
    // Sem JavaScript fica o número escrito no HTML.
    document.querySelectorAll('[data-nascimento]').forEach(function (el) {
        var p = el.getAttribute('data-nascimento').split('-').map(Number);
        var hoje = new Date();
        var idade = hoje.getFullYear() - p[0];
        if (hoje.getMonth() + 1 < p[1] || (hoje.getMonth() + 1 === p[1] && hoje.getDate() < p[2])) idade--;
        if (idade > 0 && idade < 130) el.textContent = idade;
    });

    // ---------- Topo: ganha uma linha ao rolar; o link acompanha a seção ----------
    var topo = document.querySelector('.topo');
    function aoRolar() { topo.classList.toggle('rolou', window.scrollY > 8); }
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();

    var links = Array.prototype.slice.call(document.querySelectorAll('.menu a'));
    if ('IntersectionObserver' in window) {
        var secoes = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
        var vigiaSecao = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (en) {
                var k = secoes.indexOf(en.target);
                if (en.isIntersecting) links[k].setAttribute('aria-current', 'true');
                else links[k].removeAttribute('aria-current');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        secoes.forEach(function (s) { if (s) vigiaSecao.observe(s); });
    }

    // ---------- Fotos: aparecem suaves quando terminam de carregar (não "pipocam") ----------
    document.querySelectorAll('.quadro img, .capa-quadro img').forEach(function (img) {
        if (img.complete && img.naturalWidth) return;
        img.classList.add('carregando');
        function pronto() { img.classList.remove('carregando'); }
        img.addEventListener('load', pronto, { once: true });
        img.addEventListener('error', pronto, { once: true });
    });

    // ---------- A assinatura que se escreve ----------
    // Cada assinatura tem um filtro que só mostra a tinta cujo momento já chegou (veja o README):
    // quanto maior o "intercept" do <feFuncA>, mais tinta aparece (de 0, nada, até 300, tudo).
    // Quem anda com ele é este trecho, a cada quadro: a da capa começa 0,7s depois da foto, junto
    // com ela; a do "Sobre" quando aparece na tela. O <animate> do HTML fica só pra quem está sem
    // JavaScript (ele espera a página carregar inteira). Com "menos movimento", já ficam prontas.
    var TINTA_TODA = 300, ESCRITA_MS = 2448;
    var vaiRevelar = 'IntersectionObserver' in window && !poucoMovimento.matches;
    function escreve(fn, inicio) {
        function quadro(agora) {
            var p = Math.max(0, Math.min(1, (agora - inicio) / ESCRITA_MS));
            fn.setAttribute('intercept', (p * TINTA_TODA).toFixed(2));
            if (p < 1) requestAnimationFrame(quadro);
        }
        requestAnimationFrame(quadro);
    }
    document.querySelectorAll('.assinatura feFuncA').forEach(function (fn) {
        var anim = fn.querySelector('animate');
        if (anim) anim.parentNode.removeChild(anim);
        var assinatura = fn.closest('.assinatura');
        if (poucoMovimento.matches) { fn.setAttribute('intercept', TINTA_TODA); return; }
        if (assinatura.hasAttribute('data-revela')) {
            // a do "Sobre": escondida até aparecer na tela (sem o IntersectionObserver, fica pronta)
            if (vaiRevelar) { fn.setAttribute('intercept', '0'); assinatura.escrever = function () { escreve(fn, performance.now() + 200); }; }
            else fn.setAttribute('intercept', TINTA_TODA);
            return;
        }
        // a da capa: no mesmo relógio da foto, que se revela pela animação "revela-foto" do CSS
        fn.setAttribute('intercept', '0');
        var foto = document.querySelector('.capa-quadro img');
        var revela = foto && foto.getAnimations ? foto.getAnimations().filter(function (a) { return a.animationName === 'revela-foto'; })[0] : null;
        if (revela && revela.ready) revela.ready.then(function () { escreve(fn, (revela.startTime || performance.now()) + 700); });
        else escreve(fn, performance.now() + 700);
    });

    // ---------- Aparecer ao rolar ----------
    var revelaveis = document.querySelectorAll('[data-revela]');
    if (vaiRevelar) {
        var vigia = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('visivel'); if (en.target.escrever) en.target.escrever(); vigia.unobserve(en.target); }
            });
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
        revelaveis.forEach(function (el) { vigia.observe(el); });
    } else {
        revelaveis.forEach(function (el) { el.classList.add('visivel'); });
    }

    // ---------- Trabalhos: o filme ----------
    // No computador (tela larga e alta, sem "menos movimento"), o palco fica preso na tela e a faixa
    // corre de lado enquanto a página desce. Quem anda é o CSS (animation-timeline); aqui só se mede o
    // percurso. Nos navegadores sem animation-timeline, a faixa anda por aqui mesmo.
    // No resto, a faixa se arrasta com o dedo e a linha da legenda acompanha.
    var temLinhaDoTempo = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    var telaDeFilme = window.matchMedia('(min-width: 700px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)');
    var limita = function (v) { return Math.min(1, Math.max(0, v)); };
    var filmes = Array.prototype.map.call(document.querySelectorAll('.filme'), function (el) {
        return { el: el, palco: el.querySelector('.filme-palco'), faixa: el.querySelector('.faixa'), barra: el.querySelector('.filme-progresso'), percurso: 0, visto: 0 };
    });
    var preso = function (f) { return f.el.classList.contains('preso'); };
    var topoDoPalco = function (f) { return parseFloat(getComputedStyle(f.palco).top) || 0; };

    function andaFilme(f) {
        if (preso(f)) {
            if (temLinhaDoTempo) return;
            var p = f.percurso ? limita((topoDoPalco(f) - f.el.getBoundingClientRect().top) / f.percurso) : 0;
            f.faixa.style.transform = 'translateX(' + (-p * f.percurso).toFixed(1) + 'px)';
            f.barra.style.transform = 'scaleX(' + (f.visto + p * (1 - f.visto)).toFixed(4) + ')';
        } else {
            var total = f.faixa.scrollWidth;
            f.barra.style.transform = 'scaleX(' + (total ? limita((f.faixa.scrollLeft + f.faixa.clientWidth) / total) : 1).toFixed(4) + ')';
        }
    }
    function medeFilme(f) {
        f.el.classList.toggle('preso', telaDeFilme.matches);
        f.faixa.style.transform = '';
        f.barra.style.transform = '';
        if (preso(f)) {
            var largura = f.faixa.offsetWidth;
            f.percurso = Math.max(0, largura - f.palco.clientWidth);
            f.visto = largura ? limita(f.palco.clientWidth / largura) : 1;
            f.el.style.setProperty('--percurso', f.percurso + 'px');
            f.el.style.setProperty('--visto', f.visto.toFixed(4));
        } else {
            f.percurso = 0;
            f.el.style.removeProperty('--percurso');
            f.el.style.removeProperty('--visto');
        }
        andaFilme(f);
    }
    // leva a página (ou a faixa) até a foto, se ela não estiver à vista
    function estaAVista(q) {
        var r = q.getBoundingClientRect();
        return r.left >= -2 && r.right <= document.documentElement.clientWidth + 2 && r.bottom > 0 && r.top < window.innerHeight;
    }
    function levaAte(q, jeito) {
        var f = null;
        filmes.forEach(function (g) { if (g.faixa.contains(q)) f = g; });
        if (!f || estaAVista(q)) return;
        if (preso(f)) {
            var x = Math.min(f.percurso, Math.max(0, q.offsetLeft + q.offsetWidth / 2 - f.palco.clientWidth / 2));
            var inicio = f.el.getBoundingClientRect().top + window.scrollY - topoDoPalco(f);
            window.scrollTo({ top: inicio + x, behavior: jeito });
        } else {
            q.scrollIntoView({ block: 'nearest', inline: 'center', behavior: jeito });
        }
    }
    if (filmes.length) {
        var pedidoDoFilme = 0;
        var aoRolarFilme = function () {
            if (pedidoDoFilme) return;
            pedidoDoFilme = requestAnimationFrame(function () { pedidoDoFilme = 0; filmes.forEach(andaFilme); });
        };
        filmes.forEach(function (f) {
            f.faixa.addEventListener('scroll', function () { andaFilme(f); }, { passive: true });
            // com o teclado (Tab), a página anda até a foto que ganhou o foco
            f.faixa.addEventListener('focusin', function (ev) {
                var q = ev.target.closest('.quadro');
                if (q && preso(f)) levaAte(q, poucoMovimento.matches ? 'instant' : 'smooth');
            });
            medeFilme(f);
            if ('ResizeObserver' in window) new ResizeObserver(function () { medeFilme(f); }).observe(f.palco);
        });
        window.addEventListener('scroll', aoRolarFilme, { passive: true });
        window.addEventListener('resize', function () { filmes.forEach(medeFilme); });
        var mudouTela = function () { filmes.forEach(medeFilme); };
        if (telaDeFilme.addEventListener) telaDeFilme.addEventListener('change', mudouTela);
        else if (telaDeFilme.addListener) telaDeFilme.addListener(mudouTela);
    }

    // ---------- Pacotes em abas ----------
    var paineis = Array.prototype.slice.call(document.querySelectorAll('.painel'));
    var lista = document.querySelector('.abas');
    var abas = [];
    function escolhe(k, marcaEndereco) {
        abas.forEach(function (b, j) {
            var sel = j === k;
            b.setAttribute('aria-selected', sel ? 'true' : 'false');
            b.tabIndex = sel ? 0 : -1;
            paineis[j].hidden = !sel;
        });
        var b = abas[k];
        if (lista.scrollWidth > lista.clientWidth) {
            lista.scrollTo({ left: b.offsetLeft - lista.offsetLeft - (lista.clientWidth - b.offsetWidth) / 2, behavior: poucoMovimento.matches ? 'auto' : 'smooth' });
        }
        if (marcaEndereco) history.replaceState(null, '', '#' + paineis[k].id);
    }
    function peloEndereco() {
        // um endereço quebrado (#%E0, por exemplo) não pode derrubar o resto do script
        var id;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch (erro) { return false; }
        for (var j = 0; j < paineis.length; j++) {
            if (paineis[j].id === id) {
                escolhe(j, false);
                document.getElementById('pacotes').scrollIntoView();
                return true;
            }
        }
        return false;
    }
    if (paineis.length && lista) {
        paineis.forEach(function (p, k) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'aba';
            b.id = 'aba-' + p.id;
            b.textContent = p.dataset.aba;
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-controls', p.id);
            b.addEventListener('click', function () { escolhe(k, true); });
            b.addEventListener('keydown', function (ev) {
                var alvo = null;
                if (ev.key === 'ArrowRight') alvo = (k + 1) % paineis.length;
                else if (ev.key === 'ArrowLeft') alvo = (k - 1 + paineis.length) % paineis.length;
                else if (ev.key === 'Home') alvo = 0;
                else if (ev.key === 'End') alvo = paineis.length - 1;
                if (alvo === null) return;
                ev.preventDefault();
                escolhe(alvo, true);
                abas[alvo].focus();
            });
            lista.appendChild(b);
            abas.push(b);
            p.setAttribute('role', 'tabpanel');
            p.setAttribute('aria-labelledby', b.id);
            p.tabIndex = 0;
        });
        lista.setAttribute('role', 'tablist');
        lista.hidden = false;
        if (!peloEndereco()) escolhe(0, false);
        window.addEventListener('hashchange', peloEndereco);
    }

    // ---------- Formulário: vira uma mensagem pronta no WhatsApp ----------
    var form = document.getElementById('consulta');
    if (form) {
        // sem este script o formulário fica escondido e aparece o link direto do WhatsApp:
        // assim o nome e o local nunca vão parar no endereço da página
        form.hidden = false;
        var semJs = document.getElementById('consulta-sem-js');
        if (semJs) semJs.hidden = true;
        var campo = form.elements;
        var erroNome = document.getElementById('erro-nome');
        var aviso = document.getElementById('aviso-form');
        var hoje = new Date();
        campo.data.min = [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-');

        // "Quero este" num pacote já escolhe o tipo e guarda o pacote
        document.querySelectorAll('[data-pacote]').forEach(function (a) {
            a.addEventListener('click', function () {
                campo.tipo.value = a.dataset.tipo;
                campo.pacote.value = a.dataset.pacote;
                aviso.textContent = 'Pacote escolhido: ' + a.dataset.pacote + '.';
                setTimeout(function () { campo.nome.focus({ preventScroll: true }); }, 0);
            });
        });
        campo.tipo.addEventListener('change', function () { campo.pacote.value = ''; aviso.textContent = ''; });
        campo.nome.addEventListener('input', function () {
            if (campo.nome.value.trim()) { campo.nome.removeAttribute('aria-invalid'); erroNome.hidden = true; }
        });

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var v = function (n) { return (campo[n].value || '').trim(); };
            if (!v('nome')) {
                campo.nome.setAttribute('aria-invalid', 'true');
                erroNome.hidden = false;
                campo.nome.focus();
                return;
            }
            var data = v('data');
            if (data) { var p = data.split('-'); data = p[2] + '/' + p[1] + '/' + p[0]; }
            var linhas = [
                'Oi, Kaique! Vim pelo site.', '',
                'Nome: ' + v('nome'),
                'Tipo de foto: ' + v('tipo') + (v('pacote') ? ' (' + v('pacote') + ')' : ''),
                'Data: ' + (data || 'ainda não sei'),
                'Local: ' + (v('local') || 'a combinar')
            ];
            var url = 'https://wa.me/' + form.dataset.whats + '?text=' + encodeURIComponent(linhas.join('\n'));
            aviso.textContent = 'Abrindo o WhatsApp…';
            var janela = window.open(url, '_blank');
            if (janela) janela.opener = null;
            else location.href = url;
        });
    }

    // ---------- Foto grande: setas, teclado e arrastar no celular ----------
    // Abrindo e fechando, a foto sai da faixa e cresce até a tela cheia (View Transitions).
    // Sem esse recurso (ou com "menos movimento"), o visor só aparece, como antes.
    var quadros = Array.prototype.slice.call(document.querySelectorAll('.quadro'));
    var visor = document.getElementById('visor');
    if (quadros.length && visor && typeof visor.showModal === 'function') {
        var foto = document.getElementById('visor-foto');
        var conta = document.getElementById('visor-conta');
        var atual = 0;
        var pedido = 0;
        var podeMorfar = function () { return typeof document.startViewTransition === 'function' && !poucoMovimento.matches; };
        var semErro = function () {};

        // a versão grande entra no lugar quando termina de carregar
        var carregaGrande = function (q, este) {
            var nova = new Image();
            nova.onload = nova.onerror = function () {
                // passando rápido, uma foto que demorou não entra no lugar da que está no contador
                if (este !== pedido) return;
                foto.src = nova.src;
                requestAnimationFrame(function () { foto.classList.remove('trocando'); });
            };
            nova.src = q.dataset.grande;
        };
        var mostra = function (k, abrindo) {
            atual = (k + quadros.length) % quadros.length;
            var q = quadros[atual];
            var miniatura = q.querySelector('img');
            var este = ++pedido;
            var w = miniatura.getAttribute('width');
            var h = miniatura.getAttribute('height');
            if (w && h) foto.style.setProperty('--proporcao', (w / h).toFixed(4));
            foto.alt = miniatura.alt;
            conta.textContent = (atual + 1) + ' de ' + quadros.length;
            if (abrindo) {
                // abrindo, entra na hora a mesma foto que já está na faixa; a grande vem logo depois
                foto.classList.remove('trocando');
                foto.src = miniatura.currentSrc || miniatura.src;
            } else {
                foto.classList.add('trocando');
            }
            carregaGrande(q, este);
            new Image().src = quadros[(atual + 1) % quadros.length].dataset.grande;
        };

        var abre = function (k) {
            var q = quadros[k];
            if (!podeMorfar()) { mostra(k, true); visor.showModal(); return; }
            visor.classList.add('morfando');
            q.style.viewTransitionName = 'foto-aberta';
            var t = document.startViewTransition(function () {
                q.style.viewTransitionName = '';
                mostra(k, true);
                foto.style.viewTransitionName = 'foto-aberta';
                visor.showModal();
                return foto.decode ? foto.decode().catch(semErro) : null;
            });
            // o "morfando" (sem o fade de abrir do visor) só sai quando o visor fecha:
            // tirando antes, o fade recomeçaria e o fundo piscaria
            t.finished.catch(semErro).then(function () { foto.style.viewTransitionName = ''; });
        };
        var fecha = function () {
            if (!visor.open) return;
            var q = quadros[atual];
            // a foto volta para o lugar dela na faixa: se ela não estiver à vista, a página vai até lá antes
            levaAte(q, 'instant');
            // (uma foto que ainda não apareceu na faixa abre a cortina depois, sem a volta)
            if (!podeMorfar() || !estaAVista(q) || !q.classList.contains('visivel')) { visor.close(); return; }
            foto.style.viewTransitionName = 'foto-aberta';
            var t = document.startViewTransition(function () {
                foto.style.viewTransitionName = '';
                visor.close();
                q.style.viewTransitionName = 'foto-aberta';
            });
            t.finished.catch(semErro).then(function () { q.style.viewTransitionName = ''; });
        };

        quadros.forEach(function (q, k) {
            q.addEventListener('click', function () { abre(k); });
        });
        // fechando, o foco volta para a foto que estava aberta
        visor.addEventListener('close', function () {
            visor.classList.remove('morfando');
            quadros[atual].focus({ preventScroll: true });
        });
        // o Esc também fecha com a foto voltando para o lugar
        visor.addEventListener('cancel', function (ev) {
            if (!ev.cancelable) return;
            ev.preventDefault();
            fecha();
        });
        document.getElementById('visor-fechar').addEventListener('click', fecha);
        document.getElementById('visor-ant').addEventListener('click', function () { mostra(atual - 1); });
        document.getElementById('visor-prox').addEventListener('click', function () { mostra(atual + 1); });
        visor.addEventListener('keydown', function (ev) {
            if (ev.key === 'ArrowLeft') mostra(atual - 1);
            else if (ev.key === 'ArrowRight') mostra(atual + 1);
        });

        var x0 = null;
        var arrastou = false;
        visor.addEventListener('pointerdown', function (ev) { x0 = ev.clientX; arrastou = false; });
        visor.addEventListener('pointerup', function (ev) {
            if (x0 === null) return;
            var dx = ev.clientX - x0;
            x0 = null;
            if (Math.abs(dx) > 50) { arrastou = true; mostra(atual + (dx < 0 ? 1 : -1)); }
        });
        // clicar fora da foto fecha
        visor.addEventListener('click', function (ev) {
            if (!arrastou && ev.target === visor) fecha();
            arrastou = false;
        });
    }
})();
