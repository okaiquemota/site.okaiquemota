-- Terceiros: quem você contrata ou indica pra um trabalho (a Amanda no vídeo, um segundo fotógrafo,
-- um assistente) e quanto repassa pra cada um. "pago_em" é quando VOCÊ pagou o terceiro.
-- Valores em centavos, datas 'AAAA-MM-DD', como no resto do banco.

CREATE TABLE terceiros (
    id            TEXT PRIMARY KEY,
    trabalho_id   TEXT NOT NULL REFERENCES trabalhos (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL,
    servico       TEXT,
    valor         INTEGER NOT NULL,
    vencimento    TEXT,
    pago_em       TEXT,
    forma         TEXT,
    observacoes   TEXT,
    criado_em     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX terceiros_trabalho ON terceiros (trabalho_id);
CREATE INDEX terceiros_pago ON terceiros (pago_em);
