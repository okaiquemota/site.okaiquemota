# Painel

O painel de gestão dos clientes da fotografia: cadastro, trabalhos, pagamentos, contrato em PDF, documentos, compromissos, agenda e financeiro. Fica só pra você, atrás de senha, e não aparece no site nem no Google.

Fica em **https://painel.okaiquemota.com.br**, e só lá: o endereço `*.workers.dev` da Cloudflare está desligado (`"workers_dev": false` no `wrangler.jsonc`).

Roda na Cloudflare, na sua conta: um Worker (o site e a API), um banco D1 (os dados) e um R2 (os arquivos). Tudo no plano gratuito, que não pausa por falta de uso. O GitHub Pages não publica esta pasta (veja o `_config.yml` na raiz).

## O que tem

- **Início**: os números do ano (clientes, trabalhos, recebido e a receber), os próximos trabalhos, o que falta receber (com botão "Recebi"), o que falta entregar (com o prazo, em vermelho quando passou), as pendências (contrato não assinado, autorização de imagem pendente) e os compromissos dos próximos 14 dias.
- **Clientes**: busca por nome, telefone, e-mail, CPF ou Instagram, sem se preocupar com acento. Na ficha ficam os dados (com o CPF conferido e o link pro WhatsApp), os trabalhos, os compromissos e os documentos. Apagar um cliente apaga tudo o que é dele, inclusive os arquivos, e serve pros pedidos de exclusão da LGPD.
- **Trabalho**: tipo, pacote, data, horário, local, valor, situação (Orçamento, Confirmado, Em edição, Entregue, Cancelado), contrato, autorização de imagem, prazo de entrega e o link da galeria. Ao escolher o pacote, o valor se preenche com o preço do orçamento; com a data, o prazo de entrega também. O botão "Sinal 30% + restante" cria os dois pagamentos do jeito do "Como funciona" (o restante vence no dia). Ao marcar a entrega, mostra até quando o link do Drive fica no ar (90 dias).
- **Contrato em PDF**: no trabalho, "Contrato em PDF" monta o seu contrato (as 4 páginas do modelo do Orçamento 2026) com os dados do cliente, do trabalho e do pacote: valor por extenso, sinal de 30% e restante, duração, equipe, fotos, prévia, prazo, hora adicional e a autorização de imagem já marcada (ou em branco, se estiver pendente). O que falta aparece num aviso com o botão que resolve, e no PDF vira uma linha em branco pra preencher à mão. "Ajustar contrato" muda só aquele contrato (ex.: 7 horas em vez de 6). "Baixar PDF" abre a janela de imprimir: escolha "Salvar como PDF" (no iPhone, Compartilhar › Salvar em Arquivos). Depois, "Marcar como enviado".
- **Seus dados do contrato**: o seu CPF ou CNPJ, endereço, formas de pagamento e os prazos que estavam entre [colchetes] no modelo (7 dias pro roteiro, 3 pra pagar a hora adicional, 60 pra remarcar, 7 pra devolver). Ficam no banco, atrás da senha, e nunca no código. Abre pelo contrato ou pelo rodapé do Início.
- **Financeiro**: o recebido no ano (comparado com o mesmo período do ano anterior), o que falta receber e o vencido, os trabalhos fechados e o valor médio, o gráfico do recebido mês a mês (com o que vai vencer), o total por tipo de trabalho e por "como conheceu", e a lista dos recebimentos. "Baixar planilha" baixa um CSV com a data, o cliente (com CPF) e o valor de cada recebimento do ano, pro carnê-leão e pro imposto de renda; abre no Excel e no Google Planilhas.
- **Agenda**: o mês com os trabalhos, os compromissos, os prazos de entrega, os vencimentos e os aniversários dos clientes. Tocar num dia leva até ele na lista do mês.
- **Documentos**: PDF, foto (JPG, PNG, WEBP, HEIC), Word, Excel ou TXT, até 25 MB cada. Arraste pra ficha ou escolha o arquivo. PDF e foto abrem no navegador, o resto é baixado.
- **Pra não errar**: a situação, o contrato e a autorização de imagem mudam com um clique (e só com o clique: passar a seta do teclado por cima não salva). "Recebi" tem "Desfazer" por alguns segundos. Fechar uma janela com algo preenchido pergunta antes de descartar. Se o envio de vários arquivos falhar no meio, os que já foram não são enviados de novo.
- **Backup**: no rodapé do Início, "Baixar backup (JSON)" baixa todos os dados, inclusive os seus dados do contrato (os arquivos ficam no R2 e não vão no JSON).

No celular, abra o endereço no Safari ou no Chrome e use "Adicionar à Tela de Início": vira um app com a assinatura de ícone.

## Definir a senha

