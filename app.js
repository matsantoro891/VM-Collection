const APP_DISPLAY_NAME = "VM Life ARCHIVE";
const APP_BRAND_SUBLINE = "Life ARCHIVE";

function renderPdfBrandTitleHtml() {
  return `<div class="pdf-brand-title" aria-label="${APP_DISPLAY_NAME}"><span class="pdf-brand-vm">VM</span> <span class="pdf-brand-life">Life</span> <span class="pdf-brand-archive">ARCHIVE</span></div>`;
}
const STORAGE_KEY = "vmCollection.items.v3";
const PROFILE_STORAGE_KEY = "vmCollection.profile.v1";
const LEGACY_KEYS = ["vmCollection.items.v2", "vmCollection.items.v1"];
let items = [];
let categories = [];
let profile = normalizeProfile();
let profileDraftPhoto = "";
let currentPhotos = [];
let currentVideo = "";
const MAX_ITEM_PHOTOS = 5;
let currentItemAttachments = [];
let currentMemoryAudios = [];
let categoryDraftImage = "";
let categoryDraftAttachments = [];
let categoryDraftCustomFields = [];
let itemCustomFieldValuesDraft = {};
let itemCustomFieldsBoundCategory = "";
let editingCategoryId = "";
let activeCategoryDetailId = "";
const categoryDetailState = {
  isOpen: false,
  resumeAfterEdit: null,
  pendingDeleteId: null
};
let gridMode = "grid";
let catalogAppliedFilters = { terms: [], categoryId: "", classification: "all", dateFrom: "", dateTo: "" };
let catalogHasSearched = false;
const CATEGORY_VIEW_STORAGE_KEY = "vmCollection.categoryViewMode";
let categoryViewMode = localStorage.getItem(CATEGORY_VIEW_STORAGE_KEY) || "lista";
const globalSearchState = { isOpen: false };

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
    gallery: `<svg viewBox="0 0 24 24"><rect ${c} x="3" y="5" width="18" height="14" rx="2"/><circle ${c} cx="9" cy="11" r="2"/><path ${c} d="m3 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L14 17"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path ${c} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path ${c} d="M14 3v5h5"/></svg>`,
    video: `<svg viewBox="0 0 24 24"><rect ${c} x="3" y="6" width="13" height="12" rx="2"/><path ${c} d="M16 10.5 21 8v8l-5-2.5v-3Z"/></svg>`,
    profile: `<svg viewBox="0 0 24 24"><circle ${c} cx="12" cy="8" r="4"/><path ${c} d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    shield: `<svg viewBox="0 0 24 24"><path ${c} d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path ${c} d="m9 12 2 2 4-5"/></svg>`,
    phone: `<svg viewBox="0 0 24 24"><rect ${c} x="6" y="2" width="12" height="20" rx="3"/><path ${c} d="M10 18h4"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><circle ${c} cx="9" cy="8" r="3"/><circle ${c} cx="17" cy="9" r="2.5"/><path ${c} d="M3 20a6 6 0 0 1 12 0m0-4a5 5 0 0 1 6 4"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect ${c} x="3" y="5" width="18" height="16" rx="2"/><path ${c} d="M7 3v4m10-4v4M3 10h18"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle ${c} cx="11" cy="11" r="6"/><path ${c} d="m16.5 16.5 4 4"/></svg>`,
    home: `<svg viewBox="0 0 24 24"><path ${c} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
    vitrine: `<svg viewBox="0 0 24 24"><rect ${c} x="4" y="3" width="16" height="18" rx="1.5"/><path ${c} d="M4 8h16M8 8v13m8-13v13M9 12h2m4 0h2m-6 4h2m4 0h2"/></svg>`,
    estante: `<svg viewBox="0 0 24 24"><path ${c} d="M4 4h16v3H4zm0 6.5h16v3H4zm0 6.5h16v3H4z"/><path ${c} d="M6 5.5h3M6 12h4M6 18.5h3"/></svg>`
  };
  return icons[type] || "";
}

function setStaticIcons() {
  const map = {
    quickCat: "grid", quickFilter: "sliders", quickReport: "bars", quickStats: "trend",
    bannerCatalogIcon: "grid", bannerAddIcon: "camera", bannerCategoryIcon: "box", bannerReportIcon: "bars", bannerStatsIcon: "trend",
    reportIconCategory: "grid", reportIconBrand: "box", reportIconYear: "calendar", reportIconRare: "diamond",
    backupSettingIcon: "shield",
    navHomeIcon: "home", navSearchIcon: "search", navCategoryIcon: "grid", navProfileIcon: "profile",
    categoryCoverBtnIcon: "camera",
    categoryViewVitrineIcon: "vitrine", categoryViewEstanteIcon: "estante"
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

function itemPhotosFromRaw(raw = {}) {
  const photos = Array.isArray(raw.photos) ? raw.photos.map(String).filter(Boolean) : [];
  const legacy = String(raw.photo || "");
  if (!photos.length && legacy) return [legacy];
  return photos;
}

function normalizeMemoryAudio(raw = {}) {
  return {
    id: raw.id || uid(),
    name: String(raw.name || "Memória em áudio"),
    type: String(raw.type || "audio/webm"),
    size: Number(raw.size || 0),
    duration: Number(raw.duration || 0),
    addedAt: raw.addedAt || new Date().toISOString(),
    dataUrl: String(raw.dataUrl || "")
  };
}

function normalizeItem(raw = {}) {
  const photos = itemPhotosFromRaw(raw);
  const desired = !!raw.desired;
  const item = {
    id: raw.id || uid(), name: raw.name || "", category: raw.category || "", subcategory: raw.subcategory || "",
    brand: raw.brand || "", model: raw.model || "", scale: raw.scale || "", year: raw.year || "",
    condition: raw.condition || "", paidValue: Number(raw.paidValue || 0), estimatedValue: Number(raw.estimatedValue || 0),
    acquiredAt: raw.acquiredAt || "", acquiredPlace: raw.acquiredPlace || "", serial: raw.serial || "", tags: raw.tags || "",
    description: raw.description || "", notes: raw.notes || "", favorite: !!raw.favorite, desired, rare: !!raw.rare,
    freeMemoryText: String(raw.freeMemoryText || ""),
    memory: String(raw.memory || ""),
    relatedPerson: String(raw.relatedPerson || ""),
    relatedPlace: String(raw.relatedPlace || ""),
    relatedEvent: String(raw.relatedEvent || ""),
    storageLocation: String(raw.storageLocation || ""),
    eventDate: String(raw.eventDate || ""),
    country: String(raw.country || ""),
    faceValue: String(raw.faceValue || ""),
    material: String(raw.material || ""),
    connectedItems: String(raw.connectedItems || ""),
    memoryAudios: Array.isArray(raw.memoryAudios) ? raw.memoryAudios.map(normalizeMemoryAudio) : [],
    photos,
    photo: photos[0] || String(raw.photo || ""),
    video: String(raw.video || ""),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment) : [],
    customFieldValues: normalizeCustomFieldValues(raw.customFieldValues),
    updatedAt: raw.updatedAt || new Date().toISOString(), createdAt: raw.createdAt || new Date().toISOString()
  };
  if (Object.prototype.hasOwnProperty.call(raw, "owned")) item.owned = !!raw.owned;
  return item;
}

const CUSTOM_FIELD_TYPES = [
  { id: "text", label: "Texto curto" },
  { id: "textarea", label: "Texto longo" },
  { id: "number", label: "Número" },
  { id: "date", label: "Data" },
  { id: "select", label: "Seleção única" }
];
const CUSTOM_FIELD_TYPE_IDS = new Set(CUSTOM_FIELD_TYPES.map((entry) => entry.id));

function normalizeCustomFieldOptions(raw) {
  if (Array.isArray(raw)) {
    return raw.map((option) => String(option || "").trim()).filter(Boolean);
  }
  return String(raw || "")
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function normalizeCustomField(raw = {}, orderFallback = 0) {
  const type = CUSTOM_FIELD_TYPE_IDS.has(raw.type) ? raw.type : "text";
  const options = type === "select" ? normalizeCustomFieldOptions(raw.options) : [];
  return {
    id: raw.id || uid(),
    label: String(raw.label || raw.name || "").trim(),
    type,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : orderFallback,
    options,
    active: raw.active !== false,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeCustomFields(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((field, index) => normalizeCustomField(field, index))
    .sort((a, b) => a.order - b.order || String(a.label).localeCompare(String(b.label), "pt-BR"))
    .map((field, index) => ({ ...field, order: index }));
}

function normalizeCustomFieldValues(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const values = {};
  Object.keys(source).forEach((key) => {
    const id = String(key || "").trim();
    if (!id) return;
    const value = source[key];
    if (value == null) return;
    values[id] = String(value);
  });
  return values;
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
    customFields: normalizeCustomFields(raw.customFields),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function getActiveCustomFieldsForCategoryName(categoryName) {
  const category = getCategoryRecordByName(categoryName);
  if (!category) return [];
  return (category.customFields || []).filter((field) => field.active !== false);
}

function getAllCustomFieldsForCategoryName(categoryName) {
  const category = getCategoryRecordByName(categoryName);
  return category?.customFields || [];
}

function countItemsUsingCustomField(fieldId) {
  if (!fieldId) return 0;
  return items.filter((item) => String(item.customFieldValues?.[fieldId] ?? "").trim() !== "").length;
}

function formatCustomFieldDisplayValue(field, rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";
  if (field?.type === "date") return formatItemDate(value) || value;
  if (field?.type === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("pt-BR") : value;
  }
  return value;
}

function reindexCategoryDraftCustomFields() {
  categoryDraftCustomFields = categoryDraftCustomFields.map((field, index) => ({
    ...normalizeCustomField(field, index),
    order: index
  }));
}

function syncCategoryDraftCustomFieldsFromDom() {
  const list = $("categoryCustomFieldsList");
  if (!list) return;
  const next = [];
  list.querySelectorAll(".category-custom-field-row").forEach((row, index) => {
    const id = row.dataset.fieldId || uid();
    const label = row.querySelector(".custom-field-label-input")?.value?.trim() || "";
    const type = row.querySelector(".custom-field-type-input")?.value || "text";
    const optionsRaw = row.querySelector(".custom-field-options-input")?.value || "";
    const active = row.dataset.active !== "false";
    const createdAt = row.dataset.createdAt || new Date().toISOString();
    next.push(normalizeCustomField({
      id,
      label,
      type,
      options: optionsRaw,
      active,
      createdAt,
      order: index
    }, index));
  });
  categoryDraftCustomFields = next;
}

function renderCategoryCustomFieldsEditor() {
  const list = $("categoryCustomFieldsList");
  if (!list) return;
  if (!categoryDraftCustomFields.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = categoryDraftCustomFields.map((field, index) => {
    const typeOptions = CUSTOM_FIELD_TYPES.map((type) => (
      `<option value="${type.id}"${field.type === type.id ? " selected" : ""}>${escapeHtml(type.label)}</option>`
    )).join("");
    const optionsValue = (field.options || []).join("\n");
    const inactiveBadge = field.active === false ? '<span class="custom-field-inactive-badge">Desativado</span>' : "";
    const optionsBlock = field.type === "select"
      ? `<label class="field-wide custom-field-options-wrap">Opções (uma por linha)<textarea class="custom-field-options-input" rows="3" placeholder="Opção A&#10;Opção B">${escapeHtml(optionsValue)}</textarea></label>`
      : `<label class="field-wide custom-field-options-wrap" hidden>Opções (uma por linha)<textarea class="custom-field-options-input" rows="3" hidden>${escapeHtml(optionsValue)}</textarea></label>`;
    const reactivateBtn = field.active === false
      ? `<button type="button" class="text-action custom-field-reactivate-btn" data-index="${index}">Reativar</button>`
      : "";
    return `<article class="category-custom-field-row${field.active === false ? " is-inactive" : ""}" data-field-id="${escapeHtml(field.id)}" data-active="${field.active === false ? "false" : "true"}" data-created-at="${escapeHtml(field.createdAt || "")}">
      <div class="custom-field-row-top">
        <strong>Campo ${index + 1}</strong>
        ${inactiveBadge}
        <div class="custom-field-row-actions">
          <button type="button" class="ghost-btn custom-field-move-up" data-index="${index}" aria-label="Mover para cima" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="ghost-btn custom-field-move-down" data-index="${index}" aria-label="Mover para baixo" ${index === categoryDraftCustomFields.length - 1 ? "disabled" : ""}>↓</button>
          ${reactivateBtn}
          <button type="button" class="text-action custom-field-remove-btn" data-index="${index}">Excluir</button>
        </div>
      </div>
      <div class="custom-field-row-grid">
        <label>Nome do campo<input class="custom-field-label-input" value="${escapeHtml(field.label)}" maxlength="80" required /></label>
        <label>Tipo<select class="custom-field-type-input">${typeOptions}</select></label>
      </div>
      ${optionsBlock}
    </article>`;
  }).join("");
}

function addCategoryCustomFieldDraft() {
  syncCategoryDraftCustomFieldsFromDom();
  categoryDraftCustomFields.push(normalizeCustomField({
    label: "",
    type: "text",
    order: categoryDraftCustomFields.length,
    active: true
  }, categoryDraftCustomFields.length));
  reindexCategoryDraftCustomFields();
  renderCategoryCustomFieldsEditor();
  const inputs = $("categoryCustomFieldsList")?.querySelectorAll(".custom-field-label-input");
  const last = inputs?.[inputs.length - 1];
  last?.focus();
}

function moveCategoryCustomFieldDraft(index, delta) {
  syncCategoryDraftCustomFieldsFromDom();
  const target = index + delta;
  if (target < 0 || target >= categoryDraftCustomFields.length) return;
  const copy = [...categoryDraftCustomFields];
  const [row] = copy.splice(index, 1);
  copy.splice(target, 0, row);
  categoryDraftCustomFields = copy;
  reindexCategoryDraftCustomFields();
  renderCategoryCustomFieldsEditor();
}

function reactivateCategoryCustomFieldDraft(index) {
  syncCategoryDraftCustomFieldsFromDom();
  if (!categoryDraftCustomFields[index]) return;
  categoryDraftCustomFields[index] = { ...categoryDraftCustomFields[index], active: true };
  renderCategoryCustomFieldsEditor();
}

function removeCategoryCustomFieldDraft(index) {
  syncCategoryDraftCustomFieldsFromDom();
  const field = categoryDraftCustomFields[index];
  if (!field) return;
  const usage = countItemsUsingCustomField(field.id);
  if (usage > 0) {
    const ok = confirm(`O campo “${field.label || "sem nome"}” está preenchido em ${usage} item(ns).\n\nEm vez de excluir, ele será desativado: deixará de aparecer em novos cadastros, mas os valores antigos serão preservados no backup e na visualização.\n\nDeseja desativar este campo?`);
    if (!ok) return;
    categoryDraftCustomFields[index] = { ...field, active: false };
  } else {
    const ok = confirm(`Excluir o campo “${field.label || "sem nome"}”? Esta ação não poderá ser desfeita.`);
    if (!ok) return;
    categoryDraftCustomFields.splice(index, 1);
  }
  reindexCategoryDraftCustomFields();
  renderCategoryCustomFieldsEditor();
}

function validateCategoryDraftCustomFields() {
  syncCategoryDraftCustomFieldsFromDom();
  reindexCategoryDraftCustomFields();
  const labels = new Map();
  for (const field of categoryDraftCustomFields) {
    if (!field.label) {
      alert("Informe o nome de todos os campos personalizados ou remova os campos vazios.");
      return false;
    }
    const key = field.label.toLowerCase();
    if (labels.has(key)) {
      alert(`Já existe um campo com o nome “${field.label}”. Use nomes diferentes.`);
      return false;
    }
    labels.set(key, true);
    if (field.type === "select" && field.active !== false && !(field.options || []).length) {
      alert(`O campo “${field.label}” é de seleção única e precisa de ao menos uma opção.`);
      return false;
    }
  }
  return true;
}

function collectItemCustomFieldValuesFromDom() {
  const mount = $("itemCustomFieldsMount");
  const values = { ...itemCustomFieldValuesDraft };
  if (!mount) return values;
  mount.querySelectorAll("[data-custom-field-id]").forEach((input) => {
    const id = input.getAttribute("data-custom-field-id");
    if (!id) return;
    values[id] = String(input.value ?? "");
  });
  itemCustomFieldValuesDraft = normalizeCustomFieldValues(values);
  return itemCustomFieldValuesDraft;
}

function buildItemCustomFieldInputHtml(field, value) {
  const safeId = `customField_${String(field.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const label = escapeHtml(field.label || "Campo");
  const current = escapeHtml(String(value ?? ""));
  if (field.type === "textarea") {
    return `<label class="field-wide">${label}<textarea id="${safeId}" data-custom-field-id="${escapeHtml(field.id)}" rows="3">${current}</textarea></label>`;
  }
  if (field.type === "number") {
    return `<label>${label}<input id="${safeId}" data-custom-field-id="${escapeHtml(field.id)}" type="number" step="any" value="${current}" /></label>`;
  }
  if (field.type === "date") {
    return `<label>${label}<div class="date-field-wrap"><input id="${safeId}" data-custom-field-id="${escapeHtml(field.id)}" type="date" value="${current}" aria-label="${label}" /><span class="date-field-icon" aria-hidden="true"></span></div></label>`;
  }
  if (field.type === "select") {
    const options = [`<option value=""></option>`]
      .concat((field.options || []).map((option) => {
        const selected = String(value ?? "") === option ? " selected" : "";
        return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(option)}</option>`;
      }));
    return `<label>${label}<select id="${safeId}" data-custom-field-id="${escapeHtml(field.id)}">${options.join("")}</select></label>`;
  }
  return `<label>${label}<input id="${safeId}" data-custom-field-id="${escapeHtml(field.id)}" type="text" value="${current}" maxlength="200" /></label>`;
}

function deriveItemNameFromCustomFields(categoryName, customValues = {}) {
  const fields = getActiveCustomFieldsForCategoryName(categoryName);
  for (const field of fields) {
    const value = String(customValues[field.id] || "").trim();
    if (value) return value.slice(0, 160);
  }
  return "";
}

function renderItemCustomFields(categoryName, { announce = false } = {}) {
  const mount = $("itemCustomFieldsMount");
  if (!mount) return;
  const trimmed = String(categoryName || "").trim();
  const fields = getActiveCustomFieldsForCategoryName(trimmed);
  itemCustomFieldsBoundCategory = trimmed;
  mount.classList.toggle("is-empty", !fields.length);
  if (!fields.length) {
    if (!trimmed) {
      mount.innerHTML = '<p class="item-custom-fields-empty">Selecione uma categoria para carregar os campos principais.</p>';
    } else {
      const category = getCategoryRecordByName(trimmed);
      const configureBtn = category?.id
        ? `<button type="button" class="text-action item-configure-fields-btn" data-configure-category-fields="${escapeHtml(category.id)}">Configurar campos</button>`
        : "";
      mount.innerHTML = `<div class="item-custom-fields-empty-wrap"><p class="item-custom-fields-empty">Esta categoria ainda não possui campos principais.</p>${configureBtn}</div>`;
    }
    mount.hidden = false;
    return;
  }
  mount.hidden = false;
  mount.innerHTML = fields.map((field) => buildItemCustomFieldInputHtml(field, itemCustomFieldValuesDraft[field.id] || "")).join("");
}

const categoryComboboxState = {
  open: false,
  searching: false,
  committed: ""
};

function getCategoryPickerNames({ searching = false, query = "" } = {}) {
  const names = getCategories();
  if (!searching) return names;
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return names;
  return names.filter((name) => name.toLowerCase().includes(needle));
}

function setCategoryComboboxExpanded(open) {
  categoryComboboxState.open = !!open;
  $("category")?.setAttribute("aria-expanded", open ? "true" : "false");
  $("categoryPickerToggle")?.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeCategoryCombobox() {
  const menu = $("categoryMenu");
  if (menu) {
    menu.hidden = true;
    menu.innerHTML = "";
  }
  setCategoryComboboxExpanded(false);
}

function renderCategoryComboboxMenu() {
  const menu = $("categoryMenu");
  const input = $("category");
  if (!menu || !input) return;
  const selected = categoryComboboxState.committed || String(input.value || "").trim();
  const names = getCategoryPickerNames({
    searching: categoryComboboxState.searching,
    query: input.value
  });
  if (!names.length) {
    menu.innerHTML = '<li class="category-combobox-empty" role="presentation">Nenhuma categoria disponível.</li>';
  } else {
    menu.innerHTML = names.map((name) => {
      const selectedClass = name.toLowerCase() === selected.toLowerCase() ? " is-selected" : "";
      const ariaSelected = name.toLowerCase() === selected.toLowerCase() ? "true" : "false";
      return `<li role="presentation"><button type="button" class="category-combobox-option${selectedClass}" role="option" aria-selected="${ariaSelected}" data-category-name="${escapeHtml(name)}">${escapeHtml(name)}</button></li>`;
    }).join("");
  }
  menu.hidden = false;
  setCategoryComboboxExpanded(true);
  const selectedBtn = menu.querySelector(".category-combobox-option.is-selected");
  selectedBtn?.scrollIntoView({ block: "nearest" });
}

function openCategoryCombobox({ searching = false } = {}) {
  categoryComboboxState.searching = !!searching;
  if (!searching) {
    categoryComboboxState.committed = String($("category")?.value || categoryComboboxState.committed || "").trim();
  }
  renderCategoryComboboxMenu();
}

function commitCategoryComboboxValue(name, { forceChange = false } = {}) {
  const next = String(name || "").trim();
  const previousCommitted = categoryComboboxState.committed;
  const input = $("category");
  if (input) input.value = next;
  closeCategoryCombobox();
  const accepted = handleItemCategoryChange(next, { force: forceChange });
  if (accepted === false) {
    if (input) input.value = previousCommitted;
    categoryComboboxState.committed = previousCommitted;
    categoryComboboxState.searching = false;
    return false;
  }
  categoryComboboxState.committed = next;
  categoryComboboxState.searching = false;
  return true;
}

function syncCategoryComboboxCommitted(name = "") {
  const value = String(name || $("category")?.value || "").trim();
  categoryComboboxState.committed = value;
  categoryComboboxState.searching = false;
  if ($("category") && name != null && name !== "") $("category").value = value;
  closeCategoryCombobox();
}

function setupCategoryCombobox() {
  const input = $("category");
  const toggle = $("categoryPickerToggle");
  const menu = $("categoryMenu");
  if (!input || !toggle || !menu) return;

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (categoryComboboxState.open && !categoryComboboxState.searching) {
      closeCategoryCombobox();
      return;
    }
    openCategoryCombobox({ searching: false });
  });

  input.addEventListener("focus", () => {
    if (!categoryComboboxState.searching) openCategoryCombobox({ searching: false });
  });

  input.addEventListener("input", () => {
    categoryComboboxState.searching = true;
    openCategoryCombobox({ searching: true });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCategoryCombobox();
      input.value = categoryComboboxState.committed;
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openCategoryCombobox({ searching: categoryComboboxState.searching });
      menu.querySelector(".category-combobox-option")?.focus();
      return;
    }
    if (e.key === "Enter" && categoryComboboxState.open) {
      const first = menu.querySelector(".category-combobox-option");
      if (first) {
        e.preventDefault();
        commitCategoryComboboxValue(first.getAttribute("data-category-name") || first.textContent || "");
      }
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (menu.contains(document.activeElement) || toggle === document.activeElement) return;
      const typed = String(input.value || "").trim();
      const match = getCategories().find((name) => name.toLowerCase() === typed.toLowerCase());
      if (match) commitCategoryComboboxValue(match);
      else {
        input.value = categoryComboboxState.committed;
        categoryComboboxState.searching = false;
        closeCategoryCombobox();
      }
    }, 120);
  });

  menu.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  menu.addEventListener("click", (e) => {
    const option = e.target.closest(".category-combobox-option");
    if (!option) return;
    commitCategoryComboboxValue(option.getAttribute("data-category-name") || option.textContent || "");
  });

  document.addEventListener("click", (e) => {
    if (!categoryComboboxState.open) return;
    if (e.target.closest(".category-combobox")) return;
    const typed = String(input.value || "").trim();
    const match = getCategories().find((name) => name.toLowerCase() === typed.toLowerCase());
    if (match) commitCategoryComboboxValue(match);
    else {
      input.value = categoryComboboxState.committed;
      categoryComboboxState.searching = false;
      closeCategoryCombobox();
    }
  });
}

