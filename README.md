# Kaique Mota

Página pessoal: o nome no topo, uma foto no meio com a assinatura de verdade por cima e os links embaixo, tudo centralizado.

Em `/fotografia` fica o site de fotografia (o do [@okaiquemota](https://www.instagram.com/okaiquemota/)), no mesmo visual do orçamento: fundo branco, tinta preta, cinza nos detalhes, Tinos (o desenho da Times) e linhas finas. Tem a capa (a foto com a assinatura por cima, que sempre cabe na altura da tela), "Sobre", "Trabalhos", os pacotes em abas (sem preços: os valores vão pelo WhatsApp), "Como funciona" e "Consultar data", um formulário que monta a mensagem pronta no WhatsApp. Tem também o aviso de privacidade (LGPD) em `/fotografia/privacidade.html`, linkado no rodapé das duas páginas e embaixo do formulário. Fica em https://okaiquemota.com.br/fotografia/ — e `/fotografia/#casamento`, `#pre-wedding`, `#festas`, `#aniversarios`, `#making-of`, `#ensaios` e `#marcas` já abrem a aba do tipo de foto.

```
.
├── index.html
├── fotografia/
│   ├── index.html         o site do okaiquemota (textos e pacotes estão aqui)
│   ├── privacidade.html   o aviso de privacidade (LGPD)
│   ├── fotografia.css
│   ├── fotografia.js      abas dos pacotes, visor de fotos, formulário e o aparecer ao rolar
│   ├── fontes/            Tinos (woff2, licença SIL OFL 1.1), usada também pela página inicial
│   └── img/               fotos dos trabalhos (NOME-1080.jpg e NOME-720.jpg, 4:5) e o retrato da capa, kaique-*.jpg
└── assets/
    ├── css/site.css
    ├── js/site.js         ano do rodapé e altura da página inicial
    └── img/
        ├── kaique.jpg         a foto do meio (em pé, 4:5)
        ├── assinatura.png     a assinatura, tirada do traço do lápis (preta, fundo transparente)
        └── assinatura.svg     a mesma assinatura em vetor (também é o ícone da aba)
```

Não tem build nem dependência. Pra rodar no computador: `python3 -m http.server 8000`.

## Trocar a foto

Substitua `assets/img/kaique.jpg` por outra com o mesmo nome. Se mudar o tamanho, atualize o `width` e o `height` da `<img class="foto">` no `index.html`.

## Adicionar um trabalho

Cada trabalho é um `<article class="trabalho">` na seção `#trabalhos` do `fotografia/index.html`: uma faixa com 4 fotos e, embaixo, o nome e o tipo. Pra um trabalho novo, copie o bloco logo abaixo do título da seção (o mais novo fica em cima) e troque o nome, o tipo e as fotos: em cada foto, o `src`, o `srcset`, o `data-grande` (a versão grande que abre no visor), o `alt` e o `aria-label`. Cada foto tem duas versões em `fotografia/img/`: `-1080.jpg` (1080×1350) e `-720.jpg` (720×900).

Antes de publicar, duas coisas:

- **Autorização de quem aparece na foto** (de um dos pais ou do responsável, se for criança ou adolescente). O aviso de privacidade promete isso, e quem pedir tem a foto tirada do ar.
- **Exporte sem metadados** (EXIF). Fotos direto da câmera ou do celular podem levar a localização (GPS), a data e o número de série da câmera. No Lightroom: em Exportar → Metadados, escolha "Somente direitos autorais" (isso já tira a localização).

## Adicionar ou trocar um link

Os links ficam no `<nav class="links">` do `index.html`. Cada grupo é uma `<ul>`; os logos usam os símbolos do topo do arquivo (`#ico-instagram`, `#ico-x`, `#ico-github`, `#ico-behance`).

## Segurança e privacidade

- O site não usa cookies, estatística nem nada de fora: fontes, fotos e scripts saem daqui mesmo. Por isso não precisa de aviso de cookies. Se um dia entrar algo de fora (Google Analytics, Pixel da Meta, vídeo do YouTube, fonte do Google), o aviso de privacidade precisa contar isso, e talvez pedir consentimento antes.
- Cada página tem uma Content-Security-Policy na `<meta>` do topo: o navegador só aceita arquivos do próprio site, então um script injetado não roda. Ela também barra `<script>` e `style="…"` escritos direto no HTML: script vai num `.js` e estilo, no `.css`. Se for colocar algo de fora, libere o endereço nessa linha.
- O formulário "Consultar data" não envia nada pra servidor nenhum: ele só monta a mensagem e abre o WhatsApp. Sem JavaScript, ele fica escondido e aparece o link direto, pra o nome e o local nunca irem parar no endereço da página.
- Mudou o texto do `fotografia/privacidade.html`? Atualize a data logo abaixo do título.

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
