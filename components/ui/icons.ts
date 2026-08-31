import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Cloud as LucideCloud,
  PenLine as LucidePenLine,
  LockKeyhole as LucideLockKeyhole,
  Plus as LucidePlus,
  X as LucideX,
  Check as LucideCheck,
  CheckCheck as LucideCheckCheck,
  CheckSquare as LucideCheckSquare,
  Settings as LucideSettings,
  Trash2 as LucideTrash2,
  CalendarDays as LucideCalendarDays,
  CalendarRange as LucideCalendarRange,
  CalendarCheck as LucideCalendarCheck,
  CalendarPlus as LucideCalendarPlus,
  CalendarMinus as LucideCalendarMinus,
  CalendarX as LucideCalendarX,
  Clock as LucideClock,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  ArrowDown as LucideArrowDown,
  AlertTriangle as LucideAlertTriangle,
  RotateCcw as LucideUndo2,
  RotateCw as LucideRedo2,
  Save as LucideSave,
  History as LucideHistory,
  Search as LucideSearch,
  ChevronUp as LucideChevronUp,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  MoreVertical as LucideMoreVertical,
  FileInput as LucideFileInput,
  FileText as LucideFileText,
  FileUp as LucideFileUp,
  FileDown as LucideFileDown,
  FileSignature as LucideFileSignature,
  ListChecks as LucideListChecks,
  Network as LucideListTree,
  PieChart as LucidePieChart,
  Printer as LucidePrinter,
  Bell as LucideBell,
  BookOpen as LucideBookOpen,
  Book as LucideBook,
  Pencil as LucidePencil,
  School as LucideSchool,
  GraduationCap as LucideGraduationCap,
  FlaskConical as LucideFlaskConical,
  GripHorizontal as LucideGripHorizontal,
  FolderOpen as LucideFolderOpen,
  Download as LucideDownload,
  AlertCircle as LucideCircleAlert,
  CheckCircle2 as LucideCircleCheck,
  XCircle as LucideCircleX,
  HelpCircle as LucideCircleHelp,
  Info as LucideInfo,
  MapPin as LucideMapPin,
  GitFork as LucideNetwork,
  TestTube as LucideTestTube,
  Home as LucideHome,
  Sigma as LucideSigma,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  Database as LucideDatabase,
  User as LucideUser,
  Loader2 as LucideLoader2,
  Users as LucideUsers,
  Menu as LucideMenu,
  ShieldCheck as LucideShieldCheck,
  RefreshCw as LucideRefreshCw,
  LogOut as LucideLogOut,
  Award,
  Layers as LucideLayers,
  Palette as LucidePalette,
  Bold as LucideBold,
  Braces as LucideBraces,
  Italic as LucideItalic,
  List as LucideList,
  ListOrdered as LucideListOrdered,
  Underline as LucideUnderline,
} from 'lucide-react';

export interface AppIconProps extends LucideProps {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

const createIcon = (LucideComponent: React.ComponentType<LucideProps>): React.FC<AppIconProps> => {
  const IconComponent: React.FC<AppIconProps> = ({
    size = 18,
    strokeWidth = 2,
    className = '',
    ...props
  }) => {
    return React.createElement(LucideComponent, {
      size,
      strokeWidth,
      className,
      ...props,
    });
  };

  IconComponent.displayName = `Icon(${LucideComponent.displayName || 'LucideIcon'})`;
  return IconComponent;
};

export const Plus = createIcon(LucidePlus);
export const X = createIcon(LucideX);
export const Check = createIcon(LucideCheck);
export const CheckCheck = createIcon(LucideCheckCheck);
export const CheckSquare = createIcon(LucideCheckSquare);
export const Settings = createIcon(LucideSettings);
export const Trash2 = createIcon(LucideTrash2);
export const CalendarDays = createIcon(LucideCalendarDays);
export const CalendarRange = createIcon(LucideCalendarRange);
export const CalendarCheck = createIcon(LucideCalendarCheck);
export const CalendarPlus = createIcon(LucideCalendarPlus);
export const CalendarMinus = createIcon(LucideCalendarMinus);
export const CalendarX = createIcon(LucideCalendarX);
export const Clock = createIcon(LucideClock);
export const ArrowLeft = createIcon(LucideArrowLeft);
export const ArrowRight = createIcon(LucideArrowRight);
export const ArrowUp = createIcon(LucideArrowUp);
export const ArrowDown = createIcon(LucideArrowDown);
export const TriangleAlert = createIcon(LucideAlertTriangle);
export const Undo2 = createIcon(LucideUndo2);
export const Redo2 = createIcon(LucideRedo2);
export const Save = createIcon(LucideSave);
export const History = createIcon(LucideHistory);
export const Search = createIcon(LucideSearch);
export const ChevronUp = createIcon(LucideChevronUp);
export const ChevronDown = createIcon(LucideChevronDown);
export const ChevronLeft = createIcon(LucideChevronLeft);
export const ChevronRight = createIcon(LucideChevronRight);
export const MoreVertical = createIcon(LucideMoreVertical);
export const FileInput = createIcon(LucideFileInput);
export const FileText = createIcon(LucideFileText);
export const FileUp = createIcon(LucideFileUp);
export const FileDown = createIcon(LucideFileDown);
export const FileSignature = createIcon(LucideFileSignature);
export const ListChecks = createIcon(LucideListChecks);
export const ListTree = createIcon(LucideListTree);
export const PieChart = createIcon(LucidePieChart);
export const Printer = createIcon(LucidePrinter);
export const Bell = createIcon(LucideBell);
export const BookOpen = createIcon(LucideBookOpen);
export const Book = createIcon(LucideBook);
export const Pencil = createIcon(LucidePencil);
export const Cloud = createIcon(LucideCloud);
export const PenLine = createIcon(LucidePenLine);
export const LockKeyhole = createIcon(LucideLockKeyhole);
export const School = createIcon(LucideSchool);
export const GraduationCap = createIcon(LucideGraduationCap);
export const FlaskConical = createIcon(LucideFlaskConical);
export const GripHorizontal = createIcon(LucideGripHorizontal);
export const FolderOpen = createIcon(LucideFolderOpen);
export const Download = createIcon(LucideDownload);
export const CircleAlert = createIcon(LucideCircleAlert);
export const CircleCheck = createIcon(LucideCircleCheck);
export const CircleX = createIcon(LucideCircleX);
export const CircleHelp = createIcon(LucideCircleHelp);
export const Info = createIcon(LucideInfo);
export const MapPin = createIcon(LucideMapPin);
export const Network = createIcon(LucideNetwork);
export const TestTube = createIcon(LucideTestTube);
export const Home = createIcon(LucideHome);
export const Sigma = createIcon(LucideSigma);
export const Eye = createIcon(LucideEye);
export const EyeOff = createIcon(LucideEyeOff);
export const Database = createIcon(LucideDatabase);
export const User = createIcon(LucideUser);
export const Loader2 = createIcon(LucideLoader2);
export const Users = createIcon(LucideUsers);
export const Menu = createIcon(LucideMenu);
export const ShieldCheck = createIcon(LucideShieldCheck);
export const RefreshCw = createIcon(LucideRefreshCw);
export const LogOut = createIcon(LucideLogOut);
export const AwardIcon = createIcon(Award);
export const Layers = createIcon(LucideLayers);
export const Palette = createIcon(LucidePalette);
export const Bold = createIcon(LucideBold);
export const Braces = createIcon(LucideBraces);
export const Italic = createIcon(LucideItalic);
export const List = createIcon(LucideList);
export const ListOrdered = createIcon(LucideListOrdered);
export const Underline = createIcon(LucideUnderline);
