(() => {
  "use strict";

  const COLORS = {
    background: "#101516",
    panel: "#1d2425",
    panelAlt: "#293031",
    border: "#46504f",
    text: "#f4f6ef",
    muted: "#aeb7b3",
    yellow: "#f8f546",
    green: "#58df91"
  };

  function formatSeconds(value) {
    const numeric = Number(value) || 0;
    return `${numeric.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}s`;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fillRoundedRect(ctx, x, y, width, height, radius, fill, stroke = null) {
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawLabel(ctx, text, x, y, color = COLORS.muted) {
    ctx.fillStyle = color;
    ctx.font = "800 18px Arial, sans-serif";
    ctx.fillText(String(text).toUpperCase(), x, y);
  }

  function loadImage(source) {
    if (!source) return Promise.resolve(null);
    return new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = new URL(source, document.baseURI).href;
    });
  }

  function drawImageContained(ctx, image, x, y, width, height) {
    if (!image?.naturalWidth || !image?.naturalHeight) return;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawAvatar(ctx, image, operatorName) {
    const frameX = 80;
    const frameY = 82;
    const frameSize = 270;
    const inset = 22;
    const imageX = frameX + inset;
    const imageY = frameY + inset;
    const imageSize = frameSize - inset * 2;

    fillRoundedRect(ctx, frameX, frameY, frameSize, frameSize, 22, "rgba(35,43,44,0.92)", "rgba(248,245,70,0.45)");
    fillRoundedRect(ctx, imageX - 5, imageY - 5, imageSize + 10, imageSize + 10, 17, "#111718", "rgba(244,246,239,0.28)");

    ctx.save();
    roundedRect(ctx, imageX, imageY, imageSize, imageSize, 13);
    ctx.clip();
    if (image) {
      drawImageContained(ctx, image, imageX, imageY, imageSize, imageSize);
    } else {
      ctx.fillStyle = COLORS.yellow;
      ctx.font = "900 82px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(operatorName || "?").charAt(0), frameX + frameSize / 2, frameY + 168);
    }
    ctx.restore();
    ctx.textAlign = "left";

    ctx.strokeStyle = "rgba(248,245,70,0.28)";
    ctx.lineWidth = 2;
    roundedRect(ctx, imageX, imageY, imageSize, imageSize, 13);
    ctx.stroke();
  }

  function drawChip(ctx, label, value, x, y, width) {
    fillRoundedRect(ctx, x, y, width, 64, 12, "#242b2c", COLORS.border);
    drawLabel(ctx, label, x + 16, y + 23);
    ctx.fillStyle = COLORS.text;
    ctx.font = "800 22px Arial, sans-serif";
    ctx.fillText(value || "Unknown", x + 16, y + 50);
  }

  function layoutHitMarkers(hitTimings, duration, lineStart, lineWidth) {
    const levelLastX = [-Infinity, -Infinity, -Infinity];
    const minimumSpacing = 50;

    return hitTimings.map(hitTime => {
      const position = duration > 0 ? Math.max(0, Math.min(1, Number(hitTime) / duration)) : 0;
      const x = lineStart + lineWidth * position;
      let level = levelLastX.findIndex(lastX => x - lastX >= minimumSpacing);
      if (level < 0) {
        level = levelLastX.indexOf(Math.min(...levelLastX));
      }
      levelLastX[level] = x;
      return { x, level };
    });
  }

  function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#20292a");
    gradient.addColorStop(0.52, COLORS.background);
    gradient.addColorStop(1, "#181d1e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(248,245,70,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawTimeline(ctx, timeline, x, y, width) {
    drawLabel(ctx, timeline.kicker || "BATK timeline", x, y, COLORS.yellow);
    ctx.fillStyle = COLORS.text;
    ctx.font = "900 34px Arial, sans-serif";
    ctx.fillText(timeline.name || "Basic Attack", x, y + 48);

    const trackY = y + 78;
    const trackHeight = 174;
    fillRoundedRect(ctx, x, trackY, width, trackHeight, 16, "#151a1b", COLORS.border);

    const sequences = Array.isArray(timeline.sequences) ? timeline.sequences : [];
    const total = Math.max(Number(timeline.totalDuration) || 0, sequences.reduce((sum, sequence) => sum + (Number(sequence.duration) || 0), 0), 0.001);
    const gap = 8;
    const contentX = x + 10;
    const contentWidth = width - 20 - gap * Math.max(0, sequences.length - 1);
    let cursorX = contentX;

    sequences.forEach((sequence, index) => {
      const duration = Math.max(0, Number(sequence.duration) || 0);
      const segmentWidth = contentWidth * duration / total;
      const segmentFill = index % 2 === 0 ? "#4f5525" : COLORS.panelAlt;
      const segmentBorder = index === sequences.length - 1 ? COLORS.yellow : "#65706e";
      fillRoundedRect(ctx, cursorX, trackY + 10, segmentWidth, trackHeight - 20, 10, segmentFill, segmentBorder);

      ctx.fillStyle = index % 2 === 0 ? COLORS.yellow : COLORS.text;
      ctx.font = "900 23px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatSeconds(duration), cursorX + segmentWidth / 2, trackY + 43, Math.max(20, segmentWidth - 12));

      fillRoundedRect(ctx, cursorX + Math.max(6, (segmentWidth - 92) / 2), trackY + 59, Math.min(92, segmentWidth - 12), 34, 7, "rgba(20,25,26,0.62)", "rgba(248,245,70,0.42)");
      ctx.fillStyle = COLORS.text;
      ctx.font = "900 18px Arial, sans-serif";
      ctx.fillText(sequence.label || `SEQ ${index + 1}`, cursorX + segmentWidth / 2, trackY + 82, Math.max(18, segmentWidth - 16));

      const lineStart = cursorX + 18;
      const lineWidth = Math.max(0, segmentWidth - 36);
      ctx.strokeStyle = "rgba(244,246,239,0.58)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lineStart, trackY + 132);
      ctx.lineTo(lineStart + lineWidth, trackY + 132);
      ctx.stroke();

      const hits = Array.isArray(sequence.hitTimings) ? sequence.hitTimings : [];
      const hitLayouts = layoutHitMarkers(hits, duration, lineStart, lineWidth);
      hits.forEach((hitTime, hitIndex) => {
        const { x: hitX, level } = hitLayouts[hitIndex];
        const hitY = trackY + [132, 116, 148][level];
        if (level !== 0) {
          ctx.strokeStyle = "rgba(248,245,70,0.38)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hitX, trackY + 132);
          ctx.lineTo(hitX, hitY);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(hitX, hitY, 11, 0, Math.PI * 2);
        ctx.fillStyle = "#202627";
        ctx.fill();
        ctx.strokeStyle = COLORS.yellow;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = COLORS.text;
        ctx.font = "900 11px Arial, sans-serif";
        const hitLabel = sequence.label === "FS" && hits.length === 1 ? "FS" : String(hitIndex + 1);
        ctx.fillText(hitLabel, hitX, hitY + 4);
      });

      cursorX += segmentWidth + gap;
    });
    ctx.textAlign = "left";
  }

  function drawSequenceDetails(ctx, sequences, y) {
    drawLabel(ctx, "Sequence details", 80, y, COLORS.yellow);
    const columns = 2;
    const columnWidth = 712;
    const rowHeight = 90;
    sequences.forEach((sequence, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 80 + column * 736;
      const cardY = y + 20 + row * rowHeight;
      fillRoundedRect(ctx, x, cardY, columnWidth, 74, 12, "rgba(35,43,44,0.94)", COLORS.border);
      ctx.fillStyle = COLORS.text;
      ctx.font = "900 21px Arial, sans-serif";
      ctx.fillText(sequence.label || `SEQ ${index + 1}`, x + 18, cardY + 30);
      ctx.fillStyle = COLORS.yellow;
      ctx.font = "900 20px Arial, sans-serif";
      ctx.fillText(formatSeconds(sequence.duration), x + 18, cardY + 58);

      const hits = Array.isArray(sequence.hitTimings) ? sequence.hitTimings : [];
      ctx.textAlign = "right";
      drawLabel(ctx, `${hits.length} ${hits.length === 1 ? "hit" : "hits"}`, x + columnWidth - 18, cardY + 27);
      ctx.fillStyle = COLORS.text;
      ctx.font = "700 17px Arial, sans-serif";
      const timingText = hits.length ? hits.map(formatSeconds).join("  ·  ") : "No hit timings";
      ctx.fillText(timingText, x + columnWidth - 18, cardY + 56, columnWidth - 180);
      ctx.textAlign = "left";
    });
  }

  async function createBatkCanvas(data) {
    const operator = data.operator || {};
    const timeline = data.timeline || {};
    const sequences = Array.isArray(timeline.sequences) ? timeline.sequences : [];
    const detailRows = Math.max(1, Math.ceil(sequences.length / 2));
    const width = 1600;
    const height = 790 + detailRows * 90;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    drawBackground(ctx, width, height);

    const avatar = await loadImage(operator.avatar);
    drawAvatar(ctx, avatar, operator.name);

    drawLabel(ctx, "Arknights: Endfield operator", 390, 107, COLORS.yellow);
    ctx.fillStyle = COLORS.text;
    ctx.font = "900 64px Arial, sans-serif";
    ctx.fillText(operator.name || "Operator", 390, 174, 760);
    ctx.fillStyle = COLORS.yellow;
    ctx.font = "700 30px Arial, sans-serif";
    ctx.fillText("★".repeat(Number(operator.rarity) || 0), 390, 218);

    const operatorChipY = 288;
    drawChip(ctx, "Class", operator.className, 390, operatorChipY, 220);
    drawChip(ctx, "Element", operator.element, 626, operatorChipY, 220);
    drawChip(ctx, "Weapon", operator.weapon, 862, operatorChipY, 260);

    fillRoundedRect(ctx, 1190, 82, 330, 228, 18, "rgba(64,70,32,0.72)", "rgba(248,245,70,0.52)");
    drawLabel(ctx, "Total duration", 1220, 120);
    ctx.fillStyle = COLORS.yellow;
    ctx.font = "900 58px Arial, sans-serif";
    ctx.fillText(formatSeconds(timeline.totalDuration), 1220, 184);
    drawLabel(ctx, timeline.verified ? "✓ Verified timing" : "Timing not verified", 1220, 226, timeline.verified ? COLORS.green : COLORS.muted);
    if (timeline.updatedAt) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = "700 17px Arial, sans-serif";
      const date = new Date(timeline.updatedAt);
      const dateText = Number.isNaN(date.getTime()) ? timeline.updatedAt : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
      ctx.fillText(`Updated ${dateText}`, 1220, 268, 270);
    }

    drawTimeline(ctx, timeline, 80, 410, 1440);
    drawSequenceDetails(ctx, sequences, 700);

    const footerY = height - 46;
    ctx.strokeStyle = "rgba(160,170,169,0.25)";
    ctx.beginPath();
    ctx.moveTo(80, footerY - 24);
    ctx.lineTo(1520, footerY - 24);
    ctx.stroke();
    ctx.fillStyle = COLORS.yellow;
    ctx.font = "900 18px Arial, sans-serif";
    ctx.fillText("ROTATIONFORGE.GG", 80, footerY);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 16px Arial, sans-serif";
    ctx.fillText("BATK timing reference", 1520, footerY);
    ctx.textAlign = "left";
    return canvas;
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error("The PNG could not be created."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    });
  }

  async function exportSection(section, button) {
    const source = section.querySelector(".batk-export-data");
    if (!source) return;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Creating PNG…";
    try {
      await document.fonts?.ready;
      const data = JSON.parse(source.textContent);
      const canvas = await createBatkCanvas(data);
      const operatorSlug = String(data.operator?.name || "operator").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const batkSlug = String(data.timeline?.name || "batk").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await downloadCanvas(canvas, `${operatorSlug}-${batkSlug}-batk.png`);
      button.textContent = "PNG saved ✓";
      setTimeout(() => { button.textContent = originalText; }, 1800);
    } catch (error) {
      console.error("BATK PNG export failed:", error);
      button.textContent = "Export failed";
      setTimeout(() => { button.textContent = originalText; }, 2200);
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-batk-export]");
    if (!button) return;
    const section = button.closest(".batk-section");
    if (section) exportSection(section, button);
  });
})();