function handleItemCategoryChange(nextCategoryName, { force = false } = {}) {
  const next = String(nextCategoryName || "").trim();
  collectItemCustomFieldValuesFromDom();
  const previous = itemCustomFieldsBoundCategory;
  if (!force && previous.toLowerCase() === next.toLowerCase()) return true;
  if (!force && previous && previous.toLowerCase() !== next.toLowerCase()) {
    const previousFields = getActiveCustomFieldsForCategoryName(previous);
    const hasFilled = previousFields.some((field) => String(itemCustomFieldValuesDraft[field.id] || "").trim() !== "");
    if (hasFilled) {
      const ok = confirm("Os campos personalizados exibidos serão alterados conforme a nova categoria.\n\nOs valores já preenchidos serão preservados internamente e poderão reaparecer se você voltar à categoria anterior.\n\nDeseja continuar?");
      if (!ok) {
        if ($("category")) $("category").value = previous;
        categoryComboboxState.committed = previous;
        return false;
      }
    }
  }
  renderItemCustomFields(next);
  return true;
}

function setupCategoryCustomFieldsEditor() {
  $("addCategoryCustomFieldBtn")?.addEventListener("click", () => addCategoryCustomFieldDraft());
  $("categoryCustomFieldsList")?.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".custom-field-remove-btn");
    if (removeBtn) {
      removeCategoryCustomFieldDraft(Number(removeBtn.dataset.index));
      return;
    }
    const upBtn = e.target.closest(".custom-field-move-up");
    if (upBtn) {
      moveCategoryCustomFieldDraft(Number(upBtn.dataset.index), -1);
      return;
    }
    const downBtn = e.target.closest(".custom-field-move-down");
    if (downBtn) {
      moveCategoryCustomFieldDraft(Number(downBtn.dataset.index), 1);
      return;
    }
    const reactivateBtn = e.target.closest(".custom-field-reactivate-btn");
    if (reactivateBtn) {
      reactivateCategoryCustomFieldDraft(Number(reactivateBtn.dataset.index));
    }
  });
  $("categoryCustomFieldsList")?.addEventListener("change", (e) => {
    if (!e.target.classList.contains("custom-field-type-input")) return;
    syncCategoryDraftCustomFieldsFromDom();
    renderCategoryCustomFieldsEditor();
  });
  $("itemCustomFieldsMount")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-configure-category-fields]");
    if (!btn) return;
    const categoryId = btn.getAttribute("data-configure-category-fields");
    if (categoryId) openCategoryEditor(categoryId);
  });
}

function buildCustomFieldDetailRows(item) {
  const defined = getAllCustomFieldsForCategoryName(item.category);
  const values = item.customFieldValues || {};
  const rows = [];
  const seen = new Set();
  defined.forEach((field) => {
    const display = formatCustomFieldDisplayValue(field, values[field.id]);
    if (!display) return;
    seen.add(field.id);
    rows.push(detailTableRow(field.label || "Campo", display));
  });
  Object.keys(values).forEach((fieldId) => {
    if (seen.has(fieldId)) return;
    const text = String(values[fieldId] || "").trim();
    if (!text) return;
    rows.push(detailTableRow("Campo personalizado", text));
  });
  return rows.filter(Boolean);
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

const HERO_PROFILE_FALLBACK = "assets/icon-192.png";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function updateHomeGreeting() {
  const el = $("homeGreeting");
  if (!el) return;
  const firstName = profile?.name?.trim().split(/\s+/)[0] || "";
  const greeting = getTimeGreeting();
  el.textContent = firstName ? `${greeting}, ${firstName}` : greeting;
}

function updateHeroProfileImage(sourcePhoto = "") {
  const img = $("heroProfileImage");
  if (!img) return;
  const photo = String(sourcePhoto || profileDraftPhoto || profile?.photo || "").trim();
  const useFallback = () => {
    img.onerror = null;
    img.src = HERO_PROFILE_FALLBACK;
    img.classList.remove("is-user-photo");
    img.classList.add("is-logo-fallback");
  };
  img.onerror = useFallback;
  if (photo) {
    img.src = photo;
    img.classList.add("is-user-photo");
    img.classList.remove("is-logo-fallback");
  } else {
    useFallback();
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
  updateHomeGreeting();
  updateHeroProfileImage(profileDraftPhoto);
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

function showView(id, options = {}) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.go === id));
  $("appShell")?.classList.toggle("is-add-view", id === "addView");
  if (id === "catalogView" && options.resetCatalogFilters) resetCatalogFilters({ render: false });
  if (id === "reportsView") renderReports();
  if (id === "statsView") renderStatsDashboard();
  if (id === "categoriesView") renderCategories();
  if (id === "homeView") renderHome();
  if (id === "catalogView") renderCatalog();
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
  const photos = itemPhotosFromRaw(item);
  const img = photos.length
    ? `<button type="button" class="item-photo-open" onclick="event.stopPropagation();openPhotoViewerForItem('${item.id}', 0, this)" aria-label="Ampliar fotos de ${escapeHtml(item.name || "item")}"><img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span></button>`
    : "<span>Sem foto</span>";
  return `<article class="item-card" onclick="openDetail('${item.id}')"><div class="item-photo">${img}${itemBadges(item)}</div><div class="item-body"><h4>${escapeHtml(item.name || "Item sem nome")}</h4><div class="meta-line"><span>${escapeHtml(item.category || "Sem categoria")}</span><span>${money(item.estimatedValue)}</span></div><div class="meta-line"><span>${escapeHtml(item.year || "")}</span><span>${escapeHtml(item.condition || "")}</span></div></div></article>`;
}

