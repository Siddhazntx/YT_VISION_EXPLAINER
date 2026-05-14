window.YTV_ChatUI = (() => {

    // -----------------------------------
    // CENTRALIZED STATE
    // -----------------------------------

    const state = {

        mode: "idle",

        currentImage: null,

        messages: [],

        drag: {

            isDragging: false,

            startX: 0,
            startY: 0,

            initialLeft: 0,
            initialTop: 0
        },

        ui: {

            host: null,

            shadow: null,

            container: null,

            messagesWrap: null,

            input: null,

            sendBtn: null
        }
    };

    // -----------------------------------
    // EVENT CLEANUP REGISTRY
    // -----------------------------------

    const cleanupFns = [];

    // -----------------------------------
    // LOGGER
    // -----------------------------------

    function log(...args) {

        if (
            YTV_CONFIG?.FEATURES?.ENABLE_DEBUG_LOGS
        ) {
            console.log(
                "[YTV ChatUI]",
                ...args
            );
        }
    }

    // -----------------------------------
    // MOUNT
    // -----------------------------------

    function mount() {

        if (state.ui.host) return;

        createHost();

        attachShadow();

        injectStyles();

        renderShell();

        cacheDOM();

        bindEvents();

        focusInput();

        log("Mounted");
    }

    // -----------------------------------
    // HOST
    // -----------------------------------

    function createHost() {
        const host = document.createElement("div");
        host.id = YTV_CONFIG.DOM.CHAT_HOST_ID;

        // Make it full screen so it doesn't clip, but ignore mouse clicks!
        Object.assign(host.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            zIndex: "2147483647",
            pointerEvents: "none", // Let clicks pass through to the YouTube video
            overflow: "visible"
        });

        document.body.appendChild(host);
        state.ui.host = host;
    }

    // -----------------------------------
    // SHADOW
    // -----------------------------------

    function attachShadow() {

        state.ui.shadow =
            state.ui.host.attachShadow({
                mode: "open"
            });
    }

    // -----------------------------------
    // STYLES
    // -----------------------------------

    function injectStyles() {

        const link =
            document.createElement("link");

        link.rel = "stylesheet";

        link.href = chrome.runtime.getURL(
            "content/shadow_style.css"
        );

        state.ui.shadow.appendChild(link);
    }

    // -----------------------------------
    // RENDER SHELL
    // -----------------------------------

    function renderShell() {

        const container =
            document.createElement("div");

        container.id = "ytv-chat-container";

        container.style.top = "24px";
        container.style.right = "24px";

        container.innerHTML = `
            <div class="ytv-header" id="ytv-drag-handle">
                <div class="ytv-title-wrap">
                    <span>🧠</span>
                    <span>YT Vision Explainer</span>
                </div>

                <button
                    class="ytv-icon-btn"
                    id="ytv-close-btn"
                >
                    ✕
                </button>
            </div>

            <div
                class="ytv-chat-body"
                id="ytv-messages-wrap"
            ></div>

            <div class="ytv-footer">
                <div class="ytv-input-group">

                    <textarea
                        class="ytv-input"
                        id="ytv-prompt-input"
                        placeholder="Ask Gemini..."
                        rows="1"
                    ></textarea>

                    <button
                        class="ytv-send-btn"
                        id="ytv-send-btn"
                    >
                        ↑
                    </button>

                </div>
            </div>
        `;

        state.ui.shadow.appendChild(container);
    }

    // -----------------------------------
    // DOM CACHE
    // -----------------------------------

    function cacheDOM() {

        const shadow = state.ui.shadow;

        state.ui.container =
            shadow.getElementById(
                "ytv-chat-container"
            );

        state.ui.messagesWrap =
            shadow.getElementById(
                "ytv-messages-wrap"
            );

        state.ui.input =
            shadow.getElementById(
                "ytv-prompt-input"
            );

        state.ui.sendBtn =
            shadow.getElementById(
                "ytv-send-btn"
            );
    }

    // -----------------------------------
    // EVENTS
    // -----------------------------------

    function bindEvents() {

        ['keydown', 'keyup', 'keypress'].forEach(eventType => {
            addManagedEvent(
                state.ui.container,
                eventType,
                (e) => {
                    e.stopPropagation();
                }
            );
        });

        addManagedEvent(
            state.ui.sendBtn,
            "click",
            submitPrompt
        );

        addManagedEvent(
            state.ui.input,
            "keydown",
            onInputKeydown
        );

        addManagedEvent(
            window,
            "YTV_IMAGE_CAPTURED",
            handleCapture
        );

        addManagedEvent(
            state.ui.shadow.getElementById(
                "ytv-close-btn"
            ),
            "click",
            unmount
        );

        const dragHandle = state.ui.shadow.getElementById("ytv-drag-handle");
        addManagedEvent(dragHandle, "mousedown", onDragStart);
        addManagedEvent(window, "mousemove", onDragMove);
        addManagedEvent(window, "mouseup", onDragEnd);
    }

    function addManagedEvent(
        target,
        type,
        handler,
        options
    ) {

        target.addEventListener(
            type,
            handler,
            options
        );

        cleanupFns.push(() => {

            target.removeEventListener(
                type,
                handler,
                options
            );
        });
    }

    // -----------------------------------
    // DRAG LOGIC
    // -----------------------------------
    function onDragStart(e) {
        if (e.target.closest('button')) return; 
        
        state.drag.isDragging = true;
        state.drag.startX = e.clientX;
        state.drag.startY = e.clientY;
        
        const rect = state.ui.container.getBoundingClientRect();
        state.drag.initialLeft = rect.left;
        state.drag.initialTop = rect.top;

        state.ui.container.style.transition = "none";
    }

    function onDragMove(e) {
        if (!state.drag.isDragging) return;
        e.preventDefault();

        let newLeft = state.drag.initialLeft + (e.clientX - state.drag.startX);
        let newTop = state.drag.initialTop + (e.clientY - state.drag.startY);

        const maxX = window.innerWidth - state.ui.container.offsetWidth;
        const maxY = window.innerHeight - state.ui.container.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        requestAnimationFrame(() => {
            state.ui.container.style.right = "auto";
            state.ui.container.style.left = `${newLeft}px`;
            state.ui.container.style.top = `${newTop}px`;
        });
    }

    function onDragEnd() {
        if (!state.drag.isDragging) return;
        state.drag.isDragging = false;
        state.ui.container.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1), opacity 180ms cubic-bezier(.2,.8,.2,1)";
    }

    // -----------------------------------
    // CAPTURE
    // -----------------------------------

    function handleCapture(event) {

        const image =
            event.detail?.image;

        if (!image) return;

        state.currentImage = image;

        appendImagePreview(image);

        focusInput();
    }

    // -----------------------------------
    // IMAGE PREVIEW
    // -----------------------------------

    function appendImagePreview(src) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "ytv-preview-wrapper";

        const img =
            document.createElement("img");

        img.src = src;

        img.className =
            "ytv-preview-image";

        img.alt =
            "Captured video frame";

        wrapper.appendChild(img);

        state.ui.messagesWrap.appendChild(
            wrapper
        );

        scrollToBottom();
    }

    // -----------------------------------
    // SUBMIT
    // -----------------------------------

    async function submitPrompt() {

        if (
            state.mode === "processing"
        ) {
            return;
        }

        const prompt =
            state.ui.input.value.trim();

        if (!prompt) return;

        state.mode = "processing";

        appendMessage({
            role: "user",
            content: prompt
        });

        clearInput();

        const streamingMessage =
            appendStreamingMessage();

        try {

            const response =
                await chrome.runtime.sendMessage({

                    action:
                        YTV_CONFIG.EVENTS.PROCESS_IMAGE_PROMPT,

                    payload: {

                        image:
                            state.currentImage,

                        prompt
                    }
                });

            removeStreamingMessage(
                streamingMessage
            );

            appendMessage({

                role: "assistant",

                content:
                    response?.success
                        ? response.text
                        : `⚠️ ${response?.error}`
            });

        } catch (err) {

            appendMessage({

                role: "assistant",

                content:
                    "⚠️ Failed to contact AI."
            });

            log(err);

        } finally {

            state.mode = "idle";

            focusInput();
        }
    }

    // -----------------------------------
    // MESSAGE APPEND
    // -----------------------------------

    function appendMessage(message) {

        state.messages.push(message);

        const node =
            renderMessage(message);

        state.ui.messagesWrap.appendChild(
            node
        );

        scrollToBottom();

        return node;
    }

    function renderMessage(message) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `ytv-message ytv-${message.role}`;

        if (
            message.role === "assistant"
        ) {

            wrapper.innerHTML = `
                <div
                    style="
                        margin-bottom:4px;
                        font-size:12px;
                        color:var(--ytv-accent);
                    "
                >
                    ✨ Gemini
                </div>

                ${safeMarkdown(
                    message.content
                )}
            `;

        } else {

            wrapper.innerHTML = `
                <div
                    style="
                        background:rgba(255,255,255,0.05);
                        padding:10px;
                        border-radius:10px;
                    "
                >
                    ${safeMarkdown(
                        message.content
                    )}
                </div>
            `;
        }

        return wrapper;
    }

    // -----------------------------------
    // STREAMING PLACEHOLDER
    // -----------------------------------

    function appendStreamingMessage() {

        const div =
            document.createElement("div");

        div.className =
            "ytv-message";

        div.innerHTML = `
            <div class="ytv-loading-dots">
                <div class="ytv-dot"></div>
                <div class="ytv-dot"></div>
                <div class="ytv-dot"></div>
            </div>
        `;

        state.ui.messagesWrap.appendChild(div);

        scrollToBottom();

        return div;
    }

    function removeStreamingMessage(el) {

        el?.remove();
    }

    // -----------------------------------
    // INPUT
    // -----------------------------------

    function onInputKeydown(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            submitPrompt();
        }
    }

    function clearInput() {

        state.ui.input.value = "";

        resizeTextarea();
    }

    function resizeTextarea() {

        const input = state.ui.input;

        input.style.height = "24px";

        input.style.height =
            `${Math.min(
                input.scrollHeight,
                120
            )}px`;
    }

    function focusInput() {

        requestAnimationFrame(() => {
            state.ui.input?.focus();
        });
    }

    // -----------------------------------
    // MARKDOWN
    // -----------------------------------

    function safeMarkdown(text = "") {

        // Escape HTML
        let safe =
            text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

        // Triple backticks
        safe = safe.replace(
            /```([\s\S]*?)```/g,
            (_, code) => `
                <pre>
                    <code>
                        ${code}
                    </code>
                </pre>
            `
        );

        // Inline code
        safe = safe.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        // Bold
        safe = safe.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        // New lines
        const parts = safe.split(/(<pre>[\s\S]*?<\/pre>)/);
        safe = parts.map(part => {
            if (part.startsWith("<pre>")) return part; // Leave code blocks alone
            return part.replace(/\n/g, "<br>");        // Format regular text
        }).join("");

        return safe;
    }

    // -----------------------------------
    // SCROLL
    // -----------------------------------

    function scrollToBottom() {

        requestAnimationFrame(() => {

            state.ui.messagesWrap.scrollTop =
                state.ui.messagesWrap.scrollHeight;
        });
    }

    // -----------------------------------
    // UNMOUNT
    // -----------------------------------

    function unmount() {

        cleanupFns.forEach(fn => fn());

        cleanupFns.length = 0;

        state.ui.host?.remove();

        state.ui = {};

        state.messages = [];

        state.currentImage = null;

        state.mode = "idle";

        log("Unmounted");
    }

    // -----------------------------------
    // PUBLIC API
    // -----------------------------------

    return {

        mount,

        unmount,

        open: mount,
        close: unmount
    };

})();