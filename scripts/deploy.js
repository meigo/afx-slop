/**
 * Deploy extension to Adobe CEP extensions folder.
 * Copies project files (excluding dev-only dirs) to the CEP extensions directory.
 */
import { cpSync, rmSync, existsSync } from "fs";
import { join } from "path";

const appData = process.env.APPDATA;
if (!appData) {
    console.error("APPDATA not set — this script is Windows-only.");
    process.exit(1);
}

const dest = join(appData, "Adobe", "CEP", "extensions", "afx-slop");
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
