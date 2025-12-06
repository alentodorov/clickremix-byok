// Vendored CSP-friendly Alpine build for extension packaging.
import Alpine from "./vendor/alpinejs-csp.esm.js";

// Rate limit functions are loaded from ratelimit.js (loaded via script tag in popup.html)

// ============================================================================
// STARTER EXAMPLES
// ============================================================================

const starterExamples = [
  {
    title: "Replace Trump with 🤡 emoji",
    description: "Bring some fun to your news",
    instruction: "Replace Trump with 🤡",
  },
  {
    title: "Cozy dark theme",
    description: "A night theme without breaking layouts.",
    instruction:
      "Switch the page to a soft dark mode: dark charcoal background, dimmed text, muted accents, and ensure links remain visible with a subtle blue tint.",
  },
  {
    title: "Reduce visual clutter",
    description: "Cleaner layout by hiding noisy elements.",
    instruction:
      "Reduce visual noise by dimming or soft-hiding non-essential page elements such as large sidebars, loud banners, or oversized footers, while keeping core content fully intact.",
  },
];

const statusThemes = {
  success: {
    classes: "alert text-green-500 bg-green-500/5 border-green-600",
    iconClass: "fa-regular fa-circle-check",
  },
  error: {
    classes: "alert-destructive bg-destructive/5 border-destructive",
    iconClass: "fa-regular fa-circle-xmark",
  },
  normal: {
    classes: "alert text-primary bg-primary/5 border border-primary",
    iconClass: "fa-solid fa-circle-info",
  },
};

