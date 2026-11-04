export function summarizeVentures(data){const records=Object.values(data||{}).flatMap(v=>Array.isArray(v)?v:[]);return{records:records.length,modules:Object.keys(data||{}).length};}
