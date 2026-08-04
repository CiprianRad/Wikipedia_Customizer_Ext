# Wikipedia Systematic Learning

A Chrome extension (Manifest V3) that declutters Wikipedia's UI and turns article reading into a guided, quiz-gated learning experience powered by Google's Gemini API.

## Features

- **Distraction-free reading** — Toggle visibility of common Wikipedia UI elements:
  - Left sidebar
  - Right sidebar
  - Top header / banners
  - Bottom info panel
  - References / External links
  - Hatnotes
  - "See also" section
  - Categories

- **Quiz Mode (Systematic Learning)** — Locks all but the current section of an article. To unlock the next section, the reader must correctly answer an AI-generated multiple-choice question based on the section they just read.

- **AI-generated quizzes** — Uses the Gemini API to read the current section's text and generate a single, relevant multiple-choice question with one correct answer, in real time.

- **Cooldown on wrong answers** — Answering incorrectly triggers a 30-second cooldown before the reader can retry, discouraging guessing.

- **Skin-aware DOM parsing** — Works with both the modern Vector 2022 Wikipedia skin (`.mw-heading` wrappers, `<section>` tags) and older/legacy skins.

## How It Works

1. **Popup** (`popup.html`, `popup.js`) — Lets the user toggle each UI element and Quiz Mode on/off. Settings are persisted via `chrome.storage.local` and pushed to the active tab.
2. **Content script** (`content.js`) — Runs on `*.wikipedia.org` pages. Applies/removes CSS classes based on stored settings, parses the article into sections, and manages the quiz-lock/unlock flow.
3. **Background service worker** (`background.js`) — Handles quiz generation by calling the Gemini API (`gemini-2.5-flash`) with the section's text and parsing the structured JSON response.
4. **Options page** (`options.html`, `options.js`) — Where the user enters and saves their own Gemini API key.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Click the extension icon, then open **Options** (right-click the icon → Options) to enter your Gemini API key.

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Generate an API key.
3. Paste it into the extension's Options page. The key is stored locally via `chrome.storage.local` and is only used to call the Gemini API directly from your browser.

## Usage

1. Navigate to any Wikipedia article.
2. Click the extension icon and toggle the UI elements you want to hide.
3. Enable **Quiz Mode** to start systematic learning: the article will collapse to its first section, with the rest locked.
4. Click **Take Quiz to Unlock Next Section**, answer the AI-generated question correctly, and the next section will unlock and scroll into view.
5. An incorrect answer triggers a 30-second cooldown before you can try again.

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist user preferences and API key |
| `activeTab` / `scripting` | Apply UI changes to the current Wikipedia tab |
| `host_permissions` (`*.wikipedia.org`) | Run the content script on Wikipedia pages |
| `host_permissions` (`generativelanguage.googleapis.com`) | Call the Gemini API to generate quizzes |

## Project Structure

```
.
|-- manifest.json       Extension configuration (Manifest V3)
|-- popup.html
|-- popup.js
|-- popup.css           Toggle UI shown when clicking the extension icon
|-- options.html
|-- options.js          Page for entering the Gemini API key
|-- content.js
|-- content.css         Injected into Wikipedia pages; handles UI toggles and Quiz Mode
`-- background.js       Service worker; calls the Gemini API
```

## Notes

- Quiz questions are generated fresh each time — there's no caching, so the same section may produce different questions on repeat visits.
- Requires a valid Gemini API key to use Quiz Mode; the UI decluttering features work without one.

## License

Add your preferred license here (e.g., MIT).
