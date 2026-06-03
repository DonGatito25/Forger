export const DIAGRAM_STORAGE_KEY = 'forge_diagram_v1';
export const DIAGRAM_TOOL_STORAGE_KEY = 'forge_diagram_tools_v1';
export const EXPORT_FILE_VERSION = 1;
export const EXPORT_FILE_TYPE = 'forger-story-export';
export const CATALOG_EXPORT_FILE_TYPE = 'forger-catalog-export';

export const sanitizeExportFileName = (name, fallback = 'story') =>
  String(name || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || fallback;

const DEFAULT_SUBTAB_NAME = 'Sub-tab 1';
const EMPTY_DIAGRAM_STATE = { canvases: [], activeCanvasByScope: {}, nodes: [], edges: [] };

const createTransferId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);
const cloneItem = (value) => JSON.parse(JSON.stringify(value));
const buildScopeKey = (tabId, subTabId) => `${String(tabId || '')}:${String(subTabId || '')}`;

const sortByOrder = (items) =>
  [...normalizeArray(items)].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));

const createStoreSnapshot = (store) => ({
  Tab: normalizeArray(store?.Tab).map(cloneItem),
  SubTab: normalizeArray(store?.SubTab).map(cloneItem),
  Category: normalizeArray(store?.Category).map(cloneItem),
  Character: normalizeArray(store?.Character).map(cloneItem),
  Tag: normalizeArray(store?.Tag).map(cloneItem),
  Event: normalizeArray(store?.Event).map(cloneItem),
  Metric: normalizeArray(store?.Metric).map(cloneItem),
  EventType: normalizeArray(store?.EventType).map(cloneItem),
  Concept: normalizeArray(store?.Concept).map(cloneItem),
});

const createDiagramSnapshot = (diagramState) => ({
  canvases: normalizeArray(diagramState?.canvases).map(cloneItem),
  nodes: normalizeArray(diagramState?.nodes).map(cloneItem),
  edges: normalizeArray(diagramState?.edges).map(cloneItem),
  activeCanvasByScope:
    diagramState?.activeCanvasByScope && typeof diagramState.activeCanvasByScope === 'object'
      ? { ...diagramState.activeCanvasByScope }
      : {},
});

const parseTransferFile = async ({ file, expectedFileType, emptyMessage, invalidMessage, missingDataMessage }) => {
  if (!file) throw new Error(emptyMessage);

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error(invalidMessage);
  }

  if (parsed?.fileType !== expectedFileType) {
    throw new Error(missingDataMessage);
  }

  if (parsed?.version !== EXPORT_FILE_VERSION) {
    throw new Error(`This export uses version ${parsed?.version ?? 'unknown'}, but Forger expects version ${EXPORT_FILE_VERSION}.`);
  }

  return parsed;
};

export const parseImportFile = async (file) =>
  parseTransferFile({
    file,
    expectedFileType: EXPORT_FILE_TYPE,
    emptyMessage: 'Choose a .fgr file to import.',
    invalidMessage: 'This file could not be read. Make sure it is a valid .fgr export.',
    missingDataMessage: 'This file is not a Forger .fgr export.',
  }).then((parsed) => {
    if (!parsed?.tab || typeof parsed.tab !== 'object') {
      throw new Error('This export is missing its tab data.');
    }
    return parsed;
  });

export const parseCatalogImportFile = async (file) =>
  parseTransferFile({
    file,
    expectedFileType: CATALOG_EXPORT_FILE_TYPE,
    emptyMessage: 'Choose a .cat file to import.',
    invalidMessage: 'This file could not be read. Make sure it is a valid .cat export.',
    missingDataMessage: 'This file is not a Forger .cat export.',
  }).then((parsed) => {
    if (!parsed?.data || typeof parsed.data !== 'object') {
      throw new Error('This catalog export is missing its workspace data.');
    }
    return parsed;
  });

