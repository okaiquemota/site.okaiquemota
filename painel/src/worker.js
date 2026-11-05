// -------------------------------------------------------------------------
// Painel do Kaique Mota: clientes, trabalhos, pagamentos, documentos e datas.
// Um Worker da Cloudflare só: serve as páginas (public/, empacotadas em src/arquivos.gerado.js)
// e a API (/api/*).
// Banco: D1 (env.DB). Arquivos: R2 (env.ARQUIVOS).
// Segredos (configurados na Cloudflare, nunca no código):
//   PAINEL_SENHA   a senha de entrar
//   SESSAO_SEGREDO assina o cookie da sessão (gerado sozinho no publicar)
// -------------------------------------------------------------------------

import PUBLICOS from "./arquivos.gerado.js"; // public/ empacotado (scripts/empacotar.mjs)

const SESSAO_DIAS = 30;
const COOKIE = "__Host-sessao";
const MAX_ARQUIVO = 25 * 1024 * 1024; // 25 MB por arquivo
const TENTATIVAS_POR_IP = 5; // senhas erradas em 15 minutos, por IP
const TENTATIVAS_TOTAL = 100; // senhas erradas em 1 hora, somando todo mundo

// Tipos de arquivo aceitos. O tipo servido vem daqui (pela extensão), nunca do navegador de quem mandou.
const TIPOS_ARQUIVO = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    txt: "text/plain; charset=utf-8",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
// esses abrem direto no navegador; o resto é baixado
const ABRE_NO_NAVEGADOR = new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt"]);

const STATUS = ["orcamento", "confirmado", "edicao", "entregue", "cancelado"];
const CONTRATO = ["a_enviar", "enviado", "assinado", "dispensado"];
const AUTORIZACAO = ["pendente", "sim", "nao"];
const CATEGORIAS = ["contrato", "autorizacao", "comprovante", "documento", "orcamento", "outro"];

const SEGURANCA = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000",
    "Cross-Origin-Opener-Policy": "same-origin",
};
const CSP =
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; " +
    "connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

// ---------- Respostas ----------

class Erro extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
    }
}

function json(dados, status = 200, extra = {}) {
    return new Response(JSON.stringify(dados), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEGURANCA, ...extra },
    });
}

// páginas, CSS, JS, fontes e ícones (de public/), com ETag pra o navegador não baixar de novo o que não mudou
const bytesPublicos = new Map();
function servirPublico(request, url) {
    const caminho = url.pathname === "/" ? "/index.html" : url.pathname;
    const arquivo = Object.hasOwn(PUBLICOS, caminho) ? PUBLICOS[caminho] : null;
    if (!arquivo) return new Response("Não encontrado.", { status: 404, headers: { ...SEGURANCA, "Content-Type": "text/plain; charset=utf-8" } });
    const html = arquivo.tipo.startsWith("text/html");
    const headers = {
        ...SEGURANCA,
        "Content-Type": arquivo.tipo,
        ETag: arquivo.etag,
        // fontes e ícones quase nunca mudam; o resto o navegador confere a cada vez (pelo ETag)
        "Cache-Control": /^(font|image\/png)/.test(arquivo.tipo) ? "public, max-age=604800" : "no-cache",
    };
    if (html) headers["Content-Security-Policy"] = CSP;
    if (request.headers.get("If-None-Match") === arquivo.etag) return new Response(null, { status: 304, headers });
    let bytes = bytesPublicos.get(caminho);
    if (!bytes) {
        bytes = Uint8Array.from(atob(arquivo.b64), (c) => c.charCodeAt(0));
        bytesPublicos.set(caminho, bytes);
    }
    return new Response(request.method === "HEAD" ? null : bytes, { headers });
}

// ---------- Utilidades ----------

const codificador = new TextEncoder();

