/**
 * @fileoverview Robust storage manager for YT Vision Explainer
 * @author Siddhazntx
 */

// Since constants.js is loaded before this file, YTV_CONFIG is already available globally.
// We don't need 'import' or 'try/catch' here anymore.

const YTV_Storage = (() => {

    // -----------------------------------
    // MEMORY CACHE
    // -----------------------------------
    const memoryCache = new Map();

    // -----------------------------------
    // INTERNAL HELPERS
    // -----------------------------------
    function log(...args) {
        if (YTV_CONFIG.FEATURES.ENABLE_DEBUG_LOGS) {
            console.log("[YTV Storage]", ...args);
        }
    }

    function validateKey(key) {
        if (!key || typeof key !== "string") {
            throw new Error("Invalid storage key.");
        }
    }

    // -----------------------------------
    // GENERIC GET
    // -----------------------------------
    async function get(key, defaultValue = null) {
        validateKey(key);

        // Fast memory cache
        if (memoryCache.has(key)) {
            return memoryCache.get(key);
        }

        try {
            const result = await chrome.storage.local.get(key);
            const value = result[key] !== undefined ? result[key] : defaultValue;
            
            memoryCache.set(key, value);
            return value;
        } catch (err) {
            log("GET failed:", err);
            return defaultValue;
        }
    }

    // -----------------------------------
    // GENERIC SET
    // -----------------------------------
    async function set(key, value) {
        validateKey(key);
        try {
            await chrome.storage.local.set({ [key]: value });
            memoryCache.set(key, value);
            return true;
        } catch (err) {
            log("SET failed:", err);
            return false;
        }
    }

    // -----------------------------------
    // REMOVE & CLEAR
    // -----------------------------------
    async function remove(key) {
        validateKey(key);
        try {
            await chrome.storage.local.remove(key);
            memoryCache.delete(key);
            return true;
        } catch (err) {
            log("REMOVE failed:", err);
            return false;
        }
    }

    async function clear() {
        try {
            await chrome.storage.local.clear();
            memoryCache.clear();
            return true;
        } catch (err) {
            log("CLEAR failed:", err);
            return false;
        }
    }

    // -----------------------------------
    // MULTI GET / SET
    // -----------------------------------
    async function getMany(keys = []) {
        try {
            const result = await chrome.storage.local.get(keys);
            Object.entries(result).forEach(([k, v]) => memoryCache.set(k, v));
            return result;
        } catch (err) {
            log("GET MANY failed:", err);
            return {};
        }
    }

    async function setMany(obj = {}) {
        try {
            await chrome.storage.local.set(obj);
            Object.entries(obj).forEach(([k, v]) => memoryCache.set(k, v));
            return true;
        } catch (err) {
            log("SET MANY failed:", err);
            return false;
        }
    }

    // -----------------------------------
    // STORAGE LISTENER
    // -----------------------------------
    function watch(callback) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local") return;
            Object.entries(changes).forEach(([key, change]) => {
                memoryCache.set(key, change.newValue);
                callback({
                    key,
                    oldValue: change.oldValue,
                    newValue: change.newValue
                });
            });
        });
    }

    // -----------------------------------
    // EXPLICIT HELPERS
    // -----------------------------------
    async function getApiKey() {
        return await get(YTV_CONFIG.STORAGE.API_KEY, null);
    }

    async function saveApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== "string") throw new Error("Invalid API key.");
        return await set(YTV_CONFIG.STORAGE.API_KEY, apiKey.trim());
    }

    async function removeApiKey() {
        return await remove(YTV_CONFIG.STORAGE.API_KEY);
    }

    async function getModelPreference() {
        return await get(YTV_CONFIG.STORAGE.MODEL_PREF, YTV_CONFIG.API.DEFAULT_MODEL);
    }

    async function saveModelPreference(model) {
        return await set(YTV_CONFIG.STORAGE.MODEL_PREF, model);
    }

    // -----------------------------------
    // PUBLIC API
    // -----------------------------------
    return {
        get, set, getMany, setMany, remove, clear, watch,
        getApiKey, saveApiKey, removeApiKey,
        getModelPreference, saveModelPreference
    };

})();

// Set on window for content scripts and options page
if (typeof window !== "undefined") {
    window.YTV_Storage = YTV_Storage;
}