function popupApp() {
  return {
    // Core state
    instruction: "",
    activeTabId: null,
    activeTabUrl: "",
    hostname: "",
    instructionStorageKey: null,
    selectedTarget: null,
    targetModeActive: false,
    targetBusy: false,
    applyBusy: false,
    styles: [],
    status: { text: "", type: "normal", persist: false },
    statusTimer: null,
    suppressTargetClearStatus: false,
    deletingStyleId: null,

    // Iteration state
    refiningStyle: null,

    // Editor state
    editorOpen: false,
    editingStyle: null,
    editorCss: "",
    editorJs: "",
    editorSaving: false,
    editorStatus: "",
    editorStatusType: "muted",

    // Settings state
    settingsOpen: false,
    settingsApiKey: "",
    settingsModel: "",
    settingsSaving: false,
    settingsStatusMessage: "",
    settingsStatusType: "success",

    // Rate limit state
    rateLimitStatus: {
      monthlyUsed: 0,
      monthlyRemaining: 50,
      monthlyLimit: 50,
      canRequest: true,
      nextResetTime: null,
    },
    rateLimitInterval: null,

    // Static data
    starterExamples,

    // Runtime
    handleRuntimeMessage: null,

    get targetHint() {
      if (this.refiningStyle) {
        return this.selectedTarget
          ? "Selected. Refinements will focus on this element."
          : "Tell the AI how to refine this style.";
      }
      return this.selectedTarget
        ? "Selected. Your changes will apply to this element."
        : "Select a page element to focus your changes.";
    },

    get targetChipLabel() {
      return this.selectedTarget ? `${this.selectedTarget.label}` : "";
    },

    get statusTheme() {
      return statusThemes[this.status.type] || statusThemes.normal;
    },

    get statusClasses() {
      return (
        this.statusTheme.classes + " w-full transition-opacity duration-200"
      );
    },

    get statusIconClass() {
      return this.statusTheme.iconClass;
    },

    get editorTitleText() {
      if (!this.editingStyle) return "Customize this style with code.";
      return this.editingStyle.summary || `Style #${this.editingStyle.id}`;
    },

    isRefining(style) {
      if (!this.refiningStyle || !style) return false;
      return this.refiningStyle.id === style.id;
    },

    handleStatusUpdate(message) {
      this.applyBusy = false;
      this.setStatus(message.text, message.statusType);
      if (message.statusType !== "success") return;

      // Set ON badge when style is successfully applied
      if (this.activeTabId) {
        chrome.action.setBadgeText({ text: "ON", tabId: this.activeTabId });
        chrome.action.setBadgeBackgroundColor({
          color: "#4EBEAA",
          tabId: this.activeTabId,
        });
      }

      this.persistInstruction();
      this.instruction = "";
      this.clearTargetSelection(false, "applied");
      this.refiningStyle = null; // Clear refining state
      this.refreshStylesFromPage();
    },

    handleTargetSelected(message) {
      this.setTargetModeState(false);
      this.setSelectedTarget(message.targetData || message.target || "");
      const targetName =
        message.target || this.selectedTarget?.label || "element";
      this.setStatus(`Selected: ${targetName}`, "success", true);
      this.focusInstructionInput();
    },

    handleTargetCleared(reason = "unknown") {
      this.setTargetModeState(false);
      this.setSelectedTarget(null);
      const shouldSuppress =
        this.suppressTargetClearStatus || reason === "applied";
      this.suppressTargetClearStatus = false;
      if (shouldSuppress) return;
      this.setStatus("Selection cleared.", "success");
    },

    handleInstructionKeydown(event) {
      if (event.key !== "Enter") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      this.applyInstruction();
    },

    async init() {
      this.registerRuntimeListener();
      await this.bootstrap();
      await this.updateRateLimitStatus();
      this.focusInstructionInput();

      // Watch applyBusy and auto-persist to storage
      this.$watch("applyBusy", (value) => {
        if (this.activeTabId) {
          const key = `applyBusy_${this.activeTabId}`;
          if (value) {
            chrome.storage.local.set({ [key]: Date.now() });
            // Set badge
            chrome.action.setBadgeText({ text: "⋯", tabId: this.activeTabId });
            chrome.action.setBadgeBackgroundColor({
              color: "#7C3AED",
              tabId: this.activeTabId,
            });
          } else {
            chrome.storage.local.remove(key);
            // Don't clear badge here - it might be "ON" from a successful apply
          }
        }
      });

      // Refresh rate limit status every 30 seconds
      this.rateLimitInterval = setInterval(() => {
        this.updateRateLimitStatus();
      }, 30000);
    },

    registerRuntimeListener() {
      this.handleRuntimeMessage = (message) => {
        if (message.type === "STATUS_UPDATE") {
          this.handleStatusUpdate(message);
          return;
        }

        if (message.type === "TARGET_MODE_READY") {
          this.setTargetModeState(true);
          this.setStatus(
            "Hover over an element, then click to select.",
            "normal",
            true,
          );
          return;
        }

        if (
          message.type === "TARGET_SELECTED" ||
          message.type === "TARGET_SELECTED_BROADCAST"
        ) {
          if (
            message.type === "TARGET_SELECTED_BROADCAST" &&
            message.tabId &&
            this.activeTabId &&
            message.tabId !== this.activeTabId
          ) {
            return;
          }
          const hasTarget =
            (message.targetData &&
              Object.keys(message.targetData).length > 0) ||
            (message.target && message.target.trim() !== "");
          if (hasTarget) {
            this.handleTargetSelected(message);
          } else {
            this.handleTargetCleared(message.reason || "unknown");
          }
          return;
        }

        if (message.type === "TARGET_MODE_CANCELLED") {
          this.setTargetModeState(false);
          this.setStatus("Selection cancelled.", "normal");
        }
      };

      chrome.runtime.onMessage.addListener(this.handleRuntimeMessage);
    },

    async bootstrap() {
      const [tab] = await chrome.tabs
        .query({ active: true, currentWindow: true })
        .catch(() => []);
      if (!tab) return;
      this.activeTabId = tab.id;
      this.activeTabUrl = tab.url || "";
      this.hostname = this.getHostname(tab.url) || "";
      this.instructionStorageKey = this.hostname
        ? `instruction_${this.hostname}`
        : "lastInstruction";

      this.restoreInstruction();
      this.restoreTargetSelection();
      this.restoreApplyBusyState();

      this.refreshStylesFromPage();
    },

    getHostname(url) {
      try {
        return new URL(url).hostname;
      } catch (e) {
        return null;
      }
    },

    targetKey(tabId) {
      return `target_selection_${tabId}`;
    },

    restoreInstruction() {
      if (!this.instructionStorageKey) return;
      chrome.storage.sync.get([this.instructionStorageKey], (result) => {
        if (result[this.instructionStorageKey]) {
          this.instruction = result[this.instructionStorageKey];
        }
      });
    },

    persistInstruction(value = this.instruction.trim()) {
      if (!this.instructionStorageKey) return;
      const trimmedValue = typeof value === "string" ? value.trim() : "";
      if (trimmedValue) {
        chrome.storage.sync.set({ [this.instructionStorageKey]: trimmedValue });
      } else {
        chrome.storage.sync.remove(this.instructionStorageKey);
      }
    },

    restoreTargetSelection() {
      if (!this.activeTabId) return;
      chrome.storage.local.get([this.targetKey(this.activeTabId)], (res) => {
        const stored = res[this.targetKey(this.activeTabId)];
        if (stored) {
          this.selectedTarget = stored;
        }
      });
    },

    restoreApplyBusyState() {
      if (!this.activeTabId) return;
      const key = `applyBusy_${this.activeTabId}`;
      chrome.storage.local.get([key], (res) => {
        if (res[key]) {
          const timestamp = res[key];
          const now = Date.now();
          // Clear if stuck for more than 5 minutes
          if (
            typeof timestamp === "number" &&
            now - timestamp > 5 * 60 * 1000
          ) {
            this.applyBusy = false;
            return;
          }

          // Check if styles were already applied (badge is "ON")
          chrome.action.getBadgeText({ tabId: this.activeTabId }, (text) => {
            if (text === "ON") {
              // Styles already applied, clear busy state
              this.applyBusy = false;
              return;
            }

            // Still processing
            this.applyBusy = true;
            this.setStatus("Applying changes...", "normal", true);
            // Restore badge (primary purple branding color)
            chrome.action.setBadgeText({ text: "⋯", tabId: this.activeTabId });
            chrome.action.setBadgeBackgroundColor({
              color: "#7C3AED",
              tabId: this.activeTabId,
            });
          });
        }
      });
    },

    setStatus(msg, type = "normal", persist = false) {
      if (this.statusTimer) {
        clearTimeout(this.statusTimer);
        this.statusTimer = null;
      }
      if (!msg) {
        this.status = { text: "", type: "normal", persist: false };
        return;
      }
      this.status = { text: msg, type, persist };
      if (!persist) {
        this.statusTimer = setTimeout(() => {
          this.status = { text: "", type: "normal", persist: false };
          this.statusTimer = null;
        }, 3200);
      }
    },

    focusInstructionInput() {
      requestAnimationFrame(() => {
        const el = this.$refs.instruction;
        if (!el) return;
        const end = el.value.length;
        el.focus();
        el.setSelectionRange(end, end);
      });
    },

    isUrlPickable(url) {
      if (!url) return false;
      try {
        const { protocol } = new URL(url);
        const blocked = [
          "chrome:",
          "edge:",
          "about:",
          "devtools:",
          "chrome-extension:",
          "chrome-search:",
        ];
        return !blocked.includes(protocol);
      } catch (e) {
        return false;
      }
    },

    applyInstruction() {
      const trimmedInstruction =
        typeof this.instruction === "string" ? this.instruction.trim() : "";
      if (!trimmedInstruction) {
        this.setStatus("Enter a change to apply.", "error");
        return;
      }
      if (!this.activeTabId) {
        this.setStatus("No active tab found.", "error");
        return;
      }

      // Only persist if it's not an example instruction
      const isExample = this.starterExamples.some(
        (ex) => ex.instruction === trimmedInstruction,
      );
      if (!isExample) {
        this.persistInstruction(trimmedInstruction);
      }

      this.applyBusy = true;
      this.setStatus(
        this.refiningStyle ? "Refining style..." : "Processing your request...",
        "normal",
      );

      // Determine message type based on whether we're refining
      const messageType = this.refiningStyle ? "APPLY_ITERATION" : "APPLY";
      const message = {
        type: messageType,
        instruction: trimmedInstruction,
        targetSelection: this.selectedTarget,
      };

      // Add styleId if we're refining
      if (this.refiningStyle) {
        message.styleId = this.refiningStyle.id;
      }

      chrome.tabs.sendMessage(this.activeTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          this.setStatus(
            "Connection lost. Refresh the page and try again.",
            "error",
          );
          console.error(chrome.runtime.lastError);
          this.applyBusy = false;
          return;
        }

        if (response && response.status === "started") {
          this.setStatus("Applying changes...", "normal", true);
          // Update message count after request starts
          setTimeout(() => this.updateRateLimitStatus(), 1000);
          return;
        }

        this.applyBusy = false;
      });
    },

    applyExample(example) {
      if (!example) return;
      this.instruction = example.instruction || "";
      this.focusInstructionInput();
      // Don't persist example instructions to storage
      this.applyInstruction();
    },

    toggleTargetMode() {
      if (!this.activeTabId) {
        this.setStatus("No active tab found.", "error");
        return;
      }
      if (!this.isUrlPickable(this.activeTabUrl)) {
        this.setStatus(
          "Cannot select elements on Chrome system pages.",
          "error",
          true,
        );
        return;
      }
      if (this.targetModeActive) {
        this.targetBusy = true;
        chrome.tabs.sendMessage(
          this.activeTabId,
          { type: "CANCEL_TARGET_MODE" },
          () => {
            this.targetBusy = false;
            this.setTargetModeState(false);
            this.setStatus("Selection cancelled.", "normal");
          },
        );
        return;
      }

      this.targetBusy = true;
      chrome.tabs.sendMessage(
        this.activeTabId,
        { type: "START_TARGET_MODE" },
        (response) => {
          this.targetBusy = false;
          if (chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message || "";
            const isNoReceiver = errMsg.includes(
              "Receiving end does not exist",
            );
            if (!isNoReceiver) {
              console.error(chrome.runtime.lastError);
            }
            this.setStatus(
              isNoReceiver
                ? "Refresh the page to enable element selection."
                : "Element selection not available on this page.",
              "error",
              true,
            );
            return;
          }
          if (response && response.ok) {
            this.setTargetModeState(true);
            this.setStatus(
              "Hover over an element, then click to select.",
              "normal",
              true,
            );
          } else {
            this.setTargetModeState(false);
            this.setStatus(
              "Element selection not available on this page.",
              "error",
            );
          }
        },
      );
    },

    setTargetModeState(isActive) {
      this.targetModeActive = isActive;
      this.targetBusy = false;
    },

    setSelectedTarget(rawTargetData) {
      const normalized = this.normalizeTargetData(rawTargetData);
      this.selectedTarget = normalized;
      if (this.activeTabId) {
        const key = this.targetKey(this.activeTabId);
        if (normalized) {
          chrome.storage.local.set({ [key]: normalized });
        } else {
          chrome.storage.local.remove(key);
        }
      }
    },

    clearTargetSelection(showStatus = false, reason = "manual") {
      this.suppressTargetClearStatus = showStatus || reason === "applied";
      this.setSelectedTarget(null);
      if (showStatus) {
        this.setStatus("Selection cleared.", "success");
      }
      if (this.activeTabId) {
        chrome.tabs.sendMessage(this.activeTabId, {
          type: "CLEAR_TARGET_OVERLAY",
        });
        chrome.runtime.sendMessage({
          type: "CLEAR_TARGET_SELECTION",
          tabId: this.activeTabId,
          reason,
        });
      }
    },

    normalizeTargetData(input) {
      if (!input) return null;
      if (typeof input === "string") {
        const descriptor = input.trim();
        return descriptor
          ? { descriptor, label: this.getTargetLabel(descriptor) }
          : null;
      }
      if (typeof input === "object") {
        const descriptor = (input.descriptor || input.target || "").trim();
        if (!descriptor) return null;
        return {
          descriptor,
          label: input.label || this.getTargetLabel(descriptor),
          context: input.context || {},
        };
      }
      return null;
    },

    getTargetLabel(descriptor) {
      if (!descriptor) return "";
      const withoutNotes = descriptor.split("(")[0].trim();
      const parts = withoutNotes
        .split(">")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) return withoutNotes || descriptor;
      return parts[parts.length - 1];
    },

    refreshStylesFromPage() {
      if (!this.activeTabId) return;
      chrome.tabs.sendMessage(
        this.activeTabId,
        { type: "GET_STATE" },
        (styles) => {
          if (chrome.runtime.lastError) {
            return;
          }
          if (Array.isArray(styles)) {
            this.styles = styles;
          } else {
            this.styles = [];
          }
        },
      );
    },

    toggleStyle(style, event) {
      if (!this.activeTabId || !style) return;
      const enabled = event?.target?.checked ?? !style.enabled;
      style.enabled = enabled;
      chrome.tabs.sendMessage(
        this.activeTabId,
        {
          type: "TOGGLE",
          id: style.id,
          enabled,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
        },
      );
    },

    deleteStyle(style) {
      if (!style) return;
      this.deletingStyleId = style.id;
    },

    confirmDelete() {
      if (!this.activeTabId || !this.deletingStyleId) return;
      const styleId = this.deletingStyleId;
      this.deletingStyleId = null;

      chrome.tabs.sendMessage(
        this.activeTabId,
        {
          type: "DELETE_STYLE",
          id: styleId,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          }
          this.refreshStylesFromPage();
        },
      );
    },

    cancelDelete() {
      this.deletingStyleId = null;
    },

    refineStyleFromMenu(style) {
      this.startRefining(style);
      this.closeAllDropdownMenus();
    },

    toggleRefiningFromCard(style) {
      if (!style) return;
      if (this.deletingStyleId && this.deletingStyleId === style.id) return;
      this.startRefining(style);
    },

    editStyleFromMenu(style) {
      this.openEditor(style);
      this.closeAllDropdownMenus();
    },

    deleteStyleFromMenu(style) {
      this.deleteStyle(style);
      this.closeAllDropdownMenus();
    },

    closeAllDropdownMenus() {
      const menus = document.querySelectorAll(".dropdown-menu");
      menus.forEach((menu) => {
        const trigger = menu.querySelector('[aria-haspopup="menu"]');
        const popover = menu.querySelector("[data-popover]");
        if (trigger) {
          trigger.setAttribute("aria-expanded", "false");
        }
        if (popover) {
          popover.setAttribute("aria-hidden", "true");
        }
      });
    },

    closeStyleMenu() {
      this.closeAllDropdownMenus();
    },

    resetStyles() {
      if (!this.activeTabId) return;
      chrome.tabs.sendMessage(this.activeTabId, { type: "RESET" }, () => {
        this.setStatus("All styles disabled for this site.", "success");
        this.refreshStylesFromPage();
      });
    },

    openEditor(style) {
      this.editingStyle = style;
      this.closeStyleMenu();
      this.editorCss = style?.css || "";
      this.editorJs = style?.js || "";
      this.editorStatus = "";
      this.editorStatusType = "muted";
      this.editorSaving = false;
      this.editorOpen = true;
    },

    closeEditor() {
      this.editingStyle = null;
      this.editorCss = "";
      this.editorJs = "";
      this.editorStatus = "";
      this.editorStatusType = "muted";
      this.editorSaving = false;
      this.editorOpen = false;
    },

    startRefining(style) {
      if (!style) return;
      this.closeStyleMenu();
      if (this.refiningStyle && this.refiningStyle.id === style.id) {
        this.cancelRefining();
        return;
      }
      this.refiningStyle = style;
      this.instruction = "";
      this.focusInstructionInput();
    },

    cancelRefining() {
      this.refiningStyle = null;
    },

    saveEditor() {
      if (!this.editingStyle || !this.activeTabId) return;
      this.editorSaving = true;
      this.editorStatus = "Saving changes...";
      this.editorStatusType = "muted";

      chrome.tabs.sendMessage(
        this.activeTabId,
        {
          type: "UPDATE_STYLE",
          id: this.editingStyle.id,
          css: this.editorCss,
          js: this.editorJs,
        },
        (response) => {
          this.editorSaving = false;
          if (chrome.runtime.lastError || !response || !response.success) {
            this.editorStatus = "Failed to save. Refresh and try again.";
            this.editorStatusType = "error";
            console.error(chrome.runtime.lastError || response?.error);
            return;
          }

          this.editorStatus = "Saved";
          this.editorStatusType = "success";
          this.setStatus("Style updated for this site.", "success");
          this.refreshStylesFromPage();
          setTimeout(() => {
            this.closeEditor();
          }, 600);
        },
      );
    },

    // Rate limiting methods
    async updateRateLimitStatus() {
      try {
        const status = await getRateLimitStatus();
        this.rateLimitStatus = status;
      } catch (error) {
        console.error("Failed to get rate limit status:", error);
      }
    },

    formatResetDate(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    },

    async openSettings() {
      // Load current settings
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(
          ["openrouter_api_key", "openrouter_model"],
          resolve,
        );
      });

      this.settingsApiKey = result.openrouter_api_key || "";
      this.settingsModel = result.openrouter_model || "";
      this.settingsStatusMessage = "";
      this.settingsSaving = false;
      this.settingsOpen = true;
    },

    closeSettings() {
      this.settingsOpen = false;
      this.settingsStatusMessage = "";
    },

    async saveSettings() {
      this.settingsSaving = true;
      this.settingsStatusMessage = "";

      const settings = {
        openrouter_api_key: this.settingsApiKey.trim(),
        openrouter_model: this.settingsModel.trim(),
      };

      return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
          if (chrome.runtime.lastError) {
            this.settingsStatusMessage = "Failed to save settings";
            this.settingsStatusType = "error";
            this.settingsSaving = false;
            resolve();
            return;
          }

          this.settingsStatusMessage = "Settings saved successfully";
          this.settingsStatusType = "success";
          this.settingsSaving = false;

          // Auto-close after 1 second
          setTimeout(() => {
            this.closeSettings();
          }, 1000);

          resolve();
        });
      });
    },
  };
}

// Register as Alpine data component and start
document.addEventListener("alpine:init", () => {
  Alpine.data("popupApp", popupApp);
});
window.Alpine = Alpine;
Alpine.start();
