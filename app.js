const STORAGE_KEY = "vmCollection.items.v3";
const PROFILE_STORAGE_KEY = "vmCollection.profile.v1";
const LEGACY_KEYS = ["vmCollection.items.v2", "vmCollection.items.v1"];
let items = [];
let categories = [];
let profile = normalizeProfile();
let profileDraftPhoto = "";
let currentPhoto = "";
let currentVideo = "";
let currentItemAttachments = [];
let categoryDraftImage = "";
let categoryDraftAttachments = [];
let editingCategoryId = "";
let gridMode = "grid";
let deferredPrompt = null;

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
const emptyHtml = () => $("emptyTemplate").innerHTML;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function iconSvg(type) {
  const c = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    box: `<svg viewBox="0 0 24 24"><path ${c} d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5-8-4.5"/></svg>`,
    heart: `<svg viewBox="0 0 24 24"><path ${c} d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/></svg>`,
    diamond: `<svg viewBox="0 0 24 24"><path ${c} d="M8 4h8l5 6-9 10L3 10l5-6Zm-5 6h18M10 4 7 10l5 10m2-16 3 6-5 10"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path ${c} d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/></svg>`,
    grid: `<svg viewBox="0 0 24 24"><rect ${c} x="3" y="3" width="7" height="7" rx="1.5"/><rect ${c} x="14" y="3" width="7" height="7" rx="1.5"/><rect ${c} x="3" y="14" width="7" height="7" rx="1.5"/><rect ${c} x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24"><path ${c} d="M4 6h8m5 0h3M4 12h3m5 0h8M4 18h9m5 0h2"/><circle ${c} cx="15" cy="6" r="2"/><circle ${c} cx="9" cy="12" r="2"/><circle ${c} cx="16" cy="18" r="2"/></svg>`,
    bars: `<svg viewBox="0 0 24 24"><path ${c} d="M4 20V11h4v9m4 0V7h4v13m4 0V3h3v17M2 20h21"/></svg>`,
    trend: `<svg viewBox="0 0 24 24"><path ${c} d="M4 17 10 11l4 4 6-8"/><path ${c} d="M17 7h3v3"/></svg>`,
    camera: `<svg viewBox="0 0 24 24"><path ${c} d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>`,
    profile: `<svg viewBox="0 0 24 24"><circle ${c} cx="12" cy="8" r="4"/><path ${c} d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    shield: `<svg viewBox="0 0 24 24"><path ${c} d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path ${c} d="m9 12 2 2 4-5"/></svg>`,
    phone: `<svg viewBox="0 0 24 24"><rect ${c} x="6" y="2" width="12" height="20" rx="3"/><path ${c} d="M10 18h4"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><circle ${c} cx="9" cy="8" r="3"/><circle ${c} cx="17" cy="9" r="2.5"/><path ${c} d="M3 20a6 6 0 0 1 12 0m0-4a5 5 0 0 1 6 4"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect ${c} x="3" y="5" width="18" height="16" rx="2"/><path ${c} d="M7 3v4m10-4v4M3 10h18"/></svg>`
  };
  return icons[type] || "";
}

function setStaticIcons() {
  const map = {
    quickCat: "grid", quickFilter: "sliders", quickReport: "bars", quickStats: "trend",
    bannerCatalogIcon: "grid", bannerAddIcon: "camera", bannerCategoryIcon: "box", bannerReportIcon: "bars", bannerStatsIcon: "trend",
    reportIconCategory: "grid", reportIconBrand: "box", reportIconYear: "calendar", reportIconRare: "diamond",
    backupSettingIcon: "shield", installSettingIcon: "phone", shareSettingIcon: "users"
  };
  Object.entries(map).forEach(([id, type]) => { if ($(id)) $(id).innerHTML = iconSvg(type); });
}

function normalizeProfile(raw = {}) {
  return {
    name: String(raw.name || ""),
    birthDate: String(raw.birthDate || ""),
    bio: String(raw.bio || ""),
    photo: String(raw.photo || ""),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function normalizeAttachment(raw = {}) {
  return {
    id: raw.id || uid(),
    name: String(raw.name || "arquivo"),
    type: String(raw.type || "application/octet-stream"),
    size: Number(raw.size || 0),
    addedAt: raw.addedAt || new Date().toISOString(),
    dataUrl: String(raw.dataUrl || "")
  };
}

function normalizeItem(raw = {}) {
  return {
    id: raw.id || uid(), name: raw.name || "", category: raw.category || "", subcategory: raw.subcategory || "",
    brand: raw.brand || "", model: raw.model || "", scale: raw.scale || "", year: raw.year || "",
    condition: raw.condition || "", paidValue: Number(raw.paidValue || 0), estimatedValue: Number(raw.estimatedValue || 0),
    acquiredAt: raw.acquiredAt || "", acquiredPlace: raw.acquiredPlace || "", serial: raw.serial || "", tags: raw.tags || "",
    description: raw.description || "", notes: raw.notes || "", favorite: !!raw.favorite, desired: !!raw.desired, rare: !!raw.rare,
    photo: String(raw.photo || ""), video: String(raw.video || ""),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment) : [],
    updatedAt: raw.updatedAt || new Date().toISOString(), createdAt: raw.createdAt || new Date().toISOString()
  };
}

function categoryIdFromName(name) {
  let hash = 0;
  const text = String(name || "categoria").trim().toLowerCase();
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return `cat-${Math.abs(hash)}`;
}

function normalizeCategory(raw = {}) {
  const name = String(raw.name || "").trim();
  return {
    id: raw.id || categoryIdFromName(name),
    name,
    image: String(raw.image || ""),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment) : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

async function loadItems() {
  const migrationDone = await VMStorage.getSetting("legacyItemsMigrated");
  const stored = await VMStorage.getAll("items");
  if (stored.length || migrationDone) {
    items = stored.map(normalizeItem);
    return;
  }
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    for (const key of LEGACY_KEYS) {
      raw = localStorage.getItem(key);
      if (raw) break;
    }
  }
  try { items = (JSON.parse(raw || "[]") || []).map(normalizeItem); }
  catch { items = []; }
  await VMStorage.replaceAll("items", items);
  await VMStorage.setSetting("legacyItemsMigrated", true);
}

async function loadProfile() {
  const stored = await VMStorage.getSetting("profile");
  if (stored) profile = normalizeProfile(stored);
  else {
    try { profile = normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}")); }
    catch { profile = normalizeProfile(); }
    await VMStorage.setSetting("profile", profile);
  }
  profileDraftPhoto = profile.photo || "";
}

async function loadCategories() {
  categories = (await VMStorage.getAll("categories")).map(normalizeCategory);
  await ensureCategories(false);
}

async function ensureCategories(persist = true) {
  const names = [...new Set(items.map((i) => String(i.category || "").trim()).filter(Boolean))];
  let changed = false;
  for (const name of names) {
    if (!categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      categories.push(normalizeCategory({ name }));
      changed = true;
    }
  }
  categories.sort((a, b) => a.name.localeCompare(b.name));
  if (persist && changed) await VMStorage.replaceAll("categories", categories);
}

async function saveItems() {
  try {
    await ensureCategories(false);
    await VMStorage.replaceAll("items", items.map(normalizeItem));
    await VMStorage.replaceAll("categories", categories.map(normalizeCategory));
    renderAll();
  } catch (error) {
    console.error(error);
    alert("Não foi possível salvar no dispositivo. Verifique o espaço disponível e tente novamente.");
    throw error;
  }
}

async function saveProfile() {
  try {
    await VMStorage.setSetting("profile", normalizeProfile(profile));
    renderProfile();
  } catch (error) {
    console.error(error);
    alert("Não foi possível salvar o perfil no dispositivo.");
    throw error;
  }
}

function updateProfilePhotoPreview() {
  const src = profileDraftPhoto || "assets/icon-192.png";
  if ($("profilePhotoPreview")) $("profilePhotoPreview").src = src;
}

function renderProfile() {
  const data = normalizeProfile(profile);
  if ($("profileName")) $("profileName").value = data.name || "";
  if ($("profileBirthDate")) $("profileBirthDate").value = data.birthDate || "";
  if ($("profileBio")) $("profileBio").value = data.bio || "";
  profileDraftPhoto = data.photo || "";
  updateProfilePhotoPreview();

  const photo = profileDraftPhoto || "assets/icon-192.png";
  const displayName = data.name?.trim() || "Seu nome";
  const displayBio = data.bio?.trim() || "Adicione uma breve descrição sobre você.";

  if ($("homeProfileImage")) $("homeProfileImage").src = photo;
  if ($("heroProfileImage")) $("heroProfileImage").src = photo;
  if ($("profileOverviewImage")) $("profileOverviewImage").src = photo;
  if ($("heroProfileName")) $("heroProfileName").textContent = displayName;
  if ($("profileOverviewName")) $("profileOverviewName").textContent = displayName;
  if ($("profileOverviewBio")) $("profileOverviewBio").textContent = displayBio;
}

function getCategories() {
  const names = new Set(categories.map((c) => c.name).filter(Boolean));
  items.forEach((item) => { if (item.category) names.add(item.category); });
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getCategoryRecordByName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  return categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase()) || normalizeCategory({ name: trimmed });
}

function getCategoryOptionEntries() {
  return getCategories().map((name) => {
    const category = getCategoryRecordByName(name);
    return { id: category.id, name: category.name };
  });
}

function getCategoryNameById(categoryId) {
  if (!categoryId) return "";
  const stored = categories.find((c) => c.id === categoryId);
  if (stored) return stored.name;
  for (const name of getCategories()) {
    if (getCategoryRecordByName(name).id === categoryId) return name;
  }
  return "";
}

function itemBelongsToCategory(item, categoryId) {
  if (!categoryId) return true;
  const record = getCategoryRecordByName(item.category);
  if (!record) return categoryIdFromName(item.category) === categoryId;
  return record.id === categoryId;
}

const PT_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function parseSortableDate(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function itemHasEstimatedValue(item) {
  const value = item?.estimatedValue;
  return value !== null && value !== undefined && String(value).trim() !== "" && !Number.isNaN(Number(value));
}

function compareCatalogNames(a, b, direction = 1) {
  const nameA = String(a || "").trim();
  const nameB = String(b || "").trim();
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;
  return direction * PT_COLLATOR.compare(nameA, nameB);
}

function compareCatalogPrices(a, b, ascending) {
  const hasA = itemHasEstimatedValue(a);
  const hasB = itemHasEstimatedValue(b);
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;
  const valA = Number(a.estimatedValue);
  const valB = Number(b.estimatedValue);
  return ascending ? valA - valB : valB - valA;
}

function compareCatalogDates(a, b, field, ascending) {
  const timeA = parseSortableDate(a[field]);
  const timeB = parseSortableDate(b[field]);
  if (timeA === null && timeB === null) return 0;
  if (timeA === null) return 1;
  if (timeB === null) return -1;
  return ascending ? timeA - timeB : timeB - timeA;
}

function sortCatalogItems(list, sortKey) {
  const sorted = [...list];
  const key = sortKey === "name" ? "name-asc" : sortKey === "value" ? "value-desc" : sortKey;
  sorted.sort((a, b) => {
    switch (key) {
      case "name-asc": return compareCatalogNames(a.name, b.name, 1);
      case "name-desc": return compareCatalogNames(a.name, b.name, -1);
      case "value-asc": return compareCatalogPrices(a, b, true);
      case "value-desc": return compareCatalogPrices(a, b, false);
      case "acquired-desc": return compareCatalogDates(a, b, "acquiredAt", false);
      case "acquired-asc": return compareCatalogDates(a, b, "acquiredAt", true);
      case "created-asc": return compareCatalogDates(a, b, "createdAt", true);
      case "category": return compareCatalogNames(a.category, b.category, 1);
      case "newest":
      default: return compareCatalogDates(a, b, "createdAt", false);
    }
  });
  return sorted;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToStoredAttachment(file) {
  return normalizeAttachment({
    id: uid(),
    name: file.name || `arquivo-${Date.now()}`,
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    addedAt: new Date().toISOString(),
    dataUrl: await fileToDataUrl(file)
  });
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAttachmentRows(list, ownerType = "draft", ownerId = "") {
  if (!list?.length) return '<div class="attachment-empty">Nenhum arquivo anexado.</div>';
  return list.map((file) => `<div class="attachment-row"><div class="attachment-file-icon">${file.type.includes("pdf") ? "PDF" : file.type.startsWith("image/") ? "IMG" : "DOC"}</div><div class="attachment-file-copy"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.type)} · ${formatFileSize(file.size)} · ${new Date(file.addedAt).toLocaleDateString("pt-BR")}</small></div><div class="attachment-actions"><button type="button" onclick="openStoredAttachment('${ownerType}','${ownerId}','${file.id}')">Visualizar</button><button type="button" onclick="downloadStoredAttachment('${ownerType}','${ownerId}','${file.id}')">Baixar</button>${ownerType === "itemDraft" ? `<button type="button" class="remove-file" onclick="removeItemDraftAttachment('${file.id}')">Remover</button>` : ownerType === "categoryDraft" ? `<button type="button" class="remove-file" onclick="removeCategoryDraftAttachment('${file.id}')">Remover</button>` : ""}</div></div>`).join("");
}

function renderItemAttachmentList() {
  if ($("itemAttachmentList")) $("itemAttachmentList").innerHTML = renderAttachmentRows(currentItemAttachments, "itemDraft", "");
}

function renderCategoryAttachmentList() {
  if ($("categoryAttachmentList")) $("categoryAttachmentList").innerHTML = renderAttachmentRows(categoryDraftAttachments, "categoryDraft", "");
}

function findStoredAttachment(ownerType, ownerId, attachmentId) {
  if (ownerType === "itemDraft") return currentItemAttachments.find((f) => f.id === attachmentId);
  if (ownerType === "categoryDraft") return categoryDraftAttachments.find((f) => f.id === attachmentId);
  if (ownerType === "item") return items.find((i) => i.id === ownerId)?.attachments?.find((f) => f.id === attachmentId);
  if (ownerType === "category") return categories.find((c) => c.id === ownerId)?.attachments?.find((f) => f.id === attachmentId);
  return null;
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl || "").split(",");
  if (!header || payload === undefined) throw new Error("Conteúdo do arquivo inválido.");
  const mime = header.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function openStoredAttachment(ownerType, ownerId, attachmentId) {
  const file = findStoredAttachment(ownerType, ownerId, attachmentId);
  if (!file?.dataUrl) return alert("O arquivo está ausente ou corrompido.");
  try {
    const url = URL.createObjectURL(dataUrlToBlob(file.dataUrl));
    const opened = window.open(url, "_blank");
    if (!opened) downloadStoredAttachment(ownerType, ownerId, attachmentId);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { alert("Não foi possível visualizar este arquivo."); }
}

function downloadStoredAttachment(ownerType, ownerId, attachmentId) {
  const file = findStoredAttachment(ownerType, ownerId, attachmentId);
  if (!file?.dataUrl) return alert("O arquivo está ausente ou corrompido.");
  try {
    const url = URL.createObjectURL(dataUrlToBlob(file.dataUrl));
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "arquivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch { alert("Não foi possível baixar este arquivo."); }
}

function removeItemDraftAttachment(id) {
  currentItemAttachments = currentItemAttachments.filter((file) => file.id !== id);
  renderItemAttachmentList();
}

function removeCategoryDraftAttachment(id) {
  categoryDraftAttachments = categoryDraftAttachments.filter((file) => file.id !== id);
  renderCategoryAttachmentList();
}

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.go === id));
  if (id === "reportsView") renderReports();
  if (id === "statsView") renderStatsDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function itemBadges(item) {
  const parts = [];
  if (item.favorite) parts.push('<span class="badge">Favorito</span>');
  if (item.desired) parts.push('<span class="badge">Desejado</span>');
  if (item.rare) parts.push('<span class="badge">Raro</span>');
  return parts.length ? `<div class="badges">${parts.join("")}</div>` : "";
}

function itemCard(item) {
  const img = item.photo ? `<img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span>` : "<span>Sem foto</span>";
  return `<article class="item-card" onclick="openDetail('${item.id}')"><div class="item-photo">${img}${itemBadges(item)}</div><div class="item-body"><h4>${escapeHtml(item.name || "Item sem nome")}</h4><div class="meta-line"><span>${escapeHtml(item.category || "Sem categoria")}</span><span>${money(item.estimatedValue)}</span></div><div class="meta-line"><span>${escapeHtml(item.year || item.model || "")}</span><span>${escapeHtml(item.scale || item.condition || "")}</span></div></div></article>`;
}

function recentCard(item) {
  const img = item.photo ? `<img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span>` : "<span>Sem foto</span>";
  const sub = [item.year, item.scale || item.category].filter(Boolean).join(" • ");
  return `<article class="recent-card" onclick="openDetail('${item.id}')"><div class="recent-photo">${img}</div><div class="recent-body"><h4>${escapeHtml(item.name || "Item sem nome")}</h4><p>${escapeHtml(sub || item.category || "Sem categoria")}</p></div></article>`;
}

function getCategoryGroups() {
  return getCategoryOptionEntries().map(({ id, name }) => {
    const category = getCategoryRecordByName(name);
    const count = items.filter((i) => itemBelongsToCategory(i, id)).length;
    return { id, cat: name, category, count };
  }).sort((a, b) => a.cat.localeCompare(b.cat, "pt-BR"));
}

function homeCategoryCard({ id, cat, category, count }) {
  const initials = cat.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  const media = category.image
    ? `<div class="home-category-cover"><img src="${category.image}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="home-category-placeholder" hidden>${escapeHtml(initials || "VM")}</div></div>`
    : `<div class="home-category-cover"><div class="home-category-placeholder">${escapeHtml(initials || "VM")}</div></div>`;
  return `<button type="button" class="home-category-card" data-category-id="${escapeHtml(id)}" aria-label="Abrir catálogo de ${escapeHtml(cat)}">${media}<div class="home-category-body"><h4>${escapeHtml(cat)}</h4><span>${count} item(ns)</span></div></button>`;
}

