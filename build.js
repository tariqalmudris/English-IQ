// build.js — منصة دروسي العراقية — English IQ Iraq Performance Build Script
// Minifies CSS + JS files -> produces .min versions and updates HTML references

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execP = promisify(exec);

const ROOT = __dirname;

// Files to minify
const JS_FILES = [
    { src: 'data/lessons.js', out: 'data/lessons.min.js' },
    { src: 'favorites.js',    out: 'favorites.min.js' },
    { src: 'script.js',       out: 'script.min.js' },
    { src: 'nav.js',          out: 'nav.min.js' },
    { src: 'pwa.js',          out: 'pwa.min.js' },
    { src: 'sw.js',           out: 'sw.min.js' },
];

const CSS_FILES = [
    { src: 'style.css', out: 'style.min.css' },
];

// HTML files to patch references in
const HTML_FILES = [
    'index.html',
    'middle-stage.html',
    'secondary-stage.html',
    'grade-template.html',
    'favorites.html',
    'offline.html',
];

async function minifyJS(src, out) {
    const srcPath = path.join(ROOT, src);
    const outPath = path.join(ROOT, out);
    try {
        const { stdout, stderr } = await execP(
            `npx terser "${srcPath}" --compress --mangle --output "${outPath}"`
        );
        const before = fs.statSync(srcPath).size;
        const after  = fs.statSync(outPath).size;
        const saved  = Math.round((1 - after / before) * 100);
        console.log(`  ✓ JS  ${src.padEnd(25)} ${before}B → ${after}B  (-${saved}%)`);
    } catch (e) {
        console.error(`  ✗ JS  ${src}:`, e.message);
    }
}

async function minifyCSS(src, out) {
    const srcPath = path.join(ROOT, src);
    const outPath = path.join(ROOT, out);
    try {
        await execP(`npx cleancss -o "${outPath}" "${srcPath}"`);
        const before = fs.statSync(srcPath).size;
        const after  = fs.statSync(outPath).size;
        const saved  = Math.round((1 - after / before) * 100);
        console.log(`  ✓ CSS ${src.padEnd(25)} ${before}B → ${after}B  (-${saved}%)`);
    } catch (e) {
        console.error(`  ✗ CSS ${src}:`, e.message);
    }
}

function patchHTML(file) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, 'utf8');

    // Replace CSS reference
    html = html.replace(/href="style\.css"/g, 'href="style.min.css"');

    // Replace JS references (NOT already .min)
    html = html.replace(/src="(data\/lessons|favorites|script|nav|pwa|sw)\.js"/g, 'src="$1.min.js"');
    // sw.js is referenced in sw.js itself for internal scope — skip SW in HTML
    // keep sw.js as is in pwa.js (navigator.serviceWorker.register uses '/sw.js' string)

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✓ HTML patched  ${file}`);
}

async function main() {
    console.log('\n🔨 منصة دروسي العراقية — English IQ Iraq — Performance Build\n');

    console.log('📦 Minifying JavaScript…');
    await Promise.all(JS_FILES.map(f => minifyJS(f.src, f.out)));

    console.log('\n🎨 Minifying CSS…');
    await Promise.all(CSS_FILES.map(f => minifyCSS(f.src, f.out)));

    console.log('\n📄 Patching HTML references…');
    HTML_FILES.forEach(patchHTML);

    // Update sw.js min to cache .min files
    let swMin = fs.readFileSync(path.join(ROOT, 'sw.min.js'), 'utf8');
    // The SW caches style.css etc. — patch those strings in the minified SW too
    swMin = swMin.replace(/['"]\/style\.css['"]/g, "'/style.min.css'");
    swMin = swMin.replace(/['"]\/script\.js['"]/g, "'/script.min.js'");
    swMin = swMin.replace(/['"]\/favorites\.js['"]/g, "'/favorites.min.js'");
    swMin = swMin.replace(/['"]\/pwa\.js['"]/g, "'/pwa.min.js'");
    swMin = swMin.replace(/['"]\/data\/lessons\.js['"]/g, "'/data/lessons.min.js'");
    fs.writeFileSync(path.join(ROOT, 'sw.min.js'), swMin, 'utf8');
    console.log('  ✓ Service Worker cache paths updated');

    // Report total sizes
    const totalBefore = JS_FILES.reduce((s, f) => {
        try { return s + fs.statSync(path.join(ROOT, f.src)).size; } catch { return s; }
    }, 0) + CSS_FILES.reduce((s, f) => {
        try { return s + fs.statSync(path.join(ROOT, f.src)).size; } catch { return s; }
    }, 0);

    const totalAfter = JS_FILES.reduce((s, f) => {
        try { return s + fs.statSync(path.join(ROOT, f.out)).size; } catch { return s; }
    }, 0) + CSS_FILES.reduce((s, f) => {
        try { return s + fs.statSync(path.join(ROOT, f.out)).size; } catch { return s; }
    }, 0);

    const totalSaved = Math.round((1 - totalAfter / totalBefore) * 100);
    console.log(`\n🎉 Done!  Total: ${(totalBefore/1024).toFixed(1)} KB → ${(totalAfter/1024).toFixed(1)} KB  (-${totalSaved}%)\n`);
}

main().catch(console.error);
