# ClickRemix BYOK (Bring Your Own Key Version)

An open-source Chrome extension that allows you to restyle and modify any webpage using natural language instructions. Uses your own OpenRouter API key to leverage powerful AI models for generating CSS and JavaScript modifications.

## Features

- 🎨 Modify any website with natural language instructions
- 🔑 Use your own OpenRouter API key (no subscriptions, no limits)
- 🎯 Target specific elements on the page
- 💾 Save and manage multiple styles per site
- 🔄 Refine existing styles with follow-up instructions
- ✏️ Manually edit generated CSS and JavaScript
- 🌙 Built with Alpine.js, Tailwind, Basecoat (for components)

## Project Structure

```
clickremix-byok/
├── extension/
│   ├── src/                    # Extension source files
│   │   ├── manifest.json       # Extension manifest
│   │   ├── background.js       # Service worker & API handling
│   │   ├── contentScript.js    # DOM interaction & style injection
│   │   ├── popup.html          # Main popup UI
│   │   ├── popup.js            # Popup logic
│   │   ├── popup.css           # Popup styles
│   │   ├── settings.html       # Settings page
│   │   ├── settings.js         # Settings logic
│   │   ├── theme.css           # Theme variables
│   │   ├── ratelimit.js        # Usage tracking
│   │   ├── logger.js           # Logging utility
│   │   ├── rules.json          # DNR rules for CSP stripping
│   │   ├── vendor/             # Vendored dependencies
│   │   └── scripts/            # Build utilities
│   │
│   └── dist/                   # Built extension (auto-generated)
│
├── extension/
│   └── src/
│       └── scripts/
│           └── generate-icons.js  # Icon generator script
└── package.json
```

## How It Works

1. **User Input**: Open the extension popup and type a natural language instruction (e.g., "Make the background dark" or "Hide all ads")
2. **Context Extraction**: The extension analyzes the current page's content and structure
3. **AI Processing**: Your instruction is sent to OpenRouter's API using your API key, which returns:
   - **CSS**: For visual styling changes
   - **JavaScript**: For DOM manipulation (when needed)
   - **Summary**: A short description of the applied style
4. **Injection**: The generated code is injected into the page and persists across reloads

## Setup

### Prerequisites

- Node.js 18+
- An OpenRouter API key ([get one here](https://openrouter.ai/keys))

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

```bash
npm run build
```

This compiles Tailwind CSS and creates the extension in the `extension/dist/` directory.

### 3. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the `extension/dist/` directory

### 4. Configure Your API Key

1. Click the ClickRemix BYOK icon in your browser toolbar
2. Click the gear icon in the bottom-right corner
3. Enter your OpenRouter API key
4. (Optional) Specify a model (defaults to `openai/gpt-5.1-codex-mini`)
5. Click "Save"

## Usage

1. Navigate to any website
2. Click the ClickRemix BYOK extension icon
3. Type your instruction (e.g., "Make everything comic sans" or "Hide the sidebar")
4. Click "Apply change" or press Cmd/Ctrl+Enter
5. LLM generates the JS and CSS and updates the page.
6. Add more instructions or edit the code.

### Advanced Features

- **Target Specific Elements**: Click the target icon (🎯) to select a specific element to modify
- **Refine Styles**: Click on any saved style card to refine it with additional instructions
- **Edit Code**: Use the menu (⋮) on any style to manually edit the CSS or JavaScript
- **Track Usage**: See how many API calls you've made this month at the bottom of the popup

## Development

### Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

This watches `extension/src/` and automatically rebuilds on file changes. Just reload the extension in Chrome to see updates.

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build to `extension/dist/` |
| `npm run dev` | Development mode: watch and rebuild on changes |
| `npm run sync:alpine` | Update vendored Alpine.js |

### Regenerate Icons

To regenerate the green extension icons:

```bash
node extension/src/scripts/generate-icons.js
```

## Architecture

### Extension Components

- **Background Service Worker** (`background.js`):
  - Handles API calls to OpenRouter
  - Manages API key storage
  - Executes JavaScript in the main world context

- **Content Script** (`contentScript.js`):
  - Scrapes page content for AI context
  - Injects generated styles and scripts
  - Manages style persistence per domain

- **Popup** (`popup.html/js`):
  - Main UI for instructions and style management
  - Uses Alpine.js for reactive state

- **Settings** (`settings.html/js`):
  - API key and model configuration
  - Opened via gear icon in popup

- **DNR Rules** (`rules.json`):
  - Strips CSP headers to allow injection on strict sites

### Data Flow

```
Popup → Content Script → Background Worker → OpenRouter API
  ↓                                              ↓
  ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  ↓
Inject CSS/JS into Page
```

## API Costs

This extension uses your own OpenRouter API key, so you only pay for what you use:

- Typical request: ~$0.01-0.05 (depending on model and page complexity)
- Models available: Claude, GPT-4, Llama, and [many more](https://openrouter.ai/docs/models)
- No monthly fees, no subscriptions, just pay-per-use

## Privacy & Security

- ✅ Your API key is stored **locally** in your browser (never sent to any server except OpenRouter)
- ✅ All code is **open source** and can be audited
- ✅ No tracking, no analytics, no data collection
- ⚠️ The extension strips CSP headers to enable injection (required for functionality)
- ⚠️ Generated JavaScript runs in the page context (review code before applying if concerned)

## License

Open source - feel free to modify and distribute.

## Credits

Built with:
- [Alpine.js](https://alpinejs.dev/) - Reactive UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [OpenRouter](https://openrouter.ai/) - Unified AI API
- [Sharp](https://sharp.pixelplumbing.com/) - Icon generation

## Support

For issues or questions:
- Open an issue on GitHub
