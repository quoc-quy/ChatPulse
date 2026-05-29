#!/usr/bin/env node
/**
 * Postinstall script: Patch react-native's libs.versions.toml to pin
 * the Android Gradle Plugin (AGP) version to 8.7.3.
 *
 * React Native 0.81 ships with agp = "8.11.0" which is not yet stable
 * and breaks autolinked React Native libraries that expose no variants.
 *
 * This script must run BEFORE any Android build (i.e., during npm install)
 * because the com.facebook.react.settings Gradle plugin reads this file
 * during the Settings Evaluation phase -- before any settings.gradle
 * overrides can take effect.
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'gradle',
  'libs.versions.toml'
);

const AGP_TARGET = '8.11.0';
const AGP_PINNED = '8.7.3';

if (!fs.existsSync(TARGET_FILE)) {
  console.log('[fix-agp] libs.versions.toml not found — skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(TARGET_FILE, 'utf8');
if (content.includes(`agp = "${AGP_TARGET}"`)) {
  content = content.replace(
    `agp = "${AGP_TARGET}"`,
    `agp = "${AGP_PINNED}"`
  );
  fs.writeFileSync(TARGET_FILE, content, 'utf8');
  console.log(`[fix-agp] ✅ Patched libs.versions.toml: agp ${AGP_TARGET} → ${AGP_PINNED}`);
} else if (content.includes(`agp = "${AGP_PINNED}"`)) {
  console.log(`[fix-agp] ✅ Already patched (agp = ${AGP_PINNED}) — no change needed.`);
} else {
  console.log('[fix-agp] ⚠️  Could not find AGP version line to patch. Please check the file manually.');
}
