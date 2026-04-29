const state = {
  user: null,
  menu: [],
  cart: {},
  category: "All",
  search: "",
  lastOrder: null,
  lang: "en"
};

const categoryKeys = ["All", "Pizza", "Burgers", "Drinks", "Snacks", "Ice Cream", "Sauces", "Extras", "Menus", "Campaign"];

const i18n = window.I18N;

function byId(id) { return document.getElementById(id); }
function t() { return i18n[state.lang]; }
function localizeText(text) {
  return i18n.translateDynamicText(text, state.lang);
}
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  byId(pageId).classList.add("active");
}
function money(value) { return `${value.toFixed(2)} TL`; }
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function applyStaticTexts() {
  byId("menu-btn").textContent = t().menu;
  byId("cart-btn").textContent = t().bucket;
  byId("profile-btn").textContent = t().profile;
  byId("logout-btn").textContent = t().logout;
  byId("tagline").textContent = t().tagline;
  byId("login-title").textContent = t().loginTitle;
  byId("login-hint").innerHTML = t().loginHint;
  byId("login-email-label").textContent = t().email;
  byId("login-password-label").textContent = t().password;
  byId("test-login-fill").textContent = t().useTestLogin;
  byId("login-btn").textContent = t().login;
  byId("no-account-text").textContent = t().noAccount;
  byId("go-signup").textContent = t().goSignup;
  byId("signup-title").textContent = t().signupTitle;
  byId("signup-hint").innerHTML = t().signupHint;
  byId("signup-name-label").textContent = t().fullName;
  byId("signup-email-label").textContent = t().email;
  byId("signup-password-label").textContent = t().password;
  byId("signup-confirm-label").textContent = t().confirmPassword;
  byId("test-register-fill").textContent = t().createTestRegister;
  byId("signup-btn").textContent = t().signupTitle;
  byId("already-registered-text").textContent = t().alreadyRegistered;
  byId("go-login").textContent = t().backToLogin;
  byId("search-input").placeholder = t().searchPlaceholder;
  byId("bucket-title").textContent = t().yourBucket;
  byId("subtotal-label").textContent = t().subtotal;
  byId("service-label").textContent = t().service;
  byId("total-label").textContent = t().total;
  byId("order-btn").textContent = t().order;
  byId("order-history-title").textContent = t().orderHistory;
  byId("receipt-title").textContent = t().orderReceipt;
  byId("receipt-subtotal-label").textContent = t().subtotal;
  byId("receipt-service-label").textContent = t().service;
  byId("receipt-total-label").textContent = t().total;
  byId("download-pdf-btn").textContent = t().downloadPdf;
  byId("back-menu-btn").textContent = t().backToMenu;
  byId("theme-toggle").textContent = document.body.classList.contains("dark") ? t().themeLight : t().themeDark;
}

function renderCategories() {
  const wrap = byId("categories");
  wrap.innerHTML = categoryKeys
    .map((cat) => `<button data-cat="${cat}" class="${state.category === cat ? "active" : ""}">${t().categories[cat]}</button>`)
    .join("");
  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      renderCategories();
      renderMenu();
    });
  });
}

function filteredMenu() {
  return state.menu.filter((item) => {
    const catOk = state.category === "All" || item.category === state.category;
    const q = state.search.toLowerCase();
    const textOk = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    return catOk && textOk;
  });
}

function renderMenu() {
  const grid = byId("menu-grid");
  const items = filteredMenu();
  grid.innerHTML = items
    .map((item) => {
      const inCart = state.cart[item.id] || 0;
      return `
      <article class="card">
        <div class="food-image"><img src="${item.image}" alt="${localizeText(item.name)}" loading="lazy" referrerpolicy="no-referrer" /></div>
        <h3>${localizeText(item.name)}</h3>
        <p class="muted">${localizeText(item.description)}</p>
        <p class="muted">${t().categories[item.category] || item.category} • ⭐ ${item.rating}</p>
        <div class="price-row">
          <span class="price">${money(item.price)}</span>
          <button class="btn add-btn" data-id="${item.id}">${inCart ? `${t().inBucket} (${inCart})` : t().addToBucket}</button>
        </div>
      </article>`;
    })
    .join("");
  grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.id)));
  });
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => {
      const item = state.menu.find((m) => m.id === Number(id));
      return item ? { ...item, quantity } : null;
    })
    .filter(Boolean);
}

