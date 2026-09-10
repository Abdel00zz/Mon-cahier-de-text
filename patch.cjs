const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
code = code.replace(
    /const topBoundaryClass = firstMerge\?\.isDatedSequenceStart/,
    'const hasAssignedDate = uniqueDates.length > 0;\n    const topBoundaryClass = (hasAssignedDate && firstMerge?.isDatedSequenceStart)'
);
code = code.replace(
    /const bottomBoundaryClass = lastMerge\?\.isDatedSequenceEnd\s*\n\s*\? \(hasWarning \? 'border-b-2 border-b-warning\/70' : 'border-b-2 border-b-foreground\/30'\)\s*\n\s*: \(hasWarning \? 'border-b border-b-warning\/60' : 'border-b border-b-border\/70'\);/,
    "const bottomBoundaryClass = hasAssignedDate\n        ? (lastMerge?.isDatedSequenceEnd\n            ? (hasWarning ? 'border-b-2 border-b-warning/70' : 'border-b-2 border-b-foreground/30')\n            : (hasWarning ? 'border-b border-b-warning/60' : 'border-b border-b-border/70'))\n        : (groupIsSelected ? 'border-b border-b-primary/15' : '');"
);
fs.writeFileSync('features/editor/MainTable.tsx', code);
