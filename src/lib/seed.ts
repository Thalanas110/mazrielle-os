import { getDb, genId, now } from './db';
import { queryRows } from './queryRows';

export async function seedData() {
  const db = await getDb();
  const existing = await db.query<Record<string, unknown>>('SELECT id FROM credentials LIMIT 1');
  if (queryRows(existing).length > 0) return;

  const t = now();
  const folders = [
    { id: genId(), name: 'Personal', type: 'password', color: '#3b82f6', favorite: true },
    { id: genId(), name: 'Work', type: 'password', color: '#10b981', favorite: false },
    { id: genId(), name: 'Finance', type: 'password', color: '#f59e0b', favorite: false },
    { id: genId(), name: 'Ideas', type: 'note', color: '#8b5cf6', favorite: true },
    { id: genId(), name: 'Journal', type: 'note', color: '#ec4899', favorite: false },
  ];

  for (const f of folders) {
    await db.query(
      `INSERT INTO folders (id, name, type, color, favorite, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6)`,
      [f.id, f.name, f.type, f.color, f.favorite, t]
    );
  }

  const personalId = folders[0].id;
  const workId = folders[1].id;
  const financeId = folders[2].id;
  const ideasId = folders[3].id;
  const journalId = folders[4].id;

  const credentials = [
    { folder: personalId, title: 'GitHub', username: 'renlenon', password: 'S3cur3P@ss!2024', website: 'github.com', tags: 'dev,code', notes: 'Personal account' },
    { folder: personalId, title: 'Gmail', username: 'rblenon18@gmail.com', password: 'gm@il_s3cure!', website: 'gmail.com', tags: 'email', notes: '' },
    { folder: workId, title: 'Vercel', username: 'h0tm4kizn', password: 'v3rcel_d3ploy#', website: 'vercel.com', tags: 'hosting,deploy', notes: 'Client deployments' },
    { folder: workId, title: 'Figma', username: 'ren.lenon', password: 'f1gm@_design!', website: 'figma.com', tags: 'design', notes: '' },
    { folder: financeId, title: 'BPI Online', username: 'renlenon', password: 'Bp1_0nl1n3$', website: 'bpi.com.ph', tags: 'bank', notes: 'Main bank account' },
    { folder: financeId, title: 'PayPal', username: 'rblenon18', password: 'p@ypal_s3cure!', website: 'paypal.com', tags: 'finance', notes: '' },
  ];

  for (const c of credentials) {
    const id = genId();
    await db.query(
      `INSERT INTO credentials (id, folder_id, title, username, password, website, notes, tags, favorite, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$9)`,
      [id, c.folder, c.title, c.username, c.password, c.website, c.notes, c.tags, t]
    );
    await logActivity('Vault', 'Created', c.title);
  }

  const notes = [
    { folder: ideasId, title: 'Project Ideas', content: '# Project Ideas\n\n- Build a local-first Life OS app\n- Create a portfolio site with dark mode\n- Learn Rust and Tauri 2\n- Explore WebGPU for graphics' },
    { folder: ideasId, title: 'App Features', content: '# Mazrielle OS Features\n\n## Core\n- Password vault with encryption\n- Notes with markdown\n- Task management\n- Calendar view\n- Income tracking' },
    { folder: journalId, title: 'Today', content: '# Journal Entry\n\nStarted working on Mazrielle OS v2 today. The goal is to make it a complete Life OS with everything stored locally. Privacy first, no cloud dependency.' },
    { folder: journalId, title: 'Weekly Review', content: '# Week Review\n\nAccomplished this week:\n- Shipped portfolio update\n- Started Mazrielle OS v2 redesign\n- Learned Argon2id key derivation' },
  ];

  for (const n of notes) {
    const id = genId();
    await db.query(
      `INSERT INTO notes (id, folder_id, title, content, favorite, created_at, updated_at)
       VALUES ($1,$2,$3,$4,false,$5,$5)`,
      [id, n.folder, n.title, n.content, t]
    );
    await logActivity('Notes', 'Created', n.title);
  }

  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const tasks = [
    { title: 'Design Mazrielle OS v2 dashboard', desc: 'Create the main dashboard layout with stats, overdue tasks, and world clocks', status: 'completed', priority: 'high', due: inDays(-2), tags: 'design,mazrielle-os' },
    { title: 'Implement vault encryption', desc: 'Add AES-256-GCM encryption with Argon2id key derivation', status: 'completed', priority: 'high', due: inDays(-1), tags: 'security,mazrielle-os' },
    { title: 'Build calendar view', desc: 'Week, month, and year views with task due dates', status: 'in_progress', priority: 'medium', due: inDays(1), tags: 'feature,mazrielle-os' },
    { title: 'Add income tracking module', desc: 'Track earnings with charts and category breakdown', status: 'in_progress', priority: 'medium', due: inDays(3), tags: 'feature,income' },
    { title: 'Write documentation', desc: 'Document the case study for portfolio', status: 'todo', priority: 'low', due: inDays(5), tags: 'docs' },
    { title: 'Set up automated backups', desc: 'Encrypted backup and restore functionality', status: 'todo', priority: 'high', due: inDays(7), tags: 'security,backup' },
    { title: 'Client website - SEO audit', desc: 'Technical SEO audit for the new client project', status: 'todo', priority: 'medium', due: inDays(2), tags: 'client,seo' },
    { title: 'Portfolio refresh', desc: 'Update portfolio with latest projects', status: 'completed', priority: 'low', due: inDays(-3), tags: 'portfolio' },
  ];

  for (const task of tasks) {
    const id = genId();
    await db.query(
      `INSERT INTO tasks (id, title, description, status, priority, due_date, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [id, task.title, task.desc, task.status, task.priority, task.due, task.tags, t]
    );
    await logActivity('Tasks', 'Created', task.title);
  }

  const incomeEntries = [
    { source: 'Freelance - Web Design', amount: 25000, currency: 'PHP', category: 'Freelance', date: inDays(-5), notes: 'Client website project' },
    { source: 'WordPress Maintenance', amount: 8000, currency: 'PHP', category: 'Freelance', date: inDays(-12), notes: 'Monthly retainer' },
    { source: 'SEO Consulting', amount: 15000, currency: 'PHP', category: 'Consulting', date: inDays(-18), notes: 'Technical SEO audit' },
    { source: 'Laravel API Project', amount: 35000, currency: 'PHP', category: 'Freelance', date: inDays(-25), notes: 'Backend development' },
    { source: 'Theme Customization', amount: 5000, currency: 'PHP', category: 'Freelance', date: inDays(-2), notes: '' },
  ];

  for (const inc of incomeEntries) {
    const id = genId();
    await db.query(
      `INSERT INTO income (id, source, amount, currency, category, date, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [id, inc.source, inc.amount, inc.currency, inc.category, inc.date, inc.notes, t]
    );
    await logActivity('Income', 'Created', inc.source);
  }
}

export async function logActivity(module: string, action: string, itemName: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO activity_log (id, module, action, item_name, created_at) VALUES ($1,$2,$3,$4,$5)`,
    [genId(), module, action, itemName, now()]
  );
}
