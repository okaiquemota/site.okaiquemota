/* Kaique Mota: ano do rodapé e altura da página */
(function () {
    'use strict';

    document.querySelectorAll('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // A página ocupa só a altura que aparece de verdade: no Safari com a barra flutuando
    // e no navegador do Instagram, 100svh pode ser maior que a área visível e sobrava rolagem.
    var raiz = document.documentElement;
    var regua = document.createElement('div');
    regua.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(regua);
    function mede() {
        var tela = regua.offsetHeight || window.innerHeight;
        var visivel = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        var alto = Math.min(tela, visivel, window.innerHeight);
        if (alto > 0) raiz.style.setProperty('--alto', Math.floor(alto) + 'px');
    }
    mede();
    window.addEventListener('resize', mede);
    window.addEventListener('orientationchange', function () { setTimeout(mede, 300); });
})();
