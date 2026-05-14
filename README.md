# 🎥 YT Vision Explainer

A production-grade, high-performance Chrome Extension that acts as an intelligent companion while watching technical tutorials on YouTube. Drag and select any portion of a video (like a code block or architectural diagram) to instantly capture it and discuss it with an advanced vision AI model directly inside a beautiful, floating chat interface.

Built from scratch using an isolated Shadow DOM architecture to guarantee zero styling conflicts with YouTube's aggressive native CSS layout.

---

## 🚀 Features

* **Precision Screen Capture:** Fluid drag-and-drop overlay to crop exactly what you need from the video player.
* **Shadow DOM Isolation:** Completely isolated UI styling that never bleeds into or is overwritten by YouTube.
* **Global Event Control:** Advanced keyboard event interceptors that prevent your chat inputs from triggering YouTube shortcuts (e.g., typing "f" won't full-screen the video).
* **Asynchronous AI Pipeline:** Stitched non-streaming generation via Gemini 2.5 Flash for complete, uncut explanations.
* **Conversational Memory:** Full message history retention for seamless follow-up debugging questions.

---

## 🛠️ Local Setup Guide

Follow these steps to run the extension locally on your machine for development:

### 1. Clone the Repository
```bash
git clone [https://github.com/Siddhazntx/YT_VISION_EXPLAINER.git](https://github.com/Siddhazntx/YT_VISION_EXPLAINER.git)
cd YT_VISION_EXPLAINER
```

### 2. Install Dependencies

Ensure you have [Node.js](https://nodejs.org/) installed, then fetch the extension's utilities:

```bash
npm install
```

### 3. Load the Extension into Chrome

1. Open your Google Chrome browser and navigate to `chrome://extensions/`.
2. In the top-right corner, toggle the **Developer mode** switch to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. Select the root folder of this project (`YT_VISION_EXPLAINER`—the directory containing `manifest.json`).

---

## 🔑 Configuration & API Keys

By default, the extension handles data securely using Chrome's local storage engine. However, to authorize calls to the AI models, you must provide your own API key.

### For Users: Getting Started

1. Obtain a free API key from **[Google AI Studio](https://aistudio.google.com/)**.
2. *Note: If you haven't configured the Options UI page yet, you can temporarily add your key locally for testing:*
   * Open `lib/gemini.js`.
   * Locate the API Key variable block and plug your string directly into the initialization state.
   * Save and click **Reload** in `chrome://extensions/`.

---

## 🔌 Switching to Other AI Providers (Anthropic, OpenAI, etc.)

Thanks to the separated architecture of this project, the frontend UI (`chat_ui.js`) acts as a pure universal view container. It simply passes an image and text and expects a text response back.

If you want to plug in an alternative model like **Claude 3.5 Sonnet** or **GPT-4o**, you can build a new adapter file inside the `lib/` directory without touching a single line of UI code.

### Architecture Workflow

### Developer Implementation Guide

1. **Create an Adapter:** Create a new script in the `lib/` folder (e.g., `lib/anthropic.js`).
2. **Implement the Contract:** Your file must declare a global wrapper function on the service worker context (`self`) matching this exact signature:
```javascript
self.AnthropicAPI = {
    async askVisionModel(base64Image, userPrompt, history = []) {
        // 1. Process/clean the base64 string if necessary
        // 2. Map the conversation 'history' to your provider's specific JSON scheme
        // 3. Fire the fetch request to the provider endpoint
        // 4. Return an object matching this strict signature:
        return { success: true, text: "Your AI Output text" };
    }
};
```

3. **Link to Service Worker:** Open `background/service_worker.js`:
* Update the `importScripts()` array at the very top to import your new file instead of `gemini.js`.
* Inside the `PROCESS_IMAGE_PROMPT` listener, swap the active engine:
```javascript
// Change this line to your new object provider:
AnthropicAPI.askVisionModel(request.payload.image, request.payload.prompt, request.payload.history)
```

---

## 🎥 Demonstration

[*(Screen recording demonstrating the screenshot capture loop, floating interface deployment, and conversation pipelines coming here soon!)*](https://youtu.be/FXooe5Jw5J4)
