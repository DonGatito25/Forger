import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronRight, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import CreateConceptDialog from '@/components/concepts/CreateConceptDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { buildReturnState, getScopedSubTabs } from '@/lib/subtabs';

const buildConceptTree = (concepts, parentId = null) =>
  concepts
    .filter((concept) => String(concept.parent_id || '') === String(parentId || ''))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((concept) => ({
      ...concept,
      children: buildConceptTree(concepts, concept.id),
    }));

const collectConceptIds = (conceptId, childrenByParentId) => {
  const directChildren = childrenByParentId.get(String(conceptId)) || [];
  return [conceptId, ...directChildren.flatMap((child) => collectConceptIds(child.id, childrenByParentId))];
};

const withAlpha = (hex, alpha) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return undefined;
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((part) => Number.isNaN(part))) return undefined;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function ConceptNode({
  concept,
  depth = 0,
  expandedDetails,
  onToggleDetails,
  onAddChild,
  onEdit,
  onDelete,
  draggedConceptId,
  dragOverConceptId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const hasChildren = concept.children.length > 0;
  const showDetails = expandedDetails[concept.id] ?? depth === 0;
  const isRootConcept = depth === 0;
  const isDraggable = depth > 0;
  const conceptColor = isRootConcept ? concept.color || '#f59e0b' : '#64748b';
  const sizeClasses =
    depth === 0
      ? 'rounded-[28px] p-5'
      : depth === 1
      ? 'rounded-[24px] p-4'
      : 'rounded-[22px] p-3.5';
  const titleClasses = depth === 0 ? 'text-lg' : depth === 1 ? 'text-base' : 'text-sm';
  const bodyClasses = depth === 0 ? 'text-sm leading-6' : 'text-[13px] leading-5';
  const markerSize = depth === 0 ? 'h-3 w-3' : 'h-2.5 w-2.5';
  const childIndent = depth === 0 ? 'pl-6' : 'pl-5';

  return (
    <div
      className={`relative ${
        isDraggable && String(draggedConceptId) === String(concept.id) ? 'scale-[1.01] opacity-70' : ''
      } ${
        isDraggable && String(dragOverConceptId) === String(concept.id) ? 'ring-2 ring-sky-400/60 rounded-[28px]' : ''
      }`}
      draggable={isDraggable}
      onDragStart={isDraggable ? (nativeEvent) => onDragStart(concept, nativeEvent) : undefined}
      onDragOver={isDraggable ? (nativeEvent) => onDragOver(concept, nativeEvent) : undefined}
      onDrop={isDraggable ? (nativeEvent) => onDrop(concept, nativeEvent) : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
    >
      {depth > 0 ? (
        <div
          className="absolute left-[-22px] top-0 h-full w-px bg-border/70"
          aria-hidden="true"
        />
      ) : null}
      <div
        className={`${sizeClasses} border shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5`}
        style={{
          borderColor: isRootConcept ? withAlpha(conceptColor, 0.45) : 'rgba(100, 116, 139, 0.3)',
          backgroundColor: isRootConcept ? withAlpha(conceptColor, 0.08) : 'rgba(2, 6, 23, 0.35)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex ${markerSize} rounded-full`}
                style={{ backgroundColor: conceptColor }}
              />
              <h3 className={`truncate font-semibold text-slate-100 ${titleClasses}`}>{concept.title}</h3>
              {hasChildren ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-200"
                  style={{
                    borderColor: isRootConcept ? withAlpha(conceptColor, 0.45) : 'rgba(100, 116, 139, 0.4)',
                    backgroundColor: isRootConcept ? withAlpha(conceptColor, 0.12) : 'rgba(15, 23, 42, 0.75)',
                  }}
                >
                  {concept.children.length} sub{concept.children.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <p className={`mt-3 max-w-3xl text-slate-300 ${bodyClasses}`}>{concept.definition}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-slate-800/70 hover:text-white"
              onClick={() => onEdit(concept)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-rose-500/15 hover:text-rose-300"
              onClick={() => onDelete(concept)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {concept.explanation ? (
            <button
              type="button"
              onClick={() => onToggleDetails(concept.id)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/45 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
            >
              {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {showDetails ? 'Hide Notes' : 'Show Notes'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onAddChild(concept)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/35 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Sub-Concept
          </button>
        </div>

        {showDetails && concept.explanation ? (
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Explanation</div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{concept.explanation}</p>
          </div>
        ) : null}

        {hasChildren ? (
          <div className={`mt-4 space-y-3 border-l border-slate-700/50 ${childIndent}`}>
            {concept.children.map((child) => (
              <ConceptNode
                key={child.id}
                concept={child}
                depth={depth + 1}
                expandedDetails={expandedDetails}
                onToggleDetails={onToggleDetails}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                draggedConceptId={draggedConceptId}
                dragOverConceptId={dragOverConceptId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Concepts() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const returnTabAppliedRef = useRef(false);

  const [activeTabId, setActiveTabId] = useState(null);
  const [activeSubTabId, setActiveSubTabId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [selectedRootConceptId, setSelectedRootConceptId] = useState(null);
  const [dialogState, setDialogState] = useState({ open: false, editData: null, parentConcept: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, concept: null, descendantCount: 0 });
  const [draggedConceptId, setDraggedConceptId] = useState(null);
  const [dragOverConceptId, setDragOverConceptId] = useState(null);

  const { data: tabs = [], isLoading: loadingTabs } = useQuery({
    queryKey: ['tabs'],
    queryFn: () => dataClient.entities.Tab.list('sort_order'),
  });
  const { data: subTabs = [], isLoading: loadingSubTabs } = useQuery({
    queryKey: ['sub-tabs'],
    queryFn: () => dataClient.entities.SubTab.list('sort_order'),
  });

  const { data: concepts = [], isLoading: loadingConcepts } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => dataClient.entities.Concept.list('sort_order'),
  });

  useEffect(() => {
    if (tabs.length > 0 && !activeTabId) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    const requestedTabId = location.state?.activeTabId;
    const requestedSubTabId = location.state?.activeSubTabId;
    if (!requestedTabId) {
      returnTabAppliedRef.current = false;
      return;
    }
    if (tabs.length === 0 || subTabs.length === 0) return;
    if (returnTabAppliedRef.current) return;
    if (!tabs.some((tab) => String(tab.id) === String(requestedTabId))) return;

    returnTabAppliedRef.current = true;
    if (String(activeTabId) !== String(requestedTabId)) {
      setActiveTabId(requestedTabId);
    }
    const requestedSubTab = getScopedSubTabs(subTabs, requestedTabId).find(
      (subTab) => String(subTab.id) === String(requestedSubTabId)
    );
    if (requestedSubTab && String(activeSubTabId) !== String(requestedSubTab.id)) {
      setActiveSubTabId(requestedSubTab.id);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, tabs, subTabs, activeTabId, activeSubTabId, navigate, location.pathname]);

  const activeTab = useMemo(
    () => tabs.find((tab) => String(tab.id) === String(activeTabId)) || null,
    [tabs, activeTabId]
  );
  const activeSubTabs = useMemo(() => getScopedSubTabs(subTabs, activeTabId), [subTabs, activeTabId]);
  const activeSubTab = useMemo(
    () => activeSubTabs.find((subTab) => String(subTab.id) === String(activeSubTabId)) || activeSubTabs[0] || null,
    [activeSubTabs, activeSubTabId]
  );

  useEffect(() => {
    if (!activeTabId || activeSubTabs.length === 0) return;
    if (activeSubTab && String(activeSubTabId) === String(activeSubTab.id)) return;
    setActiveSubTabId(activeSubTabs[0].id);
  }, [activeTabId, activeSubTabs, activeSubTab, activeSubTabId]);

  const tabConcepts = useMemo(
    () =>
      concepts.filter(
        (concept) =>
          String(concept.tab_id) === String(activeTabId) && String(concept.sub_tab_id) === String(activeSubTab?.id)
      ),
    [concepts, activeTabId, activeSubTab]
  );

  const conceptTree = useMemo(() => buildConceptTree(tabConcepts), [tabConcepts]);
  const selectedRootConcept = useMemo(
    () => conceptTree.find((concept) => concept.id === selectedRootConceptId) || conceptTree[0] || null,
    [conceptTree, selectedRootConceptId]
  );

  const childrenByParentId = useMemo(() => {
    const map = new Map();
    tabConcepts.forEach((concept) => {
      const key = String(concept.parent_id || '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(concept);
    });
    return map;
  }, [tabConcepts]);

  const createConcept = useMutation({
    mutationFn: ({ data, parentConcept }) => {
      const siblings = tabConcepts.filter(
        (concept) => String(concept.parent_id || '') === String(parentConcept?.id || '')
      );
      return dataClient.entities.Concept.create({
        ...data,
        tab_id: activeTabId,
        sub_tab_id: activeSubTab?.id,
        parent_id: parentConcept?.id || null,
        sort_order: siblings.length,
      });
    },
    onSuccess: (createdConcept, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      setDialogState({ open: false, editData: null, parentConcept: null });
      setExpandedDetails((current) => ({
        ...current,
        ...(variables.parentConcept ? { [variables.parentConcept.id]: true } : {}),
        [createdConcept.id]: true,
      }));
      if (!variables.parentConcept) {
        setSelectedRootConceptId(createdConcept.id);
      }
    },
  });

  const updateConcept = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Concept.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      setDialogState({ open: false, editData: null, parentConcept: null });
    },
  });

  const deleteConcept = useMutation({
    mutationFn: async (concept) => {
      const conceptIds = collectConceptIds(concept.id, childrenByParentId);
      await Promise.all(conceptIds.map((id) => dataClient.entities.Concept.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
    },
  });

  const reorderConceptSiblings = useMutation({
    mutationFn: async ({ sourceId, targetId, parentId }) => {
      const siblings = tabConcepts
        .filter((concept) => String(concept.parent_id || '') === String(parentId || ''))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const sourceIndex = siblings.findIndex((concept) => String(concept.id) === String(sourceId));
      const targetIndex = siblings.findIndex((concept) => String(concept.id) === String(targetId));
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return [];

      const reorderedSiblings = [...siblings];
      const [movedConcept] = reorderedSiblings.splice(sourceIndex, 1);
      reorderedSiblings.splice(targetIndex, 0, movedConcept);

      return Promise.all(
        reorderedSiblings.map((concept, index) =>
          dataClient.entities.Concept.update(concept.id, { sort_order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      setDraggedConceptId(null);
      setDragOverConceptId(null);
    },
  });

  const handleDialogSubmit = (data) => {
    if (dialogState.editData) {
      updateConcept.mutate({ id: dialogState.editData.id, data });
      return;
    }
    createConcept.mutate({ data, parentConcept: dialogState.parentConcept });
  };

  const handleDeleteConcept = (concept) => {
    const descendantCount = collectConceptIds(concept.id, childrenByParentId).length - 1;
    setDeleteDialog({ open: true, concept, descendantCount });
  };

  const handleConceptDragStart = (concept, nativeEvent) => {
    setDraggedConceptId(concept.id);
    nativeEvent.dataTransfer.effectAllowed = 'move';
    nativeEvent.dataTransfer.setData('text/plain', JSON.stringify({
      id: concept.id,
      parentId: concept.parent_id || null,
    }));
  };

  const handleConceptDragOver = (targetConcept, nativeEvent) => {
    if (!draggedConceptId || String(draggedConceptId) === String(targetConcept.id)) return;
    const rawPayload = nativeEvent.dataTransfer.getData('text/plain');
    if (rawPayload) {
      try {
        const payload = JSON.parse(rawPayload);
        if (String(payload.parentId || '') !== String(targetConcept.parent_id || '')) return;
      } catch {
        return;
      }
    }
    nativeEvent.preventDefault();
    nativeEvent.dataTransfer.dropEffect = 'move';
    if (String(dragOverConceptId) !== String(targetConcept.id)) {
      setDragOverConceptId(targetConcept.id);
    }
  };

  const handleConceptDrop = (targetConcept, nativeEvent) => {
    nativeEvent.preventDefault();
    const rawPayload = nativeEvent.dataTransfer.getData('text/plain');
    let payload = null;
    try {
      payload = rawPayload ? JSON.parse(rawPayload) : null;
    } catch {
      payload = null;
    }
    const sourceConceptId = payload?.id || draggedConceptId;
    const sourceParentId = payload ? payload.parentId || null : null;
    const targetParentId = targetConcept.parent_id || null;

    if (
      !sourceConceptId ||
      String(sourceConceptId) === String(targetConcept.id) ||
      String(sourceParentId || '') !== String(targetParentId || '')
    ) {
      setDraggedConceptId(null);
      setDragOverConceptId(null);
      return;
    }

    reorderConceptSiblings.mutate({
      sourceId: sourceConceptId,
      targetId: targetConcept.id,
      parentId: targetParentId,
    });
  };

  const handleConceptDragEnd = () => {
    setDraggedConceptId(null);
    setDragOverConceptId(null);
  };

  useEffect(() => {
    if (conceptTree.length === 0) {
      setSelectedRootConceptId(null);
      return;
    }
    if (!selectedRootConceptId || !conceptTree.some((concept) => concept.id === selectedRootConceptId)) {
      setSelectedRootConceptId(conceptTree[0].id);
    }
  }, [conceptTree, selectedRootConceptId]);

  if (loadingTabs || loadingSubTabs || loadingConcepts) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgb(255, 0, 0),transparent_26%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(255, 0, 0),transparent_28%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(activeTabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Concepts</h1>
              <p className="text-sm text-slate-400">No tabs yet.</p>
            </div>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] items-center justify-center px-4 py-6 sm:px-6">
          <div className="max-w-md text-center">
            <Lightbulb className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-xl font-semibold">Create a tab first</h2>
            <p className="mt-2 text-sm text-slate-400">
              Concepts are organized inside a story tab, so there needs to be a tab before ideas can live anywhere.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!activeTabId || !activeTab || !activeSubTab) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(255, 0, 0),transparent_24%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(activeTabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Concepts</h1>
              <p className="text-sm text-slate-400">This tab's concepts could not be found.</p>
            </div>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] items-center justify-center px-4 py-6 sm:px-6">
          <div className="max-w-md text-center">
            <Lightbulb className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-xl font-semibold">Missing concepts target</h2>
            <p className="mt-2 text-sm text-slate-400">
              Open Concepts from a specific tab on the home page so we know which story concepts to show.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0, 115, 255, 0.08),transparent_24%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(activeTabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Concepts</h1>
              <p className="text-sm text-slate-400">Define the ideas, rules, doctrines, systems, and abstractions behind each sub-tab.</p>
            </div>
          </div>
        </div>
        {activeSubTabs.length > 1 && (
          <div className="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
            {activeSubTabs.map((subTab) => (
              <button
                key={subTab.id}
                type="button"
                onClick={() => setActiveSubTabId(subTab.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  String(activeSubTab?.id) === String(subTab.id)
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-900/55 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {subTab.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-[1320px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:h-[calc(100vh-7.5rem)] xl:self-start">
            <section className="flex h-full flex-col rounded-[28px] border border-slate-700/70 bg-slate-950/30 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Root Concepts</div>
                  <div className="mt-2 text-sm text-slate-400">
                    {conceptTree.length} root thread{conceptTree.length === 1 ? '' : 's'} in {activeTab.name} / {activeSubTab.name}
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDialogState({ open: true, editData: null, parentConcept: null })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {conceptTree.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/25 px-4 py-5 text-sm text-slate-400">
                    No root concepts yet.
                  </div>
                ) : (
                  conceptTree.map((concept) => {
                    const selected = concept.id === selectedRootConcept?.id;
                    return (
                      <button
                        key={concept.id}
                        type="button"
                        onClick={() => setSelectedRootConceptId(concept.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selected
                            ? 'text-white'
                            : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                        }`}
                        style={
                          selected
                            ? {
                                borderColor: withAlpha(concept.color || '#60a5fa', 0.5),
                                backgroundColor: withAlpha(concept.color || '#60a5fa', 0.1),
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: concept.color || '#60a5fa' }} />
                          <div className="truncate font-medium">{concept.title}</div>
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                          {concept.definition}
                        </div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          {concept.children.length} sub{concept.children.length === 1 ? '' : 's'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </aside>

          <section className="rounded-[32px] border border-slate-700/70 bg-slate-900/30 p-5 shadow-sm sm:p-6">
            <div className="border-b border-slate-700/60 pb-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Concept Canvas</div>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">{activeSubTab.name}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {activeTab.name} / {activeSubTab.name}. Focus on one root concept at a time while keeping its whole sub-tree visible.
              </p>
            </div>

            <div className="mt-6">
              {conceptTree.length === 0 ? (
                <div className="flex min-h-[460px] items-center justify-center rounded-[28px] border border-dashed border-slate-600/50 bg-slate-950/20 px-6">
                  <div className="max-w-xl text-center">
                    <Lightbulb className="mx-auto h-10 w-10 text-slate-500" />
                    <h3 className="mt-4 text-2xl font-semibold">No concepts yet</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      Start with one root concept, then use sub-concepts to build a visible branching tree underneath it.
                    </p>
                    <Button
                      type="button"
                      className="mt-5 gap-2"
                      onClick={() => setDialogState({ open: true, editData: null, parentConcept: null })}
                    >
                      <Plus className="w-4 h-4" />
                      Create First Concept
                    </Button>
                  </div>
                </div>
              ) : selectedRootConcept ? (
                <ConceptNode
                  concept={selectedRootConcept}
                  expandedDetails={expandedDetails}
                  onToggleDetails={(conceptId) =>
                    setExpandedDetails((current) => ({
                      ...current,
                      [conceptId]: !(current[conceptId] ?? false),
                    }))
                  }
                  onAddChild={(parentConcept) =>
                    setDialogState({ open: true, editData: null, parentConcept })
                  }
                  onEdit={(editData) =>
                    setDialogState({ open: true, editData, parentConcept: null })
                  }
                  onDelete={handleDeleteConcept}
                  draggedConceptId={draggedConceptId}
                  dragOverConceptId={dragOverConceptId}
                  onDragStart={handleConceptDragStart}
                  onDragOver={handleConceptDragOver}
                  onDrop={handleConceptDrop}
                  onDragEnd={handleConceptDragEnd}
                />
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <CreateConceptDialog
        open={dialogState.open}
        onClose={(open) => {
          if (open) return;
          setDialogState({ open: false, editData: null, parentConcept: null });
        }}
        onSubmit={handleDialogSubmit}
        editData={dialogState.editData}
        parentConcept={dialogState.parentConcept}
        tabName={activeTab && activeSubTab ? `${activeTab.name} / ${activeSubTab.name}` : activeTab?.name}
        submitting={createConcept.isPending || updateConcept.isPending}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (open) return;
          setDeleteDialog({ open: false, concept: null, descendantCount: 0 });
        }}
      >
        <AlertDialogContent className="border-slate-700/70 bg-slate-950 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">Delete Concept?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteDialog.concept ? (
                deleteDialog.descendantCount > 0
                  ? `This will delete "${deleteDialog.concept.title}" and its ${deleteDialog.descendantCount} nested sub-concept${deleteDialog.descendantCount === 1 ? '' : 's'}.`
                  : `This will delete "${deleteDialog.concept.title}".`
              ) : (
                'This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() => {
                if (!deleteDialog.concept) return;
                deleteConcept.mutate(deleteDialog.concept);
                setDeleteDialog({ open: false, concept: null, descendantCount: 0 });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
