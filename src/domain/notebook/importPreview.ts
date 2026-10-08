import { parseBoundedJson } from './jsonInput.js';
import { prepareImportedLessons } from './importPipeline.js';

/** Inspect with the same normalizer as the editor, without writing any data. */
export function inspectNotebookImport(text: string) {
    const parsed: unknown = parseBoundedJson(text);
    const { report } = prepareImportedLessons(parsed);
    const envelope = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown> : {};
    return {
        parsed,
        format: typeof envelope.format === 'string' ? envelope.format : 'JSON',
        version: typeof envelope.version === 'number' || typeof envelope.version === 'string' ? envelope.version : undefined,
        date: typeof envelope.exportedAt === 'string' ? envelope.exportedAt : null,
        blocks: report.topLevelCount,
    };
}
