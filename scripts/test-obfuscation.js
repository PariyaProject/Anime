/**
 * Test script to verify JavaScript obfuscation
 * This script tests obfuscation locally before building the Docker image
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const JavaScriptObfuscator = require('javascript-obfuscator');

// Obfuscation options matching Dockerfile
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

function obfuscateFile(filePath) {
    console.log(`🔒 Obfuscating: ${filePath}`);

    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const originalSize = sourceCode.length;
    const originalLines = sourceCode.split('\n').length;

    try {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
        const obfuscatedCode = obfuscationResult.getObfuscatedCode();
        const obfuscatedSize = obfuscatedCode.length;
        const obfuscatedLines = obfuscatedCode.split('\n').length;

        // Verify obfuscation actually changed the code
        if (obfuscatedCode === sourceCode) {
            console.warn(`⚠️  Warning: Code may not be properly obfuscated: ${filePath}`);
            return false;
        }

        // Check if code is minified (compact = true)
        if (obfuscatedLines > originalLines * 0.5) {
            console.warn(`⚠️  Warning: Obfuscated code has many lines, may not be compacted: ${filePath}`);
        }

        console.log(`   Original: ${originalLines} lines, ${originalSize} bytes`);
        console.log(`   Obfuscated: ${obfuscatedLines} lines, ${obfuscatedSize} bytes`);
        console.log(`   Ratio: ${((obfuscatedSize / originalSize) * 100).toFixed(1)}%`);

        return true;
    } catch (error) {
        console.error(`❌ Failed to obfuscate: ${filePath}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

function main() {
    console.log('🧪 Testing JavaScript Obfuscation\n');

    const srcDir = path.join(__dirname, '..', 'cycani-proxy', 'src');
    const files = getSourceFiles(srcDir);

    console.log(`Found ${files.length} JavaScript files in ${srcDir}\n`);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        const success = obfuscateFile(file);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        console.log();
    }

    console.log('='.repeat(50));
    console.log(`✅ Successfully obfuscated: ${successCount}/${files.length}`);
    if (failCount > 0) {
        console.log(`❌ Failed: ${failCount}/${files.length}`);
        process.exit(1);
    }
    console.log('='.repeat(50));

    console.log('\n✨ All files can be obfuscated successfully!');
    console.log('📝 Docker build should work correctly.');
}

main();
