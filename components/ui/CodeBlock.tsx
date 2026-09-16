import * as React from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  prefix?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'bash',
  title,
  showLineNumbers = false,
  prefix = '$',
  className = '',
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div
      className={`group relative rounded-xl border border-slate-800 bg-[#0a0a0b] text-slate-100 shadow-sm overflow-hidden font-mono text-xs ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-3.5 py-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[11px] font-medium tracking-wide text-slate-300">
            {title || language}
          </span>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copier le code"
          className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Code contents */}
      <div className="p-3.5 overflow-x-auto selection:bg-indigo-500/30 selection:text-indigo-200">
        <pre className="m-0 leading-relaxed">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                {showLineNumbers && (
                  <span className="table-cell pr-3 text-slate-600 select-none text-right w-6">
                    {idx + 1}
                  </span>
                )}
                {prefix && !showLineNumbers && (
                  <span className="table-cell pr-2 text-indigo-400/80 select-none">
                    {prefix}
                  </span>
                )}
                <span className="table-cell">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
