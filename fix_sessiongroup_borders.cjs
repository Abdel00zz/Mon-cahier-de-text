const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');

code = code.replace(
    /const isDatedSequenceEnd = !!first\.dateMerge\?\.isDatedSequenceEnd;/,
    "const last = items[items.length - 1];\n    const isDatedSequenceEnd = !!last.dateMerge?.isDatedSequenceEnd;"
);

fs.writeFileSync('features/editor/MainTable.tsx', code);
