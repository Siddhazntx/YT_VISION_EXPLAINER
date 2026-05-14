window.YTV_Capture = (() => {

    // -----------------------------------
    // STATE
    // -----------------------------------

    const state = {

        isActive: false,

        isDragging: false,

        startX: 0,
        startY: 0,

        currentX: 0,
        currentY: 0,

        animationFrameId: null,

        overlayEl: null,

        selectionBoxEl: null,

        lastCaptureTime: 0
    };

    const MIN_DRAG_THRESHOLD = 20;

    const CAPTURE_COOLDOWN = 1000;

    // -----------------------------------
    // LOGGER
    // -----------------------------------

    function log(...args) {

        if (
            typeof YTV_CONFIG !== "undefined" &&
            YTV_CONFIG.FEATURES?.ENABLE_DEBUG_LOGS
        ) {
            console.log("[YTV Capture]", ...args);
        }
    }

    // -----------------------------------
    // ACTIVATION
    // -----------------------------------

    function activate() {

        if (state.isActive) return;

        state.isActive = true;

        log("Capture mode activated");

        createOverlay();

        bindEvents();
    }

    function deactivate() {

        if (!state.isActive) return;

        state.isActive = false;
        state.isDragging = false;

        unbindEvents();

        cleanup();

        log("Capture mode deactivated");
    }

    // -----------------------------------
    // OVERLAY
    // -----------------------------------

    function createOverlay() {

        state.overlayEl =
            YTV_DOM.createFullScreenOverlay(
                YTV_CONFIG.DOM.OVERLAY_ID
            );

        // Prevent scrolling ONLY inside overlay
        state.overlayEl.addEventListener(
            "wheel",
            preventDefault,
            { passive: false }
        );

        document.documentElement.appendChild(
            state.overlayEl
        );
    }

    // -----------------------------------
    // EVENT BINDING
    // -----------------------------------

    function bindEvents() {

        const overlay = state.overlayEl;

        overlay.addEventListener(
            "mousedown",
            onPointerDown
        );

        overlay.addEventListener(
            "mousemove",
            onPointerMove
        );

        window.addEventListener(
            "mouseup",
            onPointerUp
        );

        window.addEventListener(
            "keydown",
            onKeyDown
        );

        // Future-ready touch support
        overlay.addEventListener(
            "touchstart",
            onTouchStart,
            { passive: false }
        );

        overlay.addEventListener(
            "touchmove",
            onTouchMove,
            { passive: false }
        );

        window.addEventListener(
            "touchend",
            onTouchEnd
        );
    }

    function unbindEvents() {

        const overlay = state.overlayEl;

        if (overlay) {

            overlay.removeEventListener(
                "mousedown",
                onPointerDown
            );

            overlay.removeEventListener(
                "mousemove",
                onPointerMove
            );

            overlay.removeEventListener(
                "wheel",
                preventDefault
            );

            overlay.removeEventListener(
                "touchstart",
                onTouchStart
            );

            overlay.removeEventListener(
                "touchmove",
                onTouchMove
            );
        }

        window.removeEventListener(
            "mouseup",
            onPointerUp
        );

        window.removeEventListener(
            "keydown",
            onKeyDown
        );

        window.removeEventListener(
            "touchend",
            onTouchEnd
        );
    }

    // -----------------------------------
    // KEYBOARD
    // -----------------------------------

    function onKeyDown(event) {

        if (event.key === "Escape") {
            deactivate();
        }
    }

    // -----------------------------------
    // POINTER START
    // -----------------------------------

    function onPointerDown(event) {

        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        state.isDragging = true;

        state.startX = event.clientX;
        state.startY = event.clientY;

        state.currentX = event.clientX;
        state.currentY = event.clientY;

        createSelectionBox();
    }

    // -----------------------------------
    // POINTER MOVE
    // -----------------------------------

    function onPointerMove(event) {

        if (!state.isDragging) return;

        state.currentX = event.clientX;
        state.currentY = event.clientY;

        requestSelectionRender();
    }

    // -----------------------------------
    // POINTER END
    // -----------------------------------

    async function onPointerUp(event) {

        if (!state.isDragging) return;

        state.isDragging = false;

        const finalBox =
            YTV_DOM.calculateBoundingBox(
                state.startX,
                state.startY,
                event.clientX,
                event.clientY
            );

        deactivate();

        if (!isValidSelection(finalBox)) {
            log("Selection too small.");
            return;
        }

        // Cooldown protection
        const now = Date.now();

        if (
            now - state.lastCaptureTime <
            CAPTURE_COOLDOWN
        ) {
            return;
        }

        state.lastCaptureTime = now;

        try {

            await waitForOverlayRemoval();

            showCaptureToast("Capturing...");

            const screenshot =
                await chrome.runtime.sendMessage({

                    action:
                        YTV_CONFIG.EVENTS.CAPTURE_SCREENSHOT
                });

            if (!screenshot?.success) {
                throw new Error(
                    screenshot?.error ||
                    "Screenshot failed."
                );
            }

            const croppedImage =
                await YTV_DOM.cropImage(
                    screenshot.dataUrl,
                    finalBox
                );

            if (window.YTV_ChatUI) {
                window.YTV_ChatUI.mount();
            }

            dispatchCaptureEvent(
                croppedImage,
                finalBox
            );

            showCaptureToast("Capture complete");

        } catch (err) {

            console.error(
                "[YTV Capture]",
                err
            );

            showCaptureToast(
                "Capture failed",
                true
            );
        }
    }

    // -----------------------------------
    // TOUCH SUPPORT
    // -----------------------------------

    function onTouchStart(event) {

        const touch = event.touches[0];

        onPointerDown({
            button: 0,
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation()
        });
    }

    function onTouchMove(event) {

        const touch = event.touches[0];

        onPointerMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    function onTouchEnd(event) {

        const touch =
            event.changedTouches[0];

        onPointerUp({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    // -----------------------------------
    // SELECTION BOX
    // -----------------------------------

    function createSelectionBox() {

        if (state.selectionBoxEl) return;

        const box = document.createElement("div");

        box.className =
            YTV_CONFIG.DOM.SELECTION_BOX_CLASS;

        Object.assign(box.style, {

            position: "absolute",

            border:
                "2px dashed rgb(96 165 250)",

            background:
                "rgba(96,165,250,0.14)",

            boxShadow:
                "0 0 0 99999px rgba(0,0,0,0.35)",

            pointerEvents: "none",

            zIndex: "2147483647",

            backdropFilter: "blur(0.5px)"
        });

        state.overlayEl.appendChild(box);

        state.selectionBoxEl = box;
    }

    function requestSelectionRender() {

        if (state.animationFrameId) {
            cancelAnimationFrame(
                state.animationFrameId
            );
        }

        state.animationFrameId =
            requestAnimationFrame(
                renderSelectionBox
            );
    }

    function renderSelectionBox() {

        const box =
            YTV_DOM.calculateBoundingBox(
                state.startX,
                state.startY,
                state.currentX,
                state.currentY
            );

        Object.assign(
            state.selectionBoxEl.style,
            {
                display: "block",

                left: `${box.x}px`,
                top: `${box.y}px`,

                width: `${box.width}px`,
                height: `${box.height}px`
            }
        );
    }

    // -----------------------------------
    // HELPERS
    // -----------------------------------

    function isValidSelection(box) {

        return (
            box.width >= MIN_DRAG_THRESHOLD &&
            box.height >= MIN_DRAG_THRESHOLD
        );
    }

    function preventDefault(event) {
        event.preventDefault();
    }

    function waitForOverlayRemoval() {

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }

    function dispatchCaptureEvent(
        image,
        coords
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "YTV_IMAGE_CAPTURED",
                {
                    detail: {
                        image,
                        coords
                    }
                }
            )
        );
    }

    function showCaptureToast(
        message,
        isError = false
    ) {

        const toast =
            document.createElement("div");

        toast.textContent = message;

        Object.assign(toast.style, {

            position: "fixed",

            bottom: "24px",

            right: "24px",

            padding: "12px 16px",

            borderRadius: "12px",

            background:
                isError
                    ? "#DC2626"
                    : "#18181B",

            color: "#fff",

            zIndex: "2147483647",

            fontSize: "14px",

            fontWeight: "500",

            boxShadow:
                "0 8px 32px rgba(0,0,0,0.25)"
        });

        document.body.appendChild(toast);

        setTimeout(() => {

            toast.remove();

        }, 2200);
    }

    function cleanup() {

        if (state.animationFrameId) {

            cancelAnimationFrame(
                state.animationFrameId
            );
        }

        YTV_DOM.safeRemove(
            YTV_CONFIG.DOM.OVERLAY_ID
        );

        state.overlayEl = null;
        state.selectionBoxEl = null;
    }

    // -----------------------------------
    // PUBLIC API
    // -----------------------------------

    return {

        activate,

        deactivate
    };

})();