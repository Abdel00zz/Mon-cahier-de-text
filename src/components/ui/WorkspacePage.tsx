import type { ComponentType, ReactNode } from 'react';
import './workspace-page.css';

interface WorkspacePageProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  tone?: 'green' | 'amber';
}

/** A document in the workspace, using the window's scroll and navigation. */
export function WorkspacePage({ title, icon: Icon, children, className = '', tone = 'green' }: WorkspacePageProps) {
  return <main className={`workspace-page ${className}`} data-page-tone={tone}>
    <header className="workspace-page__header">
      <span className="workspace-page__icon" aria-hidden="true"><Icon /></span>
      <h1>{title}</h1>
    </header>
    <div className="workspace-page__body">{children}</div>
  </main>;
}
