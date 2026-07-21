const CLASS_ACCENTS = [
    'hsl(var(--chart-5))',
    'hsl(var(--chart-4))',
    'hsl(var(--success))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
] as const;

export function classColor(stableId: string): string {
    let hash = 0;
    for (let index = 0; index < stableId.length; index += 1) {
        hash = (hash * 31 + stableId.charCodeAt(index)) | 0;
    }
    return CLASS_ACCENTS[Math.abs(hash) % CLASS_ACCENTS.length];
}
