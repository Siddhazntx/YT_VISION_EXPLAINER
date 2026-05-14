/**
 * @fileoverview Runtime Orchestrator
 * @author Siddhazntx
 */

window.YTV_Injector = (() => {

    // -----------------------------------
    // INTERNAL STATE
    // -----------------------------------

    const state = {

        initialized: false,

        listeners: [],

        currentUrl: location.href,

        modules: {

            capture: false,

            chat: false
        }
    };

    // -----------------------------------
    // LOGGER
    // -----------------------------------

    function log(...args) {

        if (
            typeof YTV_CONFIG !== "undefined" &&
            YTV_CONFIG.FEATURES?.ENABLE_DEBUG_LOGS
        ) {
            console.log(
                "[YTV Injector]",
                ...args
            );
        }
    }

    function error(...args) {

        console.error(
            "[YTV Injector]",
            ...args
        );
    }

    // -----------------------------------
    // SAFE EVENT BINDING
    // -----------------------------------

    function addManagedListener(
        target,
        type,
        handler,
        options
    ) {

        if (typeof target.addListener === "function") {

            target.addListener(handler);

            state.listeners.push(() => {

                target.removeListener(handler);
            });

            return;
        }

        if (typeof target.addEventListener === "function") {

            target.addEventListener(
                type,
                handler,
                options
            );

            state.listeners.push(() => {

                target.removeEventListener(
                    type,
                    handler,
                    options
                );
            });

            return;
        }

        console.error(
            "[YTV Injector] Unsupported event target:",
            target
        );
    }

    // -----------------------------------
    // INIT
    // -----------------------------------

    function init() {

        if (state.initialized) {
            return;
        }

        state.initialized = true;

        validateModules();

        bindRuntimeListeners();

        bindNavigationListeners();

        log("Injector initialized.");
    }

    // -----------------------------------
    // MODULE VALIDATION
    // -----------------------------------

    function validateModules() {

        state.modules.capture =
            !!window.YTV_Capture;

        state.modules.chat =
            !!window.YTV_ChatUI;

        if (!state.modules.capture) {

            error(
                "Capture module missing."
            );
        }

        if (!state.modules.chat) {

            error(
                "ChatUI module missing."
            );
        }
    }

    // -----------------------------------
    // RUNTIME EVENTS
    // -----------------------------------

    function bindRuntimeListeners() {

        chrome.runtime.onMessage.addListener(
            handleMessage
        );

        state.listeners.push(() => {
            chrome.runtime.onMessage.removeListener(
                handleMessage
            );
        });

        addManagedListener(
            window,
            "YTV_IMAGE_CAPTURED",
            handleImageCaptured
        );
    }

    // -----------------------------------
    // YOUTUBE SPA NAVIGATION
    // -----------------------------------

    function bindNavigationListeners() {

        addManagedListener(
            document,
            "yt-navigate-finish",
            handleYouTubeNavigation
        );

        // Fallback URL polling
        setInterval(() => {

            if (
                location.href !==
                state.currentUrl
            ) {

                state.currentUrl =
                    location.href;

                handleVirtualNavigation();
            }

        }, 1000);
    }

    // -----------------------------------
    // NAVIGATION HANDLER
    // -----------------------------------

    function handleYouTubeNavigation() {

        log("YouTube SPA navigation detected.");

        cleanupTransientUI();
    }

    function handleVirtualNavigation() {

        log("Virtual URL change detected.");

        cleanupTransientUI();
    }

    // -----------------------------------
    // CLEANUP
    // -----------------------------------

    function cleanupTransientUI() {

        try {

            window.YTV_Capture?.deactivate?.();

            // Optional future cleanup
            // window.YTV_ChatUI?.reset?.();

        } catch (err) {

            error(
                "Cleanup failed:",
                err
            );
        }
    }

    // -----------------------------------
    // MESSAGE ROUTER
    // -----------------------------------

    function handleMessage(
        request,
        sender,
        sendResponse
    ) {

        try {

            if (
                !request ||
                !request.action
            ) {

                sendResponse({
                    success: false,
                    error: "Missing action."
                });

                return true;
            }

            switch (request.action) {

                // -------------------------
                // HEALTH CHECK
                // -------------------------

                case YTV_CONFIG.EVENTS.PING:

                    sendResponse({

                        success: true,

                        status: "alive",

                        modules: {

                            capture:
                                state.modules.capture,

                            chat:
                                state.modules.chat
                        }
                    });

                    break;

                // -------------------------
                // ACTIVATE CAPTURE
                // -------------------------

                case YTV_CONFIG.EVENTS
                    .ACTIVATE_CAPTURE_MODE:

                    activateCaptureMode(
                        sendResponse
                    );

                    break;

                // -------------------------
                // UNKNOWN
                // -------------------------

                default:

                    sendResponse({

                        success: false,

                        error:
                            `Unknown action: ${request.action}`
                    });
            }

        } catch (err) {

            error(
                "Message routing failed:",
                err
            );

            sendResponse({

                success: false,

                error:
                    err.message ||
                    "Injector error."
            });
        }

        return true;
    }

    // -----------------------------------
    // CAPTURE MODE
    // -----------------------------------

    function activateCaptureMode(
        sendResponse
    ) {

        if (!window.YTV_Capture) {

            sendResponse({

                success: false,

                error:
                    "Capture module unavailable."
            });

            return;
        }

        try {

            window.YTV_Capture.activate();

            log("Capture mode activated.");

            sendResponse({
                success: true
            });

        } catch (err) {

            error(
                "Capture activation failed:",
                err
            );

            sendResponse({

                success: false,

                error:
                    err.message
            });
        }
    }

    // -----------------------------------
    // IMAGE EVENT
    // -----------------------------------

    function handleImageCaptured() {

        log("Image captured.");

        ensureChatMounted();
    }

    // -----------------------------------
    // CHAT UI
    // -----------------------------------

    function ensureChatMounted() {

        if (!window.YTV_ChatUI) {

            error(
                "ChatUI unavailable."
            );

            return;
        }

        try {

            window.YTV_ChatUI.mount();

        } catch (err) {

            error(
                "Chat mount failed:",
                err
            );
        }
    }

    // -----------------------------------
    // DESTROY
    // -----------------------------------

    function destroy() {

        state.listeners.forEach(fn => {

            try {
                fn();
            } catch {}
        });

        state.listeners.length = 0;

        state.initialized = false;

        log("Injector destroyed.");
    }

    // -----------------------------------
    // START
    // -----------------------------------

    async function bootstrap() {
        if (document.readyState === "complete") {
            await new Promise(resolve => setTimeout(resolve, 100));
            init();
            return;
        }

        window.addEventListener("load", () => {
            setTimeout(init, 100);
        });
    }

    bootstrap();

    // -----------------------------------
    // PUBLIC API
    // -----------------------------------

    return {

        ping: () => "alive",

        destroy
    };

})();