#!/usr/bin/env node

/**
 * Obfuscation script for Docker build
 * Minimal safe configuration - proven to work
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// ============================================================
// Minimal safe obfuscation configuration
// Only options that are proven to work without breaking functionality
// ============================================================
const obfuscationOptions = {
    // --- 基础混淆 (Tested and working) ---
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    target: 'node',

    // --- 全部禁用 (confirmed to break code) ---
    stringArray: false, // 字符串数组化会导致问题
    stringArrayEncoding: [],
    stringArrayThreshold: 0,
    shuffleStringArray: false,
    rotateStringArray: false,
    splitStrings: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    renameGlobals: false,
    transformObjectKeys: false,
    disableConsoleOutput: false, // 保留日志
    debugProtection: false,
    selfDefending: false,
    unicodeEscapeSequence: false,
    ignoreRequireImports: true,
    sourceMap: false,
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
