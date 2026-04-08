import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { COLOR_OPTIONS } from '@/lib/colors';

export default function CreateCategoryDialog({ open, onClose, onSubmit, editData }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    if (open) {
      setName(editData?.name || '');
      setDescription(editData?.description || '');
      setColor(editData?.color || COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    }
  }, [open, editData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {editData ? 'Edit Category' : 'New Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Heroes, Villains, Neutral..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="What is this category for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>
              {editData ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
