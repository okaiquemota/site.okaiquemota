-- Contrato em PDF e financeiro.
-- Os seus dados de contratado (CPF ou CNPJ, endereço) e os prazos do contrato ficam aqui,
-- no banco, atrás da senha. Nunca no código, que é público no GitHub.

CREATE TABLE ajustes (
    chave         TEXT PRIMARY KEY,
    valor         TEXT NOT NULL,
    atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- o que muda no contrato de um trabalho em relação ao pacote (duração, equipe, fotos, prévia...), em JSON
ALTER TABLE trabalhos ADD COLUMN contrato_detalhes TEXT;

-- o financeiro soma os pagamentos pela data em que foram pagos
CREATE INDEX pagamentos_pago ON pagamentos (pago_em);