function calcTotals() {
  const subtotal = cartEntries().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const service = subtotal * 0.1;
  return { subtotal, service, total: subtotal + service };
}

async function syncCart() {
  if (!state.user) return;
  const items = cartEntries().map((i) => ({ id: i.id, name: i.name, category: i.category, price: i.price, quantity: i.quantity }));
  await api("/api/cart/save", { method: "POST", body: JSON.stringify({ userId: state.user.id, items }) });
}

function renderCart() {
  const list = byId("cart-list");
  const entries = cartEntries();
  if (!entries.length) {
    list.innerHTML = `<p class='muted'>${t().emptyBucket}</p>`;
    byId("order-btn").disabled = true;
  } else {
    list.innerHTML = entries
      .map((item) => `
      <div class="cart-item">
        <div>${localizeText(item.name)}</div>
        <button class="btn btn-secondary qty-btn" data-id="${item.id}" data-delta="-1">-</button>
        <strong>${item.quantity}</strong>
        <button class="btn btn-secondary qty-btn" data-id="${item.id}" data-delta="1">+</button>
      </div>
      <div class="cart-item" style="grid-template-columns:1fr auto;">
        <span class="muted">${money(item.price)} ${t().each}</span>
        <button class="btn btn-danger remove-btn" data-id="${item.id}">${t().remove}</button>
      </div>`)
      .join("");
    byId("order-btn").disabled = false;
  }

  const totals = calcTotals();
  byId("cart-subtotal").textContent = money(totals.subtotal);
  byId("cart-service").textContent = money(totals.service);
  byId("cart-total").textContent = money(totals.total);

  list.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const delta = Number(btn.dataset.delta);
      state.cart[id] = (state.cart[id] || 0) + delta;
      if (state.cart[id] <= 0) delete state.cart[id];
      renderMenu();
      renderCart();
      await syncCart();
    });
  });
  list.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      delete state.cart[Number(btn.dataset.id)];
      renderMenu();
      renderCart();
      await syncCart();
    });
  });
}

async function addToCart(itemId) {
  state.cart[itemId] = (state.cart[itemId] || 0) + 1;
  renderMenu();
  renderCart();
  await syncCart();
}

function renderProfile(user) {
  byId("profile-name").textContent = user.full_name;
  byId("profile-email").textContent = user.email;
}

async function loadOrderHistory() {
  const orders = await api(`/api/orders/${state.user.id}`);
  const target = byId("order-history");
  if (!orders.length) {
    target.innerHTML = `<p class='muted'>${t().noOrders}</p>`;
    return;
  }
  target.innerHTML = orders
    .map((order) => `<div class="cart-item"><span>${order.order_ref}</span><strong>${money(order.total)}</strong></div>`)
    .join("");
}

function renderReceipt(order) {
  state.lastOrder = order;
  byId("receipt-ref").textContent = `${t().receiptPrefix}: ${order.orderRef}`;
  byId("receipt-time").textContent = new Date(order.createdAt).toLocaleString();
  byId("receipt-items").innerHTML = order.items
    .map((item) => `<div class="receipt-item"><span>${localizeText(item.name)}</span><span>x${item.quantity}</span><strong>${money(item.quantity * item.price)}</strong></div>`)
    .join("");
  byId("receipt-subtotal").textContent = money(order.subtotal);
  byId("receipt-service").textContent = money(order.service);
  byId("receipt-total").textContent = money(order.total);
}

async function placeOrder() {
  const items = cartEntries().map((item) => ({ id: item.id, name: item.name, category: item.category, price: item.price, quantity: item.quantity }));
  if (!items.length) return;
  const created = await api("/api/orders", { method: "POST", body: JSON.stringify({ userId: state.user.id, items }) });
  state.cart = {};
  renderMenu();
  renderCart();
  renderReceipt(created.order);
  showPage("receipt-page");
  await loadOrderHistory();
  const pdfRes = await api("/api/receipt/pdf", { method: "POST", body: JSON.stringify({ order: created.order }) });
  byId("download-pdf-btn").onclick = () => window.open(pdfRes.fileUrl, "_blank");
}

