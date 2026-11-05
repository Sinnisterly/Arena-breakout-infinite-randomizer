import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const records=JSON.parse(await fs.readFile(new URL('data/stock-weapon-portraits.json',root),'utf8'));
await fs.mkdir(new URL('public/assets/weapons/',root),{recursive:true});
const portraits={};let next=0;
async function worker(){
  while(next<records.length){const row=records[next++],file=new URL('public/'+row.file,root);
    try{await fs.access(file);}catch{const response=await fetch(row.url);if(!response.ok)throw new Error(`${row.name}: ${response.status}`);const bytes=new Uint8Array(await response.arrayBuffer());if(String.fromCharCode(...bytes.slice(0,4))!=='RIFF' && !(bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71))throw new Error(`Invalid portrait: ${row.name}`);await fs.writeFile(file,bytes);}
    portraits[row.id]={path:row.file,source:row.source};
  }
}
await Promise.all(Array.from({length:6},worker));
await fs.writeFile(new URL('src/data/weapon-portraits.json',root),JSON.stringify(portraits,null,2)+'\n');
console.log(`Cached ${Object.keys(portraits).length} complete stock-weapon portraits.`);
