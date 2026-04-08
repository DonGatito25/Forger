import React, { useState } from 'react';
import { dataClient } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CategoryColumn from '@/components/characters/CategoryColumn';
import CreateCategoryDialog from '@/components/characters/CreateCategoryDialog';
import CreateCharacterDialog from '@/components/characters/CreateCharacterDialog';
import CreateTabDialog from '@/components/tabs/CreateTabDialog';
import EmptyState from '@/components/characters/EmptyState';
import TagsDialog from '@/components/tags/TagsDialog';

export default function Home() {
  const queryClient = useQueryClient();

  const [activeTabId, setActiveTabId] = useState(null);
  const [tabDialog, setTabDialog] = useState({ open: false, editData: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, editData: null });
  const [characterDialog, setCharacterDialog] = useState({ open: false, editData: null, defaultCategoryId: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);

  const { data: tabs = [], isLoading: loadingTabs } = useQuery({
    queryKey: ['tabs'],
    queryFn: () => dataClient.entities.Tab.list('sort_order'),
    onSuccess: (data) => {
      if (data.length > 0 && !activeTabId) setActiveTabId(data[0].id);
    }
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dataClient.entities.Category.list('sort_order'),
  });

  const { data: characters = [], isLoading: loadingChars } = useQuery({
    queryKey: ['characters'],
    queryFn: () => dataClient.entities.Character.list('sort_order'),
  });
  const { data: allTags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => dataClient.entities.Tag.list('name'),
  });
  const tags = allTags.filter((tag) => String(tag.tab_id) === String(activeTabId));

  // Set active tab once data loads
  React.useEffect(() => {
    if (tabs.length > 0 && !activeTabId) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const activeCategories = categories.filter(c => c.tab_id === activeTabId);
  const activeCharacters = characters.filter(ch => {
    const cat = categories.find(c => c.id === ch.category_id);
    return cat?.tab_id === activeTabId;
  });
  const getCategoryCharacters = (categoryId) => {
    return activeCharacters
      .filter((char) => String(char.category_id) === String(categoryId))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  // Tab mutations
  const createTab = useMutation({
    mutationFn: (data) => dataClient.entities.Tab.create({ ...data, sort_order: tabs.length }),
    onSuccess: (newTab) => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setTabDialog({ open: false, editData: null });
      setActiveTabId(newTab.id);
    },
  });

  const updateTab = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Tab.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setTabDialog({ open: false, editData: null });
    },
  });

  const deleteTab = useMutation({
    mutationFn: async (tab) => {
      const catsInTab = categories.filter(c => c.tab_id === tab.id);
      for (const cat of catsInTab) {
        const charsInCat = characters.filter(ch => ch.category_id === cat.id);
        for (const ch of charsInCat) await dataClient.entities.Character.delete(ch.id);
        await dataClient.entities.Category.delete(cat.id);
      }
      await dataClient.entities.Tab.delete(tab.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setDeleteConfirm({ open: false, type: null, item: null });
      setActiveTabId(null);
    },
  });

  // Category mutations
  const createCategory = useMutation({
    mutationFn: (data) => dataClient.entities.Category.create({ ...data, tab_id: activeTabId, sort_order: activeCategories.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryDialog({ open: false, editData: null });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryDialog({ open: false, editData: null });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (category) => {
      const charsInCat = characters.filter(c => c.category_id === category.id);
      for (const ch of charsInCat) await dataClient.entities.Character.delete(ch.id);
      await dataClient.entities.Category.delete(category.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setDeleteConfirm({ open: false, type: null, item: null });
    },
  });

  // Character mutations
  const createCharacter = useMutation({
    mutationFn: (data) => {
      const catChars = characters.filter(c => c.category_id === data.category_id);
      return dataClient.entities.Character.create({ ...data, sort_order: catChars.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setCharacterDialog({ open: false, editData: null, defaultCategoryId: null });
    },
  });

  const updateCharacter = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Character.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setCharacterDialog({ open: false, editData: null, defaultCategoryId: null });
    },
  });

  const deleteCharacter = useMutation({
    mutationFn: (ch) => dataClient.entities.Character.delete(ch.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setDeleteConfirm({ open: false, type: null, item: null });
    },
  });

  const createTag = useMutation({
    mutationFn: (data) => dataClient.entities.Tag.create({ ...data, tab_id: activeTabId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const updateTag = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.Tag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (tag) => {
      const tagId = tag.id;
      const affected = characters.filter(
        (ch) =>
          Array.isArray(ch.tag_ids) &&
          ch.tag_ids.includes(tagId) &&
          String(ch.category_id) &&
          String(categories.find((c) => c.id === ch.category_id)?.tab_id) === String(activeTabId)
      );
      await Promise.all(
        affected.map((ch) =>
          dataClient.entities.Character.update(ch.id, {
            tag_ids: ch.tag_ids.filter((id) => id !== tagId),
          })
        )
      );
      await dataClient.entities.Tag.delete(tagId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });

  const moveCharacter = useMutation({
    mutationFn: async ({ character, newCategoryId }) => {
      const sourceId = String(character.category_id);
      const destId = String(newCategoryId);
      if (sourceId === destId) return character;

      const sourceList = getCategoryCharacters(sourceId).filter((c) => String(c.id) !== String(character.id));
      const destList = getCategoryCharacters(destId);

      const updates = [
        ...sourceList.map((item, index) => dataClient.entities.Character.update(item.id, { sort_order: index })),
        ...destList.map((item, index) => dataClient.entities.Character.update(item.id, { sort_order: index })),
        dataClient.entities.Character.update(character.id, { category_id: newCategoryId, sort_order: destList.length }),
      ];
      await Promise.all(updates);
      return character;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  });

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceId = String(source.droppableId);
    const destId = String(destination.droppableId);

    const sourceList = getCategoryCharacters(sourceId);
    const destList = sourceId === destId ? sourceList : getCategoryCharacters(destId);
    const moving = sourceList.find((item) => String(item.id) === String(draggableId));
    if (!moving) return;

    const newSource = sourceList.filter((item) => String(item.id) !== String(draggableId));
    const newDest = sourceId === destId ? [...newSource] : [...destList];
    newDest.splice(destination.index, 0, { ...moving, category_id: destId });

    const updates = [];
    if (sourceId === destId) {
      newDest.forEach((item, index) => {
        updates.push(dataClient.entities.Character.update(item.id, { sort_order: index }));
      });
    } else {
      newSource.forEach((item, index) => {
        updates.push(dataClient.entities.Character.update(item.id, { sort_order: index }));
      });
      newDest.forEach((item, index) => {
        updates.push(
          dataClient.entities.Character.update(item.id, { sort_order: index, category_id: destId })
        );
      });
    }

    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['characters'] });
  };

  const handleTabSubmit = (data) => {
    if (tabDialog.editData) updateTab.mutate({ id: tabDialog.editData.id, data });
    else createTab.mutate(data);
  };

  const handleCategorySubmit = (data) => {
    if (categoryDialog.editData) updateCategory.mutate({ id: categoryDialog.editData.id, data });
    else createCategory.mutate(data);
  };

  const handleCharacterSubmit = (data) => {
    if (characterDialog.editData) updateCharacter.mutate({ id: characterDialog.editData.id, data });
    else createCharacter.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.type === 'tab') deleteTab.mutate(deleteConfirm.item);
    else if (deleteConfirm.type === 'category') deleteCategory.mutate(deleteConfirm.item);
    else deleteCharacter.mutate(deleteConfirm.item);
  };

  if (loadingTabs || loadingCats || loadingChars || loadingTags) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-body flex flex-col">
      {/* Top header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight flex-shrink-0">Forger</h1>

          {/* Tab bar */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex-shrink-0 relative group">
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTabId === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.name}
                </button>
                {activeTabId === tab.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-primary/80 hover:bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronDown className="w-2.5 h-2.5 text-primary-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setTabDialog({ open: true, editData: tab })}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm({ open: true, type: 'tab', item: tab })}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTabDialog({ open: true, editData: null })}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground gap-1 h-8"
            >
              <Plus className="w-3.5 h-3.5" /> New Tab
            </Button>
          </div>

          {/* Action buttons */}
          {activeTabId && (
            <div className="flex gap-2 flex-shrink-0">
              {activeCategories.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCharacterDialog({ open: true, editData: null, defaultCategoryId: null })}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Character</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setCategoryDialog({ open: true, editData: null })}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Category</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {tabs.length === 0 ? (
          <EmptyState type="no-tabs" onAction={() => setTabDialog({ open: true, editData: null })} />
        ) : !activeTabId ? null : activeCategories.length === 0 ? (
          <EmptyState type="no-categories" onAction={() => setCategoryDialog({ open: true, editData: null })} />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-5 overflow-x-auto pb-6">
              {activeCategories.map((cat) => (
                <CategoryColumn
                  key={cat.id}
                  category={cat}
                  characters={getCategoryCharacters(cat.id)}
                  allCategories={activeCategories}
                  tags={tags}
                  onAddCharacter={(catId) => setCharacterDialog({ open: true, editData: null, defaultCategoryId: catId })}
                  onEditCategory={(cat) => setCategoryDialog({ open: true, editData: cat })}
                  onDeleteCategory={(cat) => setDeleteConfirm({ open: true, type: 'category', item: cat })}
                  onEditCharacter={(char) => setCharacterDialog({ open: true, editData: char, defaultCategoryId: null })}
                  onDeleteCharacter={(char) => setDeleteConfirm({ open: true, type: 'character', item: char })}
                  onMoveCharacter={(char, catId) => moveCharacter.mutate({ character: char, newCategoryId: catId })}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </main>

      {/* Dialogs */}
      <CreateTabDialog
        open={tabDialog.open}
        onClose={() => setTabDialog({ open: false, editData: null })}
        onSubmit={handleTabSubmit}
        editData={tabDialog.editData}
      />
      <CreateCategoryDialog
        open={categoryDialog.open}
        onClose={() => setCategoryDialog({ open: false, editData: null })}
        onSubmit={handleCategorySubmit}
        editData={categoryDialog.editData}
      />
      <CreateCharacterDialog
        open={characterDialog.open}
        onClose={() => setCharacterDialog({ open: false, editData: null, defaultCategoryId: null })}
        onSubmit={handleCharacterSubmit}
        categories={activeCategories}
        tags={tags}
        editData={characterDialog.editData}
        defaultCategoryId={characterDialog.defaultCategoryId}
      />

      <TagsDialog
        open={tagsDialogOpen}
        onClose={() => setTagsDialogOpen(false)}
        tags={tags}
        onCreate={(data) => createTag.mutate(data)}
        onUpdate={(id, data) => updateTag.mutate({ id, data })}
        onDelete={(tag) => deleteTag.mutate(tag)}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm.type === 'tab' ? 'Tab' : deleteConfirm.type === 'category' ? 'Category' : 'Character'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.type === 'tab'
                ? 'This will permanently delete this tab, all its categories, and all characters inside them.'
                : deleteConfirm.type === 'category'
                ? 'This will permanently delete this category and all characters inside it.'
                : 'This will permanently delete this character.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        type="button"
        variant="secondary"
        onClick={() => activeTabId && setTagsDialogOpen(true)}
        disabled={!activeTabId}
        className="fixed bottom-6 left-6 shadow-lg"
      >
        Tags
      </Button>
    </div>
  );
}
