const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');
const searchStr = "className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full [&_.editor-type-item-title]:text-center`}";
const replacementStr = "className={`min-w-0 self-stretch ${dividerClass} flex flex-col justify-center [&>div]:w-full ${hasAssignedDate ? '[&_.editor-type-item-title]:text-center' : ''}`}";
if(code.includes(searchStr)) {
    code = code.replace(searchStr, replacementStr);
    fs.writeFileSync('features/editor/MainTable.tsx', code);
    console.log("Success");
} else {
    console.log("Not found");
}
