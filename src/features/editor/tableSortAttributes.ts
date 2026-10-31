import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import type { FlatDataItem } from '@/domain/notebook/tableRows';
import { isRootCapableContent, isTransferableContent } from '@/domain/notebook/contentReorder';

const sortLabel = ({ data }: FlatDataItem) => ('title' in data && data.title) || ('name' in data ? data.name : undefined);
export const sortAttributes = (item: FlatDataItem, id: string) => ({
  'data-editor-sort-row': true,
  'data-editor-sort-key': item.key,
  'data-editor-sort-id': id,
  'data-editor-sort-transfer': isTransferableContent(item.data) || undefined,
  'data-editor-sort-root': isRootCapableContent(item.data) || undefined,
  'data-editor-sort-container': ['chapter', 'section', 'subsection', 'subsubsection'].includes(item.elementType) || undefined,
  'data-editor-sort-chapter': item.elementType === 'chapter' || undefined,
  'data-editor-sort-label': sortLabel(item),
  'data-editor-sort-detail': typeof item.data.date === 'string' ? formatDateDDMMYYYY(item.data.date) ?? item.data.date : undefined,
});

