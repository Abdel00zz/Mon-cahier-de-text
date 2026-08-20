const fs = require('fs');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');

tableRowCode = tableRowCode.replace(
    /const dateCellVisibility = 'hidden md:flex';/,
    "const dateCellVisibility = 'flex';"
);
tableRowCode = tableRowCode.replace(
    /const remarkCellVisibility = 'hidden md:flex';/,
    "const remarkCellVisibility = 'flex';"
);

fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);