function homeCategoriesEmptyHtml() {
  return `<div class="empty home-categories-empty"><span class="empty-symbol">◇</span><strong>Nenhuma categoria cadastrada.</strong><p>Cadastre categorias ao adicionar itens ou pela área de Categorias.</p><button class="secondary-btn home-categories-empty-btn" type="button" data-go="categoriesView">Ir para Categorias</button></div>`;
}

function openCatalogForCategory(categoryId) {
  if (!categoryId) return;
  $("categoryFilter").value = categoryId;
  showView("catalogView");
  renderCatalog();
}

function renderHome() {
  const grouped = getCategoryGroups();
  const box = $("homeCategoryCards");
  if (box) box.innerHTML = grouped.length ? grouped.map(homeCategoryCard).join("") : homeCategoriesEmptyHtml();
  const recent = [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 8);
  $("recentItems").innerHTML = recent.length ? recent.map(recentCard).join("") : emptyHtml();
}

function filterItems() {
  const search = $("searchInput").value.trim().toLowerCase();
  const categoryId = $("categoryFilter").value;
  const brand = $("brandFilter").value.trim().toLowerCase();
  const year = $("yearFilter").value.trim().toLowerCase();
  const model = $("modelFilter").value.trim().toLowerCase();
  const scale = $("scaleFilter").value.trim().toLowerCase();
  const rarity = $("rarityFilter").value;
  const favorite = $("favoriteFilter").value;
  const desired = $("desiredFilter").value;
  return items.filter((item) => {
    const itemName = String(item.name || "").toLowerCase();
    return (!search || itemName.includes(search)) && itemBelongsToCategory(item, categoryId) && (!brand || item.brand.toLowerCase().includes(brand)) && (!year || item.year.toLowerCase().includes(year)) && (!model || item.model.toLowerCase().includes(model)) && (!scale || item.scale.toLowerCase().includes(scale)) && (rarity !== "rare" || item.rare) && (rarity !== "not-rare" || !item.rare) && (favorite !== "favorite" || item.favorite) && (desired !== "desired" || item.desired) && (desired !== "possessed" || !item.desired);
  });
}

