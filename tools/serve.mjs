// Servidor estático para ver o protótipo localmente.
// Uso: node tools/serve.mjs [porta]   (padrão 5183)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORTA = Number(process.argv[2] || process.env.PORT || 5183);
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let arquivo = normalize(join(RAIZ, caminho));
    if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + sep)) {
      res.writeHead(403).end("Proibido");
      return;
    }
    const info = await stat(arquivo).catch(() => null);
    if (info && info.isDirectory()) arquivo = join(arquivo, "index.html");
    const corpo = await readFile(arquivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[extname(arquivo).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(corpo);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Não encontrado");
  }
}).listen(PORTA, () => console.log(`Vitrine em http://localhost:${PORTA}/`));
