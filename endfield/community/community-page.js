const communityPageState = {
  rotations: [],
  operators: new Map(),
  skills: new Map(),
  profiles: new Map(),
  likedIds: new Set(),
  search: "",
  element: "all",
  operatorClass: "all",
  sort: "newest",
  operatorId: null,
  detailId: "",
  loading: false
};

const LIKES_STORAGE_KEY = "aertLikedCommunityRotations";
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

function assetUrl(path) {
  const value = text(path);
  if (!value) return "";
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("/")) return value;
  return `../${value.replace(/^\.?\//, "")}`;
}

function create(tag, className = "", content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = content;
  return element;
}

function readLikedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || "[]").map(String));
  } catch {
    return new Set();
  }
}

function saveLikedIds() {
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...communityPageState.likedIds].slice(-500)));
}

function getOperator(id) {
  return communityPageState.operators.get(Number(id)) || null;
}

function getSkill(id) {
  return communityPageState.skills.get(Number(id)) || null;
}

function getTeam(row) {
  return list(row.team_operator_ids).map(getOperator).filter(Boolean);
}

function getSkills(row) {
  return list(row.rotation_skill_ids).map(getSkill).filter(Boolean);
}

function getAuthor(row) {
  const profile = communityPageState.profiles.get(text(row.submitted_by));
  return text(profile?.username || row.author_name || "Anonymous") || "Anonymous";
}

function getElements(row) {
  const values = list(row.element_types).length
    ? list(row.element_types)
    : getTeam(row).map(operator => operator.elementType);
  return [...new Set(values.map(text).filter(Boolean))];
}

function getClasses(row) {
  const values = list(row.operator_classes).length
    ? list(row.operator_classes)
    : getTeam(row).map(operator => operator.operatorClass);
  return [...new Set(values.map(text).filter(Boolean))];
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

function plannerUrl(row) {
  return row?.share_code
    ? `../#setup=${encodeURIComponent(row.share_code)}`
    : "../";
}

function rotationLink(row) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("community", row.id);
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

function normalizeSkillElement(elementType) {
  const key = text(elementType).toLowerCase();
  const aliases = {
    heat: "heat",
    fire: "heat",
    burn: "heat",
    cryo: "cryo",
    ice: "cryo",
    frost: "cryo",
    electric: "electric",
    electro: "electric",
    thunder: "electric",
    lightning: "electric",
    nature: "nature",
    plant: "nature",
    poison: "nature",
    physical: "physical",
    neutral: "physical"
  };
  return aliases[key] || "neutral";
}

function skillIcon(skill) {
  const element = normalizeSkillElement(skill?.elementType);
  const fillMode = text(skill?.type).toLowerCase() === "ultimate" ? "full" : "half";
  const root = create("span", `ef-skill-icon ef-element-${element} ef-fill-${fillMode}`);
  root.title = skill?.name || "Skill";

  const fill = create("span", "ef-skill-fill");
  const glyphWrap = create("span", "ef-skill-glyph-wrap");
  const ring = create("span", "ef-skill-ring");
  const path = skill?.iconSmall || skill?.icon;
  if (path) {
    const image = create("img", "ef-skill-glyph");
    image.src = assetUrl(path);
    image.alt = skill?.name || "Skill";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.replaceWith(create("span", "ef-skill-fallback", skill?.shortType || "?"));
    }, { once: true });
    glyphWrap.appendChild(image);
  } else {
    glyphWrap.appendChild(create("span", "ef-skill-fallback", skill?.shortType || "?"));
  }

  root.append(fill, glyphWrap, ring);
  return root;
}

function teamStrip(row) {
  const strip = create("div", "team-strip");
  const team = getTeam(row);
  for (let index = 0; index < 4; index += 1) {
    strip.appendChild(team[index] ? avatar(team[index]) : create("span", "operator-placeholder", "?"));
  }
  return strip;
}

function preview(row, expanded = false) {
  const wrapper = create("div", expanded ? "detail-skills" : "rotation-preview");
  const skills = getSkills(row);
  const visible = expanded ? skills : skills.slice(0, 6);

  if (!visible.length) {
    wrapper.appendChild(create("span", "preview-more", `${list(row.rotation_skill_ids).length} actions`));
    return wrapper;
  }

  visible.forEach((skill, index) => {
    if (index) wrapper.appendChild(create("span", "preview-arrow", "→"));
    if (expanded) {
      const item = create("span", "detail-skill");
      item.append(skillIcon(skill), create("span", "", skill.name || "Skill"));
      wrapper.appendChild(item);
    } else {
      wrapper.appendChild(skillIcon(skill));
    }
  });

  if (!expanded && skills.length > visible.length) {
    wrapper.appendChild(create("span", "preview-more", `+${skills.length - visible.length}`));
  }
  return wrapper;
}

