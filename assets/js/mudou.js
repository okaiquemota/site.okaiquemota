/* Kaique Mota: endereço que mudou de lugar.
   As páginas antigas (as de /fotografia) dizem no <html data-para="..."> para onde foram;
   aqui a visita segue pra lá levando junto o "#casamento", "#pacotes", "#foto=..." do link.
   Sem JavaScript, o <meta http-equiv="refresh"> de cada página faz o mesmo (só sem o #). */
(function () {
    'use strict';
    var para = document.documentElement.getAttribute('data-para');
    if (para) location.replace(para + location.search + location.hash);
})();