function b64url(bytes) {
    let s = "";
    for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(segredo, texto) {
    const chave = await crypto.subtle.importKey("raw", codificador.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", chave, codificador.encode(texto)));
}

function iguais(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
    let d = 0;
    for (let i = 0; i < a.byteLength; i++) d |= a[i] ^ b[i];
    return d === 0;
}

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const digitos = (s) => String(s ?? "").replace(/\D/g, "");
const novoId = () => crypto.randomUUID();
const agoraIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function dataValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function hojeDe(url) {
    const h = url.searchParams.get("hoje");
    if (h && dataValida(h)) return h;
    // sem a data do navegador, usa o dia em São Paulo
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// ---------- Validação dos campos ----------

const regra = {
    texto: (max, obrigatorio = false) => (x, rotulo) => {
        if (x === undefined || x === null) x = "";
        if (typeof x !== "string") throw new Erro(400, `${rotulo}: valor inválido.`);
        x = x.trim();
        if (!x) {
            if (obrigatorio) throw new Erro(400, `Preencha: ${rotulo}.`);
            return null;
        }
        if (x.length > max) throw new Erro(400, `${rotulo}: no máximo ${max} caracteres.`);
        return x;
    },
    data: (obrigatorio = false) => (x, rotulo) => {
        if (x === undefined || x === null || x === "") {
            if (obrigatorio) throw new Erro(400, `Preencha: ${rotulo}.`);
            return null;
        }
        if (typeof x !== "string" || !dataValida(x)) throw new Erro(400, `${rotulo}: data inválida.`);
        return x;
    },
    hora: () => (x, rotulo) => {
        if (x === undefined || x === null || x === "") return null;
        if (typeof x !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x)) throw new Erro(400, `${rotulo}: hora inválida.`);
        return x;
    },
    centavos: (obrigatorio = false) => (x, rotulo) => {
        if (x === undefined || x === null || x === "") {
            if (obrigatorio) throw new Erro(400, `Preencha: ${rotulo}.`);
            return 0;
        }
        if (!Number.isInteger(x) || x < 0 || x > 100_000_000_00) throw new Erro(400, `${rotulo}: valor inválido.`);
        if (obrigatorio && x === 0) throw new Erro(400, `${rotulo}: tem que ser maior que zero.`);
        return x;
    },
    opcao: (lista) => (x, rotulo) => {
        if (x === undefined || x === null || x === "") return lista[0];
        if (!lista.includes(x)) throw new Erro(400, `${rotulo}: opção inválida.`);
        return x;
    },
    email: () => (x, rotulo) => {
        const v = regra.texto(160)(x, rotulo);
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Erro(400, `${rotulo}: e-mail inválido.`);
        return v;
    },
    link: () => (x, rotulo) => {
        const v = regra.texto(600)(x, rotulo);
        if (!v) return null;
        let u;
        try {
            u = new URL(v);
        } catch {
            throw new Erro(400, `${rotulo}: link inválido.`);
        }
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Erro(400, `${rotulo}: o link tem que começar com https://.`);
        return u.toString();
    },
    id: (obrigatorio = false) => (x, rotulo) => {
        if (x === undefined || x === null || x === "") {
            if (obrigatorio) throw new Erro(400, `Falta: ${rotulo}.`);
            return null;
        }
        if (typeof x !== "string" || !/^[0-9a-f-]{36}$/.test(x)) throw new Erro(400, `${rotulo}: inválido.`);
        return x;
    },
    sim_nao: () => (x) => (x ? 1 : 0),
    // número de dias (prazos do contrato), de 0 a 365; vazio volta pro padrão
    dias: () => (x, rotulo) => {
        if (x === undefined || x === null || x === "") return null;
        const n = typeof x === "number" ? x : /^\d{1,3}$/.test(String(x).trim()) ? Number(String(x).trim()) : NaN;
        if (!Number.isInteger(n) || n < 0 || n > 365) throw new Erro(400, `${rotulo}: escreva um número de dias, de 0 a 365.`);
        return String(n);
    },
    // o que muda no contrato de um trabalho em relação ao pacote; vazio usa o do pacote
    detalhes: () => (x, rotulo) => {
        if (x === undefined || x === null || x === "") return null;
        if (typeof x !== "object" || Array.isArray(x)) throw new Erro(400, `${rotulo}: inválido.`);
        const saida = {};
        for (const [chave, valor] of Object.entries(x)) {
            const campo = DETALHES_CONTRATO[chave];
            if (!campo) throw new Erro(400, `${rotulo}: campo desconhecido.`);
            const v = campo[1](valor, campo[0]);
            if (v) saida[chave] = v;
        }
        return Object.keys(saida).length ? JSON.stringify(saida) : null;
    },
};

const DETALHES_CONTRATO = {
    duracao: ["Duração", regra.texto(120)],
    equipe: ["Equipe", regra.texto(80)],
    fotos: ["Fotos editadas", regra.texto(80)],
    previa: ["Prévia", regra.texto(120)],
    extra: ["Ensaio extra", regra.texto(200)],
    hora_adicional: ["Hora adicional", regra.centavos()],
    forma: ["Forma de pagamento", regra.texto(120)],
    deslocamento: ["Deslocamento", regra.texto(160)],
    data_contrato: ["Data do contrato", regra.data()],
};

// Os seus dados de contratado e os prazos do contrato (ficam no banco, nunca no código)
const AJUSTES = {
    nome: ["Seu nome no contrato", regra.texto(120)],
    documento: ["Seu CPF ou CNPJ", regra.texto(30)],
    endereco: ["Seu endereço", regra.texto(300)],
    telefone: ["Seu telefone", regra.texto(30)],
    forma: ["Formas de pagamento", regra.texto(120)],
    deslocamento: ["Deslocamento para outras cidades", regra.texto(160)],
    dias_roteiro: ["Roteiro do dia", regra.dias()],
    dias_hora_adicional: ["Pagar a hora adicional", regra.dias()],
    dias_remarcacao: ["Remarcação", regra.dias()],
    dias_devolucao: ["Devolução", regra.dias()],
};

// Campos de cada tabela: [rótulo, regra]. Os marcados como "pai" só entram ao criar.
const TABELAS = {
    clientes: {
        campos: {
            nome: ["Nome", regra.texto(120, true)],
            telefone: ["Telefone", regra.texto(30)],
            email: ["E-mail", regra.email()],
            instagram: ["Instagram", regra.texto(60)],
            cpf: ["CPF", regra.texto(20)],
            rg: ["RG", regra.texto(30)],
            nascimento: ["Nascimento", regra.data()],
            endereco: ["Endereço", regra.texto(300)],
            cidade: ["Cidade", regra.texto(80)],
            origem: ["Como conheceu", regra.texto(60)],
            observacoes: ["Observações", regra.texto(5000)],
        },
    },
    trabalhos: {
        pai: "cliente_id",
        campos: {
            cliente_id: ["Cliente", regra.id(true)],
            tipo: ["Tipo", regra.texto(40, true)],
            titulo: ["Título", regra.texto(120)],
            data: ["Data", regra.data()],
            hora: ["Hora", regra.hora()],
            local: ["Local", regra.texto(200)],
            pacote: ["Pacote", regra.texto(80)],
            valor: ["Valor", regra.centavos()],
            status: ["Situação", regra.opcao(STATUS)],
            contrato: ["Contrato", regra.opcao(CONTRATO)],
            autorizacao: ["Autorização de imagem", regra.opcao(AUTORIZACAO)],
            prazo_entrega: ["Prazo de entrega", regra.data()],
            entregue_em: ["Entregue em", regra.data()],
            galeria: ["Link da galeria", regra.link()],
            observacoes: ["Observações", regra.texto(5000)],
            contrato_detalhes: ["Detalhes do contrato", regra.detalhes()],
        },
    },
    pagamentos: {
        pai: "trabalho_id",
        campos: {
            trabalho_id: ["Trabalho", regra.id(true)],
            descricao: ["Descrição", regra.texto(80, true)],
            valor: ["Valor", regra.centavos(true)],
            vencimento: ["Vencimento", regra.data()],
            pago_em: ["Pago em", regra.data()],
            forma: ["Forma de pagamento", regra.texto(30)],
        },
    },
    compromissos: {
        campos: {
            cliente_id: ["Cliente", regra.id()],
            trabalho_id: ["Trabalho", regra.id()],
            titulo: ["Título", regra.texto(120, true)],
            data: ["Data", regra.data(true)],
            hora: ["Hora", regra.hora()],
            feito: ["Feito", regra.sim_nao()],
            observacoes: ["Observações", regra.texto(2000)],
        },
    },
};

// criando: valida todos os campos; editando: só os que vieram (menos o "pai", que não muda)
function validar(tabela, corpo, criando) {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Erro(400, "Dados inválidos.");
    const { campos, pai } = TABELAS[tabela];
    const saida = {};
    for (const [campo, [rotulo, valida]] of Object.entries(campos)) {
        if (!criando && (campo === pai || !(campo in corpo))) continue;
        saida[campo] = valida(corpo[campo], rotulo);
    }
    return saida;
}

function textoBusca(c) {
    return [semAcento(c.nome), semAcento(c.email), semAcento(c.instagram), digitos(c.cpf), digitos(c.telefone)].filter(Boolean).join(" ");
}

// ---------- Sessão ----------

function configurado(env) {
    return Boolean(env.PAINEL_SENHA && env.SESSAO_SEGREDO);
}

// muda quando a senha muda: trocar a senha derruba todas as sessões abertas
async function versaoSenha(env) {
    return b64url((await hmac(env.SESSAO_SEGREDO, "senha:" + env.PAINEL_SENHA)).slice(0, 9));
}

async function criarSessao(env) {
    const expira = Math.floor(Date.now() / 1000) + SESSAO_DIAS * 86400;
    const base = `${expira}.${await versaoSenha(env)}`;
    return `${base}.${b64url(await hmac(env.SESSAO_SEGREDO, base))}`;
}

// devolve quando a sessão expira (em segundos) ou false
async function sessaoValida(request, env) {
    if (!configurado(env)) return false;
    const cookies = request.headers.get("Cookie") || "";
    const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
    if (!m) return false;
    const partes = m[1].split(".");
    if (partes.length !== 3) return false;
    const [expira, versao, assinatura] = partes;
    if (!/^\d+$/.test(expira) || Number(expira) < Date.now() / 1000) return false;
    if (versao !== (await versaoSenha(env))) return false;
    const esperado = b64url(await hmac(env.SESSAO_SEGREDO, `${expira}.${versao}`));
    return iguais(codificador.encode(assinatura), codificador.encode(esperado)) ? Number(expira) : false;
}

function cookieSessao(valor, segundos) {
    return `${COOKIE}=${valor}; Path=/; Max-Age=${segundos}; HttpOnly; Secure; SameSite=Strict`;
}

async function entrar(request, env) {
    if (!configurado(env)) throw new Erro(503, "O painel ainda não tem senha. Veja o README do painel.");
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    const agora = Math.floor(Date.now() / 1000);
    await env.DB.prepare("DELETE FROM tentativas WHERE em < ?").bind(agora - 3600).run();
    const conta = await env.DB.prepare(
        "SELECT (SELECT COUNT(*) FROM tentativas WHERE ip = ?1 AND em > ?2) AS do_ip, (SELECT COUNT(*) FROM tentativas) AS total",
    )
        .bind(ip, agora - 900)
        .first();
    if (conta.do_ip >= TENTATIVAS_POR_IP || conta.total >= TENTATIVAS_TOTAL) {
        throw new Erro(429, "Muitas tentativas com a senha errada. Espere 15 minutos e tente de novo.");
    }

    let corpo;
    try {
        corpo = await request.json();
    } catch {
        throw new Erro(400, "Dados inválidos.");
    }
    const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
    const certo = await hmac(env.SESSAO_SEGREDO, "conferir:" + env.PAINEL_SENHA);
    const tentou = await hmac(env.SESSAO_SEGREDO, "conferir:" + senha);
    if (!senha || !iguais(certo, tentou)) {
        await env.DB.prepare("INSERT INTO tentativas (ip, em) VALUES (?, ?)").bind(ip, agora).run();
        throw new Erro(401, "Senha errada.");
    }
    await env.DB.prepare("DELETE FROM tentativas WHERE ip = ?").bind(ip).run();
    return json({ ok: true }, 200, { "Set-Cookie": cookieSessao(await criarSessao(env), SESSAO_DIAS * 86400) });
}

// ---------- Banco ----------

async function lerCorpo(request) {
    try {
        return await request.json();
    } catch {
        throw new Erro(400, "Dados inválidos.");
    }
}

async function existe(env, tabela, id) {
    return Boolean(await env.DB.prepare(`SELECT 1 FROM ${tabela} WHERE id = ?`).bind(id).first());
}

async function buscar(env, tabela, id) {
    const linha = await env.DB.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).bind(id).first();
    if (!linha) throw new Erro(404, "Não encontrado.");
    if (tabela === "clientes") delete linha.busca;
    return linha;
}

async function inserir(env, tabela, dados) {
    const id = novoId();
    const linha = { id, ...dados };
    if (tabela === "clientes") linha.busca = textoBusca(linha);
    const cols = Object.keys(linha);
    await env.DB.prepare(`INSERT INTO ${tabela} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
        .bind(...cols.map((c) => linha[c]))
        .run();
    return buscar(env, tabela, id);
}

async function atualizar(env, tabela, id, dados) {
    const atual = await buscar(env, tabela, id);
    if (tabela === "clientes") dados.busca = textoBusca({ ...atual, ...dados });
    const cols = Object.keys(dados);
    if (cols.length) {
        await env.DB.prepare(`UPDATE ${tabela} SET ${cols.map((c) => `${c} = ?`).join(", ")}, atualizado_em = ? WHERE id = ?`)
            .bind(...cols.map((c) => dados[c]), agoraIso(), id)
            .run();
    }
    return buscar(env, tabela, id);
}

async function apagarArquivos(env, chaves) {
    for (let i = 0; i < chaves.length; i += 1000) await env.ARQUIVOS.delete(chaves.slice(i, i + 1000));
}

// ---------- Rotas ----------

async function listarClientes(env, url) {
    const hoje = hojeDe(url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const escapar = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);
    const termo = q ? `%${escapar(semAcento(q))}%` : "";
    const nums = digitos(q);
    const termoNum = nums.length >= 3 ? `%${nums}%` : "";
    const { results } = await env.DB.prepare(
        `SELECT c.id, c.nome, c.telefone, c.email, c.instagram, c.cidade,
            (SELECT COUNT(*) FROM trabalhos t WHERE t.cliente_id = c.id AND t.status != 'cancelado') AS trabalhos,
            (SELECT MIN(t.data) FROM trabalhos t WHERE t.cliente_id = c.id AND t.data >= ?1 AND t.status IN ('orcamento', 'confirmado')) AS proximo
         FROM clientes c
         WHERE ?2 = '' OR c.busca LIKE ?2 ESCAPE '\\' OR (?3 != '' AND c.busca LIKE ?3)
         LIMIT 1000`,
    )
        .bind(hoje, termo, termoNum)
        .all();
    results.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    return json({ clientes: results });
}

async function verCliente(env, id) {
    const cliente = await buscar(env, "clientes", id);
    const [trabalhos, documentos, compromissos] = await env.DB.batch([
        env.DB.prepare(
            `SELECT t.*,
                (SELECT COALESCE(SUM(p.valor), 0) FROM pagamentos p WHERE p.trabalho_id = t.id AND p.pago_em IS NOT NULL) AS recebido
             FROM trabalhos t WHERE t.cliente_id = ? ORDER BY t.data IS NULL, t.data DESC`,
        ).bind(id),
        env.DB.prepare("SELECT * FROM documentos WHERE cliente_id = ? ORDER BY criado_em DESC").bind(id),
        env.DB.prepare("SELECT * FROM compromissos WHERE cliente_id = ? ORDER BY feito, data, hora").bind(id),
    ]);
    return json({ cliente, trabalhos: trabalhos.results, documentos: documentos.results, compromissos: compromissos.results });
}

async function verTrabalho(env, id) {
    const trabalho = await buscar(env, "trabalhos", id);
    const [cliente, pagamentos, documentos, compromissos] = await env.DB.batch([
        env.DB.prepare("SELECT id, nome, telefone, email, cpf, endereco, cidade FROM clientes WHERE id = ?").bind(trabalho.cliente_id),
        env.DB.prepare("SELECT * FROM pagamentos WHERE trabalho_id = ? ORDER BY vencimento IS NULL, vencimento, criado_em").bind(id),
        env.DB.prepare("SELECT * FROM documentos WHERE trabalho_id = ? ORDER BY criado_em DESC").bind(id),
        env.DB.prepare("SELECT * FROM compromissos WHERE trabalho_id = ? ORDER BY feito, data, hora").bind(id),
    ]);
    return json({
        trabalho,
        cliente: cliente.results[0],
        pagamentos: pagamentos.results,
        documentos: documentos.results,
        compromissos: compromissos.results,
    });
}

async function resumo(env, url) {
    const hoje = hojeDe(url);
    const ano = hoje.slice(0, 4);
    const [proximos, receber, totais, entregas, pendencias, compromissos, numeros] = await env.DB.batch([
        env.DB.prepare(
            `SELECT t.id, t.tipo, t.titulo, t.data, t.hora, t.local, t.status, c.id AS cliente_id, c.nome AS cliente
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id
             WHERE t.data >= ?1 AND t.status IN ('orcamento', 'confirmado')
             ORDER BY t.data, t.hora LIMIT 60`,
        ).bind(hoje),
        env.DB.prepare(
            `SELECT p.id, p.descricao, p.valor, p.vencimento, t.id AS trabalho_id, t.tipo, t.titulo, t.data, c.nome AS cliente
             FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id JOIN clientes c ON c.id = t.cliente_id
             WHERE p.pago_em IS NULL AND t.status != 'cancelado'
             ORDER BY p.vencimento IS NULL, p.vencimento LIMIT 60`,
        ),
        env.DB.prepare(
            `SELECT COALESCE(SUM(p.valor), 0) AS aberto,
                    COALESCE(SUM(CASE WHEN p.vencimento < ?1 THEN p.valor END), 0) AS vencido,
                    COUNT(*) AS quantos
             FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id
             WHERE p.pago_em IS NULL AND t.status != 'cancelado'`,
        ).bind(hoje),
        env.DB.prepare(
            `SELECT t.id, t.tipo, t.titulo, t.data, t.prazo_entrega, t.status, c.nome AS cliente
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id
             WHERE t.entregue_em IS NULL AND (t.status = 'edicao' OR (t.status = 'confirmado' AND t.data < ?1))
             ORDER BY t.prazo_entrega IS NULL, t.prazo_entrega, t.data LIMIT 60`,
        ).bind(hoje),
        env.DB.prepare(
            `SELECT t.id, t.tipo, t.titulo, t.data, t.contrato, t.autorizacao, c.nome AS cliente
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id
             WHERE t.status IN ('confirmado', 'edicao', 'entregue')
               AND (t.contrato IN ('a_enviar', 'enviado') OR t.autorizacao = 'pendente')
             ORDER BY t.data IS NULL, t.data LIMIT 60`,
        ),
        env.DB.prepare(
            `SELECT k.id, k.titulo, k.data, k.hora, k.feito, k.observacoes, k.cliente_id, k.trabalho_id, c.nome AS cliente
             FROM compromissos k LEFT JOIN clientes c ON c.id = k.cliente_id
             WHERE k.feito = 0 AND k.data <= date(?1, '+14 days')
             ORDER BY k.data, k.hora LIMIT 60`,
        ).bind(hoje),
        env.DB.prepare(
            `SELECT (SELECT COUNT(*) FROM clientes) AS clientes,
                    (SELECT COUNT(*) FROM trabalhos WHERE status != 'cancelado' AND substr(data, 1, 4) = ?1) AS trabalhos_ano,
                    (SELECT COALESCE(SUM(valor), 0) FROM pagamentos WHERE substr(pago_em, 1, 4) = ?1) AS recebido_ano`,
        ).bind(ano),
    ]);
    return json({
        hoje,
        proximos: proximos.results,
        receber: receber.results,
        totais: totais.results[0],
        entregas: entregas.results,
        pendencias: pendencias.results,
        compromissos: compromissos.results,
        numeros: numeros.results[0],
    });
}

async function agenda(env, url) {
    const de = url.searchParams.get("de");
    const ate = url.searchParams.get("ate");
    if (!dataValida(de || "") || !dataValida(ate || "") || de > ate) throw new Erro(400, "Período inválido.");
    const [trabalhos, entregas, pagamentos, compromissos, nascimentos] = await env.DB.batch([
        env.DB.prepare(
            `SELECT t.id, t.data AS dia, t.hora, t.tipo, t.titulo, t.status, t.local, c.id AS cliente_id, c.nome AS cliente
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id
             WHERE t.data BETWEEN ?1 AND ?2 AND t.status != 'cancelado'`,
        ).bind(de, ate),
        env.DB.prepare(
            `SELECT t.id, t.prazo_entrega AS dia, t.tipo, t.titulo, c.id AS cliente_id, c.nome AS cliente
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id
             WHERE t.prazo_entrega BETWEEN ?1 AND ?2 AND t.entregue_em IS NULL AND t.status IN ('confirmado', 'edicao')`,
        ).bind(de, ate),
        env.DB.prepare(
            `SELECT p.id, p.vencimento AS dia, p.descricao, p.valor, t.id AS trabalho_id, t.tipo, t.titulo, c.nome AS cliente
             FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id JOIN clientes c ON c.id = t.cliente_id
             WHERE p.vencimento BETWEEN ?1 AND ?2 AND p.pago_em IS NULL AND t.status != 'cancelado'`,
        ).bind(de, ate),
        env.DB.prepare(
            `SELECT k.id, k.data AS dia, k.data, k.hora, k.titulo, k.feito, k.observacoes, k.cliente_id, k.trabalho_id, c.nome AS cliente
             FROM compromissos k LEFT JOIN clientes c ON c.id = k.cliente_id
             WHERE k.data BETWEEN ?1 AND ?2`,
        ).bind(de, ate),
        env.DB.prepare("SELECT id, nome, nascimento FROM clientes WHERE nascimento IS NOT NULL"),
    ]);

    // aniversários dos clientes que caem no período (o ano muda, o dia e o mês não)
    const aniversarios = [];
    const inicio = new Date(de + "T00:00:00Z");
    const fim = new Date(ate + "T00:00:00Z");
    for (const c of nascimentos.results) {
        for (let ano = inicio.getUTCFullYear(); ano <= fim.getUTCFullYear(); ano++) {
            let dia = `${ano}${c.nascimento.slice(4)}`;
            if (!dataValida(dia) && c.nascimento.slice(5) === "02-29") dia = `${ano}-02-28`;
            if (dataValida(dia) && dia >= de && dia <= ate) {
                aniversarios.push({ id: c.id, dia, cliente_id: c.id, cliente: c.nome, idade: ano - Number(c.nascimento.slice(0, 4)) });
            }
        }
    }
    return json({
        trabalhos: trabalhos.results,
        entregas: entregas.results,
        pagamentos: pagamentos.results,
        compromissos: compromissos.results,
        aniversarios,
    });
}

async function criar(env, tabela, request) {
    const dados = validar(tabela, await lerCorpo(request), true);
    if (tabela === "trabalhos" && !(await existe(env, "clientes", dados.cliente_id))) throw new Erro(400, "Cliente não encontrado.");
    if (tabela === "pagamentos" && !(await existe(env, "trabalhos", dados.trabalho_id))) throw new Erro(400, "Trabalho não encontrado.");
    if (tabela === "compromissos") await ligarCompromisso(env, dados);
    return json(await inserir(env, tabela, dados), 201);
}

async function editar(env, tabela, id, request) {
    const dados = validar(tabela, await lerCorpo(request), false);
    if (tabela === "compromissos" && ("cliente_id" in dados || "trabalho_id" in dados)) await ligarCompromisso(env, dados);
    return json(await atualizar(env, tabela, id, dados));
}

// compromisso de um trabalho fica também na ficha do cliente dele
async function ligarCompromisso(env, dados) {
    if (dados.trabalho_id) {
        const t = await env.DB.prepare("SELECT cliente_id FROM trabalhos WHERE id = ?").bind(dados.trabalho_id).first();
        if (!t) throw new Erro(400, "Trabalho não encontrado.");
        dados.cliente_id = t.cliente_id;
    } else if (dados.cliente_id && !(await existe(env, "clientes", dados.cliente_id))) {
        throw new Erro(400, "Cliente não encontrado.");
    }
}

async function apagar(env, tabela, id) {
    await buscar(env, tabela, id);
    if (tabela === "clientes") {
        const { results } = await env.DB.prepare("SELECT chave FROM documentos WHERE cliente_id = ?").bind(id).all();
        await apagarArquivos(env, results.map((r) => r.chave));
    }
    await env.DB.prepare(`DELETE FROM ${tabela} WHERE id = ?`).bind(id).run();
    return json({ ok: true });
}

// ---------- Documentos ----------

async function enviarDocumento(env, request, url) {
    const p = url.searchParams;
    const clienteId = regra.id(true)(p.get("cliente_id"), "Cliente");
    const trabalhoId = regra.id()(p.get("trabalho_id"), "Trabalho");
    const categoria = regra.opcao(CATEGORIAS)(p.get("categoria"), "Categoria");
    const nome = regra.texto(180, true)(p.get("nome"), "Nome do arquivo");
    const extensao = (nome.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
    const tipo = TIPOS_ARQUIVO[extensao];
    if (!tipo) throw new Erro(400, "Tipo de arquivo não aceito. Use PDF, foto (JPG, PNG, WEBP, HEIC), Word, Excel ou TXT.");
    const tamanho = Number(request.headers.get("Content-Length"));
    if (!Number.isInteger(tamanho) || tamanho <= 0) throw new Erro(400, "Arquivo vazio.");
    if (tamanho > MAX_ARQUIVO) throw new Erro(413, "Arquivo grande demais: o máximo é 25 MB.");
    if (!(await existe(env, "clientes", clienteId))) throw new Erro(400, "Cliente não encontrado.");
    if (trabalhoId) {
        const t = await env.DB.prepare("SELECT cliente_id FROM trabalhos WHERE id = ?").bind(trabalhoId).first();
        if (!t || t.cliente_id !== clienteId) throw new Erro(400, "Trabalho não encontrado.");
    }

    const id = novoId();
    const chave = `clientes/${clienteId}/${id}`;
    const salvo = await env.ARQUIVOS.put(chave, request.body, { httpMetadata: { contentType: tipo } });
    if (!salvo) throw new Erro(500, "Não deu pra guardar o arquivo.");
    await env.DB.prepare(
        "INSERT INTO documentos (id, cliente_id, trabalho_id, categoria, nome, tipo, tamanho, chave) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
        .bind(id, clienteId, trabalhoId, categoria, nome, tipo, salvo.size, chave)
        .run();
    return json(await buscar(env, "documentos", id), 201);
}

function nomeNoCabecalho(nome) {
    const simples = nome.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "arquivo";
    return `filename="${simples}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

async function abrirDocumento(env, id, url) {
    const doc = await buscar(env, "documentos", id);
    const arquivo = await env.ARQUIVOS.get(doc.chave);
    if (!arquivo) throw new Erro(404, "O arquivo não está mais guardado.");
    const extensao = (doc.nome.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
    const modo = ABRE_NO_NAVEGADOR.has(extensao) && url.searchParams.get("baixar") !== "1" ? "inline" : "attachment";
    return new Response(arquivo.body, {
        headers: {
            ...SEGURANCA,
            "X-Frame-Options": "SAMEORIGIN",
            "Content-Type": doc.tipo,
            "Content-Length": String(arquivo.size),
            "Content-Disposition": `${modo}; ${nomeNoCabecalho(doc.nome)}`,
            "Cache-Control": "private, no-store",
        },
    });
}

async function editarDocumento(env, id, request) {
    const doc = await buscar(env, "documentos", id);
    const corpo = await lerCorpo(request);
    const dados = {};
    if ("categoria" in corpo) dados.categoria = regra.opcao(CATEGORIAS)(corpo.categoria, "Categoria");
    if ("nome" in corpo) {
        const nome = regra.texto(180, true)(corpo.nome, "Nome do arquivo");
        // mantém a extensão: é ela que diz como o arquivo abre
        const ext = doc.nome.match(/\.[a-z0-9]+$/i)?.[0] || "";
        dados.nome = ext && !nome.toLowerCase().endsWith(ext.toLowerCase()) ? nome + ext : nome;
    }
    if ("trabalho_id" in corpo) {
        dados.trabalho_id = regra.id()(corpo.trabalho_id, "Trabalho");
        if (dados.trabalho_id) {
            const t = await env.DB.prepare("SELECT cliente_id FROM trabalhos WHERE id = ?").bind(dados.trabalho_id).first();
            if (!t || t.cliente_id !== doc.cliente_id) throw new Erro(400, "Trabalho não encontrado.");
        }
    }
    return json(await atualizar(env, "documentos", id, dados));
}

async function apagarDocumento(env, id) {
    const doc = await buscar(env, "documentos", id);
    await env.ARQUIVOS.delete(doc.chave);
    await env.DB.prepare("DELETE FROM documentos WHERE id = ?").bind(id).run();
    return json({ ok: true });
}

// ---------- Seus dados do contrato ----------

async function verAjustes(env) {
    const { results } = await env.DB.prepare("SELECT chave, valor FROM ajustes").all();
    const saida = {};
    for (const { chave, valor } of results) if (Object.hasOwn(AJUSTES, chave)) saida[chave] = valor;
    return saida;
}

async function salvarAjustes(env, request) {
    const corpo = await lerCorpo(request);
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new Erro(400, "Dados inválidos.");
    const comandos = [];
    for (const [chave, valor] of Object.entries(corpo)) {
        if (!Object.hasOwn(AJUSTES, chave)) throw new Erro(400, "Campo desconhecido.");
        const [rotulo, valida] = AJUSTES[chave];
        const v = valida(valor, rotulo);
        comandos.push(
            v === null
                ? env.DB.prepare("DELETE FROM ajustes WHERE chave = ?").bind(chave)
                : env.DB.prepare(
                      `INSERT INTO ajustes (chave, valor) VALUES (?1, ?2)
                       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
                  ).bind(chave, v),
        );
    }
    if (comandos.length) await env.DB.batch(comandos);
    return json(await verAjustes(env));
}

// ---------- Financeiro ----------

function anoDe(url, hoje) {
    const a = url.searchParams.get("ano") || hoje.slice(0, 4);
    if (!/^\d{4}$/.test(a) || a < "2000" || a > "2100") throw new Erro(400, "Ano inválido.");
    return a;
}

// os pagamentos recebidos no ano, do mais novo pro mais antigo
const SQL_RECEBIDOS = `SELECT p.id, p.descricao, p.valor, p.forma, p.pago_em, t.id AS trabalho_id, t.tipo, t.titulo, t.pacote,
                              c.id AS cliente_id, c.nome AS cliente, c.cpf
                       FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id JOIN clientes c ON c.id = t.cliente_id
                       WHERE p.pago_em BETWEEN ?1 || '-01-01' AND ?1 || '-12-31'
                       ORDER BY p.pago_em DESC, p.criado_em DESC`;

// trabalhos fechados (confirmados, em edição ou entregues) com data no ano; sem data, conta o ano em que foi criado
const FECHADOS_NO_ANO = `t.status IN ('confirmado', 'edicao', 'entregue') AND substr(COALESCE(t.data, t.criado_em), 1, 4) = ?1`;

async function financeiro(env, url) {
    const hoje = hojeDe(url);
    const ano = anoDe(url, hoje);
    const anterior = String(Number(ano) - 1);
    // o ano anterior até o mesmo dia (no ano corrente) ou inteiro (nos outros)
    const ateAnterior = ano === hoje.slice(0, 4) ? anterior + hoje.slice(4) : anterior + "-12-31";
    const [recebidos, aReceber, totais, porTipo, porOrigem, orcamentos] = await env.DB.batch([
        env.DB.prepare(SQL_RECEBIDOS).bind(ano),
        env.DB.prepare(
            `SELECT substr(p.vencimento, 6, 2) AS mes, SUM(p.valor) AS valor
             FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id
             WHERE p.pago_em IS NULL AND t.status != 'cancelado' AND substr(p.vencimento, 1, 4) = ?1
             GROUP BY mes`,
        ).bind(ano),
        env.DB.prepare(
            `SELECT COALESCE(SUM(p.valor), 0) AS aberto,
                    COALESCE(SUM(CASE WHEN p.vencimento < ?1 THEN p.valor END), 0) AS vencido,
                    COALESCE(SUM(CASE WHEN p.vencimento IS NULL THEN p.valor END), 0) AS sem_vencimento,
                    (SELECT COALESCE(SUM(valor), 0) FROM pagamentos WHERE pago_em BETWEEN ?2 || '-01-01' AND ?3) AS anterior
             FROM pagamentos p JOIN trabalhos t ON t.id = p.trabalho_id
             WHERE p.pago_em IS NULL AND t.status != 'cancelado'`,
        ).bind(hoje, anterior, ateAnterior),
        env.DB.prepare(
            `SELECT t.tipo AS nome, COUNT(*) AS quantos, COALESCE(SUM(t.valor), 0) AS valor
             FROM trabalhos t WHERE ${FECHADOS_NO_ANO}
             GROUP BY t.tipo ORDER BY valor DESC, quantos DESC`,
        ).bind(ano),
        env.DB.prepare(
            `SELECT COALESCE(NULLIF(TRIM(c.origem), ''), 'Não informado') AS nome, COUNT(*) AS quantos, COALESCE(SUM(t.valor), 0) AS valor
             FROM trabalhos t JOIN clientes c ON c.id = t.cliente_id WHERE ${FECHADOS_NO_ANO}
             GROUP BY 1 ORDER BY valor DESC, quantos DESC`,
        ).bind(ano),
        env.DB.prepare(
            `SELECT COUNT(*) AS quantos, COALESCE(SUM(valor), 0) AS valor FROM trabalhos t
             WHERE t.status = 'orcamento' AND substr(COALESCE(t.data, t.criado_em), 1, 4) = ?1`,
        ).bind(ano),
    ]);
    return json({
        ano,
        hoje,
        recebidos: recebidos.results,
        a_receber: aReceber.results,
        totais: totais.results[0],
        por_tipo: porTipo.results,
        por_origem: porOrigem.results,
        orcamentos: orcamentos.results[0],
    });
}

// a planilha dos recebimentos do ano (pro imposto de renda / carnê-leão): abre no Excel e no Google Planilhas
function celulaCsv(v) {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // não deixa a planilha ler o texto como fórmula
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function planilha(env, url) {
    const ano = anoDe(url, hojeDe(url));
    const { results } = await env.DB.prepare(SQL_RECEBIDOS).bind(ano).all();
    const linhas = [["Data do pagamento", "Cliente", "CPF", "Trabalho", "Tipo", "Pacote", "Descrição", "Forma de pagamento", "Valor (R$)"]];
    for (const p of [...results].reverse()) {
        const d = p.pago_em;
        linhas.push([
            `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`,
            p.cliente,
            p.cpf,
            p.titulo || p.tipo,
            p.tipo,
            p.pacote,
            p.descricao,
            p.forma,
            (p.valor / 100).toFixed(2).replace(".", ","),
        ]);
    }
    const texto = "﻿" + linhas.map((l) => l.map(celulaCsv).join(";")).join("\r\n") + "\r\n";
    return new Response(texto, {
        headers: {
            ...SEGURANCA,
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Disposition": `attachment; filename="recebimentos-${ano}.csv"`,
        },
    });
}

// ---------- Cópia de segurança ----------

async function backup(env) {
    const tabelas = ["clientes", "trabalhos", "pagamentos", "documentos", "compromissos", "ajustes"];
    const resultados = await env.DB.batch(tabelas.map((t) => env.DB.prepare(`SELECT * FROM ${t}`)));
    const dados = { gerado_em: agoraIso(), aviso: "Os arquivos (PDFs e fotos) não vão neste backup: ficam guardados no R2." };
    tabelas.forEach((t, i) => {
        dados[t] = resultados[i].results.map((linha) => {
            delete linha.busca;
            return linha;
        });
    });
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    return json(dados, 200, { "Content-Disposition": `attachment; filename="painel-backup-${dia}.json"` });
}

// ---------- Roteador ----------

const ROTAS_TABELA = { clientes: "clientes", trabalhos: "trabalhos", pagamentos: "pagamentos", compromissos: "compromissos" };

async function api(request, env, url) {
    const metodo = request.method;
    const caminho = url.pathname.replace(/\/+$/, "");

    // pedidos que mudam algo só valem vindos do próprio painel
    if (metodo !== "GET" && metodo !== "HEAD" && request.headers.get("Origin") !== url.origin) {
        throw new Erro(403, "Pedido recusado.");
    }

    if (caminho === "/api/entrar" && metodo === "POST") return entrar(request, env);
    if (caminho === "/api/sair" && metodo === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookieSessao("", 0) });

    const expira = await sessaoValida(request, env);
    if (!expira) {
        throw new Erro(401, configurado(env) ? "Entre com a senha." : "O painel ainda não tem senha. Veja o README do painel.");
    }
    const resposta = await rotasComSessao(request, env, url, metodo, caminho);
    // quem usa o painel não é desconectado no meio do trabalho: faltando menos de 15 dias, a sessão ganha mais 30
    if (expira - Date.now() / 1000 < 15 * 86400) resposta.headers.append("Set-Cookie", cookieSessao(await criarSessao(env), SESSAO_DIAS * 86400));
    return resposta;
}

async function rotasComSessao(request, env, url, metodo, caminho) {
    if (caminho === "/api/sessao") return json({ ok: true });
    if (caminho === "/api/resumo" && metodo === "GET") return resumo(env, url);
    if (caminho === "/api/agenda" && metodo === "GET") return agenda(env, url);
    if (caminho === "/api/backup" && metodo === "GET") return backup(env);
    if (caminho === "/api/financeiro" && metodo === "GET") return financeiro(env, url);
    if (caminho === "/api/financeiro/planilha" && metodo === "GET") return planilha(env, url);
    if (caminho === "/api/ajustes" && metodo === "GET") return json(await verAjustes(env));
    if (caminho === "/api/ajustes" && metodo === "PUT") return salvarAjustes(env, request);
    if (caminho === "/api/clientes" && metodo === "GET") return listarClientes(env, url);

    if (caminho === "/api/documentos" && metodo === "POST") return enviarDocumento(env, request, url);
    let m = caminho.match(/^\/api\/documentos\/([0-9a-f-]{36})$/);
    if (m) {
        if (metodo === "GET") return abrirDocumento(env, m[1], url);
        if (metodo === "PUT") return editarDocumento(env, m[1], request);
        if (metodo === "DELETE") return apagarDocumento(env, m[1]);
    }

    m = caminho.match(/^\/api\/(clientes|trabalhos|pagamentos|compromissos)(?:\/([0-9a-f-]{36}))?$/);
    if (m) {
        const tabela = ROTAS_TABELA[m[1]];
        const id = m[2];
        if (!id && metodo === "POST") return criar(env, tabela, request);
        if (id && metodo === "GET") {
            if (tabela === "clientes") return verCliente(env, id);
            if (tabela === "trabalhos") return verTrabalho(env, id);
            return json(await buscar(env, tabela, id));
        }
        if (id && metodo === "PUT") return editar(env, tabela, id, request);
        if (id && metodo === "DELETE") return apagar(env, tabela, id);
    }
    throw new Erro(404, "Não encontrado.");
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api/")) {
            try {
                return await api(request, env, url);
            } catch (e) {
                if (e instanceof Erro) return json({ erro: e.message }, e.status);
                console.error("erro no painel:", e?.message || e);
                return json({ erro: "Algo deu errado. Tente de novo." }, 500);
            }
        }
        if (request.method !== "GET" && request.method !== "HEAD") return new Response("Método não aceito.", { status: 405, headers: SEGURANCA });
        return servirPublico(request, url);
    },
};