function recentCard(item) {
  const photos = itemPhotosFromRaw(item);
  const img = photos.length
    ? `<button type="button" class="recent-photo-open" onclick="event.stopPropagation();openPhotoViewerForItem('${item.id}', 0, this)" aria-label="Ampliar fotos de ${escapeHtml(item.name || "item")}"><img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span></button>`
    : "<span>Sem foto</span>";
  const sub = [item.year, item.category].filter(Boolean).join(" • ");
  return `<article class="recent-card" onclick="openDetail('${item.id}')"><div class="recent-photo">${img}</div><div class="recent-body"><h4>${escapeHtml(item.name || "Item sem nome")}</h4><p>${escapeHtml(sub || item.category || "Sem categoria")}</p></div></article>`;
}

function getCategoryGroups() {
  return getCategoryOptionEntries().map(({ id, name }) => {
    const category = getCategoryRecordByName(name);
    const count = items.filter((i) => itemBelongsToCategory(i, id)).length;
    return { id, cat: name, category, count };
  }).sort((a, b) => a.cat.localeCompare(b.cat, "pt-BR"));
}

function formatItemCount(n) {
  const count = Number(n) || 0;
  return count === 1 ? "1 item" : `${count} itens`;
}

function categoryInitials(name) {
  return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "VM";
}

function homeCategoryCard({ id, cat, category, count }) {
  const initials = categoryInitials(cat);
  const media = category.image
    ? `<div class="home-category-cover"><img src="${category.image}" alt="" onerror="this.remove()"></div>`
    : `<div class="home-category-cover home-category-cover-empty" aria-hidden="true"></div>`;
  return `<button type="button" class="home-category-card" data-category-id="${escapeHtml(id)}" aria-label="Abrir categoria ${escapeHtml(cat)}">${media}<div class="home-category-body"><div class="category-title-row"><span class="category-symbol" aria-hidden="true">${escapeHtml(initials)}</span><h4 class="category-title-name">${escapeHtml(cat)}</h4><span class="category-count">(${formatItemCount(count)})</span></div></div></button>`;
}

function homeCategoriesEmptyHtml() {
  return `<div class="empty home-categories-empty"><span class="empty-symbol">◇</span><strong>Nenhuma categoria cadastrada.</strong><p>Cadastre categorias ao adicionar itens ou pela área de Categorias.</p><button class="secondary-btn home-categories-empty-btn" type="button" data-go="categoriesView">Ir para Categorias</button></div>`;
}

function openCatalogForCategory(categoryId) {
  openCategoryDetail(categoryId);
}

const ITEM_SEARCH_FIELDS = [
  "name", "description", "notes", "acquiredPlace", "condition", "category", "subcategory",
  "brand", "model", "scale", "year", "serial", "tags",
  "freeMemoryText", "memory", "relatedPerson", "relatedPlace", "relatedEvent",
  "storageLocation", "country", "faceValue", "material", "connectedItems"
];

function stripAccents(text) {
  return String(text || "").normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeSearchInput(input) {
  return stripAccents(String(input || "").trim().toLowerCase()).replace(/\s+/g, " ");
}

function parseSearchTerms(input) {
  const normalized = normalizeSearchInput(input);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function getItemSearchHaystack(item) {
  return normalizeSearchInput(ITEM_SEARCH_FIELDS.map((field) => String(item[field] || "")).join(" "));
}

function itemMatchesSearchTerms(item, terms) {
  if (!terms.length) return true;
  const haystack = getItemSearchHaystack(item);
  return terms.every((term) => haystack.includes(term));
}

function getCategoryViewMode() {
  return categoryViewMode;
}

function setCategoryViewMode(mode) {
  const allowed = ["vitrine", "estante", "timeline", "lista"];
  categoryViewMode = allowed.includes(mode) ? mode : "lista";
  localStorage.setItem(CATEGORY_VIEW_STORAGE_KEY, categoryViewMode);
  updateCategoryViewSwitcherUI();
}

function updateCategoryViewSwitcherUI() {
  document.querySelectorAll(".category-view-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.categoryView === categoryViewMode);
    btn.setAttribute("aria-selected", String(btn.dataset.categoryView === categoryViewMode));
  });
}

function getItemTimelineDate(item) {
  return item.eventDate || item.acquiredAt || "";
}

function vitrineCard(item) {
  const photos = itemPhotosFromRaw(item);
  const photoHtml = photos.length
    ? `<img src="${photos[0]}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'vitrine-no-photo\\'>Sem foto</span>'">`
    : '<span class="vitrine-no-photo">Sem foto</span>';
  const excerpt = String(item.memory || item.description || "").trim();
  const excerptHtml = excerpt
    ? `<p>${escapeHtml(excerpt.length > 140 ? `${excerpt.slice(0, 140)}…` : excerpt)}</p>`
    : "";
  return `<article class="vitrine-card" onclick="openDetail('${item.id}')"><div class="vitrine-photo">${photoHtml}</div><div class="vitrine-body"><h4>${escapeHtml(item.name || "Item sem nome")}</h4>${excerptHtml}</div></article>`;
}

function shelfItemButton(item) {
  const photos = itemPhotosFromRaw(item);
  const photoHtml = photos.length
    ? `<img src="${photos[0]}" alt="" onerror="this.parentElement.innerHTML=''">`
    : "";
  return `<button type="button" class="shelf-item" onclick="openDetail('${item.id}')"><div class="shelf-item-photo">${photoHtml}</div><span>${escapeHtml(item.name || "Item")}</span></button>`;
}

function renderShelfView(list) {
  const perRow = 5;
  const rows = [];
  for (let i = 0; i < list.length; i += perRow) rows.push(list.slice(i, i + perRow));
  return rows.map((row) => `<div class="shelf-block"><div class="shelf-row">${row.map(shelfItemButton).join("")}</div></div>`).join("");
}

function renderTimelineView(list) {
  const sorted = [...list].sort((a, b) => {
    const ta = parseSortableDate(getItemTimelineDate(a));
    const tb = parseSortableDate(getItemTimelineDate(b));
    if (ta === null && tb === null) return compareCatalogNames(a.name, b.name, 1);
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });
  const groups = new Map();
  sorted.forEach((item) => {
    const key = getItemTimelineDate(item) || "sem-data";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([dateKey, groupItems]) => {
    const label = dateKey === "sem-data" ? "Sem data definida" : formatItemDate(dateKey);
    const rows = groupItems.map((item) => {
      const photos = itemPhotosFromRaw(item);
      const thumb = photos.length
        ? `<img src="${photos[0]}" alt="" onerror="this.parentElement.innerHTML=''">`
        : "";
      const meta = [item.category, item.year].filter(Boolean).join(" · ");
      return `<div class="timeline-item" onclick="openDetail('${item.id}')"><div class="timeline-thumb">${thumb}</div><div class="timeline-copy"><strong>${escapeHtml(item.name || "Item")}</strong><small>${escapeHtml(meta || item.description || "")}</small></div></div>`;
    }).join("");
    return `<section class="timeline-group"><h4>${escapeHtml(label)}</h4>${rows}</section>`;
  }).join("");
}

function renderCategoryItemsView(linked) {
  const container = $("categoryDetailItems");
  if (!container) return;
  const mode = getCategoryViewMode();
  container.className = `category-detail-items category-view-${mode}${mode === "lista" ? " cards-grid" : ""}`;
  if (!linked.length) {
    container.innerHTML = '<div class="empty"><span class="empty-symbol">◇</span><strong>Nenhum item nesta categoria.</strong><p>Use “Adicionar item” para cadastrar o primeiro.</p></div>';
    return;
  }
  switch (mode) {
    case "vitrine":
      container.innerHTML = linked.map(vitrineCard).join("");
      break;
    case "estante":
      container.innerHTML = renderShelfView(linked);
      break;
    case "timeline":
      container.innerHTML = renderTimelineView(linked);
      break;
    case "lista":
    default:
      container.innerHTML = linked.map(itemCard).join("");
      break;
  }
}

function searchItemsGlobally(terms) {
  if (!terms.length) return [];
  return sortCatalogItems(items.filter((item) => itemMatchesSearchTerms(item, terms)), "newest");
}

function globalSearchResultCard(item) {
  const excerptSource = item.memory || item.description || item.notes || item.storageLocation || "";
  const excerpt = String(excerptSource).trim();
  const tags = [item.category, item.relatedPerson, item.storageLocation].filter(Boolean).slice(0, 3);
  return `<button type="button" class="global-search-result" data-item-id="${escapeHtml(item.id)}"><h4>${escapeHtml(item.name || "Item sem nome")}</h4><p>${escapeHtml(excerpt ? (excerpt.length > 120 ? `${excerpt.slice(0, 120)}…` : excerpt) : "Sem descrição")}</p>${tags.length ? `<div class="global-search-result-meta">${tags.map((tag) => `<span class="global-search-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}</button>`;
}

function renderGlobalSearchResults() {
  const box = $("globalSearchResults");
  const hint = $("globalSearchHint");
  if (!box) return;
  const terms = parseSearchTerms($("globalSearchInput")?.value);
  if (!terms.length) {
    if (hint) {
      hint.hidden = false;
      hint.textContent = "Digite para buscar em todos os itens do acervo.";
    }
    box.innerHTML = "";
    return;
  }
  const results = searchItemsGlobally(terms);
  if (hint) {
    hint.hidden = false;
    hint.textContent = results.length
      ? `${results.length} resultado(s) encontrado(s).`
      : "Nenhum item encontrado para esta busca.";
  }
  box.innerHTML = results.length ? results.map(globalSearchResultCard).join("") : "";
}

function openGlobalSearchDialog() {
  const dialog = $("globalSearchDialog");
  if (!dialog) return;
  globalSearchState.isOpen = true;
  if ($("globalSearchInput")) $("globalSearchInput").value = "";
  renderGlobalSearchResults();
  lockPageScroll();
  dialog.showModal();
  setTimeout(() => $("globalSearchInput")?.focus(), 80);
}

function finishGlobalSearchClose() {
  if (!globalSearchState.isOpen) return;
  globalSearchState.isOpen = false;
  unlockPageScroll();
  if ($("globalSearchResults")) $("globalSearchResults").innerHTML = "";
  if ($("globalSearchInput")) $("globalSearchInput").value = "";
  if ($("globalSearchHint")) {
    $("globalSearchHint").hidden = false;
    $("globalSearchHint").textContent = "Digite para buscar em todos os itens do acervo.";
  }
}

function closeGlobalSearchDialog() {
  const dialog = $("globalSearchDialog");
  if (!dialog?.open) return;
  dialog.close();
}

function setupGlobalSearchDialog() {
  $("openGlobalSearchBtn")?.addEventListener("click", openGlobalSearchDialog);
  $("closeGlobalSearchBtn")?.addEventListener("click", closeGlobalSearchDialog);
  $("globalSearchDialog")?.addEventListener("close", finishGlobalSearchClose);
  $("globalSearchInput")?.addEventListener("input", renderGlobalSearchResults);
  $("globalSearchResults")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".global-search-result[data-item-id]");
    if (!btn) return;
    const itemId = btn.dataset.itemId;
    closeGlobalSearchDialog();
    openDetail(itemId);
  });
}

const memoryAudioRecorderState = {
  recorder: null,
  stream: null,
  chunks: [],
  startTime: 0,
  recording: false
};

function getSupportedAudioMimeType() {
  if (!window.MediaRecorder?.isTypeSupported) return "";
  const types = ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function formatAudioDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function setMemoryAudioStatus(message, { recording = false, hidden = false } = {}) {
  const status = $("memoryAudioStatus");
  if (!status) return;
  status.hidden = hidden && !message;
  status.textContent = message || "";
  status.classList.toggle("is-recording", recording);
}

function updateMemoryAudioRecordBtn() {
  const btn = $("recordMemoryAudioBtn");
  if (!btn) return;
  btn.textContent = memoryAudioRecorderState.recording ? "Parar gravação" : "Gravar áudio";
  btn.classList.toggle("is-recording", memoryAudioRecorderState.recording);
  btn.setAttribute("aria-pressed", String(memoryAudioRecorderState.recording));
}

async function stopMemoryAudioStream() {
  memoryAudioRecorderState.stream?.getTracks?.().forEach((track) => track.stop());
  memoryAudioRecorderState.stream = null;
}

function renderMemoryAudioList() {
  const box = $("memoryAudioList");
  if (!box) return;
  if (!currentMemoryAudios.length) {
    box.innerHTML = '<div class="memory-audio-empty">Nenhuma memória em áudio gravada.</div>';
    return;
  }
  box.innerHTML = currentMemoryAudios.map((audio) => `
    <div class="memory-audio-row">
      <audio controls playsinline preload="metadata" src="${audio.dataUrl}"></audio>
      <div class="memory-audio-meta">
        <strong>${escapeHtml(audio.name)}</strong>
        <small>${formatAudioDuration(audio.duration)} · ${formatFileSize(audio.size)} · ${new Date(audio.addedAt).toLocaleDateString("pt-BR")}</small>
      </div>
      <button type="button" class="text-action remove-memory-audio-btn" data-audio-id="${escapeHtml(audio.id)}">Remover</button>
    </div>
  `).join("");
}

async function blobToDataUrl(blob) {
  const file = new File([blob], `memoria-audio-${Date.now()}`, { type: blob.type || "audio/webm" });
  return fileToDataUrl(file);
}

async function finalizeMemoryAudioRecording() {
  const { recorder, chunks, startTime } = memoryAudioRecorderState;
  const mimeType = recorder?.mimeType || getSupportedAudioMimeType() || "audio/webm";
  const blob = new Blob(chunks, { type: mimeType });
  memoryAudioRecorderState.recorder = null;
  memoryAudioRecorderState.chunks = [];
  memoryAudioRecorderState.recording = false;
  memoryAudioRecorderState.startTime = 0;
  await stopMemoryAudioStream();
  updateMemoryAudioRecordBtn();
  if (!blob.size) {
    setMemoryAudioStatus("Nenhum áudio foi capturado. Tente gravar novamente.");
    return;
  }
  try {
    const dataUrl = await blobToDataUrl(blob);
    const duration = Math.max(0, Math.round((Date.now() - startTime) / 1000));
    currentMemoryAudios.push(normalizeMemoryAudio({
      id: uid(),
      name: `Memória em áudio ${currentMemoryAudios.length + 1}`,
      type: mimeType,
      size: blob.size,
      duration,
      addedAt: new Date().toISOString(),
      dataUrl
    }));
    renderMemoryAudioList();
    setMemoryAudioStatus("Áudio gravado. Revise e salve o item para manter a memória.");
  } catch (error) {
    console.error(error);
    setMemoryAudioStatus("Não foi possível salvar o áudio gravado. Tente novamente.");
  }
}

async function startMemoryAudioRecording() {
  if (!window.MediaRecorder) {
    setMemoryAudioStatus("Seu navegador não suporta gravação de áudio. Use outro navegador ou anexe um arquivo de áudio manualmente, se disponível.");
    return;
  }
  const mimeType = getSupportedAudioMimeType();
  if (!mimeType) {
    setMemoryAudioStatus("Este navegador não oferece um formato de áudio compatível para gravação.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setMemoryAudioStatus("Gravação de áudio indisponível neste dispositivo.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    memoryAudioRecorderState.stream = stream;
    memoryAudioRecorderState.chunks = [];
    memoryAudioRecorderState.startTime = Date.now();
    const recorder = new MediaRecorder(stream, { mimeType });
    memoryAudioRecorderState.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size) memoryAudioRecorderState.chunks.push(event.data);
    };
    recorder.onstop = () => { finalizeMemoryAudioRecording().catch(console.error); };
    recorder.onerror = () => {
      setMemoryAudioStatus("Não foi possível gravar o áudio. Tente novamente.");
      memoryAudioRecorderState.recording = false;
      updateMemoryAudioRecordBtn();
      stopMemoryAudioStream();
    };
    recorder.start();
    memoryAudioRecorderState.recording = true;
    updateMemoryAudioRecordBtn();
    setMemoryAudioStatus("Gravando… toque em “Parar gravação” quando terminar.", { recording: true });
  } catch (error) {
    console.error(error);
    await stopMemoryAudioStream();
    memoryAudioRecorderState.recording = false;
    updateMemoryAudioRecordBtn();
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      setMemoryAudioStatus("Permissão do microfone negada. Libere o microfone nas configurações do navegador para gravar.");
      return;
    }
    setMemoryAudioStatus("Não foi possível acessar o microfone. Tente novamente.");
  }
}

