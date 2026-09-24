/**
 * Migration : suppression de next-intl et des fichiers de traduction.
 * Le français est la seule langue du projet ; Google Translate fait le reste.
 *
 * Usage (depuis le dossier frontend) :
 *   node scripts/migrate-to-google-translate.js
 *
 * Le script est idempotent : on peut le relancer sans risque.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');

// 1. Remplace `from 'next-intl'` par `from '@/i18n/translate'` (fin de ligne conservée).
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });

let rewritten = 0;
const leftovers = [];

for (const file of walk(srcDir)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/(from\s+)(['"])next-intl\2/g, '$1$2@/i18n/translate$2');

  if (after !== before) {
    fs.writeFileSync(file, after);
    rewritten += 1;
    console.log(`  import réécrit : ${path.relative(root, file)}`);
  }

}

// 2. Supprime les fichiers devenus inutiles.
const obsolete = [
  'src/messages',
  'src/i18n/request.ts',
  'src/components/layout/LanguageSwitcher.tsx',
  'scripts/check-i18n.js',
  'scripts/sync-i18n.js',
  'scripts/complete-catalog.py',
];

for (const relative of obsolete) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`  supprimé       : ${relative}`);
  }
}

// Vérifie qu'il ne reste plus aucun import de next-intl (après suppression des fichiers obsolètes).
for (const file of walk(srcDir)) {
  if (/['"]next-intl(\/[\w-]+)?['"]/.test(fs.readFileSync(file, 'utf8'))) {
    leftovers.push(path.relative(root, file));
  }
}

// 3. Retire le script npm `i18n:check` (il lisait src/messages).
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.scripts && pkg.scripts['i18n:check']) {
  delete pkg.scripts['i18n:check'];
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('  package.json   : script "i18n:check" retiré');
}

console.log(`\nTerminé : ${rewritten} fichier(s) mis à jour.`);

if (leftovers.length) {
  console.log('\nRéférences à next-intl restantes (à corriger à la main) :');
  leftovers.forEach((file) => console.log(`  - ${file}`));
  process.exitCode = 1;
}
