import React from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, Monitor, Moon, Palette, RotateCcw, Sun, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useAppSettings } from '@/components/app/AppSettingsProvider';
import { dataClient } from '@/api/dataClient';
import { toast } from '@/components/ui/use-toast';
import { ACCENT_COLOR_OPTIONS } from '@/lib/app-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DIAGRAM_STORAGE_KEY,
  DIAGRAM_TOOL_STORAGE_KEY,
  EXPORT_FILE_VERSION,
  CATALOG_EXPORT_FILE_TYPE,
  parseCatalogImportFile,
  sanitizeExportFileName,
} from '@/lib/export-files';
import { buildReturnState } from '@/lib/subtabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const THEME_OPTIONS = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Keeps the app in its moody default look.',
    icon: Moon,
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Switches the shell and controls to a bright workspace.',
    icon: Sun,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follows your device theme automatically.',
    icon: Monitor,
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    settings,
    effectiveTheme,
    accentOption,
    subAccentOption,
    setThemeMode,
    setAccentId,
    setSubAccentId,
    resetSettings,
  } = useAppSettings();
  const [workspaceExportName, setWorkspaceExportName] = React.useState('forger-workspace');
  const [exportingWorkspace, setExportingWorkspace] = React.useState(false);
  const [importingWorkspace, setImportingWorkspace] = React.useState(false);
  const [catalogImportConfirmOpen, setCatalogImportConfirmOpen] = React.useState(false);
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = React.useState(false);
  const [clearingData, setClearingData] = React.useState(false);
  const [pendingCatalogImportFile, setPendingCatalogImportFile] = React.useState(null);
  const importFileInputRef = React.useRef(null);
  const isCatalogEmpty = React.useMemo(() => {
    const store = dataClient.storage.read();
    const hasStoreData = Object.values(store || {}).some((items) => Array.isArray(items) && items.length > 0);
    if (hasStoreData) return false;

    if (typeof window === 'undefined') return true;
    try {
      const diagramState = JSON.parse(window.localStorage.getItem(DIAGRAM_STORAGE_KEY) || 'null');
      const diagramTools = JSON.parse(window.localStorage.getItem(DIAGRAM_TOOL_STORAGE_KEY) || 'null');
      return !(
        Array.isArray(diagramState?.canvases) && diagramState.canvases.length > 0 ||
        Array.isArray(diagramState?.nodes) && diagramState.nodes.length > 0 ||
        Array.isArray(diagramState?.edges) && diagramState.edges.length > 0 ||
        (diagramState?.activeCanvasByScope && Object.keys(diagramState.activeCanvasByScope).length > 0) ||
        (Array.isArray(diagramTools) && diagramTools.length > 0)
      );
    } catch {
      return true;
    }
  }, [importingWorkspace, exportingWorkspace]);

  const handleExportWorkspace = async () => {
    setExportingWorkspace(true);
    try {
      const [tabs, subTabs, categories, characters, tags, concepts, events, metrics, eventTypes] = await Promise.all([
        dataClient.entities.Tab.list('sort_order'),
        dataClient.entities.SubTab.list('sort_order'),
        dataClient.entities.Category.list('sort_order'),
        dataClient.entities.Character.list('sort_order'),
        dataClient.entities.Tag.list('name'),
        dataClient.entities.Concept.list('sort_order'),
        dataClient.entities.Event.list('sort_order'),
        dataClient.entities.Metric.list('sort_order'),
        dataClient.entities.EventType.list('sort_order'),
      ]);

      const diagramStateRaw =
        typeof window !== 'undefined' ? window.localStorage.getItem(DIAGRAM_STORAGE_KEY) : null;
      const diagramToolsRaw =
        typeof window !== 'undefined' ? window.localStorage.getItem(DIAGRAM_TOOL_STORAGE_KEY) : null;

      const payload = {
        fileType: CATALOG_EXPORT_FILE_TYPE,
        version: EXPORT_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          tabs,
          subTabs,
          categories,
          characters,
          tags,
          concepts,
          events,
          metrics,
          eventTypes,
          diagrams: diagramStateRaw ? JSON.parse(diagramStateRaw) : { canvases: [], activeCanvasByScope: {}, nodes: [], edges: [] },
          diagramToolGroups: diagramToolsRaw ? JSON.parse(diagramToolsRaw) : [],
        },
      };

      const fileBaseName = sanitizeExportFileName(workspaceExportName, 'forger-workspace');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileBaseName}.cat`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Catalog exported',
        description: `${fileBaseName}.cat was downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Global export failed',
        description: error?.message || 'Something went wrong while exporting catalog.',
        variant: 'destructive',
      });
    } finally {
      setExportingWorkspace(false);
    }
  };

  const handleImportWorkspace = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!isCatalogEmpty) {
      setPendingCatalogImportFile(file);
      setCatalogImportConfirmOpen(true);
      return;
    }

    await importCatalogFile(file);
    input.value = '';
  };

  const importCatalogFile = async (file) => {
    if (!file) return;

    setImportingWorkspace(true);
    try {
      const payload = await parseCatalogImportFile(file);
      const nextStore = {
        Tab: Array.isArray(payload.data?.tabs) ? payload.data.tabs : [],
        SubTab: Array.isArray(payload.data?.subTabs) ? payload.data.subTabs : [],
        Category: Array.isArray(payload.data?.categories) ? payload.data.categories : [],
        Character: Array.isArray(payload.data?.characters) ? payload.data.characters : [],
        Tag: Array.isArray(payload.data?.tags) ? payload.data.tags : [],
        Event: Array.isArray(payload.data?.events) ? payload.data.events : [],
        Metric: Array.isArray(payload.data?.metrics) ? payload.data.metrics : [],
        EventType: Array.isArray(payload.data?.eventTypes) ? payload.data.eventTypes : [],
        Concept: Array.isArray(payload.data?.concepts) ? payload.data.concepts : [],
      };
      const nextDiagramState =
        payload.data?.diagrams && typeof payload.data.diagrams === 'object'
          ? payload.data.diagrams
          : { canvases: [], activeCanvasByScope: {}, nodes: [], edges: [] };
      const nextDiagramToolGroups = Array.isArray(payload.data?.diagramToolGroups) ? payload.data.diagramToolGroups : [];

      dataClient.storage.write(nextStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(nextDiagramState));
        window.localStorage.setItem(DIAGRAM_TOOL_STORAGE_KEY, JSON.stringify(nextDiagramToolGroups));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tabs'] }),
        queryClient.invalidateQueries({ queryKey: ['sub-tabs'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['concepts'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['event-types'] }),
      ]);

      toast({
        title: 'Catalog imported',
        description: 'Catalog was replaced successfully.',
      });

      const firstTab = nextStore.Tab
        .slice()
        .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))[0] || null;
      const firstSubTab = nextStore.SubTab
        .filter((subTab) => String(subTab.tab_id) === String(firstTab?.id))
        .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))[0] || null;

      if (firstTab && firstSubTab) {
        navigate('/', { state: buildReturnState(firstTab.id, firstSubTab.id) });
      }
    } catch (error) {
      toast({
        title: 'Global import failed',
        description: error?.message || 'Something went wrong while importing this catalog.',
        variant: 'destructive',
      });
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      setPendingCatalogImportFile(null);
      setCatalogImportConfirmOpen(false);
      setImportingWorkspace(false);
    }
  };

  const cancelCatalogImportReplacement = () => {
    if (importFileInputRef.current) importFileInputRef.current.value = '';
    setPendingCatalogImportFile(null);
    setCatalogImportConfirmOpen(false);
  };

  const handleClearData = async () => {
    setClearingData(true);
    try {
      dataClient.storage.write({
        Tab: [],
        SubTab: [],
        Category: [],
        Character: [],
        Tag: [],
        Event: [],
        Metric: [],
        EventType: [],
        Concept: [],
      });

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DIAGRAM_STORAGE_KEY);
        window.localStorage.removeItem(DIAGRAM_TOOL_STORAGE_KEY);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tabs'] }),
        queryClient.invalidateQueries({ queryKey: ['sub-tabs'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['concepts'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['event-types'] }),
      ]);

      toast({
        title: 'Data cleared',
        description: 'All story and catalog data was removed. App settings were kept.',
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Clear failed',
        description: error?.message || 'Something went wrong while clearing your data.',
        variant: 'destructive',
      });
    } finally {
      setClearingData(false);
      setClearDataConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Global app-wide preferences for Forger.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={resetSettings} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.28fr)_300px]">
        <section className="space-y-6">
          <section className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Theme</div>
                <h2 className="mt-1 text-xl font-semibold">Appearance mode</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = settings.themeMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setThemeMode(option.id)}
                    className={`rounded-3xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/70 bg-background hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <div className="mt-4 text-base font-semibold">{option.label}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Accent</div>
                <h2 className="mt-1 text-xl font-semibold">Button and hover colors</h2>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-sm font-medium">Primary accent</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Controls primary buttons, active states, rings, and focus highlights.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ACCENT_COLOR_OPTIONS.map((option) => {
                const selected = settings.accentId === option.id;
                return (
                  <button
                    key={`primary-${option.id}`}
                    type="button"
                    onClick={() => setAccentId(option.id)}
                    className={`flex items-center justify-between gap-4 rounded-3xl border px-4 py-4 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/70 bg-background hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 rounded-2xl border border-white/20 shadow-inner"
                        style={{ backgroundColor: option.hex }}
                      />
                      <div>
                        <div className="font-semibold">{option.name}</div>
                      </div>
                    </div>
                    {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium">Sub-accent</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Controls hover fills, menu highlights, and the accent color used when buttons are hovered.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ACCENT_COLOR_OPTIONS.map((option) => {
                const selected = settings.subAccentId === option.id;
                return (
                  <button
                    key={`sub-${option.id}`}
                    type="button"
                    onClick={() => setSubAccentId(option.id)}
                    className={`flex items-center justify-between gap-4 rounded-3xl border px-4 py-4 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/70 bg-background hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 rounded-2xl border border-white/20 shadow-inner"
                        style={{ backgroundColor: option.hex }}
                      />
                      <div>
                        <div className="font-semibold">{option.name}</div>
                      </div>
                    </div>
                    {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Export / Import Data</div>
                <h2 className="mt-1 text-xl font-semibold">Global Catalog Transfer</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Export or import everything in your Forger through one catalog file: every tab, story, sub-tab, character, tag, concept, timeline, and diagram dataset.
              App settings are intentionally excluded so the file stays story-focused.
              Importing a catalog will replace the entire existing catalog with the one from the file, so be sure to export your current catalog before importing if you want to keep it.
            </p>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".cat,application/json"
              className="hidden"
              onChange={handleImportWorkspace}
            />
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <label htmlFor="workspace-export-name" className="text-sm font-medium">
                  File Name
                </label>
                <Input
                  id="workspace-export-name"
                  value={workspaceExportName}
                  onChange={(event) => setWorkspaceExportName(event.target.value)}
                  placeholder="forger-workspace"
                />
                <p className="text-xs text-muted-foreground">
                  Download preview: <span className="font-medium text-foreground">{`${sanitizeExportFileName(workspaceExportName, 'forger-workspace')}.cat`}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => importFileInputRef.current?.click()}
                  disabled={importingWorkspace}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importingWorkspace ? 'Importing...' : 'Import .cat'}
                </Button>
                <Button
                  type="button"
                  onClick={handleExportWorkspace}
                  disabled={exportingWorkspace}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exportingWorkspace ? 'Exporting...' : 'Export All Data'}
                </Button>
              </div>
            </div>
          </section>

        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[24px] border border-border/60 bg-card/90 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preview</div>
            <h2 className="mt-1.5 text-lg font-semibold">Current setup</h2>
            <div className="mt-3 space-y-2.5">
	              <div className="rounded-[22px] border border-border/60 bg-background p-3.5">
	                <div className="text-sm font-medium">Accent</div>
	                <div className="mt-2.5 flex items-center gap-3">
	                  <span
	                    className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/20"
	                    style={{ backgroundColor: accentOption.hex }}
	                  />
	                  <div className="min-w-0 flex-1">
	                    <div className="font-medium">{accentOption.name}</div>
	                    <div className="text-[13px] text-muted-foreground">Used for primary actions throughout the app.</div>
	                  </div>
	                </div>
	              </div>
	              <div className="rounded-[22px] border border-border/60 bg-background p-3.5">
	                <div className="text-sm font-medium">Sub-accent</div>
	                <div className="mt-2.5 flex items-center gap-3">
	                  <span
	                    className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/20"
	                    style={{ backgroundColor: subAccentOption.hex }}
	                  />
	                  <div className="min-w-0 flex-1">
	                    <div className="font-medium">{subAccentOption.name}</div>
	                    <div className="text-[13px] text-muted-foreground">Used for hover and highlight states.</div>
	                  </div>
	                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-destructive/30 bg-card/90 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Danger Zone</div>
                <h2 className="mt-1 text-lg font-semibold">Clear Data</h2>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
              Remove the entire Forger catalog from this device. Everything will be removed. Your app settings stay exactly as they are.
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setClearDataConfirmOpen(true)}
                disabled={clearingData}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {clearingData ? 'Clearing...' : 'Clear Data'}
              </Button>
            </div>
          </section>
        </aside>
      </main>

      <AlertDialog open={catalogImportConfirmOpen} onOpenChange={(open) => !open && cancelCatalogImportReplacement()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Entire Catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing this <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.cat</code> file will permanently replace your entire Forger catalog, including every tab, sub-tab, character, tag, concept, timeline, diagram, and custom diagram tool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingCatalogImportFile && importCatalogFile(pendingCatalogImportFile)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replace Catalog
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearDataConfirmOpen} onOpenChange={(open) => !open && setClearDataConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Story Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your entire local Forger catalog, including tabs, sub-tabs, characters, tags, concepts, timelines, diagrams, and imported diagram tools. App settings will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingData}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingData ? 'Clearing...' : 'Clear Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
