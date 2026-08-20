const fs = require('fs');
let mainTableCode = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');
let sepRowCode = fs.readFileSync('features/editor/SeparatorRow.tsx', 'utf8');

const newGridClass = "grid-cols-[20%_1fr_20%] md:grid-cols-[var(--cdt-table-cols)]";

mainTableCode = mainTableCode.replace(/const TABLE_GRID_CLASS = 'grid-cols-\[19%_1fr\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g, `const TABLE_GRID_CLASS = '${newGridClass}';`);
tableRowCode = tableRowCode.replace(/const TABLE_GRID_CLASS = 'grid-cols-\[19%_1fr\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g, `const TABLE_GRID_CLASS = '${newGridClass}';`);
sepRowCode = sepRowCode.replace(/const TABLE_GRID_CLASS = 'grid-cols-\[19%_1fr\] md:grid-cols-\[var\(--cdt-table-cols\)\]';/g, `const TABLE_GRID_CLASS = '${newGridClass}';`);

fs.writeFileSync('features/editor/MainTable.tsx', mainTableCode);
fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);
fs.writeFileSync('features/editor/SeparatorRow.tsx', sepRowCode);