function stopMemoryAudioRecording() {
  const { recorder } = memoryAudioRecorderState;
  if (!recorder || recorder.state === "inactive") return;
  memoryAudioRecorderState.recording = false;
  updateMemoryAudioRecordBtn();
  setMemoryAudioStatus("Finalizando gravação...");
  recorder.stop();
}

function setupMemoryAudioRecorder() {
  $("recordMemoryAudioBtn")?.addEventListener("click", () => {
    if (memoryAudioRecorderState.recording) stopMemoryAudioRecording();
    else startMemoryAudioRecording();
  });
  $("memoryAudioList")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-memory-audio-btn");
    if (!btn?.dataset.audioId) return;
    currentMemoryAudios = currentMemoryAudios.filter((audio) => audio.id !== btn.dataset.audioId);
    renderMemoryAudioList();
  });
  renderMemoryAudioList();
}

async function processPhotoCaptureForItem(files, options = {}) {
  const result = await addPhotosFromFiles(files, options);
  return result;
}

function isItemOwned(item) {
  if (Object.prototype.hasOwnProperty.call(item, "owned")) return !!item.owned;
  return !item.desired;
}

function isItemDesired(item) {
  return !!item.desired && !isItemOwned(item);
}

function itemMatchesClassification(item, classification) {
  switch (classification) {
    case "favorite": return !!item.favorite;
    case "desired": return isItemDesired(item);
    case "owned": return isItemOwned(item);
    case "rare": return !!item.rare;
    case "all":
    default: return true;
  }
}

function parseLocalDateStart(dateStr) {
  const parts = String(dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

function parseLocalDateEnd(dateStr) {
  const parts = String(dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
}

function getItemCreatedTime(item) {
  const raw = item.createdAt;
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

function itemMatchesPeriod(item, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const created = getItemCreatedTime(item);
  if (created === null) return false;
  if (dateFrom) {
    const start = parseLocalDateStart(dateFrom);
    if (!start || created < start.getTime()) return false;
  }
  if (dateTo) {
    const end = parseLocalDateEnd(dateTo);
    if (!end || created > end.getTime()) return false;
  }
  return true;
}

function readCatalogFormFilters() {
  return {
    terms: parseSearchTerms($("catalogTermsInput")?.value),
    categoryId: $("categoryFilter")?.value || "",
    classification: $("classificationFilter")?.value || "all",
    dateFrom: $("catalogDateFrom")?.value || "",
    dateTo: $("catalogDateTo")?.value || ""
  };
}

function applyCatalogFilters() {
  const form = readCatalogFormFilters();
  if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
    alert("A data inicial não pode ser posterior à data final.");
    return;
  }
  catalogAppliedFilters = form;
  catalogHasSearched = true;
  renderCatalog();
}

function resetCatalogFilters({ render = true, clearResults = true } = {}) {
  if ($("catalogTermsInput")) $("catalogTermsInput").value = "";
  if ($("categoryFilter")) $("categoryFilter").value = "";
  if ($("classificationFilter")) $("classificationFilter").value = "all";
  if ($("catalogDateFrom")) $("catalogDateFrom").value = "";
  if ($("catalogDateTo")) $("catalogDateTo").value = "";
  catalogAppliedFilters = { terms: [], categoryId: "", classification: "all", dateFrom: "", dateTo: "" };
  if (clearResults) catalogHasSearched = false;
  if (render) renderCatalog();
}

function renderHome() {
  updateHomeGreeting();
  const grouped = getCategoryGroups();
  const box = $("homeCategoryCards");
  if (box) box.innerHTML = grouped.length ? grouped.map(homeCategoryCard).join("") : homeCategoriesEmptyHtml();
  const recent = [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 8);
  $("recentItems").innerHTML = recent.length ? recent.map(recentCard).join("") : emptyHtml();
}

function catalogListEmptyHtml() {
  if (!items.length) return emptyHtml();
  if (!catalogHasSearched) {
    return '<div class="empty"><span class="empty-symbol">⌕</span><strong>Defina os critérios e toque em Pesquisar.</strong><p>Use Termos, Categoria, Classificação e Período para localizar itens do acervo.</p></div>';
  }
  return '<div class="empty"><span class="empty-symbol">◇</span><strong>Nenhum item encontrado para os critérios selecionados.</strong><p>Ajuste os filtros e toque em Pesquisar novamente.</p></div>';
}

function filterItems() {
  const { terms, categoryId, classification, dateFrom, dateTo } = catalogAppliedFilters;
  return items.filter((item) => itemMatchesSearchTerms(item, terms)
    && itemBelongsToCategory(item, categoryId)
    && itemMatchesClassification(item, classification)
    && itemMatchesPeriod(item, dateFrom, dateTo));
}

function getCatalogSelection() {
  return sortCatalogItems(filterItems(), "newest");
}

function renderCatalog() {
  const box = $("catalogItems");
  box.className = `cards-grid ${gridMode === "list" ? "item-list" : ""}`;
  if (!catalogHasSearched) {
    box.innerHTML = catalogListEmptyHtml();
    $("selectionCount").textContent = "0";
    $("selectionValue").textContent = money(0);
    return;
  }
  const filtered = getCatalogSelection();
  box.innerHTML = filtered.length ? filtered.map(itemCard).join("") : catalogListEmptyHtml();
  $("selectionCount").textContent = filtered.length;
  $("selectionValue").textContent = money(filtered.reduce((sum, i) => sum + Number(i.estimatedValue || 0), 0));
}

function renderCategories() {
  const grouped = getCategoryGroups().sort((a, b) => b.count - a.count);
  const cats = grouped.map((g) => g.cat);
  $("categoriesTotal").textContent = cats.length;
  $("categoryCards").innerHTML = grouped.length ? grouped.map(({ cat, category, count: groupLength }) => {
    const initials = categoryInitials(cat);
    const media = category.image
      ? `<button type="button" class="category-cover category-cover-open" onclick="openCategoryDetail('${category.id}')" aria-label="Abrir categoria ${escapeHtml(cat)}"><img src="${category.image}" alt="" onerror="this.closest('.category-cover').classList.add('category-cover-empty');this.remove()"></button>`
      : `<button type="button" class="category-cover category-cover-open category-cover-empty" onclick="openCategoryDetail('${category.id}')" aria-label="Abrir categoria ${escapeHtml(cat)}"></button>`;
    return `<article class="category-card">${media}<div class="category-card-content"><div class="category-title-row"><span class="category-symbol" aria-hidden="true">${escapeHtml(initials)}</span><h4 class="category-title-name">${escapeHtml(cat)}</h4><span class="category-count">(${formatItemCount(groupLength)})</span></div><div class="category-card-actions"><button type="button" class="secondary-btn" onclick="openCategoryDetail('${category.id}')">Abrir</button><button type="button" class="primary-btn" onclick="addItemFromCategory('${category.id}')">Adicionar item</button><button type="button" class="text-action" onclick="openCategoryEditor('${category.id}')">Editar</button></div></div></article>`;
  }).join("") : emptyHtml();
}

function openCategoryCreator() {
  editingCategoryId = "";
  categoryDraftImage = "";
  categoryDraftAttachments = [];
  categoryDraftCustomFields = [];
  categoryDetailState.resumeAfterEdit = null;
  if ($("categoryEditingId")) $("categoryEditingId").value = "";
  if ($("categoryNameInput")) $("categoryNameInput").value = "";
  if ($("categoryDialogTitle")) $("categoryDialogTitle").textContent = "Nova categoria";
  if ($("deleteCategoryBtn")) $("deleteCategoryBtn").hidden = true;
  renderCategoryImagePreview();
  renderCategoryAttachmentList();
  renderCategoryCustomFieldsEditor();
  $("categoryDialog")?.showModal();
}

function openCategoryEditor(id) {
  const category = categories.find((c) => c.id === id);
  if (!category) return;
  editingCategoryId = category.id;
  categoryDraftImage = category.image || "";
  categoryDraftAttachments = (category.attachments || []).map(normalizeAttachment);
  categoryDraftCustomFields = normalizeCustomFields(category.customFields);
  if ($("categoryEditingId")) $("categoryEditingId").value = category.id;
  if ($("categoryNameInput")) $("categoryNameInput").value = category.name || "";
  if ($("categoryDialogTitle")) $("categoryDialogTitle").textContent = "Editar categoria";
  if ($("deleteCategoryBtn")) $("deleteCategoryBtn").hidden = false;
  renderCategoryImagePreview();
  renderCategoryAttachmentList();
  renderCategoryCustomFieldsEditor();
  $("categoryDialog")?.showModal();
}

async function applyCategoryCoverFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return alert("Selecione uma imagem válida.");
  categoryDraftImage = await fileToDataUrl(file);
  renderCategoryImagePreview();
}

function finishCategoryDetailClose() {
  if (!categoryDetailState.isOpen) return;
  categoryDetailState.isOpen = false;
  unlockPageScroll();
}

function closeCategoryDetailDialog() {
  const dialog = $("categoryDetailDialog");
  if (!dialog?.open) return;
  dialog.close();
}

function populateCategoryDetailContent(categoryId) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return false;
  const linked = items.filter((item) => itemBelongsToCategory(item, categoryId));
  if ($("categoryDetailTitle")) $("categoryDetailTitle").textContent = category.name;
  if ($("categoryDetailCount")) $("categoryDetailCount").textContent = formatItemCount(linked.length);
  const categoryTotal = linked.reduce((sum, i) => sum + Number(i.estimatedValue || 0), 0);
  const valueCard = $("categoryDetailValueCard");
  const showValue = hasPositiveMoney(categoryTotal);
  if ($("categoryDetailValue")) $("categoryDetailValue").textContent = money(categoryTotal);
  if (valueCard) valueCard.hidden = !showValue;
  valueCard?.closest(".category-detail-summary")?.classList.toggle("has-estimated-value", showValue);
  if ($("categoryDetailCover")) {
    $("categoryDetailCover").innerHTML = category.image
      ? `<img src="${category.image}" alt="Capa de ${escapeHtml(category.name)}" onerror="this.closest('.category-detail-cover')?.classList.add('is-empty');this.remove()">`
      : "";
    $("categoryDetailCover").classList.toggle("is-empty", !category.image);
  }
  if ($("categoryDetailItems")) renderCategoryItemsView(linked);
  updateCategoryViewSwitcherUI();
  if ($("categoryDetailAddBtn")) $("categoryDetailAddBtn").onclick = () => addItemFromCategory(categoryId);
  if ($("categoryDetailEditBtn")) {
    $("categoryDetailEditBtn").onclick = () => {
      categoryDetailState.resumeAfterEdit = {
        categoryId,
        scroll: $("categoryDetailScroll")?.scrollTop ?? 0
      };
      closeCategoryDetailDialog();
      openCategoryEditor(categoryId);
    };
  }
  if ($("categoryDetailPdfBtn")) {
    $("categoryDetailPdfBtn").onclick = () => generateCategoryPdf(categoryId);
  }
  return true;
}

function openCategoryDetail(categoryId, options = {}) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return;
  activeCategoryDetailId = categoryId;
  if (options.preservePageScroll) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "categoriesView"));
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.go === "categoriesView"));
    renderCategories();
  } else {
    showView("categoriesView");
  }
  if (!populateCategoryDetailContent(categoryId)) return;
  const scrollEl = $("categoryDetailScroll");
  if (scrollEl) scrollEl.scrollTop = options.restoreItemsScroll ?? 0;
  categoryDetailState.isOpen = true;
  lockPageScroll();
  $("categoryDetailDialog")?.showModal();
}

function requestDeleteCategory() {
  if (!editingCategoryId) return;
  const category = categories.find((c) => c.id === editingCategoryId);
  if (!category) return alert("Esta categoria não foi encontrada.");
  const linkedCount = items.filter((item) => itemBelongsToCategory(item, editingCategoryId)).length;
  if (linkedCount > 0) {
    alert(`Esta categoria possui ${linkedCount} item(ns). Mova ou exclua esses itens antes de excluir a categoria.`);
    return;
  }
  if ($("deleteCategoryDialogMessage")) {
    $("deleteCategoryDialogMessage").textContent = `Deseja excluir a categoria “${category.name}”? Essa ação removerá a capa vinculada e não poderá ser desfeita.`;
  }
  categoryDetailState.pendingDeleteId = editingCategoryId;
  $("deleteCategoryDialog")?.showModal();
}

async function deleteCategory(categoryId) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    alert("Esta categoria não foi encontrada.");
    return false;
  }
  const linkedCount = items.filter((item) => itemBelongsToCategory(item, categoryId)).length;
  if (linkedCount > 0) {
    alert(`Esta categoria possui ${linkedCount} item(ns). Mova ou exclua esses itens antes de excluir a categoria.`);
    return false;
  }
  try {
    categories = categories.filter((c) => c.id !== categoryId);
    await VMStorage.replaceAll("categories", categories);
    if (activeCategoryDetailId === categoryId) activeCategoryDetailId = "";
    renderCategories();
    renderHome();
    updateCategoryControls();
    renderCatalog();
    renderReports();
    renderStatsDashboard();
    return true;
  } catch (error) {
    console.error(error);
    alert("Não foi possível excluir esta categoria. Tente novamente.");
    return false;
  }
}

