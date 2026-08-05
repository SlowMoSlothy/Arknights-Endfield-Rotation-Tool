const discoverState = {
  shares: [],
  operators: new Map(),
  skills: new Map(),
  previewCache: new Map(),
  type: "rotation",
  search: "",
  operatorId: 0,
  element: "all",
  operatorClass: "all",
  sort: "newest",
  rotationCount: 0,
  simulationCount: 0,
  loading: false
};

let toastTimeout = 0;

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return text(value).toLowerCase();
}

function label(value) {
  return text(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function create(tag, className = "", content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = content;
  return element;
}

function assetUrl(path) {
  const value = text(path);
  if (!value) return "";
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("/")) return value;
  return `../${value.replace(/^\.?\//, "")}`;
}

function getOperator(id) {
  return discoverState.operators.get(Number(id)) || null;
}

function getTeam(share) {
  return list(share.operator_ids).map(getOperator).filter(Boolean);
}

function getSkill(id) {
  return discoverState.skills.get(Number(id)) || null;
}

function getElements(share) {
  return [...new Set(getTeam(share).map(operator => normalize(operator.elementType)).filter(Boolean))];
}

function getClasses(share) {
  return [...new Set(getTeam(share).map(operator => normalize(operator.operatorClass)).filter(Boolean))];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function plannerUrl(share) {
  return `../#share=${encodeURIComponent(share.short_code)}`;
}

function shareLink(share) {
  const url = new URL("../", window.location.href);
  url.hash = `share=${encodeURIComponent(share.short_code)}`;
  return url.href;
}

function avatar(operator) {
  if (!operator?.icon) return create("span", "operator-placeholder", "?");
  const image = create("img", "operator-avatar");
  image.src = assetUrl(operator.icon);
  image.alt = operator.name || "Operator";
  image.loading = "lazy";
  image.addEventListener("error", () => image.replaceWith(create("span", "operator-placeholder", "?")), { once: true });
  return image;
}

function teamStrip(share) {
  const strip = create("div", "team-strip");
  const team = getTeam(share);
  for (let index = 0; index < 4; index += 1) {
    const cell = create("div", "team-member");
    if (team[index]) {
      cell.append(avatar(team[index]), create("span", "team-member-name", team[index].name));
    } else {
      cell.appendChild(create("span", "operator-placeholder", "?"));
    }
    strip.appendChild(cell);
  }
  return strip;
}

function chipRow(share) {
  const wrapper = create("div", "chip-row");
  [...getElements(share), ...getClasses(share)].slice(0, 8).forEach(value => {
    wrapper.appendChild(create("span", `chip chip-${normalize(value)}`, label(value)));
  });
  return wrapper;
}

function normalizeSkillElement(value) {
  const element = normalize(value);
  if (["heat", "cryo", "electric", "nature", "physical"].includes(element)) return element;
  return "neutral";
}

function skillIcon(action) {
  const skill = action.type === "skill" ? getSkill(action.id) : null;
  const operator = action.type === "basicAttack" ? getOperator(action.operatorId) : null;
  const name = skill?.name || (operator ? `${operator.name} Basic Attack` : "Basic Attack");
  const element = normalizeSkillElement(skill?.elementType || "physical");
  const fillMode = normalize(skill?.type) === "ultimate" ? "full" : "half";
  const root = create("span", `ef-skill-icon ef-element-${element} ef-fill-${fillMode}`);
  root.title = name;
  root.setAttribute("aria-label", name);

  const fill = create("span", "ef-skill-fill");
  const glyphWrap = create("span", "ef-skill-glyph-wrap");
  const ring = create("span", "ef-skill-ring");
  const path = skill?.iconSmall || skill?.icon || (action.type === "basicAttack" ? "assets/enemies/skills/basic_attack.svg" : "");
  if (path) {
    const image = create("img", "ef-skill-glyph");
    image.src = assetUrl(path);
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => image.replaceWith(create("span", "ef-skill-fallback", skill?.shortType || "BA")), { once: true });
    glyphWrap.appendChild(image);
  } else {
    glyphWrap.appendChild(create("span", "ef-skill-fallback", skill?.shortType || "?"));
  }

  root.append(fill, glyphWrap, ring);
  return root;
}

function decodeShareBytes(value) {
  const normalized = text(value).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Array.from(binary, character => character.charCodeAt(0));
}

function readVarInt(cursor) {
  let value = 0;
  let multiplier = 1;
  while (cursor.index < cursor.bytes.length) {
    const byte = cursor.bytes[cursor.index++];
    value += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) return value;
    multiplier *= 0x80;
  }
  throw new Error("Share preview ended unexpectedly.");
}

