# Kaique Mota

O okaiquemota.com.br é o site de fotografia (o do [@okaiquemota](https://www.instagram.com/okaiquemota/)), no mesmo visual do orçamento: fundo branco, tinta preta, cinza nos detalhes, Tinos (o desenho da Times) e linhas finas. Tem a capa (a foto com a assinatura que se escreve por cima, que sempre cabe na altura da tela), "Sobre", uma foto de borda a borda, "Trabalhos" (cada trabalho é um filme), os pacotes em abas (sem preços: os valores vão pelo WhatsApp), "Como funciona" e "Consultar data", um formulário que monta a mensagem pronta no WhatsApp. Tem também a Política de Privacidade (LGPD) em `/privacidade.html`, linkada no rodapé e embaixo do formulário. Os endereços `/#casamento`, `#pre-wedding`, `#festas`, `#aniversarios`, `#making-of`, `#ensaios` e `#marcas` já abrem a aba do tipo de foto.

Em `/eu/` fica a página pessoal: o nome no topo, uma foto no meio com a assinatura de verdade por cima e os links embaixo (o link pra Fotografia e os @), tudo centralizado. Na página principal, ela é o "Kaique Mota" do rodapé.

Até novembro de 2026 era o contrário: a página pessoal ficava em `/` e a fotografia em `/fotografia/`. Os endereços antigos continuam funcionando: `/fotografia/`, `/fotografia/privacidade.html` e `/fotografia/vinicius-e-stefany/` são páginas pequenas que levam pro endereço novo (com o `#` do link junto, pelo `assets/js/mudou.js`). Não apague essa pasta: tem link antigo no Instagram, no Google e no WhatsApp das pessoas.

Em `painel/` fica o painel de clientes da fotografia (cadastro, trabalhos, pagamentos, contratos, documentos e agenda), atrás de senha. Ele não vai pro GitHub Pages: roda na Cloudflare, em https://painel.okaiquemota.com.br. Como publicar, trocar a senha e rodar no computador está em [`painel/README.md`](painel/README.md).

```
.
├── index.html             a página principal, a fotografia (textos e pacotes estão aqui)
├── privacidade.html       a Política de Privacidade (LGPD)
├── fotografia.css
├── fotografia.js          abas dos pacotes, o filme dos trabalhos, visor de fotos, formulário e o aparecer ao rolar
├── fontes/                Tinos (woff2, licença SIL OFL 1.1), usada também pela /eu e pela 404
├── img/                   fotos dos trabalhos (NOME-1080.jpg e NOME-720.jpg, 4:5), o retrato da capa, kaique-*.jpg,
│                          e compartilhar.jpg (a prévia quando o link é mandado no WhatsApp, 1200×630)
├── entrega/               o motor das páginas de entrega de fotos (veja entrega/README.md)
├── vinicius-e-stefany/    a entrega do casamento de Vinícius & Stefany (evento.json + fotos)
├── eu/index.html          a página pessoal
├── fotografia/            só os redirecionamentos dos endereços antigos (não apague)
├── 404.html               a página de "não encontrado" (o GitHub mostra pra qualquer endereço que não existe)
├── robots.txt e sitemap.xml   pro Google achar as páginas
├── painel/                o painel de clientes (Cloudflare, veja painel/README.md)
└── assets/                o que a /eu, a 404 e a assinatura usam
    ├── css/site.css       o visual da /eu e da 404
    ├── js/site.js         ano do rodapé e altura da /eu
    ├── js/mudou.js        leva os endereços antigos pros novos
    └── img/
        ├── kaique.jpg         a foto do meio da /eu (em pé, 4:5)
        ├── assinatura.png     a assinatura, tirada do traço do lápis (preta, fundo transparente)
        ├── assinatura.svg     a mesma assinatura em vetor (a que se escreve na capa; também é o ícone da aba)
        ├── icone-180.png      o ícone quando alguém salva o site na tela inicial do iPhone
        └── compartilhar.jpg   a prévia da /eu no WhatsApp e nas redes (1200×630)
```

Em `/<trabalho>/` ficam as **páginas de entrega**: a revista de cada casal (ou 15 anos, ou ensaio) com as fotos prontas, capítulos, visor, favoritas para o álbum e stories. Cada trabalho é só uma pasta com um `evento.json` e as fotos; o motor é o mesmo para todos. O passo a passo para criar uma está em [`entrega/README.md`](entrega/README.md). A primeira é https://okaiquemota.com.br/vinicius-e-stefany/, que virou a página de portfólio do casal: está ligada em "Trabalhos" ("Ver a história"), entra no Google e não tem as partes de cliente (seleção para o álbum e pasta para baixar). Uma entrega só para os noivos leva `<meta name="robots" content="noindex, nofollow">` e fica fora do `sitemap.xml`. O nome da pasta não pode ser um dos que o site já usa: `eu`, `img`, `fontes`, `entrega`, `assets`, `fotografia` e `painel`.

O site não tem build nem dependência. Pra rodar no computador: `python3 -m http.server 8000`.

## Trocar a foto da /eu

Substitua `assets/img/kaique.jpg` por outra com o mesmo nome. Se mudar o tamanho, atualize o `width` e o `height` da `<img class="foto">` no `eu/index.html`.

## Adicionar um trabalho

Cada trabalho é um filme: um `<article class="trabalho filme">` na seção `#trabalhos` do `index.html`. No computador, a faixa de fotos fica parada na tela e corre de lado enquanto a página desce; no celular (e pra quem pediu menos movimento no aparelho), ela se arrasta com o dedo. A linha embaixo enche conforme as fotos passam. Clicando numa foto, ela cresce até a tela cheia (o visor) e, ao fechar, volta pro lugar dela.

Pra um trabalho novo, copie o `<article>` inteiro logo abaixo do título da seção (o mais novo fica em cima) e troque o nome, o tipo, o link e as fotos. Cada foto é um `<button class="quadro">` dentro da `.faixa`; nele, troque o `src`, o `srcset`, o `data-grande` (a versão grande que abre no visor), o `alt` e o `aria-label`. De 6 a 10 fotos fica bom; todas em pé, 4:5. As fotos podem estar em `img/` (`-1080.jpg` com 1080×1350 e `-720.jpg` com 720×900) ou na pasta da entrega do trabalho (`fotos/web/` e `fotos/mini/`, como as do ensaio de Vinícius & Stefany). O `width` e o `height` de cada `<img>` são os da versão grande. Mais de um trabalho funciona, mas cada um vira um filme: dois ou três seguidos ainda ficam bons.

Antes de publicar, duas coisas:

- **Autorização de quem aparece na foto** (de um dos pais ou do responsável, se for criança ou adolescente). A Política de Privacidade garante isso (item 5), e quem pedir tem a foto tirada do ar.
- **Exporte sem metadados** (EXIF). Fotos direto da câmera ou do celular podem levar a localização (GPS), a data e o número de série da câmera. No Lightroom: em Exportar → Metadados, escolha "Somente direitos autorais" (isso já tira a localização).

## A foto de borda a borda

Entre o "Sobre" e os "Trabalhos" fica a `<figure class="pausa">`: uma foto que abre de borda a borda e vem chegando perto enquanto a página desce. Pra trocar, mude o `src`, o `srcset`, o `alt`, o `width`/`height` e a legenda. Funciona melhor com uma foto deitada exportada grande (lado maior 2400px), porque ela ocupa a largura da tela; a de agora é em pé e o corte fica no `object-position` da `.pausa-quadro img` no `fotografia.css` (o segundo número sobe ou desce o enquadramento).

## A assinatura que se escreve

Na capa e no fim do "Sobre", a assinatura se escreve traço por traço. O desenho é o `assets/img/assinatura.svg`; por cima dele vai uma máscara com três traços grossos que seguem o caminho da caneta, do jeito que ela é escrita (a caneta só levanta duas vezes): 1) o laço e o K, que começa na ponta direita do corte, vem até a ponta do laço, sobe até a ponta do braço, desce pela perna e sobe a haste inteira; 2) o "l", que sobe, faz a volta e desce até o gancho; 3) o "am". Os traços são os `<path>` dentro de `<g class="tracos">` no `index.html` (iguais na capa e no "Sobre"); o tempo de cada um fica no `fotografia.css`, em `.assinatura .tracos path:nth-child(…)`, e as freadas nas curvas, nos `@keyframes traco-k` e `traco-l`. Se a assinatura mudar, esses caminhos precisam ser desenhados de novo por cima dela. Se faltar algum pedacinho, o retângulo `fecho` acende a assinatura inteira no fim.

