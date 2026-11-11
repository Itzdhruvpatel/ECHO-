// Publish the built game to the gh-pages branch for GitHub Pages.
// Run: npm run deploy   (builds first, then force-pushes dist/ as gh-pages)
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();

run('npm run build');
writeFileSync('dist/.nojekyll', ''); // serve files as they are, no Jekyll processing
rmSync('dist/.git', { recursive: true, force: true });
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run('git commit -q -m "Deploy"', 'dist');
run(`git push -f -q ${remote} gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log('Deployed to gh-pages.');
