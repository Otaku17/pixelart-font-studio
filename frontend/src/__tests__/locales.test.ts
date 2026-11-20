import { describe, expect, it } from 'vitest';
import de from '../i18n/locales/de.json';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import fr from '../i18n/locales/fr.json';

describe('locales', () => {
  it('all have the same keys as English', () => {
    const keys = Object.keys(en).sort();
    for (const locale of [fr, es, de]) expect(Object.keys(locale).sort()).toEqual(keys);
  });
});
