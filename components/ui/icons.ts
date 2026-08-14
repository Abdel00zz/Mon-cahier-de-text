import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faPlus,
  faXmark,
  faCheck,
  faCheckDouble,
  faSquareCheck,
  faGear,
  faTrashCan,
  faCalendarDays,
  faCalendarWeek,
  faCalendarCheck,
  faCalendarPlus,
  faCalendarMinus,
  faCalendarXmark,
  faClock,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faArrowDown,
  faTriangleExclamation,
  faRotateLeft,
  faRotateRight,
  faFloppyDisk,
  faClockRotateLeft,
  faMagnifyingGlass,
  faChevronUp,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faEllipsisVertical,
  faFileImport,
  faFileLines,
  faFileArrowUp,
  faFileArrowDown,
  faFileSignature,
  faListCheck,
  faSitemap,
  faChartPie,
  faPrint,
  faBell,
  faBookOpen,
  faBook,
  faPencil,
  faSchool,
  faGraduationCap,
  faFlask,
  faGripLinesVertical,
  faGrip,
  faFolderOpen,
  faDownload,
  faCircleExclamation,
  faCircleCheck,
  faCircleXmark,
  faCircleQuestion,
  faCircleInfo,
  faLocationDot,
  faDiagramProject,
  faVial,
  faHouse,
  faSquareRootVariable,
  faEye,
  faEyeSlash,
  faDatabase,
  faUser,
  faSpinner,
  faUsers,
  faBars,
  faWandMagicSparkles,
  faShieldHalved,
  faRotate,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

export interface AppIconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
  strokeWidth?: number;
}

const createIcon = (definition: IconDefinition): React.FC<AppIconProps> => {
  const IconComponent: React.FC<AppIconProps> = ({
    size,
    strokeWidth: _strokeWidth,
    style,
    className,
    ...props
  }) => {
    const mergedStyle = size ? { width: size, height: size, ...style } : style;
    return React.createElement(FontAwesomeIcon, {
      icon: definition,
      fixedWidth: true,
      className,
      style: mergedStyle as React.CSSProperties & Record<`--fa-font-${string}`, string>,
      ...props,
    });
  };

  IconComponent.displayName = `Icon(${definition.iconName})`;
  return IconComponent;
};

export const Plus = createIcon(faPlus);
export const X = createIcon(faXmark);
export const Check = createIcon(faCheck);
export const CheckCheck = createIcon(faCheckDouble);
export const CheckSquare = createIcon(faSquareCheck);
export const Settings = createIcon(faGear);
export const Trash2 = createIcon(faTrashCan);
export const CalendarDays = createIcon(faCalendarDays);
export const CalendarRange = createIcon(faCalendarWeek);
export const CalendarCheck = createIcon(faCalendarCheck);
export const CalendarPlus = createIcon(faCalendarPlus);
export const CalendarMinus = createIcon(faCalendarMinus);
export const CalendarX = createIcon(faCalendarXmark);
export const Clock = createIcon(faClock);
export const ArrowLeft = createIcon(faArrowLeft);
export const ArrowRight = createIcon(faArrowRight);
export const ArrowUp = createIcon(faArrowUp);
export const ArrowDown = createIcon(faArrowDown);
export const TriangleAlert = createIcon(faTriangleExclamation);
export const Undo2 = createIcon(faRotateLeft);
export const Redo2 = createIcon(faRotateRight);
export const Save = createIcon(faFloppyDisk);
export const History = createIcon(faClockRotateLeft);
export const Search = createIcon(faMagnifyingGlass);
export const ChevronUp = createIcon(faChevronUp);
export const ChevronDown = createIcon(faChevronDown);
export const ChevronLeft = createIcon(faChevronLeft);
export const ChevronRight = createIcon(faChevronRight);
export const MoreVertical = createIcon(faEllipsisVertical);
export const FileInput = createIcon(faFileImport);
export const FileText = createIcon(faFileLines);
export const FileUp = createIcon(faFileArrowUp);
export const FileDown = createIcon(faFileArrowDown);
export const FileSignature = createIcon(faFileSignature);
export const ListChecks = createIcon(faListCheck);
export const ListTree = createIcon(faSitemap);
export const PieChart = createIcon(faChartPie);
export const Printer = createIcon(faPrint);
export const Bell = createIcon(faBell);
export const BookOpen = createIcon(faBookOpen);
export const Book = createIcon(faBook);
export const Pencil = createIcon(faPencil);
export const School = createIcon(faSchool);
export const GraduationCap = createIcon(faGraduationCap);
export const FlaskConical = createIcon(faFlask);
export const GripVertical = createIcon(faGripLinesVertical);
export const GripHorizontal = createIcon(faGrip);
export const FolderOpen = createIcon(faFolderOpen);
export const Download = createIcon(faDownload);
export const CircleAlert = createIcon(faCircleExclamation);
export const CircleCheck = createIcon(faCircleCheck);
export const CircleX = createIcon(faCircleXmark);
export const CircleHelp = createIcon(faCircleQuestion);
export const Info = createIcon(faCircleInfo);
export const MapPin = createIcon(faLocationDot);
export const Network = createIcon(faDiagramProject);
export const TestTube = createIcon(faVial);
export const Home = createIcon(faHouse);
export const Sigma = createIcon(faSquareRootVariable);
export const Eye = createIcon(faEye);
export const EyeOff = createIcon(faEyeSlash);
export const Database = createIcon(faDatabase);
export const User = createIcon(faUser);
export const Loader2 = createIcon(faSpinner);
export const Users = createIcon(faUsers);
export const Menu = createIcon(faBars);
export const Sparkles = createIcon(faWandMagicSparkles);
export const ShieldCheck = createIcon(faShieldHalved);
export const RefreshCw = createIcon(faRotate);
export const LogOut = createIcon(faRightFromBracket);
