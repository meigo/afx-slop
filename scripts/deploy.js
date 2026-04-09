/**
 * Deploy extension to Adobe CEP extensions folder.
 * Copies project files (excluding dev-only dirs) to the CEP extensions directory.
 * Works on both Windows and macOS.
 */
import { cpSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";

function getCEPExtensionsDir() {
    if (platform() === "win32") {
        const appData = process.env.APPDATA;
        if (!appData) {
            console.error("APPDATA environment variable not set.");
            process.exit(1);
        }
        return join(appData, "Adobe", "CEP", "extensions");
    }
    // macOS
    return join(homedir(), "Library", "Application Support", "Adobe", "CEP", "extensions");
}

const dest = join(getCEPExtensionsDir(), "afx-slop");
const src = join(import.meta.dirname, "..");

// Remove old copy
if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
    console.log("Removed old copy:", dest);
}

// Copy, skipping dev-only dirs
cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
        const rel = srcPath.slice(src.length);
        // Skip .git, node_modules, tests, and scripts
        if (/^[\\/](\.git|node_modules|tests|scripts)([\\/]|$)/.test(rel)) return false;
        return true;
    },
});

console.log("Deployed to:", dest);
