const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

fs.writeFileSync(path.join(distPath, '.nojekyll'), '');
console.log('.nojekyll file successfully created in dist/');
