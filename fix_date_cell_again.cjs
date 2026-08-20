const fs = require('fs');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');

// Also need to make sure the DateCell is not hidden on mobile, which is controlled by tailwind classes usually, but here it might be just grid
// Looking closely at TableRow.tsx
tableRowCode = tableRowCode.replace(
    /const TABLE_GRID_CLASS = 'grid-cols-\[22%_1fr_25%\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g,
    "const TABLE_GRID_CLASS = 'grid-cols-[25%_1fr_25%] md:grid-cols-[var(--cdt-table-cols)]';"
);

fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);

let mainTableCode = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
mainTableCode = mainTableCode.replace(
    /const TABLE_GRID_CLASS = 'grid-cols-\[22%_1fr_25%\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g,
    "const TABLE_GRID_CLASS = 'grid-cols-[25%_1fr_25%] md:grid-cols-[var(--cdt-table-cols)]';"
);

fs.writeFileSync('features/editor/MainTable.tsx', mainTableCode);

let sepRowCode = fs.readFileSync('features/editor/SeparatorRow.tsx', 'utf8');
sepRowCode = sepRowCode.replace(
    /const TABLE_GRID_CLASS = 'grid-cols-\[22%_1fr_25%\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g,
    "const TABLE_GRID_CLASS = 'grid-cols-[25%_1fr_25%] md:grid-cols-[var(--cdt-table-cols)]';"
);
fs.writeFileSync('features/editor/SeparatorRow.tsx', sepRowCode);

