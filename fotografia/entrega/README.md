# Entrega de fotos

A página que o casal (ou a debutante, ou a família) recebe com as fotos prontas. Uma revista por trabalho: capa, carta, capítulos com layouts variados, visor em tela cheia, favoritas para o álbum, imagem pronta para os stories e a assinatura no fim.

O primeiro é o de Vinícius & Stefany: https://okaiquemota.com.br/fotografia/vinicius-e-stefany/.

## Como é montada

O motor (esta pasta) é igual para todos os trabalhos. O que muda de um para outro é **só a pasta do trabalho**:

```
fotografia/
├── entrega/                 o motor (não mexe por trabalho)
│   ├── entrega.css          visual: tokens de cor, tipografia, layouts
│   ├── fontes/              Cormorant Garamond e Inter (woff2, licença SIL OFL 1.1)
│   └── js/
│       ├── principal.js     liga tudo: lê o evento, monta a página, índice, barra das favoritas
│       ├── dados.js         lê o evento.json e deixa pronto (endereços, numeração, layout automático)
│       ├── secoes.js        capa, carta, capítulo, "Leve com vocês" e rodapé
│       ├── layouts.js       os layouts: panoramica, unica, dupla, trio, mosaico, citacao, votos, texto
│       ├── visor.js         a foto em tela cheia (teclado, arrastar, favoritar, baixar, stories)
│       ├── favoritas.js     o coração (guardado no aparelho) e a mensagem da seleção
│       ├── stories.js       a imagem 9:16 com moldura, nomes e data
│       ├── trilha.js        a música (só toca quando alguém aperta)
│       └── dom.js           peças pequenas (montar elementos, ícones, avisos)
└── vinicius-e-stefany/      um trabalho
    ├── index.html           a página do casal (só os metadados da prévia no WhatsApp)
    ├── evento.json          TUDO o que aparece: textos, capítulos, fotos, créditos
    ├── trilha-exemplo.mp3   a música (troque pela de verdade)
    └── fotos/
        ├── web/             a versão da tela (lado maior 2048px; os exemplos de agora têm 1600)
        └── mini/            a versão leve da página (lado maior 800px)
```

Sem build e sem dependência, como o resto do site: é só publicar. Para ver no computador: `python3 -m http.server 8000` na raiz e abrir http://localhost:8000/fotografia/vinicius-e-stefany/.

## Um trabalho novo, passo a passo

1. **Copie a pasta** `vinicius-e-stefany` com o nome do novo trabalho (ex.: `helena-15-anos`). Apague o que estiver em `fotos/`.
2. **Exporte as fotos do Lightroom** duas vezes, com o mesmo nome de arquivo:
   - `fotos/web/`: lado maior 2048px, qualidade 80–85, sRGB;
   - `fotos/mini/`: lado maior 800px, qualidade 75.
   - Metadados: "Somente direitos autorais" (tira o GPS). O nome do arquivo é o que chega na seleção do casal, então mantenha o mesmo nome que está no seu catálogo.
3. **Edite o `evento.json`**: confira `midia.ladoMaiorWeb` (2048 se exportou assim), textos, data, capítulos e a lista de fotos (veja os campos abaixo). Para cada foto basta `id`, `arquivo`, `largura`, `altura` e `alt`.
4. **Edite a `index.html`**: título, `og:description` e `og:image` (a foto da prévia no WhatsApp, com endereço completo `https://…`) e o `preload` da foto da capa. É o único lugar fora do JSON, porque o WhatsApp não roda JavaScript.
5. **Teste** no computador e no celular. Abra uma foto, marque um coração, gere um stories.
6. **Publique** e mande o link. Não entra no `sitemap.xml`: a página tem `noindex` e fica fora do Google.

Para trocar a música: coloque o `.mp3` na pasta e mude `trilha.src`. Sem música, apague o bloco `trilha` e o botão some sozinho. Use só música com licença para isso (bibliotecas como a do YouTube Audio Library ou Artlist).

## O evento.json

| Campo | O que é |
|---|---|
| `slug` | o nome da pasta; também separa as favoritas de um trabalho das de outro |
| `tipo` | "Casamento", "15 anos", "Ensaio"… (aparece pequeno na imagem do stories) |
| `titulo` | o título inteiro, "Vinícius & Stefany" |
| `nomes` | os nomes separados, para a capa em pilha: `["Vinícius", "Stefany"]` ou `["Helena"]` |
| `monograma` | opcional; sem ele vira "V & S" (iniciais) |
| `data` | `AAAA-MM-DD` (vai no stories e nos créditos do rodapé; a capa mostra só os nomes) |
| `tema.modo` | `"claro"` (papel quente) ou `"escuro"` (o trabalho inteiro no escuro) |
| `tema.cores` | opcional: troca qualquer token do CSS, ex. `{ "destaque": "#7a5c3e" }` |
| `capa.layout` | `"editorial"` (texto de um lado, foto em pé do outro) ou `"tela-cheia"` (foto deitada de fundo) |
| `capa.foto` | a foto da capa (mesmos campos de uma foto) |
| `trilha` | `{ "src", "titulo" }`; vira só um ícone de som (na capa e no índice). Sem ele, sem música |
| `carta` | `{ "titulo", "paragrafos": [...], "assinatura" }`; sem ele, sem carta |
| `midia` | as pastas das versões (`web`, `mini`, `original`) e o lado maior de cada uma |
| `capitulos` | a história (abaixo) |
| `selecao` | `{ "ativa": true, "limite": 40 }`: o coração e o envio da seleção para o álbum |
| `downloads.completo` | `{ "url" }`: o link da pasta com todas as fotos (Google Drive). A página avisa que a pasta tem senha; **nunca coloque a senha aqui** (o repositório é público): mande pelo WhatsApp. Se a pasta não tiver senha, use `"senha": false`. Sem `url`, o cartão não aparece |
| `downloads.validade` | até quando a página fica no ar (aparece como aviso) |
| `creditos` | `[{ "papel": "Cerimonial", "nome": "…" }]`; os sem nome não aparecem |
| `fotografo` | opcional: só se precisar trocar nome, WhatsApp ou site (o padrão está no `dados.js`) |

