import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowDown,
  faArrowLeft,
  faArrowUp,
  faBell,
  faBook,
  faBookOpen,
  faCalendarCheck,
  faCalendarDays,
  faCalendarMinus,
  faCalendarPlus,
  faCalendarWeek,
  faCalendarXmark,
  faChartPie,
  faCheck,
  faCheckDouble,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faCircleQuestion,
  faCircleXmark,
  faClock,
  faClockRotateLeft,
  faDatabase,
  faDiagramProject,
  faDownload,
  faEllipsisVertical,
  faEye,
  faEyeSlash,
  faFileArrowDown,
  faFileArrowUp,
  faFileImport,
  faFileLines,
  faFileSignature,
  faFlask,
  faFloppyDisk,
  faFolderOpen,
  faGear,
  faGraduationCap,
  faGrip,
  faGripLinesVertical,
  faHouse,
  faListCheck,
  faLocationDot,
  faMagnifyingGlass,
  faPencil,
  faPlus,
  faPrint,
  faRotateLeft,
  faRotateRight,
  faSchool,
  faSitemap,
  faSpinner,
  faSquareCheck,
  faSquareRootVariable,
  faTrashCan,
  faTriangleExclamation,
  faUser,
  faUsers,
  faVial,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Adaptateur unique Font Awesome 7.
 * Les imports restent nommes et tree-shaken ; l'API historique des composants
 * (`className`, `size`, `strokeWidth`) reste compatible avec toute l'application.
 */
export interface AppIconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
  /** Compatibilite avec les anciens appels Lucide ; sans effet sur une icone pleine. */
  strokeWidth?: number;
}

const icon = (definition: IconDefinition): React.FC<AppIconProps> => {
  const AppIcon: React.FC<AppIconProps> = ({ size, strokeWidth: _strokeWidth, style, ...props }) =>
    React.createElement(FontAwesomeIcon, {
      icon: definition,
      fixedWidth: true,
      style: (size ? { width: size, height: size, ...style } : style) as React.ComponentProps<typeof FontAwesomeIcon>['style'],
      ...props,
    });
  return AppIcon;
};

export const Plus = icon(faPlus);
export const X = icon(faXmark);
export const Check = icon(faCheck);
export const CheckCheck = icon(faCheckDouble);
export const CheckSquare = icon(faSquareCheck);
export const Settings = icon(faGear);
export const Trash2 = icon(faTrashCan);
export const CalendarDays = icon(faCalendarDays);
export const CalendarRange = icon(faCalendarWeek);
export const CalendarCheck = icon(faCalendarCheck);
export const CalendarPlus = icon(faCalendarPlus);
export const CalendarMinus = icon(faCalendarMinus);
export const CalendarX = icon(faCalendarXmark);
export const Clock = icon(faClock);
export const ArrowLeft = icon(faArrowLeft);
export const ArrowUp = icon(faArrowUp);
export const ArrowDown = icon(faArrowDown);
export const TriangleAlert = icon(faTriangleExclamation);
export const Undo2 = icon(faRotateLeft);
export const Redo2 = icon(faRotateRight);
export const Save = icon(faFloppyDisk);
export const History = icon(faClockRotateLeft);
export const Search = icon(faMagnifyingGlass);
export const ChevronUp = icon(faChevronUp);
export const ChevronDown = icon(faChevronDown);
export const ChevronRight = icon(faChevronRight);
export const MoreVertical = icon(faEllipsisVertical);
export const FileInput = icon(faFileImport);
export const FileText = icon(faFileLines);
export const FileUp = icon(faFileArrowUp);
export const FileDown = icon(faFileArrowDown);
export const FileSignature = icon(faFileSignature);
export const ListChecks = icon(faListCheck);
export const ListTree = icon(faSitemap);
export const PieChart = icon(faChartPie);
export const Printer = icon(faPrint);
export const Bell = icon(faBell);
export const BookOpen = icon(faBookOpen);
export const Book = icon(faBook);
export const Pencil = icon(faPencil);
export const School = icon(faSchool);
export const GraduationCap = icon(faGraduationCap);
export const FlaskConical = icon(faFlask);
export const GripVertical = icon(faGripLinesVertical);
export const GripHorizontal = icon(faGrip);
export const FolderOpen = icon(faFolderOpen);
export const Download = icon(faDownload);
export const CircleAlert = icon(faCircleExclamation);
export const CircleCheck = icon(faCircleCheck);
export const CircleX = icon(faCircleXmark);
export const CircleHelp = icon(faCircleQuestion);
export const Info = icon(faCircleInfo);
export const MapPin = icon(faLocationDot);
export const Network = icon(faDiagramProject);
export const TestTube = icon(faVial);
export const Home = icon(faHouse);
export const Sigma = icon(faSquareRootVariable);
export const Eye = icon(faEye);
export const EyeOff = icon(faEyeSlash);
export const Database = icon(faDatabase);
export const User = icon(faUser);
export const Loader2 = icon(faSpinner);
export const Users = icon(faUsers);
