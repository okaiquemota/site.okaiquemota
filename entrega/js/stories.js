/* Entrega · "Pronto para os stories"
   Desenha a foto num quadro 9:16 (1080×1920) com uma moldura fina, os nomes
   e a data embaixo. No celular abre direto o compartilhar (Instagram,
   WhatsApp); no computador, baixa a imagem. */
import { formatarData } from './dados.js';

const W = 1080;
const H = 1920;

export async function gerarStories(foto, evento) {
    const css = getComputedStyle(document.documentElement);
    const cor = (v, p) => (css.getPropertyValue(v).trim() || p);
    const escuro = evento.tema.modo === 'escuro';
    const papel = escuro ? cor('--papel', '#0e0e0e') : cor('--papel', '#faf9f6');
    const tinta = cor('--tinta', escuro ? '#ede9e1' : '#1a1816');
    const suave = cor('--tinta-suave', '#6b655c');
    const linha = cor('--linha', '#d9d4ca');

    await Promise.all([
        document.fonts.load('300 italic 92px "Cormorant Garamond"'),
        document.fonts.load('400 24px "Inter"'),
        document.fonts.load('500 22px "Inter"')
    ]).catch(() => {});
    const img = await carregar(foto.src);

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = papel;
    g.fillRect(0, 0, W, H);

    // moldura fina, como o passe-partout de um quadro
    const m = 44;
    g.strokeStyle = linha;
    g.lineWidth = 2;
    g.strokeRect(m, m, W - 2 * m, H - 2 * m);

    // a foto inteira (sem corte) dentro da área de cima
    const areaX = 104, areaY = 150, areaW = W - 2 * areaX, areaH = 1300;
    const r = Math.min(areaW / img.naturalWidth, areaH / img.naturalHeight);
    const fw = Math.round(img.naturalWidth * r), fh = Math.round(img.naturalHeight * r);
    const fx = Math.round((W - fw) / 2), fy = Math.round(areaY + (areaH - fh) / 2);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, fx, fy, fw, fh);

    // pequeno rótulo em cima
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = suave;
    g.font = '500 22px Inter, system-ui, sans-serif';
    espacado(g, (evento.tipo || '').toUpperCase(), W / 2, 112, 6);

    // os nomes e a data
    const base = Math.max(fy + fh, areaY + areaH) + 150;
    g.fillStyle = tinta;
    g.font = 'italic 300 92px "Cormorant Garamond", Georgia, serif';
    g.fillText(evento.titulo, W / 2, base, W - 2 * areaX);
    g.fillStyle = linha;
    g.fillRect(W / 2 - 40, base + 48, 80, 2);
    g.fillStyle = suave;
    g.font = '400 24px Inter, system-ui, sans-serif';
    espacado(g, formatarData(evento.data, true), W / 2, base + 112, 5);

    // assinatura discreta no pé
    g.font = '500 18px Inter, system-ui, sans-serif';
    g.globalAlpha = 0.8;
    espacado(g, evento.fotografo.marca.toUpperCase(), W / 2, H - m - 40, 5);
    g.globalAlpha = 1;

    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
    const nome = evento.slug + '-stories-' + foto.id + '.jpg';
    const arquivo = new File([blob], nome, { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [arquivo] }) && matchMedia('(pointer: coarse)').matches) {
        try {
            await navigator.share({ files: [arquivo], title: evento.titulo });
            return 'compartilhado';
        } catch (e) {
            if (e.name === 'AbortError') return 'cancelado';
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'baixado';
}

function carregar(src) {
    return new Promise((ok, erro) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';   // a foto vem do fotos.okaiquemota.com.br: sem isso, o canvas não deixa salvar
        i.decoding = 'async';
        i.onload = () => ok(i);
        i.onerror = () => erro(new Error('Não deu para carregar a foto'));
        i.src = src;
    });
}

/* texto com espaço entre as letras (o canvas não tem letter-spacing em todo navegador) */
function espacado(g, texto, x, y, esp) {
    const letras = [...texto];
    const larg = letras.reduce((s, l) => s + g.measureText(l).width, 0) + esp * (letras.length - 1);
    let cx = x - larg / 2;
    const alinh = g.textAlign;
    g.textAlign = 'left';
    letras.forEach((l) => { g.fillText(l, cx, y); cx += g.measureText(l).width + esp; });
    g.textAlign = alinh;
}
