// Junta os arquivos de public/ (páginas, CSS, JS, fontes e ícones) num módulo só,
// src/arquivos.gerado.js, que vai dentro do Worker. Assim a publicação é um envio só
// (o código), sem o upload separado de arquivos estáticos.
// O wrangler roda este script sozinho antes de cada "wrangler dev" e "wrangler deploy"
// (veja "build" no wrangler.jsonc).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const raiz = join(import.meta.dirname, "..", "public");
const destino = join(import.meta.dirname, "..", "src", "arquivos.gerado.js");

const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".webmanifest": "application/manifest+json",
    ".txt": "text/plain; charset=utf-8",
};

const listar = (pasta) => readdirSync(pasta).flatMap((nome) => (statSync(join(pasta, nome)).isDirectory() ? listar(join(pasta, nome)) : [join(pasta, nome)]));

const arquivos = {};
for (const caminho of listar(raiz).sort()) {
    const tipo = TIPOS[extname(caminho)];
    if (!tipo) throw new Error(`Não sei servir ${caminho}: acrescente a extensão em scripts/empacotar.mjs.`);
    const bytes = readFileSync(caminho);
    const nome = "/" + relative(raiz, caminho).split(sep).join("/");
    arquivos[nome] = { tipo, etag: `"${createHash("sha256").update(bytes).digest("base64url").slice(0, 20)}"`, b64: bytes.toString("base64") };
}

writeFileSync(destino, `// Gerado por scripts/empacotar.mjs a partir de public/. Não edite: mude public/.\nexport default ${JSON.stringify(arquivos)};\n`);
console.log(`Empacotados ${Object.keys(arquivos).length} arquivos de public/ em src/arquivos.gerado.js`);
