import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { decodeBytes, parseCsv, type CsvTable } from '../lib/csv/parse';

export function Upload({ onLoaded }: { onLoaded(table: CsvTable, filename: string): void }) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const { t } = useI18n();

  async function handle(file: File) {
    setError(null);
    try {
      const table = parseCsv(decodeBytes(new Uint8Array(await file.arrayBuffer())));
      if (table.headers.length === 0 || table.rows.length === 0) throw new Error(t.upload.noRows);
      setFilename(file.name);
      onLoaded(table, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="card">
      <h2>{t.upload.heading}</h2>
      <label
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handle(file);
        }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handle(file);
            e.target.value = '';
          }}
        />
        <span>{filename ? t.upload.loaded(filename) : t.upload.prompt}</span>
      </label>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
