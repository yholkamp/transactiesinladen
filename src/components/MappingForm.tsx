import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Mapping, ParsedRow } from '../lib/csv/mapping';
import type { CsvTable } from '../lib/csv/parse';
import type { MappingSource } from '../lib/csv/presets';
import { MappingEditor } from './MappingEditor';
import { MappingSummary } from './MappingSummary';
import { describeSample } from './mappingSample';

interface Props {
  table: CsvTable;
  source: MappingSource;
  mapping: Mapping;
  sample: ParsedRow | undefined;
  onChange(mapping: Mapping): void;
}

export function MappingForm({ table, source, mapping, sample, onChange }: Props) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(source.kind === 'suggested');
  const [edited, setEdited] = useState(false);
  const described = useMemo(() => describeSample(t, locale, table, mapping, sample), [t, locale, table, mapping, sample]);

  const title = edited
    ? t.mapping.edited
    : source.kind === 'preset' ? t.mapping.recognisedPreset(source.name)
      : source.kind === 'saved' ? t.mapping.recognisedSaved
        : t.mapping.suggested;

  function change(next: Mapping) {
    setEdited(true);
    onChange(next);
  }

  return (
    <section className="card">
      <h2>{t.mapping.heading}</h2>
      {editing ? (
        <>
          {source.kind === 'suggested' && !edited && <p className="muted">{t.mapping.suggestedHint}</p>}
          <MappingEditor headers={table.headers} mapping={mapping} sample={described} onChange={change} />
          <div className="actions">
            <button type="button" onClick={() => setEditing(false)}>{t.mapping.done}</button>
          </div>
        </>
      ) : (
        <MappingSummary title={title} known={edited || source.kind !== 'suggested'} mapping={mapping} sample={described} onEdit={() => setEditing(true)} />
      )}
    </section>
  );
}
