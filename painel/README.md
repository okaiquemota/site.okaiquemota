# Painel

O painel de gestão dos clientes da fotografia: cadastro, trabalhos, pagamentos, contratos e documentos, compromissos e agenda. Fica só pra você, atrás de senha, e não aparece no site nem no Google.

Roda na Cloudflare, na sua conta: um Worker (o site e a API), um banco D1 (os dados) e um R2 (os arquivos). Tudo no plano gratuito, que não pausa por falta de uso. O GitHub Pages não publica esta pasta (veja o `_config.yml` na raiz).

## O que tem

- **Início**: os números do ano (clientes, trabalhos, recebido e a receber), os próximos trabalhos, o que falta receber (com botão "Recebi"), o que falta entregar (com o prazo, em vermelho quando passou), as pendências (contrato não assinado, autorização de imagem pendente) e os compromissos dos próximos 14 dias.
- **Clientes**: busca por nome, telefone, e-mail, CPF ou Instagram, sem se preocupar com acento. Na ficha ficam os dados (com o CPF conferido e o link pro WhatsApp), os trabalhos, os compromissos e os documentos. Apagar um cliente apaga tudo o que é dele, inclusive os arquivos, e serve pros pedidos de exclusão da LGPD.
- **Trabalho**: tipo, pacote, data, horário, local, valor, situação (Orçamento, Confirmado, Em edição, Entregue, Cancelado), contrato, autorização de imagem, prazo de entrega e o link da galeria. Ao escolher o pacote e a data, o prazo de entrega se preenche sozinho com os dias de cada pacote do site. O botão "Sinal 30% + restante" cria os dois pagamentos do jeito do "Como funciona" (o restante vence no dia). Ao marcar a entrega, mostra até quando o link do Drive fica no ar (90 dias).
- **Agenda**: o mês com os trabalhos, os compromissos, os prazos de entrega, os vencimentos e os aniversários dos clientes. Tocar num dia vazio marca um compromisso nele.
- **Documentos**: PDF, foto (JPG, PNG, WEBP, HEIC), Word, Excel ou TXT, até 25 MB cada. Arraste pra ficha ou escolha o arquivo. PDF e foto abrem no navegador, o resto é baixado.
- **Backup**: no rodapé do Início, "Baixar backup (JSON)" baixa todos os dados (os arquivos ficam no R2 e não vão no JSON).

No celular, abra o endereço no Safari ou no Chrome e use "Adicionar à Tela de Início": vira um app com a assinatura de ícone.

## Publicar pela primeira vez

1. **Cloudflare, ativar o R2**: no painel da Cloudflare, menu *R2 Object Storage*, ative o R2. Ele pede um cartão, mas é grátis até 10 GB.
2. **Cloudflare, criar o token**: *My Profile → API Tokens → Create Token*, modelo **Edit Cloudflare Workers**. Em *Permissions*, clique em *+ Add more* e acrescente **Account · D1 · Edit**. Em *Account Resources*, escolha a sua conta. Crie e copie o token.
3. **GitHub, guardar os segredos**: no repositório `site.okaiquemota`, *Settings → Secrets and variables → Actions → New repository secret*. Crie dois:
   - `CLOUDFLARE_API_TOKEN`: o token do passo 2.
   - `PAINEL_SENHA`: a senha do painel, com pelo menos 10 caracteres (uma frase longa é ótima).
4. **Publicar**: depois que esta pasta estiver na `main`, vá em *Actions → Publicar o painel → Run workflow*. Daí pra frente ele publica sozinho a cada mudança na pasta `painel/`.
5. **Abrir**: o endereço aparece no fim do log do Actions (`https://painel-okaiquemota.<seu-subdominio>.workers.dev`). Também está na Cloudflare, em *Workers e Pages → painel-okaiquemota*.

O banco (`painel-okaiquemota`, no D1) já está criado na sua conta, e o id dele está no `wrangler.jsonc`. As tabelas, o lugar dos arquivos no R2 e a chave das sessões são criados na primeira publicação.

## Trocar a senha

Mude o segredo `PAINEL_SENHA` no GitHub e rode *Actions → Publicar o painel* de novo. Trocar a senha desconecta todos os aparelhos.

Também dá pra trocar direto na Cloudflare: *Workers e Pages → painel-okaiquemota → Settings → Variables and Secrets*, no segredo `PAINEL_SENHA`. Nesse caso, mude também no GitHub, senão a próxima publicação volta a senha antiga.

## Rodar no computador

```
cd painel
npm install
printf 'PAINEL_SENHA=uma-senha-local\nSESSAO_SEGREDO=qualquer-coisa\n' > .dev.vars
npm run dev
```

Abra http://localhost:8787. O banco e os arquivos ficam simulados na pasta `.wrangler/` (nada vai pra sua conta).

Pra publicar do computador em vez do GitHub: `npx wrangler login` (uma vez) e `PAINEL_SENHA='a senha' npm run publicar`.

## Segurança

- A senha fica guardada como segredo na Cloudflare, nunca no código. A sessão é um cookie assinado, que só o painel lê (HttpOnly, Secure, SameSite=Strict), e vale 30 dias.
- Depois de 5 senhas erradas em 15 minutos, aquele endereço fica travado por 15 minutos.
- Pedidos que mudam alguma coisa só valem vindos do próprio painel. A página não carrega nada de fora (CSP) e não pode ser aberta dentro de outro site.
- Os arquivos só abrem com a sessão aberta. O tipo de cada um é definido pelo painel, e HTML, SVG e scripts não são aceitos.
- A Cloudflare entrou na Política de Privacidade (`fotografia/privacidade.html`, item 6.1) como quem armazena os dados e os documentos dos clientes.

## Arquivos

```
painel/
├── wrangler.jsonc          configuração na Cloudflare (nome, banco D1, R2)
├── migrations/             as tabelas do banco (clientes, trabalhos, pagamentos, documentos, compromissos)
├── src/worker.js           a API: login, cadastros, arquivos, agenda e backup
├── public/
│   ├── index.html
│   ├── painel.css          o mesmo visual do site: branco, tinta preta, Tinos, linhas finas
│   ├── painel.js           as telas
│   ├── assinatura.svg      ícone da aba e da tela de entrar
│   ├── icone-*.png         ícone do app no celular
│   └── fontes/             Tinos (licença SIL OFL 1.1)
└── scripts/publicar.mjs    publica: R2, tabelas, código e segredos
```

Os tipos de trabalho e os pacotes (com o prazo de entrega de cada um) estão no começo do `public/painel.js`, em `TIPOS` e `PACOTES`. Se mudar os pacotes no site, mude ali também.
