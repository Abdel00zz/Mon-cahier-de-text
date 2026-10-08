import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type { ClassInfo, ClassRoster } from '../../types';
import { parseStudentNames } from '../../domain/evaluations/studentRoster';
import { textDirectionAttribute } from '../../lib/text/textDirection';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { saveClassRoster } from '../api';

export function ClassRosterModal({ phone, classInfo, roster, onClose, onPublished }: {
    phone: string; classInfo: ClassInfo; roster?: ClassRoster; onClose: () => void; onPublished: (roster: ClassRoster) => void;
}) {
    const [draft, setDraft] = useState(roster?.names.join(' ; ') ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const parsed = useMemo(() => {
        try { return { names: parseStudentNames(draft), error: '' }; }
        catch (failure) { return { names: [], error: failure instanceof Error ? failure.message : 'Liste invalide.' }; }
    }, [draft]);
    const publish = async () => {
        if (parsed.error || busy) return;
        setBusy(true); setError('');
        try { const result = await saveClassRoster(phone, classInfo.id, parsed.names, roster?.version ?? 0); onPublished(result.roster); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Transmission impossible.'); }
        finally { setBusy(false); }
    };
    return <Modal isOpen dir="ltr" onClose={() => { if (!busy) onClose(); }} maxWidth="xl" title={<span className="flex items-center gap-2"><Users className="h-5 w-5"/>Liste des élèves · <bdi>{classInfo.name}</bdi></span>}>
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">La liste sera disponible dans cette classe pour le contrôle des cahiers et l’évaluation orale.</p>
            <label className="block space-y-2"><span className="text-sm font-semibold">Noms complets séparés par un point-virgule</span>
                <textarea value={draft} onChange={event => { setDraft(event.target.value); setError(''); }} disabled={busy} rows={7} dir="auto"
                    spellCheck={false} aria-describedby="class-roster-format" placeholder="Ahmed Alami ; Sara Fassi ; أحمد العلوي ؛ سلمى الفاسي" className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"/>
            </label>
            <p id="class-roster-format" className="text-xs text-muted-foreground">Nom Prénom ; Nom Prénom — les séparateurs ; et ؛ sont reconnus. Les espaces du nom complet sont conservés.</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{parsed.names.length} / 200 élèves · doublons retirés</span>
                {roster && <span>Liste publiée · version {roster.version}</span>}</div>
            {parsed.names.length > 0 && <ol className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2" aria-label="Aperçu de la liste">
                {parsed.names.map((name, index) => <li key={name} className="flex min-w-0 items-center gap-2 text-sm"><span className="text-xs text-muted-foreground">{index + 1}.</span><span dir={textDirectionAttribute(name)} className="break-words">{name}</span></li>)}
            </ol>}
            {(error || parsed.error) && <p role="alert" className="text-sm text-destructive">{error || parsed.error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={onClose} disabled={busy}>Annuler</Button>
                <Button onClick={() => void publish()} disabled={busy || !!parsed.error}>{busy ? 'Transmission…' : 'Transmettre au professeur'}</Button>
            </div>
        </div>
    </Modal>;
}
