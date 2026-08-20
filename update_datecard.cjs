const fs = require('fs');
let tableRowCode = fs.readFileSync('features/editor/TableRow.tsx', 'utf8');

tableRowCode = tableRowCode.replace(
    /export const DateCard: FC<\S+> = memo\(\(\{ dateStr, hasWarning \}\) => \{[\s\S]*?leading-none animate-in fade-in duration-200">/,
    `export const DateCard: FC<{ dateStr?: string; hasWarning?: boolean }> = memo(({ dateStr, hasWarning }) => {
  const parsed = parseDate(dateStr);
  if (!parsed) {
    return (
      <div className="flex min-h-[18px] w-full items-center justify-center py-1.5 select-none" aria-hidden />
    );
  }
  return (
    <div className="relative flex flex-col items-center justify-center select-none leading-none animate-in fade-in duration-200 scale-90 sm:scale-100">`
);

fs.writeFileSync('features/editor/TableRow.tsx', tableRowCode);