function setupCategoryDetailDialog() {
  const dialog = $("categoryDetailDialog");
  $("closeCategoryDetailBtn")?.addEventListener("click", () => closeCategoryDetailDialog());
  dialog?.addEventListener("close", finishCategoryDetailClose);
  $("categoryViewSwitcher")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".category-view-btn[data-category-view]");
    if (!btn) return;
    setCategoryViewMode(btn.dataset.categoryView);
    if (activeCategoryDetailId) {
      const linked = items.filter((item) => itemBelongsToCategory(item, activeCategoryDetailId));
      renderCategoryItemsView(linked);
    }
  });
}

function setupDeleteCategoryDialog() {
  $("deleteCategoryBtn")?.addEventListener("click", () => requestDeleteCategory());
  $("cancelDeleteCategoryBtn")?.addEventListener("click", () => {
    categoryDetailState.pendingDeleteId = null;
    $("deleteCategoryDialog")?.close();
  });
  $("deleteCategoryDialog")?.addEventListener("cancel", (e) => {
    e.preventDefault();
    categoryDetailState.pendingDeleteId = null;
    $("deleteCategoryDialog")?.close();
  });
  $("confirmDeleteCategoryBtn")?.addEventListener("click", async () => {
    const categoryId = categoryDetailState.pendingDeleteId;
    categoryDetailState.pendingDeleteId = null;
    $("deleteCategoryDialog")?.close();
    if (!categoryId) return;
    const deleted = await deleteCategory(categoryId);
    if (!deleted) return;
    categoryDetailState.resumeAfterEdit = null;
    editingCategoryId = "";
    $("categoryDialog")?.close();
    closeCategoryDetailDialog();
  });
}

function addItemFromCategory(categoryId) {
  const categoryName = getCategoryNameById(categoryId);
  if (!categoryName) return;
  closeCategoryDetailDialog();
  clearForm();
  syncCategoryComboboxCommitted(categoryName);
  handleItemCategoryChange(categoryName, { force: true });
  showView("addView");
}

function renderCategoryImagePreview() {
  if (!$("categoryImagePreview")) return;
  $("categoryImagePreview").innerHTML = categoryDraftImage
    ? `<img src="${categoryDraftImage}" alt="Imagem da categoria" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>Imagem indisponível</span>`
    : '<span>Sem capa</span>';
}

async function saveCategoryMedia() {
  const name = $("categoryNameInput")?.value.trim() || "";
  if (!name) return alert("Informe o nome da categoria.");
  const duplicate = categories.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId);
  if (duplicate) return alert("Já existe uma categoria com este nome.");
  if (!validateCategoryDraftCustomFields()) return;

  const resume = categoryDetailState.resumeAfterEdit;
  const savedCategoryId = editingCategoryId;
  const customFields = normalizeCustomFields(categoryDraftCustomFields);
  let renamedItems = false;

  if (editingCategoryId) {
    const index = categories.findIndex((c) => c.id === editingCategoryId);
    if (index < 0) return;
    const previousName = categories[index].name;
    categories[index] = normalizeCategory({
      ...categories[index],
      name,
      image: categoryDraftImage,
      attachments: categoryDraftAttachments,
      customFields,
      updatedAt: new Date().toISOString()
    });
    if (previousName !== name) {
      items.forEach((item) => {
        if (item.category === previousName) item.category = name;
      });
      renamedItems = true;
    }
  } else {
    const created = normalizeCategory({
      name,
      image: categoryDraftImage,
      attachments: categoryDraftAttachments,
      customFields,
      updatedAt: new Date().toISOString()
    });
    categories.push(created);
    categoryDetailState.resumeAfterEdit = null;
  }

  categories.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  if (renamedItems) await saveItems();
  else await VMStorage.replaceAll("categories", categories);
  renderCategories();
  renderHome();
  updateCategoryControls();
  renderCatalog();
  renderReports();
  renderStatsDashboard();
  editingCategoryId = "";
  categoryDraftCustomFields = [];
  if ($("deleteCategoryBtn")) $("deleteCategoryBtn").hidden = true;
  $("categoryDialog")?.close();

  if ($("addView")?.classList.contains("active")) {
    const selectedCategory = $("category")?.value || "";
    if (selectedCategory) handleItemCategoryChange(selectedCategory, { force: true });
  }

  const returnCategoryId = resume?.categoryId || savedCategoryId;
  if (returnCategoryId && categories.some((c) => c.id === returnCategoryId)) {
    categoryDetailState.resumeAfterEdit = null;
    openCategoryDetail(returnCategoryId, { preservePageScroll: true, restoreItemsScroll: resume?.scroll ?? 0 });
  }
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
  const current = $("categoryFilter")?.value || "";
  if ($("categoryFilter")) {
    $("categoryFilter").innerHTML = '<option value="">Todas</option>' + entries.map(({ id, name }) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("");
    const validIds = new Set(entries.map((entry) => entry.id));
    const legacyNameMatch = entries.find((entry) => entry.name === current)?.id || "";
    $("categoryFilter").value = validIds.has(current) ? current : legacyNameMatch;
  }
  if (categoryComboboxState.open) renderCategoryComboboxMenu();
}

function renderAll() {
  updateCategoryControls();
  renderHome();
  renderCatalog();
  renderCategories();
  renderReports();
  renderStatsDashboard();
}

function getPhotoSlotsRemaining() {
  return Math.max(0, MAX_ITEM_PHOTOS - currentPhotos.length);
}

function canAddMorePhotos(count = 1) {
  return getPhotoSlotsRemaining() >= count;
}

function updatePhotoLimitMessage(extraMessage = "") {
  const msg = $("photoLimitMsg");
  if (!msg) return;
  const atLimit = currentPhotos.length >= MAX_ITEM_PHOTOS;
  msg.hidden = !atLimit && !extraMessage;
  msg.textContent = extraMessage || "Limite de 5 fotos atingido.";
}

function updateMediaMenuPhotoOptions() {
  const canAdd = canAddMorePhotos();
  ["mediaTakePhotoBtn", "mediaGalleryBtn"].forEach((id) => {
    const btn = $(id);
    if (btn) {
      btn.disabled = !canAdd;
      btn.setAttribute("aria-disabled", String(!canAdd));
    }
  });
}

async function addPhotosFromFiles(files, { source = "picker" } = {}) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    if (source === "picker" && files.length) alert("Selecione um arquivo de imagem válido.");
    return { added: 0, skipped: files.length };
  }
  const remaining = getPhotoSlotsRemaining();
  if (remaining <= 0) {
    updatePhotoLimitMessage();
    return { added: 0, skipped: imageFiles.length };
  }
  const accepted = imageFiles.slice(0, remaining);
  const skipped = imageFiles.length - accepted.length;
  for (const file of accepted) {
    try {
      currentPhotos.push(await fileToDataUrl(file));
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar uma das imagens selecionadas.");
    }
  }
  renderPhotoThumbGrid();
  updatePhotoLimitMessage(skipped > 0 ? `Limite de 5 fotos atingido. ${accepted.length} imagem(ns) adicionada(s).` : "");
  updateMediaMenuPhotoOptions();
  return { added: accepted.length, skipped };
}

const pageScrollLock = { depth: 0, scrollY: 0 };

const photoViewerState = {
  photos: [],
  index: 0,
  triggerEl: null,
  touchStartX: 0,
  touchStartY: 0,
  touchActive: false,
  swiping: false
};

const itemDetailState = {
  isOpen: false,
  returnContext: null,
  triggerEl: null,
  categoryItemsScrollTop: 0,
  currentItemId: null,
  resumeAfterEdit: null,
  pendingDeleteId: null
};

function preloadViewerPhotos(index) {
  [index - 1, index + 1].forEach((slot) => {
    const src = photoViewerState.photos[slot];
    if (!src) return;
    const img = new Image();
    img.src = src;
  });
}

function updatePhotoViewerChrome() {
  const total = photoViewerState.photos.length;
  const index = photoViewerState.index;
  const counter = $("photoViewerCounter");
  const prev = $("photoViewerPrev");
  const next = $("photoViewerNext");
  const dots = $("photoViewerDots");
  const multi = total > 1;

  if (counter) {
    counter.hidden = !multi;
    counter.textContent = `${index + 1} de ${total}`;
  }
  if (prev) {
    prev.hidden = !multi;
    prev.disabled = index <= 0;
  }
  if (next) {
    next.hidden = !multi;
    next.disabled = index >= total - 1;
  }
  if (dots) {
    dots.hidden = !multi;
    dots.innerHTML = multi
      ? photoViewerState.photos.map((_, i) => `<button type="button" class="photo-viewer-dot${i === index ? " is-active" : ""}" aria-label="Ir para foto ${i + 1}" onclick="goToViewerPhoto(${i})"></button>`).join("")
      : "";
  }

  $("photoViewerTrack")?.querySelectorAll(".photo-viewer-slide").forEach((slide, i) => {
    slide.setAttribute("aria-hidden", String(i !== index));
  });
}

function updatePhotoViewerTrack(animate = true) {
  const track = $("photoViewerTrack");
  if (!track) return;
  track.style.transition = animate ? "transform 220ms ease" : "none";
  track.style.transform = `translate3d(-${photoViewerState.index * 100}%, 0, 0)`;
  updatePhotoViewerChrome();
  preloadViewerPhotos(photoViewerState.index);
}

function renderPhotoViewerSlides() {
  const track = $("photoViewerTrack");
  if (!track) return;
  const total = photoViewerState.photos.length;
  track.innerHTML = photoViewerState.photos.map((src, i) => `
    <div class="photo-viewer-slide" aria-hidden="${i !== photoViewerState.index}">
      <div class="photo-viewer-frame">
        <img src="${src}" alt="Foto ${i + 1} de ${total}" decoding="async" onerror="this.hidden=true;this.closest('.photo-viewer-slide')?.classList.add('is-error')">
        <div class="photo-viewer-error">Imagem indisponível</div>
      </div>
    </div>
  `).join("");
  updatePhotoViewerTrack(false);
}

function goToViewerPhoto(index, animate = true) {
  const max = photoViewerState.photos.length - 1;
  if (index < 0 || index > max || index === photoViewerState.index) return;
  photoViewerState.index = index;
  updatePhotoViewerTrack(animate);
}

function lockPageScroll() {
  if (pageScrollLock.depth === 0) {
    pageScrollLock.scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${pageScrollLock.scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }
  pageScrollLock.depth += 1;
}

function unlockPageScroll() {
  if (pageScrollLock.depth <= 0) return;
  pageScrollLock.depth -= 1;
  if (pageScrollLock.depth > 0) return;
  const y = pageScrollLock.scrollY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  window.scrollTo(0, y);
}

function closePhotoViewer() {
  const dialog = $("photoViewerDialog");
  if (!dialog?.open) return;
  dialog.close();
  unlockPageScroll();
  photoViewerState.photos = [];
  photoViewerState.index = 0;
  const trigger = photoViewerState.triggerEl;
  photoViewerState.triggerEl = null;
  trigger?.focus?.();
}

function openItemPhotoViewer(photos, startIndex = 0, triggerEl = null) {
  const list = (Array.isArray(photos) ? photos : []).map(String).filter(Boolean);
  if (!list.length) return;
  const dialog = $("photoViewerDialog");
  if (!dialog) return;

  photoViewerState.photos = list;
  photoViewerState.index = Math.min(Math.max(0, startIndex), list.length - 1);
  photoViewerState.triggerEl = triggerEl || document.activeElement;

  renderPhotoViewerSlides();
  lockPageScroll();
  dialog.showModal();
}

function openPhotoViewerForItem(itemId, startIndex = 0, triggerEl = null) {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return;
  openItemPhotoViewer(itemPhotosFromRaw(item), startIndex, triggerEl);
}

function openPhotoLightbox(index) {
  openItemPhotoViewer(currentPhotos, index, document.activeElement);
}

function renderDetailMedia(item) {
  const photos = itemPhotosFromRaw(item);
  const badges = itemBadges(item);
  if (!photos.length) {
    return `<div class="detail-media"><div class="detail-placeholder">Sem foto</div>${badges}</div>`;
  }
  const thumbs = photos.length > 1
    ? `<div class="detail-photo-thumbs">${photos.map((src, i) => `
        <button type="button" class="detail-photo-thumb${i === 0 ? " is-active" : ""}" onclick="openPhotoViewerForItem('${item.id}', ${i}, this)" aria-label="Ver foto ${i + 1} de ${photos.length}">
          <img src="${src}" alt="" onerror="this.closest('button')?.classList.add('is-error')">
        </button>`).join("")}</div>`
    : "";
  return `<div class="detail-media-wrap">
    <button type="button" class="detail-media-main" onclick="openPhotoViewerForItem('${item.id}', 0, this)" aria-label="Ampliar fotos de ${escapeHtml(item.name || "item")}">
      <img src="${photos[0]}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
      <div class="detail-placeholder" hidden>Imagem indisponível</div>
    </button>
    ${badges}
    ${thumbs}
  </div>`;
}

function setupItemDetailDialog() {
  const dialog = $("itemDetailDialog");
  $("closeItemDetailBtn")?.addEventListener("click", () => closeItemDetailDialog());
  dialog?.addEventListener("close", finishItemDetailClose);
}

function setupPhotoViewer() {
  const dialog = $("photoViewerDialog");
  const viewport = $("photoViewerViewport");
  if (!dialog || !viewport) return;

  $("closePhotoViewerBtn")?.addEventListener("click", closePhotoViewer);
  $("photoViewerPrev")?.addEventListener("click", () => goToViewerPhoto(photoViewerState.index - 1));
  $("photoViewerNext")?.addEventListener("click", () => goToViewerPhoto(photoViewerState.index + 1));

  dialog.addEventListener("close", () => {
    photoViewerState.photos = [];
    photoViewerState.index = 0;
    photoViewerState.triggerEl = null;
  });

  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closePhotoViewer();
  });

  dialog.addEventListener("keydown", (e) => {
    if (!dialog.open) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); goToViewerPhoto(photoViewerState.index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goToViewerPhoto(photoViewerState.index + 1); }
  });

  viewport.addEventListener("touchstart", (e) => {
    if (photoViewerState.photos.length <= 1 || e.touches.length !== 1) return;
    photoViewerState.touchStartX = e.touches[0].clientX;
    photoViewerState.touchStartY = e.touches[0].clientY;
    photoViewerState.touchActive = true;
    photoViewerState.swiping = false;
  }, { passive: true });

  viewport.addEventListener("touchmove", (e) => {
    if (!photoViewerState.touchActive || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - photoViewerState.touchStartX;
    const dy = e.touches[0].clientY - photoViewerState.touchStartY;
    if (!photoViewerState.swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      photoViewerState.swiping = true;
    }
    if (photoViewerState.swiping) e.preventDefault();
  }, { passive: false });

  viewport.addEventListener("touchend", (e) => {
    if (!photoViewerState.touchActive) return;
    const dx = e.changedTouches[0].clientX - photoViewerState.touchStartX;
    if (photoViewerState.swiping && Math.abs(dx) > 52) {
      if (dx < 0) goToViewerPhoto(photoViewerState.index + 1);
      else goToViewerPhoto(photoViewerState.index - 1);
    }
    photoViewerState.touchActive = false;
    photoViewerState.swiping = false;
  }, { passive: true });
}

