// background.js

// Import logger and rate limiting functions
importScripts("logger.js");
importScripts("ratelimit.js");

// ============================================================================
// CONFIGURATION
// ============================================================================

// OpenRouter API endpoint
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default model if not specified by user
const DEFAULT_MODEL = "openai/gpt-5.1-codex-mini";

// ============================================================================
// PROMPT TEMPLATE
// ============================================================================

const SYSTEM_PROMPT = `
You are a rendering assistant that outputs safe CSS and JavaScript to visually modify a page based on user instructions.
- Only produce valid JSON.
- Use CSS for styling and layout.
- Use JavaScript ONLY when CSS is insufficient (e.g. moving DOM elements, changing text content, adding interactivity).
- Avoid code that breaks the page's core functionality.
- Prefer targeting broad selectors (body, main, article, aside) and class/ID patterns like *sidebar*, *ad*, *promo*.
`;

function formatTargetContext(targetSelection) {
  if (!targetSelection) {
    return {
      summary: "No specific element was selected by the user.",
      before: "",
      after: "",
      outer: "",
      text: "",
    };
  }
  if (typeof targetSelection === "string") {
    return {
      summary: targetSelection,
      before: "",
      after: "",
      outer: "",
      text: "",
    };
  }
  return {
    summary:
      targetSelection.descriptor || targetSelection.label || "Selected element",
    before: targetSelection.context?.beforeHTML || "",
    after: targetSelection.context?.afterHTML || "",
    outer: targetSelection.context?.outerHTML || "",
    text: targetSelection.context?.text || "",
  };
}

function buildUserPrompt(
  instruction,
  pageSummary,
  targetSelection,
  iterationContext = null,
) {
  const targetContext = formatTargetContext(targetSelection);

  // If we're iterating, build context from conversation history
  let iterationPrompt = "";
  if (iterationContext && iterationContext.conversationHistory) {
    const historyText = iterationContext.conversationHistory
      .map(
        (item, idx) =>
          `${idx + 1}. User: "${item.content}"\n   Result: CSS and JS were generated`,
      )
      .join("\n");

    iterationPrompt = `
IMPORTANT: You are REFINING an existing style. The user has made previous requests and you've already generated CSS/JS.

Previous conversation:
${historyText}

Current CSS:
${iterationContext.currentCss || "/* no CSS yet */"}

Current JavaScript:
${iterationContext.currentJs || "// no JS yet"}

The user is now asking you to REFINE/MODIFY the existing style with this new instruction: "${instruction}"

Your job is to BUILD UPON the existing CSS/JS, not start from scratch. Make incremental changes that address the new instruction while preserving the intent of previous changes where appropriate.
`;
  }

  return `
You will receive:
1. An INSTRUCTION from the user on how they want the page to look or behave.
2. A PAGE_SUMMARY that includes:
   - URL and title (plain text)
   - "Content Snippet:" which is full visible text
   - "Body HTML (truncated):" which is raw HTML (up to the first ~100k characters)

Treat the "Content Snippet" as plain text content and "Body HTML (truncated)" as HTML markup for structure/context.

If provided, the user explicitly selected a page element to focus on. Prefer to scope your CSS/JS to that element and its immediate context:
Target descriptor: ${targetContext.summary}
Target inner text (truncated): ${targetContext.text}
HTML before target (truncated): ${targetContext.before}
Selected element outerHTML (truncated): ${targetContext.outer}
HTML after target (truncated): ${targetContext.after}

${iterationPrompt}

Your job:
- Interpret the INSTRUCTION.
- Generate CSS rules and/or JavaScript code to modify the page.
- Use CSS for visual changes (colors, fonts, hiding elements).
- Use JavaScript for structural changes (moving elements, changing text) or behavior.
- Be conservative: avoid breaking layouts with overly aggressive selectors.

Return ONLY valid JSON in this format:
{
  "css": "/* your CSS here */",
  "js": "// your JS here (optional, leave empty if not needed)",
  "summary": "A very short, title-like name for the style (max 5-7 words). Examples: 'Dark Mode', 'Minimalist Layout', 'Digg Theme'. Do NOT describe specific colors or CSS properties.",
  "notes": "Short explanation of changes."
}

INSTRUCTION:
${instruction}

PAGE_SUMMARY:
${pageSummary}
`;
}

// ============================================================================
// API HANDLER
// ============================================================================

