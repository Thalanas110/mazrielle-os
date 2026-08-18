import * as mammoth from 'mammoth';

export interface ImportedCredential {
  title: string;
  username: string;
  password: string;
  website: string;
  notes: string;
  tags: string;
  source: 'table' | 'text';
}

const EMPTY = (): Omit<ImportedCredential, 'source'> => ({ title: '', username: '', password: '', website: '', notes: '', tags: '' });

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeLabel(value: string): keyof Omit<ImportedCredential, 'source'> | null {
  const label = value.toLowerCase().replace(/[\s_-]/g, '');
  if (['title', 'name', 'service', 'account'].includes(label)) return 'title';
  if (['username', 'user', 'email', 'login'].includes(label)) return 'username';
  if (['password', 'pass', 'secret'].includes(label)) return 'password';
  if (['website', 'url', 'site', 'domain'].includes(label)) return 'website';
  if (['notes', 'note', 'description'].includes(label)) return 'notes';
  if (['tags', 'tag', 'labels'].includes(label)) return 'tags';
  return null;
}

function mapRow(values: string[], headers: string[]): ImportedCredential {
  const record = EMPTY();
  values.forEach((value, index) => {
    const key = normalizeLabel(headers[index] ?? '') ?? (['title', 'username', 'password', 'website', 'notes', 'tags'][index] as keyof typeof record | undefined);
    if (key) record[key] = value;
  });
  return { ...record, source: 'table' };
}

function parseTables(html: string): ImportedCredential[] {
  const records: ImportedCredential[] = [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const table of tables) {
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => [...match[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => decodeHtml(cell[1]))).filter(row => row.length > 0);
    if (rows.length === 0) continue;
    const possibleHeaders = rows[0];
    const hasHeaders = possibleHeaders.some(value => normalizeLabel(value) !== null);
    const headers = hasHeaders ? possibleHeaders : ['title', 'username', 'password', 'website', 'notes', 'tags'];
    const dataRows = hasHeaders ? rows.slice(1) : rows;
    records.push(...dataRows.map(row => mapRow(row, headers)).filter(record => record.title || record.username || record.password));
  }
  return records;
}

function parseFreeText(html: string): ImportedCredential[] {
  const text = html
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<(p|div|li|h[1-6])[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');
  const lines = decodeHtml(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const records: ImportedCredential[] = [];
  let current = EMPTY();
  let hasField = false;
  const flush = () => {
    if (current.title || current.username || current.password) records.push({ ...current, source: 'text' });
    current = EMPTY();
    hasField = false;
  };

  for (const line of lines) {
    const match = line.match(/^([^:]{1,32}):\s*(.*)$/);
    const field = match ? normalizeLabel(match[1]) : null;
    if (field) {
      current[field] = match?.[2] ?? '';
      hasField = true;
      continue;
    }
    if (!current.title) current.title = line;
    else if (hasField) { flush(); current.title = line; }
  }
  flush();
  return records;
}

export function parseCredentialHtml(html: string): ImportedCredential[] {
  return [...parseTables(html), ...parseFreeText(html)];
}

export async function parseDocxFile(file: Blob): Promise<ImportedCredential[]> {
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return parseCredentialHtml(result.value);
}
