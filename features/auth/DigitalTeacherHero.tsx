import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Search,
  Pencil,
  FileText,
  ListChecks,
  GraduationCap,
  School,
  FlaskConical,
  Bell,
  CircleCheck,
} from '@/components/ui/icons';
import teacherImage from '@/src/assets/images/antique_teacher_desk_1786526855363.jpg';

interface DigitalTeacherHeroProps {
  isRtl?: boolean;
  title?: string;
  subtitle?: string;
  bgImage?: string;
}

export const DigitalTeacherHero: React.FC<DigitalTeacherHeroProps> = ({
  isRtl = true,
  title = 'دفتر نصوصي الرقمي',
  subtitle,
  bgImage = teacherImage,
}) => {
  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-center shadow-xl border border-slate-200/50 flex flex-col items-center justify-center group">
      
      {/* Real Background Image with Gradient Overlay for perfect contrast and harmony */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-style scale-105 transition-transform duration-1000 group-hover:scale-100"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* Decorative ambient lighting */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Canvas with Floating Real Icons */}
      <div className="relative z-10 w-full max-w-[340px] h-[250px] sm:h-[280px] mx-auto flex items-end justify-center">
        
        {/* FLOATING REAL ICON 1: Top-Left Blue Chat & Timer */}
        <motion.div 
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-2 left-2 sm:left-4 z-20 flex items-center justify-center"
        >
          <div className="relative bg-blue-600/90 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/30 backdrop-blur-md border border-blue-400/30">
            <Clock className="w-5 h-5 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white/80 shadow-xs">
              <ListChecks className="w-3 h-3" />
            </div>
          </div>
        </motion.div>

        {/* FLOATING REAL ICON 2: Top-Right Amber Magnifier */}
        <motion.div 
          animate={{ y: [0, -9, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-1 right-12 sm:right-16 z-20"
        >
          <div className="relative text-amber-300 p-2.5 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-amber-500/30">
            <Search className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 text-amber-300 text-xs animate-pulse">✦</span>
          </div>
        </motion.div>

        {/* FLOATING REAL ICON 3: Top-Far-Right Red Pen */}
        <motion.div 
          animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-10 right-2 sm:right-4 z-20"
        >
          <div className="relative bg-rose-600/90 text-white p-2.5 rounded-2xl shadow-lg shadow-rose-600/30 backdrop-blur-md border border-rose-400/30 rotate-12">
            <Pencil className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -left-1 text-rose-200 text-xs">✦</span>
          </div>
        </motion.div>

        {/* FLOATING REAL ICON 4: Middle-Left Document */}
        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute top-24 left-1 sm:left-2 z-20"
        >
          <div className="relative bg-indigo-600/90 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 backdrop-blur-md border border-indigo-400/30">
            <FileText className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 text-indigo-200 text-xs">✦</span>
          </div>
        </motion.div>

        {/* FLOATING REAL ICON 5: Middle-Right Green Graduation Cap */}
        <motion.div 
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute top-24 right-2 sm:right-3 z-20"
        >
          <div className="bg-emerald-600/90 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-600/30 backdrop-blur-md border border-emerald-400/30">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        </motion.div>

        {/* FLOATING REAL ICON 6: Bottom-Right Yellow Lightbulb */}
        <motion.div 
          animate={{ y: [0, -8, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          className="absolute bottom-8 right-6 sm:right-8 z-20"
        >
          <div className="relative text-amber-400 p-2.5 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-amber-400/30">
            <Bell className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 text-amber-300 text-xs animate-ping">✦</span>
          </div>
        </motion.div>

        {/* VECTOR CHARACTER SVG: Harmonious Styled Teacher in Green Coat */}
        <svg 
          viewBox="0 0 300 240" 
          className="w-full h-auto max-h-[200px] sm:max-h-[220px] drop-shadow-2xl z-10"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head & Neck */}
          <path d="M150 160 C135 160 132 180 132 195 L168 195 C168 180 165 160 150 160 Z" fill="#f0a282" />
          
          {/* Face */}
          <ellipse cx="150" cy="120" rx="36" ry="42" fill="#f0a282" />
          
          {/* Ears */}
          <ellipse cx="112" cy="122" rx="6" ry="9" fill="#e89574" />
          <ellipse cx="188" cy="122" rx="6" ry="9" fill="#e89574" />

          {/* Hair */}
          <path d="M114 110 C114 75 186 75 186 110 C186 90 175 78 150 78 C125 78 114 90 114 110 Z" fill="#1f2937" />
          <path d="M120 90 C130 82 170 82 180 90 C175 80 160 76 150 76 C140 76 125 80 120 90 Z" fill="#111827" />

          {/* Eyebrows */}
          <path d="M130 102 Q138 98 144 102" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M156 102 Q162 98 170 102" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />

          {/* Eyes */}
          <circle cx="137" cy="112" r="3.5" fill="#1f2937" />
          <circle cx="163" cy="112" r="3.5" fill="#1f2937" />

          {/* Glasses */}
          <circle cx="137" cy="112" r="12" stroke="#374151" strokeWidth="2" fill="none" />
          <circle cx="163" cy="112" r="12" stroke="#374151" strokeWidth="2" fill="none" />
          <line x1="149" y1="112" x2="151" y2="112" stroke="#374151" strokeWidth="2" />
          <line x1="118" y1="110" x2="125" y2="110" stroke="#374151" strokeWidth="1.8" />
          <line x1="175" y1="110" x2="182" y2="110" stroke="#374151" strokeWidth="1.8" />

          {/* Nose */}
          <path d="M149 120 C151 126 147 128 150 130" stroke="#d97757" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Smile Mouth */}
          <path d="M140 138 Q150 148 160 138" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* White Shirt / Collar */}
          <path d="M125 185 L150 215 L175 185 L175 240 L125 240 Z" fill="#ffffff" />

          {/* Green Coat / Jacket */}
          <path d="M75 240 C80 190 125 185 130 185 L145 240 Z" fill="#10b981" />
          <path d="M225 240 C220 190 175 185 170 185 L155 240 Z" fill="#10b981" />
          
          {/* Jacket Lapels */}
          <path d="M125 185 L142 220 L130 240 H70 C70 215 100 190 125 185 Z" fill="#059669" />
          <path d="M175 185 L158 220 L170 240 H230 C230 215 200 190 175 185 Z" fill="#059669" />
        </svg>

      </div>
    </div>
  );
};