function getCatalogSelection() {
  return sortCatalogItems(filterItems(), $("sortSelect").value);
}

function updateCatalogCategoryBadge() {
  const badge = $("catalogCategoryActive");
  const label = $("catalogCategoryActiveName");
  if (!badge || !label) return;
  const categoryId = $("categoryFilter")?.value || "";
  if (!categoryId) {
    badge.hidden = true;
    return;
  }
  label.textContent = getCategoryNameById(categoryId) || "Categoria";
  badge.hidden = false;
}

function renderCatalog() {
  const filtered = getCatalogSelection();
  const box = $("catalogItems");
  box.className = `cards-grid ${gridMode === "list" ? "item-list" : ""}`;
  box.innerHTML = filtered.length ? filtered.map(itemCard).join("") : emptyHtml();
  $("selectionCount").textContent = filtered.length;
  $("selectionValue").textContent = money(filtered.reduce((sum, i) => sum + Number(i.estimatedValue || 0), 0));
  updateCatalogCategoryBadge();
}

function renderCategories() {
  const grouped = getCategoryGroups().sort((a, b) => b.count - a.count);
  const cats = grouped.map((g) => g.cat);
  $("categoriesTotal").textContent = cats.length;
  const top = grouped[0];
  $("topCategoryName").textContent = top?.cat || "—";
  $("topCategoryCount").textContent = top ? `${top.count} item(ns)` : "Sem dados";
  $("categoryCards").innerHTML = grouped.length ? grouped.map(({ id, cat, category, count: groupLength }) => {
    const group = items.filter((i) => itemBelongsToCategory(i, id));
    const total = group.reduce((sum, i) => sum + Number(i.estimatedValue || 0), 0);
    const initials = cat.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
    const media = category.image
      ? `<div class="category-cover"><img src="${category.image}" alt="Imagem da categoria ${escapeHtml(cat)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="category-cover-placeholder" hidden>${escapeHtml(initials || "VM")}</div></div>`
      : `<div class="category-cover"><div class="category-cover-placeholder">${escapeHtml(initials || "VM")}</div></div>`;
    return `<article class="category-card">${media}<div class="category-card-content"><div class="category-title-row"><span class="category-symbol">${escapeHtml(initials || "VM")}</span><h4>${escapeHtml(cat)}</h4></div><div class="category-meta"><div><span>Quantidade</span><strong>${groupLength} item(ns)</strong></div><div><span>Valor estimado</span><strong>${money(total)}</strong></div></div><div class="category-file-summary"><span>${category.attachments.length} arquivo(s) salvo(s)</span><button type="button" onclick="openCategoryEditor('${category.id}')">Gerenciar mídia</button></div></div></article>`;
  }).join("") : emptyHtml();
}

