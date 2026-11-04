-- Painel: clientes, trabalhos, pagamentos, documentos e compromissos.
-- Datas em texto 'AAAA-MM-DD', horas em 'HH:MM' e valores em centavos (inteiros).
-- O D1 já liga as chaves estrangeiras: apagar um cliente apaga o que é dele.

CREATE TABLE clientes (
    id            TEXT PRIMARY KEY,
    nome          TEXT NOT NULL,
    telefone      TEXT,
    email         TEXT,
    instagram     TEXT,
    cpf           TEXT,
    rg            TEXT,
    nascimento    TEXT,
    endereco      TEXT,
    cidade        TEXT,
    origem        TEXT,
    observacoes   TEXT,
    busca         TEXT NOT NULL DEFAULT '',   -- nome, CPF, telefone, e-mail e Instagram sem acento, pra busca
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX clientes_nome ON clientes (nome COLLATE NOCASE);

CREATE TABLE trabalhos (
    id            TEXT PRIMARY KEY,
    cliente_id    TEXT NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL,
    titulo        TEXT,
    data          TEXT,
    hora          TEXT,
    local         TEXT,
    pacote        TEXT,
    valor         INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'orcamento',  -- orcamento | confirmado | edicao | entregue | cancelado
    contrato      TEXT NOT NULL DEFAULT 'a_enviar',   -- a_enviar | enviado | assinado | dispensado
    autorizacao   TEXT NOT NULL DEFAULT 'pendente',   -- pendente | sim | nao (uso da imagem no portfólio)
    prazo_entrega TEXT,
    entregue_em   TEXT,
    galeria       TEXT,
    observacoes   TEXT,
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX trabalhos_cliente ON trabalhos (cliente_id);
CREATE INDEX trabalhos_data ON trabalhos (data);
CREATE INDEX trabalhos_prazo ON trabalhos (prazo_entrega);

CREATE TABLE pagamentos (
    id            TEXT PRIMARY KEY,
    trabalho_id   TEXT NOT NULL REFERENCES trabalhos (id) ON DELETE CASCADE,
    descricao     TEXT NOT NULL,
    valor         INTEGER NOT NULL,
    vencimento    TEXT,
    pago_em       TEXT,
    forma         TEXT,
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX pagamentos_trabalho ON pagamentos (trabalho_id);
CREATE INDEX pagamentos_vencimento ON pagamentos (vencimento);

CREATE TABLE documentos (
    id            TEXT PRIMARY KEY,
    cliente_id    TEXT NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,
    trabalho_id   TEXT REFERENCES trabalhos (id) ON DELETE SET NULL,
    categoria     TEXT NOT NULL,   -- contrato | autorizacao | comprovante | documento | orcamento | outro
    nome          TEXT NOT NULL,
    tipo          TEXT NOT NULL,
    tamanho       INTEGER NOT NULL,
    chave         TEXT NOT NULL,   -- onde o arquivo está no R2
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX documentos_cliente ON documentos (cliente_id);
CREATE INDEX documentos_trabalho ON documentos (trabalho_id);

CREATE TABLE compromissos (
    id            TEXT PRIMARY KEY,
    cliente_id    TEXT REFERENCES clientes (id) ON DELETE CASCADE,
    trabalho_id   TEXT REFERENCES trabalhos (id) ON DELETE CASCADE,
    titulo        TEXT NOT NULL,
    data          TEXT NOT NULL,
    hora          TEXT,
    feito         INTEGER NOT NULL DEFAULT 0,
    observacoes   TEXT,
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX compromissos_data ON compromissos (data);
CREATE INDEX compromissos_cliente ON compromissos (cliente_id);
CREATE INDEX compromissos_trabalho ON compromissos (trabalho_id);

-- Tentativas de senha erradas, pra travar quem tenta adivinhar.
CREATE TABLE tentativas (
    ip TEXT NOT NULL,
    em INTEGER NOT NULL
);
CREATE INDEX tentativas_ip ON tentativas (ip, em);
