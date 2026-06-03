export const DEFAULT_SUBTAB_NAME = 'Sub-tab 1';

export const getSubTabScopeKey = (tabId, subTabId) => `${String(tabId || '')}:${String(subTabId || '')}`;

export const buildReturnState = (activeTabId, activeSubTabId) => ({
  activeTabId,
  activeSubTabId,
});

export const getScopedSubTabs = (subTabs, tabId) =>
  subTabs
    .filter((subTab) => String(subTab.tab_id) === String(tabId))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
