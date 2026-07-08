import * as React from "react"
import { MathJax } from "better-react-mathjax"

/**
 * Détection rapide de syntaxe LaTeX ($…$, $$…$$, \(…\), \[…\], \begin{…}).
 * Évite de monter MathJax (coûteux) sur du texte ordinaire.
 */
export const hasMathSyntax = (value: unknown): boolean => {
  if (!value || typeof value !== "string") return false
  return /\$\$?[^$]+\$\$?|\\\(|\\\[|\\begin\{/.test(value)
}

interface MathTextProps {
  /** texte source à inspecter (souvent identique au children rendu) */
  source: unknown
  /** clé de cache : force un re-typeset quand le contenu change */
  cacheKey?: string
  inline?: boolean
  children: React.ReactNode
}

/**
 * Enveloppe MathJax conditionnelle — rend le LaTeX partout où du contenu
 * de cours s'affiche (tableaux, modales, barres), sans coût quand il n'y
 * en a pas.
 */
export const MathText: React.FC<MathTextProps> = ({ source, cacheKey, inline, children }) => {
  if (!hasMathSyntax(source)) return <>{children}</>
  return (
    <MathJax inline={inline} hideUntilTypeset="first" key={cacheKey}>
      {children}
    </MathJax>
  )
}
