import type { AdminMessage } from '../../types';
const formatDateTimeFr = (iso: string) => new Date(iso).toLocaleString('fr-FR');

export function AdminConversation({ messages, onReply }: { messages: AdminMessage[]; onReply: (message: AdminMessage) => void }) {
    if (!messages.length) return <section className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <h2 className="text-sm font-semibold">Aucune conversation</h2>
        <p className="mt-2 text-sm text-muted-foreground">Les demandes du compagnon et vos messages apparaîtront ici. Utilisez « Envoyer un message » pour contacter cet enseignant.</p>
    </section>;
    return <section className="space-y-3" aria-label="Conversation avec l’enseignant">
        {messages.map(message => <article key={message.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{message.sender === 'teacher' ? 'Enseignant · via le compagnon' : 'Direction'}</span>
                <time dateTime={message.createdAt}>{formatDateTimeFr(message.createdAt)}</time>
            </div>
            <h3 className="mt-2 text-sm font-semibold" dir="auto">{message.title}</h3>
            {message.className && <p className="mt-1 text-xs text-primary" dir="auto">{message.className}</p>}
            {message.replyTo && <p className="mt-1 text-xs text-muted-foreground">En réponse à : {messages.find(item => item.id === message.replyTo)?.title ?? 'un message précédent'}</p>}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm" dir="auto">{message.body}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{message.sender === 'teacher'
                    ? message.answeredAt ? 'Réponse envoyée' : 'À traiter'
                    : message.acknowledgedAt ? 'Lu par l’enseignant' : 'Lecture attendue'}</span>
                {message.sender === 'teacher' && <button type="button" onClick={() => onReply(message)} className="min-h-11 rounded-lg bg-primary/10 px-4 text-sm text-primary hover:bg-primary/15">Répondre</button>}
            </div>
        </article>)}
    </section>;
}
