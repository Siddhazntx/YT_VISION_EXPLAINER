/**
 * @fileoverview Production-grade Gemini API wrapper
 * @author Siddhazntx
 */

// Since constants.js is loaded first in importScripts, YTV_CONFIG is already available.
// We remove the import and try/catch blocks entirely.

self.GeminiAPI = (() => {

    let activeController = null;
    let lastRequestTime = 0;

    const REQUEST_COOLDOWN = 1500;
    const REQUEST_TIMEOUT = 60000;

    /**
     * Safely extracts text from Gemini response
     */
    function extractText(data) {
        let fullText = "";

        if (Array.isArray(data)) {
            data.forEach(chunk => {
                const text = chunk?.candidates?.[0]
                    ?.content?.parts?.[0]
                    ?.text;

                if (text) {
                    fullText += text;
                }
            });
        } else {
            const text = data?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;

            if (text) {
                fullText = text;
            }
        }

        return fullText || null;
    }

    /**
     * Sleep utility
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Creates timeout signal
     */
    function createTimeoutSignal(timeout) {
        const controller = new AbortController();

        setTimeout(() => {
            controller.abort("Request timeout");
        }, timeout);

        return controller;
    }

    /**
     * Main Gemini Vision Request
     */
    async function askVisionModel(base64Image, userPrompt, options = {}) {

        try {

            // -------------------------------
            // RATE LIMITING
            // -------------------------------

            const now = Date.now();

            if (now - lastRequestTime < REQUEST_COOLDOWN) {
                throw new Error("Please wait before sending another request.");
            }

            lastRequestTime = now;

            // -------------------------------
            // CANCEL PREVIOUS REQUEST
            // -------------------------------

            if (activeController) {
                activeController.abort();
            }

            activeController = createTimeoutSignal(
                options.timeout || REQUEST_TIMEOUT
            );

            // -------------------------------
            // API KEY
            // -------------------------------

            // Get API key from chrome storage directly
            // YTV_Storage might not be available in background context
            let apiKey;
            try {
                const result = await chrome.storage.local.get(
                    YTV_CONFIG.STORAGE.API_KEY
                );
                apiKey = result[YTV_CONFIG.STORAGE.API_KEY];
            } catch (err) {
                throw new Error(
                    "Failed to retrieve API key from storage."
                );
            }

            if (!apiKey) {
                throw new Error(
                    "No Gemini API key found. Add one in extension settings."
                );
            }

            // -------------------------------
            // CLEAN IMAGE
            // -------------------------------

            const rawBase64Data = base64Image.replace(
                /^data:image\/[a-z]+;base64,/,
                ""
            );

            // -------------------------------
            // MODEL
            // -------------------------------

            const model =
                options.model ||
                YTV_CONFIG.API.DEFAULT_MODEL ||
                "gemini-2.5-flash";

            // -------------------------------
            // ENDPOINT
            // -------------------------------

            const endpoint =
                `${YTV_CONFIG.API.BASE_URL}` +
                `${model}:generateContent?key=${apiKey}`;

            // -------------------------------
            // PAYLOAD
            // -------------------------------

            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        {
                            text:
                                userPrompt ||
                                "Explain the code visible in this image."
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: rawBase64Data
                            }
                        }
                    ]
                }],

                generationConfig: {
                    temperature: options.temperature ?? 0.4,
                    topP: options.topP ?? 0.95,
                    topK: options.topK ?? 40,
                    maxOutputTokens: options.maxTokens ?? 8192
                },

                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_ONLY_HIGH"
                    }
                ]
            };

            // -------------------------------
            // FETCH WITH RETRY
            // -------------------------------

            let response;

            for (let attempt = 1; attempt <= 3; attempt++) {

                try {

                    response = await fetch(endpoint, {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(payload),

                        signal: activeController.signal
                    });

                    if (response.ok) break;

                    if (response.status >= 500 && attempt < 3) {
                        await delay(1000 * attempt);
                        continue;
                    }

                    const errorData = await response.json();

                    throw new Error(
                        errorData?.error?.message ||
                        `HTTP ${response.status}`
                    );

                } catch (err) {

                    if (attempt >= 3) {
                        throw err;
                    }

                    await delay(1000 * attempt);
                }
            }

            // -------------------------------
            // PARSE RESPONSE
            // -------------------------------

            const data = await response.json();

            const text = extractText(data);

            if (!text) {
                throw new Error("Gemini returned an empty response.");
            }

            return {
                success: true,
                text,
                raw: data
            };

        } catch (error) {

            console.error("[YTV_Gemini]", error);

            if (error.name === "AbortError") {
                return {
                    success: false,
                    error: "Request cancelled."
                };
            }

            return {
                success: false,
                error: error.message || "Unknown error occurred."
            };

        } finally {

            activeController = null;
        }
    }

    return {
        askVisionModel
    };

})();

// Set on window for content scripts (if YTV_CONFIG is available)
if (typeof window !== "undefined" && typeof YTV_CONFIG !== "undefined") {
    window.YTV_Gemini = self.GeminiAPI;
}