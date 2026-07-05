import { useMemo } from 'react';
import { Indices, LessonsData } from '../types';
import { findItem } from '../utils/dataUtils';
import { TOP_LEVEL_TYPE_CONFIG } from '../constants';

export const useSelectionData = (selectedIndices: Indices[], lessonsData: LessonsData) => {
    return useMemo(() => {
        return selectedIndices.map(idx => {
            try {
                const { item } = findItem(lessonsData as any, idx);
                const itemType = (item as any)?.type;
                const isTopLevelEmbedded = typeof itemType === 'string' && TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(itemType);
                const isStandardContent = idx.itemIndex !== undefined && !idx.isSeparator && !isTopLevelEmbedded;
                return {
                    indices: idx,
                    item,
                    title: (item as any)?.title ?? (item as any)?.name ?? '',
                    date: (item as any)?.date ?? '',
                    description: (item as any)?.description ?? '',
                    canDate: !!item && !idx.isSeparator,
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
