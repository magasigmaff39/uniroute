export interface EducationalNewsItem {
  id: string;
  title: string;
  category: 'university' | 'college' | 'school' | 'all';
  institutionId?: string;
  institutionName: string;
  date: string;
  summary: string;
  content: string;
  tags: string[];
  originalUrl: string;
  targetGrades?: string[];
  targetTrack?: 'university' | 'college' | 'school' | 'all';
  badge?: string;
  sourceTitle?: string;
}

export declare const EDUCATIONAL_NEWS: EducationalNewsItem[];

export declare function getRecommendedNews(params?: {
  category?: string;
  track?: string;
  grade?: string;
  targetIds?: string[];
}): EducationalNewsItem[];
