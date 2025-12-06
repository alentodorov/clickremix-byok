// contentScript.js
const STYLE_ID = "render-my-way-style";
const STORAGE = chrome.storage.sync;
const TARGET_OVERLAY_ID = "rmw-target-overlay";
const TARGET_TOOLTIP_ID = "rmw-target-tooltip";
const TARGET_LOCK_BADGE_ID = "rmw-target-lock-badge";
const TARGET_CURSOR_CLASS = "rmw-target-cursor";

const targetPickerState = {
  active: false,
  hovered: null,
  overlay: null,
  tooltip: null,
  prevCursor: "",
  listenersBound: false,
  locked: false,
  lockBadge: null,
  lockBadgeTimer: null,
};

const safeSendMessage = (payload) => {
  chrome.runtime.sendMessage(payload, () => {
    // Ignore errors when popup/background aren't listening
    if (chrome.runtime.lastError) {
      return;
    }
  });
};

function describeElement(el) {
  if (!el || !(el instanceof Element)) return "element";
  const tag = el.tagName.toLowerCase();
  const idPart = el.id ? `#${el.id}` : "";
  const classList = Array.from(el.classList || [])
    .filter(Boolean)
    .slice(0, 2);
  const classPart = classList.length ? "." + classList.join(".") : "";

  const ariaLabel =
    el.getAttribute("aria-label") || el.getAttribute("alt") || "";
  const textContent = (el.innerText || "").trim().split("\n").join(" ").trim();
  const textSample = textContent ? textContent.slice(0, 80) : "";
  const label = ariaLabel || textSample;

  const ancestry = [];
  let node = el.parentElement;
  let depth = 0;
  while (node && depth < 2 && node.tagName) {
    const piece = node.id
      ? `${node.tagName.toLowerCase()}#${node.id}`
      : node.classList && node.classList.length
        ? `${node.tagName.toLowerCase()}.${Array.from(node.classList).slice(0, 1).join(".")}`
        : node.tagName.toLowerCase();
    ancestry.unshift(piece);
    depth++;
    node = node.parentElement;
  }
  const trail = ancestry.length ? ancestry.join(" > ") + " > " : "";

  const descriptor = `${trail}${tag}${idPart || classPart}`;
  return label ? `${descriptor} (${label})` : descriptor;
}

function buildTargetContext(el) {
  if (!el || !(el instanceof Element)) {
    return { beforeHTML: "", afterHTML: "", outerHTML: "", text: "" };
  }
  const outerHTML = el.outerHTML || "";
  const html = document.body ? document.body.innerHTML : "";
  const contextSpan = 1000;
  let beforeHTML = "";
  let afterHTML = "";

  if (outerHTML && html) {
    const idx = html.indexOf(outerHTML);
    if (idx !== -1) {
      beforeHTML = html.slice(Math.max(0, idx - contextSpan), idx);
      afterHTML = html.slice(
        idx + outerHTML.length,
        idx + outerHTML.length + contextSpan,
      );
    }
  }

  const text = (el.innerText || "").trim().slice(0, 400);
  return { beforeHTML, afterHTML, outerHTML: outerHTML.slice(0, 2000), text };
}

function getTargetLabel(descriptor) {
  if (!descriptor) return "";
  const withoutNotes = descriptor.split("(")[0].trim();
  const parts = withoutNotes
    .split(">")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return withoutNotes || descriptor;
  return parts[parts.length - 1];
}

function ensureTargetOverlay() {
  if (!targetPickerState.overlay) {
    const overlay = document.createElement("div");
    overlay.id = TARGET_OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483646";
    overlay.style.border = "2px solid #22c55e";
    overlay.style.background = "rgba(34,197,94,0.12)";
    overlay.style.borderRadius = "10px";
    overlay.style.boxShadow =
      "0 0 0 2px rgba(22, 163, 74, 0.32), 0 20px 60px rgba(0,0,0,0.25)";
    overlay.style.transition = "all 80ms ease-out";
    overlay.style.display = "none";
    targetPickerState.overlay = overlay;
    document.body.appendChild(overlay);
  }

  if (!targetPickerState.tooltip) {
    const tooltip = document.createElement("div");
    tooltip.id = TARGET_TOOLTIP_ID;
    tooltip.textContent = "Click to select (Esc to cancel)";
    tooltip.style.position = "fixed";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "2147483647";
    tooltip.style.background = "#0f172a";
    tooltip.style.color = "#f8fafc";
    tooltip.style.padding = "6px 10px";
    tooltip.style.borderRadius = "9999px";
    tooltip.style.fontSize = "12px";
    tooltip.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
    tooltip.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
    tooltip.style.display = "none";
    targetPickerState.tooltip = tooltip;
    document.body.appendChild(tooltip);
  }
}

