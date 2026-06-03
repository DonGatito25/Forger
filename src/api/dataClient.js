const STORAGE_KEY = 'forge_data_v1';
const DEFAULT_SUBTAB_NAME = 'Sub-tab 1';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const defaultData = {
  Tab: [],
  SubTab: [],
  Category: [],
  Character: [],
  Tag: [],
  Event: [],
  Metric: [],
  EventType: [],
  Concept: [],
};

const saveStore = (data) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const migrateStore = (store) => {
  let changed = false;
  const nextStore = {
    ...defaultData,
    ...store,
    Tab: normalizeArray(store.Tab),
    SubTab: normalizeArray(store.SubTab),
    Category: normalizeArray(store.Category),
    Character: normalizeArray(store.Character),
    Tag: normalizeArray(store.Tag),
    Event: normalizeArray(store.Event),
    Metric: normalizeArray(store.Metric),
    EventType: normalizeArray(store.EventType),
    Concept: normalizeArray(store.Concept),
  };

  const tabIds = new Set(
    [
      ...nextStore.Tab.map((item) => item?.id),
      ...nextStore.Category.map((item) => item?.tab_id),
      ...nextStore.Tag.map((item) => item?.tab_id),
      ...nextStore.Event.map((item) => item?.tab_id),
      ...nextStore.Metric.map((item) => item?.tab_id),
      ...nextStore.EventType.map((item) => item?.tab_id),
      ...nextStore.Concept.map((item) => item?.tab_id),
    ].filter((value) => value !== null && value !== undefined)
  );

  const subTabsByTab = new Map();
  nextStore.SubTab = nextStore.SubTab.map((subTab, index) => {
    const normalized = {
      ...subTab,
      sort_order: subTab?.sort_order ?? index,
      name: subTab?.name || `Sub-tab ${index + 1}`,
      description: subTab?.description || '',
    };
    if (
      normalized.sort_order !== subTab?.sort_order ||
      normalized.name !== subTab?.name ||
      normalized.description !== (subTab?.description || '')
    ) {
      changed = true;
    }
    if (normalized.tab_id !== null && normalized.tab_id !== undefined) {
      const key = String(normalized.tab_id);
      if (!subTabsByTab.has(key)) subTabsByTab.set(key, []);
      subTabsByTab.get(key).push(normalized);
    }
    return normalized;
  });

  tabIds.forEach((tabId) => {
    const key = String(tabId);
    const existingSubTabs = (subTabsByTab.get(key) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (existingSubTabs.length > 0) return;

    const createdSubTab = {
      id: generateId(),
      tab_id: tabId,
      name: DEFAULT_SUBTAB_NAME,
      description: '',
      sort_order: 0,
    };
    nextStore.SubTab.push(createdSubTab);
    subTabsByTab.set(key, [createdSubTab]);
    changed = true;
  });

  const defaultSubTabIdByTab = new Map(
    Array.from(subTabsByTab.entries()).map(([tabId, items]) => [
      tabId,
      [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.id || null,
    ])
  );

  ['Category', 'Event', 'Metric', 'EventType', 'Concept'].forEach((entity) => {
    nextStore[entity] = nextStore[entity].map((item) => {
      if (item?.sub_tab_id || item?.tab_id === null || item?.tab_id === undefined) return item;
      const fallbackSubTabId = defaultSubTabIdByTab.get(String(item.tab_id));
      if (!fallbackSubTabId) return item;
      changed = true;
      return {
        ...item,
        sub_tab_id: fallbackSubTabId,
      };
    });
  });

  return { store: nextStore, changed };
};

const loadStore = () => {
  if (typeof window === 'undefined') return { ...defaultData };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    const { store, changed } = migrateStore(parsed);
    if (changed) saveStore(store);
    return store;
  } catch {
    return { ...defaultData };
  }
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
    SubTab: {
      list: (sortKey) => list('SubTab', sortKey),
      create: (data) => create('SubTab', data),
      update: (id, data) => update('SubTab', id, data),
      delete: (id) => remove('SubTab', id),
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
    Event: {
      list: (sortKey) => list('Event', sortKey),
      create: (data) => create('Event', data),
      update: (id, data) => update('Event', id, data),
      delete: (id) => remove('Event', id),
    },
    Metric: {
      list: (sortKey) => list('Metric', sortKey),
      create: (data) => create('Metric', data),
      update: (id, data) => update('Metric', id, data),
      delete: (id) => remove('Metric', id),
    },
    EventType: {
      list: (sortKey) => list('EventType', sortKey),
      create: (data) => create('EventType', data),
      update: (id, data) => update('EventType', id, data),
      delete: (id) => remove('EventType', id),
    },
    Concept: {
      list: (sortKey) => list('Concept', sortKey),
      create: (data) => create('Concept', data),
      update: (id, data) => update('Concept', id, data),
      delete: (id) => remove('Concept', id),
    },
  },
  uploads: {
    uploadImage,
  },
  storage: {
    read: loadStore,
    write: saveStore,
  },
};