function readSignedVarInt(cursor) {
  const encoded = readVarInt(cursor);
  return encoded % 2 === 0 ? encoded / 2 : -((encoded + 1) / 2);
}

function parsePreviewActions(payload) {
  const cursor = { bytes: decodeShareBytes(payload), index: 0 };
  const version = readVarInt(cursor);
  if (version < 4 || version > 13) throw new Error("Unsupported share preview version.");
  for (let index = 0; index < 4; index += 1) readVarInt(cursor);

  const rotationLength = readVarInt(cursor);
  if (rotationLength > 240) throw new Error("Share preview contains too many actions.");
  const actions = [];
  for (let index = 0; index < rotationLength; index += 1) {
    if (version >= 9) {
      const header = readVarInt(cursor);
      const entryType = header & 3;
      if (entryType === 1) actions.push({ type: "skill", id: readVarInt(cursor) });
      else if (entryType === 2) {
        actions.push({ type: "basicAttack", operatorId: readVarInt(cursor) - 1 });
        readVarInt(cursor);
        readVarInt(cursor);
      } else if (entryType !== 0) throw new Error("Unsupported share preview action.");
      if (header & 8) readSignedVarInt(cursor);
      continue;
    }

    const entryType = readVarInt(cursor);
    if (entryType === 1) {
      actions.push({ type: "skill", id: readVarInt(cursor) });
      readVarInt(cursor);
    } else if (entryType === 2) {
      actions.push({ type: "basicAttack", operatorId: readVarInt(cursor) - 1 });
      readVarInt(cursor);
      readVarInt(cursor);
    } else if (entryType !== 0) throw new Error("Unsupported share preview action.");
    if (entryType !== 0 && readVarInt(cursor) === 1) readVarInt(cursor);
  }
  return actions;
}

async function loadPreviewActions(share) {
  const code = text(share.short_code).toUpperCase();
  if (!discoverState.previewCache.has(code)) {
    discoverState.previewCache.set(code, (async () => {
      const { data, error } = await supabaseClient.rpc("resolve_rotation_share", { p_short_code: code });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      return parsePreviewActions(result?.share_payload || "");
    })());
  }
  return discoverState.previewCache.get(code);
}

function previewPopover(share) {
  const popover = create("div", "rotation-preview-popover");
  popover.setAttribute("aria-live", "polite");
  const title = create("span", "preview-label", "Skill preview");
  const preview = create("div", "rotation-preview");
  preview.appendChild(create("span", "preview-more", "Loading skills..."));
  popover.append(title, preview);

  let requested = false;
  const load = async () => {
    if (requested) return;
    requested = true;
    try {
      const actions = await loadPreviewActions(share);
      const visible = actions.slice(0, 6);
      preview.replaceChildren();
      if (!visible.length) {
        preview.appendChild(create("span", "preview-more", "No actions in this share"));
        return;
      }
      visible.forEach((action, index) => {
        if (index) preview.appendChild(create("span", "preview-arrow", "→"));
        preview.appendChild(skillIcon(action));
      });
      if (actions.length > visible.length) preview.appendChild(create("span", "preview-more", `+${actions.length - visible.length}`));
    } catch (error) {
      console.warn(`Preview for ${share.short_code} could not be loaded:`, error);
      preview.replaceChildren(create("span", "preview-more", "Preview unavailable"));
    }
  };
  return { popover, load };
}

function showToast(message, type = "success") {
  const toast = document.getElementById("pageToast");
  if (!toast) return;
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `page-toast is-visible is-${type}`;
  toastTimeout = window.setTimeout(() => {
    toast.className = "page-toast";
  }, 2400);
}

function copyFallback(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    input.remove();
  }
  return copied;
}

async function copyShare(share, button) {
  const value = shareLink(share);
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else if (!copyFallback(value)) throw new Error("Clipboard API unavailable");
    button.textContent = "Copied";
    button.classList.add("is-copied");
    window.setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("is-copied");
    }, 1600);
    showToast(`${share.short_code} copied.`);
  } catch (error) {
    console.warn("Share link could not be copied:", error);
    window.prompt("Copy share link:", value);
    showToast("Copy the displayed link manually.", "info");
  }
}

