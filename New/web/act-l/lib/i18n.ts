import pl from '../messages/pl.json';
import en from '../messages/en.json';

export type AppLocale = 'pl' | 'en';

export const messages: Record<AppLocale, typeof pl> = { pl, en };

export const defaultLocale: AppLocale = 'pl';
