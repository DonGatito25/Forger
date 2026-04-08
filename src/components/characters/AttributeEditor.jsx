import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AttributeEditor({ attributes, onChange }) {
  const typeOptions = [
    { value: 'custom', label: 'Custom' },
    { value: 'number', label: 'Number' },
    { value: 'bool', label: 'Bool' },
    { value: 'date', label: 'Date' },
    { value: 'multiselect', label: 'Multi-select' },
  ];

  const addAttribute = () => {
    onChange([...attributes, { key: '', value: '', type: 'custom' }]);
  };

  const updateAttribute = (index, field, val) => {
    const updated = attributes.map((a, i) => i === index ? { ...a, [field]: val } : a);
    onChange(updated);
  };

  const normalizeValueForType = (type, value) => {
    if (type === 'number') {
      if (value === '' || value === null || value === undefined) return '';
      const n = Number(value);
      return Number.isNaN(n) ? '' : n;
    }
    if (type === 'bool') {
      return Boolean(value);
    }
    if (type === 'date') {
      return value || '';
    }
    if (type === 'multiselect') {
      if (Array.isArray(value)) return value;
      if (!value) return [];
      return String(value)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value ?? '';
  };

  const getDisplayValue = (type, value) => {
    if (type === 'multiselect') {
      if (Array.isArray(value)) return value.join(', ');
      return value || '';
    }
    if (type === 'bool') {
      return Boolean(value);
    }
    if (type === 'number') {
      return value === 0 ? 0 : value || '';
    }
    return value || '';
  };

  const handleTypeChange = (index, newType) => {
    const current = attributes[index] || {};
    const nextValue = normalizeValueForType(newType, current.value);
    updateAttribute(index, 'type', newType);
    updateAttribute(index, 'value', nextValue);
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
              <Select
                value={attr.type || 'custom'}
                onValueChange={(value) => handleTypeChange(i, value)}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attr.type === 'bool' ? (
                <label className="flex items-center gap-2 flex-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(attr.value)}
                    onChange={(e) => updateAttribute(i, 'value', e.target.checked)}
                    className="h-4 w-4"
                  />
                  {Boolean(attr.value) ? 'True' : 'False'}
                </label>
              ) : (
                <Input
                  placeholder={
                    attr.type === 'number'
                      ? 'Number (e.g. 24)'
                      : attr.type === 'date'
                      ? 'Date'
                      : attr.type === 'multiselect'
                      ? 'Comma-separated'
                      : 'Value (e.g. 24)'
                  }
                  type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                  value={getDisplayValue(attr.type, attr.value)}
                  onChange={(e) =>
                    updateAttribute(
                      i,
                      'value',
                      normalizeValueForType(attr.type, e.target.value)
                    )
                  }
                  className="flex-1 text-sm h-8"
                />
              )}
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
