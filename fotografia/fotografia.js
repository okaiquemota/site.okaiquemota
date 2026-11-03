/* Kaique Mota · Fotografia
   Abas dos pacotes, foto grande, formulário e o aparecer ao rolar.
   Sem este arquivo a página continua inteira: os pacotes ficam um embaixo
   do outro e o WhatsApp do rodapé continua lá. */
(function () {
    'use strict';

    document.documentElement.classList.add('js');
    var poucoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    document.querySelectorAll('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

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

    // ---------- Aparecer ao rolar ----------
    var revelaveis = document.querySelectorAll('[data-revela]');
    if ('IntersectionObserver' in window && !poucoMovimento.matches) {
        var vigia = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('visivel'); vigia.unobserve(en.target); }
            });
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
        revelaveis.forEach(function (el) { vigia.observe(el); });
    } else {
        revelaveis.forEach(function (el) { el.classList.add('visivel'); });
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
    var quadros = Array.prototype.slice.call(document.querySelectorAll('.quadro'));
    var visor = document.getElementById('visor');
    if (quadros.length && visor && typeof visor.showModal === 'function') {
        var foto = document.getElementById('visor-foto');
        var conta = document.getElementById('visor-conta');
        var atual = 0;
        var pedido = 0;
        var quemAbriu = null;

        var mostra = function (k) {
            atual = (k + quadros.length) % quadros.length;
            var q = quadros[atual];
            var miniatura = q.querySelector('img');
            var este = ++pedido;
            foto.classList.add('trocando');
            var nova = new Image();
            nova.onload = nova.onerror = function () {
                // passando rápido, uma foto que demorou não entra no lugar da que está no contador
                if (este !== pedido) return;
                foto.src = nova.src;
                foto.alt = miniatura.alt;
                requestAnimationFrame(function () { foto.classList.remove('trocando'); });
            };
            nova.src = q.dataset.grande;
            conta.textContent = (atual + 1) + ' de ' + quadros.length;
            new Image().src = quadros[(atual + 1) % quadros.length].dataset.grande;
        };

        quadros.forEach(function (q, k) {
            q.addEventListener('click', function () { quemAbriu = q; mostra(k); visor.showModal(); });
        });
        visor.addEventListener('close', function () { if (quemAbriu) quemAbriu.focus(); });
        document.getElementById('visor-fechar').addEventListener('click', function () { visor.close(); });
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
            if (!arrastou && ev.target === visor) visor.close();
            arrastou = false;
        });
    }
})();
