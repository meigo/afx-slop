/**
 * Build a signed ZXP package for distribution.
 * Cross-platform (Windows + macOS). Uses zxp-sign-cmd.
 *
 * Usage:
 *   node scripts/build-zxp.js
 */
import { createRequire } from "module";
import { cpSync, rmSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const require = createRequire(import.meta.url);
const zxpSignCmd = require("zxp-sign-cmd");

const root = join(import.meta.dirname, "..");
const buildDir = join(root, "build");
const certDir = join(root, ".certs");
const certFile = join(certDir, "cert.p12");
const staging = join(tmpdir(), "afx-slop-staging");
const output = join(buildDir, "afx-slop.zxp");
const certPass = "afx-slop-dev";

async function main() {
    mkdirSync(buildDir, { recursive: true });
    mkdirSync(certDir, { recursive: true });

    // Step 1: Create certificate if needed
    if (!existsSync(certFile)) {
        console.log("Creating self-signed certificate...");
        await new Promise((resolve, reject) => {
            zxpSignCmd.selfSignedCert({
                country: "US",
                province: "NA",
                org: "afx-slop",
                name: "afx-slop",
                password: certPass,
                output: certFile,
            }, (err) => err ? reject(err) : resolve());
        });
        console.log("Certificate created:", certFile);
    } else {
        console.log("Using existing certificate:", certFile);
    }

    // Step 2: Create staging directory with extension files only
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });

    cpSync(root, staging, {
        recursive: true,
        filter: (srcPath) => {
            const rel = srcPath.slice(root.length);
            if (/^[\\/](\.git|\.certs|node_modules|tests|scripts|build)([\\/]|$)/.test(rel)) return false;
            if (/^[\\/](package\.json|package-lock\.json|eslint\.config\.js|vitest\.config\.js|\.gitignore|\.debug)$/.test(rel)) return false;
            return true;
        },
    });

    // Step 3: Build ZXP
    if (existsSync(output)) rmSync(output);
    console.log("Signing ZXP...");
    await new Promise((resolve, reject) => {
        zxpSignCmd.sign({
            input: staging,
            output: output,
            cert: certFile,
            password: certPass,
        }, (err) => err ? reject(err) : resolve());
    });

    // Step 4: Clean up
    rmSync(staging, { recursive: true, force: true });

    console.log("Built:", output);
}

main().catch((err) => {
    console.error("Build failed:", err.message);
    process.exit(1);
});
