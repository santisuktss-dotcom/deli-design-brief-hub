'use server';

import { cookies } from 'next/headers';

export type Lang = 'th' | 'en';

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get('lang')?.value;
  return v === 'th' ? 'th' : 'en';
}

export async function setLang(lang: Lang): Promise<void> {
  const store = await cookies();
  store.set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 });
}
