import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import CreateEventDialog from '@/components/timeline/CreateEventDialog';
import CreateMetricDialog from '@/components/timeline/CreateMetricDialog';
import CreateEventTypeDialog from '@/components/timeline/CreateEventTypeDialog';
import StarRating from '@/components/timeline/StarRating';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildReturnState, getScopedSubTabs } from '@/lib/subtabs';

const DEFAULT_METRIC_NAME = 'Importance';

const getMetricScore = (event, metricId) => Number(event?.metric_scores?.[metricId] || 0);
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

export default function Timeline() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tabId } = useParams();

  const [activeSubTabId, setActiveSubTabId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [eventTypeDialogOpen, setEventTypeDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [expandedMetricCards, setExpandedMetricCards] = useState({});
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [dragOverEventId, setDragOverEventId] = useState(null);
  const defaultMetricSeededRef = useRef(false);

  const { data: tabs = [], isLoading: loadingTabs } = useQuery({
    queryKey: ['tabs'],
    queryFn: () => dataClient.entities.Tab.list('sort_order'),
  });
  const { data: subTabs = [], isLoading: loadingSubTabs } = useQuery({
    queryKey: ['sub-tabs'],
    queryFn: () => dataClient.entities.SubTab.list('sort_order'),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => dataClient.entities.Event.list('sort_order'),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dataClient.entities.Category.list('sort_order'),
  });

  const { data: characters = [], isLoading: loadingCharacters } = useQuery({
    queryKey: ['characters'],
    queryFn: () => dataClient.entities.Character.list('sort_order'),
  });

  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => dataClient.entities.Metric.list('sort_order'),
  });

  const { data: eventTypes = [], isLoading: loadingEventTypes } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => dataClient.entities.EventType.list('sort_order'),
  });

  const activeTab = useMemo(
    () => tabs.find((tab) => String(tab.id) === String(tabId)) || null,
    [tabs, tabId]
  );
  const activeSubTabs = useMemo(() => getScopedSubTabs(subTabs, tabId), [subTabs, tabId]);
  const activeSubTab = useMemo(
    () => activeSubTabs.find((subTab) => String(subTab.id) === String(activeSubTabId)) || activeSubTabs[0] || null,
    [activeSubTabs, activeSubTabId]
  );

  useEffect(() => {
    const requestedSubTabId = location.state?.activeSubTabId;
    if (requestedSubTabId && activeSubTabs.some((subTab) => String(subTab.id) === String(requestedSubTabId))) {
      setActiveSubTabId(requestedSubTabId);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (activeSubTabs.length > 0 && (!activeSubTabId || !activeSubTabs.some((subTab) => String(subTab.id) === String(activeSubTabId)))) {
      setActiveSubTabId(activeSubTabs[0].id);
    }
  }, [location.state, activeSubTabs, activeSubTabId, navigate, location.pathname]);

  const tabEvents = useMemo(
    () =>
      events.filter(
        (event) => String(event.tab_id) === String(tabId) && String(event.sub_tab_id) === String(activeSubTab?.id)
      ),
    [events, tabId, activeSubTab]
  );

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => String(category.tab_id) === String(tabId) && String(category.sub_tab_id) === String(activeSubTab?.id)
      ),
    [categories, tabId, activeSubTab]
  );

  const characterCategories = useMemo(
    () =>
      activeCategories
        .map((category) => ({
          ...category,
          characters: characters
            .filter((character) => !character.is_proxy && String(character.category_id) === String(category.id))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        }))
        .filter((category) => category.characters.length > 0),
    [activeCategories, characters]
  );

  const characterById = useMemo(
    () =>
      new Map(
        characterCategories.flatMap((category) =>
          category.characters.map((character) => [
            String(character.id),
            {
              ...character,
              categoryName: category.name,
              categoryColor: category.color || '#94a3b8',
            },
          ])
        )
      ),
    [characterCategories]
  );

  const selectedEvent = useMemo(
    () => tabEvents.find((event) => String(event.id) === String(selectedEventId)) || null,
    [tabEvents, selectedEventId]
  );

  const editingEvent = useMemo(
    () => tabEvents.find((event) => String(event.id) === String(editingEventId)) || null,
    [tabEvents, editingEventId]
  );

  const sortedMetrics = useMemo(
    () =>
      metrics
        .filter((metric) => String(metric.tab_id) === String(tabId) && String(metric.sub_tab_id) === String(activeSubTab?.id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [metrics, tabId, activeSubTab]
  );
  const sortedEventTypes = useMemo(
    () =>
      eventTypes
        .filter(
          (eventType) => String(eventType.tab_id) === String(tabId) && String(eventType.sub_tab_id) === String(activeSubTab?.id)
        )
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [eventTypes, tabId, activeSubTab]
  );
  const eventTypeById = useMemo(
    () => new Map(sortedEventTypes.map((eventType) => [String(eventType.id), eventType])),
    [sortedEventTypes]
  );

  const getConnectedCharacters = (event) =>
    (Array.isArray(event?.connected_character_ids) ? event.connected_character_ids : [])
      .map((id) => characterById.get(String(id)))
      .filter(Boolean);
  const getEventType = (event) => eventTypeById.get(String(event?.event_type_id)) || null;

  useEffect(() => {
    defaultMetricSeededRef.current = false;
  }, [activeSubTab?.id]);

  useEffect(() => {
    if (!activeSubTab?.id) return;
    if (loadingMetrics) return;
    if (sortedMetrics.length > 0) return;
    if (defaultMetricSeededRef.current) return;

    defaultMetricSeededRef.current = true;

    dataClient.entities.Metric.create({
      name: DEFAULT_METRIC_NAME,
      tab_id: tabId,
      sub_tab_id: activeSubTab?.id,
      sort_order: 0,
      is_default: true,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    });
  }, [loadingMetrics, queryClient, sortedMetrics.length, tabId, activeSubTab]);

  const createEvent = useMutation({
    mutationFn: (data) =>
      dataClient.entities.Event.create({
        ...data,
        tab_id: tabId,
        sub_tab_id: activeSubTab?.id,
        sort_order: tabEvents.length,
        created_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setCreateDialogOpen(false);
    },
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditDialogOpen(false);
      setEditingEventId(null);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (event) => {
      await dataClient.entities.Event.delete(event.id);
      const remaining = tabEvents.filter((item) => item.id !== event.id);
      await Promise.all(
        remaining.map((item, index) => dataClient.entities.Event.update(item.id, { sort_order: index }))
      );
    },
    onSuccess: () => {
      setSelectedEventId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const reorderEvents = useMutation({
    mutationFn: async ({ sourceId, targetId }) => {
      const reorderedEvents = [...tabEvents];
      const sourceIndex = reorderedEvents.findIndex((event) => String(event.id) === String(sourceId));
      const targetIndex = reorderedEvents.findIndex((event) => String(event.id) === String(targetId));
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return [];

      const [movedEvent] = reorderedEvents.splice(sourceIndex, 1);
      reorderedEvents.splice(targetIndex, 0, movedEvent);

      return Promise.all(
        reorderedEvents.map((event, index) =>
          dataClient.entities.Event.update(event.id, { sort_order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDraggedEventId(null);
      setDragOverEventId(null);
    },
  });

  const createMetric = useMutation({
    mutationFn: ({ name }) =>
      dataClient.entities.Metric.create({
        name,
        tab_id: tabId,
        sub_tab_id: activeSubTab?.id,
        sort_order: sortedMetrics.length,
        is_default: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setMetricDialogOpen(false);
    },
  });

  const deleteMetric = useMutation({
    mutationFn: async (metric) => {
      await dataClient.entities.Metric.delete(metric.id);
      await Promise.all(
        tabEvents.map((event) => {
          const nextScores = { ...(event.metric_scores || {}) };
          delete nextScores[metric.id];
          return dataClient.entities.Event.update(event.id, { metric_scores: nextScores });
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const createEventType = useMutation({
    mutationFn: ({ name, color }) =>
      dataClient.entities.EventType.create({
        name,
        color,
        tab_id: tabId,
        sub_tab_id: activeSubTab?.id,
        sort_order: sortedEventTypes.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      setEventTypeDialogOpen(false);
    },
  });

  const deleteEventType = useMutation({
    mutationFn: async (eventType) => {
      await dataClient.entities.EventType.delete(eventType.id);
      await Promise.all(
        tabEvents
          .filter((event) => String(event.event_type_id) === String(eventType.id))
          .map((event) => dataClient.entities.Event.update(event.id, { event_type_id: null }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const toggleMetricCard = (eventId) => {
    setExpandedMetricCards((current) => ({
      ...current,
      [eventId]: !current[eventId],
    }));
  };

  const handleEventDragStart = (eventId, nativeEvent) => {
    setDraggedEventId(eventId);
    nativeEvent.dataTransfer.effectAllowed = 'move';
    nativeEvent.dataTransfer.setData('text/plain', String(eventId));
  };

  const handleEventDragOver = (eventId, nativeEvent) => {
    if (!draggedEventId || String(draggedEventId) === String(eventId)) return;
    nativeEvent.preventDefault();
    nativeEvent.dataTransfer.dropEffect = 'move';
    if (String(dragOverEventId) !== String(eventId)) {
      setDragOverEventId(eventId);
    }
  };

  const handleEventDrop = (targetEventId, nativeEvent) => {
    nativeEvent.preventDefault();
    const sourceEventId = nativeEvent.dataTransfer.getData('text/plain') || draggedEventId;
    if (!sourceEventId || String(sourceEventId) === String(targetEventId)) {
      setDraggedEventId(null);
      setDragOverEventId(null);
      return;
    }

    reorderEvents.mutate({ sourceId: sourceEventId, targetId: targetEventId });
  };

  const handleEventDragEnd = () => {
    setDraggedEventId(null);
    setDragOverEventId(null);
  };

  if (loadingTabs || loadingSubTabs || loadingEvents || loadingCategories || loadingCharacters || loadingMetrics || loadingEventTypes) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.14),transparent_26%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-foreground">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(255, 0, 0),transparent_26%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(tabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Timeline</h1>
              <p className="text-sm text-muted-foreground">No tabs yet.</p>
            </div>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] items-center justify-center px-4 py-6 sm:px-6 ">
          <div className="max-w-md text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Create a tab first</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Timelines belong to individual tabs, so there needs to be a story tab before events can live anywhere.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!tabId || !activeTab || !activeSubTab) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255, 0, 0, 0.1),transparent_28%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(tabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Timeline</h1>
              <p className="text-sm text-muted-foreground">This tab timeline could not be found.</p>
            </div>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] items-center justify-center px-4 py-6 sm:px-6 ">
          <div className="max-w-md text-center">
            <Clock3 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Missing timeline target</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open Timeline from a specific tab on the home page so we know which story timeline to show.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255, 0, 0, 0),transparent_24%),linear-gradient(180deg,#223247_0%,#172131_100%)] text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-950/35 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/', { state: buildReturnState(tabId, activeSubTabId) })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Timeline</h1>
              <p className="text-sm text-muted-foreground">Track major beats, arcs, and world events for this sub-tab.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/40 px-3 py-1.5 text-sm text-slate-300">
            <Clock3 className="w-4 h-4" />
            {activeTab.name} / {activeSubTab.name}
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
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-900/55 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {subTab.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[32px] border border-slate-700/70 bg-slate-900/30 shadow-sm">
          <div className="border-b border-slate-700/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.62))] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current Timeline</div>
                <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">{activeSubTab.name}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {tabEvents.length} event{tabEvents.length === 1 ? '' : 's'} in {activeTab.name} / {activeSubTab.name}.
                </p>
              </div>
              <Button type="button" className="gap-2 self-start sm:self-auto" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Event</span>
              </Button>
            </div>
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:26px_26px] opacity-50" />
            <div className="relative">
              {tabEvents.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-slate-600/50 bg-slate-950/20">
                  <div className="max-w-md text-center px-6">
                    <CalendarDays className="mx-auto h-10 w-10 text-slate-500" />
                    <h3 className="mt-4 text-xl font-semibold">No events yet</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Start by adding a major event, reveal, milestone, or turning point for {activeTab.name} / {activeSubTab.name}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-4">
                  {tabEvents.map((event, index) => {
                    const visibleMetrics = sortedMetrics.slice(0, 3);
                    const hiddenMetrics = sortedMetrics.slice(3);
                    const connectedCharacters = getConnectedCharacters(event);
                    const showExpandedMetrics = Boolean(expandedMetricCards[event.id]);
                    const hasExpandableContent = hiddenMetrics.length > 0 || connectedCharacters.length > 0;
                    const eventType = getEventType(event);
                    const eventTypeBorder = eventType?.color || undefined;
                    const eventTypeBg = withAlpha(eventType?.color, 0.08);
                    const eventTypeSoft = withAlpha(eventType?.color, 0.14);

                    return (
                      <article
                        key={event.id}
                        draggable
                        onDragStart={(nativeEvent) => handleEventDragStart(event.id, nativeEvent)}
                        onDragOver={(nativeEvent) => handleEventDragOver(event.id, nativeEvent)}
                        onDrop={(nativeEvent) => handleEventDrop(event.id, nativeEvent)}
                        onDragEnd={handleEventDragEnd}
                        onClick={() => setSelectedEventId(event.id)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                            keyboardEvent.preventDefault();
                            setSelectedEventId(event.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group w-full sm:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)] flex min-h-[260px] flex-col rounded-[28px] border border-slate-700/70 bg-slate-950/35 p-5 text-left shadow-[0_12px_32px_rgba(2,6,23,0.28)] transition-transform hover:-translate-y-0.5 hover:border-sky-400/60 ${
                          String(draggedEventId) === String(event.id) ? 'rotate-[1deg] scale-[1.01] opacity-70 shadow-[0_20px_42px_rgba(2,6,23,0.42)]' : ''
                        } ${
                          String(dragOverEventId) === String(event.id) ? 'ring-2 ring-sky-400/60' : ''
                        }`}
                        style={{
                          ...(eventType
                            ? {
                                borderColor: eventTypeBorder,
                                backgroundColor: eventTypeBg,
                              }
                            : {}),
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-semibold"
                              style={
                                eventType
                                  ? {
                                      backgroundColor: eventTypeSoft,
                                      color: eventType.color,
                                    }
                                  : undefined
                              }
                            >
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            {eventType ? (
                              <span
                                className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                                style={{
                                  borderColor: eventType.color,
                                  backgroundColor: withAlpha(eventType.color, 0.12),
                                  color: eventType.color,
                                }}
                              >
                                {eventType.name}
                              </span>
                            ) : null}
                            {event.date_label ? (
                              <span className="inline-flex rounded-full bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-300">
                                {event.date_label}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-dashed border-slate-600/70 px-2.5 py-1 text-xs font-medium text-slate-400">
                                Undated
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-rose-400"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              deleteEvent.mutate(event);
                            }}
                            disabled={deleteEvent.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="mt-5 min-w-0">
                          <h3 className="text-lg font-semibold leading-6">{event.title}</h3>
                        </div>

                        <div className="mt-5 space-y-2">
                          {visibleMetrics.map((metric) => (
                            <div
                              key={metric.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/55 px-3 py-2"
                              style={eventType ? { backgroundColor: withAlpha(eventType.color, 0.08) } : undefined}
                            >
                              <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                {metric.name}
                              </span>
                              <StarRating value={getMetricScore(event, metric.id)} readOnly />
                            </div>
                          ))}
                        </div>

                        {hasExpandableContent ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                toggleMetricCard(event.id);
                              }}
                              className="rounded-full border border-slate-600/70 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-sky-400/50 hover:text-slate-100"
                            >
                              {showExpandedMetrics ? 'Collapse' : 'Expand'}
                            </button>
                            {showExpandedMetrics ? (
                              <div className="mt-3 space-y-2 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
                                {hiddenMetrics.length > 0 ? (
                                  <div className="space-y-2">
                                    {hiddenMetrics.map((metric) => (
                                      <div key={metric.id} className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                          {metric.name}
                                        </span>
                                        <StarRating value={getMetricScore(event, metric.id)} readOnly />
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {connectedCharacters.length > 0 ? (
                                  <div className="space-y-3 border-t border-slate-700/70 pt-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      Related Characters
                                    </div>
                                    <div className="grid gap-2">
                                      {connectedCharacters.map((character) => (
                                        <div
                                          key={character.id}
                                          className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2"
                                        >
                                          <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold text-white"
                                            style={{ backgroundColor: character.categoryColor }}
                                          >
                                            {character.name.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold">{character.name}</div>
                                            <div className="truncate text-xs text-slate-400">{character.categoryName}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[28px] border border-slate-700/70 bg-slate-950/30 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Metrics</div>
                <p className="mt-2 text-sm text-slate-400">
                  Global star ratings shared by every event card.
                </p>
              </div>
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setMetricDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Metric
              </Button>
            </div>

            <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {sortedMetrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">{metric.name}</div>
                    <div className="text-xs text-slate-500"></div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-rose-400"
                    onClick={() => deleteMetric.mutate(metric)}
                    disabled={deleteMetric.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-700/70 bg-slate-950/30 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Event Types</div>
                <p className="mt-2 text-sm text-slate-400">
                  Global event color coding for themed cards.
                </p>
              </div>
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setEventTypeDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Type
              </Button>
            </div>

            <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {sortedEventTypes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/35 px-4 py-5 text-sm text-slate-400">
                  No event types yet.
                </div>
              ) : (
                sortedEventTypes.map((eventType) => (
                  <div key={eventType.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-4 w-4 rounded-full"
                        style={{ backgroundColor: eventType.color }}
                      />
                      <div className="text-sm font-medium">{eventType.name}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-rose-400"
                      onClick={() => deleteEventType.mutate(eventType)}
                      disabled={deleteEventType.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </main>

      <CreateEventDialog
        open={createDialogOpen}
        onClose={setCreateDialogOpen}
        onSubmit={(data) => createEvent.mutate(data)}
        tabName={`${activeTab.name} / ${activeSubTab.name}`}
        metrics={sortedMetrics}
        eventTypes={sortedEventTypes}
        characterCategories={characterCategories}
        submitting={createEvent.isPending}
      />

      <CreateEventDialog
        open={editDialogOpen}
        onClose={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingEventId(null);
        }}
        onSubmit={(data) => {
          if (!editingEvent) return;
          updateEvent.mutate({ id: editingEvent.id, data });
        }}
        tabName={`${activeTab.name} / ${activeSubTab.name}`}
        editData={editingEvent}
        metrics={sortedMetrics}
        eventTypes={sortedEventTypes}
        characterCategories={characterCategories}
        submitting={updateEvent.isPending}
      />

      <CreateMetricDialog
        open={metricDialogOpen}
        onClose={setMetricDialogOpen}
        onSubmit={(data) => createMetric.mutate(data)}
        submitting={createMetric.isPending}
      />

      <CreateEventTypeDialog
        open={eventTypeDialogOpen}
        onClose={setEventTypeDialogOpen}
        onSubmit={(data) => createEventType.mutate(data)}
        submitting={createEventType.isPending}
      />

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="sm:max-w-2xl h-[min(620px,82vh)] overflow-hidden">
          {selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">{selectedEvent.title}</DialogTitle>
                <DialogDescription className="pt-1">
                  {selectedEvent.date_label || 'Undated event'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-4">
                {getEventType(selectedEvent) ? (
                  <div
                    className="inline-flex self-start rounded-full border px-3 py-1.5 text-sm font-medium"
                    style={{
                      borderColor: getEventType(selectedEvent).color,
                      backgroundColor: withAlpha(getEventType(selectedEvent).color, 0.12),
                      color: getEventType(selectedEvent).color,
                    }}
                  >
                    {getEventType(selectedEvent).name}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {sortedMetrics.map((metric) => (
                      <div key={metric.id} className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {metric.name}
                        </span>
                        <StarRating value={getMetricScore(selectedEvent, metric.id)} readOnly />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setEditingEventId(selectedEvent.id);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Event
                  </Button>
                </div>

                {getConnectedCharacters(selectedEvent).length > 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Related Characters
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {getConnectedCharacters(selectedEvent).map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-3 py-3"
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
                            style={{ backgroundColor: character.categoryColor }}
                          >
                            {character.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{character.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{character.categoryName}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 rounded-2xl border border-border/60 bg-muted/20 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Notes
                  </div>
                  <div className="mt-3 h-full max-h-[360px] overflow-y-auto pr-2">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {selectedEvent.description || 'No notes yet. This event does not have any extended details yet.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
