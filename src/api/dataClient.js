const STORAGE_KEY = 'forge_data_v1';

const defaultData = {
  Tab: [],
  Category: [],
  Character: [],
  Tag: [],
};

const loadStore = () => {
  if (typeof window === 'undefined') return { ...defaultData };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    return {
      Tab: Array.isArray(parsed.Tab) ? parsed.Tab : [],
      Category: Array.isArray(parsed.Category) ? parsed.Category : [],
      Character: Array.isArray(parsed.Character) ? parsed.Character : [],
      Tag: Array.isArray(parsed.Tag) ? parsed.Tag : [],
    };
  } catch {
    return { ...defaultData };
  }
};

const saveStore = (data) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const sortByKey = (items, key) => {
  if (!key) return [...items];
  return [...items].sort((a, b) => {
    const av = a?.[key] ?? 0;
    const bv = b?.[key] ?? 0;
    return av - bv;
  });
};

const list = async (entity, sortKey) => {
  const store = loadStore();
  return sortByKey(store[entity] || [], sortKey);
};

const create = async (entity, data) => {
  const store = loadStore();
  const item = { id: generateId(), ...data };
  store[entity] = [...(store[entity] || []), item];
  saveStore(store);
  return item;
};

const update = async (entity, id, data) => {
  const store = loadStore();
  const items = store[entity] || [];
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`${entity} not found`);
  const updated = { ...items[index], ...data };
  items[index] = updated;
  store[entity] = items;
  saveStore(store);
  return updated;
};

const remove = async (entity, id) => {
  const store = loadStore();
  store[entity] = (store[entity] || []).filter((item) => item.id !== id);
  saveStore(store);
  return { id };
};

const uploadImage = async (file) => {
  const fileDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  return { file_url: fileDataUrl };
};

export const dataClient = {
  entities: {
    Tab: {
      list: (sortKey) => list('Tab', sortKey),
      create: (data) => create('Tab', data),
      update: (id, data) => update('Tab', id, data),
      delete: (id) => remove('Tab', id),
    },
    Category: {
      list: (sortKey) => list('Category', sortKey),
      create: (data) => create('Category', data),
      update: (id, data) => update('Category', id, data),
      delete: (id) => remove('Category', id),
    },
    Character: {
      list: (sortKey) => list('Character', sortKey),
      create: (data) => create('Character', data),
      update: (id, data) => update('Character', id, data),
      delete: (id) => remove('Character', id),
    },
    Tag: {
      list: (sortKey) => list('Tag', sortKey),
      create: (data) => create('Tag', data),
      update: (id, data) => update('Tag', id, data),
      delete: (id) => remove('Tag', id),
    },
  },
  uploads: {
    uploadImage,
  },
};