## Idade no "Sobre"

A idade em "Sou o Kaique, tenho 22 anos" muda sozinha no aniversário: o `fotografia.js` calcula a partir do `data-nascimento="2003-12-14"` do `<span>` em volta do número. O número escrito no HTML só aparece pra quem está sem JavaScript; dá pra atualizar ele uma vez por ano, mas não é obrigatório.

## Adicionar um depoimento

Os depoimentos ficam numa seção entre "Trabalhos" e "Pacotes" do `index.html`, que ainda não existe: ela entra com o primeiro depoimento. O desenho já está no `fotografia.css` (até três por fileira no computador, um embaixo do outro no celular). Cole este bloco logo antes de `<section class="secao wrap" id="pacotes"`, com um `<figure>` por depoimento:

```html
<section class="secao wrap" id="depoimentos" aria-labelledby="depoimentos-titulo">
    <div class="cabeca" data-revela>
        <h2 class="titulo" id="depoimentos-titulo">Depoimentos</h2>
    </div>
    <div class="depoimentos">
        <figure class="depoimento" data-revela>
            <blockquote><p>O texto do cliente, sem as aspas (elas entram sozinhas).</p></blockquote>
            <figcaption><span class="depoimento-nome">Nome do cliente</span> <span class="rotulo">Casamento</span></figcaption>
        </figure>
    </div>
</section>
```

