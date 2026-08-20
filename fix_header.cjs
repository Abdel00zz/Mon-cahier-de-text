const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');

code = code.replace(
    /className="hidden border-b border-border\/80 bg-card\/\[0.52\] backdrop-blur-xl dark:bg-slate-950\/\[0.42\] md:block"/,
    'className="border-b border-border/80 bg-card/[0.52] backdrop-blur-xl dark:bg-slate-950/[0.42]"'
);

fs.writeFileSync('features/editor/MainTable.tsx', code);
