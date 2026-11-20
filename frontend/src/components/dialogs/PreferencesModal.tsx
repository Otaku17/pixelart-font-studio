import { Modal, RadioGroup } from 'soft-dark-ui';
import { AVAILABLE_LANGS } from '../../i18n';
import { prefsStore, useDict, usePrefs } from '../../state/prefs';
import type { ThemePref } from '../../state/theme';
import { ui } from '../../state/ui';

const SYSTEM = '__system';
const THEMES = ['system', 'light', 'dark', 'sepia', 'contrast'] as const;
const THEME_LABEL = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
  sepia: 'themeSepia',
  contrast: 'themeContrast',
} as const;

/** Language and theme in one place; changes apply immediately. */
export function PreferencesModal() {
  const t = useDict();
  const lang = usePrefs((p) => (p.langFollowsSystem ? SYSTEM : p.lang));
  const themePref = usePrefs((p) => p.themePref);

  return (
    <Modal open onClose={() => ui.close()} title={t.prefsTitle}>
      <div className="prefs-grid">
        <RadioGroup<string>
          label={t.chooseLanguage}
          value={lang}
          onChange={(v) =>
            v === SYSTEM ? prefsStore.trigger.followSystemLang() : prefsStore.trigger.setLang({ lang: v })
          }
          options={[
            { value: SYSTEM, label: t.systemLanguage },
            ...AVAILABLE_LANGS.map((m) => ({ value: m.code, label: m.label })),
          ]}
        />
        <RadioGroup<ThemePref>
          label={t.chooseTheme}
          value={themePref}
          onChange={(pref) => prefsStore.trigger.setThemePref({ pref })}
          options={THEMES.map((pref) => ({ value: pref, label: t[THEME_LABEL[pref]] }))}
        />
      </div>
    </Modal>
  );
}
