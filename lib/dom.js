window.YTV_DOM = (() => {

    // -----------------------------------
    // LOGGER
    // -----------------------------------

    function log(...args) {
        if (
            typeof YTV_CONFIG !== "undefined" &&
            YTV_CONFIG.FEATURES?.ENABLE_DEBUG_LOGS
        ) {
            console.log("[YTV DOM]", ...args);
        }
    }

    // -----------------------------------
    // CONSTANTS
    // -----------------------------------

    const MAX_CANVAS_DIMENSION = 4096;

    // -----------------------------------
    // BOUNDING BOX
    // -----------------------------------

    function calculateBoundingBox(
        startX,
        startY,
        endX,
        endY
    ) {

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);

        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    // -----------------------------------
    // IMAGE CROPPING
    // -----------------------------------

    async function cropImage(
        fullScreenDataUrl,
        boxCoords
    ) {

        validateCrop(boxCoords);

        const image = await loadImage(fullScreenDataUrl);

        const dpr =
            Math.max(window.devicePixelRatio || 1, 1);

        const scaled = {
            x: Math.floor(boxCoords.x * dpr),
            y: Math.floor(boxCoords.y * dpr),
            width: Math.floor(boxCoords.width * dpr),
            height: Math.floor(boxCoords.height * dpr)
        };

        validateCanvasSize(
            scaled.width,
            scaled.height
        );

        // -----------------------------------
        // PROGRESSIVE ENHANCEMENT
        // -----------------------------------

        const canvas =
            typeof OffscreenCanvas !== "undefined"
                ? new OffscreenCanvas(
                    scaled.width,
                    scaled.height
                )
                : document.createElement("canvas");

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        const ctx = canvas.getContext("2d", {
            alpha: false,
            willReadFrequently: false
        });

        if (!ctx) {
            throw new Error(
                "Failed to initialize canvas context."
            );
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // -----------------------------------
        // DRAW CROP
        // -----------------------------------

        ctx.drawImage(
            image,

            scaled.x,
            scaled.y,
            scaled.width,
            scaled.height,

            0,
            0,
            scaled.width,
            scaled.height
        );

        // -----------------------------------
        // EXPORT
        // -----------------------------------

        const mime =
            YTV_CONFIG?.SCREENSHOT?.MIME_TYPE ||
            "image/jpeg";

        const quality =
            (YTV_CONFIG?.SCREENSHOT?.QUALITY || 95) / 100;

        let output;

        // OffscreenCanvas path
        if (canvas.convertToBlob) {

            const blob = await canvas.convertToBlob({
                type: mime,
                quality
            });

            output = await blobToDataURL(blob);

        } else {

            output = canvas.toDataURL(
                mime,
                quality
            );
        }

        cleanupCanvas(canvas);

        return output;
    }

    // -----------------------------------
    // IMAGE LOADER
    // -----------------------------------

    function loadImage(src) {

        return new Promise((resolve, reject) => {

            const img = new Image();

            img.decoding = "async";

            img.onload = () => resolve(img);

            img.onerror = () => {
                reject(
                    new Error(
                        "Failed to load screenshot image."
                    )
                );
            };

            img.src = src;
        });
    }

    // -----------------------------------
    // BLOB → DATA URL
    // -----------------------------------

    function blobToDataURL(blob) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onloadend = () => {
                resolve(reader.result);
            };

            reader.onerror = reject;

            reader.readAsDataURL(blob);
        });
    }

    // -----------------------------------
    // VALIDATION
    // -----------------------------------

    function validateCrop(box) {

        if (!box) {
            throw new Error("Missing crop coordinates.");
        }

        if (box.width <= 0 || box.height <= 0) {
            throw new Error(
                "Selection area must be greater than 0."
            );
        }
    }

    function validateCanvasSize(width, height) {

        if (
            width > MAX_CANVAS_DIMENSION ||
            height > MAX_CANVAS_DIMENSION
        ) {
            throw new Error(
                "Selection exceeds maximum supported size."
            );
        }
    }

    // -----------------------------------
    // CLEANUP
    // -----------------------------------

    function cleanupCanvas(canvas) {

        try {

            canvas.width = 0;
            canvas.height = 0;

        } catch (err) {

            log("Canvas cleanup failed:", err);
        }
    }

    // -----------------------------------
    // SAFE REMOVE
    // -----------------------------------

    function safeRemove(id) {

        const el = document.getElementById(id);

        if (!el) return false;

        el.remove();

        return true;
    }

    // -----------------------------------
    // OVERLAY CREATION
    // -----------------------------------

    function createFullScreenOverlay(id) {

        safeRemove(id);

        const overlay =
            document.createElement("div");

        overlay.id = id;

        Object.assign(overlay.style, {

            position: "fixed",

            inset: "0",

            width: "100vw",

            height: "100vh",

            zIndex: "2147483647",

            cursor: "crosshair",

            background:
                "rgba(0,0,0,0.35)",

            boxSizing: "border-box",

            userSelect: "none",

            WebkitUserSelect: "none",

            touchAction: "none",

            backdropFilter: "blur(1px)"
        });

        return overlay;
    }

    // -----------------------------------
    // PUBLIC API
    // -----------------------------------

    return {

        calculateBoundingBox,

        cropImage,

        safeRemove,

        createFullScreenOverlay
    };

})();