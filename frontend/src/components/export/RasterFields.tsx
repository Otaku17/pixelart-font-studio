import type { ExportFormat, GlyphScope, RasterOptions } from '@pfs/core';
import { NumberInput, SegmentedControl, Slider, Toggle } from 'soft-dark-ui';
import { useDict } from '../../state/prefs';

interface Props {
  format: ExportFormat;
  raster: RasterOptions;
  onChange: (patch: Partial<RasterOptions>) => void;
}

/** Image options shared by the BMFont, atlas and single-glyph exports. */
export function RasterFields({ format, raster, onChange }: Props) {
  const t = useDict();
  const sheet = format === 'atlas' || format === 'bmfont';

  return (
    <div className="raster-fields">
      <Slider label={t.optScale} min={1} max={8} value={raster.scale} onChange={(scale) => onChange({ scale })} format={(v) => `×${v}`} />
      {sheet && (
        <>
          <div className="field-caption">{t.optScope}</div>
          <SegmentedControl<GlyphScope>
            label={t.optScope}
            value={raster.scope}
            onChange={(scope) => onChange({ scope })}
            options={[
              { value: 'all', label: t.scopeAll },
              { value: 'nonEmpty', label: t.scopeNonEmpty },
              { value: 'edited', label: t.scopeEdited },
            ]}
          />
          <div className="field-pair">
            <NumberInput label={t.optPadding} min={0} max={16} value={raster.padding} unit="px" onChange={(padding) => onChange({ padding })} />
            <NumberInput label={t.optColumns} min={0} max={64} value={raster.columns} onChange={(columns) => onChange({ columns })} />
          </div>
        </>
      )}
      <div className="color-row">
        <label>
          {t.optInk}
          <input type="color" value={raster.ink} onChange={(e) => onChange({ ink: e.target.value })} />
        </label>
        <Toggle
          label={t.optTransparent}
          checked={raster.background === null}
          onChange={(transparent) => onChange({ background: transparent ? null : '#000000' })}
        />
        {raster.background !== null && (
          <label>
            {t.optBackground}
            <input type="color" value={raster.background} onChange={(e) => onChange({ background: e.target.value })} />
          </label>
        )}
      </div>
    </div>
  );
}