function chips(row) {
  const wrapper = create("div", "chip-row");
  [...getElements(row), ...getClasses(row)].slice(0, 8).forEach(value => {
    wrapper.appendChild(create("span", "chip", label(value)));
  });
  return wrapper;
}

function actionButton(className, content, handler) {
  const button = create("button", className, content);
  button.type = "button";
  button.addEventListener("click", event => {
    event.stopPropagation();
    handler(button);
  });
  return button;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("pageToast");
  if (!toast) return;

  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `page-toast is-visible is-${type}`;
  toastTimeout = window.setTimeout(() => {
    toast.className = "page-toast";
  }, 2600);
}

function copyTextFallback(value) {
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

async function copyLink(row, button) {
  const url = rotationLink(row);
  const originalLabel = button?.textContent || "Copy link";

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else if (!copyTextFallback(url)) {
      throw new Error("Clipboard API is unavailable.");
    }

    if (button) {
      button.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.classList.remove("is-copied");
      }, 1800);
    }
    showToast("Community rotation link copied.");
  } catch (error) {
    console.warn("Community link could not be copied:", error);
    window.prompt("Copy community rotation link:", url);
    showToast("Copy the displayed link manually.", "info");
  }
}

async function likeRotation(row, button) {
  const id = text(row.id);
  if (!id || communityPageState.likedIds.has(id) || !supabaseClient) return;
  button.disabled = true;
  try {
    const { data, error } = await supabaseClient.rpc("increment_community_rotation_like", {
      target_rotation_id: row.id
    });
    if (error) throw error;
    row.likes_count = Number.isFinite(Number(data)) ? Number(data) : Number(row.likes_count || 0) + 1;
    communityPageState.likedIds.add(id);
    saveLikedIds();
    render();
  } catch (error) {
    console.warn("Community rotation could not be liked:", error);
    button.disabled = false;
  }
}

async function markViewed(row) {
  if (!supabaseClient || row.viewed) return;
  row.viewed = true;
  try {
    const { data, error } = await supabaseClient.rpc("increment_community_rotation_view", {
      target_rotation_id: row.id
    });
    if (error) throw error;
    row.view_count = Number.isFinite(Number(data)) ? Number(data) : Number(row.view_count || 0) + 1;
    render();
  } catch (error) {
    console.warn("Community rotation view could not be updated:", error);
  }
}

function card(row) {
  const item = create("article", "rotation-card");
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", `Show details for ${row.title || "community rotation"}`);
  item.appendChild(teamStrip(row));

  const head = create("div", "card-head");
  const titleWrap = create("div", "card-title-wrap");
  titleWrap.append(
    create("h2", "card-title", row.title || "Untitled rotation"),
    create("div", "author", getAuthor(row)),
    create("div", "date", formatDate(row.created_at))
  );
  const planner = create("a", "planner-link", "Open ↗");
  planner.href = plannerUrl(row);
  planner.addEventListener("click", event => event.stopPropagation());
  head.append(titleWrap, planner);
  item.append(head, preview(row));

  if (text(row.description)) item.appendChild(create("p", "description", row.description));
  item.appendChild(chips(row));

  const footer = create("div", "card-footer");
  footer.appendChild(create(
    "span",
    "stats",
    `${list(row.rotation_skill_ids).length} actions · ${Number(row.view_count) || 0} views`
  ));
  const actions = create("div", "card-actions");
  actions.append(
    actionButton("detail-button", "Details", () => openDetail(row.id)),
    actionButton("copy-button", "Copy link", button => copyLink(row, button))
  );
  const liked = communityPageState.likedIds.has(text(row.id));
  const like = actionButton(`like-button${liked ? " is-liked" : ""}`, `${liked ? "Liked" : "Like"} ${Number(row.likes_count) || 0}`, () => likeRotation(row, like));
  like.disabled = liked;
  actions.appendChild(like);
  footer.appendChild(actions);
  item.appendChild(footer);

  const show = () => openDetail(row.id);
  item.addEventListener("click", show);
  item.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    show();
  });
  return item;
}