function updateTargetOverlay(el) {
  if (!targetPickerState.active || !el) return;
  ensureTargetOverlay();

  const rect = el.getBoundingClientRect();
  const overlay = targetPickerState.overlay;
  const tooltip = targetPickerState.tooltip;

  if (!overlay || rect.width === 0 || rect.height === 0) return;

  overlay.style.display = "block";
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  if (tooltip) {
    tooltip.style.display = "block";
    const tooltipX = Math.max(8, rect.left + 8);
    const tooltipY = rect.top - 32 > 8 ? rect.top - 32 : rect.bottom + 12;
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
  }
}

function clearLockedOverlay() {
  targetPickerState.locked = false;
  if (targetPickerState.overlay) {
    targetPickerState.overlay.remove();
    targetPickerState.overlay = null;
  }
  if (targetPickerState.tooltip) {
    targetPickerState.tooltip.remove();
    targetPickerState.tooltip = null;
  }
  if (targetPickerState.lockBadge) {
    targetPickerState.lockBadge.remove();
    targetPickerState.lockBadge = null;
  }
  if (targetPickerState.lockBadgeTimer) {
    clearTimeout(targetPickerState.lockBadgeTimer);
    targetPickerState.lockBadgeTimer = null;
  }
  document.documentElement.classList.remove(TARGET_CURSOR_CLASS);
  document.documentElement.style.cursor = targetPickerState.prevCursor || "";
}

function showLockBadge(el, descriptor) {
  ensureTargetOverlay();
  const rect = el.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return;

  let badge = targetPickerState.lockBadge;
  if (!badge) {
    badge = document.createElement("div");
    badge.id = TARGET_LOCK_BADGE_ID;
    badge.style.position = "fixed";
    badge.style.pointerEvents = "none";
    badge.style.zIndex = "2147483647";
    badge.style.background = "#0f172a";
    badge.style.color = "#f8fafc";
    badge.style.padding = "8px 12px";
    badge.style.borderRadius = "10px";
    badge.style.fontSize = "12px";
    badge.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
    badge.style.boxShadow = "0 14px 30px rgba(0,0,0,0.28)";
    badge.style.maxWidth = "260px";
    badge.style.lineHeight = "1.4";
    badge.style.transition = "opacity 160ms ease";
    targetPickerState.lockBadge = badge;
    document.body.appendChild(badge);
  }
  const label = getTargetLabel(descriptor);
  badge.textContent = label
    ? `Element selected: ${label}. Open extension to continue.`
    : "Element selected. Open extension to continue.";

  const top = rect.top - 48 > 8 ? rect.top - 48 : rect.bottom + 10;
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 200);
  badge.style.left = `${left}px`;
  badge.style.top = `${top}px`;
  badge.style.opacity = "1";

  if (targetPickerState.lockBadgeTimer) {
    clearTimeout(targetPickerState.lockBadgeTimer);
  }
  targetPickerState.lockBadgeTimer = setTimeout(() => {
    if (badge) {
      badge.style.opacity = "0";
      setTimeout(() => {
        badge.remove();
        targetPickerState.lockBadge = null;
      }, 220);
    }
  }, 3200);
}