function card(share) {
  const item = create("article", "rotation-card");
  item.dataset.shareType = share.share_type;
  item.tabIndex = 0;
  item.setAttribute("role", "link");
  item.setAttribute("aria-label", `Open ${share.title || share.short_code} in Rotation Tool`);
  item.appendChild(teamStrip(share));

  const meta = create("div", "share-meta");
  meta.append(
    create("span", `mode-chip mode-${share.share_type}`, share.share_type === "simulation" ? "Simulation" : "Rotation"),
    create("code", "share-code", share.short_code)
  );

  const head = create("div", "card-head");
  const titleWrap = create("div", "card-title-wrap");
  titleWrap.append(
    create("h2", "card-title", share.title || "Untitled share"),
    create("div", "author", text(share.author_name) || "Anonymous"),
    create("div", "date", formatDate(share.created_at))
  );
  const open = create("a", "planner-link", "Open ↗");
  open.href = plannerUrl(share);
  head.append(titleWrap, open);

  item.append(meta, head);
  if (text(share.description)) item.appendChild(create("p", "description", share.description));
  item.appendChild(chipRow(share));

  const preview = previewPopover(share);
  item.appendChild(preview.popover);

  const footer = create("div", "card-footer");
  const teamCount = list(share.operator_ids).length;
  footer.appendChild(create("span", "stats", `${teamCount} operator${teamCount === 1 ? "" : "s"}`));
  const copy = create("button", "copy-button", "Copy");
  copy.type = "button";
  copy.addEventListener("click", () => copyShare(share, copy));
  footer.appendChild(copy);
  item.appendChild(footer);

  const openShare = () => {
    window.location.href = plannerUrl(share);
  };
  item.addEventListener("pointerenter", preview.load);
  item.addEventListener("focusin", preview.load);
  item.addEventListener("click", event => {
    if (event.target.closest("a, button, input, select, textarea")) return;
    const hasPreciseHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (!hasPreciseHover && !item.classList.contains("is-preview-open")) {
      event.preventDefault();
      document.querySelectorAll(".rotation-card.is-preview-open").forEach(card => card.classList.remove("is-preview-open"));
      item.classList.add("is-preview-open");
      preview.load();
      return;
    }
    openShare();
  });
  item.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== item) return;
    event.preventDefault();
    openShare();
  });
  return item;
}

function searchableText(share) {
  return [
    share.title,
    share.description,
    share.author_name,
    share.short_code,
    ...getTeam(share).map(operator => operator.name),
    ...getElements(share),
    ...getClasses(share)
  ].join(" ").toLowerCase();
}

