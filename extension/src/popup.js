// Vendored CSP-friendly Alpine build for extension packaging.
import Alpine from "./vendor/alpinejs-csp.esm.js";

// Rate limit functions are loaded from ratelimit.js (loaded via script tag in popup.html)

// ============================================================================
// TEMPLATE LIBRARY
// ============================================================================

// Category configuration with icons and colors
const categoryConfig = {
  general: {
    icon: "fa-globe",
    color: "primary",
    label: "General",
  },
  news: {
    icon: "fa-newspaper",
    color: "secondary",
    label: "News",
  },
  chat: {
    icon: "fa-message",
    color: "accent",
    label: "AI Chat",
  },
  social: {
    icon: "fa-share-nodes",
    color: "chart-5",
    label: "Social",
  },
  shopping: {
    icon: "fa-cart-shopping",
    color: "chart-3",
    label: "Shopping",
  },
  fun: {
    icon: "fa-face-laugh-squint",
    color: "chart-2",
    label: "Fun",
  },
};

const templateLibrary = [
  // General - works on any site
  {
    id: "dark-mode",
    title: "Dark mode",
    description: "Comfortable dark theme for any site",
    category: "general",
    icon: "fa-moon",
    instruction:
      "Switch the page to a soft dark mode: dark charcoal background, dimmed text, muted accents, and ensure links remain visible with a subtle blue tint. Preserve the layout and functionality.",
  },
  {
    id: "focus-mode",
    title: "Focus mode",
    description: "Dim everything except main content",
    category: "general",
    icon: "fa-crosshairs",
    instruction:
      "Enable focus mode: identify the main content area and highlight it with full opacity, while dimming all surrounding elements (navigation, sidebars, ads) to 30% opacity with a slight blur effect.",
  },
  {
    id: "kill-sticky",
    title: "Kill sticky headers",
    description: "Remove fixed navbars eating screen space",
    category: "general",
    icon: "fa-thumbtack",
    instruction:
      "Find all fixed or sticky positioned elements (headers, navbars, floating buttons, cookie banners) and change them to static positioning so they scroll with the page instead of staying fixed on screen.",
  },
  {
    id: "larger-text",
    title: "Larger text",
    description: "Increase all text sizes by 50%",
    category: "general",
    icon: "fa-text-height",
    instruction:
      "Increase all text sizes by 50%: scale up all fonts proportionally, increase line height to 1.6, add more padding around interactive elements, and ensure the layout adapts without breaking.",
  },
  {
    id: "sepia-reading",
    title: "Sepia mode",
    description: "Warm beige tones for comfortable reading",
    category: "general",
    icon: "fa-book-open",
    instruction:
      "Transform the page into a sepia-toned reading mode: warm beige background (#F4F1EA), dark brown text (#3E2723), soft edges with padding, increase line height to 1.8, and use a serif font for body text.",
  },

  // News - news sites
  {
    id: "archive-links",
    title: "Archive.is links",
    description: "Open articles through archive.is",
    category: "news",
    icon: "fa-box-archive",
    instruction:
      "Find all internal article links on this news site and modify them to open through archive.is instead. For each link, prepend 'https://archive.is/' to the original URL. Add a small archive icon next to modified links to indicate they will open the archived version.",
  },
  {
    id: "remove-paywall-overlay",
    title: "Remove overlay",
    description: "Hide subscribe popups and overlays",
    category: "news",
    icon: "fa-eye-slash",
    instruction:
      "Remove any modal overlays, paywall popups, 'subscribe to continue reading' banners, and blur effects that block the article content. Also remove any scroll-blocking on the body element.",
  },

  // Chat - AI chat interfaces
  {
    id: "chat-clean-copy",
    title: "Clean copy button",
    description: "Copy AI responses without formatting",
    category: "chat",
    icon: "fa-copy",
    instruction:
      "Add a 'Copy clean' button next to each AI response in this chat interface. When clicked, it should copy the response text without any markdown formatting, code block syntax, or 'As an AI...' type intros - just the plain useful content.",
  },
  {
    id: "chat-edit-response",
    title: "Edit response button",
    description: "Add ability to edit AI responses",
    category: "chat",
    icon: "fa-pen-to-square",
    instruction:
      "Add an 'Edit' button next to each AI response in this chat interface. When clicked, it should make the response text editable in place, allowing users to modify the AI's response. Include 'Save' and 'Cancel' buttons that appear when editing. The edited text should replace the original response when saved.",
  },
  {
    id: "chat-print-response",
    title: "Print response button",
    description: "Print AI response in new tab",
    category: "chat",
    icon: "fa-print",
    instruction:
      "Add a 'Print' button next to each AI response in this chat interface. When clicked, it should open a new tab containing only that AI response (with proper formatting preserved), and automatically trigger the browser's print dialog for the user to print it.",
  },
  {
    id: "chat-wider",
    title: "Wider chat",
    description: "Expand chat area to full width",
    category: "chat",
    icon: "fa-arrows-left-right",
    instruction:
      "Expand the chat conversation area to use more horizontal space. Remove or reduce side margins, make the message container wider, and let code blocks use more width. Keep it readable but use available screen space.",
  },

  // Social - social media feeds
  {
    id: "social-hide-promoted",
    title: "Hide promoted posts",
    description: "Remove ads and sponsored content",
    category: "social",
    icon: "fa-ban",
    instruction:
      "Hide all promoted posts, sponsored content, and advertisements from this social media feed. Look for posts marked as 'Promoted', 'Sponsored', 'Ad', or similar labels and hide them completely.",
  },
  {
    id: "social-hide-suggestions",
    title: "Hide suggestions",
    description: "Remove 'who to follow' and recommendations",
    category: "social",
    icon: "fa-user-minus",
    instruction:
      "Hide all 'Who to follow', 'Suggested for you', 'People you may know', and similar recommendation sections from this social media site. Keep the main feed but remove the suggestions.",
  },

  // Shopping - marketplaces
  {
    id: "shopping-dim-dark-patterns",
    title: "Dim dark patterns",
    description: "Fade urgency and pressure tactics",
    category: "shopping",
    icon: "fa-eye-low-vision",
    instruction:
      "Dim dark pattern elements on this shopping site to 20% opacity: fake urgency messages ('Only 2 left!', 'Sale ends in...'), countdown timers, 'X people are viewing this', 'Y people bought this today', low stock warnings, and other pressure tactics. On mouse hover, restore them to full opacity so they're still readable if needed.",
  },
  {
    id: "shopping-focus-product",
    title: "Focus on product",
    description: "Dim everything except product details",
    category: "shopping",
    icon: "fa-crosshairs",
    instruction:
      "Identify the core product information (title, price, images, description, specifications) and keep it fully visible. Dim or hide everything else: recommendations, 'frequently bought together', sponsored products, ads, and other distractions. Help focus on just the product being viewed.",
  },

  // Fun - just for laughs
  {
    id: "comic-sans",
    title: "Comic Sans everything",
    description: "Change all fonts to Comic Sans MS",
    category: "fun",
    icon: "fa-font",
    instruction:
      "Replace every font on the page with Comic Sans MS. Make sure headings, body text, buttons, and even code blocks all use Comic Sans. Embrace the chaos.",
  },
  {
    id: "matrix-effect",
    title: "Matrix effect",
    description: "Green CRT-style text with glow",
    category: "fun",
    icon: "fa-code",
    instruction:
      "Apply a Matrix-style effect: black background, phosphor green (#39FF14) monospace text with a subtle glow, add CRT scanline animation, slight text flicker, and make the page feel like a 1990s computer terminal.",
  },
  {
    id: "rainbow-mode",
    title: "Rainbow mode",
    description: "Add colorful gradients everywhere",
    category: "fun",
    icon: "fa-rainbow",
    instruction:
      "Add rainbow flair to the page: apply subtle animated rainbow gradient backgrounds to headers, add colorful borders to cards and containers, make links cycle through rainbow colors on hover, and add gentle color transitions throughout.",
  },
  {
    id: "replace-trump",
    title: "Replace Trump with emoji",
    description: "Bring some fun to your news",
    categories: ["fun", "news"],
    icon: "fa-face-grin-squint-tears",
    instruction:
      "Replace all mentions of 'Trump' with a clown emoji throughout the page.",
  },
  {
    id: "replace-ai",
    title: "Replace AI with emoji",
    description: "For when you're tired of AI hype",
    categories: ["fun", "news"],
    icon: "fa-face-rolling-eyes",
    instruction:
      "Replace all mentions of 'AI' and 'artificial intelligence' with a rolling eyes emoji throughout the page.",
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
    status: { text: "", type: "normal", persist: false, isApiKeyError: false },
    statusTimer: null,
    suppressTargetClearStatus: false,
    deletingStyleId: null,

    // Iteration state
    refiningStyle: null,

    // Template library state
    templatesExpanded: false,
    templateCategoryFilter: "all",

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
    templateLibrary,
    categoryConfig,

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

    getTemplateCategories(template) {
      if (!template) return [];
      if (template.categories) return template.categories;
      if (template.category) return [template.category];
      return [];
    },

    get templateCategories() {
      const counts = {};
      const order = [];

      this.templateLibrary.forEach((template) => {
        const cats = this.getTemplateCategories(template);
        cats.forEach((cat) => {
          if (counts[cat] === undefined) {
            counts[cat] = 0;
            order.push(cat);
          }
          counts[cat] += 1;
        });
      });

      const categories = [
        {
          id: "all",
          label: "All",
          icon: "fa-border-all",
          color: "foreground",
          count: this.templateLibrary.length,
        },
      ];

      order.forEach((category) => {
        const config = this.categoryConfig[category] || {};
        categories.push({
          id: category,
          label: config.label || this.formatCategoryLabel(category),
          icon: config.icon || "fa-folder",
          color: config.color || "muted-foreground",
          count: counts[category],
        });
      });

      return categories;
    },

    get filteredTemplates() {
      if (this.templateCategoryFilter === "all") {
        return this.templateLibrary;
      }
      return this.templateLibrary.filter((template) => {
        const cats = this.getTemplateCategories(template);
        return cats.includes(this.templateCategoryFilter);
      });
    },

    isRefining(style) {
      if (!this.refiningStyle || !style) return false;
      return this.refiningStyle.id === style.id;
    },

    handleStatusUpdate(message) {
      this.applyBusy = false;

      // Check if error is about missing API key and add settings link
      let statusText = message.text;
      let isApiKeyError = false;
      if (
        message.statusType === "error" &&
        message.text &&
        (message.text.includes("No API key") ||
          message.text.includes("API key"))
      ) {
        isApiKeyError = true;
      }

      this.setStatus(statusText, message.statusType, false, isApiKeyError);
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

    setStatus(msg, type = "normal", persist = false, isApiKeyError = false) {
      if (this.statusTimer) {
        clearTimeout(this.statusTimer);
        this.statusTimer = null;
      }
      if (!msg) {
        this.status = {
          text: "",
          type: "normal",
          persist: false,
          isApiKeyError: false,
        };
        return;
      }
      this.status = { text: msg, type, persist, isApiKeyError };
      if (!persist) {
        this.statusTimer = setTimeout(() => {
          this.status = {
            text: "",
            type: "normal",
            persist: false,
            isApiKeyError: false,
          };
          this.statusTimer = null;
        }, 3200);
      }
    },

    focusInstructionInput() {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
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
      this.focusInstructionInput();
      const trimmedInstruction =
        typeof this.instruction === "string" ? this.instruction.trim() : "";
      if (!trimmedInstruction) {
        this.setStatus("Enter a change to apply.", "error");
        const textarea = this.$refs.instruction;
        const targetButton = document.getElementById("btn-target-mode");
        if (textarea) {
          textarea.classList.add("shake");
          setTimeout(() => textarea.classList.remove("shake"), 500);
        }
        if (targetButton) {
          targetButton.classList.add("shake");
          setTimeout(() => targetButton.classList.remove("shake"), 500);
        }
        return;
      }
      if (!this.activeTabId) {
        this.setStatus("No active tab found.", "error");
        return;
      }

      // Only persist if it's not a template instruction
      const isTemplate = this.templateLibrary.some(
        (tmpl) => tmpl.instruction === trimmedInstruction,
      );
      if (!isTemplate) {
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

    toggleTemplates() {
      this.templatesExpanded = !this.templatesExpanded;
    },

    formatCategoryLabel(value) {
      if (!value) return "";
      const first = value.charAt(0).toUpperCase();
      const rest = value.slice(1);
      return first + rest;
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
          // Auto-expand templates when no styles exist
          if (this.styles.length === 0) {
            this.templatesExpanded = true;
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
