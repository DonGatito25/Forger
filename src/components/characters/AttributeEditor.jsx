import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AttributeEditor({ attributes, onChange }) {
  const addAttribute = () => {
    onChange([...attributes, { key: '', value: '' }]);
  };

  const updateAttribute = (index, field, val) => {
    const updated = attributes.map((a, i) => i === index ? { ...a, [field]: val } : a);
    onChange(updated);
  };

  const removeAttribute = (index) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>
        Custom Attributes{' '}
        <span className="text-muted-foreground text-xs">(optional)</span>
      </Label>

      {attributes.length > 0 && (
        <div className="space-y-2">
          {attributes.map((attr, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Label (e.g. Age)"
                value={attr.key}
                onChange={(e) => updateAttribute(i, 'key', e.target.value)}
                className="w-36 flex-shrink-0 text-sm h-8"
              />
              <Input
                placeholder="Value (e.g. 24)"
                value={attr.value}
                onChange={(e) => updateAttribute(i, 'value', e.target.value)}
                className="flex-1 text-sm h-8"
              />
              <button
                type="button"
                onClick={() => removeAttribute(i)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addAttribute}
        className="gap-1.5 h-8 text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Attribute
      </Button>
    </div>
  );
}