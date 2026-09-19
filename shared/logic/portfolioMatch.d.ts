import type { ApplicantProfile, PortfolioItem, University, UploadedDocument } from '../../src/types/index';

export type PortfolioSignalId = 'olympiads' | 'research' | 'projects' | 'competitions' | 'leadership' | 'community' | 'creative' | 'certificates' | 'extracurricular';
export type CheckStatus = 'met' | 'partial' | 'missing' | 'unknown';

export interface PortfolioCheck {
  id: string;
  group: 'academic' | 'portfolio' | 'documents';
  status: CheckStatus;
  signal?: PortfolioSignalId;
  docKind?: string;
  min?: number;
  value?: number | string | null;
  /** The university's own published text the check comes from */
  source?: string;
  evidence: { id: string; title: string }[];
}

export interface PortfolioUniversityMatch {
  universityId: string;
  checks: PortfolioCheck[];
  met: number;
  partial: number;
  missing: number;
  unknown: number;
  coverage: number | null;
}

export interface RelevantItem {
  id: string;
  title: string;
  type: string;
  score: number;
  reasons: ('field' | 'valued' | 'high_level' | 'result' | 'proof' | 'no_proof')[];
  valuedBy: string[];
}

export interface DevelopmentArea {
  id: string;
  kind: 'signal' | 'proof' | 'numbers' | 'academic';
  status: 'missing' | 'partial';
  universities: string[];
  items?: { id: string; title: string }[];
}

type ItemLike = Pick<PortfolioItem, 'id' | 'title' | 'type' | 'level' | 'result' | 'excluded' | 'documentId' | 'links' | 'subjects' | 'description' | 'organization'> & {
  ai?: { score: number } | null;
  preScore?: number;
};

export declare const PORTFOLIO_SIGNALS: { id: PortfolioSignalId; types: string[]; re: RegExp; exclude?: RegExp }[];
export declare function itemSignificance(item: ItemLike): number;
export declare function universitySignals(uni: University): { id: PortfolioSignalId; sources: string[] }[];
export declare function matchPortfolio(profile: ApplicantProfile | null, items: ItemLike[], documents: Pick<UploadedDocument, 'kind'>[], uni: University): PortfolioUniversityMatch;
export declare function rankRelevantItems(profile: ApplicantProfile | null, items: ItemLike[], universities?: University[]): RelevantItem[];
export declare function developmentAreas(matches: PortfolioUniversityMatch[], items: ItemLike[]): DevelopmentArea[];
