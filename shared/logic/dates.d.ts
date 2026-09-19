export declare function parseRuDeadline(text: string | undefined | null): Date | null;
export declare function parseRuDeadlineIso(text: string | undefined | null): string | null;
export declare function toIcsDate(d: Date): string;
export declare function daysUntil(d: Date | null): number | null;
export declare function ruMonthIndex(word: string): number | null;
export declare function daysLeft(iso: string | null | undefined, today?: Date): number | null;
export declare function parseRuDayMonth(text: string | undefined | null, baseYear: number | string): string | null;
export declare function nextRegistrationDeadline(text: string | undefined | null, today?: Date): string | null;