function detailOperator(operator) {
  const item = create("div", "detail-operator");
  item.append(avatar(operator), create("strong", "", operator?.name || "Operator"));
  return item;
}

function detailSection(title, child) {
  const section = create("section", "detail-section");
  section.append(create("h3", "", title), child);
  return section;
}

function openDetail(id, updateUrl = true) {
  const row = communityPageState.rotations.find(item => text(item.id) === text(id));
  const panel = document.getElementById("detailPanel");
  if (!row || !panel) return;

  communityPageState.detailId = text(row.id);
  panel.replaceChildren();
  panel.hidden = false;

  const head = create("div", "detail-head");
  const heading = create("div");
  heading.append(
    create("h2", "", row.title || "Untitled rotation"),
    create("div", "author", `${getAuthor(row)} · ${formatDate(row.created_at)}`)
  );
  head.append(heading, actionButton("detail-close", "Close", closeDetail));

  const layout = create("div", "detail-layout");
  const left = create("div");
  const team = create("div", "detail-team");
  getTeam(row).forEach(operator => team.appendChild(detailOperator(operator)));
  left.append(detailSection("Team", team), detailSection("Skill order", preview(row, true)));

  const right = create("div");
  right.append(
    detailSection("Notes", create("p", "detail-notes", text(row.description) || "No notes were provided.")),
    detailSection("Tags", chips(row))
  );
  layout.append(left, right);

  const actions = create("div", "detail-actions");
  const planner = create("a", "planner-link", "Open in Rotation Tool ↗");
  planner.href = plannerUrl(row);
  actions.append(
    planner,
    actionButton("copy-button", "Copy link", button => copyLink(row, button))
  );

  panel.append(head, layout, actions);
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("community", row.id);
    history.replaceState(null, "", url);
  }
  markViewed(row);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeDetail() {
  communityPageState.detailId = "";
  const panel = document.getElementById("detailPanel");
  if (panel) {
    panel.hidden = true;
    panel.replaceChildren();
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("community");
  history.replaceState(null, "", url);
}

function searchText(row) {
  return [
    row.title,
    row.description,
    getAuthor(row),
    ...getTeam(row).map(operator => operator.name),
    ...getElements(row),
    ...getClasses(row)
  ].join(" ").toLowerCase();
}

function filteredRows() {
  const query = normalize(communityPageState.search);
  const rows = communityPageState.rotations.filter(row => {
    const teamIds = list(row.team_operator_ids).map(Number);
    return (!query || searchText(row).includes(query))
      && (!communityPageState.operatorId || teamIds.includes(communityPageState.operatorId))
      && (communityPageState.element === "all" || getElements(row).map(normalize).includes(communityPageState.element))
      && (communityPageState.operatorClass === "all" || getClasses(row).map(normalize).includes(communityPageState.operatorClass));
  });

  return rows.sort((a, b) => {
    if (communityPageState.sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (communityPageState.sort === "views") return Number(b.view_count || 0) - Number(a.view_count || 0);
    if (communityPageState.sort === "likes") return Number(b.likes_count || 0) - Number(a.likes_count || 0);
    if (communityPageState.sort === "skills") return list(b.rotation_skill_ids).length - list(a.rotation_skill_ids).length;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function render() {
  const grid = document.getElementById("rotationGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("rotationCount");
  const status = document.getElementById("rotationStatus");
  if (!grid || !empty || !count || !status) return;

  grid.replaceChildren();
  if (communityPageState.loading) {
    grid.appendChild(create("div", "state-card", "Loading approved community rotations..."));
    count.textContent = "Community builds";
    status.textContent = "Loading approved rotations";
    empty.hidden = true;
    return;
  }

  const rows = filteredRows();
  count.textContent = `${rows.length} Rotation${rows.length === 1 ? "" : "s"}`;
  status.textContent = rows.length === communityPageState.rotations.length
    ? "Approved community builds"
    : `${rows.length} of ${communityPageState.rotations.length} shown`;
  rows.forEach(row => grid.appendChild(card(row)));
  empty.hidden = rows.length > 0;
}

function fillSelect(select, values, allLabel) {
  select.replaceChildren(new Option(allLabel, "all"));
  [...new Set(values.map(normalize).filter(Boolean))]
    .sort((a, b) => label(a).localeCompare(label(b)))
    .forEach(value => select.add(new Option(label(value), value)));
}

function fillFilters() {
  fillSelect(
    document.getElementById("elementFilter"),
    communityPageState.rotations.flatMap(getElements),
    "All elements"
  );
  fillSelect(
    document.getElementById("classFilter"),
    communityPageState.rotations.flatMap(getClasses),
    "All classes"
  );
}

async function fetchProfiles(rows) {
  const userIds = [...new Set(rows.map(row => text(row.submitted_by)).filter(Boolean))];
  if (!userIds.length) return;
  const { data, error } = await supabaseClient
    .from("user_profiles")
    .select("user_id,username,avatar_url")
    .in("user_id", userIds);
  if (error) throw error;
  list(data).forEach(profile => communityPageState.profiles.set(text(profile.user_id), profile));
}

async function loadData() {
  communityPageState.loading = true;
  render();
  if (!supabaseClient) {
    communityPageState.loading = false;
    document.getElementById("rotationStatus").textContent = "Database unavailable";
    document.getElementById("rotationGrid").replaceChildren(create("div", "state-card", "Community rotations could not be loaded."));
    return;
  }

  try {
    const [operatorResult, skillResult, rotationResult] = await Promise.all([
      supabaseClient
        .from("operators")
        .select("id,name,star,operator_class,element_type,icon_path")
        .eq("game", "arknights_endfield"),
      supabaseClient
        .from("operator_skills")
        .select("id,name,operator_id,skill_type,short_type,element_type,icon_path,icon_small_path"),
      supabaseClient
        .from("community_rotations")
        .select("id,title,description,author_name,submitted_by,share_code,team_operator_ids,rotation_skill_ids,element_types,operator_classes,likes_count,view_count,created_at")
        .eq("game", "arknights_endfield")
        .eq("is_public", true)
        .eq("is_approved", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(100)
    ]);

    if (operatorResult.error) throw operatorResult.error;
    if (skillResult.error) throw skillResult.error;
    if (rotationResult.error) throw rotationResult.error;

    list(operatorResult.data).forEach(row => {
      communityPageState.operators.set(Number(row.id), {
        id: Number(row.id),
        name: row.name,
        star: row.star,
        operatorClass: row.operator_class,
        elementType: row.element_type,
        icon: row.icon_path
      });
    });
    list(skillResult.data).forEach(row => {
      communityPageState.skills.set(Number(row.id), {
        id: Number(row.id),
        name: row.name,
        operatorId: Number(row.operator_id),
        type: row.skill_type,
        shortType: row.short_type,
        elementType: row.element_type,
        icon: row.icon_path,
        iconSmall: row.icon_small_path
      });
    });
    communityPageState.rotations = list(rotationResult.data);
    await fetchProfiles(communityPageState.rotations);
    fillFilters();
  } catch (error) {
    console.error("Community page could not be loaded:", error);
    communityPageState.rotations = [];
    document.getElementById("rotationStatus").textContent = "Database unavailable";
  } finally {
    communityPageState.loading = false;
    render();
  }

  if (communityPageState.detailId) openDetail(communityPageState.detailId, false);
}

function resetFilters() {
  communityPageState.search = "";
  communityPageState.element = "all";
  communityPageState.operatorClass = "all";
  communityPageState.sort = "newest";
  communityPageState.operatorId = null;
  document.getElementById("communityToolbar").reset();
  const url = new URL(window.location.href);
  url.searchParams.delete("operator");
  history.replaceState(null, "", url);
  render();
}

function init() {
  communityPageState.likedIds = readLikedIds();
  const params = new URLSearchParams(window.location.search);
  communityPageState.detailId = text(params.get("community"));
  const operatorId = Number(params.get("operator"));
  communityPageState.operatorId = Number.isFinite(operatorId) && operatorId > 0 ? operatorId : null;

  document.getElementById("searchInput").addEventListener("input", event => {
    communityPageState.search = event.target.value;
    communityPageState.operatorId = null;
    render();
  });
  document.getElementById("elementFilter").addEventListener("change", event => {
    communityPageState.element = event.target.value;
    render();
  });
  document.getElementById("classFilter").addEventListener("change", event => {
    communityPageState.operatorClass = event.target.value;
    render();
  });
  document.getElementById("sortSelect").addEventListener("change", event => {
    communityPageState.sort = event.target.value;
    render();
  });
  document.getElementById("resetFilters").addEventListener("click", resetFilters);
  document.getElementById("refreshRotations").addEventListener("click", loadData);
  loadData();
}

init();
