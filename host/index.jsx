/**
 * After Effects ExtendScript host layer.
 * Provides code execution, project state gathering, and utility functions.
 *
 * Called from the CEP panel via CSInterface.evalScript().
 * ExtendScript is ES3 -- no let/const, no arrow functions, no template literals.
 */

// ─── JSON polyfill (ExtendScript lacks native JSON) ───────────────────────────

if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.stringify !== "function") {
    JSON.stringify = function(val) {
        if (val === null) return "null";
        if (typeof val === "undefined") return undefined;
        if (typeof val === "boolean" || typeof val === "number") return String(val);
        if (typeof val === "string") {
            return '"' + val
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t") + '"';
        }
        if (val instanceof Array) {
            var items = [];
            for (var i = 0; i < val.length; i++) {
                var v = JSON.stringify(val[i]);
                items.push(v === undefined ? "null" : v);
            }
            return "[" + items.join(",") + "]";
        }
        if (typeof val === "object") {
            var pairs = [];
            for (var k in val) {
                if (val.hasOwnProperty(k)) {
                    var v = JSON.stringify(val[k]);
                    if (v !== undefined) {
                        pairs.push(JSON.stringify(k) + ":" + v);
                    }
                }
            }
            return "{" + pairs.join(",") + "}";
        }
        return undefined;
    };
}
if (typeof JSON.parse !== "function") {
    JSON.parse = function(str) {
        return eval("(" + str + ")");
    };
}

// ─── Code Execution ────────────────────────────────────────────────────────────

// Adjust a KeyframeEase array to match the required dimension count
function _fixEaseArray(easeArr, dims) {
    if (!(easeArr instanceof Array)) return easeArr;
    if (easeArr.length === dims) return easeArr;
    var fixed = [];
    for (var i = 0; i < dims; i++) {
        fixed.push(easeArr[i] || easeArr[easeArr.length - 1]);
    }
    return fixed;
}

// Called from sanitized code: _fe(property, easeArray) — auto-detects dimensions
function _fe(prop, easeArr) {
    var dims = prop.value instanceof Array ? prop.value.length : 1;
    return _fixEaseArray(easeArr, dims);
}

/**
 * Execute AI-generated ExtendScript code inside an undo group.
 * Returns JSON: { success: bool, output: string, error: string }
 */
// Base64 decode for receiving code from the panel (avoids evalScript quoting issues)
function decodeBase64(str) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var i = 0;
    // Remove any non-base64 characters
    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < str.length) {
        var a = chars.indexOf(str.charAt(i++));
        var b = chars.indexOf(str.charAt(i++));
        var c = chars.indexOf(str.charAt(i++));
        var d = chars.indexOf(str.charAt(i++));
        var n1 = (a << 2) | (b >> 4);
        var n2 = ((b & 15) << 4) | (c >> 2);
        var n3 = ((c & 3) << 6) | d;
        output += String.fromCharCode(n1);
        if (c !== 64) output += String.fromCharCode(n2);
        if (d !== 64) output += String.fromCharCode(n3);
    }
    // Decode UTF-8 bytes to string
    try {
        return decodeURIComponent(escape(output));
    } catch (_e) {
        return output;
    }
}

/**
 * Sanitize LLM-generated code before eval to fix common mistakes.
 */