async function login() {
  const email = byId("login-email").value.trim();
  const password = byId("login-password").value.trim();
  byId("login-error").textContent = "";
  if (!validateEmail(email)) { byId("login-error").textContent = t().errors.invalidEmail; return; }
  if (!password) { byId("login-error").textContent = t().errors.passwordRequired; return; }
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    state.user = data.user;
    byId("topbar").classList.remove("hidden");
    renderProfile(state.user);
    const cartRows = await api(`/api/cart/${state.user.id}`);
    state.cart = {};
    cartRows.forEach((row) => { state.cart[row.item_id] = row.quantity; });
    showPage("menu-page");
    renderMenu();
    renderCart();
    await loadOrderHistory();
  } catch (err) {
    byId("login-error").textContent = err.message;
  }
}

async function register() {
  const fullName = byId("signup-name").value.trim();
  const email = byId("signup-email").value.trim();
  const password = byId("signup-password").value.trim();
  const confirmPassword = byId("signup-confirm").value.trim();
  byId("signup-error").textContent = "";
  byId("signup-success").textContent = "";
  if (!fullName || !email || !password || !confirmPassword) { byId("signup-error").textContent = t().errors.allFields; return; }
  if (!validateEmail(email)) { byId("signup-error").textContent = t().errors.invalidEmail; return; }
  if (password !== confirmPassword) { byId("signup-error").textContent = t().errors.passwordsNoMatch; return; }
  try {
    await api("/api/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password, confirmPassword }) });
    byId("signup-success").textContent = t().registerSuccess;
    setTimeout(() => {
      byId("go-login").click();
      byId("login-email").value = email;
      byId("login-password").value = password;
    }, 900);
  } catch (err) {
    byId("signup-error").textContent = err.message;
  }
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("lang", lang);
  byId("lang-select").value = lang;
  byId("lang-select-auth").value = lang;
  applyStaticTexts();
  renderCategories();
  renderMenu();
  renderCart();
  if (state.user) loadOrderHistory();
}

function setupAuthSwitching() {
  byId("go-signup").onclick = () => { byId("login-view").classList.add("hidden"); byId("signup-view").classList.remove("hidden"); };
  byId("go-login").onclick = () => { byId("signup-view").classList.add("hidden"); byId("login-view").classList.remove("hidden"); };
}

function setupButtons() {
  byId("login-btn").onclick = login;
  byId("signup-btn").onclick = register;
  byId("order-btn").onclick = placeOrder;
  byId("menu-btn").onclick = () => showPage("menu-page");
  byId("cart-btn").onclick = () => showPage("cart-page");
  byId("profile-btn").onclick = async () => { showPage("profile-page"); await loadOrderHistory(); };
  byId("logout-btn").onclick = () => {
    state.user = null;
    state.cart = {};
    byId("topbar").classList.add("hidden");
    showPage("auth-page");
  };
  byId("back-menu-btn").onclick = () => showPage("menu-page");
  byId("theme-toggle").onclick = () => {
    document.body.classList.toggle("dark");
    byId("theme-toggle").textContent = document.body.classList.contains("dark") ? t().themeLight : t().themeDark;
  };
  byId("search-input").addEventListener("input", (e) => { state.search = e.target.value; renderMenu(); });
  byId("test-login-fill").onclick = () => { byId("login-email").value = "test@lumiere.com"; byId("login-password").value = "test123"; };
  byId("test-register-fill").onclick = () => {
    const stamp = Date.now().toString().slice(-5);
    byId("signup-name").value = `Test Register ${stamp}`;
    byId("signup-email").value = `test.register.${stamp}@lumiere.com`;
    byId("signup-password").value = "test123";
    byId("signup-confirm").value = "test123";
  };
  byId("lang-select").addEventListener("change", (e) => setLanguage(e.target.value));
  byId("lang-select-auth").addEventListener("change", (e) => setLanguage(e.target.value));
}

async function init() {
  state.menu = await api("/api/menu");
  const savedLang = localStorage.getItem("lang") || "en";
  state.lang = savedLang === "tr" ? "tr" : "en";
  byId("lang-select").value = state.lang;
  byId("lang-select-auth").value = state.lang;
  setupAuthSwitching();
  setupButtons();
  applyStaticTexts();
  renderCategories();
  renderMenu();
  renderCart();
}

init();
