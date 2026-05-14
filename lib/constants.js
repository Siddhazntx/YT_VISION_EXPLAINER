/**
 * @fileoverview Global configuration and constants
 * @author Siddhazntx
 */

// Define as window global for content scripts, export for ES6 modules
const YTV_CONFIG = Object.freeze({

    // -----------------------------------
    // EXTENSION META
    // -----------------------------------

    APP: {
        NAME: "YT Vision Explainer",
        VERSION: "1.0.0",
        AUTHOR: "Siddhazntx",
        DEBUG: true
    },

    // -----------------------------------
    // STORAGE KEYS
    // -----------------------------------

    STORAGE: {
        API_KEY: "ytv_gemini_api_key",
        MODEL_PREF: "ytv_selected_model",
        THEME_PREF: "ytv_theme",
        CHAT_HISTORY: "ytv_chat_history",
        LAST_PROMPT: "ytv_last_prompt"
    },

    // -----------------------------------
    // DOM IDS / CLASSES
    // -----------------------------------

    DOM: {
        OVERLAY_ID: "ytv-capture-overlay",

        CHAT_HOST_ID: "ytv-chat-shadow-host",

        CHAT_CONTAINER_ID: "ytv-chat-container",

        DRAG_HANDLE_ID: "ytv-drag-handle",

        SCREENSHOT_PREVIEW_ID: "ytv-screenshot-preview",

        SELECTION_BOX_CLASS: "ytv-selection-box",

        LOADING_SPINNER_CLASS: "ytv-loading-spinner",

        RESPONSE_MARKDOWN_CLASS: "ytv-response-markdown"
    },

    // -----------------------------------
    // API CONFIG
    // -----------------------------------

    API: {

        BASE_URL:
            "https://generativelanguage.googleapis.com/v1beta/models/",

        DEFAULT_MODEL: "gemini-2.5-flash",

        AVAILABLE_MODELS: [
            "gemini-2.5-flash",
            "gemini-2.5-pro"
        ],

        DEFAULT_TIMEOUT: 30000,

        MAX_OUTPUT_TOKENS: 2048,

        TEMPERATURE: 0.4,

        TOP_P: 0.95,

        TOP_K: 40
    },

    // -----------------------------------
    // REQUEST CONTROL
    // -----------------------------------

    REQUESTS: {

        COOLDOWN_MS: 1500,

        MAX_RETRIES: 3,

        RETRY_DELAY_MS: 1000
    },

    // -----------------------------------
    // SCREENSHOT SETTINGS
    // -----------------------------------

    SCREENSHOT: {

        FORMAT: "jpeg",

        QUALITY: 95,

        MIME_TYPE: "image/jpeg",

        MAX_WIDTH: 4096,

        MAX_HEIGHT: 4096
    },

    // -----------------------------------
    // UI SETTINGS
    // -----------------------------------

    UI: {

        PANEL_WIDTH: 420,

        PANEL_HEIGHT: 540,

        MIN_PANEL_WIDTH: 320,

        MIN_PANEL_HEIGHT: 240,

        DEFAULT_Z_INDEX: 999999,

        ANIMATION_DURATION: 180
    },

    // -----------------------------------
    // EVENTS / MESSAGE ACTIONS
    // -----------------------------------

    EVENTS: {

        ACTIVATE_CAPTURE_MODE: "ACTIVATE_CAPTURE_MODE",

        DEACTIVATE_CAPTURE_MODE: "DEACTIVATE_CAPTURE_MODE",

        CAPTURE_SCREENSHOT: "CAPTURE_SCREENSHOT",

        PROCESS_IMAGE_PROMPT: "PROCESS_IMAGE_PROMPT",

        STREAM_RESPONSE_START: "STREAM_RESPONSE_START",

        STREAM_RESPONSE_CHUNK: "STREAM_RESPONSE_CHUNK",

        STREAM_RESPONSE_END: "STREAM_RESPONSE_END",

        OPEN_CHAT_PANEL: "OPEN_CHAT_PANEL",

        CLOSE_CHAT_PANEL: "CLOSE_CHAT_PANEL",

        SHOW_LOADING: "SHOW_LOADING",

        HIDE_LOADING: "HIDE_LOADING",

        ERROR: "ERROR",

        PING: "PING"
    },

    // -----------------------------------
    // FEATURE FLAGS
    // -----------------------------------

    FEATURES: {

        ENABLE_STREAMING: true,

        ENABLE_SCREENSHOT_PREVIEW: true,

        ENABLE_CHAT_HISTORY: true,

        ENABLE_MARKDOWN_RENDERING: true,

        ENABLE_DRAG_RESIZE: true,

        ENABLE_DEBUG_LOGS: true
    },

    // -----------------------------------
    // URL CONFIGURATION
    // -----------------------------------

    URLS: {
        YOUTUBE_BASE: "https://www.youtube.com/",
        YOUTUBE_WATCH: "https://www.youtube.com/watch",
        YOUTUBE_SHORT: "https://www.youtube.com/shorts/"
    },

    // -----------------------------------
    // ERROR MESSAGES
    // -----------------------------------

    ERRORS: {

        NO_API_KEY:
            "No Gemini API key found. Please configure it in settings.",

        INVALID_CAPTURE:
            "Failed to capture screenshot region.",

        EMPTY_RESPONSE:
            "Gemini returned an empty response.",

        NETWORK_ERROR:
            "Network error occurred while contacting Gemini.",

        INVALID_TAB:
            "YT Vision Explainer cannot run on this page."
    }
});

// Set on window for content scripts and options page
if (typeof window !== "undefined") {
    window.YTV_CONFIG = YTV_CONFIG;
}