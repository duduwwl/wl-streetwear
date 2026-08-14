(() => {
  if (!location.hostname.endsWith("github.io") || window.WL_API_BASE_URL) return;

  const inventoryKey = "wl-streetwear-manager-inventory";
  const ordersKey = "wl-streetwear-manager-orders";
  const products = [
    ["basic-white", "Camiseta Basic White", "camisetas", "assets/images/tee-editorial.png"],
    ["basic-black", "Camiseta Basic Black", "camisetas", "assets/images/tee-black-white-stroke.png"],
    ["baw-archive", "Camiseta Blue Graffiti", "camisetas", "assets/images/tee-blue-graffiti.png"],
    ["balenciaga-typography", "Camiseta Lime Signal", "camisetas", "assets/images/tee-signal-lime.png"],
    ["supreme-box", "Camiseta Red Stencil", "camisetas", "assets/images/tee-red-stencil.png"],
    ["high-street", "Camiseta Abstract Heart", "camisetas", "assets/images/hero-graphic-tee.png"],
    ["tag-graffiti", "Blusa Stacked Type", "moletons", "assets/images/hoodie-editorial.png"],
    ["concrete-riot", "Blusa Nocturnal Grid", "moletons", "assets/images/hoodie-sand.png"],
    ["north-face-ice", "Ice Summit Hoodie", "moletons", "assets/images/hoodie-navy.png"],
    ["wl-heavy-hoodie", "Cloud Heavy Hoodie", "moletons", "assets/images/hoodie-charcoal.png"],
    ["short-night-utility", "Short Night Utility", "shorts", "assets/images/short-grey-utility.png"],
    ["short-white-utility", "Short Black Utility", "shorts", "assets/images/short-black-utility.png"],
    ["oculos-tech-shield", "Óculos Tech Shield", "óculos", "assets/images/glasses-tech-shield.png"],
    ["oculos-sport-shield", "Óculos Carbon Chrome", "óculos", "assets/images/glasses-carbon-silver.png"],
    ["oculos-wl-frame", "Óculos Cobalt Visor", "óculos", "assets/images/glasses-cobalt-visor.png"],
    ["bone-black-panel", "Boné Black Panel", "bonés", "assets/images/cap-black-panel.png"],
    ["bone-high-curve", "Boné High Curve", "bonés", "assets/images/cap-high-curve.png"]
  ].map(([slug, name, category, image]) => ({ slug, name, category, image }));

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const getInventory = () => {
    const current = read(inventoryKey, {});
    return products.map(product => ({ ...product, ...(current[product.slug] || { stock: 12, active: true }) }));
  };

  function render() {
    const orders = read(ordersKey, []);
    const inventory = getInventory();
    document.getElementById("statOpen").textContent = orders.filter(order => !["entregue", "cancelado"].includes(order.status)).length;
    document.getElementById("statRevenue").textContent = money(orders.filter(order => order.status !== "cancelado").reduce((sum, order) => sum + Number(order.total || 0), 0));
    document.getElementById("statStock").textContent = inventory.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    document.getElementById("statLow").textContent = inventory.filter(product => Number(product.stock) <= 3).length;
    const ordersList = document.getElementById("ordersList");
    ordersList.innerHTML = orders.length ? orders.map(order => `<article class="order-card"><div class="order-main"><h3>${order.reference} · ${order.customer}</h3><div class="order-meta">${order.email} · ${order.city} · CEP ${order.zip}<br>${order.address}<br>${new Date(order.created_at).toLocaleString("pt-BR")} · ${order.payment}</div><div class="order-items">${order.items.map(item => `${item.quantity}× ${item.product_name} · tam. ${item.size} · ${money(item.unit_price)}`).join("<br>")}</div></div><div class="order-side"><strong>${money(order.total)}</strong><select class="status-select" data-static-status="${order.reference}"><option value="novo">Novo pedido</option><option value="pago">Pago</option><option value="separando">Separando</option><option value="enviado">Enviado</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option></select><button class="status-save" type="button" data-static-save-status="${order.reference}">Salvar status</button></div></article>`).join("") : '<p class="admin-empty">Nenhum pedido recebido ainda. Os pedidos feitos neste navegador aparecerão aqui.</p>';
    orders.forEach(order => { const select = ordersList.querySelector(`[data-static-status="${order.reference}"]`); if (select) select.value = order.status || "novo"; });
    const inventoryList = document.getElementById("inventoryList");
    inventoryList.innerHTML = inventory.map(product => `<article class="inventory-card ${Number(product.stock) === 0 ? "stock-zero" : Number(product.stock) <= 3 ? "stock-low" : ""}"><img src="${product.image}" alt=""><div class="inventory-info"><h3>${product.name}</h3><p>${product.category} / WL</p><div class="stock-control"><input class="stock-input" type="number" min="0" max="9999" value="${product.stock}" data-static-stock="${product.slug}" aria-label="Estoque de ${product.name}"><button class="stock-save" type="button" data-static-save-stock="${product.slug}">Salvar</button></div><label class="availability"><input type="checkbox" data-static-active="${product.slug}" ${product.active !== false ? "checked" : ""}> disponível na loja</label></div></article>`).join("");
  }

  document.addEventListener("click", event => {
    const statusButton = event.target.closest("[data-static-save-status]");
    if (statusButton) {
      event.stopImmediatePropagation();
      const orders = read(ordersKey, []), reference = statusButton.dataset.staticSaveStatus;
      const select = document.querySelector(`[data-static-status="${reference}"]`);
      const order = orders.find(item => item.reference === reference);
      if (order) { order.status = select.value; save(ordersKey, orders); render(); }
      return;
    }
    const stockButton = event.target.closest("[data-static-save-stock]");
    if (stockButton) {
      event.stopImmediatePropagation();
      const slug = stockButton.dataset.staticSaveStock;
      const inventory = read(inventoryKey, {});
      inventory[slug] = { stock: Math.max(0, Number(document.querySelector(`[data-static-stock="${slug}"]`).value || 0)), active: document.querySelector(`[data-static-active="${slug}"]`).checked };
      save(inventoryKey, inventory); render();
    }
  }, true);
  document.getElementById("refreshDashboard").addEventListener("click", event => { event.stopImmediatePropagation(); render(); }, true);
  render();
})();