Antes de publicar, a mesma regra das fotos: só com a autorização de quem escreveu, pra usar o nome e o texto no site.

## Adicionar ou trocar um link da /eu

Os links da página pessoal ficam no `<nav class="links">` do `eu/index.html`. Cada grupo é uma `<ul>`; os logos usam os símbolos do topo do arquivo (`#ico-instagram`, `#ico-x`, `#ico-github`, `#ico-behance`).

## Segurança e privacidade

- O site não usa cookies, estatística nem nada de fora: fontes, fotos e scripts saem daqui mesmo. Por isso não precisa de aviso de cookies. Se um dia entrar algo de fora (Google Analytics, Pixel da Meta, vídeo do YouTube, fonte do Google), a Política de Privacidade precisa contar isso (itens 3 e 6), e talvez pedir consentimento antes.
- Cada página tem uma Content-Security-Policy na `<meta>` do topo: o navegador só aceita arquivos do próprio site, então um script injetado não roda. Ela também barra `<script>` e `style="…"` escritos direto no HTML: script vai num `.js` e estilo, no `.css`. Se for colocar algo de fora, libere o endereço nessa linha.
- O formulário "Consultar data" não envia nada pra servidor nenhum: ele só monta a mensagem e abre o WhatsApp. Sem JavaScript, ele fica escondido e aparece o link direto, pra o nome e o local nunca irem parar no endereço da página.
- Mudou o texto do `privacidade.html`? Atualize a data da "Última atualização", logo abaixo do título. O texto é formal, em cláusulas numeradas: mantenha esse tom.

## Google e compartilhamento

- `robots.txt` e `sitemap.xml` (na raiz) mostram as páginas pro Google. Página nova? Ela entra no `sitemap.xml`. Mudou uma página? Atualize o `<lastmod>` dela.
- Os dados estruturados (o `<script type="application/ld+json">` no fim do `<head>`) contam pro Google o que é o negócio de fotografia (página principal) e quem é o Kaique (`/eu`) (telefone, e-mail, cidade e os tipos de foto). Mudou o telefone, o e-mail ou a cidade? Mude ali também.
- A prévia que aparece quando alguém manda o link no WhatsApp é a `compartilhar.jpg` de cada página (1200×630, no `og:image`). Trocou a foto da capa ou a frase? Vale gerar a imagem de novo.
- Fora do site, o que mais traz cliente da cidade é o Perfil da Empresa no Google (o que aparece no mapa quando alguém busca "fotógrafo Ribeirão Preto"), com o link pro okaiquemota.com.br.

## Domínio e DNS

O domínio é registrado no Registro.br, mas o DNS fica na Cloudflare (nameservers `ali.ns.cloudflare.com` e `elijah.ns.cloudflare.com`). Lá estão os quatro registros A do GitHub Pages (185.199.108.153 a 185.199.111.153) e o `www` apontando para `okaiquemota.github.io`, todos como *DNS only* (nuvem cinza): quem cuida do site e do HTTPS dele continua sendo o GitHub. O `painel.okaiquemota.com.br` é ligado direto ao Worker do painel (`routes` no `painel/wrangler.jsonc`); esse registro a Cloudflare cria sozinha.

O e-mail contato@okaiquemota.com.br chega no Gmail pelo Email Routing da Cloudflare (*Email → Email Routing* no okaiquemota.com.br): os registros MX (`route1`, `route2` e `route3.mx.cloudflare.net`) e o SPF foram criados por ele. Ele só recebe; as respostas saem do Gmail. A regra "catch-all" fica desligada, então e-mail pra qualquer outro nome no domínio é recusado.

Qualquer mudança de DNS se faz na Cloudflare, não no Registro.br.

## Publicar

Em **Settings → Pages**, branch `main` e pasta `/ (root)`. O site fica em https://okaiquemota.com.br (o arquivo `CNAME` diz isso pro GitHub).

DNS no Registro.br (zona do okaiquemota.com.br):

| Tipo  | Nome  | Valor                   |
|-------|-------|-------------------------|
| A     | (vazio) | 185.199.108.153       |
| A     | (vazio) | 185.199.109.153       |
| A     | (vazio) | 185.199.110.153       |
| A     | (vazio) | 185.199.111.153       |
| CNAME | www   | okaiquemota.github.io   |

Quando o DNS propagar, marca **Enforce HTTPS** em Settings → Pages.