function removeItemPhoto(index) {
  if (index < 0 || index >= currentPhotos.length) return;
  currentPhotos.splice(index, 1);
  renderPhotoThumbGrid();
  updatePhotoLimitMessage();
  updateMediaMenuPhotoOptions();
}

function renderPhotoThumbGrid() {
  const grid = $("photoThumbGrid");
  if (!grid) return;
  if (!currentPhotos.length) {
    grid.innerHTML = "";
    return;
  }
  grid.innerHTML = currentPhotos.map((src, index) => `
    <div class="photo-thumb-wrap">
      <button type="button" class="photo-thumb" onclick="openPhotoLightbox(${index})" aria-label="${index === 0 ? "Visualizar foto principal" : `Visualizar foto ${index + 1}`}">
        <img src="${src}" alt="${index === 0 ? "Foto principal" : `Foto ${index + 1}`}" onerror="this.closest('.photo-thumb-wrap')?.remove()">
        ${index === 0 ? '<span class="photo-thumb-badge">Principal</span>' : ""}
      </button>
      <button type="button" class="photo-thumb-remove" onclick="removeItemPhoto(${index})" aria-label="${index === 0 ? "Excluir foto principal" : `Excluir foto ${index + 1}`}">×</button>
    </div>
  `).join("");
}

function renderMediaSection() {
  renderPhotoThumbGrid();
  if ($("videoPreview")) $("videoPreview").innerHTML = currentVideo ? `<video src="${currentVideo}" controls playsinline></video>` : "";
  updatePhotoLimitMessage();
  updateMediaMenuPhotoOptions();
}

function clearForm() {
  $("itemForm").reset();
  $("editingId").value = "";
  currentPhotos = [];
  currentVideo = "";
  currentItemAttachments = [];
  currentMemoryAudios = [];
  itemCustomFieldValuesDraft = {};
  itemCustomFieldsBoundCategory = "";
  syncCategoryComboboxCommitted("");
  $("formTitle").textContent = "Adicionar item";
  $("cancelEditBtn").hidden = true;
  if (memoryAudioRecorderState.recording) stopMemoryAudioRecording();
  setMemoryAudioStatus("", { hidden: true });
  renderMediaSection();
  renderItemAttachmentList();
  renderMemoryAudioList();
  renderItemCustomFields("");
}

const LEGACY_ITEM_FIELDS = ["subcategory", "condition", "serial", "notes", "freeMemoryText", "faceValue", "year", "country", "material"];

const ITEM_FORM_TEXT_FIELDS = [
  "name", "category", "brand", "description", "tags",
  "memory", "relatedPerson", "relatedPlace", "relatedEvent", "storageLocation",
  "eventDate", "connectedItems",
  "paidValue", "estimatedValue", "acquiredAt", "acquiredPlace"
];

function setAcquiredAtFormValue(value = "") {
  const normalized = String(value || "");
  if ($("acquiredAt")) $("acquiredAt").value = normalized;
  if ($("acquiredAtPrimary")) $("acquiredAtPrimary").value = normalized;
}

function syncAcquiredAtFields(sourceId) {
  const source = $(sourceId);
  if (!source) return;
  const targetId = sourceId === "acquiredAt" ? "acquiredAtPrimary" : "acquiredAt";
  const target = $(targetId);
  if (!target || target.value === source.value) return;
  target.value = source.value;
}

function setupAcquiredAtSync() {
  ["acquiredAt", "acquiredAtPrimary"].forEach((id) => {
    $(id)?.addEventListener("input", () => syncAcquiredAtFields(id));
    $(id)?.addEventListener("change", () => syncAcquiredAtFields(id));
  });
}

function readForm() {
  const existing = items.find((i) => i.id === $("editingId").value);
  const photos = [...currentPhotos];
  const desired = $("desired").checked;
  const payload = {
    id: $("editingId").value || uid(),
    paidValue: $("paidValue").value,
    estimatedValue: $("estimatedValue").value,
    favorite: $("favorite").checked,
    desired,
    rare: $("rare").checked,
    model: existing?.model || "",
    scale: existing?.scale || "",
    photos,
    photo: photos[0] || "",
    video: currentVideo,
    attachments: currentItemAttachments.map(normalizeAttachment),
    memoryAudios: currentMemoryAudios.map(normalizeMemoryAudio),
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  ITEM_FORM_TEXT_FIELDS.forEach((id) => {
    if (id === "name") return;
    if ($(id)) payload[id] = $(id).value?.trim?.() ?? $(id).value ?? "";
    else payload[id] = existing?.[id] ?? "";
  });
  // Preserva campos de memória ocultos da UI (legado) caso o input não exista no DOM
  ["relatedPerson", "relatedPlace", "relatedEvent", "storageLocation", "eventDate", "connectedItems"].forEach((field) => {
    if (!$(field)) payload[field] = existing?.[field] ?? "";
  });
  LEGACY_ITEM_FIELDS.forEach((field) => {
    payload[field] = existing?.[field] ?? "";
  });
  const customValues = collectItemCustomFieldValuesFromDom();
  payload.customFieldValues = normalizeCustomFieldValues({
    ...(existing?.customFieldValues || {}),
    ...customValues
  });
  const categoryName = payload.category || existing?.category || "";
  const existingName = String(existing?.name || "").trim();
  const hiddenName = String($("name")?.value || "").trim();
  payload.name = existingName || hiddenName || deriveItemNameFromCustomFields(categoryName, payload.customFieldValues);
  if ($("name")) $("name").value = payload.name;
  return normalizeItem(payload);
}

function fillForm(item) {
  ITEM_FORM_TEXT_FIELDS.forEach((id) => {
    if (id === "acquiredAt") return;
    if ($(id)) $(id).value = item[id] || "";
  });
  setAcquiredAtFormValue(item.acquiredAt || "");
  $("editingId").value = item.id;
  $("favorite").checked = !!item.favorite; $("desired").checked = !!item.desired; $("rare").checked = !!item.rare;
  currentPhotos = itemPhotosFromRaw(item);
  currentVideo = item.video || "";
  currentItemAttachments = (item.attachments || []).map(normalizeAttachment);
  currentMemoryAudios = (item.memoryAudios || []).map(normalizeMemoryAudio);
  itemCustomFieldValuesDraft = normalizeCustomFieldValues(item.customFieldValues);
  syncCategoryComboboxCommitted(item.category || "");
  $("formTitle").textContent = "Editar item";
  $("cancelEditBtn").hidden = false;
  if (memoryAudioRecorderState.recording) stopMemoryAudioRecording();
  setMemoryAudioStatus("", { hidden: true });
  renderMediaSection();
  renderItemAttachmentList();
  renderMemoryAudioList();
  handleItemCategoryChange(item.category || "", { force: true });
  showView("addView");
}

function formatItemDateTime(value) {
  if (!value) return "";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return String(value);
  return new Date(time).toLocaleString("pt-BR");
}

function formatItemDate(value) {
  if (!value) return "";
  const parts = String(value).split("-").map(Number);
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("pt-BR");
  }
  return formatItemDateTime(value);
}

function hasPositiveMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

function detailTableRow(label, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `<div><span>${escapeHtml(label)}</span>${escapeHtml(text)}</div>`;
}

function detailMoneyRow(label, value) {
  if (!hasPositiveMoney(value)) return "";
  return detailTableRow(label, money(value));
}

function detailDateRow(label, value) {
  const text = formatItemDate(value);
  if (!text) return "";
  return detailTableRow(label, text);
}

function detailStatusChips(item) {
  const chips = [];
  if (item.favorite) chips.push("Favorito");
  chips.push(isItemDesired(item) ? "Desejado" : "Possuído");
  if (item.rare) chips.push("Raro");
  return chips.length ? `<div class="detail-status-row">${chips.map((chip) => `<span class="detail-status-chip">${escapeHtml(chip)}</span>`).join("")}</div>` : "";
}

function buildDetailHtml(item, { categoryMode = false } = {}) {
  const media = renderDetailMedia(item);
  const memoryParts = [item.memory, item.freeMemoryText].map((part) => String(part || "").trim()).filter(Boolean);
  const memoryHtml = memoryParts.length
    ? `<div class="detail-memory-block"><h3>História e memória</h3><p class="detail-description">${escapeHtml(memoryParts.join("\n\n"))}</p></div>`
    : "";
  const memoryAudiosHtml = item.memoryAudios?.length
    ? `<section class="detail-album-section detail-memory-audio"><h3>Memórias em áudio</h3>${item.memoryAudios.map((audio) => `<div class="memory-audio-row"><audio controls playsinline preload="metadata" src="${audio.dataUrl}"></audio><small>${escapeHtml(audio.name)} · ${formatAudioDuration(audio.duration)}</small></div>`).join("")}</section>`
    : "";
  const descriptionHtml = item.description
    ? `<section class="detail-text-block"><h3>Descrição</h3><p class="detail-description">${escapeHtml(item.description)}</p></section>`
    : "";
  const connectionRows = [
    detailTableRow("Pessoa relacionada", item.relatedPerson),
    detailTableRow("Local relacionado", item.relatedPlace),
    detailTableRow("Evento relacionado", item.relatedEvent),
    detailTableRow("Itens conectados", item.connectedItems)
  ].filter(Boolean).join("");
  const connectionsHtml = connectionRows
    ? `<section class="detail-album-section"><h3>Pessoas, lugares e eventos</h3><div class="detail-table">${connectionRows}</div></section>`
    : "";
  const tableRows = [
    detailTableRow("Subcategoria", item.subcategory),
    detailTableRow("Marca/Produtor", item.brand),
    detailTableRow("Modelo", item.model),
    detailTableRow("Escala", item.scale),
    detailTableRow("Ano", item.year),
    detailTableRow("Estado de conservação", item.condition),
    detailMoneyRow("Valor pago", item.paidValue),
    detailMoneyRow("Valor estimado", item.estimatedValue),
    detailTableRow("Valor facial", item.faceValue),
    detailDateRow("Data de aquisição", item.acquiredAt),
    detailDateRow("Data do acontecimento", item.eventDate),
    detailTableRow("Local de aquisição", item.acquiredPlace),
    detailTableRow("Local de armazenamento", item.storageLocation),
    detailTableRow("Série / código", item.serial),
    detailTableRow("Tags", item.tags),
    detailTableRow("Cadastrado em", formatItemDateTime(item.createdAt)),
    detailTableRow("Atualizado em", formatItemDateTime(item.updatedAt)),
    ...buildCustomFieldDetailRows(item)
  ].filter(Boolean).join("");
  const tableHtml = tableRows ? `<section class="detail-album-section"><h3>Dados técnicos</h3><div class="detail-table">${tableRows}</div></section>` : "";
  const notesHtml = item.notes
    ? `<section class="detail-text-block"><h3>Observações</h3><p class="detail-description">${escapeHtml(item.notes)}</p></section>`
    : "";
  const files = item.attachments?.length
    ? `<section class="detail-attachments detail-album-section"><h3>Arquivos anexados</h3>${renderAttachmentRows(item.attachments, "item", item.id)}</section>`
    : "";
  const videoHtml = item.video ? `<video class="detail-video" src="${item.video}" controls playsinline></video>` : "";
  const actions = categoryMode
    ? `<div class="detail-actions detail-actions-primary"><button class="primary-btn" type="button" onclick="editItem('${item.id}')">Editar item</button><button class="ghost-btn danger-btn" type="button" onclick="requestDeleteItem('${item.id}')">Excluir item</button></div>`
    : `<div class="detail-actions"><button class="primary-btn" type="button" onclick="editItem('${item.id}')">Editar item</button><button class="secondary-btn" type="button" onclick="shareItem('${item.id}')">Compartilhar</button><button class="secondary-btn" type="button" onclick="printItem('${item.id}')">Gerar ficha/PDF</button><button class="ghost-btn danger-btn" type="button" onclick="requestDeleteItem('${item.id}')">Excluir item</button></div>`;
  const stackClass = categoryMode ? " detail-card-stack" : "";
  return `<article class="detail-card${stackClass}"><div class="detail-hero">${media}<div class="detail-info"><span class="eyebrow">${escapeHtml(item.category || "Coleção")}</span><h2>${escapeHtml(item.name || "Item sem nome")}</h2>${detailStatusChips(item)}${descriptionHtml}${memoryHtml}${memoryAudiosHtml}${videoHtml}${connectionsHtml}${tableHtml}${notesHtml}${files}${actions}</div></div></article>`;
}

function refreshItemDetailDialog(itemId) {
  const dialog = $("itemDetailDialog");
  if (!dialog?.open || !itemId) return;
  const item = items.find((entry) => entry.id === itemId);
  const contentEl = $("itemDetailContent");
  if (!item || !contentEl) return;
  const categoryMode = itemDetailState.returnContext?.type === "category";
  contentEl.innerHTML = buildDetailHtml(item, { categoryMode });
  itemDetailState.currentItemId = item.id;
}

function resumeCategoryItemView() {
  const resume = itemDetailState.resumeAfterEdit;
  if (!resume?.categoryId || !resume.itemId) return false;
  openCategoryDetail(resume.categoryId, { preservePageScroll: true, restoreItemsScroll: resume.scroll ?? 0 });
  const item = items.find((entry) => entry.id === resume.itemId);
  if (item) openItemDetailDialog(item, { type: "category", categoryId: resume.categoryId }, resume.triggerEl || null);
  itemDetailState.resumeAfterEdit = null;
  return true;
}

function finishItemDetailClose() {
  if (!itemDetailState.isOpen) return;
  itemDetailState.isOpen = false;
  unlockPageScroll();
  const ctx = itemDetailState.returnContext;
  const trigger = itemDetailState.triggerEl;
  const itemsScroll = itemDetailState.categoryItemsScrollTop;
  itemDetailState.returnContext = null;
  itemDetailState.triggerEl = null;
  itemDetailState.categoryItemsScrollTop = 0;
  itemDetailState.currentItemId = null;
  if ($("itemDetailContent")) $("itemDetailContent").innerHTML = "";
  if ($("itemDetailScroll")) $("itemDetailScroll").scrollTop = 0;
  if (ctx?.type === "category" && ctx.categoryId) {
    openCategoryDetail(ctx.categoryId, { preservePageScroll: true, restoreItemsScroll: itemsScroll });
  }
  trigger?.focus?.();
}

function closeItemDetailDialog() {
  const dialog = $("itemDetailDialog");
  if (!dialog?.open) return;
  dialog.close();
}

