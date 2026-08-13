const SITE_BASE = (() => {
  const script = [...document.scripts].find(item => /assets\/shop\.js/.test(item.src));
  return script ? new URL("..", script.src).href : new URL(".", window.location.href).href;
})();

function siteAsset(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ""), SITE_BASE).href;
}

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
    image: "assets/images/tee-editorial.png",
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
    image: "assets/images/hoodie-editorial.png",
    badge: "BLUSA GRÁFICA",
    graphic: "NOCTURNAL / GRID 02",
    specs: [["Cor", "Cinza concreto"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom leve · 3 cabos"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Grid original frontal + assinatura traseira"], ["Tamanhos", "P, M, G e GG"]]
  }
};

let PRODUCT_LIST = Object.entries(PRODUCTS).map(([id, product]) => ({ id, ...product }));
const STORAGE_KEY = "wl-streetwear-cart";
const CUSTOMER_KEY = "wl-streetwear-customer";
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
    document.body.insertAdjacentHTML("beforeend", `<section class="checkout-modal" id="checkoutModal" aria-hidden="true"><div class="backdrop" data-close-checkout></div><div class="checkout-box" role="dialog" aria-modal="true" aria-label="Checkout"><div class="panel-heading"><h3>Checkout</h3><button class="icon-button" type="button" data-close-checkout aria-label="Fechar checkout">×</button></div><div class="checkout-summary" id="checkoutSummary">Seu pedido aparecerá aqui.</div><form id="checkoutForm"><div class="form-grid"><div class="field full"><label for="name">Nome completo</label><input id="name" required placeholder="Seu nome"></div><div class="field full"><label for="email">E-mail</label><input id="email" type="email" required placeholder="voce@email.com"></div><div class="field full"><label for="address">Endereço de entrega</label><input id="address" required placeholder="Rua, número e bairro"></div><div class="field"><label for="city">Cidade</label><input id="city" required placeholder="Lavras"></div><div class="field"><label for="zip">CEP</label><input id="zip" required inputmode="numeric" placeholder="00000-000"></div></div><p class="payment-title">Forma de pagamento</p><div class="payment-options"><label class="payment-option"><input type="radio" name="payment" value="Pix" checked>PIX (simulado)</label><label class="payment-option"><input type="radio" name="payment" value="Cartão">Cartão (simulado)</label></div><div class="checkout-actions"><button class="button" type="submit">Pagar agora <span>→</span></button><button class="button outline" type="button" data-send-whatsapp>WhatsApp ↗</button></div><p class="checkout-note">Checkout de demonstração: nenhum pagamento é processado.</p></form></div></section>`);
  }
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
    const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
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

async function payOrder(event) {
  event.preventDefault();
  const payment = document.querySelector('input[name="payment"]:checked').value;
  const name = document.getElementById("name").value;
  let reference = "";
  if (window.location.protocol !== "file:") {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name,
            email: document.getElementById("email").value,
            address: document.getElementById("address").value,
            city: document.getElementById("city").value,
            zip: document.getElementById("zip").value
          },
          payment_method: payment,
          items: cart
        })
      });
      if (response.ok) reference = (await response.json()).reference || "";
    } catch {}
  }
  const orderLabel = reference ? `Pedido ${reference} recebido, ${name}!` : `Pedido recebido, ${name}!`;
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
    const response = await fetch("/api/products", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return;
    PRODUCTS = Object.fromEntries(rows.map(row => [row.slug, { ...row, specs: row.specs || [] }]));
    PRODUCT_LIST = Object.entries(PRODUCTS).map(([id, product]) => ({ id, ...product }));
  } catch {}
}

async function initializeStore() {
  await loadProductsFromApi();
  const selectedCategory = new URLSearchParams(window.location.search).get("categoria") || "todos";
  renderProductGrids(selectedCategory);
  renderProductPage();
  renderCart();
  bindCatalogFilters();
  document.querySelectorAll("[data-filter]").forEach(button => button.classList.remove("active"));
  document.querySelector(`[data-filter="${selectedCategory}"]`)?.classList.add("active");
}

ensureCommerceOverlays();
ensureAccountModal();
ensureShippingCalculator();
document.getElementById("checkoutForm")?.addEventListener("submit", payOrder);
bindCollectionMenu();
renderAccountLabel();
initializeStore();
