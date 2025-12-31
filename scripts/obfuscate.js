#!/usr/bin/env node

/**
 * Obfuscation script for Docker build
 * This script obfuscates all JavaScript files in the src directory
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Obfuscation options based on code analysis
// Safe configuration that protects code without breaking functionality
const obfuscationOptions = {
    // ============================================================
    // BASIC OBFUSCATION (Safe for all code)
    // ============================================================

    // Compress code to single line, remove whitespace/comments
    compact: true,

    // Rename local variables to hexadecimal names
    // Example: const browser = ... → const _0x4311 = ...
    identifierNamesGenerator: 'hexadecimal',

    // ============================================================
    // STRING HANDLING (Safe options for dynamic strings)
    // ============================================================

    // DISABLED - Would break: URL templates, regex, path.join(), Unicode strings
    // stringArrayEncoding: ['base64'],
    stringArrayEncoding: [],

    // DISABLED - Would break: Template literals, regex patterns
    // splitStrings: true,
    splitStrings: false,

    // Low threshold - safer for dynamic string operations
    stringArrayThreshold: 0.3,

    // Shuffle and rotate string array (light obfuscation)
    shuffleStringArray: true,
    rotateStringArray: true,

    // ============================================================
    // CODE FLOW (Must be disabled for async/Puppeteer)
    // ============================================================

    // DISABLED - Breaks async/await, Puppeteer, axios interceptors
    // controlFlowFlattening: true,
    controlFlowFlattening: false,

    // DISABLED - Breaks async operations, promise chains
    // deadCodeInjection: true,
    deadCodeInjection: false,

    // ============================================================
    // NODE.JS / MODULE SYSTEM (Critical - must disable)
    // ============================================================

    // Don't rename globals - would break require(), module.exports, process, etc.
    renameGlobals: false,

    // Don't transform object keys - would break Puppeteer/axios config objects
    transformObjectKeys: false,

    // ============================================================
    // OTHER OPTIONS
    // ============================================================

    // Keep console output for debugging (set to true to hide all logs)
    disableConsoleOutput: false,

    // Disabled - can cause runtime errors
    debugProtection: false,

    // Disabled - can modify function behavior
    selfDefending: false,

    // Disabled - can break Unicode string comparisons
    unicodeEscapeSequence: false,

    // Disable obfuscator logging
    log: false
};

function getSourceFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...getSourceFiles(fullPath));
        } else if (item.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

function main() {
    // Detect src directory location
    // Docker: /app/src (script is in /app/)
    // Local: ../cycani-proxy/src (script is in scripts/)
    let srcDir = path.join(__dirname, 'src');
    if (!fs.existsSync(srcDir)) {
        srcDir = path.join(__dirname, '..', 'cycani-proxy', 'src');
    }

    if (!fs.existsSync(srcDir)) {
        console.error(`Source directory not found. Tried:`);
        console.error(`  - ${path.join(__dirname, 'src')}`);
        console.error(`  - ${path.join(__dirname, '..', 'cycani-proxy', 'src')}`);
        process.exit(1);
    }

    const files = getSourceFiles(srcDir);

    console.log(`Found ${files.length} JavaScript files to obfuscate`);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        console.log(`Obfuscating: ${file}`);

        try {
            const sourceCode = fs.readFileSync(file, 'utf8');
            const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
            const obfuscatedCode = obfuscationResult.getObfuscatedCode();

            fs.writeFileSync(file, obfuscatedCode, 'utf8');
            successCount++;
            console.log(`  OK`);
        } catch (error) {
            console.error(`  FAILED: ${error.message}`);
            failCount++;
        }
    }

    console.log(`\nObfuscation complete: ${successCount} succeeded, ${failCount} failed`);

    if (failCount > 0) {
        process.exit(1);
    }
}

main();
