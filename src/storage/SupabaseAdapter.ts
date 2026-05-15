import { supabase } from '../lib/supabase';
import type {
  Couple,
  FamilySnapshot,
  ImportantPerson,
  LifeEvent,
  MediaItem,
  Person,
} from '../types/family';

export type EntityKind = 'people' | 'couples' | 'importantPeople' | 'events' | 'media';

const TABLE: Record<EntityKind, string> = {
  people: 'people',
  couples: 'couples',
  importantPeople: 'important_people',
  events: 'life_events',
  media: 'media',
};

export type TreeRecord = { id: string; owner_id: string; name: string; created_at: string };
export type TreeRole = 'owner' | 'editor' | 'viewer';
export type TreeMembership = { tree_id: string; role: TreeRole; tree: TreeRecord };

export async function listTrees(): Promise<TreeMembership[]> {
  const { data, error } = await supabase
    .from('tree_members')
    .select('tree_id, role, tree:trees(id, owner_id, name, created_at)')
    .order('invited_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((row) => row.tree).map((row) => ({
    tree_id: row.tree_id,
    role: row.role as TreeRole,
    tree: row.tree as unknown as TreeRecord,
  }));
}

export async function createTree(name: string): Promise<TreeRecord> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('trees')
    .insert({ owner_id: user.id, name })
    .select('*')
    .single();
  if (error) throw error;
  return data as TreeRecord;
}

export async function loadSnapshot(treeId: string): Promise<FamilySnapshot> {
  const queries = await Promise.all([
    supabase.from('people').select('id, data').eq('tree_id', treeId),
    supabase.from('couples').select('id, data').eq('tree_id', treeId),
    supabase.from('important_people').select('id, data').eq('tree_id', treeId),
    supabase.from('life_events').select('id, data').eq('tree_id', treeId),
    supabase.from('media').select('id, data').eq('tree_id', treeId),
  ]);
  for (const q of queries) {
    if (q.error) throw q.error;
  }
  const [peopleRows, coupleRows, importantRows, eventRows, mediaRows] = queries.map((q) => q.data ?? []);

  const people: Record<string, Person> = {};
  peopleRows.forEach((row: { id: string; data: Person }) => {
    people[row.id] = { ...row.data, id: row.id };
  });
  const couples: Record<string, Couple> = {};
  coupleRows.forEach((row: { id: string; data: Couple }) => {
    couples[row.id] = { ...row.data, id: row.id };
  });
  const importantPeople: Record<string, ImportantPerson> = {};
  importantRows.forEach((row: { id: string; data: ImportantPerson }) => {
    importantPeople[row.id] = { ...row.data, id: row.id };
  });
  const events: Record<string, LifeEvent> = {};
  eventRows.forEach((row: { id: string; data: LifeEvent }) => {
    events[row.id] = { ...row.data, id: row.id };
  });
  const media: Record<string, MediaItem> = {};
  mediaRows.forEach((row: { id: string; data: MediaItem }) => {
    media[row.id] = { ...row.data, id: row.id };
  });

  return { people, couples, importantPeople, events, media };
}

export async function upsertEntity(
  treeId: string,
  kind: EntityKind,
  id: string,
  data: unknown,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from(TABLE[kind])
    .upsert({ id, tree_id: treeId, data, updated_at: new Date().toISOString(), ...extra });
  if (error) throw error;
}

export async function deleteEntity(kind: EntityKind, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE[kind]).delete().eq('id', id);
  if (error) throw error;
}

export async function uploadMediaBlob(
  treeId: string,
  mediaId: string,
  file: File | Blob,
  ext: string,
): Promise<string> {
  const path = `${treeId}/${mediaId}.${ext}`;
  const { error } = await supabase.storage
    .from('family-media')
    .upload(path, file, { upsert: true, contentType: (file as File).type || undefined });
  if (error) throw error;
  return path;
}

export async function deleteMediaBlob(path: string): Promise<void> {
  const { error } = await supabase.storage.from('family-media').remove([path]);
  if (error) throw error;
}

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getMediaUrl(path: string): Promise<string | undefined> {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage
    .from('family-media')
    .createSignedUrl(path, 60 * 60);
  if (error || !data) return undefined;
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 60 * 60 * 1000 });
  return data.signedUrl;
}

export async function inviteMemberByEmail(treeId: string, email: string, role: TreeRole) {
  const { data, error } = await supabase.rpc('add_member_by_email', {
    p_tree_id: treeId,
    p_email: email,
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function listMembers(treeId: string) {
  const { data, error } = await supabase
    .from('tree_members')
    .select('user_id, role, invited_at')
    .eq('tree_id', treeId);
  if (error) throw error;
  return data ?? [];
}
