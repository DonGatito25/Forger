import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Layers, FolderOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function EmptyState({ type, onAction }) {
  if (type === 'no-tabs') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 px-6 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <FolderOpen className="w-9 h-9 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-semibold mb-2">Create Your First Tab</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Tabs are your top-level projects — a novel, a campaign, a game. Each tab holds its own categories and characters.
        </p>
        <Button size="lg" onClick={onAction} className="gap-2">
          <Plus className="w-4 h-4" />
          New Tab
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Layers className="w-9 h-9 text-primary" />
      </div>
      <h2 className="font-heading text-2xl font-semibold mb-2">No Categories Yet</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Create a category to start sorting characters. Name them anything — factions, classes, alignments, teams.
      </p>
      <Button size="lg" onClick={onAction} className="gap-2">
        <Plus className="w-4 h-4" />
        Create First Category
      </Button>
    </motion.div>
  );
}