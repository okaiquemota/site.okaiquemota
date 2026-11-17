/* Entrega · favoritas
   O coração de cada foto. Fica guardado no aparelho (localStorage), por evento.
   Quando o painel tiver a tabela de seleções, é só trocar `guardar`/`ler`
   por chamadas à API: o resto da página só escuta o evento 'mudou'. */

export function criarFavoritas(slug) {
    const chave = 'entrega:' + slug + ':favoritas';
    const alvo = new EventTarget();
    let ids = new Set(ler());

    function ler() {
        try { return JSON.parse(localStorage.getItem(chave) || '[]'); } catch (e) { return []; }
    }
    function guardar() {
        try { localStorage.setItem(chave, JSON.stringify([...ids])); } catch (e) { /* aba anônima: vale só nesta visita */ }
    }
    function avisa(id) { alvo.dispatchEvent(new CustomEvent('mudou', { detail: { id, total: ids.size } })); }

    // outra aba com a mesma página aberta
    window.addEventListener('storage', (ev) => {
        if (ev.key !== chave) return;
        ids = new Set(ler());
        avisa(null);
    });

    return {
        tem: (id) => ids.has(id),
        total: () => ids.size,
        lista: () => [...ids],
        alternar(id) {
            if (ids.has(id)) ids.delete(id); else ids.add(id);
            guardar();
            avisa(id);
            return ids.has(id);
        },
        aoMudar: (fn) => alvo.addEventListener('mudou', fn)
    };
}

/** A mensagem que vai pro fotógrafo, com o nome de cada arquivo (como sai do Lightroom) */
export function mensagemSelecao(evento, fotos) {
    const n = fotos.length;
    const linhas = [
        'Oi, ' + evento.fotografo.nome.split(' ')[0] + '! Aqui é ' + evento.titulo + '.',
        'Separamos ' + n + (n === 1 ? ' foto favorita' : ' fotos favoritas') + ' para o álbum:',
        ''
    ];
    let capitulo = null;
    fotos.forEach((f) => {
        if (f.capitulo !== capitulo) {
            capitulo = f.capitulo;
            if (capitulo) {
                if (linhas[linhas.length - 1] !== '') linhas.push('');
                linhas.push(capitulo.numero + '. ' + capitulo.titulo);
            }
        }
        linhas.push('· ' + f.nomeArquivo);
    });
    linhas.push('', 'Página: ' + location.origin + location.pathname);
    return linhas.join('\n');
}