function openCategoryEditor(id) {
  const category = categories.find((c) => c.id === id);
  if (!category) return;
  editingCategoryId = category.id;
  categoryDraftImage = category.image || "";
  categoryDraftAttachments = (category.attachments || []).map(normalizeAttachment);
  $("categoryEditingId").value = category.id;
  $("categoryDialogTitle").textContent = category.name;
  renderCategoryImagePreview();
  renderCategoryAttachmentList();
  $("categoryDialog").showModal();
}

function renderCategoryImagePreview() {
  if (!$("categoryImagePreview")) return;
  $("categoryImagePreview").innerHTML = categoryDraftImage
    ? `<img src="${categoryDraftImage}" alt="Imagem da categoria" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span>`
    : '<span>Sem imagem</span>';
}

async function saveCategoryMedia() {
  const index = categories.findIndex((c) => c.id === editingCategoryId);
  if (index < 0) return;
  categories[index] = normalizeCategory({
    ...categories[index],
    image: categoryDraftImage,
    attachments: categoryDraftAttachments,
    updatedAt: new Date().toISOString()
  });
  await VMStorage.replaceAll("categories", categories);
  renderCategories();
  $("categoryDialog").close();
}

function reportBlockFromMap(mapObj) {
  const entries = Object.entries(mapObj).filter(([key, value]) => key && value.count > 0).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  if (!entries.length) return '<div class="empty"><span class="empty-symbol">◇</span><strong>Sem dados suficientes.</strong><p>Cadastre mais itens para gerar este relatório.</p></div>';
  return `<div class="report-list">${entries.map(([key, value]) => `<div class="report-row"><div><strong>${escapeHtml(key)}</strong><small>${value.count} item(ns)</small></div><div><strong>${money(value.value)}</strong></div></div>`).join("")}</div>`;
}

function renderReports() {
  const byCategory = {}, byBrand = {}, byYear = {}, byRare = { "Raros": { count: 0, value: 0 }, "Não raros": { count: 0, value: 0 } };
  items.forEach((item) => {
    const value = Number(item.estimatedValue || 0);
    for (const [key, bucket] of [[item.category, byCategory], [item.brand, byBrand], [item.year, byYear]]) {
      if (key) { bucket[key] = bucket[key] || { count: 0, value: 0 }; bucket[key].count += 1; bucket[key].value += value; }
    }
    const rareKey = item.rare ? "Raros" : "Não raros";
    byRare[rareKey].count += 1; byRare[rareKey].value += value;
  });
  $("reportTotalItems").textContent = items.length;
  $("reportTotalCategories").textContent = getCategories().length;
  $("reportRareCount").textContent = items.filter((i) => i.rare).length;
  $("reportCategory").innerHTML = reportBlockFromMap(byCategory);
  $("reportBrand").innerHTML = reportBlockFromMap(byBrand);
  $("reportYear").innerHTML = reportBlockFromMap(byYear);
  $("reportRare").innerHTML = reportBlockFromMap(byRare);
}

function monthLabel(date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/");
}

