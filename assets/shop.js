const SITE_BASE = (() => {
  const script = [...document.scripts].find(item => /assets\/shop\.js/.test(item.src));
  return script ? new URL("..", script.src).href : new URL(".", window.location.href).href;
})();

function siteAsset(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ""), SITE_BASE).href;
}

const API_BASE_URL = String(window.WL_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = path => `${API_BASE_URL}${path}`;
let mercadoPagoBrickController = null;
let mercadoPagoSdkPromise = null;

let PRODUCTS = {
  "basic-white": {
    name: "Camiseta Basic White",
    category: "camisetas",
    brand: "WL",
    detail: "Branca / 100% algodão",
    description: "A camiseta que resolve qualquer look. Branca, limpa e com caimento oversized para usar todos os dias.",
    price: 99,
    image: "assets/images/tee-editorial.png",
    badge: "BÁSICA",
    specs: [["Cor", "Branco óptico"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão penteado · 220g"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Sem estampa"], ["Tamanhos", "P, M, G e GG"]]
  },
  "basic-black": {
    name: "Camiseta Basic Black",
    category: "camisetas",
    brand: "WL",
    detail: "Preta / 100% algodão",
    description: "Preta essencial com estrutura encorpada e visual urbano. Uma base forte para qualquer combinação.",
    price: 99,
    image: "assets/images/tee-black-white-stroke.png",
    badge: "BÁSICA",
    specs: [["Cor", "Preto profundo"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão penteado · 220g"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Sem estampa"], ["Tamanhos", "P, M, G e GG"]]
  },
  "tag-graffiti": {
    name: "Blusa Stacked Type",
    category: "blusas",
    brand: "WL",
    detail: "Estampada / manga longa",
    description: "Blusa oversized com arte tipográfica original em alto contraste, pensada para uma leitura de streetwear de luxo e presença urbana.",
    price: 99,
    image: "assets/images/hoodie-editorial.png",
    badge: "BLUSA GRÁFICA",
    graphic: "WL / STACKED 01",
    specs: [["Cor", "Preto com arte azul"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom leve · 3 cabos"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Arte tipográfica original em silk"], ["Tamanhos", "P, M, G e GG"]]
  },
  "concrete-riot": {
    name: "Blusa Nocturnal Grid",
    category: "blusas",
    brand: "WL",
    detail: "Estampada / manga longa",
    description: "Uma peça escura de proporção ampla, com grid gráfico exclusivo e acabamento azul elétrico para marcar o look.",
    price: 99,
    image: "assets/images/hoodie-sand.png",
    badge: "BLUSA GRÁFICA",
    graphic: "NOCTURNAL / GRID 02",
    specs: [["Cor", "Cinza concreto"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom leve · 3 cabos"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Grid original frontal + assinatura traseira"], ["Tamanhos", "P, M, G e GG"]]
  },
  "baw-archive": { name: "Camiseta Blue Graffiti", category: "camisetas", brand: "WL", detail: "Off-white / estampa azul", description: "Camiseta off-white com estampa azul de traço livre, criada para composições de rua.", price: 159, image: "assets/images/tee-blue-graffiti.png", badge: "CURADORIA", specs: [["Cor", "Off-white"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão premium"], ["Tamanhos", "P, M, G e GG"]] },
  "balenciaga-typography": { name: "Camiseta Lime Signal", category: "camisetas", brand: "WL", detail: "Chumbo / estampa azul e verde", description: "Camiseta chumbo com sinal gráfico em azul e verde-lima, original da curadoria WL.", price: 199, image: "assets/images/tee-signal-lime.png", badge: "CURADORIA", specs: [["Cor", "Chumbo"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão premium"], ["Tamanhos", "P, M, G e GG"]] },
  "supreme-box": { name: "Camiseta Red Stencil", category: "camisetas", brand: "WL", detail: "Azul-marinho / estampa vermelha", description: "Camiseta azul-marinho com arte stencil vermelha e leitura streetwear.", price: 179, image: "assets/images/tee-red-stencil.png", badge: "CURADORIA", specs: [["Cor", "Azul-marinho"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão premium"], ["Tamanhos", "P, M, G e GG"]] },
  "high-street": { name: "Camiseta Abstract Heart", category: "camisetas", brand: "WL", detail: "Off-white / estampa abstrata", description: "Camiseta off-white com arte abstrata de alto contraste e caimento oversized.", price: 149, image: "assets/images/hero-graphic-tee.png", badge: "CURADORIA", specs: [["Cor", "Off-white"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão premium"], ["Tamanhos", "P, M, G e GG"]] },
  "north-face-ice": { name: "Ice Summit Hoodie", category: "blusas", brand: "WL", detail: "Azul-marinho / moletom", description: "Moletom de curadoria com leitura outdoor e presença urbana.", price: 229, image: "assets/images/hoodie-navy.png", badge: "MOLETOM", specs: [["Cor", "Azul-marinho"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom 3 cabos"], ["Tamanhos", "P, M, G e GG"]] },
  "wl-heavy-hoodie": { name: "Cloud Heavy Hoodie", category: "blusas", brand: "WL", detail: "Chumbo / moletom pesado", description: "Moletom pesado com ombro deslocado e volume alto.", price: 189, image: "assets/images/hoodie-charcoal.png", badge: "MOLETOM", specs: [["Cor", "Chumbo"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom 3 cabos"], ["Tamanhos", "P, M, G e GG"]] },
  "short-night-utility": { name: "Short Night Utility", category: "shorts", brand: "WL", detail: "Cinza / bolsos utilitários", description: "Short cinza de corte reto com bolsos utilitários e construção leve.", price: 139, image: "assets/images/short-grey-utility.png", badge: "SHORTS", specs: [["Cor", "Cinza"], ["Modelagem", "Reta relaxed"], ["Material", "Sarja leve"], ["Tamanhos", "P, M, G e GG"]] },
  "short-white-utility": { name: "Short Black Utility", category: "shorts", brand: "WL", detail: "Preto / bolsos cargo", description: "Short preto cargo com cintura elástica e acabamento limpo para o dia a dia.", price: 129, image: "assets/images/short-black-utility.png", badge: "SHORTS", specs: [["Cor", "Preto"], ["Modelagem", "Cargo relaxed"], ["Material", "Sarja leve"], ["Tamanhos", "P, M, G e GG"]] },
  "oculos-tech-shield": { name: "Óculos Tech Shield", category: "oculos", brand: "WL", detail: "Preto / lente azul", description: "Óculos de lente envolvente com leitura esportiva e acabamento técnico.", price: 149, image: "assets/images/glasses-tech-shield.png", badge: "ÓCULOS", specs: [["Lente", "Azul com proteção UV"], ["Armação", "Policarbonato preto"], ["Ajuste", "Unissex"], ["Tamanho", "Único"]] },
  "oculos-sport-shield": { name: "Óculos Carbon Chrome", category: "oculos", brand: "WL", detail: "Carbono / lente cromada", description: "Óculos esportivo de lente cromada, estrutura leve e detalhes azuis para um visual técnico de rua.", price: 219, image: "assets/images/glasses-carbon-silver.png", badge: "ÓCULOS", specs: [["Lente", "Cromada com proteção UV"], ["Armação", "Polímero leve com acabamento carbono"], ["Ajuste", "Unissex"], ["Tamanho", "Único"]] },
  "oculos-wl-frame": { name: "Óculos Cobalt Visor", category: "oculos", brand: "WL", detail: "Preto / lente azul-violeta", description: "Óculos visor de lente iridescente azul-violeta e armação preta translúcida para completar o look street.", price: 179, image: "assets/images/glasses-cobalt-visor.png", badge: "ÓCULOS", specs: [["Lente", "Iridescente azul-violeta com proteção UV"], ["Armação", "Polímero preto translúcido"], ["Ajuste", "Unissex"], ["Tamanho", "Único"]] },
  "bone-black-panel": { name: "Boné Black Panel", category: "bones", brand: "WL", detail: "Preto / aba curva", description: "Boné preto 6-panel com detalhe azul discreto e ajuste traseiro.", price: 119, image: "assets/images/cap-black-panel.png", badge: "BONÉ", specs: [["Cor", "Preto"], ["Modelo", "6 panel"], ["Ajuste", "Fivela traseira"], ["Tamanho", "Único"]] },
  "bone-high-curve": { name: "Boné High Curve", category: "bones", brand: "WL", detail: "Azul-marinho / aba curva", description: "Boné de aba curva com construção leve, ajuste traseiro e presença street.", price: 109, image: "assets/images/cap-high-curve.png", badge: "BONÉ", specs: [["Cor", "Azul-marinho"], ["Modelo", "Aba curva"], ["Ajuste", "Regulável"], ["Tamanho", "Único"]] }
};

Object.assign(PRODUCTS, {
  "basic-white": { ...PRODUCTS["basic-white"], price: 109 },
  "basic-black": { ...PRODUCTS["basic-black"], price: 119 },
  "baw-archive": { ...PRODUCTS["baw-archive"], price: 100 },
  "balenciaga-typography": { ...PRODUCTS["balenciaga-typography"], price: 120 },
  "supreme-box": { ...PRODUCTS["supreme-box"], price: 110 },
  "high-street": { ...PRODUCTS["high-street"], price: 115 },
  "tag-graffiti": { ...PRODUCTS["tag-graffiti"], price: 249 },
  "concrete-riot": { ...PRODUCTS["concrete-riot"], price: 259 },
  "north-face-ice": { ...PRODUCTS["north-face-ice"], price: 249 },
  "wl-heavy-hoodie": { ...PRODUCTS["wl-heavy-hoodie"], price: 279 },
  "short-night-utility": { ...PRODUCTS["short-night-utility"], price: 100 },
  "short-white-utility": { ...PRODUCTS["short-white-utility"], price: 100 },
  "oculos-tech-shield": { ...PRODUCTS["oculos-tech-shield"], price: 99.9 },
  "oculos-sport-shield": { ...PRODUCTS["oculos-sport-shield"], price: 99.9 },
  "oculos-wl-frame": { ...PRODUCTS["oculos-wl-frame"], price: 99.9 },
  "bone-black-panel": { ...PRODUCTS["bone-black-panel"], price: 70 },
  "bone-high-curve": { ...PRODUCTS["bone-high-curve"], price: 70 }
});

function refreshStoreWording() {
  Object.values(PRODUCTS).forEach(product => {
    if (product.badge === "CURADORIA") product.badge = "SELE\u00c7\u00c3O";
    if (typeof product.description === "string") product.description = product.description.replace(/curadoria/gi, "sele\u00e7\u00e3o");
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement?.closest("script, style")) nodes.push(node);
  }
  nodes.forEach(node => { node.nodeValue = node.nodeValue.replace(/curadoria/gi, "sele\u00e7\u00e3o"); });
}

refreshStoreWording();
let PRODUCT_LIST = Object.entries(PRODUCTS).map(([id, product]) => ({ id, ...product }));
const STORAGE_KEY = "wl-streetwear-cart";
const CUSTOMER_KEY = "wl-streetwear-customer";
const DEMO_ORDERS_KEY = "wl-streetwear-manager-orders";
const MANAGER_INVENTORY_KEY = "wl-streetwear-manager-inventory";
const STORE_WHATSAPP = "5511998764321";
const money = value => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(item => PRODUCTS[item.id] && item.quantity > 0) : [];
  } catch { return []; }
}

let cart = getCart();
function saveCart() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {} }
function getCustomer() { try { const customer = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null"); return customer?.name && customer?.email ? customer : null; } catch { return null; } }
function saveCustomer(customer) { try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch {} }
function clearCustomer() { try { localStorage.removeItem(CUSTOMER_KEY); } catch {} }
function renderAccountLabel() { const customer = getCustomer(); document.querySelectorAll("[data-account-label]").forEach(label => { label.textContent = customer ? `Olá, ${customer.name.split(" ")[0]}` : "Entrar"; }); }
function cartCount() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
function cartTotal() { return cart.reduce((sum, item) => sum + (PRODUCTS[item.id].price * item.quantity), 0); }

function productUrl(id) { return `produtos/produto.html?slug=${encodeURIComponent(id)}`; }
function productCard(product) {
  return `<article class="product product-${product.id}">
    <a class="product-image" href="${productUrl(product.id)}" aria-label="Ver ${product.name}"><img src="${siteAsset(product.image)}" alt="${product.name}" loading="lazy"><span class="badge">${product.badge}</span><span class="shirt-graphic${product.graphic ? "" : " is-hidden"}">${product.graphic || ""}</span></a>
    <div class="product-info"><div class="product-name-line"><a class="product-name" href="${productUrl(product.id)}">${product.name}</a><span class="brand-pill">${product.brand || "WL"}</span></div><span class="price">${money(product.price)}</span><span class="product-description">${product.detail}</span><button class="product-add" type="button" data-add-product="${product.id}">Adicionar à sacola +</button></div>
  </article>`;
}

function renderProductGrids(filter = "todos") {
  document.querySelectorAll("[data-product-grid]").forEach(grid => {
    const limit = Number(grid.dataset.limit || PRODUCT_LIST.length);
    const category = grid.dataset.category || filter;
    const filtered = category === "todos" ? PRODUCT_LIST : category === "acessorios" ? PRODUCT_LIST.filter(product => ["bones", "oculos"].includes(product.category)) : PRODUCT_LIST.filter(product => product.category === category);
    grid.innerHTML = filtered.slice(0, limit).map(productCard).join("");
    const empty = grid.parentElement.querySelector("[data-empty-catalog]");
    if (empty) empty.hidden = filtered.length > 0;
  });
}

function renderProductPage() {
  const page = document.querySelector("[data-product-page]");
  if (!page) return;
  const id = page.dataset.productPage || new URLSearchParams(window.location.search).get("slug");
  const product = PRODUCTS[id];
  if (!product) return;
  document.title = `${product.name} — WL Streetwear`;
  page.querySelector("[data-product-image]").src = siteAsset(product.image);
  page.querySelector("[data-product-image]").alt = product.name;
  page.querySelector("[data-product-name]").textContent = product.name;
  page.querySelector("[data-product-price]").textContent = money(product.price);
  page.querySelector("[data-product-brand]")?.replaceChildren(document.createTextNode(product.brand || "WL"));
  page.querySelector("[data-product-copy]").textContent = product.description;
  page.querySelector("[data-product-badge]").textContent = product.badge;
  const graphic = page.querySelector("[data-product-graphic]");
  graphic.textContent = product.graphic || "";
  graphic.classList.toggle("is-hidden", !product.graphic);
  page.querySelector("[data-product-add]").dataset.addProduct = id;
  page.querySelector("[data-product-specs]").innerHTML = product.specs.map(([name, value]) => `<div class="spec-row"><dt>${name}</dt><dd>${value}</dd></div>`).join("");
}

function renderCart() {
  const count = cartCount();
  document.querySelectorAll("#cartCount").forEach(node => { node.textContent = count; });
  document.querySelectorAll("[data-cart-total]").forEach(node => { node.textContent = money(cartTotal()); });
  document.querySelectorAll("[data-cart-items]").forEach(container => {
    if (!cart.length) { container.innerHTML = '<p class="empty-cart">Sua sacola está vazia.</p>'; return; }
    container.innerHTML = cart.map((item, index) => {
      const product = PRODUCTS[item.id];
      return `<div class="cart-item"><span class="cart-item-name">${product.name}</span><span class="cart-item-price">${money(product.price * item.quantity)}</span><span class="cart-item-quantity">Tam. ${item.size} · Qtd. ${item.quantity}</span><button type="button" class="remove" data-remove-cart="${index}">Remover</button></div>`;
    }).join("");
  });
}

function addToCart(id, size = "M") {
  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing) existing.quantity += 1;
  else cart.push({ id, size, quantity: 1 });
  saveCart(); renderCart(); toggleCart(true);
}

function removeFromCart(index) { cart.splice(index, 1); saveCart(); renderCart(); }

function toggleCart(open) {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  drawer.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("modal-open", open);
}

function orderText() {
  const items = cart.map(item => {
    const product = PRODUCTS[item.id];
    return `• ${product.name} · Tam. ${item.size} · Qtd. ${item.quantity} — ${money(product.price * item.quantity)}`;
  }).join("\n");
  return `${items}\n\nTotal: ${money(cartTotal())}`;
}

function openCheckout() {
  if (!cart.length) { alert("Adicione uma camiseta à sacola antes de continuar."); return; }
  toggleCart(false);
  const modal = document.getElementById("checkoutModal");
  document.getElementById("checkoutSummary").textContent = orderText();
  modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open");
}

function closeCheckout() {
  const modal = document.getElementById("checkoutModal");
  unmountMercadoPagoBrick();
  modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("modal-open");
}

function sendToWhatsApp() {
  if (!cart.length) { alert("Adicione uma camiseta à sacola antes de continuar."); return; }
  const name = document.getElementById("name").value || "Cliente";
  const message = encodeURIComponent(`Olá, WL! Sou ${name} e quero finalizar este pedido:\n\n${orderText()}`);
  window.open(`https://wa.me/${STORE_WHATSAPP}?text=${message}`, "_blank", "noopener");
}

function bindCatalogFilters() {
  const filterBar = document.querySelector(".catalog-filters");
  if (filterBar && !filterBar.querySelector('[data-filter="bones"]')) {
    filterBar.insertAdjacentHTML("beforeend", '<button class="filter-chip" type="button" data-filter="bones">Bonés</button><button class="filter-chip" type="button" data-filter="oculos">Óculos</button>');
  }
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      renderProductGrids(button.dataset.filter);
    });
  });
}

function bindMobileCategorySelect() {
  const select = document.querySelector("[data-mobile-category-select]");
  if (!select) return;
  const selected = new URLSearchParams(window.location.search).get("categoria") || "todos";
  select.value = selected;
  select.addEventListener("change", () => {
    const category = select.value;
    window.location.href = category === "todos" ? "colecao.html" : `colecao.html?categoria=${encodeURIComponent(category)}`;
  });
}

function applyLocalInventory() {
  try {
    const inventory = JSON.parse(localStorage.getItem(MANAGER_INVENTORY_KEY) || "{}");
    PRODUCT_LIST = Object.entries(PRODUCTS)
      .filter(([id]) => inventory[id] == null || (inventory[id].active !== false && Number(inventory[id].stock) > 0))
      .map(([id, product]) => ({ id, ...product }));
  } catch {
    PRODUCT_LIST = Object.entries(PRODUCTS).map(([id, product]) => ({ id, ...product }));
  }
}

function initializeHeroSlideshow() {
  const hero = document.querySelector(".hero-visual");
  if (!hero || hero.querySelector(".hero-slide")) return;
  const images = [
    "assets/images/hero-graphic-tee.png",
    "assets/images/tee-black-white-stroke.png",
    "assets/images/tee-blue-graffiti.png",
    "assets/images/tee-red-stencil.png"
  ];
  hero.innerHTML = images.map((image, index) => `<span class="hero-slide hero-slide-${index + 1}" style="background-image:url('${siteAsset(image)}')"></span>`).join("");
}

function bindCollectionMenu() {
  const menu = document.querySelector(".collection-menu");
  const toggle = menu?.querySelector("[data-collection-toggle]");
  if (!menu || !toggle) return;
  toggle.addEventListener("click", event => {
    event.stopPropagation();
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", event => {
    if (!menu.contains(event.target)) {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function ensureCommerceOverlays() {
  if (!document.getElementById("cartDrawer")) {
    document.body.insertAdjacentHTML("beforeend", `<section class="drawer" id="cartDrawer" aria-hidden="true"><div class="backdrop" data-close-cart></div><aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Sua sacola"><div class="panel-heading"><h3>Sua sacola</h3><button class="icon-button" type="button" data-close-cart aria-label="Fechar sacola">×</button></div><div class="cart-items" data-cart-items></div><div class="cart-total"><span>Total</span><strong data-cart-total>R$ 0,00</strong></div><button class="button" type="button" data-open-checkout>Ir para checkout <span>→</span></button></aside></section>`);
  }
  if (!document.getElementById("checkoutModal")) {
    document.body.insertAdjacentHTML("beforeend", `<section class="checkout-modal" id="checkoutModal" aria-hidden="true"><div class="backdrop" data-close-checkout></div><div class="checkout-box" role="dialog" aria-modal="true" aria-label="Checkout"><div class="panel-heading"><h3>Checkout</h3><button class="icon-button" type="button" data-close-checkout aria-label="Fechar checkout">×</button></div><div class="checkout-summary" id="checkoutSummary">Seu pedido aparecerá aqui.</div><form id="checkoutForm"><div class="form-grid"><div class="field full"><label for="name">Nome completo</label><input id="name" required placeholder="Seu nome"></div><div class="field full"><label for="email">E-mail</label><input id="email" type="email" required placeholder="voce@email.com"></div><div class="field full"><label for="address">Endereço de entrega</label><input id="address" required placeholder="Rua, número e bairro"></div><div class="field"><label for="city">Cidade</label><input id="city" required placeholder="Lavras"></div><div class="field"><label for="zip">CEP</label><input id="zip" required inputmode="numeric" placeholder="00000-000"></div></div><p class="payment-title">Forma de pagamento</p><div class="payment-options"><label class="payment-option"><input type="radio" name="payment" value="Mercado Pago" data-mercado-pago checked>Mercado Pago (PIX ou Cartão)</label></div><div class="checkout-actions"><button class="button" type="submit">Continuar para pagamento <span>→</span></button><button class="button outline" type="button" data-send-whatsapp>WhatsApp ↗</button></div><p class="checkout-note">O formulário seguro será aberto dentro desta página.</p></form><section id="mercadoPagoBrick" class="mercado-pago-brick" hidden aria-live="polite"></section></div></section>`);
  }
  const checkoutBox = document.querySelector("#checkoutModal .checkout-box");
  if (checkoutBox && !document.getElementById("mercadoPagoBrick")) {
    checkoutBox.insertAdjacentHTML("beforeend", '<section id="mercadoPagoBrick" class="mercado-pago-brick" hidden aria-live="polite"></section>');
  }
}

function ensureMercadoPagoOption() {
  const options = document.querySelector(".payment-options");
  if (!options) return;
  options.querySelectorAll('input[name="payment"]:not([data-mercado-pago])').forEach(input => input.closest(".payment-option")?.remove());
  let mercadoPago = options.querySelector("[data-mercado-pago]");
  if (!mercadoPago) {
    options.insertAdjacentHTML("afterbegin", '<label class="payment-option"><input type="radio" name="payment" value="Mercado Pago" data-mercado-pago>Mercado Pago (PIX ou Cartão)</label>');
    mercadoPago = options.querySelector("[data-mercado-pago]");
  }
  const label = mercadoPago?.closest(".payment-option");
  if (label) label.lastChild.nodeValue = "Mercado Pago (PIX ou Cartão)";
  const note = document.querySelector(".checkout-note");
  if (note) note.textContent = "PIX e cartão são selecionados dentro do formulário seguro do Mercado Pago.";
  if (mercadoPago) mercadoPago.checked = true;
}

function ensureAccountModal() {
  if (document.getElementById("accountModal")) return;
  document.body.insertAdjacentHTML("beforeend", `<section class="account-modal" id="accountModal" aria-hidden="true"><div class="backdrop" data-close-account></div><section class="account-box" role="dialog" aria-modal="true" aria-label="Sua conta"><div class="panel-heading"><div><p class="account-kicker">WL / MEMBERS</p><h3>Sua conta.</h3></div><button class="icon-button" type="button" data-close-account aria-label="Fechar conta">×</button></div><p class="account-copy">Entre para acompanhar suas compras e deixar seu checkout mais rápido.</p><div class="account-session" id="accountSession" hidden><span class="label">Cliente conectado</span><strong id="accountSessionName"></strong><p id="accountSessionEmail"></p><button class="account-logout" type="button" data-account-logout>Sair da conta</button></div><div id="accountWorkflow"><div class="account-tabs"><button class="account-tab active" type="button" data-account-tab="login">Entrar</button><button class="account-tab" type="button" data-account-tab="register">Criar conta</button></div><form class="account-form" data-account-form="login"><label>E-mail<input name="email" type="email" required autocomplete="email" placeholder="voce@email.com"></label><label>Senha<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="Sua senha"></label><button class="button" type="submit">Entrar na WL <span>→</span></button></form><form class="account-form" data-account-form="register" hidden><label>Nome completo<input name="name" required autocomplete="name" placeholder="Seu nome"></label><label>E-mail<input name="email" type="email" required autocomplete="email" placeholder="voce@email.com"></label><label>Crie uma senha<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo de 6 caracteres"></label><button class="button" type="submit">Criar minha conta <span>→</span></button></form><p class="account-message" data-account-message aria-live="polite"></p><p class="account-legal">Área de conta de demonstração. Seus dados ficam no banco local desta loja de teste.</p></div></section></section>`);
}

function setAccountTab(mode) {
  document.querySelectorAll("[data-account-tab]").forEach(button => button.classList.toggle("active", button.dataset.accountTab === mode));
  document.querySelectorAll("[data-account-form]").forEach(form => { form.hidden = form.dataset.accountForm !== mode; });
  const message = document.querySelector("[data-account-message]");
  if (message) { message.textContent = ""; message.classList.remove("success"); }
}

function renderAccountSession() {
  const customer = getCustomer();
  const session = document.getElementById("accountSession");
  const workflow = document.getElementById("accountWorkflow");
  if (!session || !workflow) return;
  session.hidden = !customer; workflow.hidden = Boolean(customer);
  if (customer) { document.getElementById("accountSessionName").textContent = customer.name; document.getElementById("accountSessionEmail").textContent = customer.email; }
}

function openAccount(mode = "login") { ensureAccountModal(); setAccountTab(mode); renderAccountSession(); const modal = document.getElementById("accountModal"); modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("modal-open"); }
function closeAccount() { const modal = document.getElementById("accountModal"); if (!modal) return; modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("modal-open"); }

async function submitAccountForm(form) {
  const mode = form.dataset.accountForm;
  const message = document.querySelector("[data-account-message]");
  message.textContent = ""; message.classList.remove("success");
  try {
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch(apiUrl(`/api/auth/${mode === "register" ? "register" : "login"}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível acessar sua conta");
    saveCustomer(result.customer); renderAccountLabel(); renderAccountSession(); message.textContent = mode === "register" ? "Conta criada com sucesso." : "Login realizado com sucesso."; message.classList.add("success");
  } catch (error) { message.textContent = error.message || "Não foi possível acessar sua conta."; }
}

function ensureShippingCalculator() {
  const form = document.getElementById("checkoutForm");
  const fields = form?.querySelector(".form-grid");
  if (!form || !fields || form.querySelector("[data-calculate-shipping]")) return;
  fields.insertAdjacentHTML("afterend", `<div class="shipping-calculator"><div><p class="payment-title">Taxa de entrega</p><p class="shipping-copy">Informe o CEP para estimar o envio do seu pedido.</p></div><button class="button outline shipping-button" type="button" data-calculate-shipping>Calcular entrega</button><p class="shipping-result" data-shipping-result aria-live="polite"></p></div>`);
}

function calculateShipping() {
  const zip = (document.getElementById("zip")?.value || "").replace(/\D/g, "");
  const result = document.querySelector("[data-shipping-result]");
  if (!result) return;
  if (zip.length !== 8) {
    result.textContent = "Informe um CEP válido com 8 números para calcular.";
    return;
  }
  const isRegional = zip.startsWith("37");
  const fee = cartTotal() >= 29900 ? 0 : (isRegional ? 1290 : 1990);
  result.textContent = fee ? `Entrega estimada: ${money(fee)} · prazo de 3 a 8 dias úteis.` : "Entrega grátis · prazo de 3 a 8 dias úteis.";
}

function unmountMercadoPagoBrick() {
  const container = document.getElementById("mercadoPagoBrick");
  if (mercadoPagoBrickController?.unmount) mercadoPagoBrickController.unmount();
  mercadoPagoBrickController = null;
  if (container) { container.hidden = true; container.innerHTML = ""; }
  document.querySelector(".checkout-actions")?.removeAttribute("hidden");
}

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (mercadoPagoSdkPromise) return mercadoPagoSdkPromise;
  mercadoPagoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => window.MercadoPago ? resolve() : reject(new Error("Não foi possível carregar o Mercado Pago."));
    script.onerror = () => reject(new Error("Não foi possível carregar o Mercado Pago."));
    document.head.appendChild(script);
  });
  return mercadoPagoSdkPromise;
}

function checkoutPayloadFor(paymentMethod) {
  return {
    customer: {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      address: document.getElementById("address").value,
      city: document.getElementById("city").value,
      zip: document.getElementById("zip").value
    },
    payment_method: paymentMethod,
    items: cart
  };
}

async function openMercadoPagoBrick() {
  if (!API_BASE_URL) throw new Error("O servidor de pagamentos ainda não está configurado.");
  const configResponse = await fetch(apiUrl("/api/payments/mercado-pago/config"), { headers: { Accept: "application/json" } });
  const config = await configResponse.json();
  if (!configResponse.ok || !config.public_key) throw new Error(config.error || "A chave pública do Mercado Pago ainda não foi configurada.");
  await loadMercadoPagoSdk();
  unmountMercadoPagoBrick();

  const container = document.getElementById("mercadoPagoBrick");
  const actions = document.querySelector(".checkout-actions");
  const note = document.querySelector(".checkout-note");
  container.hidden = false;
  actions?.setAttribute("hidden", "");
  if (note) note.textContent = "Pagamento processado com segurança pelo Mercado Pago, sem sair da WL Streetwear.";

  const mercadoPago = new window.MercadoPago(config.public_key, { locale: "pt-BR" });
  const bricksBuilder = mercadoPago.bricks();
  mercadoPagoBrickController = await bricksBuilder.create("payment", "mercadoPagoBrick", {
    initialization: {
      amount: Number((cartTotal() / 100).toFixed(2)),
      payer: { email: document.getElementById("email").value }
    },
    customization: { paymentMethods: { creditCard: "all", debitCard: "all", bankTransfer: "pix" } },
    callbacks: {
      onReady: () => {},
      onSubmit: async ({ formData }) => {
        const response = await fetch(apiUrl("/api/payments/mercado-pago/payment"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: checkoutPayloadFor("Mercado Pago"), payment: formData })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível processar o pagamento.");
        const approved = result.status === "approved";
        alert(approved
          ? `Pagamento aprovado! Pedido ${result.reference} confirmado.`
          : `Pedido ${result.reference} criado. Status do pagamento: ${result.status || "em análise"}.`);
        if (approved) { cart = []; saveCart(); renderCart(); }
        closeCheckout();
      },
      onError: error => { if (note) note.textContent = `Mercado Pago: ${error?.message || "não foi possível carregar o formulário."}`; }
    }
  });
}

async function payOrder(event) {
  event.preventDefault();
  const payment = document.querySelector('input[name="payment"]:checked').value;
  const name = document.getElementById("name").value;
  let reference = "";
  const checkoutPayload = checkoutPayloadFor(payment);
  if (payment === "Mercado Pago") {
    try {
      await openMercadoPagoBrick();
      return;
    } catch (error) {
      alert(error.message || "O Mercado Pago ainda não está disponível. Tente novamente em instantes.");
      return;
    }
  }
  if (window.location.protocol !== "file:") {
    try {
      const response = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload)
      });
      if (response.ok) reference = (await response.json()).reference || "";
    } catch {}
  }
  if (!reference) {
    reference = `WL-${Date.now().toString().slice(-6)}`;
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) || "[]");
      const order = {
        reference,
        customer: name,
        email: document.getElementById("email").value,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        zip: document.getElementById("zip").value,
        payment,
        status: "novo",
        created_at: new Date().toISOString(),
        total: cartTotal(),
        items: cart.map(item => ({ product_name: PRODUCTS[item.id].name, quantity: item.quantity, size: item.size, unit_price: PRODUCTS[item.id].price }))
      };
      localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify([order, ...saved].slice(0, 100)));
    } catch {}
  }
  const orderLabel = `Pedido ${reference} recebido, ${name}!`;
  alert(`${orderLabel}\n\nPagamento via ${payment} aprovado em modo demonstração.\nTotal: ${money(cartTotal())}`);
  cart = []; saveCart(); renderCart(); closeCheckout(); event.currentTarget.reset();
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add-product]");
  if (add) {
    const size = document.querySelector(".size-button.active")?.dataset.size || "M";
    addToCart(add.dataset.addProduct, size);
    return;
  }
  const remove = event.target.closest("[data-remove-cart]");
  if (remove) { removeFromCart(Number(remove.dataset.removeCart)); return; }
  if (event.target.closest("[data-open-cart]")) { toggleCart(true); return; }
  if (event.target.closest("[data-close-cart]")) { toggleCart(false); return; }
  if (event.target.closest("[data-open-checkout]")) { openCheckout(); return; }
  if (event.target.closest("[data-close-checkout]")) { closeCheckout(); return; }
  if (event.target.closest("[data-open-account]")) { openAccount(); return; }
  if (event.target.closest("[data-close-account]")) { closeAccount(); return; }
  const accountTab = event.target.closest("[data-account-tab]");
  if (accountTab) { setAccountTab(accountTab.dataset.accountTab); return; }
  if (event.target.closest("[data-account-logout]")) { clearCustomer(); renderAccountLabel(); renderAccountSession(); return; }
  if (event.target.closest("[data-send-whatsapp]")) { sendToWhatsApp(); return; }
  if (event.target.closest("[data-calculate-shipping]")) { calculateShipping(); return; }
  const size = event.target.closest(".size-button");
  if (size) { document.querySelectorAll(".size-button").forEach(button => button.classList.remove("active")); size.classList.add("active"); }
});

document.addEventListener("submit", event => {
  const form = event.target.closest("[data-account-form]");
  if (!form) return;
  event.preventDefault();
  submitAccountForm(form);
});

async function loadProductsFromApi() {
  if (window.location.protocol === "file:") return;
  try {
    const response = await fetch(apiUrl("/api/products"), { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return;
    PRODUCTS = Object.fromEntries(rows.map(row => [row.slug, { ...row, specs: row.specs || [] }]));
    PRODUCT_LIST = Object.entries(PRODUCTS).map(([id, product]) => ({ id, ...product }));
  } catch {}
}

async function initializeStore() {
  await loadProductsFromApi();
  refreshStoreWording();
  applyLocalInventory();
  const selectedCategory = new URLSearchParams(window.location.search).get("categoria") || "todos";
  renderProductGrids(selectedCategory);
  renderProductPage();
  renderCart();
  bindCatalogFilters();
  bindMobileCategorySelect();
  initializeHeroSlideshow();
  document.querySelectorAll("[data-filter]").forEach(button => button.classList.remove("active"));
  document.querySelector(`[data-filter="${selectedCategory}"]`)?.classList.add("active");
}

ensureCommerceOverlays();
ensureMercadoPagoOption();
ensureAccountModal();
ensureShippingCalculator();
document.getElementById("checkoutForm")?.addEventListener("submit", payOrder);
bindCollectionMenu();
renderAccountLabel();
initializeStore();
