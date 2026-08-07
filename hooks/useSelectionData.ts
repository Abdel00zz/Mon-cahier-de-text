import { useMemo } from 'react';
import { Indices, LessonsData } from '../types';
import { findItem } from '../utils/dataUtils';

export const useSelectionData = (selectedIndices: Indices[], lessonsData: LessonsData) => {
    return useMemo(() => {
        return selectedIndices.map(idx => {
            try {
                const { item } = findItem(lessonsData as any, idx);
                const isRealRow = !!item && !idx.isSeparator;
                const isStandardContent = idx.itemIndex !== undefined && isRealRow;
                return {
                    indices: idx,
                    item,
                    title: (item as any)?.title ?? (item as any)?.name ?? '',
                    date: (item as any)?.date ?? '',
                    description: (item as any)?.description ?? '',
                    canDate: isRealRow,
                    canDescription: !!item && isStandardContent,
                    canInlineEdit: !!item && isStandardContent,
                    canAddAfter: !!item && !idx.isSeparator,
                };
            } catch {
                return {
                    indices: idx,
                    item: null,
                    title: 'Element',
                    date: '',
                    description: '',
                    canDate: false,
                    canDescription: false,
                    canInlineEdit: false,
                    canAddAfter: false,
                };
            }
        });
    }, [selectedIndices, lessonsData]);
};
