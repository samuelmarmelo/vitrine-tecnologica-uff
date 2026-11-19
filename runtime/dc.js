/*
 * Runtime estático da Vitrine Tecnológica da UFF.
 *
 * Interpreta os arquivos .dc.html de prototipo/ (formato do Claude Design)
 * no navegador, sem o editor: template em <x-dc>, {{buracos}}, <sc-if>,
 * <sc-for>, <dc-import> e a classe `Component extends DCLogic`.
 * A renderização usa Preact (MIT, runtime/vendor/).
 *
 * Rotas por hash (#/catalogo, #/patente...). Cada rota tem uma tela mobile
 * e uma desktop; a largura da janela decide qual mostrar. ?v=mobile força
 * a versão mobile numa moldura de celular, para apresentar no computador.
 */
(function () {
  "use strict";
  var P = window.preact;
  var h = P.h;
  var PASTA = "prototipo/";
  var BLOB = "assets/blob/";
  var LARGURA_DESKTOP = 1024;
  var LARGURA_MOBILE = 390;

  // Rota -> [tela mobile, tela desktop]
  var ROTAS = {
    "inicio": ["Main", "DesktopInicio"],
    "catalogo": ["Catalogo", "DesktopCatalogo"],
    "patente": ["Patente", "DesktopPatente"],
    "documento": ["Documento", "DesktopDocumento"],
    "interesse": ["Interesse", "DesktopInteresse"],
    "busca": ["Busca", "DesktopBusca"],
    "como-licenciar": ["ComoLicenciar", "DesktopComoLicenciar"],
    "privacidade": ["Privacidade", "DesktopPrivacidade"],
    "termos": ["Termos", "DesktopTermos"],
    "acessibilidade": ["Acessibilidade", "DesktopAcessibilidade"],
    "cookies": ["Cookies", "DesktopCookies"],
    "mapa-do-site": ["MapaSite", "DesktopMapaSite"]
  };
  var TELA_PARA_ROTA = {};
  Object.keys(ROTAS).forEach(function (r) {
    TELA_PARA_ROTA[ROTAS[r][0]] = r;
    TELA_PARA_ROTA[ROTAS[r][1]] = r;
  });

  // ---------- valores e buracos ----------

  function literal(expr) {
    if (expr === "true") return { ok: true, v: true };
    if (expr === "false") return { ok: true, v: false };
    if (expr === "null") return { ok: true, v: null };
    if (/^-?\d+(\.\d+)?$/.test(expr)) return { ok: true, v: Number(expr) };
    var m = expr.match(/^'(.*)'$|^"(.*)"$/);
    if (m) return { ok: true, v: m[1] !== undefined ? m[1] : m[2] };
    return { ok: false };
  }

  function busca(expr, escopo) {
    expr = expr.trim();
    var lit = literal(expr);
    if (lit.ok) return lit.v;
    var partes = expr.split(".");
    var v = escopo;
    for (var i = 0; i < partes.length; i++) {
      if (v === null || v === undefined) return undefined;
      v = v[partes[i]];
    }
    return v;
  }

  var BURACO = /\{\{([^}]*)\}\}/g;
  var BURACO_INTEIRO = /^\s*\{\{([^}]*)\}\}\s*$/;

  function texto(v) {
    if (v === null || v === undefined || v === false) return "";
    return String(v);
  }

  function interpola(str, escopo) {
    return str.replace(BURACO, function (_, e) { return texto(busca(e, escopo)); });
  }

  // Valor de atributo: buraco inteiro devolve o valor cru (função, objeto...).
  function valorAtributo(str, escopo) {
    var m = str.match(BURACO_INTEIRO);
    if (m) return busca(m[1], escopo);
    if (str.indexOf("{{") > -1) return interpola(str, escopo);
    return str;
  }

  // Imagens enviadas ao Claude Design ficam em /_blob/<id>; aqui, em assets/blob/.
  function corrigeUrl(v) {
    if (typeof v !== "string" || v.indexOf("/_blob/") === -1) return v;
    return v.replace(/\/_blob\/([a-f0-9]{32})/g, BLOB + "$1.svg");
  }

  // Link entre telas (Catalogo.dc.html) vira rota (#/catalogo).
  function rotaDeHref(href) {
    if (typeof href !== "string") return href;
    var m = href.match(/^\/?(?:[\w.-]+\/)*([\w-]+)\.dc\.html(#.*)?$/);
    if (!m) return href;
    var rota = TELA_PARA_ROTA[m[1]];
    return rota ? "#/" + rota : href;
  }

  function camel(s) {
    return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }

  // ---------- template -> Preact ----------

  function ehCampoDeTexto(tag, tipo) {
    if (tag === "textarea") return true;
    if (tag !== "input") return false;
    return ["checkbox", "radio", "file", "submit", "button", "range", "color"].indexOf((tipo || "text").toLowerCase()) === -1;
  }

  function focoAutomatico(el) {
    if (el && !el.__dcFoco) {
      el.__dcFoco = true;
      setTimeout(function () { try { el.focus(); } catch (e) { /* ignora */ } }, 30);
    }
  }

  function rolaParaAncora(id) {
    return function (e) {
      var alvo = document.getElementById(id);
      if (!alvo) return;
      e.preventDefault();
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  var BOOLEANOS = ["checked", "disabled", "selected", "hidden", "readonly", "required", "open", "multiple"];

  function filhos(nodes, escopo) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var r = no(nodes[i], escopo);
      if (r === null || r === undefined) continue;
      if (Array.isArray(r)) out.push.apply(out, r);
      else out.push(r);
    }
    return out;
  }

  function no(n, escopo) {
    if (n.nodeType === 3) {
      var t = n.nodeValue;
      return t.indexOf("{{") > -1 ? interpola(t, escopo) : t;
    }
    if (n.nodeType !== 1) return null;
    var tag = n.localName;

    if (tag === "helmet") return null;

    if (tag === "sc-if") {
      var cond = valorAtributo(n.getAttribute("value") || "", escopo);
      return cond ? filhos(n.childNodes, escopo) : null;
    }

    if (tag === "sc-for") {
      var lista = valorAtributo(n.getAttribute("list") || "", escopo) || [];
      var nome = n.getAttribute("as") || "item";
      var out = [];
      for (var i = 0; i < lista.length; i++) {
        var esc = Object.create(escopo);
        esc[nome] = lista[i];
        esc.$index = i;
        out.push.apply(out, filhos(n.childNodes, esc));
      }
      return out;
    }

    if (tag === "dc-import") {
      var nomeComp = n.getAttribute("name");
      var Comp = REGISTRO[nomeComp];
      if (!Comp) return h("div", { "data-dc-faltando": nomeComp });
      var props = {};
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        if (at.name === "name" || at.name.indexOf("hint-") === 0) continue;
        props[camel(at.name)] = valorAtributo(at.value, escopo);
      }
      return h(Comp, props);
    }

    var p = {};
    var tipo = n.getAttribute("type");
    for (var k = 0; k < n.attributes.length; k++) {
      var atr = n.attributes[k];
      var nomeAtr = atr.name;
      if (nomeAtr.indexOf("hint-") === 0) continue;
      var v = valorAtributo(atr.value, escopo);
      if (nomeAtr.indexOf("on") === 0 && typeof v === "function") {
        // Como no React, onChange de campo de texto dispara a cada tecla.
        if (nomeAtr === "onchange" && ehCampoDeTexto(tag, tipo)) nomeAtr = "oninput";
        p[nomeAtr] = v;
        continue;
      }
      if (nomeAtr === "autofocus") {
        if (v) p.ref = focoAutomatico;
        continue;
      }
      if (nomeAtr === "ref") { p.ref = v; continue; }
      if (nomeAtr === "href") {
        v = rotaDeHref(v);
        // Âncora na mesma tela (#secao): rola até ela sem mexer na rota.
        if (typeof v === "string" && v.charAt(0) === "#" && v.charAt(1) !== "/" && v.length > 1 && !p.onclick) {
          p.onclick = rolaParaAncora(v.slice(1));
        }
      }
      v = corrigeUrl(v);
      if (v === false || v === null || v === undefined) {
        if (BOOLEANOS.indexOf(nomeAtr) > -1) p[nomeAtr] = false;
        continue;
      }
      p[nomeAtr] = v;
    }
    return h(tag, p, filhos(n.childNodes, escopo));
  }

  // ---------- componentes ----------

  var REGISTRO = {};
  var CABECA_FEITA = {};

  // Base das telas: `class Component extends DCLogic` com renderVals().
  function DCLogic(props, ctx) { P.Component.call(this, props, ctx); }
  DCLogic.prototype = Object.create(P.Component.prototype);
  DCLogic.prototype.constructor = DCLogic;
  DCLogic.prototype.render = function () {
    var vals = this.renderVals ? this.renderVals() || {} : {};
    var nos = filhos(this.__dcRaiz.childNodes, vals);
    var elementos = nos.filter(function (x) { return typeof x !== "string" || x.trim() !== ""; });
    return elementos.length === 1 ? elementos[0] : h(P.Fragment, null, elementos);
  };

  function aplicaCabeca(nome, helmet) {
    if (!helmet || CABECA_FEITA[nome]) return;
    CABECA_FEITA[nome] = true;
    Array.prototype.forEach.call(helmet.children, function (el) {
      if (el.localName === "link") {
        var href = el.getAttribute("href");
        var existe = Array.prototype.some.call(document.querySelectorAll("link"), function (l) { return l.getAttribute("href") === href; });
        if (existe) return;
        var l = document.createElement("link");
        l.rel = el.getAttribute("rel") || "stylesheet";
        l.href = href;
        document.head.appendChild(l);
      } else if (el.localName === "style") {
        var s = document.createElement("style");
        s.setAttribute("data-dc", nome);
        s.textContent = corrigeUrl(el.textContent);
        document.head.appendChild(s);
      }
    });
  }

  var CARREGANDO = {};

  function carrega(nome) {
    if (CARREGANDO[nome]) return CARREGANDO[nome];
    CARREGANDO[nome] = fetch(PASTA + nome + ".dc.html").then(function (r) {
      if (!r.ok) throw new Error("Não encontrei " + nome + ".dc.html");
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var raiz = doc.querySelector("x-dc");
      var script = doc.querySelector("script[data-dc-script]");
      var props = {};
      try { props = JSON.parse(script.getAttribute("data-props") || "{}"); } catch (e) { props = {}; }
      var defaults = {};
      Object.keys(props).forEach(function (k) {
        if (k.charAt(0) !== "$" && props[k] && props[k].default !== undefined) defaults[k] = props[k].default;
      });
      var fabrica = new Function("DCLogic", "React", script.textContent + "\n;return Component;");
      var Comp = fabrica(DCLogic, P);
      Comp.prototype.__dcRaiz = raiz;
      Comp.defaultProps = Object.assign({}, defaults, Comp.defaultProps || {});
      Comp.displayName = nome;
      Comp.__titulo = doc.title;
      aplicaCabeca(nome, raiz.querySelector("helmet"));
      REGISTRO[nome] = Comp;
      var deps = [];
      Array.prototype.forEach.call(raiz.querySelectorAll("dc-import"), function (d) {
        var n = d.getAttribute("name");
        if (deps.indexOf(n) === -1) deps.push(n);
      });
      return Promise.all(deps.map(carrega)).then(function () { return Comp; });
    });
    return CARREGANDO[nome];
  }

  // ---------- roteador e moldura ----------

  function forcaMobile() { return new URLSearchParams(location.search).get("v") === "mobile"; }

  function rotaAtual() {
    var r = (location.hash || "").replace(/^#\/?/, "").split(/[?#]/)[0];
    return ROTAS[r] ? r : "inicio";
  }

  function telaAtual() {
    var mobile = forcaMobile() || window.innerWidth < LARGURA_DESKTOP;
    return { rota: rotaAtual(), mobile: mobile, nome: ROTAS[rotaAtual()][mobile ? 0 : 1] };
  }

  function Seletor(props) {
    var url = location.pathname + (props.mobile ? "" : "?v=mobile") + location.hash;
    return h("a", {
      href: url,
      class: "dc-seletor",
      title: props.mobile ? "Ver a versão desktop" : "Ver a versão mobile numa moldura de celular"
    }, props.mobile ? "Ver versão desktop" : "Ver versão mobile");
  }

  function App(props) {
    P.Component.call(this, props);
    this.state = Object.assign(telaAtual(), { pronto: null, erro: null, w: window.innerWidth, alt: window.innerHeight });
  }
  App.prototype = Object.create(P.Component.prototype);
  App.prototype.constructor = App;

  App.prototype.componentDidMount = function () {
    var self = this;
    this.atualiza = function () {
      self.setState(Object.assign(telaAtual(), { w: window.innerWidth, alt: window.innerHeight }), function () { self.garanteCarga(); });
    };
    window.addEventListener("hashchange", function () { self.atualiza(); window.scrollTo(0, 0); });
    window.addEventListener("resize", this.atualiza);
    this.garanteCarga();
  };

  App.prototype.garanteCarga = function () {
    var self = this, nome = this.state.nome;
    if (this.state.pronto === nome) return;
    carrega(nome).then(function () {
      if (self.state.nome === nome) self.setState({ pronto: nome, erro: null });
    }).catch(function (e) { self.setState({ erro: String(e) }); });
  };

  App.prototype.render = function () {
    var s = this.state;
    if (s.erro) return h("p", { class: "dc-erro" }, s.erro);
    if (s.pronto !== s.nome) return h("div", { class: "dc-carregando" }, "Carregando…");
    var Tela = REGISTRO[s.nome];
    if (Tela.__titulo) document.title = Tela.__titulo;
    var largo = s.w >= LARGURA_DESKTOP;

    if (s.mobile && largo) {
      // Apresentação no computador: celular de 390 x 844 centralizado.
      return h(P.Fragment, null,
        h("div", { class: "dc-palco" },
          h("div", { class: "dc-celular" },
            h("div", { class: "dc-tela dc-tela--mobile", key: s.nome }, h(Tela, null)))),
        h(Seletor, { mobile: true }));
    }

    if (s.mobile) {
      // Celular de verdade: a tela de 390 px ocupa a largura toda.
      var zoom = s.w / LARGURA_MOBILE;
      var altura = Math.round(s.alt / zoom);
      return h("div", {
        class: "dc-tela dc-tela--mobile dc-tela--cheia",
        key: s.nome,
        style: "zoom:" + zoom + ";--dc-altura:" + altura + "px"
      }, h(Tela, null));
    }

    return h(P.Fragment, null,
      h("div", { class: "dc-tela dc-tela--desktop", key: s.nome }, h(Tela, null)),
      h(Seletor, { mobile: false }));
  };

  window.DC = { carrega: carrega, registro: REGISTRO, rotas: ROTAS };

  document.addEventListener("DOMContentLoaded", function () {
    P.render(h(App, null), document.getElementById("app"));
  });
})();
