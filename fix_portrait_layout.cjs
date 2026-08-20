const fs = require('fs');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');

// The main issue in portrait is dateCellVisibility is hidden in portrait ('hidden md:flex') if there's no assigned date.
// AND the grid is 'grid-cols-1 md:grid-cols-[var(--cdt-table-cols)]' if not assigned date.
// But the user WANTS to see the 3 columns even in portrait, and we need to innovate.

// Let's modify the grid to always show 3 columns or adjust the layout to fit 3 columns elegantly on mobile.
// Changing 'hidden md:flex' to 'flex' so we see the cells, and changing the grid layout for mobile.
// Wait, the user said: "essayer de reflchire profondment comment afficher le tableau avec ces 3 colonnes meem en mode portrait"
// "reflchisser au taille text marges et dautre soit hyper innovant"

// In TableRow.tsx, let's look for dateCellVisibility and rowGridClass

tableRowCode = tableRowCode.replace(
    /const rowGridClass = hasAssignedDate\s*\?\s*TABLE_GRID_CLASS\s*:\s*'grid-cols-1 md:grid-cols-\[var\(--cdt-table-cols\)\]';/,
    "const rowGridClass = TABLE_GRID_CLASS;"
);

tableRowCode = tableRowCode.replace(
    /const dateCellVisibility = hasAssignedDate \? 'flex' : 'hidden md:flex';/g,
    "const dateCellVisibility = 'flex';"
);

// Remark visibility also needs to be flex everywhere
tableRowCode = tableRowCode.replace(
    /const RemarkCell: FC<\{/g,
    "const RemarkCell: FC<{"
);

fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);