function renderStatsDashboard() {
  $("dashTotalItems").textContent = items.length;
  const categoryCounts = {};
  items.forEach((i) => { if (i.category) categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1; });
  const top = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  $("dashTopCategory").textContent = top ? `${top[0]} (${top[1]})` : "—";
  $("dashFavorites").textContent = items.filter((i) => i.favorite).length;
  $("dashRares").textContent = items.filter((i) => i.rare).length;

  const months = {};
  items.forEach((item) => {
    const date = new Date(item.createdAt || Date.now());
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months[sortKey] = { label: monthLabel(date), count: (months[sortKey]?.count || 0) + 1 };
  });
  const entries = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  const max = Math.max(1, ...entries.map(([, value]) => value.count));
  $("growthChart").innerHTML = entries.length ? entries.map(([, value]) => `<div class="chart-column"><div class="chart-bar" style="height:${Math.max(8, (value.count / max) * 170)}px"><span>${value.count}</span></div><div class="chart-label">${escapeHtml(value.label)}</div></div>`).join("") : '<div class="empty"><strong>Sem histórico ainda.</strong><p>Os cadastros aparecerão aqui.</p></div>';
  $("growthList").innerHTML = entries.length ? entries.map(([, value]) => `<div class="report-row"><div><strong>${escapeHtml(value.label)}</strong><small>Cadastros no período</small></div><div><strong>${value.count}</strong></div></div>`).join("") : "";

  const topBrand = Object.entries(items.reduce((acc, item) => { if (item.brand) acc[item.brand] = (acc[item.brand] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0];
  const desired = items.filter((i) => i.desired).length;
  const insights = [
    ["Categoria mais utilizada", top ? `${top[0]} · ${top[1]} item(ns)` : "Sem dados"],
    ["Fabricante mais cadastrado", topBrand ? `${topBrand[0]} · ${topBrand[1]} item(ns)` : "Sem dados"],
    ["Lista de desejos", `${desired} item(ns)`],
    ["Proporção de raros", items.length ? `${Math.round(items.filter((i) => i.rare).length / items.length * 100)}% da coleção` : "Sem dados"]
  ];
  $("insightList").innerHTML = insights.map(([label, value]) => `<div class="insight-item"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function updateCategoryControls() {
  const entries = getCategoryOptionEntries();
  const current = $("categoryFilter").value;
  $("categoryFilter").innerHTML = '<option value="">Todas as categorias</option>' + entries.map(({ id, name }) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("");
  const validIds = new Set(entries.map((entry) => entry.id));
  const legacyNameMatch = entries.find((entry) => entry.name === current)?.id || "";
  $("categoryFilter").value = validIds.has(current) ? current : legacyNameMatch;
  $("categoryList").innerHTML = entries.map(({ name }) => `<option value="${escapeHtml(name)}">`).join("");
}

function renderAll() {
  updateCategoryControls();
  renderHome();
  renderCatalog();
  renderCategories();
  renderReports();
  renderStatsDashboard();
}

function setPreview() {
  $("photoPreview").innerHTML = currentPhoto ? `<img src="${currentPhoto}" alt="Foto principal">` : '<div class="preview-placeholder"><span class="camera-placeholder">⌾</span><strong>Foto principal</strong><small>Use a câmera ou escolha uma imagem</small></div>';
  $("videoPreview").innerHTML = currentVideo ? `<video src="${currentVideo}" controls playsinline></video>` : "";
}

function clearForm() {
  $("itemForm").reset();
  $("editingId").value = "";
  currentPhoto = "";
  currentVideo = "";
  currentItemAttachments = [];
  $("formTitle").textContent = "Adicionar item";
  $("cancelEditBtn").hidden = true;
  setPreview();
  renderItemAttachmentList();
}

function readForm() {
  const existing = items.find((i) => i.id === $("editingId").value);
  return normalizeItem({
    id: $("editingId").value || uid(), name: $("name").value.trim(), category: $("category").value.trim(), subcategory: $("subcategory").value.trim(),
    brand: $("brand").value.trim(), model: $("model").value.trim(), scale: $("scale").value.trim(), year: $("year").value.trim(), condition: $("condition").value,
    paidValue: $("paidValue").value, estimatedValue: $("estimatedValue").value, acquiredAt: $("acquiredAt").value, acquiredPlace: $("acquiredPlace").value.trim(),
    serial: $("serial").value.trim(), tags: $("tags").value.trim(), description: $("description").value.trim(), notes: $("notes").value.trim(),
    favorite: $("favorite").checked, desired: $("desired").checked, rare: $("rare").checked, photo: currentPhoto, video: currentVideo,
    attachments: currentItemAttachments.map(normalizeAttachment),
    updatedAt: new Date().toISOString(), createdAt: existing?.createdAt || new Date().toISOString()
  });
}

function fillForm(item) {
  ["name", "category", "subcategory", "brand", "model", "scale", "year", "condition", "paidValue", "estimatedValue", "acquiredAt", "acquiredPlace", "serial", "tags", "description", "notes"].forEach((id) => { $(id).value = item[id] || ""; });
  $("editingId").value = item.id;
  $("favorite").checked = !!item.favorite; $("desired").checked = !!item.desired; $("rare").checked = !!item.rare;
  currentPhoto = item.photo || "";
  currentVideo = item.video || "";
  currentItemAttachments = (item.attachments || []).map(normalizeAttachment);
  $("formTitle").textContent = "Editar item";
  $("cancelEditBtn").hidden = false;
  setPreview();
  renderItemAttachmentList();
  showView("addView");
}

function openDetail(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const media = item.photo ? `<div class="detail-media"><img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="detail-placeholder" hidden>Imagem indisponível</div>${itemBadges(item)}</div>` : '<div class="detail-media"><div class="detail-placeholder">Sem foto</div></div>';
  const markers = [item.favorite ? "Favorito" : "", item.desired ? "Desejado" : "", item.rare ? "Raro" : ""].filter(Boolean).join(" • ");
  const files = item.attachments?.length ? `<section class="detail-attachments"><h3>Arquivos anexados</h3>${renderAttachmentRows(item.attachments, "item", item.id)}</section>` : "";
  $("detailContent").innerHTML = `<article class="detail-card"><div class="detail-hero">${media}<div class="detail-info"><span class="eyebrow">${escapeHtml(item.category || "Coleção")}</span><h2>${escapeHtml(item.name || "Item sem nome")}</h2><p class="detail-description">${escapeHtml(item.description || "Sem descrição cadastrada.")}</p>${item.video ? `<video class="detail-video" src="${item.video}" controls playsinline></video>` : ""}<div class="detail-table"><div><span>Subcategoria</span>${escapeHtml(item.subcategory || "—")}</div><div><span>Marca / origem</span>${escapeHtml(item.brand || "—")}</div><div><span>Modelo</span>${escapeHtml(item.model || "—")}</div><div><span>Escala</span>${escapeHtml(item.scale || "—")}</div><div><span>Ano</span>${escapeHtml(item.year || "—")}</div><div><span>Estado</span>${escapeHtml(item.condition || "—")}</div><div><span>Valor pago</span>${money(item.paidValue)}</div><div><span>Valor estimado</span>${money(item.estimatedValue)}</div><div><span>Data de aquisição</span>${escapeHtml(item.acquiredAt || "—")}</div><div><span>Local</span>${escapeHtml(item.acquiredPlace || "—")}</div><div><span>Série / código</span>${escapeHtml(item.serial || "—")}</div><div><span>Marcadores</span>${escapeHtml(markers || "—")}</div></div>${files}<p><strong>Observações:</strong> ${escapeHtml(item.notes || "—")}</p><p><small>Criado em ${new Date(item.createdAt).toLocaleString("pt-BR")} · Atualizado em ${new Date(item.updatedAt).toLocaleString("pt-BR")}</small></p><div class="detail-actions"><button class="primary-btn" onclick="editItem('${item.id}')">Editar</button><button class="secondary-btn" onclick="shareItem('${item.id}')">Compartilhar</button><button class="secondary-btn" onclick="printItem('${item.id}')">Gerar ficha/PDF</button><button class="ghost-btn danger-btn" onclick="deleteItem('${item.id}')">Excluir</button></div></div></div></article>`;
  showView("detailView");
}

function editItem(id) { const item = items.find((i) => i.id === id); if (item) fillForm(item); }
async function deleteItem(id) {
  if (!confirm("Excluir este item da coleção?")) return;
  items = items.filter((i) => i.id !== id);
  await saveItems();
  showView("catalogView");
}
function shareItem(id) {
  const item = items.find((i) => i.id === id); if (!item) return;
  const text = `VM Collection\n${item.name}\nCategoria: ${item.category || "—"}\nValor estimado: ${money(item.estimatedValue)}`;
  if (navigator.share) navigator.share({ title: item.name, text }).catch(() => {}); else { navigator.clipboard?.writeText(text); alert("Resumo copiado para a área de transferência."); }
}
function printItem(id) { openDetail(id); setTimeout(() => window.print(), 250); }

function buildCatalogPdfDocument(selectedItems) {
  const selectedCategory = getCategoryNameById($("categoryFilter").value) || "Todas as categorias";
  const personName = profile.name || "Seu nome";
  const profilePhoto = profile.photo || document.querySelector(".brand-logo")?.src || "";
  const appLogo = document.querySelector(".brand-logo")?.src || "";
  const generatedAt = new Date().toLocaleDateString("pt-BR");
  const selectionLabel = $("desiredFilter").selectedOptions?.[0]?.textContent || "Possuídos e desejados";
  const sortLabel = $("sortSelect").selectedOptions?.[0]?.textContent || "Mais recentes";

  const rows = selectedItems.map((item, index) => {
    const image = item.photo
      ? `<img src="${item.photo}" alt="${escapeHtml(item.name)}">`
      : `<div class="item-no-image">VM</div>`;
    const markers = [item.favorite ? "Favorito" : "", item.desired ? "Desejado" : "Possuído", item.rare ? "Raro" : ""].filter(Boolean).join(" • ");
    const primaryMeta = [item.category, item.year, item.scale].filter(Boolean).map(escapeHtml).join(" • ") || "Sem categoria";
    const secondaryMeta = [item.brand, item.model].filter(Boolean).map(escapeHtml).join(" • ");
    return `
      <article class="catalog-row">
        <div class="row-number">${String(index + 1).padStart(2, "0")}</div>
        <div class="row-photo">${image}</div>
        <div class="row-content">
          <h3>${escapeHtml(item.name || "Item sem nome")}</h3>
          <p class="primary-meta">${primaryMeta}</p>
          ${secondaryMeta ? `<p class="secondary-meta">${secondaryMeta}</p>` : ""}
          ${markers ? `<p class="markers">${escapeHtml(markers)}</p>` : ""}
        </div>
        <div class="row-value">
          <span>Valor estimado</span>
          <strong>${money(item.estimatedValue)}</strong>
        </div>
      </article>`;
  }).join("");

  return `<!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Catálogo VM Collection - ${escapeHtml(selectedCategory)}</title>
    <style>
      @page{size:A4;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;color:#11141b;font-family:Arial,Helvetica,sans-serif;background:#fff}
      .cover{width:210mm;height:297mm;padding:18mm 18mm 14mm;background:#f7f3ec;display:flex;flex-direction:column;position:relative;overflow:hidden;page-break-after:always}
      .cover:before{content:"";position:absolute;width:135mm;height:135mm;border:1.2px solid rgba(180,134,62,.35);border-radius:50%;right:-55mm;top:-45mm}
      .cover:after{content:"";position:absolute;width:90mm;height:90mm;border:1px solid rgba(180,134,62,.20);border-radius:50%;left:-35mm;bottom:-25mm}
      .cover-brand{display:flex;align-items:center;gap:9mm;position:relative;z-index:2}
      .cover-logo{width:35mm;height:35mm;border-radius:10mm;object-fit:cover;box-shadow:0 4mm 10mm rgba(7,17,31,.14)}
      .brand-title{font-family:Georgia,"Times New Roman",serif;line-height:.9;color:#07111f}
      .brand-title strong{display:block;font-size:27pt;letter-spacing:.02em}
      .brand-title span{display:block;font-size:17pt;letter-spacing:.05em;margin-top:3mm}
      .gold-rule{display:flex;align-items:center;gap:4mm;margin-top:4mm}.gold-rule i{display:block;height:.6mm;width:24mm;background:#d7bd8c}.gold-rule b{width:3mm;height:3mm;background:#b4863e;transform:rotate(45deg)}
      .cover-main{flex:1;display:grid;place-items:center;position:relative;z-index:2}
      .cover-card{width:100%;background:linear-gradient(135deg,#07111f,#17263d);color:white;border-radius:12mm;padding:18mm 14mm;text-align:center;box-shadow:0 7mm 18mm rgba(7,17,31,.18)}
      .cover-profile{width:42mm;height:42mm;border-radius:50%;padding:1.6mm;margin:0 auto 7mm;background:linear-gradient(135deg,#e6d4b3,#b4863e)}
      .cover-profile img{width:100%;height:100%;object-fit:cover;border-radius:50%;border:1.8mm solid #07111f;background:#fff}
      .cover-kicker{color:#d0a55f;font-size:9pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
      .cover-card h1{font-family:Georgia,"Times New Roman",serif;font-size:31pt;margin:5mm 0 3mm;line-height:1.05}
      .cover-person{font-size:15pt;font-weight:700;margin:0 0 8mm}
      .category-box{display:inline-block;border:1px solid rgba(208,165,95,.75);border-radius:999px;padding:3mm 8mm;color:#f5e7cd;font-size:11pt;font-weight:700}
      .cover-meta{margin-top:8mm;color:#d4d9e2;font-size:9pt;line-height:1.8}
      .cover-footer{text-align:center;position:relative;z-index:2;color:#8a7a64;font-family:Georgia,"Times New Roman",serif;font-size:9pt;letter-spacing:.08em}
      .catalog-pages{padding:15mm 14mm 16mm;background:#fff}
      .list-header{display:flex;align-items:center;justify-content:space-between;gap:10mm;border-bottom:1px solid #d8c7aa;padding-bottom:6mm;margin-bottom:6mm}
      .list-header-left{display:flex;align-items:center;gap:5mm}
      .list-header img{width:19mm;height:19mm;border-radius:6mm;object-fit:cover}
      .list-header h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:20pt;color:#07111f}
      .list-header p{margin:1.5mm 0 0;color:#6d7280;font-size:9pt}
      .list-count{text-align:right}.list-count span{display:block;color:#6d7280;font-size:8pt}.list-count strong{display:block;font-size:15pt;color:#07111f;margin-top:1mm}
      .catalog-row{display:grid;grid-template-columns:10mm 34mm 1fr 37mm;gap:5mm;align-items:center;border:1px solid #e7dece;border-radius:5mm;padding:4mm;margin-bottom:4mm;break-inside:avoid;page-break-inside:avoid;background:#fffdfa}
      .row-number{font-family:Georgia,"Times New Roman",serif;color:#b4863e;font-size:10pt;font-weight:700;text-align:center}
      .row-photo{width:34mm;height:25mm;border-radius:3.5mm;overflow:hidden;background:#eee6da;display:grid;place-items:center}
      .row-photo img{width:100%;height:100%;object-fit:cover}.item-no-image{font-family:Georgia,"Times New Roman",serif;color:#85622c;font-weight:700}
      .row-content h3{font-family:Georgia,"Times New Roman",serif;margin:0 0 1.5mm;font-size:13pt;color:#07111f}
      .row-content p{margin:0}.primary-meta{font-size:9pt;color:#3d4450}.secondary-meta{font-size:8.5pt;color:#6d7280;margin-top:1.2mm!important}.markers{font-size:7.5pt;color:#8a642b;margin-top:1.8mm!important;font-weight:700}
      .row-value{text-align:right}.row-value span{display:block;color:#6d7280;font-size:7.5pt}.row-value strong{display:block;color:#07111f;font-size:10.5pt;margin-top:1mm}
      .list-footer{margin-top:7mm;padding-top:4mm;border-top:1px solid #e7dece;text-align:center;color:#9a8c78;font-size:8pt}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover,.cover-card,.catalog-row{break-inside:avoid}}
    </style>
  </head>
  <body>
    <section class="cover">
      <div class="cover-brand">
        <img class="cover-logo" src="${appLogo}" alt="Logo VM Collection">
        <div class="brand-title"><strong>VM</strong><span>COLLECTION</span><div class="gold-rule"><i></i><b></b><i></i></div></div>
      </div>
      <div class="cover-main">
        <div class="cover-card">
          <div class="cover-profile"><img src="${profilePhoto}" alt="Foto de ${escapeHtml(personName)}"></div>
          <div class="cover-kicker">Catálogo personalizado</div>
          <h1>${escapeHtml(selectedCategory)}</h1>
          <p class="cover-person">${escapeHtml(personName)}</p>
          <div class="category-box">${selectedItems.length} item(ns)</div>
          <div class="cover-meta">${escapeHtml(selectionLabel)}<br>Ordem: ${escapeHtml(sortLabel)}<br>Gerado em ${generatedAt}</div>
        </div>
      </div>
      <div class="cover-footer">VM Collection - Seu acervo digital</div>
    </section>
    <main class="catalog-pages">
      <header class="list-header">
        <div class="list-header-left"><img src="${appLogo}" alt="Logo"><div><h2>${escapeHtml(selectedCategory)}</h2><p>${escapeHtml(personName)} - Catálogo em formato de lista</p></div></div>
        <div class="list-count"><span>Total da seleção</span><strong>${selectedItems.length}</strong></div>
      </header>
      ${rows}
      <div class="list-footer">VM Collection - ${escapeHtml(personName)} - ${generatedAt}</div>
    </main>
  </body>
  </html>`;
}

function generateCatalogPdf() {
  const selectedItems = getCatalogSelection();
  if (!selectedItems.length) {
    alert("Nenhum item encontrado com os filtros atuais para gerar o catálogo.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("O navegador bloqueou a janela do PDF. Permita pop-ups para o VM Collection e tente novamente.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(buildCatalogPdfDocument(selectedItems));
  printWindow.document.close();
  printWindow.focus();
  const triggerPrint = () => setTimeout(() => printWindow.print(), 650);
  if (printWindow.document.readyState === "complete") triggerPrint();
  else printWindow.addEventListener("load", triggerPrint, { once: true });
}

function clearFilters() {
  $("searchInput").value = ""; $("categoryFilter").value = ""; $("brandFilter").value = ""; $("yearFilter").value = ""; $("modelFilter").value = ""; $("scaleFilter").value = ""; $("rarityFilter").value = ""; $("favoriteFilter").value = ""; $("desiredFilter").value = ""; renderCatalog();
}

async function setupVideoRecorder() {
  const dialog = $("videoDialog"), live = $("liveVideo");
  let stream = null, recorder = null, chunks = [], timeoutId = null, tick = null, elapsed = 0;
  $("openVideoBtn").addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) return alert("Este navegador não permite gravação direta de vídeo.");
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true }); live.srcObject = stream; $("recordStatus").textContent = "Pronto para gravar."; dialog.showModal(); }
    catch { alert("Permissão de câmera/microfone negada ou indisponível."); }
  });
  $("startRecordBtn").addEventListener("click", () => {
    chunks = []; elapsed = 0; recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      clearTimeout(timeoutId); clearInterval(tick);
      const reader = new FileReader(); reader.onload = () => { currentVideo = reader.result; setPreview(); $("recordStatus").textContent = "Vídeo salvo no cadastro."; }; reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
      $("startRecordBtn").disabled = false; $("stopRecordBtn").disabled = true;
    };
    recorder.start(); $("startRecordBtn").disabled = true; $("stopRecordBtn").disabled = false;
    tick = setInterval(() => { elapsed += 1; $("recordStatus").textContent = `Gravando: ${elapsed}s de 10s`; }, 1000);
    timeoutId = setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, 10000);
  });
  $("stopRecordBtn").addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); });
  $("closeVideoBtn").addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; clearInterval(tick); dialog.close(); });
}

function updateBackupStatus(message, isError = false) {
  const status = $("backupStatus");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("error", !!isError);
}

function buildCompleteBackup() {
  return {
    app: "VM Collection",
    version: 5,
    storage: "IndexedDB + DataURL",
    exportedAt: new Date().toISOString(),
    profile: normalizeProfile(profile),
    categories: categories.map(normalizeCategory),
    items: items.map(normalizeItem)
  };
}

async function exportBackupNative() {
  updateBackupStatus("Preparando backup completo...");
  try {
    const backup = buildCompleteBackup();
    const json = JSON.stringify(backup, null, 2);
    const filename = `vm-collection-backup-completo-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: "application/json" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Backup completo do VM Collection",
        text: "Backup com perfil, categorias, itens, imagens, vídeos e arquivos anexados.",
        files: [file]
      });
      updateBackupStatus("Backup enviado para o destino escolhido.");
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    updateBackupStatus("Backup gerado. Escolha onde salvar no navegador ou nos Arquivos.");
  } catch (error) {
    if (error?.name === "AbortError") {
      updateBackupStatus("Compartilhamento cancelado.");
      return;
    }
    console.error(error);
    updateBackupStatus("Não foi possível exportar o backup.", true);
    alert("Não foi possível exportar o backup completo.");
  }
}

async function importBackupFile(file) {
  const data = JSON.parse(await file.text());
  const importedItems = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(importedItems)) throw new Error("Backup sem lista de itens válida.");

  const importedProfile = !Array.isArray(data) && data.profile ? normalizeProfile(data.profile) : normalizeProfile();
  const importedCategories = !Array.isArray(data) && Array.isArray(data.categories) ? data.categories.map(normalizeCategory) : [];
  const normalizedItems = importedItems.map(normalizeItem);

  if (!confirm(`Restaurar ${normalizedItems.length} item(ns), ${importedCategories.length} categoria(s), imagens e arquivos? Os dados atuais deste aparelho serão substituídos.`)) return false;

  items = normalizedItems;
  profile = importedProfile;
  categories = importedCategories;
  await ensureCategories(false);
  await VMStorage.replaceAll("items", items);
  await VMStorage.replaceAll("categories", categories);
  await VMStorage.setSetting("profile", profile);
  await VMStorage.setSetting("legacyItemsMigrated", true);

  profileDraftPhoto = profile.photo || "";
  renderAll();
  renderProfile();
  updateBackupStatus("Backup restaurado com imagens e arquivos.");
  return true;
}

window.openCatalogForCategory = openCatalogForCategory;
window.openDetail = openDetail;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.shareItem = shareItem;
window.printItem = printItem;
window.openCategoryEditor = openCategoryEditor;
window.openStoredAttachment = openStoredAttachment;
window.downloadStoredAttachment = downloadStoredAttachment;
window.removeItemDraftAttachment = removeItemDraftAttachment;
window.removeCategoryDraftAttachment = removeCategoryDraftAttachment;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $("installBtn");
  btn.hidden = false;
  btn.onclick = async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  };
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

async function initializePersistentApp() {
  setStaticIcons();
  updateBackupStatus("Abrindo armazenamento persistente...");
  try {
    await VMStorage.open();
    await Promise.all([loadItems(), loadProfile()]);
    await loadCategories();
    await ensureCategories(true);
    const persistenceGranted = await VMStorage.requestPersistence();
    updateBackupStatus(persistenceGranted ? "Armazenamento persistente ativado neste dispositivo." : "Dados salvos em IndexedDB. Mantenha um backup atualizado.");
  } catch (error) {
    console.error(error);
    updateBackupStatus("Falha ao abrir o armazenamento persistente.", true);
    alert("Não foi possível abrir o armazenamento persistente do VM Collection.");
  }

  renderAll();
  renderProfile();
  setPreview();
  renderItemAttachmentList();

  document.addEventListener("click", (e) => {
    const navBtn = e.target.closest("[data-go]");
    if (navBtn) showView(navBtn.dataset.go);
  });

  $("homeCategoryCards")?.addEventListener("click", (e) => {
    const card = e.target.closest(".home-category-card");
    if (!card?.dataset.categoryId) return;
    openCatalogForCategory(card.dataset.categoryId);
  });

  $("itemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const item = readForm();
    if (!item.name) return alert("Informe o nome do item.");
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.unshift(item);
    await saveItems();
    clearForm();
    showView("catalogView");
  });

  $("clearFormBtn").addEventListener("click", clearForm);
  $("cancelEditBtn").addEventListener("click", clearForm);
  $("removeMediaBtn").addEventListener("click", () => { currentPhoto = ""; currentVideo = ""; setPreview(); });
  $("clearFiltersBtn").addEventListener("click", clearFilters);
  $("generateCatalogPdfBtn").addEventListener("click", generateCatalogPdf);

  ["searchInput", "brandFilter", "yearFilter", "modelFilter", "scaleFilter"].forEach((id) => $(id).addEventListener("input", renderCatalog));
  ["categoryFilter", "rarityFilter", "favoriteFilter", "desiredFilter", "sortSelect"].forEach((id) => $(id).addEventListener("change", renderCatalog));
  $("gridBtn").addEventListener("click", () => { gridMode = "grid"; $("gridBtn").classList.add("active"); $("listBtn").classList.remove("active"); renderCatalog(); });
  $("listBtn").addEventListener("click", () => { gridMode = "list"; $("listBtn").classList.add("active"); $("gridBtn").classList.remove("active"); renderCatalog(); });

  $("cameraInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) { currentPhoto = await fileToDataUrl(file); setPreview(); }
    e.target.value = "";
  });
  $("galleryInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) { currentPhoto = await fileToDataUrl(file); setPreview(); }
    e.target.value = "";
  });
  $("itemFilesInput").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    for (const file of files) currentItemAttachments.push(await fileToStoredAttachment(file));
    renderItemAttachmentList();
    e.target.value = "";
  });

  $("categoryImageInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Selecione uma imagem válida.");
    categoryDraftImage = await fileToDataUrl(file);
    renderCategoryImagePreview();
    e.target.value = "";
  });
  $("categoryFilesInput").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    for (const file of files) categoryDraftAttachments.push(await fileToStoredAttachment(file));
    renderCategoryAttachmentList();
    e.target.value = "";
  });
  $("removeCategoryImageBtn").addEventListener("click", () => { categoryDraftImage = ""; renderCategoryImagePreview(); });
  $("closeCategoryDialogBtn").addEventListener("click", () => $("categoryDialog").close());
  $("categoryMediaForm").addEventListener("submit", async (e) => { e.preventDefault(); await saveCategoryMedia(); });

  $("profilePhotoInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Selecione um arquivo de imagem válido.");
    profileDraftPhoto = await fileToDataUrl(file);
    updateProfilePhotoPreview();
    if ($("homeProfileImage")) $("homeProfileImage").src = profileDraftPhoto;
    if ($("heroProfileImage")) $("heroProfileImage").src = profileDraftPhoto;
    if ($("profileOverviewImage")) $("profileOverviewImage").src = profileDraftPhoto;
    e.target.value = "";
  });
  $("removeProfilePhotoBtn").addEventListener("click", () => {
    profileDraftPhoto = "";
    updateProfilePhotoPreview();
    if ($("homeProfileImage")) $("homeProfileImage").src = "assets/icon-192.png";
    if ($("heroProfileImage")) $("heroProfileImage").src = "assets/icon-192.png";
    if ($("profileOverviewImage")) $("profileOverviewImage").src = "assets/icon-192.png";
  });
  $("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    profile = normalizeProfile({
      name: $("profileName").value.trim(),
      birthDate: $("profileBirthDate").value,
      bio: $("profileBio").value.trim(),
      photo: profileDraftPhoto,
      updatedAt: new Date().toISOString()
    });
    await saveProfile();
    $("profileSaveStatus").textContent = "Perfil salvo no dispositivo.";
    setTimeout(() => { if ($("profileSaveStatus")) $("profileSaveStatus").textContent = ""; }, 2500);
  });

  $("exportBtn").addEventListener("click", exportBackupNative);
  $("importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateBackupStatus("Lendo backup...");
    try {
      const restored = await importBackupFile(file);
      if (restored) alert("Backup restaurado com sucesso. Todas as imagens e arquivos foram recuperados.");
    } catch (error) {
      console.error(error);
      updateBackupStatus("Arquivo de backup inválido ou corrompido.", true);
      alert("Não foi possível importar este backup. Verifique se o arquivo foi gerado pelo VM Collection.");
    } finally {
      e.target.value = "";
    }
  });

  setupVideoRecorder();
}

document.addEventListener("DOMContentLoaded", initializePersistentApp);