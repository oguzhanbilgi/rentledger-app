#!/usr/bin/env node
/**
 * Mobile Factory — Public Privacy Policy Publisher
 * Publishes store-listing/PRIVACY_POLICY.html to a public GitHub Pages repo
 * (oguzhanbilgi/obappstudio-legal) while keeping app source code repos private.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

async function main() {
  const out = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  const match = out.match(/password=(.+)/);
  if (!match) throw new Error('GitHub credential token not found');
  const token = match[1].trim();

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ObAppStudio-Factory',
    'Content-Type': 'application/json',
  };

  console.log('🌐 Ensuring public repository oguzhanbilgi/obappstudio-legal exists...');
  await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'obappstudio-legal',
      description: 'Official Privacy Policy & Legal Portal for ObAppStudio Mobile Apps',
      private: false,
      auto_init: true,
    }),
  });

  await new Promise((r) => setTimeout(r, 2000));

  const htmlContent = fs.readFileSync(
    'D:/MobileFactory/veloquote-app/store-listing/PRIVACY_POLICY.html'
  );
  const b64 = htmlContent.toString('base64');

  for (const fileName of ['index.html', 'privacy.html', 'veloquote-privacy.html']) {
    const getRes = await fetch(
      `https://api.github.com/repos/oguzhanbilgi/obappstudio-legal/contents/${fileName}`,
      { headers }
    );
    const getJson = getRes.ok ? await getRes.json() : null;

    const putRes = await fetch(
      `https://api.github.com/repos/oguzhanbilgi/obappstudio-legal/contents/${fileName}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Publish ${fileName}`,
          content: b64,
          sha: getJson?.sha,
        }),
      }
    );
    if (!putRes.ok) {
      console.error(`Failed to upload ${fileName}:`, await putRes.text());
    } else {
      console.log(`✅ Uploaded public ${fileName}`);
    }
  }

  await fetch('https://api.github.com/repos/oguzhanbilgi/obappstudio-legal/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify({ source: { branch: 'main', path: '/' } }),
  });

  const liveUrl1 = 'https://oguzhanbilgi.github.io/obappstudio-legal/privacy.html';
  const liveUrl2 = 'https://raw.githack.com/oguzhanbilgi/obappstudio-legal/main/privacy.html';

  const check2 = await fetch(liveUrl2);
  console.log(`✅ Live CDN URL Status (${liveUrl2}): HTTP ${check2.status}`);
  console.log(`✅ GitHub Pages URL: ${liveUrl1}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
