import fs from 'node:fs';

const txt = fs.readFileSync('D:/MobileFactory/veloquote-app/package-lock.json', 'utf8')
  .replaceAll('"veloquote-app"', '"rentledger-app"');

fs.writeFileSync('D:/MobileFactory/rentledger-app/package-lock.json', txt, 'utf8');
console.log('✅ Updated rentledger-app/package-lock.json successfully!');