function openItemDetailDialog(item, returnContext, triggerEl = null) {
  const dialog = $("itemDetailDialog");
  const scrollEl = $("itemDetailScroll");
  const contentEl = $("itemDetailContent");
  if (!dialog || !scrollEl || !contentEl) return;
  itemDetailState.isOpen = true;
  itemDetailState.returnContext = returnContext;
  itemDetailState.triggerEl = triggerEl || document.activeElement;
  itemDetailState.currentItemId = item.id;
  const categoryMode = returnContext?.type === "category";
  contentEl.innerHTML = buildDetailHtml(item, { categoryMode });
  scrollEl.scrollTop = 0;
  lockPageScroll();
  dialog.showModal();
}

function openDetail(id) {
  const item = items.find((i) => i.id === id);
  if (!item) {
    alert("Este item não foi encontrado.");
    return;
  }
  const categoryDialog = $("categoryDetailDialog");
  if (categoryDialog?.open && activeCategoryDetailId) {
    itemDetailState.categoryItemsScrollTop = $("categoryDetailScroll")?.scrollTop ?? 0;
    closeCategoryDetailDialog();
    openItemDetailDialog(item, { type: "category", categoryId: activeCategoryDetailId }, document.activeElement);
    return;
  }
  $("detailContent").innerHTML = buildDetailHtml(item, { categoryMode: false });
  showView("detailView");
}

function editItem(id) {
  const item = items.find((i) => i.id === id);
  if (!item) {
    alert("Este item não foi encontrado.");
    return;
  }
  const dialogOpen = $("itemDetailDialog")?.open;
  const categoryCtx = dialogOpen && itemDetailState.returnContext?.type === "category"
    ? itemDetailState.returnContext
    : null;
  if (dialogOpen) {
    if (categoryCtx) {
      itemDetailState.resumeAfterEdit = {
        categoryId: categoryCtx.categoryId,
        itemId: id,
        scroll: itemDetailState.categoryItemsScrollTop,
        triggerEl: itemDetailState.triggerEl
      };
      itemDetailState.returnContext = null;
    } else {
      itemDetailState.resumeAfterEdit = null;
      itemDetailState.returnContext = null;
    }
    closeItemDetailDialog();
  }
  fillForm(item);
}

function requestDeleteItem(id) {
  if (!items.some((item) => item.id === id)) {
    alert("Este item não foi encontrado.");
    return;
  }
  itemDetailState.pendingDeleteId = id;
  $("deleteItemDialog")?.showModal();
}

async function deleteItem(id) {
  const item = items.find((i) => i.id === id);
  if (!item) {
    alert("Este item não foi encontrado.");
    return false;
  }
  const dialogOpen = $("itemDetailDialog")?.open;
  const categoryCtx = dialogOpen && itemDetailState.returnContext?.type === "category"
    ? itemDetailState.returnContext
    : null;
  const categoryId = categoryCtx?.categoryId || itemDetailState.resumeAfterEdit?.categoryId || null;
  const itemsScroll = itemDetailState.categoryItemsScrollTop;
  if (dialogOpen) {
    itemDetailState.returnContext = null;
    itemDetailState.resumeAfterEdit = null;
    closeItemDetailDialog();
  }
  try {
    items = items.filter((i) => i.id !== id);
    await saveItems();
    if (categoryId) {
      openCategoryDetail(categoryId, { preservePageScroll: true, restoreItemsScroll: itemsScroll });
    } else {
      showView("catalogView");
    }
    return true;
  } catch (error) {
    console.error(error);
    alert("Não foi possível excluir este item. Tente novamente.");
    if (categoryId) openCategoryDetail(categoryId, { preservePageScroll: true, restoreItemsScroll: itemsScroll });
    return false;
  }
}

function setupDeleteItemDialog() {
  $("cancelDeleteItemBtn")?.addEventListener("click", () => {
    itemDetailState.pendingDeleteId = null;
    $("deleteItemDialog")?.close();
  });
  $("deleteItemDialog")?.addEventListener("cancel", (e) => {
    e.preventDefault();
    itemDetailState.pendingDeleteId = null;
    $("deleteItemDialog")?.close();
  });
  $("confirmDeleteItemBtn")?.addEventListener("click", async () => {
    const id = itemDetailState.pendingDeleteId;
    itemDetailState.pendingDeleteId = null;
    $("deleteItemDialog")?.close();
    if (!id) return;
    await deleteItem(id);
  });
}
function shareItem(id) {
  const item = items.find((i) => i.id === id); if (!item) return;
  const text = `${APP_DISPLAY_NAME}\n${item.name}\nCategoria: ${item.category || "—"}\nValor estimado: ${money(item.estimatedValue)}`;
  if (navigator.share) navigator.share({ title: item.name, text }).catch(() => {}); else { navigator.clipboard?.writeText(text); alert("Resumo copiado para a área de transferência."); }
}
function printItem(id) {
  if ($("itemDetailDialog")?.open) {
    setTimeout(() => window.print(), 250);
    return;
  }
  openDetail(id);
  setTimeout(() => window.print(), 250);
}

function formatDisplayDate(dateStr) {
  const parts = String(dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return String(dateStr || "");
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("pt-BR");
}

function buildPdfItemDetailLines(item) {
  const lines = [];
  const pushText = (label, value) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    lines.push(`<p class="pdf-detail-line"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(text)}</p>`);
  };
  pushText("Marca/Produtor", item.brand);
  if (item.acquiredAt) pushText("Data de aquisição", formatItemDate(item.acquiredAt));
  pushText("Descrição", item.description);
  const definedFields = getAllCustomFieldsForCategoryName(item.category);
  const values = item.customFieldValues || {};
  const seen = new Set();
  definedFields.forEach((field) => {
    const display = formatCustomFieldDisplayValue(field, values[field.id]);
    if (!display) return;
    seen.add(field.id);
    pushText(field.label || "Campo", display);
  });
  Object.keys(values).forEach((fieldId) => {
    if (seen.has(fieldId)) return;
    const text = String(values[fieldId] || "").trim();
    if (!text) return;
    pushText("Campo personalizado", text);
  });
  pushText("Local de armazenamento", item.storageLocation);
  pushText("Local de aquisição", item.acquiredPlace);
  pushText("História", item.memory);
  pushText("Pessoa relacionada", item.relatedPerson);
  pushText("Local relacionado", item.relatedPlace);
  pushText("Evento relacionado", item.relatedEvent);
  if (hasPositiveMoney(item.estimatedValue)) pushText("Valor estimado", money(item.estimatedValue));
  if (hasPositiveMoney(item.paidValue)) pushText("Valor pago", money(item.paidValue));
  if (item.memoryAudios?.length) {
    lines.push(`<p class="pdf-detail-line"><strong>Memórias em áudio:</strong> ${item.memoryAudios.length} gravação(ões)</p>`);
  }
  if (item.attachments?.length) {
    lines.push(`<p class="pdf-detail-line"><strong>Anexos:</strong> ${item.attachments.length} arquivo(s)</p>`);
  }
  return lines.join("");
}

function buildCatalogPdfDocument(selectedItems, options = {}) {
  const {
    mode = "catalog",
    title = "Localizar itens",
    listSubtitle = "Catálogo em formato de lista",
    coverKicker = "Catálogo personalizado",
    categoryName = "",
    categoryImage = "",
    showFilters = true
  } = options;
  const personName = profile.name || "Seu nome";
  const profilePhoto = profile.photo || document.querySelector(".brand-logo")?.src || "";
  const appLogo = document.querySelector(".brand-logo")?.src || "";
  const generatedAt = new Date().toLocaleDateString("pt-BR");
  const termsLabel = catalogAppliedFilters.terms.length ? catalogAppliedFilters.terms.join(" ") : "Todos os termos";
  const classificationLabels = {
    all: "Todos",
    favorite: "Favoritos",
    desired: "Desejados",
    owned: "Possuídos",
    rare: "Raros"
  };
  const classificationLabel = classificationLabels[catalogAppliedFilters.classification] || "Todos";
  const filterCategoryLabel = getCategoryNameById(catalogAppliedFilters.categoryId) || "Todas";
  const periodLabel = catalogAppliedFilters.dateFrom || catalogAppliedFilters.dateTo
    ? `${catalogAppliedFilters.dateFrom ? formatDisplayDate(catalogAppliedFilters.dateFrom) : "—"} até ${catalogAppliedFilters.dateTo ? formatDisplayDate(catalogAppliedFilters.dateTo) : "—"}`
    : "Todo o período";
  const sortLabel = "Adicionados recentemente";
  const coverTitle = mode === "category" ? (categoryName || title) : title;
  const coverMeta = mode === "category"
    ? `${selectedItems.length} item(ns)<br>Gerado em ${generatedAt}`
    : `Termos: ${escapeHtml(termsLabel)}<br>Categoria: ${escapeHtml(filterCategoryLabel)}<br>Classificação: ${escapeHtml(classificationLabel)}<br>Período: ${escapeHtml(periodLabel)}<br>Ordem: ${escapeHtml(sortLabel)}<br>Gerado em ${generatedAt}`;
  const coverCategoryBox = `${selectedItems.length} item(ns)`;

  const rows = selectedItems.map((item, index) => {
    const image = item.photo
      ? `<img src="${item.photo}" alt="${escapeHtml(item.name)}">`
      : `<div class="item-no-image">VM</div>`;
    const markers = [item.favorite ? "Favorito" : "", item.desired ? "Desejado" : "Possuído", item.rare ? "Raro" : ""].filter(Boolean).join(" • ");
    const primaryMeta = [item.category, item.acquiredAt ? formatItemDate(item.acquiredAt) : item.year].filter(Boolean).map(escapeHtml).join(" • ") || "Sem categoria";
    const detailLines = buildPdfItemDetailLines(item);
    const valueHtml = hasPositiveMoney(item.estimatedValue)
      ? `<div class="row-value"><span>Valor estimado</span><strong>${money(item.estimatedValue)}</strong></div>`
      : "";
    return `
      <article class="catalog-row${valueHtml ? "" : " catalog-row-no-value"}">
        <div class="row-number">${String(index + 1).padStart(2, "0")}</div>
        <div class="row-photo">${image}</div>
        <div class="row-content">
          <h3>${escapeHtml(item.name || "Item sem nome")}</h3>
          <p class="primary-meta">${primaryMeta}</p>
          ${markers ? `<p class="markers">${escapeHtml(markers)}</p>` : ""}
          ${detailLines ? `<div class="pdf-detail-block">${detailLines}</div>` : ""}
        </div>
        ${valueHtml}
      </article>`;
  }).join("");

  const categoryCoverHtml = mode === "category" && categoryImage
    ? `<div class="cover-category-image"><img src="${categoryImage}" alt="Capa de ${escapeHtml(categoryName)}"></div>`
    : "";

  return `<!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="author" content="${escapeHtml(APP_DISPLAY_NAME)}">
    <meta name="application-name" content="${escapeHtml(APP_DISPLAY_NAME)}">
    <title>${escapeHtml(APP_DISPLAY_NAME)} - ${escapeHtml(coverTitle)}</title>
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
      .pdf-brand-title{font-family:Arial,Helvetica,sans-serif;line-height:1.1;color:#07111f;font-weight:700}
      .pdf-brand-vm{font-family:Georgia,"Times New Roman",serif;font-size:27pt;letter-spacing:.02em;display:block}
      .pdf-brand-life{font-size:17pt;letter-spacing:.04em}
      .pdf-brand-archive{font-size:17pt;letter-spacing:.14em}
      .gold-rule{display:flex;align-items:center;gap:4mm;margin-top:4mm}.gold-rule i{display:block;height:.6mm;width:24mm;background:#d7bd8c}.gold-rule b{width:3mm;height:3mm;background:#b4863e;transform:rotate(45deg)}
      .cover-main{flex:1;display:grid;place-items:center;position:relative;z-index:2}
      .cover-card{width:100%;background:linear-gradient(135deg,#07111f,#17263d);color:white;border-radius:12mm;padding:18mm 14mm;text-align:center;box-shadow:0 7mm 18mm rgba(7,17,31,.18)}
      .cover-profile{width:42mm;height:42mm;border-radius:50%;padding:1.6mm;margin:0 auto 7mm;background:linear-gradient(135deg,#e6d4b3,#b4863e)}
      .cover-profile img{width:100%;height:100%;object-fit:cover;border-radius:50%;border:1.8mm solid #07111f;background:#fff}
      .cover-category-image{width:52mm;height:36mm;border-radius:6mm;overflow:hidden;margin:0 auto 6mm;border:1px solid rgba(208,165,95,.45)}
      .cover-category-image img{width:100%;height:100%;object-fit:cover;display:block}
      .cover-kicker{color:#d0a55f;font-size:9pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
      .cover-card h1{font-family:Georgia,"Times New Roman",serif;font-size:31pt;margin:5mm 0 3mm;line-height:1.05}
      .cover-person{font-size:15pt;font-weight:700;margin:0 0 8mm}
      .category-box{display:inline-block;border:1px solid rgba(208,165,95,.75);border-radius:999px;padding:3mm 8mm;color:#f5e7cd;font-size:11pt;font-weight:700;max-width:100%}
      .cover-meta{margin-top:8mm;color:#d4d9e2;font-size:9pt;line-height:1.8}
      .cover-footer{text-align:center;position:relative;z-index:2;color:#8a7a64;font-family:Georgia,"Times New Roman",serif;font-size:9pt;letter-spacing:.08em}
      .catalog-pages{padding:15mm 14mm 16mm;background:#fff}
      .list-header{display:flex;align-items:center;justify-content:space-between;gap:10mm;border-bottom:1px solid #d8c7aa;padding-bottom:6mm;margin-bottom:6mm}
      .list-header-left{display:flex;align-items:center;gap:5mm}
      .list-header img{width:19mm;height:19mm;border-radius:6mm;object-fit:cover}
      .list-header h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:20pt;color:#07111f}
      .list-header p{margin:1.5mm 0 0;color:#6d7280;font-size:9pt}
      .list-count{text-align:right}.list-count span{display:block;color:#6d7280;font-size:8pt}.list-count strong{display:block;font-size:15pt;color:#07111f;margin-top:1mm}
      .catalog-row{display:grid;grid-template-columns:10mm 34mm 1fr 37mm;gap:5mm;align-items:start;border:1px solid #e7dece;border-radius:5mm;padding:4mm;margin-bottom:4mm;break-inside:avoid;page-break-inside:avoid;background:#fffdfa}
      .catalog-row-no-value{grid-template-columns:10mm 34mm 1fr}
      .row-number{font-family:Georgia,"Times New Roman",serif;color:#b4863e;font-size:10pt;font-weight:700;text-align:center}
      .row-photo{width:34mm;height:25mm;border-radius:3.5mm;overflow:hidden;background:#eee6da;display:grid;place-items:center}
      .row-photo img{width:100%;height:100%;object-fit:cover}.item-no-image{font-family:Georgia,"Times New Roman",serif;color:#85622c;font-weight:700}
      .row-content h3{font-family:Georgia,"Times New Roman",serif;margin:0 0 1.5mm;font-size:13pt;color:#07111f}
      .row-content p{margin:0}.primary-meta{font-size:9pt;color:#3d4450}.markers{font-size:7.5pt;color:#8a642b;margin-top:1.8mm!important;font-weight:700}
      .pdf-detail-block{margin-top:2mm}.pdf-detail-line{margin:0 0 1mm;font-size:8pt;color:#4d5563;line-height:1.45}
      .row-value{text-align:right}.row-value span{display:block;color:#6d7280;font-size:7.5pt}.row-value strong{display:block;color:#07111f;font-size:10.5pt;margin-top:1mm}
      .list-footer{margin-top:7mm;padding-top:4mm;border-top:1px solid #e7dece;text-align:center;color:#9a8c78;font-size:8pt}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover,.cover-card,.catalog-row{break-inside:avoid}}
    </style>
  </head>
  <body>
    <section class="cover">
      <div class="cover-brand">
        <img class="cover-logo" src="${appLogo}" alt="Logo ${APP_DISPLAY_NAME}">
        <div class="brand-title">${renderPdfBrandTitleHtml()}<div class="gold-rule"><i></i><b></b><i></i></div></div>
      </div>
      <div class="cover-main">
        <div class="cover-card">
          <div class="cover-profile"><img src="${profilePhoto}" alt="Foto de ${escapeHtml(personName)}"></div>
          ${categoryCoverHtml}
          <div class="cover-kicker">${escapeHtml(coverKicker)}</div>
          <h1>${escapeHtml(coverTitle)}</h1>
          <p class="cover-person">${escapeHtml(personName)}</p>
          <div class="category-box">${coverCategoryBox}</div>
          <div class="cover-meta">${coverMeta}</div>
        </div>
      </div>
      <div class="cover-footer">${APP_DISPLAY_NAME} - Seu acervo digital</div>
    </section>
    <main class="catalog-pages">
      <header class="list-header">
        <div class="list-header-left"><img src="${appLogo}" alt="Logo"><div><h2>${escapeHtml(coverTitle)}</h2><p>${escapeHtml(personName)} - ${escapeHtml(listSubtitle)}</p></div></div>
        <div class="list-count"><span>Total da seleção</span><strong>${selectedItems.length}</strong></div>
      </header>
      ${rows}
      <div class="list-footer">${APP_DISPLAY_NAME} - ${escapeHtml(personName)} - ${generatedAt}</div>
    </main>
  </body>
  </html>`;
}

