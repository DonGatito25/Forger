import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from 'lucide-react';
import { dataClient } from '@/api/dataClient';
import AttributeEditor from './AttributeEditor';

export default function CreateCharacterDialog({ open, onClose, onSubmit, categories, editData, defaultCategoryId }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    if (open) {
      setName(editData?.name || '');
      setDescription(editData?.description || '');
      setDetails(editData?.details || '');
      setCategoryId(editData?.category_id || defaultCategoryId || '');
      setImageUrl(editData?.image_url || '');
      setAttributes(editData?.attributes || []);
    }
  }, [open, editData, defaultCategoryId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await dataClient.uploads.uploadImage(file);
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    onSubmit({ name: name.trim(), description: description.trim(), details: details.trim(), category_id: categoryId, image_url: imageUrl, attributes: attributes.filter(a => a.key.trim()) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {editData ? 'Edit Character' : 'New Character'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Image <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {imageUrl ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden group">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors w-fit">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Upload image'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Character name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea placeholder="A short description..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-20 resize-none" />
          </div>

          <div className="space-y-2">
            <Label>Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea placeholder="Backstory, traits, abilities, notes..." value={details} onChange={(e) => setDetails(e.target.value)} className="h-28 resize-none" />
          </div>

          <AttributeEditor attributes={attributes} onChange={setAttributes} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || !categoryId}>
              {editData ? 'Save Changes' : 'Add Character'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