function sanitizeCode(codeStr) {
    // Replace let/const with var (ES3 compatibility)
    codeStr = codeStr.replace(/\b(let|const)\s+/g, "var ");

    // Replace console.log with $.writeln
    codeStr = codeStr.replace(/console\.log\s*\(/g, "$.writeln(");

    // Wrap top-level return in IIFE
    if (/(?:^|\n)\s*return\b/.test(codeStr)) {
        codeStr = "(function(){" + codeStr + "})();";
    }

    // Fix setTemporalEaseAtKey: wrap ease array args with _fe() to auto-fix dimensions.
    // Matches: obj.setTemporalEaseAtKey(index, [ease,...], [ease,...])
    // and:     obj.setTemporalEaseAtKey(index, [ease,...])
    codeStr = codeStr.replace(
        /(\w[\w.\[\]"']*?)\.setTemporalEaseAtKey\s*\(\s*([^,]+),\s*(\[[^\]]*\])\s*,\s*(\[[^\]]*\])\s*\)/g,
        "$1.setTemporalEaseAtKey($2, _fe($1,$3), _fe($1,$4))"
    );
    codeStr = codeStr.replace(
        /(\w[\w.\[\]"']*?)\.setTemporalEaseAtKey\s*\(\s*([^,]+),\s*(\[[^\]]*\])\s*\)/g,
        "$1.setTemporalEaseAtKey($2, _fe($1,$3))"
    );

    return codeStr;
}

function executeCode(encodedStr) {
    var result = { success: false, output: "", error: "" };
    var codeStr = decodeBase64(encodedStr);
    codeStr = sanitizeCode(codeStr);

    // Collect $.writeln output
    var outputLines = [];
    var origWriteln = $.writeln;
    $.writeln = function(msg) {
        outputLines.push(String(msg));
    };

    try {
        app.beginUndoGroup("AI Assistant");
        eval(codeStr);
        app.endUndoGroup();
        result.success = true;
        result.output = outputLines.join("\n");
    } catch (e) {
        // Close undo group, then undo to roll back any partial changes
        try { app.endUndoGroup(); } catch (_ignore) {}
        try { app.executeCommand(16); } catch (_ignore) {} // 16 = Edit > Undo
        result.error = e.toString();
        if (e.line) {
            result.error += " (line " + e.line + ")";
        }
        result.output = outputLines.join("\n");
    }

    $.writeln = origWriteln;

    // Truncate output to avoid exceeding evalScript string limits
    if (result.output.length > 5000) {
        result.output = result.output.substring(0, 5000) + "\n...(truncated)";
    }
    if (result.error.length > 2000) {
        result.error = result.error.substring(0, 2000) + "...(truncated)";
    }

    return JSON.stringify(result);
}


// ─── Project State ─────────────────────────────────────────────────────────────

/**
 * Gather comprehensive project state for the system prompt.
 * Returns JSON string with project, compositions, layers, etc.
 */
function getProjectState() {
    var state = {};

    if (!app.project) {
        return JSON.stringify({ error: "No project open" });
    }

    var proj = app.project;

    // Project basics
    state.projectName = proj.file ? proj.file.name : "(unsaved)";
    state.bitsPerChannel = proj.bitsPerChannel;
    state.numItems = proj.numItems;

    // Active composition
    var activeComp = proj.activeItem;
    if (activeComp && activeComp instanceof CompItem) {
        state.activeComp = describeComp(activeComp);
    } else {
        state.activeComp = null;
    }

    // All compositions
    state.compositions = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem) {
            state.compositions.push({
                name: item.name,
                id: item.id,
                width: item.width,
                height: item.height,
                duration: roundNum(item.duration, 2),
                frameRate: roundNum(item.frameRate, 2),
                numLayers: item.numLayers
            });
        }
    }

    // Footage items
    state.footage = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof FootageItem && !(item instanceof CompItem)) {
            state.footage.push({
                name: item.name,
                id: item.id,
                width: item.width || 0,
                height: item.height || 0,
                duration: roundNum(item.duration || 0, 2),
                hasVideo: item.hasVideo,
                hasAudio: item.hasAudio
            });
        }
    }

    // Folders
    state.folders = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof FolderItem) {
            state.folders.push({
                name: item.name,
                numItems: item.numItems
            });
        }
    }

    // Render queue
    state.renderQueue = {
        numItems: proj.renderQueue.numItems,
        rendering: proj.renderQueue.rendering
    };

    return JSON.stringify(state);
}


/**
 * Describe a composition in detail (layers, effects, etc.)
 */
function describeComp(comp) {
    var info = {
        name: comp.name,
        id: comp.id,
        width: comp.width,
        height: comp.height,
        pixelAspect: roundNum(comp.pixelAspect, 3),
        duration: roundNum(comp.duration, 2),
        frameRate: roundNum(comp.frameRate, 2),
        frameDuration: roundNum(comp.frameDuration, 4),
        workAreaStart: roundNum(comp.workAreaStart, 2),
        workAreaDuration: roundNum(comp.workAreaDuration, 2),
        numLayers: comp.numLayers,
        bgColor: [
            roundNum(comp.bgColor[0], 2),
            roundNum(comp.bgColor[1], 2),
            roundNum(comp.bgColor[2], 2)
        ],
        layers: []
    };

    // Describe each layer (cap at 50 for very complex comps)
    var maxLayers = Math.min(comp.numLayers, 50);
    for (var i = 1; i <= maxLayers; i++) {
        info.layers.push(describeLayer(comp.layer(i)));
    }
    if (comp.numLayers > maxLayers) {
        info.layersTruncated = comp.numLayers - maxLayers;
    }

    return info;
}


/**
 * Describe a single layer.
 */
