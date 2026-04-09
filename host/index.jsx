/**
 * After Effects ExtendScript host layer.
 * Provides code execution, project state gathering, and utility functions.
 *
 * Called from the CEP panel via CSInterface.evalScript().
 * ExtendScript is ES3 -- no let/const, no arrow functions, no template literals.
 */

// ─── Code Execution ────────────────────────────────────────────────────────────

/**
 * Execute AI-generated ExtendScript code inside an undo group.
 * Returns JSON: { success: bool, output: string, error: string }
 */
function executeCode(codeStr) {
    var result = { success: false, output: "", error: "" };

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
        // End undo group even on error so AE doesn't get stuck
        try { app.endUndoGroup(); } catch (ignore) {}
        result.error = e.toString();
        if (e.line) {
            result.error += " (line " + e.line + ")";
        }
        result.output = outputLines.join("\n");
    }

    $.writeln = origWriteln;
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
        } catch (e) {}
    } else if (layer instanceof ShapeLayer) {
        info.type = "shape";
    } else if (layer instanceof CameraLayer) {
        info.type = "camera";
        try {
            info.zoom = roundNum(layer.property("Camera Options").property("Zoom").value, 1);
        } catch (e) {}
    } else if (layer instanceof LightLayer) {
        info.type = "light";
        try {
            info.lightType = layer.property("Light Options").property("Light Type").value;
            info.intensity = roundNum(layer.property("Light Options").property("Intensity").value, 1);
        } catch (e) {}
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
    } catch (e) {}

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
    } catch (e) {}
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
    } catch (e) {}
    if (exprProps.length > 0) {
        info.expressions = exprProps.join(", ");
    }

    return info;
}


// ─── Helpers ───────────────────────────────────────────────────────────────────

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