const mergeDiagramToolGroups = (existingGroups, importedGroups) => {
  const mergedGroups = normalizeArray(existingGroups).map(cloneItem);
  const incomingGroups = normalizeArray(importedGroups);
  const usedGroupIds = new Set(mergedGroups.map((group) => String(group?.id || '')));
  const usedToolIds = new Set(
    mergedGroups.flatMap((group) => normalizeArray(group?.items).map((tool) => String(tool?.id || '')))
  );

  const toolIdMap = new Map();
  const variantIdMap = new Map();

  incomingGroups.forEach((group, groupIndex) => {
    const originalGroupId = String(group?.id || `group-${groupIndex + 1}`);
    let nextGroupId = originalGroupId;
    if (usedGroupIds.has(nextGroupId)) {
      nextGroupId = createTransferId(originalGroupId || 'group');
    }
    usedGroupIds.add(nextGroupId);

    const nextItems = normalizeArray(group?.items).map((tool, toolIndex) => {
      const originalToolId = String(tool?.id || `${originalGroupId}-tool-${toolIndex + 1}`);
      let nextToolId = originalToolId;
      if (usedToolIds.has(nextToolId)) {
        nextToolId = createTransferId(originalToolId || 'tool');
      }
      usedToolIds.add(nextToolId);
      toolIdMap.set(originalToolId, nextToolId);

      const usedVariantIds = new Set();
      const nextVariants = normalizeArray(tool?.variants).map((variant, variantIndex) => {
        const originalVariantId = String(variant?.id || `${originalToolId}-variant-${variantIndex + 1}`);
        let nextVariantId = originalVariantId;
        if (usedVariantIds.has(nextVariantId)) {
          nextVariantId = createTransferId(originalVariantId || 'variant');
        }
        usedVariantIds.add(nextVariantId);
        variantIdMap.set(`${originalToolId}::${originalVariantId}`, nextVariantId);
        return {
          ...cloneItem(variant),
          id: nextVariantId,
        };
      });

      return {
        ...cloneItem(tool),
        id: nextToolId,
        variants: nextVariants,
      };
    });

    mergedGroups.push({
      ...cloneItem(group),
      id: nextGroupId,
      items: nextItems,
    });
  });

  return {
    diagramToolGroups: mergedGroups,
    toolIdMap,
    variantIdMap,
  };
};

