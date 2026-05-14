/**
 * @fileoverview Background Service Worker
 * @author Siddhazntx
 */

importScripts(
    "../lib/constants.js",
    "../lib/storage.js",
    "../lib/gemini.js"
);

const BackgroundController = (() => {

    // -----------------------------------
    // CONSTANTS
    // -----------------------------------

    const ACTIONS = {
        ACTIVATE_CAPTURE_MODE: "ACTIVATE_CAPTURE_MODE",
        PROCESS_IMAGE_PROMPT: "PROCESS_IMAGE_PROMPT",
        CAPTURE_SCREENSHOT: "CAPTURE_SCREENSHOT",
        PING: "PING"
    };

    // -----------------------------------
    // LOGGER
    // -----------------------------------

    function log(...args) {
        console.log("[YTV Background]", ...args);
    }

    function error(...args) {
        console.error("[YTV Background]", ...args);
    }

    // -----------------------------------
    // TAB VALIDATION
    // -----------------------------------

    function isValidTab(url = "") {
        return (
            url.startsWith("https://www.youtube.com/")
        );
    }

    // -----------------------------------
    // TOOLBAR CLICK
    // -----------------------------------

    async function safeSendMessage(tabId, message, retries = 5) {

        for (let attempt = 0; attempt < retries; attempt++) {

            try {
                const response = await chrome.tabs.sendMessage(tabId, message);
                return response;
            } catch (err) {
                if (attempt === retries - 1) {
                    throw err;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }

    async function handleIconClick(tab) {

        try {

            if (!tab?.id || !isValidTab(tab.url)) {
                log("Invalid tab for activation.");
                return;
            }

            await safeSendMessage(tab.id, {
                action: ACTIONS.ACTIVATE_CAPTURE_MODE
            });

            log("Capture mode activated.");

        } catch (err) {

            error("Failed to activate capture mode:", err);
        }
    }

    // -----------------------------------
    // SCREENSHOT CAPTURE
    // -----------------------------------

    async function captureVisibleTab() {

        try {

            const dataUrl = await chrome.tabs.captureVisibleTab(
                undefined,
                {
                    format: "jpeg",
                    quality: 95
                }
            );

            return {
                success: true,
                dataUrl
            };

        } catch (err) {

            error("Screenshot failed:", err);

            return {
                success: false,
                error: err.message
            };
        }
    }

    // -----------------------------------
    // MESSAGE ROUTER
    // -----------------------------------

    function handleMessage(request, sender, sendResponse) {

        const { action, payload } = request || {};

        if (!action) {
            sendResponse({
                success: false,
                error: "Missing action type."
            });

            return false;
        }

        // -----------------------------------
        // ASYNC ROUTES
        // -----------------------------------

        (async () => {

            try {

                switch (action) {

                    // -------------------------
                    // PING
                    // -------------------------

                    case ACTIONS.PING:

                        sendResponse({
                            success: true,
                            message: "Background alive."
                        });

                        break;

                    // -------------------------
                    // SCREENSHOT
                    // -------------------------

                    case ACTIONS.CAPTURE_SCREENSHOT: {

                        const result = await captureVisibleTab();

                        sendResponse(result);

                        break;
                    }

                    // -------------------------
                    // GEMINI REQUEST
                    // -------------------------

                    case ACTIONS.PROCESS_IMAGE_PROMPT: {

                        const result = await GeminiAPI.askVisionModel(
                            payload.image,
                            payload.prompt,
                            payload.options || {}
                        );

                        sendResponse(result);

                        break;
                    }

                    // -------------------------
                    // UNKNOWN
                    // -------------------------

                    default:

                        sendResponse({
                            success: false,
                            error: `Unknown action: ${action}`
                        });
                }

            } catch (err) {

                error("Message routing failed:", err);

                sendResponse({
                    success: false,
                    error: err.message || "Unknown background error."
                });
            }

        })();

        // Keep channel alive for async response
        return true;
    }

    // -----------------------------------
    // EXTENSION INSTALL
    // -----------------------------------

    async function handleInstall(details) {

        log("Installed:", details.reason);

        if (details.reason === "install") {

            // Open onboarding/settings page
            await chrome.runtime.openOptionsPage();
        }
    }

    // -----------------------------------
    // EXTENSION STARTUP
    // -----------------------------------

    function init() {

        chrome.action.onClicked.addListener(handleIconClick);

        chrome.runtime.onMessage.addListener(handleMessage);

        chrome.runtime.onInstalled.addListener(handleInstall);

        log("Background worker initialized.");
    }

    return {
        init
    };

})();

BackgroundController.init();