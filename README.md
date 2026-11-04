# Kaique Mota

Página pessoal: o nome no topo, uma foto no meio com a assinatura de verdade por cima e os links embaixo, tudo centralizado.

Em `/fotografia` fica o site de fotografia (o do [@okaiquemota](https://www.instagram.com/okaiquemota/)), no mesmo visual do orçamento: fundo branco, tinta preta, cinza nos detalhes, Tinos (o desenho da Times) e linhas finas. Tem a capa (a foto com a assinatura por cima, que sempre cabe na altura da tela), "Sobre", "Trabalhos", os pacotes em abas (sem preços: os valores vão pelo WhatsApp), "Como funciona" e "Consultar data", um formulário que monta a mensagem pronta no WhatsApp. Tem também a Política de Privacidade (LGPD) em `/fotografia/privacidade.html`, linkado no rodapé da `/fotografia` e embaixo do formulário (a página inicial é o perfil pessoal e não leva o link). Fica em https://okaiquemota.com.br/fotografia/ — e `/fotografia/#casamento`, `#pre-wedding`, `#festas`, `#aniversarios`, `#making-of`, `#ensaios` e `#marcas` já abrem a aba do tipo de foto.

Em `painel/` fica o painel de clientes da fotografia (cadastro, trabalhos, pagamentos, contratos, documentos e agenda), atrás de senha. Ele não vai pro GitHub Pages: roda na Cloudflare, em https://painel.okaiquemota.com.br. Como publicar, trocar a senha e rodar no computador está em [`painel/README.md`](painel/README.md).

```
.
├── index.html
├── fotografia/
│   ├── index.html         o site do okaiquemota (textos e pacotes estão aqui)
│   ├── privacidade.html   a Política de Privacidade (LGPD)
│   ├── fotografia.css
│   ├── fotografia.js      abas dos pacotes, visor de fotos, formulário e o aparecer ao rolar
│   ├── fontes/            Tinos (woff2, licença SIL OFL 1.1), usada também pela página inicial
│   └── img/               fotos dos trabalhos (NOME-1080.jpg e NOME-720.jpg, 4:5) e o retrato da capa, kaique-*.jpg
├── painel/                o painel de clientes (Cloudflare, veja painel/README.md)
└── assets/
    ├── css/site.css
    ├── js/site.js         ano do rodapé e altura da página inicial
    └── img/
        ├── kaique.jpg         a foto do meio (em pé, 4:5)
        ├── assinatura.png     a assinatura, tirada do traço do lápis (preta, fundo transparente)
        └── assinatura.svg     a mesma assinatura em vetor (também é o ícone da aba)
```

O site não tem build nem dependência. Pra rodar no computador: `python3 -m http.server 8000`.

## Trocar a foto

Substitua `assets/img/kaique.jpg` por outra com o mesmo nome. Se mudar o tamanho, atualize o `width` e o `height` da `<img class="foto">` no `index.html`.

## Adicionar um trabalho

Cada trabalho é um `<article class="trabalho">` na seção `#trabalhos` do `fotografia/index.html`: uma faixa com 4 fotos e, embaixo, o nome e o tipo. Pra um trabalho novo, copie o bloco logo abaixo do título da seção (o mais novo fica em cima) e troque o nome, o tipo e as fotos: em cada foto, o `src`, o `srcset`, o `data-grande` (a versão grande que abre no visor), o `alt` e o `aria-label`. Cada foto tem duas versões em `fotografia/img/`: `-1080.jpg` (1080×1350) e `-720.jpg` (720×900).

Antes de publicar, duas coisas:

- **Autorização de quem aparece na foto** (de um dos pais ou do responsável, se for criança ou adolescente). A Política de Privacidade garante isso (item 5), e quem pedir tem a foto tirada do ar.
- **Exporte sem metadados** (EXIF). Fotos direto da câmera ou do celular podem levar a localização (GPS), a data e o número de série da câmera. No Lightroom: em Exportar → Metadados, escolha "Somente direitos autorais" (isso já tira a localização).

## Adicionar ou trocar um link

Os links ficam no `<nav class="links">` do `index.html`. Cada grupo é uma `<ul>`; os logos usam os símbolos do topo do arquivo (`#ico-instagram`, `#ico-x`, `#ico-github`, `#ico-behance`).

## Segurança e privacidade

- O site não usa cookies, estatística nem nada de fora: fontes, fotos e scripts saem daqui mesmo. Por isso não precisa de aviso de cookies. Se um dia entrar algo de fora (Google Analytics, Pixel da Meta, vídeo do YouTube, fonte do Google), a Política de Privacidade precisa contar isso (itens 3 e 6), e talvez pedir consentimento antes.
- Cada página tem uma Content-Security-Policy na `<meta>` do topo: o navegador só aceita arquivos do próprio site, então um script injetado não roda. Ela também barra `<script>` e `style="…"` escritos direto no HTML: script vai num `.js` e estilo, no `.css`. Se for colocar algo de fora, libere o endereço nessa linha.
- O formulário "Consultar data" não envia nada pra servidor nenhum: ele só monta a mensagem e abre o WhatsApp. Sem JavaScript, ele fica escondido e aparece o link direto, pra o nome e o local nunca irem parar no endereço da página.
- Mudou o texto do `fotografia/privacidade.html`? Atualize a data da "Última atualização", logo abaixo do título. O texto é formal, em cláusulas numeradas: mantenha esse tom.

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