function teardownTargetMode(
  reason = "cancel",
  lockedEl = null,
  descriptor = "",
) {
  if (!targetPickerState.active && !targetPickerState.listenersBound) return;

  targetPickerState.active = false;
  targetPickerState.hovered = null;

  window.removeEventListener("mousemove", handleTargetMouseMove, true);
  window.removeEventListener("click", handleTargetClick, true);
  window.removeEventListener("keydown", handleTargetKeydown, true);
  window.removeEventListener("scroll", handleTargetScroll, true);
  targetPickerState.listenersBound = false;

  if (reason === "cancel") {
    clearLockedOverlay();
    safeSendMessage({ type: "TARGET_MODE_CANCELLED" });
  } else if (reason === "select" && lockedEl) {
    targetPickerState.locked = true;
    if (targetPickerState.tooltip) {
      targetPickerState.tooltip.remove();
      targetPickerState.tooltip = null;
    }
    updateTargetOverlay(lockedEl);
    showLockBadge(lockedEl, descriptor);
  }
}

function handleTargetMouseMove(event) {
  if (!targetPickerState.active) return;
  const el = event.target instanceof Element ? event.target : null;
  if (!el || el.id === TARGET_OVERLAY_ID || el.id === TARGET_TOOLTIP_ID) return;

  targetPickerState.hovered = el;
  updateTargetOverlay(el);
}

function handleTargetScroll() {
  if (!targetPickerState.active || !targetPickerState.hovered) return;
  updateTargetOverlay(targetPickerState.hovered);
}

function handleTargetClick(event) {
  if (!targetPickerState.active) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const el =
    event.target instanceof Element ? event.target : targetPickerState.hovered;
  const descriptor = describeElement(el);
  const context = buildTargetContext(el);
  teardownTargetMode("select", el, descriptor);
  safeSendMessage({
    type: "TARGET_SELECTED",
    target: descriptor,
    targetData: {
      descriptor,
      label: getTargetLabel(descriptor),
      context,
    },
  });
}

function handleTargetKeydown(event) {
  if (!targetPickerState.active) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    teardownTargetMode("cancel");
  }
}

function startTargetMode() {
  clearLockedOverlay();
  if (targetPickerState.active) {
    safeSendMessage({ type: "TARGET_MODE_READY" });
    return;
  }
  targetPickerState.active = true;
  targetPickerState.prevCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = "crosshair";
  ensureTargetOverlay();
  if (targetPickerState.tooltip) {
    targetPickerState.tooltip.style.display = "block";
    targetPickerState.tooltip.style.left = "16px";
    targetPickerState.tooltip.style.top = "16px";
  }

  window.addEventListener("mousemove", handleTargetMouseMove, true);
  window.addEventListener("click", handleTargetClick, true);
  window.addEventListener("keydown", handleTargetKeydown, true);
  window.addEventListener("scroll", handleTargetScroll, true);
  targetPickerState.listenersBound = true;

  safeSendMessage({ type: "TARGET_MODE_READY" });
}

// Helper to get page summary
function getPageSummary() {
  const title = document.title;
  const url = window.location.href;

  // Capture full visible text (normalize whitespace)
  const bodyText = document.body.innerText.replace(/\s+/g, " ").trim();

  // Capture trimmed body HTML for structural context (limit to 100k chars)
  const bodyHTML = document.body.innerHTML.substring(0, 100000);

  return `
    URL: ${url}
    Title: ${title}
    Content Snippet: ${bodyText}
    Body HTML (truncated):
${bodyHTML}
  `;
}

// Helper to inject a specific style and execute optional script
function injectStyle(styleObj) {
  // Inject CSS
  const styleId = `rmw-style-${styleObj.id}`;
  let styleTag = document.getElementById(styleId);
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = styleObj.css || "";

  // Execute JS (if present)
  if (styleObj.js && styleObj.js.trim() !== "") {
    // Send to background to execute in MAIN world (bypassing Content Script CSP)
    // The page's CSP is stripped by DNR, so this should work.
    chrome.runtime.sendMessage({
      type: "EXECUTE_MAIN_WORLD_JS",
      code: styleObj.js,
    });
  }
}

// Helper to remove a specific style
function removeStyle(id) {
  const styleTag = document.getElementById(`rmw-style-${id}`);
  if (styleTag) {
    styleTag.remove();
  }
  // JS execution cannot be undone automatically.
}

// Helper to remove ALL extension styles
function removeAllStyles() {
  const styles = document.querySelectorAll('style[id^="rmw-style-"]');
  styles.forEach((s) => s.remove());
}