function openCatalogPdfWindow(selectedItems, options = {}) {
  if (!selectedItems.length) {
    alert("Nenhum item encontrado para gerar o PDF.");
    return;
  }
  const docTitle = options.mode === "category"
    ? `${APP_DISPLAY_NAME} - ${options.categoryName || options.title || "Categoria"}`
    : `${APP_DISPLAY_NAME} - Localizar itens`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert(`O navegador bloqueou a janela do PDF. Permita pop-ups para o ${APP_DISPLAY_NAME} e tente novamente.`);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(buildCatalogPdfDocument(selectedItems, options));
  printWindow.document.close();
  printWindow.document.title = docTitle;
  printWindow.focus();
  const triggerPrint = () => setTimeout(() => printWindow.print(), 650);
  if (printWindow.document.readyState === "complete") triggerPrint();
  else printWindow.addEventListener("load", triggerPrint, { once: true });
}

function generateCatalogPdf() {
  if (!catalogHasSearched) {
    alert("Toque em Pesquisar antes de gerar o catálogo em PDF.");
    return;
  }
  openCatalogPdfWindow(getCatalogSelection(), { mode: "catalog" });
}

function generateCategoryPdf(categoryId) {
  const category = categories.find((entry) => entry.id === categoryId);
  if (!category) {
    alert("Esta categoria não foi encontrada.");
    return;
  }
  const selectedItems = sortCatalogItems(
    items.filter((item) => itemBelongsToCategory(item, categoryId)),
    "newest"
  );
  if (!selectedItems.length) {
    alert("Nenhum item nesta categoria para gerar PDF.");
    return;
  }
  openCatalogPdfWindow(selectedItems, {
    mode: "category",
    title: category.name,
    listSubtitle: `Catálogo da categoria ${category.name}`,
    coverKicker: "Catálogo da categoria",
    categoryName: category.name,
    categoryImage: category.image || "",
    showFilters: false
  });
}

function clearFilters() {
  resetCatalogFilters({ render: true });
}

function setupVideoRecorder() {
  const dialog = $("videoDialog"), live = $("liveVideo");
  let stream = null, recorder = null, chunks = [], timeoutId = null, tick = null, elapsed = 0;

  async function openVideoRecorder() {
    if (!navigator.mediaDevices?.getUserMedia) return alert("Este navegador não permite gravação direta de vídeo.");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      live.srcObject = stream;
      $("recordStatus").textContent = "Pronto para gravar.";
      dialog.showModal();
    } catch {
      alert("Permissão de câmera/microfone negada ou indisponível.");
    }
  }

  $("startRecordBtn").addEventListener("click", () => {
    chunks = []; elapsed = 0; recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      clearTimeout(timeoutId); clearInterval(tick);
      const reader = new FileReader();
      reader.onload = () => {
        currentVideo = reader.result;
        renderMediaSection();
        $("recordStatus").textContent = "Vídeo salvo no cadastro.";
      };
      reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
      $("startRecordBtn").disabled = false; $("stopRecordBtn").disabled = true;
    };
    recorder.start(); $("startRecordBtn").disabled = true; $("stopRecordBtn").disabled = false;
    tick = setInterval(() => { elapsed += 1; $("recordStatus").textContent = `Gravando: ${elapsed}s de 10s`; }, 1000);
    timeoutId = setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, 10000);
  });
  $("stopRecordBtn").addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); });
  $("closeVideoBtn").addEventListener("click", () => {
    if (recorder?.state === "recording") recorder.stop();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    clearInterval(tick);
    dialog.close();
  });

  return openVideoRecorder;
}

function setupMediaMenu(openVideoRecorder) {
  const iconMap = {
    mediaAddBtnIcon: "camera",
    mediaMenuCameraIcon: "camera",
    mediaMenuGalleryIcon: "gallery",
    mediaMenuFileIcon: "file",
    mediaMenuVideoIcon: "video"
  };
  Object.entries(iconMap).forEach(([id, type]) => { if ($(id)) $(id).innerHTML = iconSvg(type); });

  function closeMediaMenu(returnFocus = true) {
    const menu = $("mediaMenuDialog");
    if (!menu?.open) return;
    menu.close();
    if (returnFocus) $("openMediaMenuBtn")?.focus();
  }

  $("openMediaMenuBtn")?.addEventListener("click", () => {
    updateMediaMenuPhotoOptions();
    $("mediaMenuDialog")?.showModal();
  });
  $("closeMediaMenuBtn")?.addEventListener("click", () => closeMediaMenu());
  $("mediaMenuDialog")?.addEventListener("cancel", (e) => { e.preventDefault(); closeMediaMenu(); });
  $("mediaMenuDialog")?.addEventListener("click", (e) => {
    if (e.target === $("mediaMenuDialog")) closeMediaMenu();
  });
  $("mediaTakePhotoBtn")?.addEventListener("click", () => {
    closeMediaMenu(false);
    $("cameraInput")?.click();
  });
  $("mediaGalleryBtn")?.addEventListener("click", () => {
    closeMediaMenu(false);
    $("galleryInput")?.click();
  });
  $("mediaFileBtn")?.addEventListener("click", () => {
    closeMediaMenu(false);
    $("mediaFileInput")?.click();
  });
  $("mediaRecordVideoBtn")?.addEventListener("click", () => {
    closeMediaMenu(false);
    openVideoRecorder();
  });
}

function updateBackupStatus(message, isError = false) {
  const status = $("backupStatus");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("error", !!isError);
}

function buildCompleteBackup() {
  return {
    app: APP_DISPLAY_NAME,
    version: 6,
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
        title: `Backup completo do ${APP_DISPLAY_NAME}`,
        text: "Backup com perfil, categorias, itens, imagens, vídeos, áudios e arquivos anexados.",
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
window.requestDeleteItem = requestDeleteItem;
window.shareItem = shareItem;
window.printItem = printItem;
window.openCategoryEditor = openCategoryEditor;
window.openCategoryCreator = openCategoryCreator;
window.openCategoryDetail = openCategoryDetail;
window.addItemFromCategory = addItemFromCategory;
window.openStoredAttachment = openStoredAttachment;
window.downloadStoredAttachment = downloadStoredAttachment;
window.removeItemDraftAttachment = removeItemDraftAttachment;
window.removeCategoryDraftAttachment = removeCategoryDraftAttachment;
window.removeItemPhoto = removeItemPhoto;
window.openPhotoLightbox = openPhotoLightbox;
window.openItemPhotoViewer = openItemPhotoViewer;
window.openPhotoViewerForItem = openPhotoViewerForItem;
window.goToViewerPhoto = goToViewerPhoto;

if ("serviceWorker" in navigator) {
  const getAssetVersion = () => document.querySelector('meta[name="vm-asset-version"]')?.content || "1";

  async function registerCurrentServiceWorker() {
    const assetVersion = getAssetVersion();
    const swUrl = `./sw.js?v=${assetVersion}`;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => {
      const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
      if (scriptUrl && !scriptUrl.includes(`v=${assetVersion}`)) await registration.unregister();
    }));
    const registration = await navigator.serviceWorker.register(swUrl);
    await registration.update();
    return registration;
  }

  window.addEventListener("load", () => {
    registerCurrentServiceWorker().catch(() => {});
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
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
    alert(`Não foi possível abrir o armazenamento persistente do ${APP_DISPLAY_NAME}.`);
  }

  renderAll();
  renderProfile();
  renderMediaSection();
  renderItemAttachmentList();
  renderMemoryAudioList();
  resetCatalogFilters({ render: true });

  document.addEventListener("click", (e) => {
    const bottomNavBtn = e.target.closest(".nav-item[data-go]");
    if (bottomNavBtn) {
      showView(bottomNavBtn.dataset.go, { resetCatalogFilters: bottomNavBtn.dataset.go === "catalogView" });
      return;
    }
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
    if (!item.category) return alert("Selecione uma categoria para o item.");
    if (!getActiveCustomFieldsForCategoryName(item.category).length) {
      return alert("Esta categoria ainda não possui campos principais. Configure os campos da categoria antes de salvar o item.");
    }
    if (!item.name) return alert("Preencha ao menos um dos campos principais.");
    const idx = items.findIndex((i) => i.id === item.id);
    const resume = itemDetailState.resumeAfterEdit;
    if (idx >= 0) items[idx] = item; else items.unshift(item);
    try {
      await saveItems();
      clearForm();
      if (resume?.categoryId) {
        itemDetailState.resumeAfterEdit = { ...resume, itemId: item.id };
        resumeCategoryItemView();
        return;
      }
      showView("catalogView");
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar este item. Tente novamente.");
    }
  });

  $("clearFormBtn").addEventListener("click", clearForm);
  $("cancelEditBtn").addEventListener("click", () => {
    const resume = itemDetailState.resumeAfterEdit;
    clearForm();
    if (resume?.categoryId) resumeCategoryItemView();
  });
  $("removeMediaBtn").addEventListener("click", () => { currentPhotos = []; currentVideo = ""; renderMediaSection(); });
  $("clearFiltersBtn").addEventListener("click", clearFilters);
  $("searchCatalogBtn").addEventListener("click", applyCatalogFilters);
  $("catalogTermsInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyCatalogFilters(); }
  });
  $("generateCatalogPdfBtn").addEventListener("click", generateCatalogPdf);

  $("gridBtn").addEventListener("click", () => { gridMode = "grid"; $("gridBtn").classList.add("active"); $("listBtn").classList.remove("active"); renderCatalog(); });
  $("listBtn").addEventListener("click", () => { gridMode = "list"; $("listBtn").classList.add("active"); $("gridBtn").classList.remove("active"); renderCatalog(); });

  $("cameraInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await processPhotoCaptureForItem([file]);
    e.target.value = "";
  });
  $("galleryInput").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (files.length) await processPhotoCaptureForItem(files);
    e.target.value = "";
  });
  $("mediaFileInput").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const images = files.filter((file) => file.type.startsWith("image/"));
    const documents = files.filter((file) => !file.type.startsWith("image/"));
    if (images.length) await addPhotosFromFiles(images, { source: "file" });
    for (const file of documents) currentItemAttachments.push(await fileToStoredAttachment(file));
    if (documents.length) renderItemAttachmentList();
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
    await applyCategoryCoverFile(e.target.files?.[0]);
    e.target.value = "";
  });
  $("categoryCameraInput")?.addEventListener("change", async (e) => {
    await applyCategoryCoverFile(e.target.files?.[0]);
    e.target.value = "";
  });
  $("categoryFilesInput").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    for (const file of files) categoryDraftAttachments.push(await fileToStoredAttachment(file));
    renderCategoryAttachmentList();
    e.target.value = "";
  });
  $("removeCategoryImageBtn").addEventListener("click", () => { categoryDraftImage = ""; renderCategoryImagePreview(); });
  $("closeCategoryDialogBtn").addEventListener("click", () => {
    categoryDetailState.resumeAfterEdit = null;
    $("categoryDialog").close();
  });
  $("createCategoryBtn")?.addEventListener("click", openCategoryCreator);
  $("homeCreateCategoryBtn")?.addEventListener("click", openCategoryCreator);
  $("categoryMediaForm").addEventListener("submit", async (e) => { e.preventDefault(); await saveCategoryMedia(); });
  setupCategoryCustomFieldsEditor();
  setupCategoryCombobox();

  $("profilePhotoInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Selecione um arquivo de imagem válido.");
    profileDraftPhoto = await fileToDataUrl(file);
    updateProfilePhotoPreview();
    updateHeroProfileImage(profileDraftPhoto);
    if ($("profileOverviewImage")) $("profileOverviewImage").src = profileDraftPhoto;
    e.target.value = "";
  });
  $("removeProfilePhotoBtn").addEventListener("click", () => {
    profileDraftPhoto = "";
    updateProfilePhotoPreview();
    updateHeroProfileImage("");
    if ($("profileOverviewImage")) $("profileOverviewImage").src = HERO_PROFILE_FALLBACK;
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
      alert(`Não foi possível importar este backup. Verifique se o arquivo foi gerado pelo ${APP_DISPLAY_NAME}.`);
    } finally {
      e.target.value = "";
    }
  });

  setupMediaMenu(setupVideoRecorder());
  setupPhotoViewer();
  setupItemDetailDialog();
  setupDeleteItemDialog();
  setupCategoryDetailDialog();
  setupDeleteCategoryDialog();
  setupGlobalSearchDialog();
  setupMemoryAudioRecorder();
  setupAcquiredAtSync();
  updateCategoryViewSwitcherUI();
}

document.addEventListener("DOMContentLoaded", initializePersistentApp);