function filteredShares() {
  const query = normalize(discoverState.search);
  const rows = discoverState.shares.filter(share => {
    const ids = list(share.operator_ids).map(Number);
    return share.share_type === discoverState.type
      && (!query || searchableText(share).includes(query))
      && (!discoverState.operatorId || ids.includes(discoverState.operatorId))
      && (discoverState.element === "all" || getElements(share).includes(discoverState.element))
      && (discoverState.operatorClass === "all" || getClasses(share).includes(discoverState.operatorClass));
  });

  return rows.sort((a, b) => {
    if (discoverState.sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (discoverState.sort === "title") return text(a.title).localeCompare(text(b.title));
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("type", discoverState.type);
  if (discoverState.operatorId) url.searchParams.set("operator", String(discoverState.operatorId));
  else url.searchParams.delete("operator");
  history.replaceState(null, "", url);
}

function renderTabs() {
  document.getElementById("rotationTabCount").textContent = discoverState.rotationCount;
  document.getElementById("simulationTabCount").textContent = discoverState.simulationCount;
  document.querySelectorAll("[data-share-type]").forEach(button => {
    const active = button.dataset.shareType === discoverState.type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function render() {
  const grid = document.getElementById("rotationGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("rotationCount");
  const status = document.getElementById("rotationStatus");
  if (!grid || !empty || !count || !status) return;

  renderTabs();
  grid.replaceChildren();
  if (discoverState.loading) {
    grid.appendChild(create("div", "state-card", "Loading public shares..."));
    count.textContent = "Public shares";
    status.textContent = "Loading rotations and simulations";
    empty.hidden = true;
    return;
  }

  const shares = filteredShares();
  const typeLabel = discoverState.type === "simulation" ? "Simulation" : "Rotation";
  const totalForType = discoverState.type === "simulation" ? discoverState.simulationCount : discoverState.rotationCount;
  count.textContent = `${shares.length} ${typeLabel}${shares.length === 1 ? "" : "s"}`;
  status.textContent = shares.length === totalForType ? "Public planner shares" : `${shares.length} of ${totalForType} shown`;
  shares.forEach(share => grid.appendChild(card(share)));
  empty.hidden = shares.length > 0;
}

function fillSelect(select, values, allLabel, formatter = label) {
  select.replaceChildren(new Option(allLabel, "all"));
  values.forEach(value => select.add(new Option(formatter(value), String(value))));
}

function fillFilters() {
  const operators = [...discoverState.operators.values()]
    .filter(operator => discoverState.shares.some(share => list(share.operator_ids).map(Number).includes(operator.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
  fillSelect(document.getElementById("operatorFilter"), operators.map(operator => operator.id), "All operators", id => getOperator(id)?.name || id);
  fillSelect(document.getElementById("elementFilter"), [...new Set(operators.map(operator => normalize(operator.elementType)).filter(Boolean))].sort(), "All elements");
  fillSelect(document.getElementById("classFilter"), [...new Set(operators.map(operator => normalize(operator.operatorClass)).filter(Boolean))].sort(), "All classes");
  document.getElementById("operatorFilter").value = discoverState.operatorId ? String(discoverState.operatorId) : "all";
}

async function loadData() {
  discoverState.loading = true;
  render();
  if (!supabaseClient) {
    discoverState.loading = false;
    document.getElementById("rotationGrid").replaceChildren(create("div", "state-card", "The share directory is unavailable."));
    document.getElementById("rotationStatus").textContent = "Database unavailable";
    return;
  }

  try {
    const [operatorResult, skillResult, shareResult] = await Promise.all([
      supabaseClient.from("operators").select("id,name,operator_class,element_type,icon_path,is_visible").eq("game", "arknights_endfield"),
      supabaseClient.from("operator_skills").select("id,name,operator_id,skill_type,short_type,element_type,icon_path,icon_small_path"),
      supabaseClient.rpc("list_public_rotation_shares", { p_limit: 500 })
    ]);
    if (operatorResult.error) throw operatorResult.error;
    if (skillResult.error) throw skillResult.error;
    if (shareResult.error) throw shareResult.error;

    list(operatorResult.data).filter(row => row.is_visible !== false).forEach(row => {
      discoverState.operators.set(Number(row.id), {
        id: Number(row.id),
        name: text(row.name) || "Operator",
        operatorClass: row.operator_class,
        elementType: row.element_type,
        icon: row.icon_path
      });
    });
    list(skillResult.data).forEach(row => {
      discoverState.skills.set(Number(row.id), {
        id: Number(row.id),
        name: text(row.name) || "Skill",
        operatorId: Number(row.operator_id),
        type: row.skill_type,
        shortType: row.short_type,
        elementType: row.element_type,
        icon: row.icon_path,
        iconSmall: row.icon_small_path
      });
    });
    discoverState.shares = list(shareResult.data?.items);
    discoverState.rotationCount = Number(shareResult.data?.rotation_count) || 0;
    discoverState.simulationCount = Number(shareResult.data?.simulation_count) || 0;
    fillFilters();
  } catch (error) {
    console.error("Discover page could not be loaded:", error);
    discoverState.shares = [];
    discoverState.rotationCount = 0;
    discoverState.simulationCount = 0;
    document.getElementById("rotationStatus").textContent = "Database migration required";
  } finally {
    discoverState.loading = false;
    render();
  }
}

function resetFilters() {
  discoverState.search = "";
  discoverState.operatorId = 0;
  discoverState.element = "all";
  discoverState.operatorClass = "all";
  discoverState.sort = "newest";
  document.getElementById("communityToolbar").reset();
  updateUrl();
  render();
}

function init() {
  const params = new URLSearchParams(window.location.search);
  discoverState.type = params.get("type") === "simulation" ? "simulation" : "rotation";
  const operatorId = Number(params.get("operator"));
  discoverState.operatorId = Number.isInteger(operatorId) && operatorId > 0 ? operatorId : 0;

  document.querySelectorAll("[data-share-type]").forEach(button => {
    button.addEventListener("click", () => {
      discoverState.type = button.dataset.shareType;
      updateUrl();
      render();
    });
  });
  document.getElementById("searchInput").addEventListener("input", event => {
    discoverState.search = event.target.value;
    render();
  });
  document.getElementById("operatorFilter").addEventListener("change", event => {
    discoverState.operatorId = event.target.value === "all" ? 0 : Number(event.target.value);
    updateUrl();
    render();
  });
  document.getElementById("elementFilter").addEventListener("change", event => {
    discoverState.element = event.target.value;
    render();
  });
  document.getElementById("classFilter").addEventListener("change", event => {
    discoverState.operatorClass = event.target.value;
    render();
  });
  document.getElementById("sortSelect").addEventListener("change", event => {
    discoverState.sort = event.target.value;
    render();
  });
  document.getElementById("resetFilters").addEventListener("click", resetFilters);
  document.getElementById("refreshRotations").addEventListener("click", loadData);
  loadData();
}

init();
