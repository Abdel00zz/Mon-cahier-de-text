const fs = require('fs');
const content = fs.readFileSync('constants/class-levels.ts', 'utf8');

// Extract CLASS_LEVELS_BY_CYCLE
const cycleMatch = content.match(/CLASS_LEVELS_BY_CYCLE[\s\S]*?\};/);
// Extract CLASS_LEVEL_DISPLAY_NAMES_AR
const arMatch = content.match(/CLASS_LEVEL_DISPLAY_NAMES_AR:[\s\S]*?\};/);

console.log(cycleMatch ? cycleMatch[0] : 'no cycle');
console.log(arMatch ? arMatch[0] : 'no ar');
