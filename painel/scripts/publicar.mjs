// Publica o painel na Cloudflare: garante o lugar dos arquivos (R2), atualiza o banco (D1),
// manda o código (Worker) e acerta os segredos. Pode rodar quantas vezes quiser.
//
// No GitHub (Actions) roda sozinho a cada mudança no painel. No computador:
//   npx wrangler login     (uma vez)
//   npm run publicar
//
// Variáveis que ele lê:
//   CLOUDFLARE_API_TOKEN  o token (no computador, o "wrangler login" faz esse papel)
//   PAINEL_SENHA          opcional: se vier, vira a senha do painel (troca e derruba as sessões abertas)

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BALDE = "painel-okaiquemota";
const wrangler = join(import.meta.dirname, "..", "node_modules", ".bin", "wrangler");

function rodar(args, { entrada, aceitar } = {}) {
    console.log(`\n→ wrangler ${args.join(" ")}`);
    const r = spawnSync(wrangler, args, { input: entrada, encoding: "utf8", stdio: [entrada ? "pipe" : "inherit", "pipe", "pipe"], env: { ...process.env, CI: "1" } });
    const saida = (r.stdout || "") + (r.stderr || "");
    if (r.status !== 0 && !(aceitar && aceitar.test(saida))) {
        console.error(saida);
        throw new Error(`O wrangler falhou em: ${args.join(" ")}`);
    }
    console.log(saida.trim());
    return { saida, stdout: r.stdout || "" };
}

// os nomes dos segredos que o Worker já tem. Se não der pra ler a lista, para tudo:
// achar que a chave das sessões não existe e criar outra desconectaria todo mundo.
function segredosAtuais() {
    const { stdout } = rodar(["secret", "list", "--format", "json"]);
    const inicio = stdout.search(/^\s*\[/m);
    const fim = stdout.lastIndexOf("]");
    try {
        if (inicio < 0 || fim < inicio) throw new Error("sem lista");
        return new Set(JSON.parse(stdout.slice(inicio, fim + 1)).map((s) => s.name));
    } catch {
        throw new Error("Não deu pra ler a lista de segredos do Worker; nada foi trocado. Saída do wrangler:\n" + stdout);
    }
}

try {
    // 1. Lugar dos arquivos (R2). Se já existe, segue.
    rodar(["r2", "bucket", "create", BALDE, "--location", "enam"], { aceitar: /already exists|10004/i });  // "já existe" é o normal

    // 2. Banco (D1): aplica as migrações que faltam (pasta migrations/)
    rodar(["d1", "migrations", "apply", "DB", "--remote"]);

    // 3. Código
    rodar(["deploy"]);

    // 4. Segredos: a chave da sessão (só na primeira vez) e a senha (quando vier)
    const existentes = segredosAtuais();
    const novos = {};
    if (!existentes.has("SESSAO_SEGREDO")) novos.SESSAO_SEGREDO = randomBytes(32).toString("base64url");
    if (process.env.PAINEL_SENHA) {
        if (process.env.PAINEL_SENHA.length < 10) throw new Error("A senha do painel precisa ter pelo menos 10 caracteres.");
        novos.PAINEL_SENHA = process.env.PAINEL_SENHA;
    }
    if (Object.keys(novos).length) {
        const pasta = mkdtempSync(join(tmpdir(), "painel-"));
        const arquivo = join(pasta, "segredos.json");
        try {
            writeFileSync(arquivo, JSON.stringify(novos), { mode: 0o600 });
            rodar(["secret", "bulk", arquivo]);
        } finally {
            rmSync(pasta, { recursive: true, force: true });
        }
        console.log(`\nSegredos atualizados: ${Object.keys(novos).join(", ")}`);
    }
    if (!existentes.has("PAINEL_SENHA") && !novos.PAINEL_SENHA) {
        console.log("\nAtenção: o painel ainda não tem senha. Defina PAINEL_SENHA (veja o README do painel).");
    }
    console.log("\nPainel publicado.");
} catch (e) {
    console.error("\n" + e.message);
    process.exit(1);
}