// Persistence Helpers
function getLegacyStorageKey() {
  // Old single-key format
  return "styles_" + window.location.hostname;
}

function getIndexKey() {
  return "styles_index_" + window.location.hostname;
}

function getStyleItemKey(id) {
  return `style_${window.location.hostname}_${id}`;
}

function storageGet(keys, callback) {
  STORAGE.get(keys, (result) => {
    if (chrome.runtime.lastError) {
      console.error("Storage get failed", chrome.runtime.lastError);
      callback({});
      return;
    }
    callback(result);
  });
}

function storageSet(obj, callback = () => {}) {
  STORAGE.set(obj, () => {
    if (chrome.runtime.lastError) {
      console.error("Storage set failed", chrome.runtime.lastError);
      callback(chrome.runtime.lastError);
      return;
    }
    callback();
  });
}

function storageRemove(keys, callback = () => {}) {
  STORAGE.remove(keys, () => {
    if (chrome.runtime.lastError) {
      console.error("Storage remove failed", chrome.runtime.lastError);
      callback(chrome.runtime.lastError);
      return;
    }
    callback();
  });
}

function hydrateStylesFromIndex(indexIds, callback) {
  if (!Array.isArray(indexIds) || indexIds.length === 0) {
    callback([]);
    return;
  }
  const itemKeys = indexIds.map((id) => getStyleItemKey(id));
  storageGet(itemKeys, (items) => {
    const styles = indexIds
      .map((id) => items[getStyleItemKey(id)])
      .filter(Boolean);
    callback(styles);
  });
}

function migrateLegacyStyles(legacyStyles, callback) {
  if (!Array.isArray(legacyStyles) || legacyStyles.length === 0) {
    callback([]);
    return;
  }

  const indexKey = getIndexKey();
  const setObj = { [indexKey]: [] };

  legacyStyles.forEach((style) => {
    const id =
      style.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const itemKey = getStyleItemKey(id);
    setObj[indexKey].push(id);
    setObj[itemKey] = { ...style, id };
  });

  storageSet(setObj, () => {
    // Remove old blob; ignore errors
    storageRemove(getLegacyStorageKey());
    callback(setObj[indexKey].map((id) => setObj[getStyleItemKey(id)]));
  });
}

function getSavedStyles(callback) {
  const indexKey = getIndexKey();
  storageGet([indexKey], (result) => {
    const indexIds = Array.isArray(result[indexKey]) ? result[indexKey] : null;
    if (indexIds) {
      hydrateStylesFromIndex(indexIds, callback);
      return;
    }

    // Migration path for legacy blob storage
    const legacyKey = getLegacyStorageKey();
    storageGet([legacyKey], (legacyResult) => {
      const legacyStyles = Array.isArray(legacyResult[legacyKey])
        ? legacyResult[legacyKey]
        : [];
      if (legacyStyles.length === 0) {
        callback([]);
        return;
      }
      migrateLegacyStyles(legacyStyles, callback);
    });
  });
}

function saveNewStyle(newStyle, callback = () => {}) {
  getSavedStyles((styles) => {
    styles.push(newStyle);
    persistStyles(styles, [], callback);
  });
}

function updateStyleToggle(id, enabled) {
  getSavedStyles((styles) => {
    const styleIndex = styles.findIndex((s) => s.id === id);
    if (styleIndex !== -1) {
      styles[styleIndex].enabled = enabled;
      persistStyles(styles);
    }
  });
}

function disableAllSavedStyles(callback = () => {}) {
  getSavedStyles((styles) => {
    if (!Array.isArray(styles)) {
      styles = [];
    }
    const disabledStyles = styles.map((style) => ({
      ...style,
      enabled: false,
    }));
    persistStyles(disabledStyles, [], () => callback(disabledStyles));
  });
}

function clearAllSavedStyles() {
  const indexKey = getIndexKey();
  storageGet([indexKey], (result) => {
    const ids = Array.isArray(result[indexKey]) ? result[indexKey] : [];
    const removeKeys = [
      indexKey,
      ...ids.map((id) => getStyleItemKey(id)),
      getLegacyStorageKey(),
    ];
    storageRemove(removeKeys);
  });
}