function describeLayer(layer) {
    var info = {
        index: layer.index,
        name: layer.name,
        enabled: layer.enabled,
        solo: layer.solo,
        locked: layer.locked,
        inPoint: roundNum(layer.inPoint, 2),
        outPoint: roundNum(layer.outPoint, 2),
        startTime: roundNum(layer.startTime, 2)
    };

    // Layer type detection
    if (layer instanceof TextLayer) {
        info.type = "text";
        try {
            var srcText = layer.property("Source Text");
            if (srcText) {
                var textDoc = srcText.value;
                info.text = textDoc.text;
                info.fontSize = textDoc.fontSize;
                info.font = textDoc.font;
                info.fillColor = [
                    roundNum(textDoc.fillColor[0], 2),
                    roundNum(textDoc.fillColor[1], 2),
                    roundNum(textDoc.fillColor[2], 2)
                ];
            }
        } catch (_e) {}
    } else if (layer instanceof ShapeLayer) {
        info.type = "shape";
    } else if (layer instanceof CameraLayer) {
        info.type = "camera";
        try {
            info.zoom = roundNum(layer.property("Camera Options").property("Zoom").value, 1);
        } catch (_e) {}
    } else if (layer instanceof LightLayer) {
        info.type = "light";
        try {
            info.lightType = layer.property("Light Options").property("Light Type").value;
            info.intensity = roundNum(layer.property("Light Options").property("Intensity").value, 1);
        } catch (_e) {}
    } else if (layer instanceof AVLayer) {
        if (layer.nullLayer) {
            info.type = "null";
        } else if (layer.adjustmentLayer) {
            info.type = "adjustment";
        } else if (layer.source instanceof CompItem) {
            info.type = "precomp";
            info.sourceName = layer.source.name;
        } else {
            info.type = "footage";
            if (layer.source) {
                info.sourceName = layer.source.name;
                info.sourceWidth = layer.source.width || 0;
                info.sourceHeight = layer.source.height || 0;
            }
        }

        // 3D layer
        if (layer.threeDLayer) {
            info.is3D = true;
        }

        // Track matte
        if (layer.hasTrackMatte) {
            info.trackMatteType = layer.trackMatteType;
        }
    }

    // Transform values
    try {
        var transform = layer.property("Transform");
        if (transform) {
            var pos = transform.property("Position");
            if (pos) {
                var pv = pos.value;
                info.position = [roundNum(pv[0], 1), roundNum(pv[1], 1)];
                if (pv.length > 2) info.position.push(roundNum(pv[2], 1));
            }
            var scale = transform.property("Scale");
            if (scale) {
                var sv = scale.value;
                info.scale = [roundNum(sv[0], 1), roundNum(sv[1], 1)];
                if (sv.length > 2) info.scale.push(roundNum(sv[2], 1));
            }
            var rot = transform.property("Rotation") || transform.property("Z Rotation");
            if (rot) info.rotation = roundNum(rot.value, 1);
            var opacity = transform.property("Opacity");
            if (opacity) info.opacity = roundNum(opacity.value, 1);
        }
    } catch (_e) {}

    // Parent
    if (layer.parent) {
        info.parent = layer.parent.name;
    }

    // Effects
    var effects = layer.property("Effects");
    if (effects && effects.numProperties > 0) {
        info.effects = [];
        for (var j = 1; j <= Math.min(effects.numProperties, 20); j++) {
            var fx = effects.property(j);
            info.effects.push({
                name: fx.name,
                matchName: fx.matchName,
                enabled: fx.enabled
            });
        }
    }

    // Masks
    var masks = layer.property("Masks");
    if (masks && masks.numProperties > 0) {
        info.maskCount = masks.numProperties;
    }

    // Keyframe count on core properties
    var keyframeProps = ["Position", "Scale", "Rotation", "Opacity"];
    var kfInfo = [];
    try {
        var transform = layer.property("Transform");
        for (var k = 0; k < keyframeProps.length; k++) {
            var prop = transform.property(keyframeProps[k]);
            if (!prop) {
                // Try Z Rotation for 3D layers
                if (keyframeProps[k] === "Rotation") {
                    prop = transform.property("Z Rotation");
                }
            }
            if (prop && prop.numKeys > 0) {
                kfInfo.push(keyframeProps[k] + ":" + prop.numKeys);
            }
        }
    } catch (_e) {}
    if (kfInfo.length > 0) {
        info.keyframes = kfInfo.join(", ");
    }

    // Expressions
    var exprProps = [];
    try {
        var transform = layer.property("Transform");
        var propsToCheck = ["Position", "Scale", "Rotation", "Opacity", "Anchor Point"];
        for (var k = 0; k < propsToCheck.length; k++) {
            var prop = transform.property(propsToCheck[k]);
            if (prop && prop.expressionEnabled) {
                exprProps.push(propsToCheck[k]);
            }
        }
    } catch (_e) {}
    if (exprProps.length > 0) {
        info.expressions = exprProps.join(", ");
    }

    return info;
}


// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Set temporal ease on a keyframe, automatically matching the property's dimensions.
 * Works for 1D (Opacity, Rotation), 2D (Position, Scale), and 3D properties.
 * @param {Property} prop - The property with keyframes
 * @param {number} keyIndex - The keyframe index (1-based)
 * @param {number} speed - Ease speed (0 = smooth)
 * @param {number} influence - Ease influence percentage (default 33)
 */
function setEase(prop, keyIndex, speed, influence) {
    if (typeof influence === "undefined") influence = 33;
    var dims = prop.value instanceof Array ? prop.value.length : 1;
    var ease = [];
    for (var i = 0; i < dims; i++) {
        ease.push(new KeyframeEase(speed, influence));
    }
    prop.setTemporalEaseAtKey(keyIndex, ease, ease);
}

function roundNum(val, decimals) {
    if (typeof val !== "number" || isNaN(val)) return 0;
    var factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}


/**
 * Get AE version string.
 */
function getAEVersion() {
    return app.version;
}


/**
 * Check if a project is open.
 */
function isProjectOpen() {
    return app.project ? "true" : "false";
}


/**
 * Get just the active comp info (lighter than full state).
 */
function getActiveCompInfo() {
    if (!app.project || !app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
        return JSON.stringify({ error: "No active composition" });
    }
    return JSON.stringify(describeComp(app.project.activeItem));
}
