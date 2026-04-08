import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Pencil, Trash2, MoveRight, User, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function CharacterCard({ character, categories, onEdit, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(false);
  const currentCategory = categories.find(c => c.id === character.category_id);
  const otherCategories = categories.filter(c => c.id !== character.category_id);
  const hasAttributes = character.attributes?.length > 0;
  const hasDetails = !!character.details;
  const hasMore = hasAttributes || hasDetails;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card rounded-lg border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: currentCategory?.color ? `${currentCategory.color}20` : 'hsl(var(--muted))' }}
        >
          {character.image_url ? (
            <img src={character.image_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" style={{ color: currentCategory?.color || 'hsl(var(--muted-foreground))' }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-semibold text-sm truncate">{character.name}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(character)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                {otherCategories.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <MoveRight className="w-3.5 h-3.5 mr-2" /> Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {otherCategories.map((cat) => (
                        <DropdownMenuItem key={cat.id} onClick={() => onMove(character, cat.id)}>
                          <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={() => onDelete(character)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {character.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{character.description}</p>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 transition-colors border-t border-border/30"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && hasMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 space-y-3">
              {/* Attributes */}
              {hasAttributes && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {character.attributes.map((attr, i) => (
                    <div key={i} className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium truncate">
                        {attr.key}
                      </span>
                      <span className="text-xs text-foreground truncate">{attr.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              {hasDetails && (
                <p className="text-xs text-muted-foreground/80 bg-muted/40 rounded-md px-2.5 py-2 leading-relaxed">
                  {character.details}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}