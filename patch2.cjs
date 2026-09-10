const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
code = code.replace(
    /className=\{\`flex min-h-\[52px\] min-w-0 items-center justify-center self-stretch px-1 py-1 \$\{dividerClass\} \$\{hasWarning \? 'bg-warning\/10' : 'bg-muted\/30'\}\`\}/,
    "className={`flex min-h-[52px] min-w-0 items-center justify-center self-stretch px-1 py-1 ${dividerClass} ${hasWarning ? 'bg-warning/10' : (hasAssignedDate ? 'bg-muted/30' : 'bg-transparent')}`}"
);
code = code.replace(
    /className=\{\`min-w-0 self-stretch \$\{dividerClass\} flex flex-col justify-center \\\[&>div\\\]:w-full \\\[&_\.editor-type-item-title\\\]:text-center\`\}/,
    "className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full ${hasAssignedDate ? '[&_.editor-type-item-title]:text-center' : ''}`}"
);
fs.writeFileSync('features/editor/MainTable.tsx', code);
