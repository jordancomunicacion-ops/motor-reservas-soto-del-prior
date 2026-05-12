const fs = require('fs');
const https = require('https');

const chunks = [
  'a9d566f1ca23b7e3.js', 'dce1ee0e89ee93db.js', 'e4f73816b6086d5c.js',
  'a0e9039376638b5f.js', 'turbopack-0f8ba24497bd197a.js', 'ff1a16fafef87110.js',
  '7340adf74ff47ec0.js', 'a5a1052d3ab076cc.js', 'a37b010698ac9317.js',
  '1c135a20e8e7c0dd.js', '32da829620d5f4f6.js', 'a6dad97d9634a72d.js'
];

const baseUrl = 'https://reservas.sotodelprior.com/_next/static/chunks/';

async function checkChunk(chunk) {
  return new Promise((resolve, reject) => {
    https.get(baseUrl + chunk, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.toLowerCase().includes('pasado')) {
          console.log(`FOUND 'pasado' in ${chunk}`);
          const idx = data.toLowerCase().indexOf('pasado');
          console.log(data.substring(Math.max(0, idx - 50), idx + 50));
        } else if (data.toLowerCase().includes('cerrado')) {
          console.log(`FOUND 'cerrado' in ${chunk}`);
          const idx = data.toLowerCase().indexOf('cerrado');
          console.log(data.substring(Math.max(0, idx - 50), idx + 50));
        }
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const chunk of chunks) {
    await checkChunk(chunk);
  }
}

main();
