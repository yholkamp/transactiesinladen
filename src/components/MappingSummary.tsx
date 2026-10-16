import { useI18n } from '../i18n/I18nProvider';
import type { Mapping } from '../lib/csv/mapping';
import type { Sample } from './mappingSample';

interface Props {
  title: string;
  known: boolean;
  mapping: Mapping;
  sample: Sample | null;
  onEdit(): void;
}

function exampleLine(sample: Sample): { text: string; error: boolean } {
  const values = [sample.date, sample.amount, sample.description];
  const error = values.find((v) => v.error)?.error;
  return error ? { text: error, error: true } : { text: values.map((v) => v.result).join(' · '), error: false };
}

export function MappingSummary({ title, known, mapping, sample, onEdit }: Props) {
  const { t } = useI18n();
  const sign = mapping.signMode;
  const amount = [
    mapping.amountColumn,
    sign.kind === 'signed' ? t.mapping.signSummarySigned : t.mapping.signSummaryColumn(sign.column, sign.debitValue, sign.creditValue),
  ];
  const description = [
    mapping.descriptionColumns.join(' + ') || t.mapping.noColumn,
    ...(mapping.foreignAmount ? [t.mapping.foreignSummary] : []),
  ].join(' + ');
  const extras = [
    ...(mapping.invertSign ? [t.mapping.invertSummary] : []),
    ...(mapping.skipRules.length ? [t.mapping.skipSummary(mapping.skipRules.length)] : []),
  ];
  const example = sample && exampleLine(sample);

  return (
    <div className="mapping-summary">
      <p className={known ? 'recognised known' : 'recognised'}>{title}</p>
      <dl>
        <dt>{t.mapping.fieldDate}</dt>
        <dd>{mapping.dateFormat === 'auto' ? mapping.dateColumn : `${mapping.dateColumn} · ${mapping.dateFormat}`}</dd>
        <dt>{t.mapping.fieldAmount}</dt>
        <dd>{amount.join(' · ')}</dd>
        <dt>{t.mapping.fieldDescription}</dt>
        <dd>{description}</dd>
        {extras.length > 0 && (
          <>
            <dt>{t.mapping.extra}</dt>
            <dd>{extras.join(' · ')}</dd>
          </>
        )}
        {example && (
          <>
            <dt>{t.mapping.example}</dt>
            <dd className={example.error ? 'error' : 'muted'}>{example.text}</dd>
          </>
        )}
      </dl>
      <button type="button" onClick={onEdit}>{t.mapping.edit}</button>
    </div>
  );
}
