import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/timeline/StarRating';

const emptyDraft = {
  title: '',
  date_label: '',
  description: '',
  metric_scores: {},
  connected_character_ids: [],
  event_type_id: null,
};

export default function CreateEventDialog({
  open,
  onClose,
  onSubmit,
  tabName,
  editData = null,
  metrics = [],
  eventTypes = [],
  characterCategories = [],
  submitting = false,
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft({
        title: editData?.title || '',
        date_label: editData?.date_label || '',
        description: editData?.description || '',
        metric_scores: editData?.metric_scores || {},
        connected_character_ids: Array.isArray(editData?.connected_character_ids) ? editData.connected_character_ids : [],
        event_type_id: editData?.event_type_id || null,
      });
      setSelectedCategoryId(characterCategories[0]?.id || null);
    }
  }, [open, editData, characterCategories]);

  const activeCharacterCategory =
    characterCategories.find((category) => String(category.id) === String(selectedCategoryId)) || null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;

    onSubmit({
      title: draft.title.trim(),
      date_label: draft.date_label.trim(),
      description: draft.description.trim(),
      metric_scores: draft.metric_scores,
      connected_character_ids: draft.connected_character_ids,
      event_type_id: draft.event_type_id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[min(920px,calc(100vw-2rem))] max-w-[920px] max-h-[88vh] overflow-hidden p-0">
        <div className="flex max-h-[88vh] flex-col">
          <div className="border-b border-border/60 px-6 py-5">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{editData ? 'Edit Event' : 'New Event'}</DialogTitle>
          {tabName ? (
            <p className="text-sm text-muted-foreground">
              {editData ? `Update the event for ${tabName}.` : `This event will be added to ${tabName}.`}
            </p>
          ) : null}
        </DialogHeader>
          </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Festival of Ashes"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Date / Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="Year 3, Late Winter"
                  value={draft.date_label}
                  onChange={(event) => setDraft((current) => ({ ...current, date_label: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="What happens here, and why does it matter?"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[120px] resize-none"
              />
            </div>
            {eventTypes.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Event Type
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, event_type_id: null }))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      !draft.event_type_id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    None
                  </button>
                  {eventTypes.map((eventType) => {
                    const selected = String(draft.event_type_id) === String(eventType.id);
                    return (
                      <button
                        key={eventType.id}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, event_type_id: eventType.id }))}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          selected ? 'text-white' : 'bg-background hover:text-foreground'
                        }`}
                        style={{
                          borderColor: eventType.color,
                          backgroundColor: selected ? eventType.color : 'transparent',
                          color: selected ? '#ffffff' : eventType.color,
                        }}
                      >
                        {eventType.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          {metrics.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Metrics
              </div>
              <div className="space-y-3">
                {metrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between gap-4 rounded-xl bg-background/80 px-3 py-2">
                    <div className="text-sm font-medium">{metric.name}</div>
                    <StarRating
                      value={draft.metric_scores?.[metric.id] || 0}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          metric_scores: {
                            ...(current.metric_scores || {}),
                            [metric.id]: value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {characterCategories.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Connect Characters
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {characterCategories.map((category) => {
                    const isActive = String(category.id) === String(selectedCategoryId);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
                {activeCharacterCategory ? (
                  <section className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: activeCharacterCategory.color || '#94a3b8' }}
                      />
                      <span>{activeCharacterCategory.name}</span>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {activeCharacterCategory.characters.map((character) => {
                        const selected = draft.connected_character_ids.includes(character.id);
                        return (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                connected_character_ids: selected
                                  ? current.connected_character_ids.filter((id) => id !== character.id)
                                  : [...current.connected_character_ids, character.id],
                              }))
                            }
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            {character.name}
                          </button>
                        );
                        })}
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}
          </div>
          <div className="border-t border-border/60 px-6 py-4">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!draft.title.trim() || submitting}>
                {editData ? 'Save Changes' : 'Create Event'}
              </Button>
            </DialogFooter>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