O painel já está publicado, mas só abre depois que tiver senha. Na Cloudflare: *Compute → Workers e Pages → painel-okaiquemota → Settings → Variables and Secrets → + Add*. Em *Type* escolha **Secret**, em *Variable name* escreva `PAINEL_SENHA` e em *Value* a senha (pelo menos 10 caracteres; uma frase longa é ótima). Salve com **Deploy**.

## Publicar mudanças

O banco (`painel-okaiquemota`, no D1), o lugar dos arquivos (`painel-okaiquemota`, no R2) e a chave das sessões já estão na sua conta. Publicar de novo só manda o código e aplica as tabelas novas que houver em `migrations/`. Os dados e a senha ficam como estão.

- **Por uma sessão do Claude Code**: o token da Cloudflare está salvo no ambiente "Padrão", então é só pedir "publica o painel". Por baixo, é `CLOUDFLARE_API_TOKEN=proxy-injected npm run publicar` dentro de `painel/`.
- **Pelo GitHub (sozinho, a cada mudança na `main`)**: no repositório, *Settings → Secrets and variables → Actions → New repository secret*, crie `CLOUDFLARE_API_TOKEN` com o token da Cloudflare (modelo *Edit Cloudflare Workers* + *Account · D1 · Edit*). Daí pra frente, cada mudança na pasta `painel/` que chegar na `main` é publicada pelo workflow *Publicar o painel*. Se criar também o segredo `PAINEL_SENHA` lá, cada publicação regrava a senha com ele.
- **Pelo computador**: `npx wrangler login` (uma vez) e `npm run publicar`.

As páginas (`public/`) vão dentro do código do Worker: antes de rodar ou publicar, o wrangler roda `scripts/empacotar.mjs`, que junta tudo em `src/arquivos.gerado.js` (esse arquivo é gerado, não vai pro Git).

## Trocar a senha

No mesmo lugar onde ela foi criada: *Workers e Pages → painel-okaiquemota → Settings → Variables and Secrets*, no segredo `PAINEL_SENHA`. Trocar a senha desconecta todos os aparelhos.

Se você tiver criado o segredo `PAINEL_SENHA` também no GitHub, mude lá junto, senão a próxima publicação pelo GitHub volta a senha antiga.

## Rodar no computador

```
cd painel
npm install
printf 'PAINEL_SENHA=uma-senha-local\nSESSAO_SEGREDO=qualquer-coisa\n' > .dev.vars
npm run dev
```

Abra http://localhost:8787. O banco e os arquivos ficam simulados na pasta `.wrangler/` (nada vai pra sua conta).

## Segurança

- A senha fica guardada como segredo na Cloudflare, nunca no código. A sessão é um cookie assinado, que só o painel lê (HttpOnly, Secure, SameSite=Strict), e vale 30 dias.
- Depois de 5 senhas erradas em 15 minutos, aquele endereço fica travado por 15 minutos.
- Pedidos que mudam alguma coisa só valem vindos do próprio painel. A página não carrega nada de fora (CSP) e não pode ser aberta dentro de outro site.
- Os arquivos só abrem com a sessão aberta. O tipo de cada um é definido pelo painel, e HTML, SVG e scripts não são aceitos.
- O seu CPF ou CNPJ e o seu endereço (pro contrato) ficam só no banco do painel, nunca no código, que é público no GitHub.
- A Cloudflare entrou na Política de Privacidade (`fotografia/privacidade.html`, item 6.1) como quem armazena os dados e os documentos dos clientes.

## Arquivos

```
painel/
├── wrangler.jsonc          configuração na Cloudflare (nome, banco D1, R2)
├── migrations/             as tabelas do banco (clientes, trabalhos, pagamentos, documentos, compromissos, seus dados do contrato)
├── src/worker.js           a API: login, cadastros, arquivos, agenda, financeiro, planilha e backup
├── public/
│   ├── index.html
│   ├── painel.css          o mesmo visual do site: branco, tinta preta, Tinos, linhas finas
│   ├── painel.js           as telas
│   ├── assinatura.svg      ícone da aba e da tela de entrar
│   ├── icone-*.png         ícone do app no celular
│   └── fontes/             Tinos (licença SIL OFL 1.1)
└── scripts/
    ├── empacotar.mjs       junta public/ em src/arquivos.gerado.js (roda sozinho)
    └── publicar.mjs        publica: R2, tabelas, código e chave das sessões
```

Os tipos de trabalho e os pacotes do orçamento (preço, prazo de entrega e o que vai na tabela do contrato: duração, equipe, fotos, prévia e ensaio extra) estão no começo do `public/painel.js`, em `TIPOS`, `PACOTES` e `HORA_ADICIONAL`. Se mudar o orçamento, mude ali também. O texto do contrato está em `paginaContrato`, no mesmo arquivo, cláusula por cláusula como no modelo.
