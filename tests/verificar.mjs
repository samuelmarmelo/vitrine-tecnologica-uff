// Verificação do protótipo, sem dependências.
// Uso: node tests/verificar.mjs
// Confere: cada rota tem tela mobile e desktop; cada <dc-import> e cada
// link entre telas aponta para um arquivo que existe; cada imagem /_blob/
// está em assets/blob/; data-props é JSON válido; não há script externo.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PASTA = join(RAIZ, "prototipo");
const BLOB = join(RAIZ, "assets", "blob");
const falhas = [];
let checagens = 0;

function confere(ok, msg) {
  checagens++;
  if (!ok) falhas.push(msg);
}

// Rotas declaradas no runtime.
const runtime = readFileSync(join(RAIZ, "runtime", "dc.js"), "utf8");
const blocoRotas = runtime.match(/var ROTAS = \{([\s\S]*?)\};/);
confere(!!blocoRotas, "runtime/dc.js: não achei o mapa ROTAS");
const rotas = {};
for (const m of (blocoRotas ? blocoRotas[1] : "").matchAll(/"([\w-]+)":\s*\["(\w+)",\s*"(\w+)"\]/g)) {
  rotas[m[1]] = [m[2], m[3]];
}
const telasDasRotas = new Set(Object.values(rotas).flat());
confere(Object.keys(rotas).length >= 12, `esperava 12 rotas, achei ${Object.keys(rotas).length}`);
for (const [rota, [mob, desk]] of Object.entries(rotas)) {
  confere(existsSync(join(PASTA, mob + ".dc.html")), `rota ${rota}: falta ${mob}.dc.html`);
  confere(existsSync(join(PASTA, desk + ".dc.html")), `rota ${rota}: falta ${desk}.dc.html`);
}

// index.html carrega o runtime.
const index = readFileSync(join(RAIZ, "index.html"), "utf8");
for (const src of index.matchAll(/(?:src|href)="((?:runtime|assets)\/[^"]+)"/g)) {
  confere(existsSync(join(RAIZ, src[1])), `index.html: falta ${src[1]}`);
}

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith(".dc.html"));
const nomes = new Set(arquivos.map((f) => f.replace(/\.dc\.html$/, "")));
const blobs = new Set(readdirSync(BLOB).map((f) => f.replace(/\.svg$/, "")));

for (const arq of arquivos) {
  const html = readFileSync(join(PASTA, arq), "utf8");
  confere(/<x-dc>[\s\S]*<\/x-dc>/.test(html), `${arq}: sem <x-dc>`);
  confere(/class Component extends DCLogic/.test(html), `${arq}: sem class Component extends DCLogic`);

  const props = html.match(/data-props='([^']*)'/);
  if (props) {
    try { JSON.parse(props[1]); confere(true, ""); } catch { confere(false, `${arq}: data-props não é JSON`); }
  }

  for (const m of html.matchAll(/<dc-import name="(\w+)"/g)) {
    confere(nomes.has(m[1]), `${arq}: importa ${m[1]}, que não existe`);
  }

  for (const m of html.matchAll(/href="([\w-]+)\.dc\.html(?:#[^"]*)?"/g)) {
    confere(telasDasRotas.has(m[1]), `${arq}: link para ${m[1]}.dc.html não tem rota`);
  }

  for (const m of html.matchAll(/[a-f0-9]{32}/g)) {
    confere(blobs.has(m[0]), `${arq}: imagem ${m[0]} não está em assets/blob/`);
  }

  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    confere(m[1] === "./support.js", `${arq}: script externo ${m[1]}`);
  }
  for (const m of html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)) {
    confere(m[1].startsWith("https://fonts.googleapis.com/"), `${arq}: link externo ${m[1]}`);
  }
}

if (falhas.length) {
  console.error(`FALHOU: ${falhas.length} de ${checagens} checagens`);
  for (const f of falhas) console.error(" - " + f);
  process.exit(1);
}
console.log(`ok: ${checagens} checagens, ${arquivos.length} telas, ${Object.keys(rotas).length} rotas`);
