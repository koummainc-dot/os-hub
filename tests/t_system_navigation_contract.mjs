import fs from "node:fs";
import assert from "node:assert/strict";

const core = fs.readFileSync("src/core/core.js", "utf8");
const shopping = fs.readFileSync("src/systems/shopping/index.jsx", "utf8");
const sports = fs.readFileSync("src/systems/sports/index.jsx", "utf8");
const skincare = fs.readFileSync("src/systems/skincare/index.jsx", "utf8");
const home = fs.readFileSync("src/systems/home/index.jsx", "utf8");
const sportsDomain = fs.readFileSync("src/systems/sports/domain.js", "utf8");

function registryIds(systemId) {
  const match = core.match(new RegExp(`id:"${systemId}"[\\s\\S]*?sections:osSec\\("([^"]+)"\\)`));
  assert.ok(match, `Missing ${systemId} registry descriptor`);
  return match[1].split("|").map((item) => item.split(":")[0]);
}


const homeTabSource = home.match(/const pageTabs = \[(.*?)\];/s)?.[1] || "";
const homeTabIds = [...homeTabSource.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const homeRegistryIds = registryIds("home");
assert.ok(home.includes("onClick={() => setPage?.(t.id)}"), "Home navigation buttons must change page");
assert.deepEqual([...new Set(homeTabIds)].sort(), [...new Set(homeRegistryIds)].sort(), "Home internal navigation and registry IDs must match");

const shoppingNavSource = shopping.match(/const sections=\[(.*?)\];/s)?.[1] || "";
const shoppingNavIds = [...shoppingNavSource.matchAll(/\["([^"]+)"/g)].map((m) => m[1]);
const shoppingPageIds = [...shopping.matchAll(/if\(page===["']([^"']+)["']\)/g)].map((m) => m[1]);
const shoppingRegistryIds = registryIds("shopping");
assert.ok(shopping.includes("onClick={()=>setPage(key)}"), "Shopping navigation buttons must change page");
assert.deepEqual([...new Set(shoppingNavIds)].sort(), [...new Set(shoppingRegistryIds)].sort(), "Shopping internal navigation and registry IDs must match");
assert.ok(shoppingPageIds.every((id) => shoppingNavIds.includes(id)), "Every Shopping page body must have a navigation entry");

const sportsStart = sportsDomain.indexOf("export const SPORTS_SECTIONS");
const sportsEnd = sportsDomain.indexOf("];", sportsStart);
const sportsNavIds = [...sportsDomain.slice(sportsStart, sportsEnd).matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
const sportsRegistryIds = registryIds("sports");
assert.ok(sports.includes("onClick={()=>setPage(s.id)}"), "Sports navigation buttons must change page");
assert.deepEqual([...new Set(sportsNavIds)].sort(), [...new Set(sportsRegistryIds)].sort(), "Sports internal navigation and registry IDs must match");

assert.match(core, /id:"home"[\s\S]*?status:"live"/, "Home OS must be activated in the registry");
assert.match(core, /id:"sports"[\s\S]*?status:"live"/, "Sports OS must be activated in the registry");
const skincareSectionSource = skincare.match(/const SECTIONS = \[(.*?)\];/s)?.[1] || "";
const skincareNavIds = [...skincareSectionSource.matchAll(/\["([^"]+)"/g)].map((m) => m[1]);
const skincareRegistryIds = registryIds("skincare");
assert.ok(skincare.includes("onClick={() => setPage(id)}"), "Skincare navigation buttons must change page");
assert.deepEqual([...new Set(skincareNavIds)].sort(), [...new Set(skincareRegistryIds)].sort(), "Skincare internal navigation and registry IDs must match");
assert.match(core, /id:"skincare"[\s\S]*?status:"live"/, "Skincare OS must be activated in the registry");

assert.match(core, /id:"spiritual"[\s\S]*?status:"live"/, "Spiritual & Values OS must be activated in the registry");
console.log("System internal navigation contract passed.");
