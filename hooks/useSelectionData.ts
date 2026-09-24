import { useMemo } from 'react';
import { Indices, LessonsData } from '../types';
import { findItem } from '../utils/dataUtils';

export const useSelectionData = (selectedIndices: Indices[], lessonsData: LessonsData) => {
    return useMemo(() => {
        return selectedIndices.map(idx => {
            try {
                const { item } = findItem(lessonsData as any, idx);
                return {
                    indices: idx,
                    item,
                    title: (item as any)?.title ?? (item as any)?.name ?? '',
                    date: (item as any)?.date ?? '',
                    description: (item as any)?.description ?? '',
                    canDate: !!item,
                };
            } catch {
                return {
                    indices: idx,
                    item: null,
                    title: 'Element',
                    date: '',
                    description: '',
                    canDate: false,
                };
            }
        });
    }, [selectedIndices, lessonsData]);
};
