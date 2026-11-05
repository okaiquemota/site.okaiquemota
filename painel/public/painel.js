/* -------------------------------------------------------------------------
   Painel · Kaique Mota
   Telas: Início, Clientes, ficha do cliente, Trabalho, Contrato, Agenda e Financeiro.
   Fala com a API em /api (src/worker.js). Tudo o que vem do banco entra
   na página como texto (textContent), nunca como HTML.
------------------------------------------------------------------------- */
"use strict";

(() => {
    // ---------- Vocabulário ----------

    const STATUS = { orcamento: "Orçamento", confirmado: "Confirmado", edicao: "Em edição", entregue: "Entregue", cancelado: "Cancelado" };
    const CLASSE_STATUS = { orcamento: "", confirmado: "cheio", edicao: "", entregue: "apagado", cancelado: "apagado" };
    const CONTRATO = { a_enviar: "A enviar", enviado: "Enviado, falta assinar", assinado: "Assinado", dispensado: "Sem contrato" };
    const CONTRATO_CURTO = { a_enviar: "A enviar", enviado: "Enviado", assinado: "Assinado", dispensado: "Sem contrato" };
    const AUTORIZACAO = { pendente: "Pendente", sim: "Autorizou", nao: "Não autorizou" };
    const CATEGORIAS = {
        contrato: "Contrato",
        autorizacao: "Autorização de imagem",
        comprovante: "Comprovante de pagamento",
        documento: "Documento pessoal",
        orcamento: "Orçamento",
        outro: "Outro",
    };
    const TIPOS = ["Casamento", "Pré-wedding", "Festa", "Aniversário", "Making of", "Ensaio", "Marca e negócio", "Outro"];
    // Os pacotes do Orçamento 2026, com o que vai na tabela do contrato.
    // valor em reais; prazo: dias pra entregar depois do evento
    const DUPLA = "Dupla de fotógrafos";
    const P = (nome, valor, prazo, duracao, fotos, outros = {}) => ({ nome, valor: valor * 100, prazo, duracao, fotos, equipe: "1 fotógrafo", previa: "Não se aplica", extra: "Não se aplica", ...outros });
    const PACOTES = {
        Casamento: [
            P("Casamento Civil", 690, 15, "Até 2 horas", "120"),
            P("Casamento Clássico", 2090, 30, "Até 6 horas", "400", { equipe: DUPLA, previa: "20 fotos em até 72h" }),
            P("Casamento Completo", 3490, 45, "Até 8 horas", "600", { equipe: DUPLA, previa: "30 fotos em até 72h", extra: "Pré-wedding Clássico, com a arte do save the date, em data à parte" }),
        ],
        "Pré-wedding": [
            P("Pré-wedding Essencial", 350, 7, "1 hora de ensaio", "25"),
            P("Pré-wedding Clássico", 450, 10, "1h30 de ensaio", "40", { previa: "10 fotos em até 48h" }),
            P("Pré-wedding Completo", 650, 15, "Até 2h30 de ensaio", "70", { previa: "10 fotos em até 48h" }),
        ],
        Festa: [
            P("Festa Essencial", 520, 10, "Até 3 horas", "150"),
            P("Festa Clássica", 850, 15, "Até 5 horas", "250", { previa: "15 fotos em até 48h" }),
            P("Festa Completa", 1290, 20, "Até 7 horas, com making of e mini ensaio inclusos", "350 + 20 do mini ensaio", { previa: "20 fotos em até 48h", extra: "Mini ensaio no local antes da festa (30 min), dentro das horas do pacote" }),
        ],
        Aniversário: [
            P("Aniversário Essencial", 350, 7, "Até 2 horas", "100"),
            P("Aniversário Clássico", 490, 10, "Até 3 horas", "150", { previa: "10 fotos no dia seguinte" }),
            P("Aniversário Completo", 690, 10, "Até 4 horas, com o mini ensaio incluso", "200 + 15 do mini ensaio", { previa: "15 fotos em até 24h", extra: "Mini ensaio do aniversariante antes da festa (30 min), dentro das horas do pacote" }),
        ],
        "Making of": [
            P("Making of Essencial", 320, 10, "Até 1h30", "50"),
            P("Making of Clássico", 480, 10, "Até 2h30", "90", { previa: "10 fotos em até 24h" }),
            P("Making of Completo", 650, 15, "Até 3h30", "130", { previa: "15 fotos em até 24h", extra: "Mini ensaio depois de pronta (20 min), dentro das horas do pacote" }),
        ],
        Ensaio: [
            P("Ensaio Essencial", 250, 7, "1 hora de ensaio", "20"),
            P("Ensaio Clássico", 390, 10, "1h30 de ensaio", "40"),
            P("Ensaio Completo", 540, 10, "2 horas de ensaio", "60", { previa: "10 fotos em até 48h" }),
        ],
        "Marca e negócio": [
            P("Retrato Profissional", 200, 5, "40 minutos de sessão", "10"),
            P("Conteúdo para Marca", 450, 7, "1h30 de sessão", "30"),
        ],
    };
    const TODOS_PACOTES = Object.values(PACOTES).flat();
    const pacoteDe = (nome) => TODOS_PACOTES.find((p) => p.nome.toLowerCase() === String(nome || "").trim().toLowerCase());
    // hora adicional de cada tipo, como está no rodapé de cada página do orçamento (pré-wedding e ensaio não têm)
    const HORA_ADICIONAL = { Casamento: 20000, Festa: 15000, Aniversário: 15000, "Making of": 15000, "Marca e negócio": 15000 };
    // o que vale no contrato enquanto você não muda em "Seus dados" (são os [colchetes] do modelo)
    const AJUSTES_PADRAO = {
        nome: "Kaique Mota",
        telefone: "(16) 98215-7266",
        forma: "Pix ou transferência",
        deslocamento: "combustível e pedágios",
        dias_roteiro: "7",
        dias_hora_adicional: "3",
        dias_remarcacao: "60",
        dias_devolucao: "7",
    };
    const FORMAS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Transferência", "Boleto"];
    const ORIGENS = ["Instagram", "Indicação", "Site", "Google", "WhatsApp"];
    const SINAL = 0.3; // "a data fica garantida após o sinal de 30%"
    const DIAS_LINK = 90; // "o link fica disponível por 90 dias"
    const EXTENSOES = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif", "txt", "doc", "docx", "odt", "xls", "xlsx"];
    const MAX_ARQUIVO = 25 * 1024 * 1024;
    const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

    // ---------- DOM ----------

    const $ = (seletor, base = document) => base.querySelector(seletor);

    function h(tag, props, ...filhos) {
        const el = document.createElement(tag);
        let valor;
        for (const [k, v] of Object.entries(props || {})) {
            if (v === null || v === undefined || v === false) continue;
            if (k === "class") el.className = v;
            else if (k === "text") el.textContent = v;
            else if (k === "value") valor = v;
            else if (k === "dataset") Object.assign(el.dataset, v);
            else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v === true ? "" : v);
        }
        for (const f of filhos.flat(Infinity)) {
            if (f === null || f === undefined || f === false || f === "") continue;
            el.append(f instanceof Node ? f : String(f));
        }
        if (valor !== undefined) el.value = valor;
        return el;
    }

    const juntar = (...partes) => partes.flat().filter((p) => p !== null && p !== undefined && p !== "").join(" · ");

    // ---------- Formatos ----------

    const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const dinheiro = (c) => moeda.format((c || 0) / 100);
    const pad = (n) => String(n).padStart(2, "0");
    const digitos = (s) => String(s ?? "").replace(/\D/g, "");

    function hoje() {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    const paraData = (iso) => new Date(iso + "T12:00:00Z");
    const iso = (d) => d.toISOString().slice(0, 10);
    function somarDias(dia, n) {
        const d = paraData(dia);
        d.setUTCDate(d.getUTCDate() + n);
        return iso(d);
    }
    const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 86400000);
    const fmt = (op) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...op });
    const fLonga = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const fSemana = fmt({ weekday: "long", day: "numeric", month: "long" });
    const fMes = fmt({ month: "long", year: "numeric" });
    const fDiaSemana = fmt({ weekday: "short", day: "numeric" });
    const dataLonga = (d) => (d ? fLonga.format(paraData(d)) : "");
    const dataCurta = (d) => (d ? `${paraData(d).getUTCDate()} ${MESES[paraData(d).getUTCMonth()]}` : "");
    const dataMedia = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
    const primeiraMaiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    // o banco guarda a hora em UTC ("2026-11-04T01:30:00Z"); na tela vale o dia daqui (ainda 3/11 às 22h30)
    function diaDoInstante(instante) {
        const d = new Date(instante);
        return Number.isNaN(d.getTime()) ? String(instante).slice(0, 10) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function relativo(dia) {
        const n = diasEntre(hoje(), dia);
        if (n === 0) return "hoje";
        if (n === 1) return "amanhã";
        if (n === -1) return "ontem";
        return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
    }

    function telefoneBonito(t) {
        const d = digitos(t);
        if (d.length === 13 && d.startsWith("55")) return "+55 " + telefoneBonito(d.slice(2));
        if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return t || "";
    }
    function linkWhatsApp(t) {
        let d = digitos(t);
        if (d.length === 10 || d.length === 11) d = "55" + d;
        return d.length >= 12 ? "https://wa.me/" + d : null;
    }
    function linkInstagram(i) {
        const u = String(i || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
        return /^[\w.]{1,30}$/.test(u) ? "https://www.instagram.com/" + u + "/" : null;
    }
    function cpfValido(c) {
        const d = digitos(c);
        if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
        for (let t = 9; t < 11; t++) {
            let s = 0;
            for (let i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i);
            if (((s * 10) % 11) % 10 !== Number(d[t])) return false;
        }
        return true;
    }
    const cpfBonito = (c) => {
        const d = digitos(c);
        return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : c;
    };
    function lerDinheiro(s) {
        s = String(s || "").replace(/[R$\s]/g, "");
        if (!s) return 0;
        if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
        else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
        const n = Number(s);
        return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
    }
    const dinheiroNoCampo = (c) => (c ? (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
    function tamanho(b) {
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
        return `${(b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
    }
    const nomeTrabalho = (t) => t.titulo || t.tipo;
    const idade = (nasc) => {
        if (!nasc) return null;
        const h0 = hoje();
        let a = Number(h0.slice(0, 4)) - Number(nasc.slice(0, 4));
        if (h0.slice(5) < nasc.slice(5)) a--;
        return a;
    };

    // ---------- API ----------

    class ErroApi extends Error {
        constructor(mensagem, status) {
            super(mensagem);
            this.status = status;
        }
    }

    async function api(caminho, op = {}) {
        const url = new URL("/api/" + caminho, location.origin);
        for (const [k, v] of Object.entries(op.params || {})) if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
        const init = { method: op.metodo || "GET", headers: {}, credentials: "same-origin" };
        if (op.corpo !== undefined) {
            init.headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(op.corpo);
        }
        if (op.arquivo) {
            init.headers["Content-Type"] = "application/octet-stream";
            init.body = op.arquivo;
        }
        let r;
        try {
            r = await fetch(url, init);
        } catch {
            throw new ErroApi("Sem conexão. Confira a internet e tente de novo.", 0);
        }
        let dados = {};
        try {
            dados = await r.json();
        } catch {
            /* resposta sem corpo */
        }
        if (r.status === 401 && caminho !== "entrar") {
            telaEntrar(dados.erro);
            throw new ErroApi(dados.erro || "Entre com a senha.", 401);
        }
        if (!r.ok) throw new ErroApi(dados.erro || "Algo deu errado. Tente de novo.", r.status);
        return dados;
    }

    // ---------- Aviso rápido ----------

    let avisoTempo;
    // desfazer: função que volta atrás (aparece um botão "Desfazer" por alguns segundos)
    function aviso(mensagem, erro = false, desfazer = null) {
        const el = $("#aviso");
        const botaoDesfazer = desfazer
            ? h("button", {
                  type: "button",
                  class: "aviso-desfazer",
                  onclick: async () => {
                      el.classList.remove("mostra");
                      try {
                          await desfazer();
                      } catch (e) {
                          if (e.status !== 401) aviso(e.message, true);
                      }
                  },
              }, "Desfazer")
            : null;
        el.replaceChildren(h("span", null, mensagem), botaoDesfazer);
        el.classList.toggle("erro", erro);
        el.classList.add("mostra");
        clearTimeout(avisoTempo);
        avisoTempo = setTimeout(() => el.classList.remove("mostra"), desfazer ? 8000 : erro ? 6000 : 2600);
    }

    // ---------- Janelas ----------

    const celular = () => matchMedia("(max-width: 720px)").matches;

    function abrirJanela({ titulo, corpo, enviar = "Salvar", perigo = false, aoEnviar, extra }) {
        const dlg = $("#janela");
        const erro = h("p", { class: "erro-form", role: "alert" });
        const botao = h("button", { type: "submit", class: perigo ? "botao perigo" : "botao" }, enviar);
        // o que estava preenchido ao abrir: fechar sem salvar só pergunta se algo mudou
        let inicial = "";
        let terminou = false;
        const estado = () => [...form.elements].filter((el) => el.name).map((el) => (el.type === "checkbox" ? el.checked : el.value)).join("\u0001");
        const fechar = () => {
            if (terminou || estado() === inicial || window.confirm("Fechar sem salvar? O que você preencheu nesta janela vai se perder.")) {
                terminou = true;
                dlg.close();
            }
        };
        const form = h(
            "form",
            { class: "janela", novalidate: true },
            h(
                "div",
                { class: "janela-topo" },
                h("h2", { id: "janela-titulo", text: titulo }),
                h("button", { type: "button", class: "fechar", "aria-label": "Fechar", onclick: fechar }, h("span", { "aria-hidden": "true" }, "×")),
            ),
            h("div", { class: "janela-corpo" }, corpo),
            h("div", { class: "janela-base" }, erro, extra, h("button", { type: "button", class: "botao leve", onclick: fechar }, "Cancelar"), botao),
        );
        form.addEventListener("input", (e) => e.target.removeAttribute?.("aria-invalid"));
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const invalidos = [...form.elements].filter((el) => el.willValidate && !el.checkValidity());
            if (invalidos.length) {
                invalidos.forEach((el) => el.setAttribute("aria-invalid", "true"));
                const primeiro = invalidos[0];
                const rotulo = (form.querySelector(`label[for="${primeiro.id}"]`)?.textContent || "").replace(/\s*\*\s*$/, "");
                erro.textContent = primeiro.validity.valueMissing ? `Preencha: ${rotulo}.` : `${rotulo}: ${primeiro.validationMessage}`;
                primeiro.focus();
                return;
            }
            botao.disabled = true;
            erro.textContent = "";
            try {
                const resultado = await aoEnviar(form);
                if (resultado !== false) {
                    terminou = true;
                    dlg.close();
                }
            } catch (err) {
                if (err.status !== 401) erro.textContent = err.message;
                else {
                    terminou = true;
                    dlg.close();
                }
            } finally {
                botao.disabled = false;
            }
        });
        dlg.replaceChildren(form);
        if (dlg.open) dlg.close();
        // Esc (e o "voltar" do Android): mesma regra do Cancelar
        dlg.onkeydown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                fechar();
            }
        };
        dlg.oncancel = (e) => {
            e.preventDefault();
            fechar();
        };
        dlg.showModal();
        inicial = estado();
        const primeiro = form.querySelector(".janela-corpo input:not([type=checkbox]), .janela-corpo select, .janela-corpo textarea");
        if (primeiro && !celular()) primeiro.focus();
        return { dlg, form, erro };
    }

    function confirmar(titulo, texto, botao = "Apagar") {
        return new Promise((resolve) => {
            let ok = false;
            const { dlg } = abrirJanela({
                titulo,
                corpo: h("p", { class: "texto-janela", text: texto }),
                enviar: botao,
                perigo: true,
                aoEnviar: () => {
                    ok = true;
                },
            });
            dlg.addEventListener("close", () => resolve(ok), { once: true });
        });
    }

    // campos: [{nome, rotulo, tipo, opcoes: [[valor, rótulo]], obrigatorio, inteira, lista, ajuda, attrs}]
    function campos(lista, valores = {}) {
        return h("div", { class: "campos" }, lista.map((c) => campo(c, valores[c.nome])));
    }

    function campo(c, valor) {
        const id = `c-${c.nome}-${Math.random().toString(36).slice(2, 8)}`;
        const comum = { id, name: c.nome, required: c.obrigatorio || null, ...(c.attrs || {}) };
        if (c.tipo === "caixa") {
            const caixa = h("input", { ...comum, type: "checkbox" });
            caixa.checked = Boolean(valor);
            return h("div", { class: "campo caixa" + (c.inteira ? " inteira" : "") }, caixa, h("label", { for: id }, c.rotulo));
        }
        let entrada;
        if (c.tipo === "select") {
            const opcoes = valor && !c.opcoes.some(([v]) => v === valor) ? [...c.opcoes, [valor, valor]] : c.opcoes;
            entrada = h("select", comum, opcoes.map(([v, r]) => h("option", { value: v }, r)));
        }
        else if (c.tipo === "textarea") entrada = h("textarea", { rows: 3, ...comum });
        else if (c.tipo === "dinheiro") entrada = h("input", { ...comum, type: "text", inputmode: "decimal", placeholder: "0,00", autocomplete: "off", dataset: { dinheiro: "1" } });
        else entrada = h("input", { autocomplete: "off", ...comum, type: c.tipo || "text" });

        if (c.tipo === "dinheiro") entrada.value = dinheiroNoCampo(valor);
        else if (c.tipo === "select") entrada.value = valor ?? c.opcoes[0][0];
        else entrada.value = valor ?? "";

        if (c.ajuda) entrada.setAttribute("aria-describedby", id + "-ajuda");
        let lista = null;
        if (c.lista) {
            const idLista = id + "-lista";
            entrada.setAttribute("list", idLista);
            lista = h("datalist", { id: idLista }, c.lista.map((v) => h("option", { value: v })));
        }
        return h(
            "div",
            { class: "campo" + (c.inteira ? " inteira" : "") },
            h("label", { for: id }, c.rotulo, c.obrigatorio ? h("span", { "aria-hidden": "true" }, " *") : null),
            entrada,
            lista,
            c.ajuda ? h("span", { class: "ajuda", id: id + "-ajuda", text: c.ajuda }) : null,
        );
    }

    function lerCampos(form) {
        const dados = {};
        for (const el of form.elements) {
            if (!el.name) continue;
            if (el.type === "checkbox") dados[el.name] = el.checked;
            else if (el.dataset.dinheiro) {
                const v = lerDinheiro(el.value);
                if (Number.isNaN(v)) {
                    el.setAttribute("aria-invalid", "true");
                    throw new Error("Valor inválido: escreva só o número, como 1.500,00.");
                }
                dados[el.name] = v;
            } else dados[el.name] = el.value.trim();
        }
        return dados;
    }

    const opcoesDe = (obj) => Object.entries(obj);

    // ---------- Peças das páginas ----------

    function pagina(...filhos) {
        return h("div", { class: "pagina" }, filhos);
    }

    function cabeca({ voltar, rotulo, titulo, meta, acoes }) {
        return h(
            "header",
            { class: "cabeca" },
            h(
                "div",
                null,
                voltar ? h("a", { class: "voltar", href: voltar[0] }, h("span", { "aria-hidden": "true" }, "← "), voltar[1]) : null,
                rotulo ? h("p", { class: "rotulo", text: rotulo }) : null,
                h("h1", { class: "titulo", tabindex: "-1", text: titulo }),
                meta ? h("p", { class: "meta" }, meta) : null,
            ),
            acoes ? h("div", { class: "acoes" }, acoes) : null,
        );
    }

    function secao(titulo, { acoes, nota, id } = {}, ...conteudo) {
        return h(
            "section",
            { class: "secao", id, "data-secao": titulo },
            h("div", { class: "secao-topo" }, h("h2", { tabindex: "-1" }, titulo, nota ? h("span", { class: "rotulo", text: nota }) : null), acoes ? h("div", { class: "acoes" }, acoes) : null),
            conteudo,
        );
    }

    const vazio = (texto) => h("p", { class: "vazio", text: texto });
    // contexto: diz pra quem usa leitor de tela do que é o botão ("Editar" → "Editar pagamento Sinal")
    // data-foco: depois de salvar, o foco volta pro mesmo botão na página redesenhada
    const botao = (texto, onclick, classe = "botao leve pequeno", contexto = "") =>
        h("button", { type: "button", class: classe, onclick, "data-foco": `${texto}|${contexto}` }, texto, contexto ? h("span", { class: "visualmente-escondido" }, " " + contexto) : null);
    const escondido = (texto) => h("span", { class: "visualmente-escondido" }, texto);
    const selo = (texto, classe = "") => h("span", { class: "selo " + classe, text: texto });
    const seloStatus = (s) => selo(STATUS[s] || s, CLASSE_STATUS[s]);
    const externo = (href, texto) => h("a", { class: "link", href, target: "_blank", rel: "noopener noreferrer" }, texto);

    function blocoDia(dia) {
        if (!dia) return h("div", { class: "dia sem", "aria-hidden": "true" }, h("strong", null, "—"), h("span", null, "s/ data"));
        const d = paraData(dia);
        return h("div", { class: "dia", title: dataLonga(dia) }, h("strong", null, d.getUTCDate()), h("span", null, MESES[d.getUTCMonth()]));
    }

    // linha de lista; com "acoes" dentro, só o título vira link (link dentro de link não pode)
    function item({ href, dia, semDia, titulo, info, lado, classe }) {
        const temBotoes = lado && [].concat(lado).some((n) => n instanceof Node && (n.matches?.("button, a, .acoes") || n.querySelector?.("button, a")));
        const corpo = h(
            "div",
            { class: "item-corpo" },
            href && temBotoes ? h("a", { class: "item-titulo link", href }, titulo) : h("span", { class: "item-titulo" }, titulo),
            info ? h("span", { class: "item-info" }, info) : null,
        );
        const partes = [semDia ? null : blocoDia(dia), corpo, lado ? h("div", { class: "item-lado" }, lado) : null];
        const linha = href && !temBotoes ? h("a", { class: "item" + (semDia ? " sem-data" : ""), href }, partes) : h("div", { class: "item" + (semDia ? " sem-data" : "") }, partes);
        return h("li", { class: classe }, linha);
    }

    // mostra as primeiras linhas e um botão pra ver o resto ali mesmo
    function listaLimitada(itens, desenhar, limite = 6) {
        const ul = h("ul", { class: "lista" }, itens.slice(0, limite).map(desenhar));
        if (itens.length <= limite) return ul;
        const mais = h("button", { type: "button", class: "botao leve pequeno ver-todos" }, `Ver todos (${itens.length})`);
        mais.addEventListener("click", () => {
            const novos = itens.slice(limite).map(desenhar);
            ul.append(...novos);
            mais.remove();
            novos[0].querySelector("a, button, input")?.focus();
        });
        return h("div", null, ul, mais);
    }

    function ficha(pares) {
        return h(
            "dl",
            { class: "ficha" },
            pares.filter(Boolean).map(([rotulo, valor, larga]) => h("div", { class: larga ? "larga" : null }, h("dt", null, rotulo), h("dd", null, valor === null || valor === undefined || valor === "" ? "—" : valor))),
        );
    }

    // ---------- Formulários ----------

    const CAMPOS_CLIENTE = [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, inteira: true, attrs: { maxlength: 120 } },
        { nome: "telefone", rotulo: "WhatsApp", tipo: "tel", attrs: { inputmode: "tel", placeholder: "(16) 99999-9999", maxlength: 30 } },
        { nome: "email", rotulo: "E-mail", tipo: "email", attrs: { maxlength: 160 } },
        { nome: "instagram", rotulo: "Instagram", attrs: { placeholder: "@usuario", maxlength: 60 } },
        { nome: "origem", rotulo: "Como conheceu", lista: ORIGENS, attrs: { maxlength: 60 } },
        { nome: "cpf", rotulo: "CPF", attrs: { inputmode: "numeric", placeholder: "000.000.000-00", maxlength: 20 } },
        { nome: "rg", rotulo: "RG", attrs: { maxlength: 30 } },
        { nome: "nascimento", rotulo: "Nascimento", tipo: "date" },
        { nome: "cidade", rotulo: "Cidade", attrs: { placeholder: "Ribeirão Preto, SP", maxlength: 80 } },
        { nome: "endereco", rotulo: "Endereço", inteira: true, attrs: { placeholder: "Rua, número, bairro e CEP", maxlength: 300 } },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", inteira: true, attrs: { maxlength: 5000 } },
    ];

    function formCliente(cliente) {
        abrirJanela({
            titulo: cliente ? "Editar cliente" : "Novo cliente",
            corpo: campos(CAMPOS_CLIENTE, cliente || {}),
            aoEnviar: async (form) => {
                const dados = lerCampos(form);
                if (dados.cpf) {
                    if (!cpfValido(dados.cpf)) {
                        form.elements.cpf.setAttribute("aria-invalid", "true");
                        throw new Error("Esse CPF não existe. Confira os números.");
                    }
                    dados.cpf = cpfBonito(dados.cpf);
                }
                if (dados.telefone) dados.telefone = telefoneBonito(dados.telefone);
                if (dados.instagram && !dados.instagram.startsWith("@") && !dados.instagram.includes("/")) dados.instagram = "@" + dados.instagram;
                if (cliente) {
                    await api("clientes/" + cliente.id, { metodo: "PUT", corpo: dados });
                    aviso("Cliente salvo.");
                    recarregar();
                } else {
                    const novo = await api("clientes", { metodo: "POST", corpo: dados });
                    aviso("Cliente criado.");
                    location.hash = "#/clientes/" + novo.id;
                }
            },
        });
    }

    function formTrabalho(trabalho, clienteId) {
        const t = trabalho || { tipo: TIPOS[0], status: "orcamento", contrato: "a_enviar", autorizacao: "pendente" };
        const corpo = campos(
            [
                { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS.map((x) => [x, x]), obrigatorio: true },
                { nome: "pacote", rotulo: "Pacote", lista: [], attrs: { maxlength: 80 } },
                { nome: "titulo", rotulo: "Título", inteira: true, attrs: { placeholder: "Ex.: Casamento Ana e João", maxlength: 120 }, ajuda: "Se ficar vazio, aparece o tipo." },
                { nome: "data", rotulo: "Data", tipo: "date" },
                { nome: "hora", rotulo: "Horário", tipo: "time" },
                { nome: "local", rotulo: "Local", inteira: true, attrs: { maxlength: 200 } },
                { nome: "valor", rotulo: "Valor total (R$)", tipo: "dinheiro", ajuda: "Preenche sozinho com o preço do pacote." },
                { nome: "status", rotulo: "Situação", tipo: "select", opcoes: opcoesDe(STATUS) },
                { nome: "contrato", rotulo: "Contrato", tipo: "select", opcoes: opcoesDe(CONTRATO) },
                { nome: "autorizacao", rotulo: "Autorização de imagem", tipo: "select", opcoes: opcoesDe(AUTORIZACAO) },
                { nome: "prazo_entrega", rotulo: "Prazo de entrega", tipo: "date", ajuda: "Preenche sozinho pelo pacote e pela data." },
                { nome: "entregue_em", rotulo: "Entregue em", tipo: "date" },
                { nome: "galeria", rotulo: "Link da galeria (Google Drive)", tipo: "url", inteira: true, attrs: { placeholder: "https://drive.google.com/…", maxlength: 600 } },
                { nome: "observacoes", rotulo: "Observações", tipo: "textarea", inteira: true, attrs: { maxlength: 5000 } },
            ],
            t,
        );
        const el = (n) => corpo.querySelector(`[name="${n}"]`);
        const listaPacotes = corpo.querySelector("datalist");
        // se o prazo salvo é o que o pacote daria, ele continua acompanhando a data ao editar
        let prazoAutomatico = t.data && pacoteDe(t.pacote) && t.prazo_entrega === somarDias(t.data, pacoteDe(t.pacote).prazo) ? t.prazo_entrega : null;
        // o mesmo com o valor: se é o preço do pacote, trocar de pacote troca o valor
        let valorAutomatico = pacoteDe(t.pacote) && t.valor === pacoteDe(t.pacote).valor ? dinheiroNoCampo(t.valor) : null;
        const atualizarPacotes = () =>
            listaPacotes.replaceChildren(...(PACOTES[el("tipo").value] || TODOS_PACOTES).map((p) => h("option", { value: p.nome, label: `${p.nome} · ${dinheiro(p.valor)}` })));
        const calcularPrazo = () => {
            const pacote = pacoteDe(el("pacote").value);
            const data = el("data").value;
            if (!pacote || !data) return;
            if (el("prazo_entrega").value && el("prazo_entrega").value !== prazoAutomatico) return; // você mudou à mão: fica o seu
            prazoAutomatico = somarDias(data, pacote.prazo);
            el("prazo_entrega").value = prazoAutomatico;
        };
        const preencherValor = () => {
            const pacote = pacoteDe(el("pacote").value);
            if (!pacote) return;
            if (el("valor").value && el("valor").value !== valorAutomatico) return; // você mudou à mão: fica o seu
            valorAutomatico = dinheiroNoCampo(pacote.valor);
            el("valor").value = valorAutomatico;
        };
        atualizarPacotes();
        el("tipo").addEventListener("change", atualizarPacotes);
        for (const evento of ["input", "change"]) {
            el("pacote").addEventListener(evento, calcularPrazo);
            el("pacote").addEventListener(evento, preencherValor);
        }
        el("data").addEventListener("change", calcularPrazo);
        el("status").addEventListener("change", () => {
            if (el("status").value === "entregue" && !el("entregue_em").value) el("entregue_em").value = hoje();
            // saiu de "Entregue": sem isso o trabalho some de "Para entregar"
            if (el("status").value !== "entregue" && el("entregue_em").value) el("entregue_em").value = "";
        });
        el("entregue_em").addEventListener("change", () => {
            if (el("entregue_em").value && ["confirmado", "edicao"].includes(el("status").value)) el("status").value = "entregue";
        });

        abrirJanela({
            titulo: trabalho ? "Editar trabalho" : "Novo trabalho",
            corpo,
            aoEnviar: async (form) => {
                const dados = lerCampos(form);
                if (trabalho) {
                    await api("trabalhos/" + trabalho.id, { metodo: "PUT", corpo: dados });
                    aviso("Trabalho salvo.");
                    recarregar();
                } else {
                    const novo = await api("trabalhos", { metodo: "POST", corpo: { ...dados, cliente_id: clienteId } });
                    aviso("Trabalho criado.");
                    location.hash = "#/trabalhos/" + novo.id;
                }
            },
        });
    }

    function formPagamento(pagamento, trabalhoId) {
        const extra = pagamento
            ? h("button", {
                  type: "button",
                  class: "link perigo apagar-na-janela",
                  onclick: async () => {
                      $("#janela").close();
                      if (await confirmar("Apagar pagamento", `Apagar “${pagamento.descricao}” de ${dinheiro(pagamento.valor)}?`)) {
                          await api("pagamentos/" + pagamento.id, { metodo: "DELETE" });
                          aviso("Pagamento apagado.");
                          recarregar();
                      }
                  },
              }, "Apagar")
            : null;
        abrirJanela({
            titulo: pagamento ? "Editar pagamento" : "Novo pagamento",
            extra,
            corpo: campos(
                [
                    { nome: "descricao", rotulo: "Descrição", obrigatorio: true, inteira: true, lista: ["Sinal (30%)", "Restante", "Parcela 1", "Parcela 2", "Parcela 3", "Hora adicional", "Deslocamento"], attrs: { maxlength: 80 } },
                    { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true },
                    { nome: "forma", rotulo: "Forma", lista: FORMAS, attrs: { maxlength: 30 } },
                    { nome: "vencimento", rotulo: "Vencimento", tipo: "date" },
                    { nome: "pago_em", rotulo: "Pago em", tipo: "date", ajuda: "Deixe vazio enquanto não pagar." },
                ],
                pagamento || {},
            ),
            aoEnviar: async (form) => {
                const dados = lerCampos(form);
                if (pagamento) await api("pagamentos/" + pagamento.id, { metodo: "PUT", corpo: dados });
                else await api("pagamentos", { metodo: "POST", corpo: { ...dados, trabalho_id: trabalhoId } });
                aviso("Pagamento salvo.");
                recarregar();
            },
        });
    }

    async function formCompromisso(compromisso, { clienteId, trabalhoId, data } = {}) {
        const lista = [
            { nome: "titulo", rotulo: "O quê", obrigatorio: true, inteira: true, lista: ["Reunião", "Enviar contrato", "Cobrar o sinal", "Visita ao local", "Enviar prévia", "Ligar"], attrs: { maxlength: 120 } },
            { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
            { nome: "hora", rotulo: "Horário", tipo: "time" },
        ];
        // sem cliente definido (agenda e início), dá pra escolher um
        const escolheCliente = !clienteId && !trabalhoId && !compromisso?.trabalho_id;
        if (escolheCliente) {
            const { clientes } = await api("clientes");
            lista.push({ nome: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: [["", "Nenhum"], ...clientes.map((c) => [c.id, c.nome])] });
        }
        lista.push({ nome: "observacoes", rotulo: "Observações", tipo: "textarea", inteira: true, attrs: { maxlength: 2000 } });
        if (compromisso) lista.push({ nome: "feito", rotulo: "Feito", tipo: "caixa", inteira: true });

        const extra = compromisso
            ? h("button", {
                  type: "button",
                  class: "link perigo apagar-na-janela",
                  onclick: async () => {
                      $("#janela").close();
                      if (await confirmar("Apagar compromisso", `Apagar “${compromisso.titulo}”?`)) {
                          await api("compromissos/" + compromisso.id, { metodo: "DELETE" });
                          aviso("Compromisso apagado.");
                          recarregar();
                      }
                  },
              }, "Apagar")
            : null;
        abrirJanela({
            titulo: compromisso ? "Editar compromisso" : "Novo compromisso",
            extra,
            corpo: campos(lista, compromisso || { data: data || hoje(), cliente_id: "" }),
            aoEnviar: async (form) => {
                const dados = lerCampos(form);
                if (compromisso) await api("compromissos/" + compromisso.id, { metodo: "PUT", corpo: dados });
                else {
                    if (trabalhoId) dados.trabalho_id = trabalhoId;
                    else if (clienteId) dados.cliente_id = clienteId;
                    await api("compromissos", { metodo: "POST", corpo: dados });
                }
                aviso("Compromisso salvo.");
                recarregar();
            },
        });
    }

    async function alternarCompromisso(k, feito) {
        try {
            await api("compromissos/" + k.id, { metodo: "PUT", corpo: { feito } });
            aviso(feito ? "Feito." : "Voltou pra lista.");
            recarregar();
        } catch (e) {
            if (e.status !== 401) aviso(e.message, true);
        }
    }

    async function marcarPago(p) {
        try {
            await api("pagamentos/" + p.id, { metodo: "PUT", corpo: { pago_em: hoje() } });
            aviso(`${dinheiro(p.valor)} recebido.`, false, async () => {
                await api("pagamentos/" + p.id, { metodo: "PUT", corpo: { pago_em: "" } });
                aviso("Voltou pra a receber.");
                recarregar();
            });
            recarregar();
        } catch (e) {
            if (e.status !== 401) aviso(e.message, true);
        }
    }

    // ---------- Documentos ----------

    function categoriaPeloNome(nome) {
        const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (/contrato/.test(n)) return "contrato";
        if (/autoriza|cessao|direito/.test(n)) return "autorizacao";
        if (/comprovante|pix|recibo|transfer/.test(n)) return "comprovante";
        if (/orcamento|proposta/.test(n)) return "orcamento";
        if (/\b(rg|cpf|cnh|identidade)\b/.test(n)) return "documento";
        return "outro";
    }

    function enviarArquivos(arquivos, { clienteId, trabalhoId, trabalhos }) {
        arquivos = [...arquivos];
        const ruins = arquivos.filter((a) => !EXTENSOES.includes((a.name.split(".").pop() || "").toLowerCase()));
        const grandes = arquivos.filter((a) => a.size > MAX_ARQUIVO);
        if (ruins.length) return aviso(`Tipo de arquivo não aceito: ${ruins[0].name}. Use PDF, foto, Word, Excel ou TXT.`, true);
        if (grandes.length) return aviso(`${grandes[0].name} passa de 25 MB.`, true);
        if (!arquivos.length) return;

        const lista = [{ nome: "categoria", rotulo: "O que é", tipo: "select", opcoes: opcoesDe(CATEGORIAS), inteira: !trabalhos }];
        if (trabalhos?.length) lista.push({ nome: "trabalho_id", rotulo: "Trabalho", tipo: "select", opcoes: [["", "Nenhum (só do cliente)"], ...trabalhos.map((t) => [t.id, juntar(nomeTrabalho(t), dataMedia(t.data))])] });
        const listaArquivos = h("ul", { class: "lista arquivos-novos" });
        const mostrarArquivos = () => listaArquivos.replaceChildren(...arquivos.map((a) => h("li", { class: "linha-acao" }, h("span", { class: "item-titulo", text: a.name }), h("span", { class: "cinza numero", text: tamanho(a.size) }))));
        mostrarArquivos();
        const corpo = h(
            "div",
            null,
            listaArquivos,
            campos(lista, { categoria: categoriaPeloNome(arquivos[0].name), trabalho_id: trabalhoId || "" }),
        );
        abrirJanela({
            titulo: arquivos.length > 1 ? `Enviar ${arquivos.length} arquivos` : "Enviar arquivo",
            enviar: "Enviar",
            corpo,
            aoEnviar: async (form) => {
                const { categoria, trabalho_id } = lerCampos(form);
                const base = form.querySelector('[type="submit"]');
                const total = arquivos.length;
                let enviados = 0;
                try {
                    while (arquivos.length) {
                        const a = arquivos[0];
                        base.textContent = total > 1 ? `Enviando ${enviados + 1} de ${total}…` : "Enviando…";
                        await api("documentos", { metodo: "POST", params: { cliente_id: clienteId, trabalho_id: trabalho_id || trabalhoId, categoria, nome: a.name }, arquivo: a });
                        arquivos.shift();
                        enviados++;
                    }
                } catch (e) {
                    base.textContent = "Enviar";
                    mostrarArquivos();
                    if (enviados) recarregar();
                    throw new Error(`${enviados ? `${enviados} ${enviados === 1 ? "arquivo foi guardado" : "arquivos foram guardados"}. ` : ""}Não deu pra enviar “${arquivos[0].name}”: ${e.message}`);
                }
                aviso(total > 1 ? "Arquivos guardados." : "Arquivo guardado.");
                recarregar();
            },
        });
    }

    function formDocumento(doc, trabalhos) {
        const lista = [
            { nome: "nome", rotulo: "Nome do arquivo", obrigatorio: true, inteira: true, attrs: { maxlength: 180 } },
            { nome: "categoria", rotulo: "O que é", tipo: "select", opcoes: opcoesDe(CATEGORIAS) },
        ];
        if (trabalhos?.length) lista.push({ nome: "trabalho_id", rotulo: "Trabalho", tipo: "select", opcoes: [["", "Nenhum (só do cliente)"], ...trabalhos.map((t) => [t.id, juntar(nomeTrabalho(t), dataMedia(t.data))])] });
        abrirJanela({
            titulo: "Editar arquivo",
            corpo: campos(lista, { ...doc, trabalho_id: doc.trabalho_id || "" }),
            aoEnviar: async (form) => {
                await api("documentos/" + doc.id, { metodo: "PUT", corpo: lerCampos(form) });
                aviso("Arquivo salvo.");
                recarregar();
            },
        });
    }

    function secaoDocumentos(docs, { clienteId, trabalhoId, trabalhos }) {
        const entrada = h("input", { type: "file", multiple: true, hidden: true, accept: EXTENSOES.map((e) => "." + e).join(","), onchange: (e) => {
            enviarArquivos(e.target.files, { clienteId, trabalhoId, trabalhos });
            e.target.value = "";
        } });
        const soltar = h(
            "div",
            { class: "soltar" },
            h("span", null, "Arraste os arquivos pra cá ou"),
            h("button", { type: "button", class: "botao leve pequeno", onclick: () => entrada.click() }, "Escolher arquivo"),
            h("span", { class: "item-info linha-inteira" }, "PDF, foto, Word, Excel ou TXT, até 25 MB cada."),
            entrada,
        );
        soltar.addEventListener("dragover", (e) => {
            e.preventDefault();
            soltar.classList.add("por-cima");
        });
        soltar.addEventListener("dragleave", () => soltar.classList.remove("por-cima"));
        soltar.addEventListener("drop", (e) => {
            e.preventDefault();
            soltar.classList.remove("por-cima");
            enviarArquivos(e.dataTransfer.files, { clienteId, trabalhoId, trabalhos });
        });

        const nomeDoTrabalho = (id) => {
            const t = trabalhos?.find((x) => x.id === id);
            return t ? nomeTrabalho(t) : null;
        };
        return secao(
            "Documentos",
            { nota: docs.length ? String(docs.length) : null, acoes: [botao("Enviar arquivo", () => entrada.click())] },
            docs.length
                ? h(
                      "ul",
                      { class: "lista" },
                      docs.map((d) =>
                          h(
                              "li",
                              { class: "linha-acao" },
                              h(
                                  "div",
                                  { class: "item-corpo" },
                                  h("a", { class: "item-titulo link", href: "/api/documentos/" + d.id, target: "_blank", rel: "noopener" }, d.nome),
                                  h("span", { class: "item-info" }, juntar(CATEGORIAS[d.categoria], !trabalhoId ? nomeDoTrabalho(d.trabalho_id) : null, tamanho(d.tamanho), "enviado em " + dataMedia(diaDoInstante(d.criado_em)))),
                              ),
                              h(
                                  "div",
                                  { class: "acoes" },
                                  h("a", { class: "botao leve pequeno", href: `/api/documentos/${d.id}?baixar=1` }, "Baixar", escondido(" " + d.nome)),
                                  botao("Editar", () => formDocumento(d, trabalhos), undefined, d.nome),
                                  botao("Apagar", async () => {
                                      if (await confirmar("Apagar arquivo", `Apagar “${d.nome}”? O arquivo sai do armazenamento e não dá pra recuperar.`)) {
                                          try {
                                              await api("documentos/" + d.id, { metodo: "DELETE" });
                                              aviso("Arquivo apagado.");
                                              recarregar();
                                          } catch (e) {
                                              if (e.status !== 401) aviso(e.message, true);
                                          }
                                      }
                                  }, undefined, d.nome),
                              ),
                          ),
                      ),
                  )
                : null,
            soltar,
        );
    }

    function secaoCompromissos(lista, { clienteId, trabalhoId }) {
        const h0 = hoje();
        return secao(
            "Compromissos",
            { acoes: [botao("Novo compromisso", () => formCompromisso(null, { clienteId, trabalhoId }))] },
            lista.length
                ? h("ul", { class: "lista" }, lista.map((k) => linhaCompromisso(k, h0)))
                : vazio("Nada marcado. Reuniões, visitas e lembretes entram aqui."),
        );
    }

    function linhaCompromisso(k, h0, comCliente = false) {
        const atrasado = !k.feito && k.data < h0;
        const caixa = h("input", { type: "checkbox", class: "caixa-feito", "aria-label": `Feito: ${k.titulo}`, "data-foco": "feito|" + k.id, onchange: (e) => alternarCompromisso(k, e.target.checked) });
        caixa.checked = Boolean(k.feito);
        return h(
            "li",
            { class: "linha-acao" + (k.feito ? " feito" : "") },
            h(
                "div",
                { class: "marcar" },
                caixa,
                h(
                    "span",
                    { class: "item-corpo" },
                    h("span", { class: "item-titulo", text: k.titulo }),
                    h("span", { class: "item-info" + (atrasado ? " atrasado" : "") }, juntar(dataCurta(k.data), k.hora, k.feito ? "feito" : atrasado ? `atrasado, era ${relativo(k.data)}` : relativo(k.data), comCliente ? k.cliente : null)),
                ),
            ),
            h("div", { class: "acoes" }, botao("Editar", () => formCompromisso(k), undefined, k.titulo)),
        );
    }

    // ---------- Início ----------

    async function paginaInicio() {
        const r = await api("resumo", { params: { hoje: hoje() } });
        document.title = "Início · Painel";
        const h0 = r.hoje;
        const horaAgora = new Date().getHours();
        const saudacao = horaAgora < 5 ? "Boa noite" : horaAgora < 12 ? "Bom dia" : horaAgora < 18 ? "Boa tarde" : "Boa noite";
        const ano = h0.slice(0, 4);
        const n = r.numeros;

        const numeros = h(
            "div",
            { class: "numeros" },
            h("div", null, h("span", { class: "rotulo" }, "Clientes"), h("strong", null, n.clientes)),
            h("div", null, h("span", { class: "rotulo" }, `Trabalhos em ${ano}`), h("strong", null, n.trabalhos_ano)),
            h("div", null, h("span", { class: "rotulo" }, `Recebido em ${ano}`), h("strong", null, dinheiro(n.recebido_ano)), h("small", null, h("a", { class: "link", href: "#/financeiro" }, "Ver o financeiro"))),
            h(
                "div",
                null,
                h("span", { class: "rotulo" }, "A receber"),
                h("strong", null, dinheiro(r.totais.aberto)),
                r.totais.vencido ? h("small", { class: "atrasado" }, `${dinheiro(r.totais.vencido)} vencido`) : null,
            ),
        );

        const proximos = secao(
            "Próximos trabalhos",
            {},
            r.proximos.length
                ? listaLimitada(r.proximos, (t) =>
                      item({
                          href: "#/trabalhos/" + t.id,
                          dia: t.data,
                          titulo: nomeTrabalho(t),
                          info: juntar(t.cliente, t.hora, t.local),
                          lado: [seloStatus(t.status), h("span", { class: "item-info", text: relativo(t.data) })],
                      }),
                  )
                : vazio("Nenhum trabalho marcado daqui pra frente."),
        );

        const receber = secao(
            "A receber",
            {},
            r.receber.length
                ? listaLimitada(r.receber, (p) => {
                      const vencido = p.vencimento && p.vencimento < h0;
                      return item({
                          href: "#/trabalhos/" + p.trabalho_id,
                          dia: p.vencimento,
                          titulo: `${p.descricao} · ${p.cliente}`,
                          info: h("span", { class: vencido ? "atrasado" : null }, juntar(nomeTrabalho(p), p.vencimento ? (vencido ? `venceu ${relativo(p.vencimento)}` : `vence ${relativo(p.vencimento)}`) : "sem vencimento")),
                          lado: [h("span", { class: "numero", text: dinheiro(p.valor) }), botao("Recebi", () => marcarPago(p), undefined, `${p.descricao} de ${p.cliente}, ${dinheiro(p.valor)}`)],
                      });
                  })
                : vazio("Nada em aberto."),
        );

        const entregas = secao(
            "Para entregar",
            {},
            r.entregas.length
                ? listaLimitada(r.entregas, (t) => {
                      const atrasado = t.prazo_entrega && t.prazo_entrega < h0;
                      const prazo = !t.prazo_entrega ? "sem prazo" : atrasado ? `atrasado, o prazo era ${relativo(t.prazo_entrega) === "ontem" ? "ontem" : dataMedia(t.prazo_entrega)}` : `entregar ${relativo(t.prazo_entrega)}`;
                      return item({
                          href: "#/trabalhos/" + t.id,
                          dia: t.prazo_entrega,
                          titulo: `${nomeTrabalho(t)} · ${t.cliente}`,
                          info: h("span", { class: atrasado ? "atrasado" : null }, juntar(prazo, t.data ? `fotografado em ${dataMedia(t.data)}` : null)),
                          lado: seloStatus(t.status),
                      });
                  })
                : vazio("Nenhuma entrega pendente."),
        );

        const pendencias = secao(
            "Pendências",
            {},
            r.pendencias.length
                ? listaLimitada(r.pendencias, (t) =>
                      item({
                          href: "#/trabalhos/" + t.id,
                          semDia: true,
                          titulo: `${nomeTrabalho(t)} · ${t.cliente}`,
                          info: juntar(
                              t.contrato === "a_enviar" ? "contrato a enviar" : t.contrato === "enviado" ? "contrato enviado, falta assinar" : null,
                              t.autorizacao === "pendente" ? "autorização de imagem pendente" : null,
                          ),
                          lado: t.data ? h("span", { class: "item-info", text: dataCurta(t.data) }) : null,
                      }),
                  )
                : vazio("Contratos e autorizações em dia."),
        );

        const compromissos = secao(
            "Compromissos",
            { nota: "próximos 14 dias", acoes: [botao("Novo compromisso", () => formCompromisso(null))] },
            r.compromissos.length ? listaLimitada(r.compromissos, (k) => linhaCompromisso(k, h0, true)) : vazio("Nada marcado pros próximos dias."),
        );

        return pagina(
            cabeca({
                rotulo: primeiraMaiuscula(fSemana.format(paraData(h0))),
                titulo: `${saudacao}, Kaique.`,
                acoes: [h("button", { type: "button", class: "botao", "data-foco": "novo-cliente", onclick: () => formCliente(null) }, "Novo cliente")],
            }),
            numeros,
            h("div", { class: "duas" }, proximos, receber, entregas, pendencias),
            compromissos,
            rodape(),
        );
    }

    function rodape() {
        return h(
            "footer",
            { class: "rodape" },
            h("a", { href: "/api/backup", download: "" }, "Baixar backup (JSON)"),
            h("button", { type: "button", "data-foco": "seus-dados", onclick: () => formAjustes() }, "Seus dados do contrato"),
            h("button", { type: "button", onclick: sair }, "Sair"),
        );
    }

    // ---------- Clientes ----------

    let ultimaBusca = "";

    async function paginaClientes() {
        const lista = h("ul", { class: "lista" });
        document.title = "Clientes · Painel";
        const contagem = h("p", { class: "rotulo contagem", role: "status" });
        const busca = h("input", { type: "search", placeholder: "Buscar por nome, telefone, e-mail, CPF ou Instagram", "aria-label": "Buscar clientes", value: ultimaBusca, autocomplete: "off" });
        let vez = 0;

        async function carregar() {
            const minha = ++vez;
            const q = busca.value.trim();
            ultimaBusca = q;
            const { clientes } = await api("clientes", { params: { q, hoje: hoje() } });
            if (minha !== vez) return;
            contagem.textContent = q ? `${clientes.length} encontrado${clientes.length === 1 ? "" : "s"}` : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`;
            lista.replaceChildren(
                ...clientes.map((c) =>
                    item({
                        href: "#/clientes/" + c.id,
                        semDia: true,
                        titulo: c.nome,
                        info: juntar(telefoneBonito(c.telefone), c.cidade, c.trabalhos ? `${c.trabalhos} trabalho${c.trabalhos === 1 ? "" : "s"}` : null),
                        lado: c.proximo ? selo("Próximo: " + dataCurta(c.proximo)) : null,
                    }),
                ),
            );
            if (!clientes.length) lista.replaceChildren(h("li", null, vazio(q ? `Ninguém encontrado com “${q}”.` : "Nenhum cliente ainda. Comece pelo botão Novo cliente.")));
        }

        let espera;
        busca.addEventListener("input", () => {
            clearTimeout(espera);
            espera = setTimeout(() => carregar().catch((e) => e.status !== 401 && aviso(e.message, true)), 220);
        });
        await carregar();

        return pagina(
            cabeca({ titulo: "Clientes", acoes: [h("button", { type: "button", class: "botao", "data-foco": "novo-cliente", onclick: () => formCliente(null) }, "Novo cliente")] }),
            h("div", { class: "busca" }, busca),
            contagem,
            lista,
        );
    }

    async function paginaCliente(id) {
        const { cliente: c, trabalhos, documentos, compromissos } = await api("clientes/" + id);
        document.title = `${c.nome} · Painel`;
        const zap = linkWhatsApp(c.telefone);
        const insta = linkInstagram(c.instagram);
        const contatos = [
            zap ? externo(zap, "WhatsApp " + telefoneBonito(c.telefone)) : c.telefone ? h("span", { text: c.telefone }) : null,
            c.email ? h("a", { class: "link", href: "mailto:" + c.email }, c.email) : null,
            insta ? externo(insta, c.instagram) : null,
        ].filter(Boolean);

        const listaTrabalhos = trabalhos.length
            ? h(
                  "ul",
                  { class: "lista" },
                  trabalhos.map((t) => {
                      const falta = t.valor - t.recebido;
                      return item({
                          href: "#/trabalhos/" + t.id,
                          dia: t.data,
                          titulo: nomeTrabalho(t),
                          info: juntar(t.titulo ? t.tipo : null, t.pacote, t.hora, t.local),
                          lado: [
                              seloStatus(t.status),
                              t.valor ? h("span", { class: "item-info numero", text: falta > 0 && t.status !== "cancelado" ? `falta ${dinheiro(falta)}` : dinheiro(t.valor) }) : null,
                          ],
                      });
                  }),
              )
            : vazio("Nenhum trabalho ainda.");

        const apagarCliente = async () => {
            const texto = `Apagar ${c.nome} e tudo o que é dele? Vão junto ${trabalhos.length} trabalho${trabalhos.length === 1 ? "" : "s"}, os pagamentos, ${documentos.length} arquivo${documentos.length === 1 ? "" : "s"} e os compromissos.\n\nNão dá pra desfazer.`;
            if (await confirmar("Apagar cliente", texto, "Apagar tudo")) {
                try {
                    await api("clientes/" + c.id, { metodo: "DELETE" });
                    aviso("Cliente apagado.");
                    location.hash = "#/clientes";
                } catch (e) {
                    if (e.status !== 401) aviso(e.message, true);
                }
            }
        };

        const anos = idade(c.nascimento);
        return pagina(
            cabeca({
                voltar: ["#/clientes", "Clientes"],
                titulo: c.nome,
                meta: contatos.length ? h("span", { class: "contatos" }, contatos) : null,
                acoes: [botao("Editar", () => formCliente(c), "botao leve", "cliente"), h("button", { type: "button", class: "botao", "data-foco": "novo-trabalho", onclick: () => formTrabalho(null, c.id) }, "Novo trabalho")],
            }),
            secao("Trabalhos", { nota: trabalhos.length ? String(trabalhos.length) : null }, listaTrabalhos),
            secaoCompromissos(compromissos, { clienteId: c.id }),
            secaoDocumentos(documentos, { clienteId: c.id, trabalhos }),
            secao(
                "Dados",
                { acoes: [botao("Editar", () => formCliente(c), undefined, "dados do cliente")] },
                ficha([
                    ["WhatsApp", telefoneBonito(c.telefone)],
                    ["E-mail", c.email],
                    ["Instagram", c.instagram],
                    ["CPF", c.cpf],
                    ["RG", c.rg],
                    ["Nascimento", c.nascimento ? `${dataMedia(c.nascimento)}${anos !== null ? ` (${anos} anos)` : ""}` : null],
                    ["Cidade", c.cidade],
                    ["Como conheceu", c.origem],
                    ["Cliente desde", dataMedia(diaDoInstante(c.criado_em))],
                    ["Endereço", c.endereco, true],
                    c.observacoes ? ["Observações", c.observacoes, true] : null,
                ]),
            ),
            h("div", { class: "rodape" }, h("button", { type: "button", class: "link perigo", onclick: apagarCliente }, "Apagar cliente")),
        );
    }

    // ---------- Trabalho ----------

    async function paginaTrabalho(id) {
        const { trabalho: t, cliente: c, pagamentos, documentos, compromissos } = await api("trabalhos/" + id);
        const h0 = hoje();
        document.title = `${nomeTrabalho(t)} · Painel`;
        const recebido = pagamentos.filter((p) => p.pago_em).reduce((s, p) => s + p.valor, 0);
        const previsto = pagamentos.reduce((s, p) => s + p.valor, 0);
        const falta = Math.max(0, t.valor - recebido);

        async function mudar(campo, valor) {
            const corpo = { [campo]: valor };
            if (campo === "status" && valor === "entregue" && !t.entregue_em) corpo.entregue_em = h0;
            // voltou de "Entregue": sem isso o trabalho some de "Para entregar"
            if (campo === "status" && valor !== "entregue" && t.entregue_em) corpo.entregue_em = "";
            try {
                await api("trabalhos/" + t.id, { metodo: "PUT", corpo });
                aviso("Salvo.");
                recarregar();
            } catch (e) {
                if (e.status !== 401) aviso(e.message, true);
            }
        }
        // um clique muda e salva; o atual fica marcado (aria-pressed)
        const escolhas = (campo, rotulo, opcoes) =>
            h(
                "div",
                { class: "escolhas", role: "group", "aria-label": rotulo },
                opcoesDe(opcoes).map(([v, r]) =>
                    h("button", { type: "button", class: "escolha", "aria-pressed": String(t[campo] === v), "data-foco": `escolha|${campo}|${v}`, onclick: () => t[campo] !== v && mudar(campo, v) }, r),
                ),
            );

        const prazoTexto = t.prazo_entrega
            ? h("span", { class: !t.entregue_em && t.prazo_entrega < h0 && ["confirmado", "edicao"].includes(t.status) ? "atrasado" : null }, `${dataMedia(t.prazo_entrega)}${!t.entregue_em ? ` (${relativo(t.prazo_entrega)})` : ""}`)
            : null;
        const fimLink = t.entregue_em ? somarDias(t.entregue_em, DIAS_LINK) : null;
        const galeria = t.galeria
            ? h("span", null, externo(t.galeria, "Abrir galeria"), fimLink ? h("span", { class: fimLink < h0 ? "atrasado" : "cinza" }, ` · link ${fimLink < h0 ? "venceu em" : "até"} ${dataMedia(fimLink)}`) : null)
            : null;

        const linhasPagamento = pagamentos.map((p) => {
            const vencido = !p.pago_em && p.vencimento && p.vencimento < h0;
            return h(
                "li",
                { class: "linha-acao" },
                h(
                    "div",
                    { class: "item-corpo" },
                    h("span", { class: "item-titulo" }, p.descricao, " ", p.pago_em ? selo("Pago", "apagado") : vencido ? selo("Vencido", "alerta") : null),
                    h("span", { class: "item-info" + (vencido ? " atrasado" : "") }, juntar(p.pago_em ? `pago em ${dataMedia(p.pago_em)}` : p.vencimento ? `vence em ${dataMedia(p.vencimento)} (${relativo(p.vencimento)})` : "sem vencimento", p.forma)),
                ),
                h("div", { class: "acoes" }, h("span", { class: "numero valor-pagamento", text: dinheiro(p.valor) }), !p.pago_em ? botao("Recebi", () => marcarPago(p), undefined, `${p.descricao}, ${dinheiro(p.valor)}`) : null, botao("Editar", () => formPagamento(p), undefined, `pagamento ${p.descricao}`)),
            );
        });

        async function sinalERestante() {
            const sinal = Math.round(t.valor * SINAL);
            const restante = t.valor - sinal;
            const texto = `Sinal (30%): ${dinheiro(sinal)}, vencendo hoje.\nRestante: ${dinheiro(restante)}, ${t.data ? `no dia do trabalho (${dataMedia(t.data)})` : "sem vencimento (o trabalho está sem data)"}.`;
            if (!(await confirmar("Sinal e restante", texto, "Criar pagamentos"))) return;
            try {
                await api("pagamentos", { metodo: "POST", corpo: { trabalho_id: t.id, descricao: "Sinal (30%)", valor: sinal, vencimento: h0 } });
                await api("pagamentos", { metodo: "POST", corpo: { trabalho_id: t.id, descricao: "Restante", valor: restante, vencimento: t.data || "" } });
                aviso("Pagamentos criados.");
                recarregar();
            } catch (e) {
                if (e.status !== 401) aviso(e.message, true);
            }
        }

        const apagarTrabalho = async () => {
            if (await confirmar("Apagar trabalho", `Apagar “${nomeTrabalho(t)}”? Os pagamentos e compromissos dele vão junto. Os arquivos continuam na ficha de ${c.nome}.\n\nNão dá pra desfazer.`)) {
                try {
                    await api("trabalhos/" + t.id, { metodo: "DELETE" });
                    aviso("Trabalho apagado.");
                    location.hash = "#/clientes/" + c.id;
                } catch (e) {
                    if (e.status !== 401) aviso(e.message, true);
                }
            }
        };

        return pagina(
            cabeca({
                voltar: ["#/clientes/" + c.id, c.nome],
                rotulo: juntar(t.tipo, t.pacote),
                titulo: nomeTrabalho(t),
                meta: t.data ? juntar(primeiraMaiuscula(dataLonga(t.data)), t.hora, t.local) : juntar("Sem data", t.local),
                acoes: [
                    seloStatus(t.status),
                    h("a", { class: "botao leve", href: `#/trabalhos/${t.id}/contrato` }, "Contrato em PDF"),
                    botao("Editar", () => formTrabalho(t), "botao leve", "trabalho"),
                ],
            }),
            ficha([
                ["Situação", escolhas("status", "Situação", STATUS), true],
                ["Contrato", escolhas("contrato", "Contrato", CONTRATO_CURTO), true],
                ["Autorização de imagem", escolhas("autorizacao", "Autorização de imagem", AUTORIZACAO), true],
                ["Cliente", h("a", { class: "link", href: "#/clientes/" + c.id }, c.nome)],
                ["Valor", t.valor ? dinheiro(t.valor) : null],
                ["Falta receber", t.valor ? h("span", { class: "numero" }, dinheiro(falta)) : null],
                ["Prazo de entrega", prazoTexto],
                ["Entregue em", t.entregue_em ? dataMedia(t.entregue_em) : null],
                ["Galeria", galeria],
                t.observacoes ? ["Observações", t.observacoes, true] : null,
            ]),
            secao(
                "Pagamentos",
                {
                    acoes: [
                        !pagamentos.length && t.valor ? botao("Sinal 30% + restante", sinalERestante) : null,
                        botao("Novo pagamento", () => formPagamento(null, t.id)),
                    ],
                },
                pagamentos.length ? h("ul", { class: "lista" }, linhasPagamento) : vazio(t.valor ? "Nenhum pagamento ainda." : "Coloque o valor do trabalho em Editar pra controlar os pagamentos."),
                t.valor || pagamentos.length
                    ? h(
                          "p",
                          { class: "saldo" },
                          h("span", null, "Recebido ", h("strong", { class: "numero" }, dinheiro(recebido))),
                          h("span", null, "Falta ", h("strong", { class: "numero" }, dinheiro(falta))),
                          previsto !== t.valor && pagamentos.length ? h("span", null, `Os pagamentos somam ${dinheiro(previsto)} e o valor do trabalho é ${dinheiro(t.valor)}.`) : null,
                      )
                    : null,
            ),
            secaoCompromissos(compromissos, { trabalhoId: t.id }),
            secaoDocumentos(documentos, { clienteId: c.id, trabalhoId: t.id }),
            h("div", { class: "rodape" }, h("button", { type: "button", class: "link perigo", onclick: apagarTrabalho }, "Apagar trabalho")),
        );
    }

    // ---------- Contrato ----------

    // valor por extenso, como vai no contrato: "dois mil e noventa reais"
    const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    function ate999(n) {
        if (n === 100) return "cem";
        const partes = [];
        if (n >= 100) partes.push(CENTENAS[Math.floor(n / 100)]);
        const r = n % 100;
        if (r) partes.push(r < 20 ? UNIDADES[r] : DEZENAS[Math.floor(r / 10)] + (r % 10 ? " e " + UNIDADES[r % 10] : ""));
        return partes.join(" e ");
    }
    function inteiroPorExtenso(n) {
        const grupos = [
            [Math.floor(n / 1e6), (x) => (x === 1 ? "um milhão" : ate999(x) + " milhões")],
            [Math.floor(n / 1000) % 1000, (x) => (x === 1 ? "mil" : ate999(x) + " mil")],
            [n % 1000, ate999],
        ].filter(([x]) => x);
        // o último grupo leva "e" quando é menor que cem ou é centena redonda: "mil e quinhentos", "mil duzentos e noventa"
        return grupos.map(([x, texto], i) => (i === 0 ? "" : i === grupos.length - 1 && (x < 100 || x % 100 === 0) ? " e " : " ") + texto(x)).join("");
    }
    function porExtenso(centavos) {
        const reais = Math.floor(centavos / 100);
        const cents = centavos % 100;
        const partes = [];
        if (reais) partes.push(inteiroPorExtenso(reais) + (reais === 1 ? " real" : reais % 1e6 === 0 ? " de reais" : " reais"));
        if (cents) partes.push(ate999(cents) + (cents === 1 ? " centavo" : " centavos"));
        return partes.join(" e ") || "zero reais";
    }

    function cnpjValido(c) {
        const d = digitos(c);
        if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
        const digito = (n) => {
            let s = 0;
            for (let i = 0, peso = n - 7; i < n; i++, peso = peso === 2 ? 9 : peso - 1) s += Number(d[i]) * peso;
            return s % 11 < 2 ? 0 : 11 - (s % 11);
        };
        return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
    }
    const cnpjBonito = (d) => `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    const horaBonita = (hh) => (hh ? hh.replace(":", "h") : "");
    const fDataContrato = fmt({ day: "numeric", month: "long", year: "numeric" });
    const listaTexto = (itens) => new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(itens);
    const simples = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function lerDetalhes(s) {
        try {
            const d = JSON.parse(s || "{}");
            return d && typeof d === "object" && !Array.isArray(d) ? d : {};
        } catch {
            return {};
        }
    }

    async function formAjustes(atual) {
        const aj = atual || (await api("ajustes"));
        const padrao = (chave) => `Vazio: ${AJUSTES_PADRAO[chave]}.`;
        const dias = { tipo: "number", attrs: { min: 0, max: 365, step: 1, inputmode: "numeric" } };
        abrirJanela({
            titulo: "Seus dados do contrato",
            corpo: h(
                "div",
                null,
                h("p", { class: "texto-janela nota-janela" }, "Vão só nos contratos que o painel monta. Ficam guardados aqui no painel, atrás da senha: não aparecem no site nem no GitHub."),
                campos(
                    [
                        { nome: "nome", rotulo: "Seu nome no contrato", inteira: true, attrs: { maxlength: 120 }, ajuda: "Pode ser o nome completo. " + padrao("nome") },
                        { nome: "documento", rotulo: "CPF ou CNPJ", attrs: { inputmode: "numeric", maxlength: 30 } },
                        { nome: "telefone", rotulo: "Telefone", tipo: "tel", attrs: { inputmode: "tel", maxlength: 30 }, ajuda: padrao("telefone") },
                        { nome: "endereco", rotulo: "Endereço", inteira: true, attrs: { maxlength: 300, placeholder: "Rua, número, bairro, Ribeirão Preto, SP" } },
                        { nome: "forma", rotulo: "Formas de pagamento", inteira: true, attrs: { maxlength: 120 }, ajuda: "Cláusula 3. " + padrao("forma") },
                        { nome: "deslocamento", rotulo: "Deslocamento para outras cidades", inteira: true, attrs: { maxlength: 160 }, ajuda: "Cláusula 7, “o contratante paga …”. " + padrao("deslocamento") },
                        { nome: "dias_roteiro", rotulo: "Roteiro do dia: dias antes", ...dias, ajuda: "Cláusula 6. " + padrao("dias_roteiro") },
                        { nome: "dias_hora_adicional", rotulo: "Pagar hora adicional: dias depois", ...dias, ajuda: "Cláusula 7. " + padrao("dias_hora_adicional") },
                        { nome: "dias_remarcacao", rotulo: "Avisar remarcação: dias antes", ...dias, ajuda: "Cláusula 10. " + padrao("dias_remarcacao") },
                        { nome: "dias_devolucao", rotulo: "Devolver se você desistir: dias", ...dias, ajuda: "Cláusula 10. " + padrao("dias_devolucao") },
                    ],
                    aj,
                ),
            ),
            aoEnviar: async (form) => {
                const dados = lerCampos(form);
                if (dados.documento) {
                    const d = digitos(dados.documento);
                    if (d.length === 11 && cpfValido(d)) dados.documento = cpfBonito(d);
                    else if (d.length === 14 && cnpjValido(d)) dados.documento = cnpjBonito(d);
                    else {
                        form.elements.documento.setAttribute("aria-invalid", "true");
                        throw new Error("Esse CPF ou CNPJ não existe. Confira os números.");
                    }
                }
                if (dados.telefone) dados.telefone = telefoneBonito(dados.telefone);
                await api("ajustes", { metodo: "PUT", corpo: dados });
                aviso("Seus dados foram salvos.");
                recarregar();
            },
        });
    }

    // o que muda no contrato deste trabalho (o resto vem do pacote e dos seus dados)
    function formDetalhes(t, base) {
        const doPacote = (texto) => (texto ? `Vazio: ${texto}.` : "O pacote não diz: escreva aqui.");
        abrirJanela({
            titulo: "Ajustar o contrato",
            corpo: h(
                "div",
                null,
                h("p", { class: "texto-janela nota-janela" }, `Só pra este trabalho. O que ficar vazio usa ${base.pacote ? `o ${base.pacote.nome}, como no orçamento` : "o padrão"}. A data, o horário, o local, o valor e o prazo de entrega mudam em “Editar trabalho”.`),
                campos(
                    [
                        { nome: "duracao", rotulo: "Duração da cobertura", inteira: true, attrs: { maxlength: 120 }, ajuda: doPacote(base.duracao) },
                        { nome: "equipe", rotulo: "Equipe", lista: ["1 fotógrafo", DUPLA], attrs: { maxlength: 80 }, ajuda: doPacote(base.equipe) },
                        { nome: "fotos", rotulo: "Fotos editadas", attrs: { maxlength: 80 }, ajuda: doPacote(base.fotos) },
                        { nome: "previa", rotulo: "Prévia", inteira: true, attrs: { maxlength: 120 }, ajuda: doPacote(base.previa) },
                        { nome: "extra", rotulo: "Ensaio extra", inteira: true, attrs: { maxlength: 200 }, ajuda: doPacote(base.extra) },
                        { nome: "hora_adicional", rotulo: "Hora adicional (R$)", tipo: "dinheiro", ajuda: base.hora ? `Vazio: ${dinheiro(base.hora)}, do orçamento.` : "O orçamento deste tipo não tem: escreva aqui." },
                        { nome: "data_contrato", rotulo: "Data do contrato", tipo: "date", ajuda: "Vazio: o dia em que baixar." },
                        { nome: "forma", rotulo: "Forma de pagamento", inteira: true, attrs: { maxlength: 120 }, ajuda: `Vazio: ${base.forma}.` },
                        { nome: "deslocamento", rotulo: "Deslocamento para outra cidade", inteira: true, attrs: { maxlength: 160, placeholder: "Ex.: valor fixo de R$ 80,00" }, ajuda: `Vazio: ${base.deslocamento}.` },
                    ],
                    lerDetalhes(t.contrato_detalhes),
                ),
            ),
            aoEnviar: async (form) => {
                await api("trabalhos/" + t.id, { metodo: "PUT", corpo: { contrato_detalhes: lerCampos(form) } });
                aviso("Contrato ajustado.");
                recarregar();
            },
        });
    }

    async function paginaContrato(id) {
        const [r, aj] = await Promise.all([api("trabalhos/" + id), api("ajustes")]);
        const { trabalho: t, cliente: c, pagamentos } = r;
        const det = lerDetalhes(t.contrato_detalhes);
        const eu = { ...AJUSTES_PADRAO, ...aj };
        const pacote = pacoteDe(t.pacote);
        const base = { pacote, duracao: pacote?.duracao, equipe: pacote?.equipe, fotos: pacote?.fotos, previa: pacote?.previa, extra: pacote?.extra, hora: HORA_ADICIONAL[t.tipo], forma: eu.forma, deslocamento: eu.deslocamento };
        const usa = (chave) => det[chave] || base[chave];
        document.title = `Contrato ${c.nome} · ${t.pacote || nomeTrabalho(t)}`;

        // o que falta sai no PDF como uma linha em branco, pra preencher à mão; na tela, vira um aviso com o botão que resolve
        const ACOES = {
            cliente: ["Completar cliente", async () => formCliente((await api("clientes/" + c.id)).cliente)],
            trabalho: ["Editar trabalho", () => formTrabalho(t)],
            contrato: ["Ajustar contrato", () => formDetalhes(t, base)],
            eu: ["Seus dados", () => formAjustes(aj)],
        };
        const GRUPOS = { cliente: `Do cliente`, trabalho: "Do trabalho", contrato: "Do pacote", eu: "Seus dados" };
        const faltas = new Map();
        const preencher = (valor, oQue, grupo) => {
            if (valor !== null && valor !== undefined && String(valor).trim() !== "") return String(valor);
            if (!faltas.has(grupo)) faltas.set(grupo, new Set());
            faltas.get(grupo).add(oQue);
            return h("span", { class: "preencher" }, h("span", { class: "preencher-texto" }, `[${oQue}]`));
        };

        const enderecoCliente = c.endereco && c.cidade && !simples(c.endereco).includes(simples(c.cidade.split(",")[0])) ? `${c.endereco}, ${c.cidade}` : c.endereco;
        const nomeCliente = c.nome;
        const cpfCliente = () => preencher(c.cpf, "CPF", "cliente"); // aparece em dois lugares: cada um com a sua linha
        const temValor = t.valor > 0;
        const sinal = Math.round(t.valor * SINAL);
        const valorTotal = preencher(temValor ? `${dinheiro(t.valor)} (${porExtenso(t.valor)})` : null, "valor", "trabalho");
        const n = t.data && t.prazo_entrega ? diasEntre(t.data, t.prazo_entrega) : null;
        const prazo = n !== null && n >= 0 ? `Até ${n} ${n === 1 ? "dia" : "dias"} após o evento (${dataMedia(t.prazo_entrega)})` : pacote ? `Até ${pacote.prazo} dias após o evento` : null;
        const horaAdicional = det.hora_adicional || base.hora;

        // ---- peças da folha ----
        const folha = (numero, conteudo, direita) =>
            h(
                "article",
                { class: "folha", "aria-label": `Página ${numero} de 4` },
                h("header", { class: "folha-topo" }, h("span", null, "Kaique Mota"), h("span", { class: "cinza" }, `Contrato · ${pad(numero)} de 04`)),
                conteudo,
                h(
                    "footer",
                    { class: "folha-base" },
                    h("span", null, `Kaique Mota · Fotografia · ${eu.telefone}`),
                    direita || h("span", { class: "rubricas" }, "Rubricas", h("span", { class: "rubrica" }), h("span", { class: "rubrica" })),
                ),
            );
        const clausula = (numero, titulo, ...corpo) => h("section", { class: "clausula" }, h("p", { class: "clausula-num" }, `CLÁUSULA ${pad(numero)}`), h("h2", null, titulo), corpo);
        const par = (...partes) => h("p", null, partes);
        const numerada = (itens) => h("ol", { class: "itens" }, itens.map((x, i) => h("li", null, h("span", { class: "marcador" }, `${i + 1}.`), h("span", null, x))));
        const dado = (rotulo, valor, larga) => h("p", { class: "dado" + (larga ? " larga" : "") }, h("span", { class: "cinza" }, `${rotulo}: `), valor);
        const caixa = (marcada, texto) =>
            h("p", { class: "opcao" }, h("span", { class: "caixa", "aria-hidden": "true" }, marcada ? "×" : ""), h("span", null, texto, marcada ? escondido(" (marcado)") : null));
        const italico = (texto) => h("em", null, texto);

        const folha1 = folha(
            1,
            [
                h("div", { class: "folha-abre" }, h("p", { class: "folha-titulo" }, "Contrato"), h("p", { class: "folha-sub" }, "Prestação de serviços fotográficos")),
                h(
                    "div",
                    { class: "folha-corpo com-linha" },
                    clausula(
                        1,
                        "Partes",
                        h("p", { class: "papel" }, "CONTRATANTE"),
                        h(
                            "div",
                            { class: "dados" },
                            dado("Nome", nomeCliente),
                            dado("CPF", cpfCliente()),
                            dado("Endereço", preencher(enderecoCliente, "endereço", "cliente"), true),
                            dado("Telefone", preencher(c.telefone ? telefoneBonito(c.telefone) : null, "telefone", "cliente")),
                            dado("E-mail", preencher(c.email, "e-mail", "cliente")),
                        ),
                        h("p", { class: "papel" }, "FOTÓGRAFO"),
                        h(
                            "div",
                            { class: "dados" },
                            dado("Nome", eu.nome),
                            dado("CPF/CNPJ", preencher(aj.documento, "seu CPF ou CNPJ", "eu")),
                            dado("Endereço", preencher(aj.endereco, "seu endereço", "eu"), true),
                            dado("Telefone", eu.telefone),
                            dado("Instagram", "@okaiquemota"),
                        ),
                        par("As partes acima, daqui em diante chamadas CONTRATANTE e FOTÓGRAFO, celebram este contrato de prestação de serviços fotográficos, que segue as cláusulas abaixo."),
                    ),
                    clausula(
                        2,
                        "Objeto",
                        par("O FOTÓGRAFO fará a cobertura fotográfica descrita abaixo, conforme o pacote escolhido no orçamento enviado ao CONTRATANTE, que faz parte deste contrato."),
                        h(
                            "dl",
                            { class: "objeto" },
                            [
                                ["Pacote", preencher(t.pacote, "pacote", "trabalho")],
                                ["Data do evento", preencher(t.data ? dataMedia(t.data) : null, "data", "trabalho")],
                                ["Local", preencher(t.local, "local", "trabalho")],
                                ["Horário de início", preencher(horaBonita(t.hora), "horário", "trabalho")],
                                ["Duração da cobertura", preencher(usa("duracao"), "duração", "contrato")],
                                ["Equipe", preencher(usa("equipe"), "equipe", "contrato")],
                                ["Fotos editadas", preencher(usa("fotos"), "fotos editadas", "contrato")],
                                ["Prévia", preencher(usa("previa"), "prévia", "contrato")],
                                ["Prazo de entrega", preencher(prazo, "prazo de entrega", "trabalho")],
                                ["Ensaio extra", preencher(usa("extra"), "ensaio extra", "contrato")],
                            ].map(([rotulo, valor]) => h("div", null, h("dt", null, rotulo), h("dd", null, valor))),
                        ),
                        par("Serviços que não estão no pacote, como álbum impresso ou horas extras, só fazem parte deste contrato se forem acrescentados por escrito."),
                    ),
                ),
            ],
        );

        const folha2 = folha(
            2,
            h(
                "div",
                { class: "folha-corpo" },
                clausula(
                    3,
                    "Valor e pagamento",
                    par("O valor total dos serviços é de ", valorTotal, ", pago em duas partes:"),
                    numerada([
                        ["Sinal de 30%: ", preencher(temValor ? dinheiro(sinal) : null, "valor", "trabalho"), ", na assinatura deste contrato."],
                        ["Restante de 70%: ", preencher(temValor ? dinheiro(t.valor - sinal) : null, "valor", "trabalho"), ", até o dia do evento ou do ensaio, antes do início da cobertura."],
                    ]),
                    par("Forma de pagamento: ", usa("forma"), "."),
                    par("O sinal confirma a reserva e é descontado do valor total. A entrega das fotos depende do pagamento integral. Atraso no pagamento do restante gera multa de 2% e juros de 1% ao mês sobre o valor em aberto."),
                ),
                clausula(
                    4,
                    "Reserva da data",
                    par("A data só fica reservada depois que o sinal é pago e este contrato é assinado pelas duas partes. Até lá, o FOTÓGRAFO pode aceitar outro trabalho para o mesmo dia."),
                    par("Com a reserva confirmada, o FOTÓGRAFO se compromete a não aceitar outro evento que conflite com o horário contratado."),
                ),
                clausula(
                    5,
                    "Obrigações do fotógrafo",
                    par("O FOTÓGRAFO se compromete a:"),
                    numerada([
                        "Chegar ao local no horário combinado, com a equipe prevista no pacote.",
                        "Levar equipamento profissional e equipamento reserva: câmera, lentes, baterias e cartões de memória.",
                        "Fotografar os momentos combinados com o CONTRATANTE, com direção de poses quando necessário.",
                        "Manter cópia de segurança dos arquivos até a entrega final.",
                        "Selecionar e editar as fotos e entregar a prévia e as fotos finais nos prazos do pacote.",
                        "Avisar o CONTRATANTE com antecedência sobre qualquer imprevisto que afete o serviço.",
                    ]),
                    par("Quando o pacote incluir dupla de fotógrafos, o segundo profissional é escolhido pelo FOTÓGRAFO, que responde pelo trabalho dele."),
                ),
                clausula(
                    6,
                    "Obrigações do contratante",
                    par("O CONTRATANTE se compromete a:"),
                    numerada([
                        `Enviar, até ${eu.dias_roteiro} dias antes do evento, o roteiro do dia e a lista de fotos que não podem faltar.`,
                        "Garantir o acesso da equipe aos locais combinados, incluindo preparação, cerimônia e festa.",
                        "Oferecer refeição à equipe em coberturas com mais de 5 horas.",
                        "Avisar com antecedência qualquer mudança de horário, local ou programação.",
                        "Informar se houver alguma restrição de fotos no local, como regras de igreja ou cerimonial.",
                    ]),
                    par("Atrasos ou mudanças de programação que não dependam do FOTÓGRAFO não aumentam a duração contratada. Momentos que aconteçam fora do horário contratado podem não ser fotografados."),
                ),
            ),
        );

        const folha3 = folha(
            3,
            h(
                "div",
                { class: "folha-corpo" },
                clausula(
                    7,
                    "Horas adicionais e deslocamento",
                    par("As horas contam a partir da chegada do FOTÓGRAFO ao primeiro local combinado. Making of e mini ensaio fazem parte do total de horas do pacote."),
                    par(
                        "Se o CONTRATANTE quiser estender a cobertura no dia, a hora adicional custa ",
                        preencher(horaAdicional ? dinheiro(horaAdicional) : null, "valor da hora adicional", "contrato"),
                        ` e depende da disponibilidade da equipe. Ela é paga até ${eu.dias_hora_adicional} dias após o evento.`,
                    ),
                    par(`O deslocamento em Ribeirão Preto está incluso. Para outras cidades, o CONTRATANTE paga ${usa("deslocamento")}, combinado antes da assinatura. Se for preciso hospedagem, ela também fica por conta do CONTRATANTE.`),
                ),
                clausula(
                    8,
                    "Entrega, seleção e edição",
                    par(`As fotos são entregues em alta resolução por link do Google Drive, no prazo do pacote, contado a partir da data do evento. O link fica disponível por ${DIAS_LINK} dias. Depois disso, guardar os arquivos é responsabilidade do CONTRATANTE.`),
                    par("A seleção das fotos e o estilo de edição são do FOTÓGRAFO, no mesmo padrão do portfólio apresentado. A quantidade de fotos do pacote pode variar em até 10%, para mais ou para menos, conforme o andamento do evento."),
                    par("Arquivos brutos (RAW) e fotos não selecionadas não são entregues. Retoques além da edição padrão, como manipulação de corpo ou remoção de objetos complexos, não estão inclusos e podem ser orçados à parte."),
                ),
                clausula(
                    9,
                    "Direitos autorais e uso de imagem",
                    par("As fotos são obra do FOTÓGRAFO, que mantém os direitos autorais (Lei 9.610/98). O CONTRATANTE pode usar as fotos livremente para fins pessoais: imprimir, guardar e publicar nas redes sociais, de preferência com o crédito @okaiquemota. Vender as fotos ou usá-las em publicidade depende de autorização por escrito."),
                    par("O FOTÓGRAFO pode usar algumas fotos no portfólio, no site e nas redes sociais, somente se o CONTRATANTE autorizar abaixo:"),
                    h(
                        "div",
                        { class: "opcoes" },
                        caixa(t.autorizacao === "sim", "Autorizo o uso das fotos no portfólio e nas redes do FOTÓGRAFO."),
                        caixa(t.autorizacao === "nao", "Não autorizo o uso das fotos fora da entrega ao CONTRATANTE."),
                    ),
                    par("A autorização pode ser retirada a qualquer momento, por escrito, valendo para publicações futuras."),
                ),
            ),
        );

        const folha4 = folha(
            4,
            h(
                "div",
                { class: "folha-corpo" },
                clausula(
                    10,
                    "Remarcação e cancelamento",
                    par(italico("Direito de arrependimento."), " Quando o contrato for fechado à distância, por WhatsApp, e-mail ou outro meio fora de um estabelecimento comercial, o CONTRATANTE pode desistir em até 7 dias após a assinatura, com devolução integral do que pagou (Código de Defesa do Consumidor, art. 49)."),
                    par(italico("Remarcação."), ` O CONTRATANTE pode remarcar a data uma vez, sem custo, avisando com pelo menos ${eu.dias_remarcacao} dias de antecedência, desde que o FOTÓGRAFO tenha a nova data livre. O sinal pago vale para a nova data. Sem data livre, a remarcação é tratada como cancelamento.`),
                    par(italico("Cancelamento pelo CONTRATANTE."), " Depois dos 7 dias de arrependimento, o sinal de 30% fica com o FOTÓGRAFO como multa e compensação pela data reservada (Código Civil, art. 418), seja qual for a antecedência do aviso. O restante do valor não é cobrado."),
                    par(italico("Cancelamento pelo FOTÓGRAFO."), ` Se o FOTÓGRAFO desistir do serviço, devolve todo o valor pago e mais um valor igual ao sinal (Código Civil, art. 418), em até ${eu.dias_devolucao} dias. Se o CONTRATANTE quiser, ele também indica outro profissional. Casos de força maior seguem a cláusula 11.`),
                ),
                clausula(
                    11,
                    "Força maior e falhas técnicas",
                    par("Se o FOTÓGRAFO não puder comparecer por motivo de força maior, como doença grave, acidente ou morte na família, ele avisa o CONTRATANTE assim que possível e tenta enviar outro profissional do mesmo nível. Se isso não for possível ou o CONTRATANTE não aceitar, o FOTÓGRAFO devolve todo o valor pago, sem multa para nenhuma das partes."),
                    par("O mesmo vale quando o evento não puder acontecer por motivo alheio às duas partes, como interdição do local ou calamidade. Nesse caso, as partes tentam primeiro remarcar a data."),
                    par("Se, apesar do equipamento reserva e da cópia de segurança, houver perda de arquivos por falha técnica, a responsabilidade do FOTÓGRAFO se limita à devolução proporcional do valor referente à parte não entregue."),
                ),
                clausula(
                    12,
                    "Disposições gerais e foro",
                    h(
                        "ul",
                        { class: "itens" },
                        [
                            "O orçamento enviado ao CONTRATANTE faz parte deste contrato. Se houver diferença entre os dois, vale este contrato.",
                            "Mudanças neste contrato só valem se combinadas por escrito, inclusive por WhatsApp ou e-mail, com a concordância das duas partes.",
                            "Os dados pessoais do CONTRATANTE são usados apenas para cumprir este contrato e não são compartilhados com terceiros (Lei Geral de Proteção de Dados, Lei 13.709/2018).",
                            "Fica eleito o foro da comarca de Ribeirão Preto, SP, para resolver questões sobre este contrato.",
                        ].map((x) => h("li", null, h("span", { class: "marcador" }, "–"), h("span", null, x))),
                    ),
                ),
                h(
                    "section",
                    { class: "clausula assinaturas" },
                    par(`Por estarem de acordo, as partes assinam este contrato. Ribeirão Preto, ${fDataContrato.format(paraData(det.data_contrato || hoje()))}.`),
                    h(
                        "div",
                        { class: "assinantes" },
                        h("div", null, h("p", null, `CONTRATANTE · ${nomeCliente}`), h("p", { class: "cinza" }, "CPF ", cpfCliente())),
                        h("div", null, h("p", null, `FOTÓGRAFO · ${eu.nome}`), h("p", { class: "cinza" }, "CPF/CNPJ ", preencher(aj.documento, "seu CPF ou CNPJ", "eu"))),
                    ),
                ),
            ),
            h("span", null, "As partes também podem assinar pelo assinador gratuito do gov.br."),
        );

        // ---- o que só aparece na tela ----
        async function marcarEnviado() {
            try {
                await api("trabalhos/" + t.id, { metodo: "PUT", corpo: { contrato: "enviado" } });
                aviso("Contrato marcado como enviado.", false, async () => {
                    await api("trabalhos/" + t.id, { metodo: "PUT", corpo: { contrato: "a_enviar" } });
                    aviso("Voltou pra a enviar.");
                    recarregar();
                });
                recarregar();
            } catch (e) {
                if (e.status !== 401) aviso(e.message, true);
            }
        }

        const notas = [];
        if (pagamentos.length && temValor && (pagamentos.reduce((s, p) => s + p.valor, 0) !== t.valor || !pagamentos.some((p) => p.valor === sinal))) {
            notas.push(`Os pagamentos deste trabalho não seguem 30% + 70%. O contrato diz sinal de ${dinheiro(sinal)} e restante de ${dinheiro(t.valor - sinal)}.`);
        }
        if (t.autorizacao === "pendente") notas.push("A autorização de imagem está pendente: as duas opções da cláusula 9 saem em branco, pro cliente marcar.");

        const topo = cabeca({
            voltar: ["#/trabalhos/" + t.id, nomeTrabalho(t)],
            rotulo: "Contrato",
            titulo: c.nome,
            meta: juntar(t.pacote || t.tipo, t.data ? dataMedia(t.data) : "sem data", CONTRATO[t.contrato]),
            acoes: [
                h("button", { type: "button", class: "botao", "data-foco": "baixar-pdf", onclick: () => window.print() }, "Baixar PDF"),
                botao("Ajustar contrato", ACOES.contrato[1], "botao leve"),
                botao("Seus dados", ACOES.eu[1], "botao leve"),
                t.contrato === "a_enviar" ? botao("Marcar como enviado", marcarEnviado, "botao leve") : null,
            ],
        });
        topo.classList.add("so-tela");

        const conferir = h(
            "div",
            { class: "conferir so-tela" },
            faltas.size
                ? [
                      h("p", { class: "conferir-titulo" }, "Antes de enviar, falta preencher:"),
                      h(
                          "ul",
                          null,
                          [...faltas].map(([grupo, itens]) => h("li", null, h("span", null, `${GRUPOS[grupo]}: ${listaTexto([...itens])}.`), botao(ACOES[grupo][0], ACOES[grupo][1]))),
                      ),
                      h("p", { class: "cinza" }, "Se baixar assim, o que falta sai como uma linha em branco, pra preencher à mão."),
                  ]
                : h("p", { class: "conferir-titulo" }, "Tudo preenchido."),
            notas.map((x) => h("p", { class: "cinza" }, x)),
            h("p", { class: "cinza" }, "“Baixar PDF” abre a janela de imprimir: escolha “Salvar como PDF”. No iPhone, toque em Compartilhar e em “Salvar em Arquivos”."),
        );

        return h("div", { class: "pagina documento" }, topo, conferir, h("div", { class: "folhas" }, folha1, folha2, folha3, folha4));
    }

    // ---------- Financeiro ----------

    const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    // eixo do gráfico: "2,5 mil", "500"
    const eixo = (c) => {
        const r = c / 100;
        return r >= 1000 ? `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(r));
    };
    // o topo do gráfico arredondado pra cima: 1, 2, 2,5 ou 5 vezes uma potência de 10
    function topoBonito(max) {
        const reais = Math.max(max / 100, 100);
        const potencia = 10 ** Math.floor(Math.log10(reais));
        return [1, 2, 2.5, 5, 10].find((m) => m * potencia >= reais) * potencia * 100;
    }

    function graficoMeses(recebido, receber, ano, mesAtual) {
        const totais = recebido.map((v, i) => v + receber[i]);
        const topo = topoBonito(Math.max(...totais));
        const pct = (v) => `${Math.min(100, (v / topo) * 100)}%`;
        const area = h("div", { class: "grafico-area", "aria-hidden": "true" });
        const dica = h("div", { class: "dica", hidden: true });
        for (const fracao of [0.5, 1]) {
            const linha = h("div", { class: "grade" }, h("span", null, eixo(topo * fracao)));
            linha.style.bottom = `${fracao * 100}%`;
            area.append(linha);
        }
        const pico = Math.max(...recebido) > 0 ? recebido.indexOf(Math.max(...recebido)) : -1;
        const colunas = h("div", { class: "colunas" });
        recebido.forEach((v, i) => {
            const pilha = h("div", { class: "pilha" });
            if (receber[i]) {
                const b = h("div", { class: "barra receber" });
                b.style.height = pct(receber[i]);
                pilha.append(b);
            }
            if (v) {
                const b = h("div", { class: "barra recebido" });
                b.style.height = pct(v);
                pilha.append(b);
            }
            const coluna = h("div", { class: "coluna" + (i === mesAtual ? " atual" : "") }, pilha);
            if (i === pico) {
                const rotulo = h("span", { class: "rotulo-barra" }, eixo(v));
                rotulo.style.bottom = pct(totais[i]);
                coluna.append(rotulo);
            }
            const mostrar = () => {
                dica.replaceChildren(
                    ...[
                        h("strong", null, `${primeiraMaiuscula(MESES_LONGOS[i])} de ${ano}`),
                        h("span", null, `Recebido: ${dinheiro(v)}`),
                        receber[i] ? h("span", null, `A receber: ${dinheiro(receber[i])}`) : null,
                    ].filter(Boolean),
                );
                dica.hidden = false;
                colunas.querySelectorAll(".ativa").forEach((el) => el.classList.remove("ativa"));
                coluna.classList.add("ativa");
                const meio = coluna.offsetLeft + coluna.offsetWidth / 2;
                const metade = dica.offsetWidth / 2;
                dica.style.left = `${Math.min(Math.max(meio, metade), colunas.offsetWidth - metade)}px`;
            };
            coluna.addEventListener("pointerenter", mostrar);
            coluna.addEventListener("click", mostrar);
            colunas.append(coluna);
        });
        colunas.addEventListener("pointerleave", (e) => {
            if (e.pointerType !== "mouse") return; // no toque, a dica fica até tocar em outro mês
            dica.hidden = true;
            colunas.querySelectorAll(".ativa").forEach((el) => el.classList.remove("ativa"));
        });
        colunas.append(dica);
        area.append(colunas);

        const totalRecebido = recebido.reduce((a, b) => a + b, 0);
        const totalReceber = receber.reduce((a, b) => a + b, 0);
        const resumo = pico >= 0 ? `Recebido por mês em ${ano}: ${dinheiro(totalRecebido)} no total; o maior mês foi ${MESES_LONGOS[pico]}, com ${dinheiro(recebido[pico])}.` : `Nada recebido em ${ano}.`;
        return h(
            "figure",
            { class: "grafico" },
            h(
                "div",
                { class: "legenda", "aria-hidden": "true" },
                h("span", null, h("span", { class: "amostra recebido" }), "Recebido"),
                totalReceber ? h("span", null, h("span", { class: "amostra receber" }), "A receber, no mês em que vence") : null,
            ),
            h("figcaption", { class: "visualmente-escondido" }, resumo),
            area,
            h("div", { class: "grafico-meses", "aria-hidden": "true" }, MESES.map((m, i) => h("span", { class: i === mesAtual ? "atual" : null }, m))),
            h(
                "details",
                { class: "ver-tabela" },
                h("summary", null, "Ver em tabela"),
                h(
                    "table",
                    { class: "tabela" },
                    h("thead", null, h("tr", null, h("th", { scope: "col" }, "Mês"), h("th", { scope: "col", class: "num" }, "Recebido"), h("th", { scope: "col", class: "num" }, "A receber"))),
                    h(
                        "tbody",
                        null,
                        MESES_LONGOS.map((m, i) => h("tr", null, h("th", { scope: "row" }, primeiraMaiuscula(m)), h("td", { class: "num" }, dinheiro(recebido[i])), h("td", { class: "num" }, receber[i] ? dinheiro(receber[i]) : "—"))),
                    ),
                    h("tfoot", null, h("tr", null, h("th", { scope: "row" }, "Total"), h("td", { class: "num" }, dinheiro(totalRecebido)), h("td", { class: "num" }, dinheiro(totalReceber)))),
                ),
            ),
        );
    }

    // tipo de trabalho ou "como conheceu": quantos trabalhos, quanto somam e a média
    function tabelaPartes(linhas, rotulo) {
        const maior = Math.max(...linhas.map((l) => l.valor), 1);
        return h(
            "table",
            { class: "tabela partes" },
            h("thead", null, h("tr", null, h("th", { scope: "col" }, rotulo), h("th", { scope: "col", class: "num" }, "Trabalhos"), h("th", { scope: "col", class: "num" }, "Total"), h("th", { scope: "col", class: "num media" }, "Média"))),
            h(
                "tbody",
                null,
                linhas.map((l) => {
                    const barra = h("span", { class: "barra-fina", "aria-hidden": "true" });
                    barra.style.width = `${(l.valor / maior) * 100}%`;
                    return h(
                        "tr",
                        null,
                        h("th", { scope: "row" }, h("span", null, l.nome), barra),
                        h("td", { class: "num" }, l.quantos),
                        h("td", { class: "num" }, dinheiro(l.valor)),
                        h("td", { class: "num media" }, dinheiro(Math.round(l.valor / l.quantos))),
                    );
                }),
            ),
        );
    }

    async function paginaFinanceiro(anoPedido) {
        const h0 = hoje();
        const ano = anoPedido || h0.slice(0, 4);
        const r = await api("financeiro", { params: { ano, hoje: h0 } });
        document.title = `Financeiro ${ano} · Painel`;
        const anoAtual = ano === h0.slice(0, 4);
        const mesAtual = anoAtual ? Number(h0.slice(5, 7)) - 1 : -1;
        const recebido = Array(12).fill(0);
        for (const p of r.recebidos) recebido[Number(p.pago_em.slice(5, 7)) - 1] += p.valor;
        const receber = Array(12).fill(0);
        for (const x of r.a_receber) if (x.mes) receber[Number(x.mes) - 1] = x.valor;
        const totalAno = recebido.reduce((a, b) => a + b, 0);
        const fechados = r.por_tipo.reduce((s, l) => ({ quantos: s.quantos + l.quantos, valor: s.valor + l.valor }), { quantos: 0, valor: 0 });
        const anterior = Number(ano) - 1;

        const numeros = h(
            "div",
            { class: "numeros" },
            h(
                "div",
                null,
                h("span", { class: "rotulo" }, `Recebido em ${ano}`),
                h("strong", null, dinheiro(totalAno)),
                h("small", null, `${anoAtual ? "No mesmo período de" : "Em"} ${anterior}: ${dinheiro(r.totais.anterior)}`),
            ),
            h(
                "div",
                null,
                h("span", { class: "rotulo" }, "A receber"),
                h("strong", null, dinheiro(r.totais.aberto)),
                r.totais.vencido ? h("small", { class: "atrasado" }, `${dinheiro(r.totais.vencido)} vencido`) : h("small", null, "somando todos os anos"),
            ),
            h("div", null, h("span", { class: "rotulo" }, `Fechados em ${ano}`), h("strong", null, fechados.quantos), h("small", null, `${dinheiro(fechados.valor)} no total`)),
            h("div", null, h("span", { class: "rotulo" }, "Valor médio"), h("strong", null, fechados.quantos ? dinheiro(Math.round(fechados.valor / fechados.quantos)) : "—"), h("small", null, "por trabalho fechado")),
        );

        const nav = h(
            "div",
            { class: "mes" },
            h("a", { class: "seta", href: `#/financeiro/${anterior}`, "aria-label": "Ano anterior", "data-foco": "ano-anterior" }, h("span", { "aria-hidden": "true" }, "‹")),
            h("h2", { "aria-live": "polite" }, ano),
            h("a", { class: "seta", href: `#/financeiro/${Number(ano) + 1}`, "aria-label": "Próximo ano", "data-foco": "ano-seguinte" }, h("span", { "aria-hidden": "true" }, "›")),
        );

        const temGrafico = totalAno > 0 || receber.some(Boolean);
        const grafico = secao(
            "Recebido por mês",
            { nota: "em reais" },
            temGrafico ? graficoMeses(recebido, receber, ano, mesAtual) : vazio(`Nada recebido em ${ano}.`),
            r.totais.sem_vencimento ? h("p", { class: "cinza nota-pequena" }, `Mais ${dinheiro(r.totais.sem_vencimento)} a receber sem vencimento, que não entram no gráfico.`) : null,
        );
        const tipos = secao(
            "Por tipo de trabalho",
            { nota: r.orcamentos.quantos ? `${r.orcamentos.quantos} em orçamento` : null },
            r.por_tipo.length ? tabelaPartes(r.por_tipo, "Tipo") : vazio(`Nenhum trabalho fechado em ${ano}.`),
        );
        const origens = secao(
            "De onde vêm os clientes",
            {},
            r.por_origem.length ? tabelaPartes(r.por_origem, "Como conheceu") : vazio(`Nenhum trabalho fechado em ${ano}.`),
        );
        const recebimentos = secao(
            "Recebimentos",
            { acoes: r.recebidos.length ? [h("a", { class: "botao leve pequeno", href: `/api/financeiro/planilha?ano=${ano}`, download: "", "data-foco": "planilha" }, "Baixar planilha")] : null },
            r.recebidos.length
                ? [
                      h("p", { class: "cinza nota-pequena" }, "A planilha tem a data, o cliente (com o CPF) e o valor de cada recebimento do ano: serve pro carnê-leão e pro imposto de renda."),
                      listaLimitada(
                          r.recebidos,
                          (p) =>
                              item({
                                  href: "#/trabalhos/" + p.trabalho_id,
                                  dia: p.pago_em,
                                  titulo: `${p.descricao} · ${p.cliente}`,
                                  info: juntar(nomeTrabalho(p), p.forma),
                                  lado: h("span", { class: "numero", text: dinheiro(p.valor) }),
                              }),
                          8,
                      ),
                  ]
                : vazio(`Nenhum pagamento recebido em ${ano}.`),
        );

        return pagina(
            cabeca({ titulo: "Financeiro", acoes: [!anoAtual ? h("a", { class: "botao leve", href: "#/financeiro" }, "Este ano") : null] }),
            nav,
            numeros,
            grafico,
            h("div", { class: "duas" }, tipos, origens),
            recebimentos,
        );
    }

    // ---------- Agenda ----------

    async function paginaAgenda(mesPedido) {
        const h0 = hoje();
        const mes = mesPedido || h0.slice(0, 7);
        const [ano, m] = mes.split("-").map(Number);
        const de = `${mes}-01`;
        const ate = `${mes}-${pad(new Date(Date.UTC(ano, m, 0)).getUTCDate())}`;
        const r = await api("agenda", { params: { de, ate } });
        document.title = "Agenda · Painel";
        const vizinho = (n) => {
            const d = new Date(Date.UTC(ano, m - 1 + n, 1));
            return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
        };

        // tudo o que acontece em cada dia
        const porDia = {};
        const por = (dia, coisa) => (porDia[dia] ||= []).push(coisa);
        for (const t of r.trabalhos) {
            por(t.dia, { ordem: 0 + (t.hora || "99"), ponto: "trabalho", tipo: "Trabalho", curto: juntar(t.hora, nomeTrabalho(t)), titulo: `${nomeTrabalho(t)} · ${t.cliente}`, info: juntar(t.hora, t.local, STATUS[t.status]), href: "#/trabalhos/" + t.id });
        }
        for (const k of r.compromissos) {
            por(k.dia, { ordem: 1 + (k.hora || "99"), ponto: "compromisso", tipo: "Compromisso", curto: k.titulo, titulo: k.titulo, info: juntar(k.hora, k.cliente, k.feito ? "feito" : null), feito: k.feito, abrir: () => formCompromisso(k) });
        }
        for (const t of r.entregas) {
            const atrasado = t.dia < h0;
            por(t.dia, { ordem: "2", ponto: atrasado ? "vencido" : "entrega", tipo: "Entrega", curto: "Entrega: " + nomeTrabalho(t), titulo: `${nomeTrabalho(t)} · ${t.cliente}`, info: atrasado ? "Prazo de entrega passou" : "Prazo de entrega das fotos", atrasado, href: "#/trabalhos/" + t.id });
        }
        for (const p of r.pagamentos) {
            const vencido = p.dia < h0;
            por(p.dia, { ordem: "3", ponto: vencido ? "vencido" : "pagamento", tipo: "Pagamento", curto: dinheiro(p.valor), titulo: `${p.descricao} · ${p.cliente}`, info: juntar(dinheiro(p.valor), nomeTrabalho(p), vencido ? "vencido" : null), atrasado: vencido, href: "#/trabalhos/" + p.trabalho_id });
        }
        for (const a of r.aniversarios) {
            por(a.dia, { ordem: "4", ponto: "aniversario", tipo: "Aniversário", curto: "Aniv. " + a.cliente.split(" ")[0], titulo: `${a.cliente} faz ${a.idade} anos`, info: "Aniversário do cliente", href: "#/clientes/" + a.cliente_id });
        }
        for (const lista of Object.values(porDia)) lista.sort((a, b) => a.ordem.localeCompare(b.ordem));

        const listaDias = h("div");
        function irPara(dia) {
            const alvo = document.getElementById("dia-" + dia);
            if (!alvo) return;
            listaDias.querySelectorAll(".destaque").forEach((el) => el.classList.remove("destaque"));
            alvo.classList.add("destaque");
            alvo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
            // o foco vai junto, pra quem usa teclado continuar dali
            alvo.querySelector("h3")?.focus({ preventScroll: true });
        }

        // a grade do mês, de domingo a sábado
        // a grade é um resumo pra quem vê; a lista embaixo tem tudo (e é o que o leitor de tela lê)
        const grade = h("div", { class: "calendario" }, SEMANA.map((s) => h("div", { class: "sem-nome", "aria-hidden": "true" }, s)));
        const inicioGrade = new Date(Date.UTC(ano, m - 1, 1));
        inicioGrade.setUTCDate(1 - inicioGrade.getUTCDay());
        const fimGrade = paraData(ate);
        fimGrade.setUTCDate(fimGrade.getUTCDate() + (6 - fimGrade.getUTCDay()));
        for (const d = new Date(inicioGrade); d <= fimGrade; d.setUTCDate(d.getUTCDate() + 1)) {
            const dia = iso(d);
            const doMes = dia.slice(0, 7) === mes;
            const coisas = doMes ? porDia[dia] || [] : [];
            const classe = "cel" + (doMes ? "" : " fora") + (dia === h0 ? " hoje" : "");
            const num = h("span", { class: "num" }, d.getUTCDate());
            if (!doMes) {
                grade.append(h("div", { class: classe, "aria-hidden": "true" }, num));
                continue;
            }
            const rotuloDia = `${dataLonga(dia)}${coisas.length ? `: ${coisas.length} ${coisas.length === 1 ? "item" : "itens"}` : ""}`;
            const conteudo = [
                num,
                coisas.slice(0, 3).map((c) => h("span", { class: "marca-dia" }, h("span", { class: "ponto " + c.ponto }), h("span", null, c.curto))),
                coisas.length > 3 ? h("span", { class: "mais" }, `+${coisas.length - 3}`) : null,
                coisas.length ? h("span", { class: "pontos" }, coisas.slice(0, 4).map((c) => h("span", { class: "ponto " + c.ponto }))) : null,
            ];
            grade.append(
                coisas.length
                    ? h("button", { type: "button", class: classe, "aria-label": `${rotuloDia}. Ver na lista`, onclick: () => irPara(dia) }, conteudo)
                    : h("div", { class: classe + " vazio-dia", "aria-hidden": "true" }, conteudo),
            );
        }

        const dias = Object.keys(porDia).sort();
        listaDias.replaceChildren(
            ...(dias.length
                ? dias.map((dia) =>
                      h(
                          "section",
                          { class: "dia-lista", id: "dia-" + dia },
                          h("h3", { tabindex: "-1" }, primeiraMaiuscula(fDiaSemana.format(paraData(dia))), dia === h0 ? h("span", { class: "rotulo hoje-rotulo" }, "hoje") : null),
                          h(
                              "ul",
                              { class: "lista" },
                              porDia[dia].map((c) => {
                                  const corpo = [
                                      h("span", { class: "item-corpo" }, h("span", { class: "tipo-item" }, h("span", { class: "ponto " + c.ponto }), c.tipo), h("span", { class: "item-titulo" }, c.titulo), h("span", { class: "item-info" + (c.atrasado ? " atrasado" : "") }, c.info)),
                                  ];
                                  return h(
                                      "li",
                                      { class: c.feito ? "feito" : null },
                                      c.href
                                          ? h("a", { class: "item sem-data", href: c.href }, corpo)
                                          : h("button", { type: "button", class: "item sem-data item-botao", onclick: c.abrir }, corpo),
                                  );
                              }),
                          ),
                      ),
                  )
                : [vazio("Nada marcado neste mês.")]),
        );

        const titulo = primeiraMaiuscula(fMes.format(paraData(de)));
        const nav = h(
            "div",
            { class: "mes" },
            h("a", { class: "seta", href: "#/agenda/" + vizinho(-1), "aria-label": "Mês anterior", "data-foco": "mes-anterior" }, h("span", { "aria-hidden": "true" }, "‹")),
            h("h2", { "aria-live": "polite" }, titulo),
            h("a", { class: "seta", href: "#/agenda/" + vizinho(1), "aria-label": "Próximo mês", "data-foco": "mes-seguinte" }, h("span", { "aria-hidden": "true" }, "›")),
        );

        if (mes === h0.slice(0, 7) && porDia[h0]) requestAnimationFrame(() => document.getElementById("dia-" + h0)?.classList.add("destaque"));

        return pagina(
            cabeca({
                titulo: "Agenda",
                acoes: [mes !== h0.slice(0, 7) ? h("a", { class: "botao leve", href: "#/agenda" }, "Hoje") : null, h("button", { type: "button", class: "botao", "data-foco": "novo-compromisso", onclick: () => formCompromisso(null) }, "Novo compromisso")],
            }),
            nav,
            h(
                "div",
                { class: "legenda", "aria-hidden": "true" },
                h("span", null, h("span", { class: "ponto" }), "Trabalho"),
                h("span", null, h("span", { class: "ponto compromisso" }), "Compromisso"),
                h("span", null, h("span", { class: "ponto entrega" }), "Entrega"),
                h("span", null, h("span", { class: "ponto pagamento" }), "Pagamento"),
                h("span", null, h("span", { class: "ponto aniversario" }), "Aniversário"),
                h("span", null, h("span", { class: "ponto vencido" }), "Atrasado"),
            ),
            grade,
            listaDias,
        );
    }

    // ---------- Navegação ----------

    const ROTAS = [
        [/^$/, () => paginaInicio(), "inicio"],
        [/^clientes$/, () => paginaClientes(), "clientes"],
        [/^clientes\/([0-9a-f-]{36})$/, (m) => paginaCliente(m[1]), "clientes"],
        [/^trabalhos\/([0-9a-f-]{36})$/, (m) => paginaTrabalho(m[1]), "clientes"],
        [/^trabalhos\/([0-9a-f-]{36})\/contrato$/, (m) => paginaContrato(m[1]), "clientes"],
        [/^agenda(?:\/(\d{4}-\d{2}))?$/, (m) => paginaAgenda(m[1]), "agenda"],
        [/^financeiro(?:\/(\d{4}))?$/, (m) => paginaFinanceiro(m[1]), "financeiro"],
    ];
    let vezRota = 0;

    // onde cada página estava rolada: o "voltar" do navegador devolve você ao mesmo ponto.
    // Cada passo do histórico ganha um número; voltar ou avançar cai num passo que já tem número.
    const rolagens = new Map();
    function passoDoHistorico() {
        if (history.state?.painel) return { passo: history.state.painel, novo: false };
        const passo = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        history.replaceState({ ...(history.state || {}), painel: passo }, "");
        return { passo, novo: true };
    }

    async function rotear({ manterRolagem = false } = {}) {
        const caminho = location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
        const rota = ROTAS.find(([re]) => re.test(caminho));
        if (!rota) {
            location.hash = "#/";
            return;
        }
        const [re, abrir, menu] = rota;
        document.querySelectorAll("[data-menu]").forEach((a) => (a.dataset.menu === menu ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
        const app = $("#app");
        const minha = ++vezRota;
        const rolagem = window.scrollY;
        const { passo, novo } = passoDoHistorico();
        // demorou: na primeira abertura aparece "Carregando…"; depois, a página atual fica (meio apagada)
        // até a nova chegar, em vez de sumir e fazer tudo pular
        const lento = setTimeout(() => {
            if (!app.querySelector(".pagina:not(.carregando)")) app.replaceChildren(h("p", { class: "carregando pagina", role: "status" }, "Carregando…"));
            else document.documentElement.classList.add("carregando");
            app.setAttribute("aria-busy", "true");
        }, 250);
        try {
            const conteudo = await abrir(caminho.match(re));
            if (minha !== vezRota) return;
            // onde estava o foco antes de redesenhar (o botão que foi usado, ou a seção dele)
            const ativo = document.activeElement;
            const chave = manterRolagem && ativo?.closest?.("[data-foco]")?.dataset.foco;
            const secaoAtiva = manterRolagem && ativo?.closest?.("[data-secao]")?.dataset.secao;
            const focoEstavaAqui = ativo === document.body || app.contains(ativo);
            app.replaceChildren(conteudo);
            window.scrollTo(0, manterRolagem ? rolagem : (!novo && rolagens.get(passo)) || 0);
            if (!manterRolagem) {
                // página nova: o foco vai pro título, e o leitor de tela anuncia onde você está
                app.querySelector("h1")?.focus({ preventScroll: true });
            } else if (focoEstavaAqui) {
                const porChave = chave && [...app.querySelectorAll("[data-foco]")].find((el) => el.dataset.foco === chave);
                const porSecao = secaoAtiva && [...app.querySelectorAll("[data-secao]")].find((el) => el.dataset.secao === secaoAtiva)?.querySelector("h2");
                (porChave || porSecao || app.querySelector("h1"))?.focus({ preventScroll: true });
            }
        } catch (e) {
            if (minha !== vezRota || e.status === 401) return;
            if (manterRolagem) {
                // falhou só o redesenho depois de salvar: a página fica, e avisa
                aviso(e.message, true);
                return;
            }
            app.replaceChildren(
                pagina(
                    h("p", { class: "vazio", text: e.status === 404 ? "Isso não existe mais (pode ter sido apagado)." : e.message }),
                    h("div", { class: "acoes" }, h("button", { type: "button", class: "botao leve", onclick: () => rotear() }, "Tentar de novo"), h("a", { class: "botao leve", href: "#/" }, "Ir pro início")),
                ),
            );
        } finally {
            if (minha === vezRota) {
                clearTimeout(lento);
                document.documentElement.classList.remove("carregando");
                app.removeAttribute("aria-busy");
            }
        }
    }

    const recarregar = () => rotear({ manterRolagem: true });

    // ---------- Entrar e sair ----------

    function telaEntrar(mensagem) {
        if ($("#janela").open) $("#janela").close();
        $("#topo").hidden = true;
        if ($("#form-entrar")) {
            if (mensagem) $("#form-entrar .erro-form").textContent = mensagem === "Entre com a senha." ? "" : mensagem;
            return;
        }
        const erro = h("p", { class: "erro-form", role: "alert", text: mensagem && mensagem !== "Entre com a senha." ? mensagem : "" });
        const senha = h("input", { type: "password", id: "senha", name: "senha", autocomplete: "current-password", required: true });
        const enviar = h("button", { type: "submit", class: "botao" }, "Entrar");
        const form = h(
            "form",
            { id: "form-entrar", novalidate: true },
            h("input", { type: "text", name: "usuario", autocomplete: "username", value: "Kaique", hidden: true, "aria-hidden": "true", tabindex: "-1" }),
            h("div", { class: "campo" }, h("label", { for: "senha" }, "Senha"), senha),
            erro,
            enviar,
        );
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!senha.value) {
                erro.textContent = "Escreva a senha.";
                senha.focus();
                return;
            }
            enviar.disabled = true;
            erro.textContent = "";
            try {
                await api("entrar", { metodo: "POST", corpo: { senha: senha.value } });
                $("#topo").hidden = false;
                await rotear();
            } catch (err) {
                erro.textContent = err.message;
                senha.select();
            } finally {
                enviar.disabled = false;
            }
        });
        $("#app").replaceChildren(
            h("div", { class: "entrar" }, h("img", { src: "assinatura.svg", alt: "Assinatura do Kaique Mota", width: 200, height: 213 }), h("h1", { class: "rotulo" }, "Painel"), form),
        );
        senha.focus();
    }

    async function sair() {
        try {
            await api("sair", { metodo: "POST" });
        } catch {
            /* sai mesmo assim */
        }
        telaEntrar();
    }

    async function iniciar() {
        $("#sair").addEventListener("click", sair);
        window.addEventListener(
            "scroll",
            () => {
                if (history.state?.painel) rolagens.set(history.state.painel, window.scrollY);
            },
            { passive: true },
        );
        window.addEventListener("hashchange", () => {
            // voltar/avançar do navegador com uma janela aberta: a janela fecha junto com a página
            if ($("#janela").open) $("#janela").close();
            rotear();
        });
        // arquivo solto fora da área de envio: o navegador abriria o arquivo e sairia do painel
        window.addEventListener("dragover", (e) => {
            if (!e.target.closest?.(".soltar")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "none";
            }
        });
        window.addEventListener("drop", (e) => {
            if (!e.target.closest?.(".soltar")) e.preventDefault();
        });
        try {
            await api("sessao");
            $("#topo").hidden = false;
            await rotear();
        } catch (e) {
            if (e.status !== 401) {
                $("#app").replaceChildren(pagina(h("p", { class: "vazio", text: e.message }), h("button", { type: "button", class: "botao leve", onclick: () => location.reload() }, "Tentar de novo")));
            }
        }
    }

    iniciar();
})();
