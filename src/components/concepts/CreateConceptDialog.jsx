import React, { useEffect, useMemo, useState } from 'react';

import { COLOR_OPTIONS } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DEFINITION_LIMIT = 350;

export default function CreateConceptDialog({
  open,
  onClose,
  onSubmit,
  editData,
  parentConcept,
  tabName,
  submitting = false,
}) {
  const [title, setTitle] = useState('');
  const [definition, setDefinition] = useState('');
  const [explanation, setExplanation] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const isRootConcept = editData ? !editData.parent_id : !parentConcept;

  useEffect(() => {
    if (!open) return;
    setTitle(editData?.title || '');
    setDefinition(editData?.definition || '');
    setExplanation(editData?.explanation || '');
    setColor(editData?.color || COLOR_OPTIONS[0]);
  }, [open, editData]);

  const titleText = useMemo(() => {
    if (editData) return 'Edit Concept';
    if (parentConcept) return 'New Sub-Concept';
    return 'New Concept';
  }, [editData, parentConcept]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim() || !definition.trim()) return;

    onSubmit({
      title: title.trim(),
      definition: definition.trim().slice(0, DEFINITION_LIMIT),
      explanation: explanation.trim(),
      color: isRootConcept ? color : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{titleText}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {parentConcept
              ? `Adding under ${parentConcept.title}`
              : `Attached to ${tabName || 'the current tab'}`}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="concept-title">Title</Label>
            <Input
              id="concept-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Magic system, faction doctrine, forbidden law..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="concept-definition">Definition</Label>
              <span className="text-xs text-muted-foreground">{definition.length}/{DEFINITION_LIMIT}</span>
            </div>
            <Textarea
              id="concept-definition"
              value={definition}
              onChange={(event) => setDefinition(event.target.value.slice(0, DEFINITION_LIMIT))}
              placeholder="A sharp, compact definition of what this concept is."
              className="h-24 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept-explanation">Expanded Explanation</Label>
            <Textarea
              id="concept-explanation"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder="Optional deeper notes, nuance, exceptions, examples, or lore."
              className="h-36 resize-none"
            />
          </div>

          {isRootConcept ? (
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => {
                  const selected = option === color;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-105 ${
                        selected ? 'border-foreground ring-2 ring-primary/30' : 'border-border/60'
                      }`}
                      style={{ backgroundColor: option }}
                      aria-label={`Select ${option}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Color</Label>
              <p className="text-sm text-muted-foreground">
                Sub-concepts use the shared tree styling. Only root concepts are color-coded.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !definition.trim()}>
              {editData ? 'Save Changes' : parentConcept ? 'Add Sub-Concept' : 'Add Concept'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