### Capítulos

```json
{
  "id": "preparo", "numero": "II", "titulo": "O Preparo", "subtitulo": "Making of",
  "texto": "A frase de abertura do capítulo.",
  "tom": "escuro",
  "blocos": [ ... ]
}
```

- `tom: "escuro"`: o capítulo "anoitece" (a página escurece aos poucos e volta a clarear). Fica bonito na festa.
- **Curadoria manual** com `blocos`, cada um com um `layout`:
  - `panoramica`: uma foto de ponta a ponta (deitada) ou alta e centralizada (em pé);
  - `unica`: uma foto deslocada, com `alinhamento` (`esquerda`, `direita`, `centro`) e uma `legenda` ao lado;
  - `dupla` e `trio`: lado a lado, mesma altura, sem cortar. `"variante": "deslocada"` desce a segunda, como numa revista;
  - `mosaico`: de 3 a 5 fotos, uma grande e as outras em volta. Aqui a foto é cortada: use `"foco": "50% 30%"` para dizer o que não pode sair;
  - `citacao`: `{ "texto", "autor" }` entre as fotos (um trecho dos votos, por exemplo);
  - `votos`: `{ "titulo": "Os votos", "trechos": [{ "texto", "autor" }, …] }`, um trecho de cada um, lado a lado;
  - `texto`: um parágrafo solto.
- **Layout automático**: em vez de `blocos`, ponha só `"fotos": [ ... ]` no capítulo, na ordem. O motor alterna panorâmica, dupla e mosaico sozinho, sem repetir. Bom para começar rápido e depois lapidar.

### Uma foto

```json
{ "id": "sim-03", "arquivo": "VS_0412.jpg", "largura": 2048, "altura": 1365, "alt": "Vinícius emocionado ao ver Stefany entrar" }
```

`largura` e `altura` só precisam ter a proporção certa (reservam o espaço e evitam a página pular). O `alt` é o que o leitor de tela lê: descreva quem e o que está acontecendo. Também dá para usar endereços diretos (`src`, `mini`, `original`) em vez de `arquivo`, como as fotos do pré-wedding, que vêm de `fotografia/img/`.

## O que a página faz

- **Visor**: clique (ou Enter) numa foto. Setas ←/→, arrastar no celular (para baixo fecha), Esc. `F` favorita, `B` baixa, `S` faz o stories. O endereço vira `…/#foto=sim-03`: dá para mandar o link de uma foto só.
- **Favoritas**: o coração fica guardado no aparelho (por trabalho). A barra de baixo mostra quantas são, filtra "só as favoritas" e manda a lista pelo WhatsApp, com o nome de cada arquivo, separado por capítulo.
- **Stories**: no celular abre o compartilhar (direto para o Instagram); no computador baixa a imagem 1080×1920.
- **Acessibilidade**: tudo pelo teclado, foco preso no visor e devolvido à foto ao fechar, `alt` em cada foto, contraste AA (texto suave 5,5:1 no claro e 7:1 no escuro) e respeito a "reduzir movimento".

## Limites que vale saber

- **As favoritas ficam no aparelho.** Se o noivo marca no celular dele e a noiva no dela, são duas listas. Cada um pode mandar a sua (a mensagem diz de qual capítulo é cada foto). Juntar as duas pede o banco de dados (abaixo).
- O GitHub Pages é público: qualquer pasta publicada pode ser aberta por quem tiver o link.

## Próximo passo: direto do painel

Os componentes só conhecem o formato que sai do `dados.js`. Para o painel gerar entregas sem editar arquivo:

1. no painel (Cloudflare Worker + D1, já existente), uma tabela `entregas` com o JSON do evento por `slug` e uma rota `GET /api/entregas/:slug`;
2. as fotos no R2 (o painel já usa R2 para documentos), com as versões `web/` e `mini/`;
3. no `dados.js`, ensinar a fonte `painel` em `FONTES` (já tem o lugar comentado);
4. a seleção do casal vira `POST /api/entregas/:slug/selecao` em vez do WhatsApp, e as favoritas passam a valer em todos os aparelhos.

Se as fotos forem para outro domínio, libere esse endereço em `img-src` e `connect-src` na Content-Security-Policy da `index.html`.
