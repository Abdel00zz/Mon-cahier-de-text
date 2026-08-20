const fs = require('fs');
let code = fs.readFileSync('features/editor/MainTable.tsx', 'utf8');

const newCode = `const SessionGroupRow: React.FC<SessionGroupRowProps> = ({
    items,
    selectedKeys,
    newlyAddedIds,
    onCellUpdate,
    onToggleSelect,
    onDoubleClickEdit,
    showDescriptions,
    descriptionTypes = [],
    searchQuery,
    getDateWarnings,
}) => {
    const first = items[0];
    const isContentMerge = first.dateMerge?.mergeType === 'content';
    const sameRemark = items.every(item => getMergeableRemark(item) === getMergeableRemark(first));
    const groupIsSelected = items.some(item => selectedKeys.has(item.key));
    const sharedRemark = getMergeableRemark(first);

    const hasWarning = items.some(item => {
        const date = getMergeableDate(item) ?? '';
        const warnings = date && getDateWarnings ? getDateWarnings(date) : [];
        return warnings.length > 0;
    });

    const dividerClass = groupIsSelected
        ? 'border-e border-primary/45'
        : hasWarning
            ? 'border-e border-warning/45'
            : 'border-e border-border/90';

    const saveSharedRemark = (value: string) => {
        items.forEach(item => onCellUpdate(item.indices, 'remark', value));
    };
    
    const handleContentUpdate = (indices: Indices, field: string, value: any) => {
        if (isContentMerge) {
            items.forEach(item => onCellUpdate(item.indices, field, value));
        } else {
            onCellUpdate(indices, field, value);
        }
    };
    
    const isDatedSequenceStart = !!first.dateMerge?.isDatedSequenceStart;
    const isDatedSequenceEnd = !!first.dateMerge?.isDatedSequenceEnd;

    const topBorderClass = isDatedSequenceStart 
        ? (hasWarning ? 'border-t-[2px] border-warning/[0.7]' : 'border-t-[2px] border-foreground/30') 
        : (hasWarning ? 'border-t border-warning/[0.5]' : 'border-t border-border/70');
        
    const bottomBorderClass = isDatedSequenceEnd 
        ? (hasWarning ? 'border-b-[2px] border-warning/[0.7]' : 'border-b-[2px] border-foreground/30') 
        : (hasWarning ? 'border-b border-warning/[0.65]' : 'border-b border-border/70');

    return (
        <div
            className={[
                \`group relative grid \${TABLE_GRID_CLASS} \${topBorderClass} \${bottomBorderClass} transition-colors duration-200\`,
                hasWarning
                    ? 'border-warning/[0.5] bg-warning/[0.07]'
                    : 'bg-card/[0.18] dark:bg-slate-950/[0.14]',
                groupIsSelected ? 'bg-primary/[0.085]' : '',
            ].filter(Boolean).join(' ')}
        >
            <div className={\`flex min-h-[56px] min-w-0 \${isContentMerge ? 'flex-col gap-1' : ''} items-center justify-center self-stretch px-1.5 py-1 \${dividerClass} \${hasWarning ? 'bg-warning/10' : 'bg-card/[0.32] dark:bg-slate-950/[0.25]'}\`}>
                {isContentMerge ? items.map((item, i) => {
                    const d = getMergeableDate(item) ?? '';
                    const w = d && getDateWarnings ? getDateWarnings(d) : [];
                    return (
                        <React.Fragment key={item.key}>
                            <DateCard dateStr={d} hasWarning={w.length > 0} />
                            {i < items.length - 1 && <span className="text-[10px] text-muted-foreground my-0.5 font-bold uppercase">et</span>}
                        </React.Fragment>
                    );
                }) : (
                    <DateCard dateStr={getMergeableDate(first) ?? ''} hasWarning={hasWarning} />
                )}
            </div>

            <div className={\`min-w-0 self-stretch \${dividerClass}\`}>
                {isContentMerge ? (
                    <TableRow
                        key={first.key}
                        data={first.data}
                        indices={first.indices}
                        elementType={first.elementType}
                        dateMerge={{...first.dateMerge, mergeType: 'content'}}
                        lineClassOverride=""
                        layout="content-only"
                        onCellUpdate={handleContentUpdate}
                        onToggleSelect={onToggleSelect}
                        onDoubleClickEdit={onDoubleClickEdit}
                        isSelected={groupIsSelected}
                        isNew={false}
                        showDescriptions={showDescriptions}
                        descriptionTypes={descriptionTypes}
                        searchQuery={searchQuery}
                        getDateWarnings={getDateWarnings}
                    />
                ) : items.map((item, i) => {
                    const isSelected = selectedKeys.has(item.key);
                    const isNew = !!((item.data as any)._tempId && newlyAddedIds.includes((item.data as any)._tempId));
                    return (
                        <TableRow
                            key={item.key}
                            data={item.data}
                            indices={item.indices}
                            elementType={item.elementType}
                            dateMerge={item.dateMerge}
                            lineClassOverride={i > 0 ? 'border-t border-border/70' : ''}
                            layout="content-only"
                            onCellUpdate={handleContentUpdate}
                            onToggleSelect={onToggleSelect}
                            onDoubleClickEdit={onDoubleClickEdit}
                            isSelected={isSelected}
                            isNew={isNew}
                            showDescriptions={showDescriptions}
                            descriptionTypes={descriptionTypes}
                            searchQuery={searchQuery}
                            getDateWarnings={getDateWarnings}
                        />
                    );
                })}
            </div>

            <div className={\`hidden min-w-0 self-stretch p-1 md:flex \${hasWarning ? 'bg-warning/[0.055]' : 'bg-card/[0.28] dark:bg-slate-950/[0.18]'}\`} onClick={event => event.stopPropagation()}>
                {sameRemark ? (
                    <div className="flex min-h-full w-full flex-col justify-center">
                        <EditableCell
                            value={sharedRemark}
                            onSave={saveSharedRemark}
                            placeholder="editor.addRemark"
                            className="text-xs text-muted-foreground w-full h-full min-h-[32px]"
                            align="center"
                            searchQuery={searchQuery}
                        />
                    </div>
                ) : (
                    <div className="flex h-full w-full flex-col">
                        {items.map((item, i) => (
                            <div key={item.key} className={\`flex-1 \${i > 0 ? 'border-t border-border/70' : ''}\`}>
                                <EditableCell
                                    value={getMergeableRemark(item)}
                                    onSave={(val) => onCellUpdate(item.indices, 'remark', val)}
                                    placeholder="editor.addRemark"
                                    className="text-xs text-muted-foreground w-full h-full min-h-[32px]"
                                    align="center"
                                    searchQuery={searchQuery}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};`;

const targetRegex = /const SessionGroupRow: React\.FC<SessionGroupRowProps> = \(\{[\s\S]*?\}\) \=\> \{[\s\S]*?return \([\s\S]*?\<\/\div\>\n    \);\n\};/m;
code = code.replace(targetRegex, newCode);
fs.writeFileSync('features/editor/MainTable.tsx', code);
