import type { University } from '../../../src/types/index';

export declare const UNIVERSITY_DATABASE: University[];
export declare const UNIVERSITY_BY_ID: Map<string, University>;
export declare const UNIVERSITY_COUNTS: {
  total: number;
  universities: number;
  schools: number;
  colleges: number;
  kazakhstan: number;
  usa_canada: number;
  europe: number;
  asia: number;
};
export declare function validateUniversityDatabase(): boolean;
export declare const KAZAKHSTAN_UNIVERSITIES: University[];
export declare const USA_UNIVERSITIES: University[];
export declare const EUROPE_UNIVERSITIES: University[];
export declare const ASIA_UNIVERSITIES: University[];
export declare const SCHOOLS_DATABASE: University[];
export declare const COLLEGES_DATABASE: University[];
