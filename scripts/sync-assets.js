import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const target = process.argv[2] || 'all';

function oklchToRgb(L_val, C_val, h_val, alpha_val) {
  let L = parseFloat(L_val);
  if (L_val.includes('%') || L > 1) L = L / 100;
  const C = parseFloat(C_val);
  const h = parseFloat(h_val);

  let alpha = 1;
  if (alpha_val !== undefined && alpha_val !== null) {
    let aStr = String(alpha_val).trim();
    if (aStr.endsWith('%')) {
      alpha = parseFloat(aStr) / 100;
    } else {
      alpha = parseFloat(aStr);
    }
  }

  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767434721 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  function gamma(c) {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  }

  const r = Math.round(gamma(rLin) * 255);
  const g = Math.round(gamma(gLin) * 255);
  const b_ = Math.round(gamma(bLin) * 255);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b_}, ${Math.round(alpha * 100) / 100})`;
  }
  return '#' + [r, g, b_].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function processCssForLegacyAndroid(distDir) {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return;

  const files = fs.readdirSync(assetsDir);
  for (const file of files) {
    if (file.endsWith('.css')) {
      const filePath = path.join(assetsDir, file);
      let css = fs.readFileSync(filePath, 'utf8');
      const initialOklch = (css.match(/oklch/gi) || []).length;
      const initialLayer = (css.match(/@layer/gi) || []).length;
      const initialOklab = (css.match(/in oklab/gi) || []).length;

      // 1. Transform oklch(...) to hex/rgba
      css = css.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/gi, (match, L, C, h, a) => {
        try {
          return oklchToRgb(L, C, h, a);
        } catch (e) {
          return match;
        }
      });

      // 2. Unwrap Safari/Firefox-only @supports query so CSS variables are unconditionally applied on Chromium < 85
      const supportsPrefix = '@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){';
      if (css.includes(supportsPrefix)) {
        const prefixIdx = css.indexOf(supportsPrefix);
        let depth = 1;
        let i = prefixIdx + supportsPrefix.length;
        let bodyStart = i;
        while (i < css.length && depth > 0) {
          if (css[i] === '{') depth++;
          else if (css[i] === '}') depth--;
          i++;
        }
        if (depth === 0) {
          const innerContent = css.slice(bodyStart, i - 1);
          css = css.slice(0, prefixIdx) + innerContent + css.slice(i);
        }
      }

      // 3. Ensure global default gradient custom properties exist on :root
      const rootFallbackVars = ':root{--tw-gradient-position:to bottom;--tw-gradient-from-position:0%;--tw-gradient-via-position:50%;--tw-gradient-to-position:100%;--tw-gradient-from:#0000;--tw-gradient-to:#0000;--tw-gradient-via:#0000;}';
      if (!css.includes('--tw-gradient-from-position:0%')) {
        css = rootFallbackVars + css;
      }

      // 4. Strip 'in oklab' from gradients (Chromium < 111 compatibility)
      css = css.replace(/--tw-gradient-position:\s*to\s+([a-z ]+)\s+in\s+oklab/gi, '--tw-gradient-position:to $1');
      css = css.replace(/--tw-gradient-position:\s*in\s+oklab/gi, '--tw-gradient-position:circle');
      css = css.replace(/in\s+oklab\s*,/gi, '');
      css = css.replace(/\s+in\s+oklab/gi, '');

      // 5. Inject solid background-color fallback into all .from-* classes
      let injectedFallbacks = 0;
      css = css.replace(/\.from-([a-z0-9\\/_-]+)\{([^}]+)\}/gi, (match, cls, body) => {
        if (!body.includes('background-color:')) {
          const fromMatch = body.match(/--tw-gradient-from:\s*([^;]+);/);
          if (fromMatch) {
            injectedFallbacks++;
            return `.from-${cls}{background-color:${fromMatch[1]};${body}}`;
          }
        }
        return match;
      });

      // 6. Unwrap @layer rules for older Chromium (< 99)
      css = css.replace(/@layer\s+[^;{]+;/gi, '');
      let idx = 0;
      while (true) {
        const match = /@layer\s+([a-zA-Z0-9_,-]+)\s*\{/.exec(css.slice(idx));
        if (!match) break;
        const layerStart = idx + match.index;
        const bodyStart = layerStart + match[0].length;
        let depth = 1;
        let endIdx = bodyStart;
        while (endIdx < css.length && depth > 0) {
          if (css[endIdx] === '{') depth++;
          else if (css[endIdx] === '}') depth--;
          endIdx++;
        }
        if (depth === 0) {
          const layerContent = css.slice(bodyStart, endIdx - 1);
          css = css.slice(0, layerStart) + layerContent + css.slice(endIdx);
          idx = layerStart;
        } else {
          break;
        }
      }

      fs.writeFileSync(filePath, css, 'utf8');
      console.log(`🎨 [Legacy Android CSS Fix] ${file}: Chuyển ${initialOklch} oklch, xóa ${initialOklab} 'in oklab', gỡ ${initialLayer} @layer, bổ sung ${injectedFallbacks} màu nền fallback!`);
    }
  }
}

function syncParent() {
  console.log('🔄 Đang đồng bộ web assets cho ParentPro (android-parent)...');
  const distDir = path.join(root, 'dist-parent');
  const parentHtml = path.join(distDir, 'parent.html');
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(parentHtml)) {
    fs.copyFileSync(parentHtml, indexHtml);
  }

  // Tương thích trình duyệt WebView Android cũ (Android 7-11)
  processCssForLegacyAndroid(distDir);

  const targetDir = path.join(root, 'android-parent', 'app', 'src', 'main', 'assets', 'public');
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(distDir, targetDir, { recursive: true });

  // Suppress Capacitor cordova.js / cordova_plugins.js warning
  fs.writeFileSync(path.join(targetDir, 'cordova.js'), '// Capacitor Cordova Compatibility Placeholder\nwindow.Cordova = window.cordova = window.cordova || {};\n', 'utf8');
  fs.writeFileSync(path.join(targetDir, 'cordova_plugins.js'), '// Capacitor Cordova Plugins Placeholder\nif (typeof cordova !== "undefined" && cordova.define) { cordova.define("cordova/plugin_list", function(require, exports, module) { module.exports = []; module.exports.metadata = {}; }); }\n', 'utf8');

  const capConfigFile = path.join(root, 'android-parent', 'app', 'src', 'main', 'assets', 'capacitor.config.json');
  const capConfigContent = {
    appId: 'com.lethao.parentpro',
    appName: 'ParentPro - Cha Mẹ',
    webDir: 'dist-parent',
    server: {
      androidScheme: 'https',
      cleartext: true
    },
    android: {
      allowMixedContent: true
    },
    plugins: {
      FirebaseAuthentication: {
        skipNativeAuth: false,
        providers: ['google.com']
      }
    }
  };
  fs.writeFileSync(capConfigFile, JSON.stringify(capConfigContent, null, 2));
  console.log('✅ Đã đồng bộ dist-parent -> android-parent/app/src/main/assets/public/');
}

function syncKid() {
  console.log('🔄 Đang đồng bộ web assets cho KidCare (android-kid)...');
  const distDir = path.join(root, 'dist-kid');
  const kidHtml = path.join(distDir, 'kid.html');
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(kidHtml)) {
    fs.copyFileSync(kidHtml, indexHtml);
  }

  // Tương thích trình duyệt WebView Android cũ (Android 7-11)
  processCssForLegacyAndroid(distDir);

  const targetDir = path.join(root, 'android-kid', 'app', 'src', 'main', 'assets', 'public');
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(distDir, targetDir, { recursive: true });

  // Suppress Capacitor cordova.js / cordova_plugins.js warning
  fs.writeFileSync(path.join(targetDir, 'cordova.js'), '// Capacitor Cordova Compatibility Placeholder\nwindow.Cordova = window.cordova = window.cordova || {};\n', 'utf8');
  fs.writeFileSync(path.join(targetDir, 'cordova_plugins.js'), '// Capacitor Cordova Plugins Placeholder\nif (typeof cordova !== "undefined" && cordova.define) { cordova.define("cordova/plugin_list", function(require, exports, module) { module.exports = []; module.exports.metadata = {}; }); }\n', 'utf8');

  const capKidConfigFile = path.join(root, 'android-kid', 'app', 'src', 'main', 'assets', 'capacitor.config.json');
  const capKidConfigContent = {
    appId: 'com.lethao.kidcare',
    appName: 'KidCare - Con Cái',
    webDir: 'dist-kid',
    server: {
      androidScheme: 'https',
      cleartext: true
    },
    android: {
      allowMixedContent: true
    },
    plugins: {
      FirebaseAuthentication: {
        skipNativeAuth: false,
        providers: ['google.com']
      }
    }
  };
  fs.writeFileSync(capKidConfigFile, JSON.stringify(capKidConfigContent, null, 2));

  console.log('✅ Đã đồng bộ dist-kid -> android-kid/app/src/main/assets/public/');
}

if (target === 'parent' || target === 'all') syncParent();
if (target === 'kid' || target === 'all') syncKid();