async function callRemixAPI(
  instruction,
  pageSummary,
  targetSelection,
  iterationContext = null,
) {
  // Get API key and model from storage
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(
      ["openrouter_api_key", "openrouter_model"],
      (result) => {
        resolve(result);
      },
    );
  });

  const apiKey = settings.openrouter_api_key;
  const model = settings.openrouter_model || DEFAULT_MODEL;

  if (!apiKey) {
    logger.error("No API key configured");
    return {
      success: false,
      error: "No OpenRouter API key configured.",
    };
  }

  const prompt = buildUserPrompt(
    instruction,
    pageSummary,
    targetSelection,
    iterationContext,
  );

  try {
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    };

    logger.log("Calling OpenRouter API", {
      url: OPENROUTER_API_URL,
      model: model,
      messagesCount: requestBody.messages.length,
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": chrome.runtime.getURL(""),
        "X-Title": "ClickRemix BYOK",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("OpenRouter API Error:", errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    const content = data.choices[0].message.content;

    // Parse the JSON response from the model
    let parsedResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        content.match(/```json\n?([\s\S]*?)\n?```/) ||
        content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error("Failed to parse model response:", parseError);
      throw new Error("Failed to parse model response as JSON");
    }

    // Increment message counter (no enforcement, just tracking)
    await incrementRateLimitCounter();

    return {
      success: true,
      css: parsedResponse.css || "",
      js: parsedResponse.js || "",
      summary: parsedResponse.summary || "Custom style",
      notes: parsedResponse.notes || "",
    };
  } catch (error) {
    logger.error("Model Call Failed:", error);

    // Still increment counter for tracking
    await incrementRateLimitCounter();

    return { success: false, error: error.message };
  }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CALL_MODEL") {
    // Perform the async operation
    callRemixAPI(
      request.instruction,
      request.pageSummary,
      request.targetSelection,
      request.iterationContext || null,
    ).then((result) => {
      sendResponse(result);
    });

    return true; // Indicates we will send a response asynchronously
  }

  if (request.type === "UPDATE_BADGE") {
    if (sender.tab) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: request.text });
      if (request.text) {
        chrome.action.setBadgeBackgroundColor({
          tabId: sender.tab.id,
          color: "#4EBEAA",
        }); // Teal (Beta badge color)
      }
    }
  }

  if (request.type === "EXECUTE_MAIN_WORLD_JS") {
    if (sender.tab) {
      chrome.scripting
        .executeScript({
          target: { tabId: sender.tab.id },
          world: "MAIN",
          func: (code) => {
            try {
              // Execute the code in the global scope
              // We use new Function instead of eval for slightly better scope isolation within the window
              const exec = new Function(code);
              exec();
            } catch (e) {
              logger.error("ClickRemix: JS Execution Error:", e);
            }
          },
          args: [request.code],
        })
        .catch((err) => logger.error("Script injection failed:", err));
    }
    return true;
  }

  if (
    request.type === "TARGET_SELECTED" ||
    request.type === "CLEAR_TARGET_SELECTION"
  ) {
    const targetTabId = request.tabId || (sender.tab && sender.tab.id);
    if (!targetTabId) {
      sendResponse({ ok: false });
      return true;
    }
    const key = `target_selection_${targetTabId}`;
    const payload =
      request.type === "TARGET_SELECTED"
        ? request.targetData || {
            descriptor: request.target || "",
            label: request.target || "",
            context: request.context || {},
          }
        : null;
    const reason = request.reason || (payload ? "selected" : "cleared");
    const action = payload
      ? chrome.storage.local.set({ [key]: payload })
      : chrome.storage.local.remove(key);

    Promise.resolve(action).finally(() => {
      chrome.runtime.sendMessage({
        type: "TARGET_SELECTED_BROADCAST",
        tabId: targetTabId,
        target: payload ? payload.descriptor : "",
        targetData: payload || null,
        reason,
      });
      if (
        payload &&
        chrome.action &&
        typeof chrome.action.openPopup === "function"
      ) {
        try {
          const result = chrome.action.openPopup();
          if (result && typeof result.catch === "function") {
            result.catch((err) =>
              logger.warn("ClickRemix: openPopup failed", err),
            );
          }
        } catch (err) {
          logger.warn("ClickRemix: openPopup threw", err);
        }
      }
      sendResponse({ ok: true });
    });
    return true;
  }
});

// ============================================================================
// EXTENSION LIFECYCLE
// ============================================================================

// Initialize rate limiting on extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    logger.log("ClickRemix installed, initializing rate limits...");
    await initializeRateLimit();
  }
});
