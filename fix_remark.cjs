const fs = require('fs');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');

tableRowCode = tableRowCode.replace(
    /const RemarkCell: FC<\{[\s\S]*?className=\`hidden min-w-0 md:flex flex-col/,
    (match) => match.replace("hidden min-w-0 md:flex flex-col", "flex min-w-0 flex-col")
);

fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);

let mainTableCode = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
mainTableCode = mainTableCode.replace(
    /className=\{\`hidden min-w-0 self-stretch p-1 md:flex/,
    "className={`flex min-w-0 self-stretch p-1"
);

fs.writeFileSync('features/editor/MainTable.tsx', mainTableCode);

