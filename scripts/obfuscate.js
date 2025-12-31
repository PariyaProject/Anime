#!/usr/bin/env node

/**
 * Obfuscation script for Docker build
 * This script obfuscates all JavaScript files in the src directory
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: false,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
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
