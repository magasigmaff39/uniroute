import { UserRound, GraduationCap, Globe, Brain, BookOpen, Trophy, Bot, Briefcase, Target, FileText, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import type { ProfileBlockId } from '../../types';

/** One icon per profile block — the same in the profile, the wizard and the missing-data chips. */
export const BLOCK_ICONS: Record<ProfileBlockId, LucideIcon> = {
  personal: UserRound,
  education: GraduationCap,
  admission: Globe,
  skills: Brain,
  exams: BookOpen,
  achievements: Trophy,
  projects: Bot,
  experience: Briefcase,
  goals: Target,
  documents: FileText,
  extra: SlidersHorizontal,
};