const mergeImportedData = ({
  importedTabs,
  importedData,
  store,
  diagramState,
  toolIdMap = new Map(),
  variantIdMap = new Map(),
}) => {
  const nextStore = createStoreSnapshot(store);
  const currentDiagramState = createDiagramSnapshot(diagramState);
  const data = importedData && typeof importedData === 'object' ? importedData : {};
  const diagramData = data?.diagrams && typeof data.diagrams === 'object' ? data.diagrams : EMPTY_DIAGRAM_STATE;

  const tabIdMap = new Map();
  const subTabIdMap = new Map();
  const categoryIdMap = new Map();
  const characterIdMap = new Map();
  const tagIdMap = new Map();
  const conceptIdMap = new Map();
  const metricIdMap = new Map();
  const eventTypeIdMap = new Map();
  const canvasIdMap = new Map();
  const nodeIdMap = new Map();
  const importedTabIdsInOrder = [];

  sortByOrder(importedTabs).forEach((tab) => {
    const nextId = createTransferId('tab');
    tabIdMap.set(String(tab.id), nextId);
    importedTabIdsInOrder.push(nextId);
    nextStore.Tab.push({
      ...cloneItem(tab),
      id: nextId,
      sort_order: nextStore.Tab.length,
    });
  });

  const defaultSubTabIdByOriginalTab = new Map();
  sortByOrder(data.subTabs)
    .filter((subTab) => tabIdMap.has(String(subTab.tab_id)))
    .forEach((subTab, index) => {
      const nextId = createTransferId('subtab');
      const originalTabId = String(subTab.tab_id);
      subTabIdMap.set(String(subTab.id), nextId);
      if (!defaultSubTabIdByOriginalTab.has(originalTabId)) {
        defaultSubTabIdByOriginalTab.set(originalTabId, nextId);
      }
      nextStore.SubTab.push({
        ...cloneItem(subTab),
        id: nextId,
        tab_id: tabIdMap.get(originalTabId),
        sort_order: subTab?.sort_order ?? index,
      });
    });

  sortByOrder(importedTabs).forEach((tab) => {
    const originalTabId = String(tab.id);
    if (defaultSubTabIdByOriginalTab.has(originalTabId)) return;
    const nextId = createTransferId('subtab');
    defaultSubTabIdByOriginalTab.set(originalTabId, nextId);
    nextStore.SubTab.push({
      id: nextId,
      tab_id: tabIdMap.get(originalTabId),
      name: DEFAULT_SUBTAB_NAME,
      description: '',
      sort_order: 0,
    });
  });

  normalizeArray(data.tags)
    .filter((tag) => tabIdMap.has(String(tag.tab_id)))
    .forEach((tag) => {
      const nextId = createTransferId('tag');
      tagIdMap.set(String(tag.id), nextId);
      nextStore.Tag.push({
        ...cloneItem(tag),
        id: nextId,
        tab_id: tabIdMap.get(String(tag.tab_id)),
      });
    });

  sortByOrder(data.categories)
    .filter((category) => tabIdMap.has(String(category.tab_id)))
    .forEach((category, index) => {
      const nextId = createTransferId('category');
      categoryIdMap.set(String(category.id), nextId);
      nextStore.Category.push({
        ...cloneItem(category),
        id: nextId,
        tab_id: tabIdMap.get(String(category.tab_id)),
        sub_tab_id:
          subTabIdMap.get(String(category.sub_tab_id)) || defaultSubTabIdByOriginalTab.get(String(category.tab_id)) || null,
        sort_order: category?.sort_order ?? index,
      });
    });

  normalizeArray(data.characters).forEach((character) => {
    characterIdMap.set(String(character.id), createTransferId('character'));
  });
  normalizeArray(data.characters)
    .map((character, index) => {
      const nextCategoryId = categoryIdMap.get(String(character.category_id));
      if (!nextCategoryId) return null;

      const nextCharacter = {
        ...cloneItem(character),
        id: characterIdMap.get(String(character.id)),
        category_id: nextCategoryId,
        sort_order: character?.sort_order ?? index,
        tag_ids: normalizeArray(character.tag_ids)
          .map((tagId) => tagIdMap.get(String(tagId)))
          .filter(Boolean),
      };

      if (character?.is_proxy) {
        nextCharacter.original_character_id = characterIdMap.get(String(character.original_character_id)) || null;
      }

      return nextCharacter;
    })
    .filter((character) => {
      if (!character) return false;
      if (!character.is_proxy) return true;
      return Boolean(character.original_character_id);
    })
    .forEach((character) => {
      nextStore.Character.push(character);
    });

  normalizeArray(data.concepts).forEach((concept) => {
    conceptIdMap.set(String(concept.id), createTransferId('concept'));
  });
  normalizeArray(data.concepts)
    .filter((concept) => tabIdMap.has(String(concept.tab_id)))
    .forEach((concept, index) => {
      nextStore.Concept.push({
        ...cloneItem(concept),
        id: conceptIdMap.get(String(concept.id)),
        tab_id: tabIdMap.get(String(concept.tab_id)),
        sub_tab_id:
          subTabIdMap.get(String(concept.sub_tab_id)) || defaultSubTabIdByOriginalTab.get(String(concept.tab_id)) || null,
        parent_id: concept.parent_id ? conceptIdMap.get(String(concept.parent_id)) || null : null,
        sort_order: concept?.sort_order ?? index,
      });
    });

  sortByOrder(data.metrics)
    .filter((metric) => tabIdMap.has(String(metric.tab_id)))
    .forEach((metric, index) => {
      const nextId = createTransferId('metric');
      metricIdMap.set(String(metric.id), nextId);
      nextStore.Metric.push({
        ...cloneItem(metric),
        id: nextId,
        tab_id: tabIdMap.get(String(metric.tab_id)),
        sub_tab_id:
          subTabIdMap.get(String(metric.sub_tab_id)) || defaultSubTabIdByOriginalTab.get(String(metric.tab_id)) || null,
        sort_order: metric?.sort_order ?? index,
      });
    });

  sortByOrder(data.eventTypes)
    .filter((eventType) => tabIdMap.has(String(eventType.tab_id)))
    .forEach((eventType, index) => {
      const nextId = createTransferId('event-type');
      eventTypeIdMap.set(String(eventType.id), nextId);
      nextStore.EventType.push({
        ...cloneItem(eventType),
        id: nextId,
        tab_id: tabIdMap.get(String(eventType.tab_id)),
        sub_tab_id:
          subTabIdMap.get(String(eventType.sub_tab_id)) || defaultSubTabIdByOriginalTab.get(String(eventType.tab_id)) || null,
        sort_order: eventType?.sort_order ?? index,
      });
    });

  sortByOrder(data.events)
    .filter((event) => tabIdMap.has(String(event.tab_id)))
    .forEach((event, index) => {
      nextStore.Event.push({
        ...cloneItem(event),
        id: createTransferId('event'),
        tab_id: tabIdMap.get(String(event.tab_id)),
        sub_tab_id:
          subTabIdMap.get(String(event.sub_tab_id)) || defaultSubTabIdByOriginalTab.get(String(event.tab_id)) || null,
        event_type_id: event.event_type_id ? eventTypeIdMap.get(String(event.event_type_id)) || null : null,
        connected_character_ids: normalizeArray(event.connected_character_ids)
          .map((characterId) => characterIdMap.get(String(characterId)))
          .filter(Boolean),
        metric_scores: Object.fromEntries(
          Object.entries(event?.metric_scores && typeof event.metric_scores === 'object' ? event.metric_scores : {})
            .map(([metricId, value]) => [metricIdMap.get(String(metricId)), value])
            .filter(([metricId]) => Boolean(metricId))
        ),
        sort_order: event?.sort_order ?? index,
      });
    });

  const characterById = new Map(nextStore.Character.map((character) => [String(character.id), character]));
  const categoryById = new Map(nextStore.Category.map((category) => [String(category.id), category]));

  const importedCanvasRecords = normalizeArray(diagramData.canvases).filter((canvas) => tabIdMap.has(String(canvas.tabId)));
  const importedNodeRecords = normalizeArray(diagramData.nodes).filter((node) => tabIdMap.has(String(node.tabId)));
  const importedEdgeRecords = normalizeArray(diagramData.edges).filter((edge) => tabIdMap.has(String(edge.tabId)));

  const nextCanvases = importedCanvasRecords.map((canvas, index) => {
    const nextId = createTransferId('canvas');
    canvasIdMap.set(String(canvas.id), nextId);
    return {
      ...cloneItem(canvas),
      id: nextId,
      tabId: tabIdMap.get(String(canvas.tabId)),
      subTabId:
        subTabIdMap.get(String(canvas.subTabId)) || defaultSubTabIdByOriginalTab.get(String(canvas.tabId)) || null,
      name: canvas?.name || (index === 0 ? 'Main Canvas' : `Canvas ${index + 1}`),
    };
  });

  if (nextCanvases.length === 0) {
    const fallbackCanvasScopes = Array.from(
      new Set(
        [...importedNodeRecords, ...importedEdgeRecords].map((item) => {
          const originalTabId = String(item?.tabId);
          const nextTabId = tabIdMap.get(originalTabId);
          const nextSubTabId =
            subTabIdMap.get(String(item?.subTabId)) || defaultSubTabIdByOriginalTab.get(originalTabId) || null;
          return nextTabId && nextSubTabId ? `${nextTabId}::${nextSubTabId}` : null;
        })
      )
    ).filter(Boolean);

    fallbackCanvasScopes.forEach((scope, index) => {
      const [tabId, subTabId] = scope.split('::');
      nextCanvases.push({
        id: createTransferId('canvas'),
        tabId,
        subTabId,
        name: index === 0 ? 'Main Canvas' : `Canvas ${index + 1}`,
      });
    });
  }

  currentDiagramState.canvases.push(...nextCanvases);

  const firstCanvasIdByScope = new Map();
  nextCanvases.forEach((canvas) => {
    const scopeKey = buildScopeKey(canvas.tabId, canvas.subTabId);
    if (!firstCanvasIdByScope.has(scopeKey)) {
      firstCanvasIdByScope.set(scopeKey, canvas.id);
    }
  });

  importedNodeRecords.forEach((node) => {
    nodeIdMap.set(String(node.id), createTransferId('node'));
  });
  importedNodeRecords.forEach((node, index) => {
    const nextCharacterId = characterIdMap.get(String(node.characterId)) || null;
    const matchedCharacter = nextCharacterId ? characterById.get(String(nextCharacterId)) || null : null;
    const matchedCategory = matchedCharacter ? categoryById.get(String(matchedCharacter.category_id)) || null : null;
    const nextTabId = tabIdMap.get(String(node.tabId));
    const nextSubTabId =
      subTabIdMap.get(String(node.subTabId)) || defaultSubTabIdByOriginalTab.get(String(node.tabId)) || null;
    if (!nextTabId || !nextSubTabId) return;

    currentDiagramState.nodes.push({
      ...cloneItem(node),
      id: nodeIdMap.get(String(node.id)),
      tabId: nextTabId,
      subTabId: nextSubTabId,
      canvasId: canvasIdMap.get(String(node.canvasId)) || firstCanvasIdByScope.get(buildScopeKey(nextTabId, nextSubTabId)) || null,
      characterId: nextCharacterId,
      name: matchedCharacter?.name || node?.name || `Character ${index + 1}`,
      imageUrl: matchedCharacter?.image_url || node?.imageUrl || '',
      categoryName: matchedCategory?.name || node?.categoryName || 'Unknown Category',
      categoryColor: matchedCategory?.color || node?.categoryColor || '#94a3b8',
    });
  });

  importedEdgeRecords.forEach((edge) => {
    const nextTabId = tabIdMap.get(String(edge.tabId));
    const nextSubTabId =
      subTabIdMap.get(String(edge.subTabId)) || defaultSubTabIdByOriginalTab.get(String(edge.tabId)) || null;
    const fromNodeId = nodeIdMap.get(String(edge.fromNodeId)) || null;
    const toNodeId = nodeIdMap.get(String(edge.toNodeId)) || null;
    if (!nextTabId || !nextSubTabId || !fromNodeId || !toNodeId) return;

    const remappedToolId = edge.toolId ? toolIdMap.get(String(edge.toolId)) || String(edge.toolId) : edge.toolId;
    const remappedVariantId =
      edge.toolId && edge.variantId
        ? variantIdMap.get(`${String(edge.toolId)}::${String(edge.variantId)}`) || edge.variantId
        : edge.variantId;

    currentDiagramState.edges.push({
      ...cloneItem(edge),
      id: createTransferId('edge'),
      tabId: nextTabId,
      subTabId: nextSubTabId,
      canvasId: canvasIdMap.get(String(edge.canvasId)) || firstCanvasIdByScope.get(buildScopeKey(nextTabId, nextSubTabId)) || null,
      fromNodeId,
      toNodeId,
      toolId: remappedToolId,
      variantId: remappedVariantId,
      familyParentNodeId: edge.familyParentNodeId ? nodeIdMap.get(String(edge.familyParentNodeId)) || null : null,
      familyChildNodeId: edge.familyChildNodeId ? nodeIdMap.get(String(edge.familyChildNodeId)) || null : null,
    });
  });

  Object.entries(
    diagramData?.activeCanvasByScope && typeof diagramData.activeCanvasByScope === 'object'
      ? diagramData.activeCanvasByScope
      : {}
  ).forEach(([scopeKey, canvasId]) => {
    const [originalTabId, originalSubTabId] = scopeKey.split(':');
    const nextTabId = tabIdMap.get(String(originalTabId));
    const nextSubTabId =
      subTabIdMap.get(String(originalSubTabId)) || defaultSubTabIdByOriginalTab.get(String(originalTabId)) || null;
    const nextCanvasId = canvasIdMap.get(String(canvasId));
    if (!nextTabId || !nextSubTabId || !nextCanvasId) return;
    currentDiagramState.activeCanvasByScope[buildScopeKey(nextTabId, nextSubTabId)] = nextCanvasId;
  });

  return {
    store: nextStore,
    diagramState: currentDiagramState,
    importedTabId: importedTabIdsInOrder[0] || null,
    importedSubTabId:
      importedTabs.length > 0 ? defaultSubTabIdByOriginalTab.get(String(importedTabs[0].id)) || null : null,
    importedTabName: importedTabs[0]?.name || 'Imported story',
    importedTabIds: importedTabIdsInOrder,
  };
};

export const mergeImportedStory = ({ payload, store, diagramState }) =>
  mergeImportedData({
    importedTabs: payload?.tab ? [payload.tab] : [],
    importedData: payload?.data || {},
    store,
    diagramState,
  });

export const mergeImportedCatalog = ({ payload, store, diagramState, diagramToolGroups }) => {
  const toolMerge = mergeDiagramToolGroups(diagramToolGroups, payload?.data?.diagramToolGroups);
  const merged = mergeImportedData({
    importedTabs: payload?.data?.tabs || [],
    importedData: payload?.data || {},
    store,
    diagramState,
    toolIdMap: toolMerge.toolIdMap,
    variantIdMap: toolMerge.variantIdMap,
  });

  return {
    ...merged,
    diagramToolGroups: toolMerge.diagramToolGroups,
  };
};
