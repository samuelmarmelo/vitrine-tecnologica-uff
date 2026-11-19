# vitrine-tecnologica-uff

Vitrine Tecnológica da UFF: protótipo navegável, montado a partir das telas
desenhadas no Claude Design (artefato "16/11 - Vitrine Tecnológica UFF -
Protótipo mobile - v1").

Os dados das telas são de demonstração. Nada é enviado: o formulário de
interesse só mostra a confirmação.

## Estrutura

- `index.html`: página única que carrega o runtime.
- `prototipo/*.dc.html`: as telas e os componentes, copiados sem alteração
  do Claude Design (formato Design Component).
- `runtime/dc.js`: interpreta os `.dc.html` no navegador com Preact
  (`runtime/vendor/`, licença MIT). Rotas por hash (`#/catalogo`,
  `#/patente`...). Cada rota tem tela mobile e desktop; a largura da janela
  escolhe. `?v=mobile` mostra a versão mobile numa moldura de celular.
- `runtime/dc.css`: moldura que encaixa as telas de tamanho fixo na janela.
- `assets/blob/`: ilustrações enviadas ao Claude Design (`/_blob/<id>`).
- `assets/fonts/`: Nunito Sans em woff2 variável (pesos 400 a 800, latin e
  latin-ext), hospedada aqui, sem Google Fonts. Licença OFL em
  `assets/fonts/OFL.txt`. Os `<link>` do Google Fonts que vêm nas telas são
  ignorados pelo runtime.

## Rotas

| Rota | Mobile | Desktop |
| --- | --- | --- |
| `#/inicio` | Main | DesktopInicio |
| `#/catalogo` | Catalogo | DesktopCatalogo |
| `#/patente` | Patente | DesktopPatente |
| `#/documento` | Documento | DesktopDocumento |
| `#/interesse` | Interesse | DesktopInteresse |
| `#/busca` | Busca | DesktopBusca |
| `#/como-licenciar` | ComoLicenciar | DesktopComoLicenciar |
| `#/privacidade` | Privacidade | DesktopPrivacidade |
| `#/termos` | Termos | DesktopTermos |
| `#/acessibilidade` | Acessibilidade | DesktopAcessibilidade |
| `#/cookies` | Cookies | DesktopCookies |
| `#/mapa-do-site` | MapaSite | DesktopMapaSite |

## Ver localmente

```
node tools/serve.mjs
```

Abre em http://localhost:5183/. Não há build nem dependências.

## Verificar

```
node tests/verificar.mjs
```

Confere que cada rota tem as duas telas, que cada `<dc-import>` e cada link
entre telas existe, que cada imagem está em `assets/blob/` e que nenhuma tela
carrega script externo.

## Atualizar a partir do Claude Design

1. Baixe os arquivos `project/*.dc.html` do artefato.
2. Copie para `prototipo/` sem editar.
3. Imagem nova (`/_blob/<id>`): salve em `assets/blob/<id>.svg`.
4. Tela nova: acrescente a rota em `ROTAS`, no topo de `runtime/dc.js`.
5. Rode `node tests/verificar.mjs`.

## Licença

Programa de computador com pedido de registro em andamento no INPI. Todos os
direitos reservados.

- Titular: Universidade Federal Fluminense (UFF), por meio da AGIR.
- Autores: Samuel Neves Marmelo e Gabriel Marcuzzo do Canto Cavalheiro.

O código está aqui só para consulta: copiar, modificar, distribuir ou usar
depende de autorização por escrito da UFF, pedida à
[AGIR](https://agir.uff.br). Componentes de terceiros e detalhes em
[LICENSE](LICENSE).