function persistStyles(styles, removedIds = [], callback = () => {}) {
  if (!Array.isArray(styles)) {
    styles = [];
  }
  const indexKey = getIndexKey();
  const setObj = { [indexKey]: [] };
  styles.forEach((style) => {
    if (!style || typeof style !== "object") return;
    const id =
      style.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const normalized = { ...style, id };
    const itemKey = getStyleItemKey(id);
    setObj[indexKey].push(id);
    setObj[itemKey] = normalized;
  });

  storageSet(setObj, () => {
    if (removedIds.length > 0) {
      const staleKeys = removedIds.map((id) => getStyleItemKey(id));
      storageRemove(staleKeys, callback);
      return;
    }
    callback();
  });
}

function loadAndApplyStyles() {
  getSavedStyles((styles) => {
    if (!Array.isArray(styles)) {
      styles = [];
    }
    let activeCount = 0;
    styles.forEach((style) => {
      if (style.enabled) {
        injectStyle(style);
        activeCount++;
      }
    });

    updateBadge(activeCount > 0);
  });
}

function updateBadge(isActive) {
  chrome.runtime.sendMessage({
    type: "UPDATE_BADGE",
    text: isActive ? "ON" : "",
  });
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_TARGET_MODE") {
    startTargetMode();
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === "CANCEL_TARGET_MODE") {
    teardownTargetMode("cancel");
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === "CLEAR_TARGET_OVERLAY") {
    clearLockedOverlay();
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === "APPLY") {
    sendResponse({ status: "started" });
    const pageSummary = getPageSummary();

    chrome.runtime.sendMessage(
      {
        type: "CALL_MODEL",
        instruction: request.instruction,
        pageSummary: pageSummary,
        targetSelection: request.targetSelection,
      },
      (response) => {
        if (response && response.success) {
          const newStyle = {
            id: Date.now(),
            css: response.css,
            js: response.js,
            summary: response.summary || "Custom style applied",
            enabled: true,
            conversationHistory: [
              {
                role: "user",
                content: request.instruction,
                css: response.css,
                js: response.js,
                timestamp: Date.now(),
              },
            ],
          };

          injectStyle(newStyle);
          saveNewStyle(newStyle, () => {
            updateBadge(true);
            chrome.runtime.sendMessage({
              type: "STATUS_UPDATE",
              text: "Style applied!",
              statusType: "success",
            });
          });
        } else {
          console.error("ClickRemix Error:", response.error);
          chrome.runtime.sendMessage({
            type: "STATUS_UPDATE",
            text: response.error || "Error generating styles.",
            statusType: "error",
          });
        }
      },
    );
    return true;
  }

  if (request.type === "APPLY_ITERATION") {
    sendResponse({ status: "started" });
    const pageSummary = getPageSummary();

    // Get the existing style to retrieve conversation history
    getSavedStyles((styles) => {
      const existingStyle = styles.find((s) => s.id === request.styleId);
      if (!existingStyle) {
        chrome.runtime.sendMessage({
          type: "STATUS_UPDATE",
          text: "Style not found.",
          statusType: "error",
        });
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "CALL_MODEL",
          instruction: request.instruction,
          pageSummary: pageSummary,
          targetSelection: request.targetSelection,
          iterationContext: {
            styleId: request.styleId,
            currentCss: existingStyle.css,
            currentJs: existingStyle.js,
            conversationHistory: existingStyle.conversationHistory || [],
          },
        },
        (response) => {
          if (response && response.success) {
            // Update existing style with new CSS/JS
            const updatedHistory = [
              ...(existingStyle.conversationHistory || []),
              {
                role: "user",
                content: request.instruction,
                css: response.css,
                js: response.js,
                timestamp: Date.now(),
              },
            ];

            const updatedStyle = {
              ...existingStyle,
              css: response.css,
              js: response.js,
              summary: response.summary || existingStyle.summary,
              conversationHistory: updatedHistory,
            };

            // Remove old style injection and inject updated one
            removeStyle(existingStyle.id);
            injectStyle(updatedStyle);

            // Update in storage
            getSavedStyles((allStyles) => {
              const styleIndex = allStyles.findIndex(
                (s) => s.id === request.styleId,
              );
              if (styleIndex !== -1) {
                allStyles[styleIndex] = updatedStyle;
                persistStyles(allStyles, [], () => {
                  chrome.runtime.sendMessage({
                    type: "STATUS_UPDATE",
                    text: "Style refined!",
                    statusType: "success",
                  });
                });
              }
            });
          } else {
            console.error("ClickRemix Error:", response.error);
            chrome.runtime.sendMessage({
              type: "STATUS_UPDATE",
              text: response.error || "Error refining style.",
              statusType: "error",
            });
          }
        },
      );
    });
    return true;
  }

  if (request.type === "RESET") {
    removeAllStyles();
    disableAllSavedStyles(() => {
      updateBadge(false);
      sendResponse({ status: "reset" });
    });
    return true;
  }

  if (request.type === "GET_STATE") {
    getSavedStyles((styles) => {
      sendResponse(styles);
    });
    return true; // Async response
  }

  if (request.type === "TOGGLE") {
    if (request.enabled) {
      // We need the full style object to inject it, but the popup only sent ID.
      // We must fetch it from storage.
      getSavedStyles((styles) => {
        if (!Array.isArray(styles)) {
          styles = [];
        }
        const style = styles.find((s) => s.id === request.id);
        if (style) {
          injectStyle(style);
          updateStyleToggle(request.id, true);

          // Check if any are active for badge
          const anyActive = styles.some(
            (s) => s.id === request.id || s.enabled,
          );
          updateBadge(anyActive);
        }
      });
    } else {
      getSavedStyles((styles) => {
        if (!Array.isArray(styles)) {
          styles = [];
        }

        const targetStyle = styles.find((s) => s.id === request.id);
        const hadJs =
          targetStyle &&
          typeof targetStyle.js === "string" &&
          targetStyle.js.trim() !== "";

        removeStyle(request.id);
        updateStyleToggle(request.id, false);

        // We just disabled one; check others based on current list
        const anyOtherActive = styles.some(
          (s) => s.id !== request.id && s.enabled,
        );
        updateBadge(anyOtherActive);

        if (hadJs) {
          // Refresh to clear any JS side effects
          setTimeout(() => {
            window.location.reload();
          }, 50);
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "DELETE_STYLE") {
    getSavedStyles((styles) => {
      if (!Array.isArray(styles)) {
        styles = [];
      }

      const targetStyle = styles.find((s) => s.id === request.id);
      const hadJs =
        targetStyle &&
        typeof targetStyle.js === "string" &&
        targetStyle.js.trim() !== "";
      const wasEnabled = targetStyle && targetStyle.enabled;

      removeStyle(request.id);

      const newStyles = styles.filter((s) => s.id !== request.id);
      persistStyles(newStyles, [request.id]);

      // Update badge based on remaining styles
      const anyActive = newStyles.some((s) => s.enabled);
      updateBadge(anyActive);
      sendResponse({ success: true });

      if (hadJs && wasEnabled) {
        setTimeout(() => {
          window.location.reload();
        }, 50);
      }
    });
    return true;
  }

  if (request.type === "UPDATE_STYLE") {
    const incomingCss = typeof request.css === "string" ? request.css : "";
    const incomingJs = typeof request.js === "string" ? request.js : "";
    getSavedStyles((styles) => {
      if (!Array.isArray(styles)) {
        styles = [];
      }
      const styleIndex = styles.findIndex((s) => s.id === request.id);
      if (styleIndex === -1) {
        sendResponse({ success: false, error: "Style not found" });
        return;
      }

      const updatedStyle = {
        ...styles[styleIndex],
        css: incomingCss,
        js: incomingJs,
      };

      styles[styleIndex] = updatedStyle;
      persistStyles(styles);
      if (!updatedStyle.enabled) {
        removeStyle(updatedStyle.id);
      } else {
        injectStyle(updatedStyle);
      }

      const anyActive = styles.some((s) => s.enabled);
      updateBadge(anyActive);
      sendResponse({ success: true });
    });
    return true;
  }
});

// Initialize
loadAndApplyStyles();
