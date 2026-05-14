/**
 * @fileoverview Options page controller
 * @author Siddhazntx
 */

document.addEventListener("DOMContentLoaded", () => {

    const UI = {

        apiKeyInput:
            document.getElementById("apiKey"),

        modelSelect:
            document.getElementById("modelSelect"),

        saveBtn:
            document.getElementById("saveBtn"),

        saveBtnText:
            document.getElementById("saveBtnText"),

        loadingSpinner:
            document.getElementById("loadingSpinner"),

        statusMessage:
            document.getElementById("statusMessage"),

        toggleVisibility:
            document.getElementById("toggleVisibility")
    };

    let isSaving = false;

    // -----------------------------------
    // INIT
    // -----------------------------------

    init();

    async function init() {

        bindEvents();

        await loadSavedSettings();
    }

    // -----------------------------------
    // EVENT BINDING
    // -----------------------------------

    function bindEvents() {

        UI.saveBtn.addEventListener(
            "click",
            handleSave
        );

        UI.toggleVisibility.addEventListener(
            "click",
            togglePasswordVisibility
        );

        UI.apiKeyInput.addEventListener(
            "keydown",
            handleEnterSave
        );
    }

    // -----------------------------------
    // LOAD SETTINGS
    // -----------------------------------

    async function loadSavedSettings() {

        try {

            const [
                apiKey,
                model
            ] = await Promise.all([
                YTV_Storage.getApiKey(),
                YTV_Storage.getModelPreference()
            ]);

            if (apiKey) {

                UI.apiKeyInput.value =
                    maskApiKey(apiKey);

                UI.apiKeyInput.dataset.realValue =
                    apiKey;
            }

            if (model) {
                UI.modelSelect.value = model;
            }

        } catch (err) {

            console.error(
                "[Options] Failed to load settings:",
                err
            );

            showStatus(
                "Failed to load settings.",
                "error"
            );
        }
    }

    // -----------------------------------
    // SAVE SETTINGS
    // -----------------------------------

    async function handleSave() {

        if (isSaving) return;

        try {

            isSaving = true;

            setLoadingState(true);

            const apiKey =
                getRealApiKey();

            const selectedModel =
                UI.modelSelect.value;

            validateApiKey(apiKey);

            const results = await Promise.all([
                YTV_Storage.saveApiKey(apiKey),
                YTV_Storage.saveModelPreference(selectedModel)
            ]);

            const success =
                results.every(Boolean);

            if (!success) {
                throw new Error(
                    "Failed to persist settings."
                );
            }

            UI.apiKeyInput.value =
                maskApiKey(apiKey);

            UI.apiKeyInput.dataset.realValue =
                apiKey;

            showStatus(
                "Settings saved successfully.",
                "success"
            );

        } catch (err) {

            console.error(
                "[Options] Save failed:",
                err
            );

            showStatus(
                err.message || "Save failed.",
                "error"
            );

        } finally {

            isSaving = false;

            setLoadingState(false);
        }
    }

    // -----------------------------------
    // API KEY VALIDATION
    // -----------------------------------

    function validateApiKey(key) {

        if (!key) {
            throw new Error(
                "Please enter a Gemini API key."
            );
        }

        if (key.length < 20) {
            throw new Error(
                "Invalid API key format."
            );
        }

        if (!key.startsWith("AIza")) {
            throw new Error(
                "This does not appear to be a valid Gemini API key."
            );
        }
    }

    // -----------------------------------
    // ENTER TO SAVE
    // -----------------------------------

    function handleEnterSave(event) {

        if (event.key === "Enter") {
            handleSave();
        }
    }

    // -----------------------------------
    // PASSWORD VISIBILITY
    // -----------------------------------

    function togglePasswordVisibility() {

        const isPassword =
            UI.apiKeyInput.type === "password";

        UI.apiKeyInput.type =
            isPassword
                ? "text"
                : "password";

        UI.toggleVisibility.textContent =
            isPassword
                ? "Hide"
                : "Show";

        // Reveal actual key
        if (isPassword) {

            UI.apiKeyInput.value =
                getRealApiKey();

        } else {

            UI.apiKeyInput.value =
                maskApiKey(
                    getRealApiKey()
                );
        }
    }

    // -----------------------------------
    // MASK API KEY
    // -----------------------------------

    function maskApiKey(key) {

        if (!key || key.length < 10) {
            return key;
        }

        return (
            key.slice(0, 6) +
            "••••••••••••" +
            key.slice(-4)
        );
    }

    // -----------------------------------
    // GET REAL KEY
    // -----------------------------------

    function getRealApiKey() {

        return (
            UI.apiKeyInput.dataset.realValue ||
            UI.apiKeyInput.value.trim()
        );
    }

    // -----------------------------------
    // LOADING STATE
    // -----------------------------------

    function setLoadingState(isLoading) {

        UI.saveBtn.disabled = isLoading;

        UI.saveBtn.classList.toggle(
            "opacity-70",
            isLoading
        );

        UI.loadingSpinner.classList.toggle(
            "hidden",
            !isLoading
        );

        UI.saveBtnText.textContent =
            isLoading
                ? "Saving..."
                : "Save Settings";
    }

    // -----------------------------------
    // STATUS UI
    // -----------------------------------

    let statusTimeout;

    function showStatus(message, type = "success") {

        clearTimeout(statusTimeout);

        const styles = {

            success:
                "border-green-500/30 bg-green-500/10 text-green-400",

            error:
                "border-red-500/30 bg-red-500/10 text-red-400",

            warning:
                "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
        };

        UI.statusMessage.className =
            `rounded-xl border px-4 py-3 text-sm transition-all duration-300 ${styles[type]}`;

        UI.statusMessage.textContent =
            message;

        UI.statusMessage.classList.remove(
            "hidden"
        );

        statusTimeout = setTimeout(() => {

            UI.statusMessage.classList.add(
                "hidden"
            );

        }, 3500);
    }

});