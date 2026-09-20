import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
  size?: number;
}

/**
 * Illustration 1 : Cahier de textes ouvert & Plume bienveillante (Empty State Éditeur)
 * Évoque la rigueur pédagogique, l'accueil chaleureux et le plaisir d'écrire sa première séance.
 */
export const NotebookOpeningIllustration: React.FC<IllustrationProps> = ({
  className,
  size = 140,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Halo d'ambiance doux (lueur chaude) */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-2 rounded-full bg-primary/15 dark:bg-primary/25 blur-xl pointer-events-none"
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="bookCover" x1="20" y1="30" x2="140" y2="135" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="pageGlow" x1="80" y1="40" x2="80" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F8FAFC" />
          </linearGradient>
          <linearGradient id="goldAccent" x1="100" y1="20" x2="135" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Couverture du carnet (reliure noble avec perspective douce) */}
        <path
          d="M24 116C36 112 60 110 80 115C100 110 124 112 136 116V42C124 38 100 36 80 41C60 36 36 38 24 42V116Z"
          fill="url(#bookCover)"
          className="stroke-primary/40"
          strokeWidth="1.5"
        />

        {/* Tranche et reliure centrale */}
        <path
          d="M80 41V115M80 41C76 38 60 38 30 43V117C60 112 76 112 80 115M80 41C84 38 100 38 130 43V117C100 112 84 112 80 115"
          stroke="hsl(var(--card))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Pages intérieures (Page gauche & droite) */}
        <path
          d="M30 46C55 42 70 43 77 45.5V113C70 110.5 55 109.5 30 113.5V46Z"
          fill="url(#pageGlow)"
          className="dark:fill-zinc-800"
        />
        <path
          d="M130 46C105 42 90 43 83 45.5V113C90 110.5 105 109.5 130 113.5V46Z"
          fill="url(#pageGlow)"
          className="dark:fill-zinc-800"
        />

        {/* Lignes d'écriture pédagogiques (Lignes de cours) */}
        <line x1="38" y1="58" x2="68" y2="56" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="68" x2="64" y2="66" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="78" x2="70" y2="76" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="88" x2="58" y2="86" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />

        <line x1="92" y1="56" x2="122" y2="58" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <line x1="92" y1="66" x2="118" y2="68" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <line x1="92" y1="76" x2="124" y2="78" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />

        {/* Marque-page ruban soyeux */}
        <path
          d="M78 41V88L83 82L88 88V41"
          fill="#EF4444"
          opacity="0.85"
        />

        {/* Plume d'écriture animée (mouvement de respiration/écriture douce) */}
        <motion.g
          animate={{
            x: [0, 2, 0],
            y: [0, -3, 0],
            rotate: [0, -2, 0],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Corps de la plume */}
          <path
            d="M128 22C118 24 102 36 96 52C94 57 95 62 98 65C101 68 106 69 111 67C127 61 139 45 141 35C141.5 32 140 30 138 28L128 22Z"
            fill="url(#goldAccent)"
          />
          <path
            d="M110 56L96 70L94 68L108 54"
            stroke="#B45309"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="94" cy="70" r="1.5" fill="#78350F" />
        </motion.g>

        {/* Étincelles de clarté / inspiration */}
        <motion.circle
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          cx="34"
          cy="34"
          r="2.5"
          fill="#F59E0B"
        />
        <motion.circle
          animate={{ scale: [1.2, 0.7, 1.2], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          cx="138"
          cy="86"
          r="2"
          fill="hsl(var(--primary))"
        />
      </svg>
    </motion.div>
  );
};

/**
 * Illustration 2 : Sérénité & Maîtrise Pédagogique (Empty State Pilotage / Tout est à jour)
 * Évoque le calme de l'enseignant dont tout le travail est accompli et synchronisé.
 */
export const SereneStudyIllustration: React.FC<IllustrationProps> = ({
  className,
  size = 130,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Halo doux émeraude/primaire */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-1 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 blur-xl pointer-events-none"
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="75" y1="22" x2="75" y2="128" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(var(--card))" />
            <stop offset="1" stopColor="hsl(var(--muted))" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="checkGrad" x1="50" y1="60" x2="100" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Cercle d'harmonie et d'accomplissement */}
        <motion.circle
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          cx="75"
          cy="75"
          r="54"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Écusson de conformité et de sérénité */}
        <path
          d="M75 30C95 30 114 36 114 56C114 90 92 114 75 124C58 114 36 90 36 56C36 36 55 30 75 30Z"
          fill="url(#shieldGrad)"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />

        {/* Couronne de laurier stylisée (symbole d'excellence et d'accomplissement) */}
        <path
          d="M52 64C50 72 52 82 58 89M98 64C100 72 98 82 92 89"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Coche de succès majestueuse et dynamique */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
          d="M56 75L69 88L96 61"
          stroke="url(#checkGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Petites étoiles de validation */}
        <motion.path
          animate={{ scale: [1, 1.25, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          d="M108 40L110 45L115 47L110 49L108 54L106 49L101 47L106 45L108 40Z"
          fill="#F59E0B"
        />
        <motion.path
          animate={{ scale: [1, 1.3, 1], rotate: [0, -15, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          d="M40 96L41.5 100L45.5 101.5L41.5 103L40 107L38.5 103L34.5 101.5L38.5 100L40 96Z"
          fill="#10B981"
          opacity="0.8"
        />
      </svg>
    </motion.div>
  );
};

/**
 * Illustration 3 : Bienvenue en classe (Empty State Tableau de bord sans classe)
 */
export const ClassroomWelcomeIllustration: React.FC<IllustrationProps> = ({
  className,
  size = 140,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-2 rounded-full bg-primary/20 blur-xl pointer-events-none"
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm"
      >
        <rect x="25" y="32" width="110" height="74" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <rect x="32" y="39" width="96" height="60" rx="6" fill="hsl(var(--muted))" fillOpacity="0.5" />

        {/* Chevalet / trépied pédagogique */}
        <path d="M42 106L30 138M118 106L130 138M80 106V142" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" />

        {/* Lignes de cours sur le tableau */}
        <motion.path
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          d="M44 54H86M44 66H104M44 78H72"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Badge d'accueil '+' chaleureux */}
        <motion.g
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx="114" cy="50" r="14" fill="hsl(var(--primary))" />
          <path d="M114 44V56M108 50H120" stroke="hsl(var(--primary-foreground))" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      </svg>
    </motion.div>
  );
};
