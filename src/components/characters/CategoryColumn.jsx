import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CharacterCard from './CharacterCard';

export default function CategoryColumn({
  category,
  characters,
  allCategories,
  tags,
  onAddCharacter,
  onEditCategory,
  onDeleteCategory,
  onEditCharacter,
  onDeleteCharacter,
  onMoveCharacter
}) {
  const categoryCharacters = characters.filter(c => c.category_id === category.id);
  const droppableId = String(category.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary/30 rounded-xl border border-border/40 flex flex-col min-w-[300px] max-w-[360px] w-full"
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-base truncate">{category.name}</h3>
            {category.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{category.description}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
            {categoryCharacters.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditCategory(category)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Category
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteCategory(category)} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Characters list */}
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-3 pb-3 space-y-2 overflow-y-auto max-h-[60vh] ${
              snapshot.isDraggingOver ? 'bg-primary/5' : ''
            }`}
          >
            <AnimatePresence mode="popLayout">
              {categoryCharacters.map((char, index) => (
                <Draggable key={char.id} draggableId={String(char.id)} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={dragSnapshot.isDragging ? 'relative z-50' : ''}
                    >
                      <CharacterCard
                        character={char}
                        categories={allCategories}
                        tags={tags}
                        onEdit={onEditCharacter}
                        onDelete={onDeleteCharacter}
                        onMove={onMoveCharacter}
                        isDragging={dragSnapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}

            {categoryCharacters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground/60">
                <p className="text-sm">No characters yet</p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Add button */}
      <div className="p-3 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground h-9"
          onClick={() => onAddCharacter(category.id)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Character
        </Button>
      </div>
    </motion.div>
  );
}
