import { useMemo, useDeferredValue } from 'react';
import { LessonsData } from '../types';

export const useLessonSearch = (lessonsData: LessonsData, searchQuery: string) => {
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const filteredData = useMemo(() => {
        if (!deferredSearchQuery) return lessonsData;
        const query = deferredSearchQuery.toLowerCase();

        const matchNode = (item: any): boolean => {
            if (!item) return false;
            const fieldsToSearch = [
                item.title,
                item.description,
                item.remark,
                item.number,
                item.page,
                item.name,
                item.content,
                item.date
            ];
            return fieldsToSearch.some(field => 
                typeof field === 'string' && field.toLowerCase().includes(query)
            );
        };

        const filterRecursively = (items: any[]): any[] => {
            return items.reduce((acc: any[], item: any) => {
                let children: any = {};

                if (item.sections) children.sections = filterRecursively(item.sections);
                if (item.subsections) children.subsections = filterRecursively(item.subsections);
                if (item.subsubsections) children.subsubsections = filterRecursively(item.subsubsections);
                if (item.items) children.items = filterRecursively(item.items);

                const hasVisibleChildren = Object.values(children).some((arr: any) => arr.length > 0);

                if (matchNode(item) || hasVisibleChildren) {
                    acc.push({ ...item, ...children });
                }
                return acc;
            }, []);
        };
        return filterRecursively(lessonsData);
    }, [deferredSearchQuery, lessonsData]);

    return filteredData;
};
