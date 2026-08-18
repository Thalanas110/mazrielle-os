import { useState } from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { createCredential } from '@/lib/api';
import { parseDocxFile, type ImportedCredential } from '@/lib/docxImport';

export default function DocxImportPanel() {
  const [records, setRecords] = useState<ImportedCredential[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setMessage(null);
    try { setRecords(await parseDocxFile(file)); }
    catch (parseError) { setError(parseError instanceof Error ? parseError.message : 'Could not read this DOCX file'); }
    finally { setBusy(false); }
  };

  const update = (index: number, field: keyof ImportedCredential, value: string) => {
    setRecords(previous => previous.map((record, itemIndex) => itemIndex === index ? { ...record, [field]: value } : record));
  };

  const importRecords = async () => {
    setBusy(true); setError(null);
    try {
      await Promise.all(records.map(record => createCredential(record)));
      setRecords([]); setMessage('Credentials imported into the encrypted vault.');
    } catch (importError) { setError(importError instanceof Error ? importError.message : 'Could not import credentials'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import from DOCX</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Choose a local passwords.docx file. Tables and labeled free-form text are supported. Google Drive is not accessed directly.</p>
      <label className="btn-ghost mt-3 inline-flex cursor-pointer items-center gap-2 border border-gray-200 dark:border-gray-800"><FileUp className="h-4 w-4" />{busy ? 'Reading...' : 'Choose DOCX'}<input className="sr-only" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={event => void selectFile(event.target.files?.[0])} /></label>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      {message && <p className="mt-3 text-xs text-emerald-500">{message}</p>}

      {records.length > 0 && <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Review {records.length} records before import</div><button className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={() => setRecords([])}>Discard</button></div>
        {records.map((record, index) => <div key={`${record.source}-${index}`} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
          <div className="grid gap-2 sm:grid-cols-2">
            {(['title', 'username', 'password', 'website', 'notes', 'tags'] as const).map(field => <input key={field} className="input text-xs" type={field === 'password' ? 'password' : 'text'} placeholder={field[0].toUpperCase() + field.slice(1)} value={record[field]} onChange={event => update(index, field, event.target.value)} />)}
          </div>
          <button className="mt-2 inline-flex items-center gap-1 text-xs text-red-500" onClick={() => setRecords(previous => previous.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-3 w-3" />Remove</button>
        </div>)}
        <button className="btn-primary" disabled={busy} onClick={() => void importRecords()}>Import encrypted credentials</button>
      </div>}
    </div>
  );
}
