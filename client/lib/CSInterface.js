/**
 * CSInterface.js — Minimal shim for Adobe CEP CSInterface.
 *
 * For production, replace this file with the official CSInterface.js from:
 * https://github.com/Adobe-CEP/CEP-Resources/tree/master/CEP_12.x/CSInterface.js
 *
 * This shim provides the essential methods used by the AI Assistant panel.
 */

function CSInterface() {}

/**
 * Evaluate ExtendScript in the host application.
 * @param {string} script - ExtendScript code to evaluate
 * @param {function} callback - Receives the string result
 */
CSInterface.prototype.evalScript = function(script, callback) {
    try {
        window.__adobe_cep__.evalScript(script, callback);
    } catch (e) {
        if (callback) callback("EvalScript error.");
    }
};

/**
 * Register a key events interest for the extension.
 */
CSInterface.prototype.registerKeyEventsInterest = function(keyEventsInterest) {
    try {
        window.__adobe_cep__.registerKeyEventsInterest(JSON.stringify(keyEventsInterest));
    } catch (e) {}
};

/**
 * Add event listener for CEP events.
 */
CSInterface.prototype.addEventListener = function(type, listener, obj) {
    try {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    } catch (e) {}
};

/**
 * Remove event listener.
 */
CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    try {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    } catch (e) {}
};

/**
 * Dispatch event to ExtendScript.
 */
CSInterface.prototype.dispatchEvent = function(event) {
    try {
        window.__adobe_cep__.dispatchEvent(event);
    } catch (e) {}
};

/**
 * Get system path.
 * @param {string} pathType - SystemPath constant
 */
CSInterface.prototype.getSystemPath = function(pathType) {
    try {
        return window.__adobe_cep__.getSystemPath(pathType);
    } catch (e) {
        return "";
    }
};

/**
 * Get host environment info.
 */
CSInterface.prototype.getHostEnvironment = function() {
    try {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    } catch (e) {
        return {};
    }
};

/**
 * Close extension.
 */
CSInterface.prototype.closeExtension = function() {
    try {
        window.__adobe_cep__.closeExtension();
    } catch (e) {}
};

/**
 * Request to open a URL in the default browser.
 */
CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    try {
        window.__adobe_cep__.openURLInDefaultBrowser(url);
    } catch (e) {}
};

// System path constants
CSInterface.prototype.EXTENSION_ID = "com.afx-slop.panel";

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication",
};
