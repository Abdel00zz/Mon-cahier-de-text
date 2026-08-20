const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');

const newCode = `const getMergeableContent = (item: FlatDataItem): string | null => {
    if (item.elementType === 'separator') return null;
    const data = item.data as any;
    if (!data.type && !data.title) return null;
    if (!getMergeableDate(item)) return null; // le fusionnement s'active qu'apres la saisie de la date
    return JSON.stringify({ type: data.type, number: data.number, title: data.title, description: data.description });
};

const applyDateMerges = (items: FlatDataItem[]): FlatDataItem[] => {
    let start = 0;
    while (start < items.length) {
        const date = getMergeableDate(items[start]);
        const content = getMergeableContent(items[start]);
        
        const isDatedSequenceStart = date && (start === 0 || !getMergeableDate(items[start - 1]));
        
        if (!date && !content) {
            start += 1;
            continue;
        }

        let endDate = start + 1;
        if (date) {
            while (endDate < items.length && getMergeableDate(items[endDate]) === date) {
                endDate += 1;
            }
        }

        let endContent = start + 1;
        if (content) {
            while (endContent < items.length && getMergeableContent(items[endContent]) === content) {
                endContent += 1;
            }
        }
        
        let end = start + 1;
        let mergeType: 'date' | 'content' = 'date';
        
        if (endContent > endDate) {
            end = endContent;
            mergeType = 'content';
        } else if (endDate > start + 1) {
            end = endDate;
            mergeType = 'date';
        } else {
            const isDatedSequenceEnd = start === items.length - 1 || !getMergeableDate(items[start + 1]);
            items[start].dateMerge = {
                isMerged: false,
                mergeType: 'date',
                isStart: true,
                isContinuation: false,
                isEnd: true,
                count: 1,
                indexInGroup: 0,
                isDatedSequenceStart: !!isDatedSequenceStart,
                isDatedSequenceEnd: !!isDatedSequenceEnd
            };
            start += 1;
            continue;
        }

        const count = end - start;
        const group = items.slice(start, end);
        const firstRemark = getMergeableRemark(group[0]);
        const shouldMergeRemark = count > 1 && group.every(item => getMergeableRemark(item) === firstRemark);
        
        const isDatedSequenceEnd = end === items.length || !getMergeableDate(items[end]);

        for (let index = start; index < end; index += 1) {
            items[index].dateMerge = {
                isMerged: count > 1,
                mergeType,
                isStart: index === start,
                isContinuation: index !== start,
                isEnd: index === end - 1,
                count,
                indexInGroup: index - start,
                shouldMergeRemark,
                isDatedSequenceStart: !!isDatedSequenceStart && index === start,
                isDatedSequenceEnd: !!isDatedSequenceEnd && index === end - 1
            };
        }
        start = end;
    }
    return items;
};`;

const targetRegex = /const applyDateMerges = \(items: FlatDataItem\[\]\): FlatDataItem\[\] => \{[\s\S]*?return items;\n\};\n/m;
code = code.replace(targetRegex, newCode + '\n');
fs.writeFileSync('features/editor/MainTable.tsx', code);
