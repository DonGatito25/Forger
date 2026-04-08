import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Paintbrush } from 'lucide-react';
import { COLOR_OPTIONS } from '@/lib/colors';

export default function TagsDialog({ open, onClose, tags, onCreate, onUpdate, onDelete }) {
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (open) {
      setDrafts(tags.map((t) => ({ ...t })));
      setSelectedId(tags[0]?.id || null);
    }
  }, [open, tags]);

  const updateDraft = (id, field, value) => {
    setDrafts((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSave = (tag) => {
    if (!tag.name.trim()) return;
    onUpdate(tag.id, { name: tag.name.trim(), color: tag.color });
  };

  const handleAdd = () => {
    const color = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    onCreate({ name: 'New Tag', color });
  };

  const selectedTag = drafts.find((t) => t.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Tags</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1.6fr_1fr] gap-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All Tags
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No tags yet. Click “Add” to create your first tag.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 px-4 w-10">Color</th>
                      <th className="py-2 px-4">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((tag) => (
                      <tr
                        key={tag.id}
                        onClick={() => setSelectedId(tag.id)}
                        className={`cursor-pointer border-b last:border-b-0 hover:bg-muted/40 ${
                          selectedId === tag.id ? 'bg-muted/50' : ''
                        }`}
                      >
                        <td className="py-2 px-4">
                          <span
                            className="inline-flex h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        </td>
                        <td className="py-2 px-4 font-medium">{tag.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Paintbrush className="w-4 h-4" />
              Edit Tag
            </div>
            {!selectedTag ? (
              <div className="text-sm text-muted-foreground">Select a tag to edit.</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={selectedTag.name}
                    onChange={(e) => updateDraft(selectedTag.id, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateDraft(selectedTag.id, 'color', c)}
                        className="w-7 h-7 rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: c,
                          boxShadow: selectedTag.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                          transform: selectedTag.color === c ? 'scale(1.08)' : 'scale(1)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDelete(selectedTag)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button type="button" onClick={() => handleSave(selectedTag)}>
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="ghost" onClick={() => onClose(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
