function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function engagementIcon(type) {
  if (type === "views") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  }

  const transform = type === "dislike" ? ` transform="rotate(180 12 12)"` : "";
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><g${transform}><path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path></g></svg>`;
}

export function profileEngagementMarkup(contentType, contentId) {
  if (!new Set(["operator", "enemy"]).has(contentType)) {
    throw new Error(`Unsupported engagement content type: ${contentType}`);
  }

  return `<div class="profile-engagement is-loading" data-profile-engagement data-content-type="${contentType}" data-content-id="${escapeHtml(contentId)}" aria-label="Page engagement">
          <span class="profile-engagement-item profile-view-count" title="Unique views">
            ${engagementIcon("views")}<span>Views</span><strong data-engagement-count="views" aria-label="View count">—</strong>
          </span>
          <button class="profile-engagement-item profile-reaction-button" type="button" data-profile-reaction="like" aria-pressed="false" title="Like this page">
            ${engagementIcon("like")}<span>Like</span><strong data-engagement-count="likes" aria-label="Like count">—</strong>
          </button>
          <button class="profile-engagement-item profile-reaction-button" type="button" data-profile-reaction="dislike" aria-pressed="false" title="Dislike this page">
            ${engagementIcon("dislike")}<span>Dislike</span><strong data-engagement-count="dislikes" aria-label="Dislike count">—</strong>
          </button>
          <span class="profile-engagement-status" data-engagement-status aria-live="polite"></span>
        </div>`;
}

export function profileEngagementSummaryMarkup(contentType, contentId) {
  if (!new Set(["operator", "enemy"]).has(contentType)) {
    throw new Error(`Unsupported engagement content type: ${contentType}`);
  }

  return `<div class="tile-engagement is-loading" data-profile-engagement data-engagement-mode="summary" data-content-type="${contentType}" data-content-id="${escapeHtml(contentId)}" aria-label="Engagement summary">
          <span class="tile-engagement-label tile-engagement-views" title="Views">
            <span class="tile-engagement-value">${engagementIcon("views")}<strong data-engagement-count="views">—</strong></span><span>Views</span>
          </span>
          <span class="tile-engagement-label tile-engagement-likes" title="Likes">
            <span class="tile-engagement-value">${engagementIcon("like")}<strong data-engagement-count="likes">—</strong></span><span>Likes</span>
          </span>
          <span class="tile-engagement-label tile-engagement-dislikes" title="Dislikes">
            <span class="tile-engagement-value">${engagementIcon("dislike")}<strong data-engagement-count="dislikes">—</strong></span><span>Dislikes</span>
          </span>
        </div>`;
}

