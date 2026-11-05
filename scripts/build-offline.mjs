import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = new URL("../dist/", import.meta.url);
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : path.join(dir, e.name),
      ),
    )
  ).flat();
}
const directory = fileURLToPath(root);
const all = (await files(directory)).filter((p) => !p.endsWith("sw.js"));
const names = all.map((p) => path.relative(directory, p).replaceAll("\\", "/"));
const version = createHash("sha256");
for (const file of all) version.update(await fs.readFile(file));
const hash = version.digest("hex").slice(0, 16);
const core = names.filter((p) => !p.startsWith("assets/items/"));
await fs.writeFile(
  new URL("sw.js", root),
  `
const PREFIX='abi-armory-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'${hash}';
const CORE=${JSON.stringify(core)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE.map(p=>new URL(p,self.registration.scope).href));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{
 const cache=await caches.open(CACHE);
 if(event.request.mode==='navigate'){try{return await fetch(event.request);}catch{return (await cache.match(new URL('index.html',self.registration.scope).href))||Response.error();}}
 const hit=await cache.match(event.request);if(hit)return hit;
 const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;
})());});
`,
);
console.log(
  `Offline shell ${hash}: ${core.length} files. Viewed item icons are cached on demand.`,
);
