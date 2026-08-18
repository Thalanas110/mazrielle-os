export type FolderType = 'password' | 'note';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  color: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  folder_id: string | null;
  title: string;
  username: string;
  password: string;
  website: string;
  notes: string;
  tags: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  module: string;
  action: string;
  item_name: string;
  created_at: string;
}

export interface AppSettings {
  display_name: string;
  theme: 'light' | 'dark';
  accent_color: string;
  font_size: 'small' | 'medium' | 'large';
  auto_lock: boolean;
  clipboard_clear: boolean;
  show_website_icons: boolean;
}

export interface VaultMetadata {
  owner_id: string;
  envelope: import('./crypto').VaultEnvelope;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  display_name: 'Ren',
  theme: 'dark',
  accent_color: '#3b82f6',
  font_size: 'medium',
  auto_lock: true,
  clipboard_clear: true,
  show_website_icons: true,
};
