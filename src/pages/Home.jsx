import React, { useMemo, useRef, useState } from 'react';
import { dataClient } from '@/api/dataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronDown, Search, X, User, Menu, Clock3, Tags as TagsIcon, PanelTopOpen, ArrowLeft, Lightbulb } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CategoryColumn from '@/components/characters/CategoryColumn';
import CreateCategoryDialog from '@/components/characters/CreateCategoryDialog';
import CreateCharacterDialog from '@/components/characters/CreateCharacterDialog';
import CreateTabDialog from '@/components/tabs/CreateTabDialog';
import EmptyState from '@/components/characters/EmptyState';
import TagsDialog from '@/components/tags/TagsDialog';
import { COLOR_OPTIONS } from '@/lib/colors';

const DIAGRAM_BOARD_WIDTH = 4800;
const DIAGRAM_BOARD_HEIGHT = 3200;
const DIAGRAM_NODE_WIDTH = 176;
const DIAGRAM_NODE_HEIGHT = 84;
const DIAGRAM_MIN_ZOOM = 0.45;
const DIAGRAM_MAX_ZOOM = 2.2;
const DIAGRAM_STORAGE_KEY = 'forge_diagram_v1';
const DIAGRAM_TOOL_STORAGE_KEY = 'forge_diagram_tools_v1';
const DIAGRAM_ARROW_SIZE = 16;
const DEFAULT_DIAGRAM_TOOL_GROUPS = [
  {
    id: 'relationships',
    title: 'Relationships',
    items: [
      {
        id: 'family',
        name: 'Family',
        color: '#22c55e',
        behavior: 'family',
        defaultDirection: 'none',
        variants: [
          { id: 'family-related', label: 'Related', direction: 'none' },
          { id: 'family-siblings', label: 'Siblings', direction: 'none' },
          { id: 'family-cousins', label: 'Cousins', direction: 'none' },
        ],
      },
      {
        id: 'relationship',
        name: 'Relationship',
        color: '#ec4899',
        behavior: 'standard',
        defaultDirection: 'none',
        variants: [
          { id: 'relationship-mutual', label: 'Mutual', direction: 'both' },
          { id: 'relationship-interested', label: 'Interested In', direction: 'forward' },
          { id: 'relationship-exes', label: 'Exes', direction: 'none' },
        ],
      },
      {
        id: 'friend',
        name: 'Friend',
        color: '#38bdf8',
        behavior: 'standard',
        defaultDirection: 'none',
        variants: [
          { id: 'friend-friends', label: 'Friends', direction: 'both' },
          { id: 'friend-trusted', label: 'Trusted', direction: 'forward' },
        ],
      },
      {
        id: 'mentor',
        name: 'Mentor',
        color: '#a78bfa',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'mentor-forward', label: 'Mentor -> Mentee', direction: 'forward' },
          { id: 'mentor-backward', label: 'Mentee -> Mentor', direction: 'backward' },
        ],
      },
      {
        id: 'rival',
        name: 'Rival',
        color: '#f59e0b',
        behavior: 'standard',
        defaultDirection: 'both',
        variants: [
          { id: 'rival-rivals', label: 'Rivals', direction: 'both' },
          { id: 'rival-competes', label: 'Competes With', direction: 'forward' },
        ],
      },
      {
        id: 'enemy',
        name: 'Enemy',
        color: '#ef4444',
        behavior: 'standard',
        defaultDirection: 'both',
        variants: [
          { id: 'enemy-enemies', label: 'Enemies', direction: 'both' },
          { id: 'enemy-vendetta', label: 'Vendetta', direction: 'forward' },
        ],
      },
    ],
  },
  {
    id: 'status',
    title: 'Status',
    items: [
      {
        id: 'employee',
        name: 'Employee',
        color: '#14b8a6',
        behavior: 'standard',
        defaultDirection: 'backward',
        variants: [
          { id: 'employee-backward', label: 'Boss -> Employee', direction: 'backward' },
          { id: 'employee-forward', label: 'Employee -> Boss', direction: 'forward' },
        ],
      },
      {
        id: 'boss',
        name: 'Boss',
        color: '#8b5cf6',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'boss-forward', label: 'Boss -> Employee', direction: 'forward' },
          { id: 'boss-backward', label: 'Employee -> Boss', direction: 'backward' },
        ],
      },
      {
        id: 'protects',
        name: 'Protects',
        color: '#10b981',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'protects-forward', label: 'Protects', direction: 'forward' },
          { id: 'protects-backward', label: 'Protected By', direction: 'backward' },
        ],
      },
      {
        id: 'owes',
        name: 'Owes',
        color: '#f97316',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'owes-forward', label: 'Owes', direction: 'forward' },
          { id: 'owes-backward', label: 'Is Owed By', direction: 'backward' },
        ],
      },
      {
        id: 'targets',
        name: 'Targets',
        color: '#f43f5e',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'targets-forward', label: 'Targets', direction: 'forward' },
          { id: 'targets-backward', label: 'Targeted By', direction: 'backward' },
        ],
      },
      {
        id: 'hates',
        name: 'Hates',
        color: '#dc2626',
        behavior: 'standard',
        defaultDirection: 'forward',
        variants: [
          { id: 'hates-forward', label: 'Hates', direction: 'forward' },
          { id: 'hates-backward', label: 'Hated By', direction: 'backward' },
          { id: 'hates-mutual', label: 'Mutual Hate', direction: 'both' },
        ],
      },
    ],
  },
];

const createDiagramConfigId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeDiagramVariant = (variant, toolId, index) => ({
  id: variant?.id || `${toolId}-variant-${index + 1}`,
  label: variant?.label || `Variant ${index + 1}`,
  direction: variant?.direction || 'none',
});

const normalizeDiagramTool = (tool, groupId, index) => {
  const toolId = tool?.id || `${groupId}-tool-${index + 1}`;
  const variants = Array.isArray(tool?.variants) ? tool.variants : [];
  return {
    id: toolId,
    name: tool?.name || `Tool ${index + 1}`,
    color: tool?.color || '#38bdf8',
    behavior: tool?.behavior === 'family' ? 'family' : 'standard',
    defaultDirection: tool?.defaultDirection || 'none',
    variants: variants.map((variant, variantIndex) => normalizeDiagramVariant(variant, toolId, variantIndex)),
  };
};

const normalizeDiagramToolGroups = (groups) =>
  (Array.isArray(groups) ? groups : DEFAULT_DIAGRAM_TOOL_GROUPS).map((group, groupIndex) => {
    const groupId = group?.id || `group-${groupIndex + 1}`;
    return {
      id: groupId,
      title: group?.title || `Category ${groupIndex + 1}`,
      items: (Array.isArray(group?.items) ? group.items : []).map((tool, toolIndex) =>
        normalizeDiagramTool(tool, groupId, toolIndex)
      ),
    };
  });

const loadDiagramToolGroups = () => {
  if (typeof window === 'undefined') return normalizeDiagramToolGroups(DEFAULT_DIAGRAM_TOOL_GROUPS);
  try {
    const raw = window.localStorage.getItem(DIAGRAM_TOOL_STORAGE_KEY);
    if (!raw) return normalizeDiagramToolGroups(DEFAULT_DIAGRAM_TOOL_GROUPS);
    const parsed = JSON.parse(raw);
    return normalizeDiagramToolGroups(parsed);
  } catch {
    return normalizeDiagramToolGroups(DEFAULT_DIAGRAM_TOOL_GROUPS);
  }
};

const createDiagramCanvas = (tabId, name = 'Main Canvas') => ({
  id: createDiagramConfigId('canvas'),
  tabId,
  name,
});

const normalizeDiagramCanvases = (canvases) =>
  (Array.isArray(canvases) ? canvases : []).map((canvas, index) => ({
    id: canvas?.id || createDiagramConfigId('canvas'),
    tabId: canvas?.tabId ?? null,
    name: canvas?.name || (index === 0 ? 'Main Canvas' : `Canvas ${index + 1}`),
  }));

const loadDiagramState = () => {
  const emptyState = { nodes: [], edges: [], canvases: [], activeCanvasByTab: {} };
  if (typeof window === 'undefined') return emptyState;
  try {
    const raw = window.localStorage.getItem(DIAGRAM_STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    const parsedNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const parsedEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
    const parsedCanvases = normalizeDiagramCanvases(parsed.canvases);
    const parsedActiveCanvasByTab =
      parsed.activeCanvasByTab && typeof parsed.activeCanvasByTab === 'object' ? parsed.activeCanvasByTab : {};

    if (parsedCanvases.length > 0) {
      const canvasesByTab = new Map();
      parsedCanvases.forEach((canvas) => {
        if (!canvasesByTab.has(String(canvas.tabId))) {
          canvasesByTab.set(String(canvas.tabId), canvas.id);
        }
      });

      const nextNodes = parsedNodes.map((node) => ({
        ...node,
        canvasId: node.canvasId || canvasesByTab.get(String(node.tabId)) || null,
      }));
      const nextEdges = parsedEdges.map((edge) => ({
        ...edge,
        canvasId: edge.canvasId || canvasesByTab.get(String(edge.tabId)) || null,
      }));

      return {
        nodes: nextNodes,
        edges: nextEdges,
        canvases: parsedCanvases,
        activeCanvasByTab: parsedActiveCanvasByTab,
      };
    }

    const tabIds = Array.from(
      new Set(
        [...parsedNodes.map((node) => node?.tabId), ...parsedEdges.map((edge) => edge?.tabId)].filter(
          (tabId) => tabId !== null && tabId !== undefined
        )
      )
    );
    const canvases = tabIds.map((tabId) => createDiagramCanvas(tabId, 'Main Canvas'));
    const firstCanvasByTab = new Map(canvases.map((canvas) => [String(canvas.tabId), canvas.id]));

    return {
      nodes: parsedNodes.map((node) => ({
        ...node,
        canvasId: firstCanvasByTab.get(String(node.tabId)) || null,
      })),
      edges: parsedEdges.map((edge) => ({
        ...edge,
        canvasId: firstCanvasByTab.get(String(edge.tabId)) || null,
      })),
      canvases,
      activeCanvasByTab: Object.fromEntries(canvases.map((canvas) => [String(canvas.tabId), canvas.id])),
    };
  } catch {
    return emptyState;
  }
};

const getNodeAnchorPoint = (fromNode, toNode) => {
  const fromCenterX = fromNode.x + DIAGRAM_NODE_WIDTH / 2;
  const fromCenterY = fromNode.y + DIAGRAM_NODE_HEIGHT / 2;
  const toCenterX = toNode.x + DIAGRAM_NODE_WIDTH / 2;
  const toCenterY = toNode.y + DIAGRAM_NODE_HEIGHT / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const halfWidth = DIAGRAM_NODE_WIDTH / 2;
  const halfHeight = DIAGRAM_NODE_HEIGHT / 2;

  if (dx === 0 && dy === 0) {
    return { x: fromCenterX, y: fromCenterY };
  }

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: fromCenterX + dx * scale,
    y: fromCenterY + dy * scale,
  };
};

const getEdgeBehavior = (edge, toolConfig = null) =>
  toolConfig?.behavior || edge?.toolBehavior || (edge?.type === 'Family' ? 'family' : 'standard');

const isFamilyEdge = (edge, toolConfig = null) => getEdgeBehavior(edge, toolConfig) === 'family';

const getFamilyEdgeMeta = (edge, toolConfig = null) => {
  if (!isFamilyEdge(edge, toolConfig)) return null;

  const legacyVariant = String(edge.variant || '');
  const meta = {
    relationKind: edge.familyRelationKind || 'related',
    parentNodeId: edge.familyParentNodeId || null,
    childNodeId: edge.familyChildNodeId || null,
    adoptive: Boolean(edge.familyAdoptive),
  };

  if (legacyVariant === 'Siblings') {
    return { ...meta, relationKind: 'siblings', parentNodeId: null, childNodeId: null };
  }
  if (legacyVariant === 'Cousins') {
    return { ...meta, relationKind: 'cousins', parentNodeId: null, childNodeId: null };
  }
  if (legacyVariant === 'Parent -> Child') {
    return {
      ...meta,
      relationKind: 'lineage',
      parentNodeId: edge.fromNodeId,
      childNodeId: edge.toNodeId,
    };
  }
  if (legacyVariant === 'Child -> Parent') {
    return {
      ...meta,
      relationKind: 'lineage',
      parentNodeId: edge.toNodeId,
      childNodeId: edge.fromNodeId,
    };
  }

  return meta;
};

const getEdgeDisplayLabel = (edge, toolConfig = null) => {
  if (isFamilyEdge(edge, toolConfig)) {
    const familyMeta = getFamilyEdgeMeta(edge, toolConfig);
    if (familyMeta?.relationKind === 'siblings') return 'Siblings';
    if (familyMeta?.relationKind === 'cousins') return 'Cousins';
    if (familyMeta?.relationKind === 'lineage') {
      return familyMeta.adoptive ? 'Adoptive Family' : 'Family';
    }
    return 'Related';
  }
  const configuredVariant = toolConfig?.variants?.find((variant) => variant.id === edge.variantId);
  return configuredVariant?.label || edge.variant || toolConfig?.name || edge.type;
};

const getFamilyEdgeSummary = (edge, nodeMap, toolConfig = null) => {
  const familyMeta = getFamilyEdgeMeta(edge, toolConfig);
  if (!familyMeta) return '';

  if (familyMeta.relationKind === 'siblings') return 'Sibling relationship';
  if (familyMeta.relationKind === 'cousins') return 'Cousin relationship';
  if (familyMeta.relationKind !== 'lineage') return 'General family relationship';

  const parentName = nodeMap.get(familyMeta.parentNodeId)?.name || 'Unknown';
  const childName = nodeMap.get(familyMeta.childNodeId)?.name || 'Unknown';
  return familyMeta.adoptive
    ? `${parentName} is the adoptive parent of ${childName}`
    : `${parentName} is the parent of ${childName}`;
};

export default function Home({ mode = 'home' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialDiagramState = useMemo(() => loadDiagramState(), []);
  const diagramMode = mode === 'diagram';

  const [activeTabId, setActiveTabId] = useState(null);
  const [tabDialog, setTabDialog] = useState({ open: false, editData: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, editData: null });
  const [characterDialog, setCharacterDialog] = useState({ open: false, editData: null, defaultCategoryId: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [homeSidebarOpen, setHomeSidebarOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [proxyDrag, setProxyDrag] = useState(null);
  const [listDrag, setListDrag] = useState(null);
  const [diagramSidebarTab, setDiagramSidebarTab] = useState('characters');
  const [diagramToolGroups, setDiagramToolGroups] = useState(() => loadDiagramToolGroups());
  const [diagramToolManagerOpen, setDiagramToolManagerOpen] = useState(false);
  const [diagramCanvasDockOpen, setDiagramCanvasDockOpen] = useState(false);
  const [diagramCanvases, setDiagramCanvases] = useState(initialDiagramState.canvases);
  const [activeDiagramCanvasByTab, setActiveDiagramCanvasByTab] = useState(initialDiagramState.activeCanvasByTab);
  const [diagramNodes, setDiagramNodes] = useState(initialDiagramState.nodes);
  const [diagramEdges, setDiagramEdges] = useState(initialDiagramState.edges);
  const [selectedDiagramToolId, setSelectedDiagramToolId] = useState(null);
  const [pendingConnectionNodeId, setPendingConnectionNodeId] = useState(null);
  const [selectedDiagramEdgeId, setSelectedDiagramEdgeId] = useState(null);
  const [diagramDrag, setDiagramDrag] = useState(null);
  const [diagramViewport, setDiagramViewport] = useState({ x: 420, y: 240, zoom: 1 });
  const highlightTimeoutRef = useRef(null);
  const highlightScrollRef = useRef(null);
  const diagramBoardRef = useRef(null);
  const diagramSidebarRef = useRef(null);
  const returnTabAppliedRef = useRef(false);

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

  React.useEffect(() => {
    const requestedTabId = location.state?.activeTabId;
    if (!requestedTabId) {
      returnTabAppliedRef.current = false;
      return;
    }
    if (tabs.length === 0) return;
    if (returnTabAppliedRef.current) return;
    if (!tabs.some((tab) => String(tab.id) === String(requestedTabId))) return;
    returnTabAppliedRef.current = true;
    if (String(activeTabId) !== String(requestedTabId)) {
      setActiveTabId(requestedTabId);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, tabs, activeTabId, navigate, location.pathname]);

  const activeCategories = categories.filter(c => c.tab_id === activeTabId);
  const activeCharacters = characters.filter(ch => {
    const cat = categories.find(c => c.id === ch.category_id);
    return cat?.tab_id === activeTabId;
  });
  const originalCharacterById = useMemo(
    () => new Map(characters.filter((ch) => !ch.is_proxy).map((ch) => [String(ch.id), ch])),
    [characters]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [String(c.id), c])),
    [categories]
  );
  const tabById = useMemo(
    () => new Map(tabs.map((t) => [String(t.id), t])),
    [tabs]
  );
  const tagById = useMemo(
    () => new Map(allTags.map((t) => [String(t.id), t])),
    [allTags]
  );
  const resolvedActiveCharacters = useMemo(
    () =>
      activeCharacters
        .map((ch) => {
          if (!ch.is_proxy) return ch;
          const original = originalCharacterById.get(String(ch.original_character_id));
          if (!original) return null;
          return {
            ...original,
            id: ch.id,
            category_id: ch.category_id,
            sort_order: ch.sort_order,
            is_proxy: true,
            original_character_id: ch.original_character_id,
            original_category_id: original.category_id,
          };
        })
        .filter(Boolean),
    [activeCharacters, originalCharacterById]
  );

  const parseQuery = (query) => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const rawTokens = trimmed.match(/"[^"]+"|\S+/g) || [];
    const tokens = rawTokens.map((raw) => raw.trim()).filter(Boolean);
    const parsed = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.includes(':')) {
        const idx = token.indexOf(':');
        const key = token.slice(0, idx).trim();
        let value = token.slice(idx + 1).trim();
        if (!value && i + 1 < tokens.length) {
          value = tokens[i + 1];
          i += 1;
        }
        if (!key || !value) {
          parsed.push({ type: 'text', value: token.replace(/(^\"|\"$)/g, '') });
        } else {
          parsed.push({
            type: 'kv',
            key: key.replace(/(^\"|\"$)/g, ''),
            value: value.replace(/(^\"|\"$)/g, ''),
          });
        }
      } else {
        parsed.push({ type: 'text', value: token.replace(/(^\"|\"$)/g, '') });
      }
    }
    return parsed;
  };

  const normalize = (value) => String(value ?? '').toLowerCase();
  const formatAttrValue = (attr) => {
    if (!attr) return '';
    if (attr.type === 'bool') return attr.value ? 'true' : 'false';
    if (attr.type === 'multiselect') {
      return Array.isArray(attr.value) ? attr.value.join(', ') : (attr.value || '');
    }
    return attr.value ?? '';
  };
  const parseNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/[^0-9.+-]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };
  const parseComparator = (value) => {
    const raw = String(value).trim();
    if (!raw) return null;
    const match = raw.match(/^(>=|<=|>|<|=)?\s*([+-]?\d+(?:\.\d+)?)([+-])?$/);
    if (!match) return null;
    const op = match[1] || (match[3] === '+' ? '>=' : match[3] === '-' ? '<=' : '=');
    const num = Number(match[2]);
    if (!Number.isFinite(num)) return null;
    return { op, num };
  };
  const compareNumber = (value, comparator) => {
    if (value === null || comparator === null) return false;
    switch (comparator.op) {
      case '>':
        return value > comparator.num;
      case '>=':
        return value >= comparator.num;
      case '<':
        return value < comparator.num;
      case '<=':
        return value <= comparator.num;
      case '=':
      default:
        return value === comparator.num;
    }
  };
  const parseMonthDay = (value) => {
    if (!value) return null;
    const match = String(value).match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (!match) return null;
    const month = Number(match[1]);
    const day = Number(match[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return month * 100 + day;
  };
  const parseMonthDayRange = (value) => {
    const parts = String(value).split('-').map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const start = parseMonthDay(parts[0]);
    const end = parseMonthDay(parts[1]);
    if (start === null || end === null) return null;
    return { start, end };
  };
  const isMonthDayInRange = (value, range) => {
    if (value === null || !range) return false;
    if (range.start <= range.end) {
      return value >= range.start && value <= range.end;
    }
    return value >= range.start || value <= range.end;
  };

  const matchesTokens = (character, tokens) => {
    if (!tokens.length) return true;
    const name = normalize(character.name);
    const attributes = Array.isArray(character.attributes) ? character.attributes : [];
    const tagIds = Array.isArray(character.tag_ids) ? character.tag_ids : [];

    return tokens.every((token) => {
      if (token.type === 'text') {
        return name.includes(normalize(token.value));
      }

      const key = normalize(token.key);
      const value = normalize(token.value);
      if (key === 'name') {
        return name.includes(value);
      }
      if (key === 'tag' || key === 'tags') {
        return tagIds.some((id) => {
          const tag = tagById.get(String(id));
          return tag && normalize(tag.name).includes(value);
        });
      }
      return attributes.some((attr) => {
        if (!attr?.key) return false;
        if (normalize(attr.key) !== key) return false;
        const rawAttrValue = formatAttrValue(attr);
        if (key === 'birthday') {
          const range = parseMonthDayRange(token.value);
          if (range) {
            const attrDay = parseMonthDay(rawAttrValue);
            return isMonthDayInRange(attrDay, range);
          }
        }
        const comparator = parseComparator(token.value);
        if (comparator) {
          const attrNumber = parseNumber(rawAttrValue);
          return compareNumber(attrNumber, comparator);
        }
        return normalize(rawAttrValue).includes(value);
      });
    });
  };

  const globalTokens = useMemo(() => parseQuery(globalQuery), [globalQuery]);
  const localTokens = useMemo(() => parseQuery(localQuery), [localQuery]);

  const filteredActiveCharacters = useMemo(
    () => resolvedActiveCharacters.filter((ch) => matchesTokens(ch, localTokens)),
    [resolvedActiveCharacters, localTokens, tagById]
  );
  const activeCharacterCount = useMemo(
    () =>
      new Set(
        activeCharacters.map((character) =>
          String(character.is_proxy ? character.original_character_id : character.id)
        )
      ).size,
    [activeCharacters]
  );
  const filteredCharacterCount = useMemo(
    () =>
      new Set(
        filteredActiveCharacters.map((character) =>
          String(character.is_proxy ? character.original_character_id : character.id)
        )
      ).size,
    [filteredActiveCharacters]
  );
  const visibleCategories = useMemo(() => {
    if (!localTokens.length) return activeCategories;
    return activeCategories.filter((category) =>
      filteredActiveCharacters.some((character) => String(character.category_id) === String(category.id))
    );
  }, [activeCategories, filteredActiveCharacters, localTokens]);
  const diagramCategories = useMemo(
    () =>
      activeCategories
        .map((category) => ({
          ...category,
          characters: activeCharacters
            .filter((character) => !character.is_proxy && String(character.category_id) === String(category.id))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        }))
        .filter((category) => category.characters.length > 0),
    [activeCategories, activeCharacters]
  );
  const diagramTools = useMemo(
    () => diagramToolGroups.flatMap((group) => group.items),
    [diagramToolGroups]
  );
  const diagramToolMap = useMemo(
    () => new Map(diagramTools.map((tool) => [tool.id, tool])),
    [diagramTools]
  );
  const diagramToolNameMap = useMemo(
    () => new Map(diagramTools.map((tool) => [tool.name, tool])),
    [diagramTools]
  );
  const selectedDiagramTool = useMemo(
    () => (selectedDiagramToolId ? diagramToolMap.get(selectedDiagramToolId) || null : null),
    [diagramToolMap, selectedDiagramToolId]
  );
  const visibleDiagramCanvases = useMemo(
    () => diagramCanvases.filter((canvas) => String(canvas.tabId) === String(activeTabId)),
    [diagramCanvases, activeTabId]
  );
  const activeDiagramCanvasId = useMemo(() => {
    const selectedCanvasId = activeDiagramCanvasByTab[String(activeTabId)];
    if (selectedCanvasId && visibleDiagramCanvases.some((canvas) => canvas.id === selectedCanvasId)) {
      return selectedCanvasId;
    }
    return visibleDiagramCanvases[0]?.id || null;
  }, [activeDiagramCanvasByTab, activeTabId, visibleDiagramCanvases]);
  const currentDiagramCanvas = useMemo(
    () => visibleDiagramCanvases.find((canvas) => canvas.id === activeDiagramCanvasId) || null,
    [visibleDiagramCanvases, activeDiagramCanvasId]
  );
  const visibleDiagramNodes = useMemo(
    () =>
      diagramNodes.filter(
        (node) => String(node.tabId) === String(activeTabId) && String(node.canvasId) === String(activeDiagramCanvasId)
      ),
    [diagramNodes, activeTabId, activeDiagramCanvasId]
  );
  const visibleDiagramEdges = useMemo(
    () =>
      diagramEdges.filter(
        (edge) => String(edge.tabId) === String(activeTabId) && String(edge.canvasId) === String(activeDiagramCanvasId)
      ),
    [diagramEdges, activeTabId, activeDiagramCanvasId]
  );
  const selectedDiagramEdge = useMemo(
    () => visibleDiagramEdges.find((edge) => edge.id === selectedDiagramEdgeId) || null,
    [visibleDiagramEdges, selectedDiagramEdgeId]
  );
  const visibleDiagramNodeMap = useMemo(
    () => new Map(visibleDiagramNodes.map((node) => [node.id, node])),
    [visibleDiagramNodes]
  );
  const diagramSidebarContainsPoint = (clientX, clientY) => {
    const sidebar = diagramSidebarRef.current;
    if (!sidebar) return false;
    const rect = sidebar.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  };
  const clampDiagramNodePosition = (x, y) => ({
    x: Math.max(24, Math.min(x, DIAGRAM_BOARD_WIDTH - DIAGRAM_NODE_WIDTH - 24)),
    y: Math.max(24, Math.min(y, DIAGRAM_BOARD_HEIGHT - DIAGRAM_NODE_HEIGHT - 24)),
  });
  const getDiagramToolConfig = (toolIdOrName) => diagramToolMap.get(toolIdOrName) || diagramToolNameMap.get(toolIdOrName) || null;
  const getDefaultVariant = (tool) => tool?.variants?.[0] || null;
  const updateCurrentDiagramNodes = (updater) => {
    if (!activeDiagramCanvasId) return;
    setDiagramNodes((current) => {
      const currentCanvasNodes = current.filter((node) => String(node.canvasId) === String(activeDiagramCanvasId));
      const otherNodes = current.filter((node) => String(node.canvasId) !== String(activeDiagramCanvasId));
      return [...otherNodes, ...updater(currentCanvasNodes)];
    });
  };
  const updateCurrentDiagramEdges = (updater) => {
    if (!activeDiagramCanvasId) return;
    setDiagramEdges((current) => {
      const currentCanvasEdges = current.filter((edge) => String(edge.canvasId) === String(activeDiagramCanvasId));
      const otherEdges = current.filter((edge) => String(edge.canvasId) !== String(activeDiagramCanvasId));
      return [...otherEdges, ...updater(currentCanvasEdges)];
    });
  };
  const updateDiagramEdge = (edgeId, updater) => {
    updateCurrentDiagramEdges((current) =>
      current.map((edge) => (edge.id === edgeId ? { ...edge, ...updater(edge) } : edge))
    );
  };
  const selectedDiagramEdgeTool = useMemo(
    () => (selectedDiagramEdge ? getDiagramToolConfig(selectedDiagramEdge.toolId || selectedDiagramEdge.type) : null),
    [selectedDiagramEdge, diagramToolMap, diagramToolNameMap]
  );
  const activeDiagramTabName = tabById.get(String(activeTabId))?.name || 'Current Tab';

  const globalResults = useMemo(() => {
    if (!globalTokens.length) return [];
    return characters
      .filter((ch) => !ch.is_proxy)
      .filter((ch) => matchesTokens(ch, globalTokens))
      .slice(0, 8)
      .map((ch) => {
        const category = categoryById.get(String(ch.category_id));
        const tab = category ? tabById.get(String(category.tab_id)) : null;
        return {
          character: ch,
          category,
          tab,
        };
      });
  }, [characters, globalTokens, categoryById, tabById, tagById]);

  const triggerHighlight = (characterId, tabId) => {
    if (tabId && String(tabId) !== String(activeTabId)) {
      setActiveTabId(tabId);
    }
    setHighlightedId(characterId);
  };

  React.useEffect(() => {
    if (!highlightedId) return;
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    if (highlightScrollRef.current) clearTimeout(highlightScrollRef.current);

    highlightScrollRef.current = setTimeout(() => {
      const el = document.getElementById(`character-${highlightedId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 160);

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedId(null);
    }, 2200);

    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (highlightScrollRef.current) clearTimeout(highlightScrollRef.current);
    };
  }, [highlightedId, activeTabId]);

  const getOriginalCharacterId = (character) => String(character?.is_proxy ? character.original_character_id : character?.id);
  const isProxyInOriginalCategory = (character, categoryId) => {
    const original = originalCharacterById.get(getOriginalCharacterId(character));
    return original ? String(original.category_id) === String(categoryId) : false;
  };
  const hasProxyInCategory = (originalId, categoryId, excludeId = null) =>
    characters.some(
      (item) =>
        item.is_proxy &&
        String(item.original_character_id) === String(originalId) &&
        String(item.category_id) === String(categoryId) &&
        String(item.id) !== String(excludeId)
    );
  const deleteCharacterRecord = async (character) => {
    if (!character) return;
    const characterId = String(character.id);
    if (character.is_proxy) {
      await dataClient.entities.Character.delete(character.id);
      return;
    }
    const linkedProxies = characters.filter(
      (item) => item.is_proxy && String(item.original_character_id) === characterId
    );
    await Promise.all([
      ...linkedProxies.map((proxy) => dataClient.entities.Character.delete(proxy.id)),
      dataClient.entities.Character.delete(character.id),
    ]);
  };
  const createProxyInCategory = async (character, categoryId) => {
    if (!character || character.is_proxy) return null;
    const originalId = String(character.id);
    if (String(character.category_id) === String(categoryId)) return null;
    if (hasProxyInCategory(originalId, categoryId)) return null;

    const categoryItems = getCategoryCharacters(categoryId, { filtered: false });
    return dataClient.entities.Character.create({
      category_id: categoryId,
      sort_order: categoryItems.length,
      is_proxy: true,
      original_character_id: character.id,
    });
  };

  const getCategoryCharacters = (categoryId, { filtered = true } = {}) => {
    const source = filtered ? filteredActiveCharacters : resolvedActiveCharacters;
    return source
      .filter((char) => String(char.category_id) === String(categoryId))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  const reorderItems = (items, draggedId, targetId) => {
    const sourceIndex = items.findIndex((item) => String(item.id) === String(draggedId));
    const targetIndex = items.findIndex((item) => String(item.id) === String(targetId));
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return null;

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const persistTabOrder = async (draggedId, targetId) => {
    const reordered = reorderItems(tabs, draggedId, targetId);
    if (!reordered) return;
    await Promise.all(
      reordered.map((tab, index) => dataClient.entities.Tab.update(tab.id, { sort_order: index }))
    );
    queryClient.invalidateQueries({ queryKey: ['tabs'] });
  };

  const persistCategoryOrder = async (draggedId, targetId) => {
    const reordered = reorderItems(activeCategories, draggedId, targetId);
    if (!reordered) return;
    await Promise.all(
      reordered.map((category, index) => dataClient.entities.Category.update(category.id, { sort_order: index }))
    );
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const startListDrag = (type, item) => {
    setListDrag({ type, id: String(item.id), overId: String(item.id) });
  };

  const updateListDragTarget = (type, itemId) => {
    setListDrag((current) => {
      if (!current || current.type !== type) return current;
      return { ...current, overId: String(itemId) };
    });
  };

  const clearListDrag = () => {
    setListDrag(null);
  };

  const handleTabReorder = async (targetId) => {
    const dragSnapshot = listDrag;
    clearListDrag();
    if (!dragSnapshot || dragSnapshot.type !== 'tab') return;
    await persistTabOrder(dragSnapshot.id, targetId);
  };

  const handleCategoryReorder = async (targetId) => {
    const dragSnapshot = listDrag;
    clearListDrag();
    if (!dragSnapshot || dragSnapshot.type !== 'category') return;
    await persistCategoryOrder(dragSnapshot.id, targetId);
  };

  React.useEffect(() => {
    if (!proxyDrag) return undefined;

    const findHoveredCategoryId = (clientX, clientY) => {
      const target = document
        .elementsFromPoint(clientX, clientY)
        .find((element) => element instanceof HTMLElement && element.dataset.categoryDropzone === 'true');
      return target?.dataset.categoryId || null;
    };

    const handleMouseMove = (event) => {
      const hoveredCategoryId = findHoveredCategoryId(event.clientX, event.clientY);
      setProxyDrag((current) =>
        current
          ? {
              ...current,
              x: event.clientX,
              y: event.clientY,
              hoveredCategoryId,
            }
          : current
      );
    };

    const handleMouseUp = async (event) => {
      const hoveredCategoryId = findHoveredCategoryId(event.clientX, event.clientY);
      const dragSnapshot = proxyDrag;
      setProxyDrag(null);

      if (!dragSnapshot?.character || !hoveredCategoryId) return;
      if (String(dragSnapshot.character.category_id) === String(hoveredCategoryId)) return;

      await createProxyInCategory(dragSnapshot.character, hoveredCategoryId);
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    };

    const preventContextMenu = (event) => {
      event.preventDefault();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [proxyDrag, queryClient, characters]);

  React.useEffect(() => {
    if (!listDrag) return undefined;

    const handleWindowDragEnd = () => {
      setListDrag(null);
    };

    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDragEnd);

    return () => {
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDragEnd);
    };
  }, [listDrag]);

  React.useEffect(() => {
    if (!diagramMode) return;
    setDiagramSidebarTab('characters');
    setSelectedDiagramToolId(null);
    setDiagramToolManagerOpen(false);
    setDiagramCanvasDockOpen(false);
    setPendingConnectionNodeId(null);
    setSelectedDiagramEdgeId(null);
  }, [diagramMode, activeTabId]);

  React.useEffect(() => {
    if (!activeTabId) return;
    if (visibleDiagramCanvases.length > 0) {
      if (activeDiagramCanvasId && activeDiagramCanvasByTab[String(activeTabId)] === activeDiagramCanvasId) return;
      setActiveDiagramCanvasByTab((current) => ({
        ...current,
        [String(activeTabId)]: activeDiagramCanvasId || visibleDiagramCanvases[0]?.id || null,
      }));
      return;
    }

    const nextCanvas = createDiagramCanvas(activeTabId, 'Main Canvas');
    setDiagramCanvases((current) => [...current, nextCanvas]);
    setActiveDiagramCanvasByTab((current) => ({
      ...current,
      [String(activeTabId)]: nextCanvas.id,
    }));
  }, [activeTabId, activeDiagramCanvasByTab, activeDiagramCanvasId, visibleDiagramCanvases]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      DIAGRAM_STORAGE_KEY,
      JSON.stringify({
        canvases: diagramCanvases,
        activeCanvasByTab: activeDiagramCanvasByTab,
        nodes: diagramNodes,
        edges: diagramEdges,
      })
    );
  }, [diagramCanvases, activeDiagramCanvasByTab, diagramNodes, diagramEdges]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DIAGRAM_TOOL_STORAGE_KEY, JSON.stringify(diagramToolGroups));
  }, [diagramToolGroups]);

  React.useEffect(() => {
    if (!selectedDiagramToolId) return;
    if (diagramToolMap.has(selectedDiagramToolId)) return;
    setSelectedDiagramToolId(null);
    setPendingConnectionNodeId(null);
  }, [diagramToolMap, selectedDiagramToolId]);

  React.useEffect(() => {
    if (!selectedDiagramEdgeId) return;
    if (visibleDiagramEdges.some((edge) => edge.id === selectedDiagramEdgeId)) return;
    setSelectedDiagramEdgeId(null);
  }, [visibleDiagramEdges, selectedDiagramEdgeId]);

  React.useEffect(() => {
    if (!diagramMode) return undefined;
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedDiagramEdgeId) {
        event.preventDefault();
        updateCurrentDiagramEdges((current) => current.filter((edge) => edge.id !== selectedDiagramEdgeId));
        setSelectedDiagramEdgeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [diagramMode, selectedDiagramEdgeId]);

  React.useEffect(() => {
    if (!diagramDrag) return undefined;

    const handleMouseMove = (event) => {
      if (diagramDrag.type === 'pan-board') {
        setDiagramViewport({
          x: diagramDrag.originX + (event.clientX - diagramDrag.startClientX),
          y: diagramDrag.originY + (event.clientY - diagramDrag.startClientY),
          zoom: diagramDrag.originZoom,
        });
        return;
      }

      if (diagramDrag.type === 'move-node') {
        const board = diagramBoardRef.current;
        if (!board) return;
        const rect = board.getBoundingClientRect();
        const boardX = (event.clientX - rect.left - diagramViewport.x) / diagramViewport.zoom;
        const boardY = (event.clientY - rect.top - diagramViewport.y) / diagramViewport.zoom;
        const clamped = clampDiagramNodePosition(
          boardX - diagramDrag.pointerOffsetX,
          boardY - diagramDrag.pointerOffsetY
        );
        updateCurrentDiagramNodes((current) =>
          current.map((node) =>
            node.id === diagramDrag.nodeId
              ? { ...node, x: clamped.x, y: clamped.y }
              : node
          )
        );
        setDiagramDrag((current) =>
          current
            ? {
                ...current,
                overSidebar: diagramSidebarContainsPoint(event.clientX, event.clientY),
              }
            : current
        );
        return;
      }

      if (diagramDrag.type === 'new-node') {
        setDiagramDrag((current) =>
          current
            ? {
                ...current,
                clientX: event.clientX,
                clientY: event.clientY,
              }
            : current
        );
      }
    };

    const handleMouseUp = (event) => {
      if (diagramDrag.type === 'pan-board') {
        setDiagramDrag(null);
        return;
      }

      if (diagramDrag.type === 'move-node') {
        if (diagramSidebarContainsPoint(event.clientX, event.clientY)) {
          updateCurrentDiagramNodes((current) => current.filter((node) => node.id !== diagramDrag.nodeId));
          updateCurrentDiagramEdges((current) =>
            current.filter(
              (edge) => edge.fromNodeId !== diagramDrag.nodeId && edge.toNodeId !== diagramDrag.nodeId
            )
          );
          setPendingConnectionNodeId((current) => (current === diagramDrag.nodeId ? null : current));
        }
        setDiagramDrag(null);
        return;
      }

      if (diagramDrag.type === 'new-node') {
        const board = diagramBoardRef.current;
        const rect = board?.getBoundingClientRect();
        if (board && rect) {
          const withinBoard =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom &&
            !diagramSidebarContainsPoint(event.clientX, event.clientY);

          if (withinBoard) {
            const boardX = (event.clientX - rect.left - diagramViewport.x) / diagramViewport.zoom;
            const boardY = (event.clientY - rect.top - diagramViewport.y) / diagramViewport.zoom;
            const position = clampDiagramNodePosition(
              boardX - DIAGRAM_NODE_WIDTH / 2,
              boardY - DIAGRAM_NODE_HEIGHT / 2
            );

            const category = categoryById.get(String(diagramDrag.character.category_id));
            updateCurrentDiagramNodes((current) => [
              ...current,
              {
                id: `diagram-node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                tabId: activeTabId,
                canvasId: activeDiagramCanvasId,
                characterId: diagramDrag.character.id,
                name: diagramDrag.character.name,
                imageUrl: diagramDrag.character.image_url || '',
                categoryName: category?.name || 'Unknown Category',
                categoryColor: category?.color || '#94a3b8',
                x: position.x,
                y: position.y,
              },
            ]);
          }
        }
        setDiagramDrag(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [diagramDrag, diagramMode, categoryById, activeTabId, activeDiagramCanvasId, diagramViewport]);

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
        for (const ch of charsInCat) await deleteCharacterRecord(ch);
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
      for (const ch of charsInCat) await deleteCharacterRecord(ch);
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
    mutationFn: async ({ id, data }) => {
      const original = characters.find((ch) => String(ch.id) === String(id));
      if (!original) throw new Error('Character not found');

      const updated = await dataClient.entities.Character.update(id, data);

      if (Object.prototype.hasOwnProperty.call(data, 'category_id')) {
        const conflictingProxies = characters.filter(
          (item) =>
            item.is_proxy &&
            String(item.original_character_id) === String(id) &&
            String(item.category_id) === String(data.category_id)
        );
        await Promise.all(conflictingProxies.map((proxy) => dataClient.entities.Character.delete(proxy.id)));
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setCharacterDialog({ open: false, editData: null, defaultCategoryId: null });
    },
  });

  const deleteCharacter = useMutation({
    mutationFn: (ch) => deleteCharacterRecord(ch),
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
      let removedProxyIds = [];
      if (character.is_proxy) {
        if (isProxyInOriginalCategory(character, destId)) return character;
        if (hasProxyInCategory(getOriginalCharacterId(character), destId, character.id)) return character;
      } else {
        const conflictingProxies = characters.filter(
          (item) =>
            item.is_proxy &&
            String(item.original_character_id) === String(character.id) &&
            String(item.category_id) === destId
        );
        removedProxyIds = conflictingProxies.map((proxy) => String(proxy.id));
        await Promise.all(conflictingProxies.map((proxy) => dataClient.entities.Character.delete(proxy.id)));
      }

      const sourceList = getCategoryCharacters(sourceId, { filtered: false }).filter((c) => String(c.id) !== String(character.id));
      const destList = getCategoryCharacters(destId, { filtered: false }).filter((c) => !removedProxyIds.includes(String(c.id)));

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

    const sourceList = getCategoryCharacters(sourceId, { filtered: false });
    const destList = sourceId === destId ? sourceList : getCategoryCharacters(destId, { filtered: false });
    const moving = sourceList.find((item) => String(item.id) === String(draggableId));
    if (!moving) return;
    let removedProxyIds = [];
    if (moving.is_proxy) {
      if (isProxyInOriginalCategory(moving, destId)) return;
      if (hasProxyInCategory(getOriginalCharacterId(moving), destId, moving.id)) return;
    } else {
      const conflictingProxies = characters.filter(
        (item) =>
          item.is_proxy &&
            String(item.original_character_id) === String(moving.id) &&
            String(item.category_id) === destId
      );
      if (conflictingProxies.length > 0) {
        removedProxyIds = conflictingProxies.map((proxy) => String(proxy.id));
        await Promise.all(conflictingProxies.map((proxy) => dataClient.entities.Character.delete(proxy.id)));
      }
    }

    const newSource = sourceList.filter((item) => String(item.id) !== String(draggableId));
    const availableDest = sourceId === destId ? newSource : destList.filter((item) => !removedProxyIds.includes(String(item.id)));
    const newDest = [...availableDest];
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
  const handleProxyDragStart = (character, event) => {
    if (!character || character.is_proxy || event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    setProxyDrag({
      character,
      x: event.clientX,
      y: event.clientY,
      hoveredCategoryId: null,
    });
  };
  const handleProxySelect = (character) => {
    if (!character?.is_proxy) return;
    const original = originalCharacterById.get(String(character.original_character_id));
    if (!original) return;
    const category = categoryById.get(String(original.category_id));
    triggerHighlight(original.id, category?.tab_id);
  };
  const handleDiagramCharacterDragStart = (character, event) => {
    if (!diagramMode || !character) return;
    event.preventDefault();
    setDiagramDrag({
      type: 'new-node',
      character,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };
  const handleDiagramNodeDragStart = (nodeId, event) => {
    if (!diagramMode || event.button !== 0) return;
    event.stopPropagation();
    const board = diagramBoardRef.current;
    const node = visibleDiagramNodes.find((item) => item.id === nodeId);
    if (!board || !node) return;
    const rect = board.getBoundingClientRect();
    setDiagramDrag({
      type: 'move-node',
      nodeId,
      pointerOffsetX: (event.clientX - rect.left - diagramViewport.x) / diagramViewport.zoom - node.x,
      pointerOffsetY: (event.clientY - rect.top - diagramViewport.y) / diagramViewport.zoom - node.y,
      overSidebar: false,
    });
  };
  const handleDiagramBoardPanStart = (event) => {
    if (!diagramMode || event.button !== 0) return;
    setDiagramDrag({
      type: 'pan-board',
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: diagramViewport.x,
      originY: diagramViewport.y,
      originZoom: diagramViewport.zoom,
    });
  };
  const handleDiagramBoardWheel = (event) => {
    if (!diagramMode) return;
    event.preventDefault();
    const board = diagramBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const cursorBoardX = (event.clientX - rect.left - diagramViewport.x) / diagramViewport.zoom;
    const cursorBoardY = (event.clientY - rect.top - diagramViewport.y) / diagramViewport.zoom;
    const zoomDelta = event.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.max(DIAGRAM_MIN_ZOOM, Math.min(DIAGRAM_MAX_ZOOM, diagramViewport.zoom * zoomDelta));
    setDiagramViewport({
      zoom: nextZoom,
      x: event.clientX - rect.left - cursorBoardX * nextZoom,
      y: event.clientY - rect.top - cursorBoardY * nextZoom,
    });
  };
  const updateDiagramToolGroups = (updater) => {
    setDiagramToolGroups((current) => normalizeDiagramToolGroups(updater(current)));
  };
  const handleDiagramToolCategoryAdd = () => {
    updateDiagramToolGroups((current) => [
      ...current,
      { id: createDiagramConfigId('group'), title: 'New Category', items: [] },
    ]);
    setDiagramToolManagerOpen(true);
  };
  const handleDiagramToolCategoryUpdate = (groupId, title) => {
    updateDiagramToolGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, title } : group))
    );
  };
  const handleDiagramToolCategoryDelete = (groupId) => {
    updateDiagramToolGroups((current) => current.filter((group) => group.id !== groupId));
  };
  const handleDiagramToolAdd = (groupId) => {
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: [
                ...group.items,
                normalizeDiagramTool(
                  {
                    id: createDiagramConfigId('tool'),
                    name: 'New Tool',
                    color: '#38bdf8',
                    behavior: 'standard',
                    defaultDirection: 'none',
                    variants: [{ id: createDiagramConfigId('variant'), label: 'Default', direction: 'none' }],
                  },
                  groupId,
                  group.items.length
                ),
              ],
            }
          : group
      )
    );
    setDiagramToolManagerOpen(true);
  };
  const syncEdgesForDiagramTool = (toolId, updater) => {
    setDiagramEdges((current) =>
      current.map((edge) => {
        if (edge.toolId !== toolId) return edge;
        return { ...edge, ...updater(edge) };
      })
    );
  };
  const handleDiagramToolUpdate = (groupId, toolId, updates) => {
    const existingTool = diagramToolMap.get(toolId);
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((tool) => {
                if (tool.id !== toolId) return tool;
                if (updates.behavior === 'family') {
                  return {
                    ...tool,
                    ...updates,
                    defaultDirection: 'none',
                    variants: [
                      { id: `${tool.id}-related`, label: 'Related', direction: 'none' },
                      { id: `${tool.id}-siblings`, label: 'Siblings', direction: 'none' },
                      { id: `${tool.id}-cousins`, label: 'Cousins', direction: 'none' },
                    ],
                  };
                }
                return { ...tool, ...updates };
              }),
            }
          : group
      )
    );
    if (!existingTool) return;

    if (updates.behavior === 'family') {
      syncEdgesForDiagramTool(toolId, () => ({
        type: updates.name || existingTool.name,
        color: updates.color || existingTool.color,
        toolBehavior: 'family',
        direction: 'none',
        variantId: null,
        variant: 'Related',
        familyRelationKind: 'related',
        familyParentNodeId: null,
        familyChildNodeId: null,
        familyAdoptive: false,
      }));
      return;
    }

    syncEdgesForDiagramTool(toolId, (edge) => ({
      type: updates.name || existingTool.name,
      color: updates.color || existingTool.color,
      toolBehavior: updates.behavior || existingTool.behavior || 'standard',
      ...(updates.behavior === 'standard' && existingTool.behavior === 'family'
        ? {
            variantId: edge.variantId || existingTool.variants?.[0]?.id || null,
            variant: edge.variant || existingTool.variants?.[0]?.label || existingTool.name,
            familyRelationKind: undefined,
            familyParentNodeId: undefined,
            familyChildNodeId: undefined,
            familyAdoptive: undefined,
          }
        : {}),
    }));
  };
  const handleDiagramToolDelete = (groupId, toolId) => {
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, items: group.items.filter((tool) => tool.id !== toolId) } : group
      )
    );
    setDiagramEdges((current) => current.filter((edge) => edge.toolId !== toolId && edge.type !== diagramToolMap.get(toolId)?.name));
    setSelectedDiagramToolId((current) => (current === toolId ? null : current));
    setSelectedDiagramEdgeId((current) => {
      if (!current) return current;
      const edge = diagramEdges.find((item) => item.id === current);
      if (!edge) return current;
      return edge.toolId === toolId ? null : current;
    });
  };
  const handleDiagramVariantAdd = (groupId, toolId) => {
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((tool) =>
                tool.id === toolId
                  ? {
                      ...tool,
                      variants: [
                        ...tool.variants,
                        {
                          id: createDiagramConfigId('variant'),
                          label: `Variant ${tool.variants.length + 1}`,
                          direction: tool.defaultDirection || 'none',
                        },
                      ],
                    }
                  : tool
              ),
            }
          : group
      )
    );
  };
  const handleDiagramVariantUpdate = (groupId, toolId, variantId, updates) => {
    const existingTool = diagramToolMap.get(toolId);
    const existingVariant = existingTool?.variants?.find((variant) => variant.id === variantId) || null;
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((tool) =>
                tool.id === toolId
                  ? {
                      ...tool,
                      variants: tool.variants.map((variant) =>
                        variant.id === variantId ? { ...variant, ...updates } : variant
                      ),
                    }
                  : tool
              ),
            }
          : group
      )
    );
    if (!existingVariant) return;
    syncEdgesForDiagramTool(toolId, (edge) => {
      if (edge.variantId !== variantId) return {};
      return {
        variant: updates.label || existingVariant.label,
        direction: updates.direction || existingVariant.direction,
      };
    });
  };
  const handleDiagramVariantDelete = (groupId, toolId, variantId) => {
    const existingTool = diagramToolMap.get(toolId);
    const remainingVariants =
      existingTool?.variants?.filter((variant) => variant.id !== variantId) || [];
    const fallbackVariant = remainingVariants[0] || null;
    updateDiagramToolGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map((tool) =>
                tool.id === toolId
                  ? {
                      ...tool,
                      variants:
                        tool.variants.length > 1
                          ? tool.variants.filter((variant) => variant.id !== variantId)
                          : tool.variants,
                    }
                  : tool
              ),
            }
          : group
      )
    );
    if (!existingTool || !fallbackVariant) return;
    syncEdgesForDiagramTool(toolId, (edge) => {
      if (edge.variantId !== variantId) return {};
      return {
        variantId: fallbackVariant.id,
        variant: fallbackVariant.label,
        direction: fallbackVariant.direction,
      };
    });
  };
  const handleDiagramCanvasSelect = (canvasId) => {
    if (!activeTabId) return;
    setActiveDiagramCanvasByTab((current) => ({
      ...current,
      [String(activeTabId)]: canvasId,
    }));
    setPendingConnectionNodeId(null);
    setSelectedDiagramEdgeId(null);
    setSelectedDiagramToolId(null);
  };
  const handleDiagramCanvasAdd = () => {
    if (!activeTabId) return;
    const nextIndex = visibleDiagramCanvases.length + 1;
    const nextCanvas = createDiagramCanvas(activeTabId, nextIndex === 1 ? 'Main Canvas' : `Canvas ${nextIndex}`);
    setDiagramCanvases((current) => [...current, nextCanvas]);
    setActiveDiagramCanvasByTab((current) => ({
      ...current,
      [String(activeTabId)]: nextCanvas.id,
    }));
    setPendingConnectionNodeId(null);
    setSelectedDiagramEdgeId(null);
    setSelectedDiagramToolId(null);
    setDiagramCanvasDockOpen(true);
  };
  const handleCurrentDiagramCanvasRename = (name) => {
    if (!currentDiagramCanvas) return;
    setDiagramCanvases((current) =>
      current.map((canvas) => (canvas.id === currentDiagramCanvas.id ? { ...canvas, name } : canvas))
    );
  };
  const handleCurrentDiagramCanvasDelete = () => {
    if (!currentDiagramCanvas || visibleDiagramCanvases.length <= 1) return;
    const remainingCanvases = visibleDiagramCanvases.filter((canvas) => canvas.id !== currentDiagramCanvas.id);
    const nextCanvasId = remainingCanvases[0]?.id || null;
    setDiagramCanvases((current) => current.filter((canvas) => canvas.id !== currentDiagramCanvas.id));
    setDiagramNodes((current) => current.filter((node) => node.canvasId !== currentDiagramCanvas.id));
    setDiagramEdges((current) => current.filter((edge) => edge.canvasId !== currentDiagramCanvas.id));
    setActiveDiagramCanvasByTab((current) => ({
      ...current,
      [String(activeTabId)]: nextCanvasId,
    }));
    setPendingConnectionNodeId(null);
    setSelectedDiagramEdgeId(null);
    setSelectedDiagramToolId(null);
  };
  const handleDiagramToolSelect = (tool) => {
    setSelectedDiagramToolId((current) => (current === tool.id ? null : tool.id));
    setPendingConnectionNodeId(null);
    setSelectedDiagramEdgeId(null);
    setDiagramSidebarTab('tools');
  };
  const handleDiagramNodeClick = (nodeId) => {
    if (!selectedDiagramTool) return;
    if (!pendingConnectionNodeId) {
      setPendingConnectionNodeId(nodeId);
      return;
    }
    if (pendingConnectionNodeId === nodeId) {
      setPendingConnectionNodeId(null);
      return;
    }

    const fromNodeId = pendingConnectionNodeId;
    const toNodeId = nodeId;
    const duplicateExists = visibleDiagramEdges.some((edge) => {
      const sameNodes =
        (edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) ||
        (edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId);
      return sameNodes && (edge.toolId === selectedDiagramTool.id || edge.type === selectedDiagramTool.name);
    });

    if (!duplicateExists) {
      const defaultVariant = getDefaultVariant(selectedDiagramTool);
      const newEdgeId = `diagram-edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      updateCurrentDiagramEdges((current) => [
        ...current,
        {
          id: newEdgeId,
          tabId: activeTabId,
          canvasId: activeDiagramCanvasId,
          fromNodeId,
          toNodeId,
          toolId: selectedDiagramTool.id,
          toolBehavior: selectedDiagramTool.behavior || 'standard',
          type: selectedDiagramTool.name,
          color: selectedDiagramTool.color,
          direction: defaultVariant?.direction || selectedDiagramTool.defaultDirection || 'none',
          variantId: defaultVariant?.id || null,
          variant: defaultVariant?.label || selectedDiagramTool.name,
          ...(selectedDiagramTool.behavior === 'family'
            ? {
                familyRelationKind: defaultVariant?.label === 'Siblings' ? 'siblings' : 'related',
                familyParentNodeId: null,
                familyChildNodeId: null,
                familyAdoptive: false,
              }
            : {}),
        },
      ]);
      setSelectedDiagramEdgeId(newEdgeId);
      setDiagramSidebarTab('advanced');
    }
    setPendingConnectionNodeId(null);
  };
  const handleDiagramEdgeSelect = (edgeId) => {
    setSelectedDiagramEdgeId(edgeId);
    setPendingConnectionNodeId(null);
    setDiagramSidebarTab('advanced');
  };
  const handleDiagramEdgeDelete = (edgeId) => {
    updateCurrentDiagramEdges((current) => current.filter((edge) => edge.id !== edgeId));
    setSelectedDiagramEdgeId((current) => (current === edgeId ? null : current));
  };
  const handleSelectedEdgeVariantChange = (variantId) => {
    if (!selectedDiagramEdge) return;
    const tool = getDiagramToolConfig(selectedDiagramEdge.toolId || selectedDiagramEdge.type);
    const variant = tool?.variants?.find((item) => item.id === variantId);
    if (!variant) return;
    updateDiagramEdge(selectedDiagramEdge.id, () => ({
      variantId: variant.id,
      variant: variant.label,
      direction: variant.direction,
      color: tool?.color || selectedDiagramEdge.color,
    }));
  };
  const handleSelectedEdgeDirectionChange = (direction) => {
    if (!selectedDiagramEdge) return;
    updateDiagramEdge(selectedDiagramEdge.id, () => ({ direction }));
  };
  const handleSelectedFamilyRelationKindChange = (relationKind) => {
    if (!selectedDiagramEdge || !isFamilyEdge(selectedDiagramEdge, selectedDiagramEdgeTool)) return;
    updateDiagramEdge(selectedDiagramEdge.id, () => ({
      familyRelationKind: relationKind,
      familyParentNodeId: relationKind === 'lineage' ? selectedDiagramEdge.familyParentNodeId || null : null,
      familyChildNodeId: relationKind === 'lineage' ? selectedDiagramEdge.familyChildNodeId || null : null,
      familyAdoptive: relationKind === 'lineage' ? Boolean(selectedDiagramEdge.familyAdoptive) : false,
      variant:
        relationKind === 'siblings'
          ? 'Siblings'
          : relationKind === 'cousins'
          ? 'Cousins'
          : 'Related',
      direction: relationKind === 'lineage' ? selectedDiagramEdge.direction : 'none',
    }));
  };
  const handleSelectedFamilyRoleAssign = (parentNodeId) => {
    if (!selectedDiagramEdge || !isFamilyEdge(selectedDiagramEdge, selectedDiagramEdgeTool)) return;
    const childNodeId =
      String(parentNodeId) === String(selectedDiagramEdge.fromNodeId)
        ? selectedDiagramEdge.toNodeId
        : selectedDiagramEdge.fromNodeId;
    updateDiagramEdge(selectedDiagramEdge.id, () => ({
      familyRelationKind: 'lineage',
      familyParentNodeId: parentNodeId,
      familyChildNodeId: childNodeId,
      variant: 'Related',
    }));
  };
  const handleSelectedFamilyAdoptiveToggle = () => {
    if (!selectedDiagramEdge || !isFamilyEdge(selectedDiagramEdge, selectedDiagramEdgeTool)) return;
    updateDiagramEdge(selectedDiagramEdge.id, (edge) => ({
      familyAdoptive: !Boolean(edge.familyAdoptive),
    }));
  };
  const handleSelectedEdgeSwapNodes = () => {
    if (!selectedDiagramEdge) return;
    updateDiagramEdge(selectedDiagramEdge.id, (edge) => ({
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId,
    }));
  };

  if (loadingTabs || loadingCats || loadingChars || loadingTags) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden font-body flex flex-col">
      {/* Top header */}
      {!diagramMode && (
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setHomeSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">Forger</h1>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(tab.id));
                  startListDrag('tab', tab);
                }}
                onDragOver={(event) => {
                  if (listDrag?.type !== 'tab') return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  updateListDragTarget('tab', tab.id);
                }}
                onDrop={(event) => {
                  if (listDrag?.type !== 'tab') return;
                  event.preventDefault();
                  handleTabReorder(tab.id);
                }}
                className={`flex-shrink-0 relative group transition-transform ${
                  listDrag?.type === 'tab' && String(listDrag.id) === String(tab.id) ? 'opacity-60' : ''
                } ${
                  listDrag?.type === 'tab' && String(listDrag.overId) === String(tab.id) ? 'scale-[1.03]' : ''
                }`}
              >
                <button
                  draggable={false}
                  onDragStart={(event) => event.stopPropagation()}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTabId === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  } ${
                    listDrag?.type === 'tab' && String(listDrag.overId) === String(tab.id)
                      ? 'ring-2 ring-primary/40'
                      : ''
                  }`}
                >
                  {tab.name}
                </button>
                {activeTabId === tab.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        draggable={false}
                        onDragStart={(event) => event.stopPropagation()}
                        className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-primary/80 hover:bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
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

          {/* Global search */}
          <div className="relative flex-shrink-0 w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search Catalog"
              className="pl-8 pr-8 h-8 text-sm"
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => setGlobalQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {globalQuery.trim().length > 0 && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-card border border-border/60 rounded-md shadow-lg overflow-hidden z-20">
                {globalResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                ) : (
                  globalResults.map((result) => (
                    <button
                      key={result.character.id}
                      type="button"
                      onClick={() => {
                        triggerHighlight(result.character.id, result.tab?.id);
                        setGlobalQuery('');
                        setLocalQuery('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <div className="text-sm font-medium truncate">{result.character.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {result.tab?.name || 'Unknown Tab'} • {result.category?.name || 'Unknown Category'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
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
      )}

      {/* Main content */}
      <main className={diagramMode ? "relative flex-1 overflow-hidden bg-[#0a0f1a]" : "flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-6 pb-6 overflow-hidden"}>
        {diagramMode ? (
          tabs.length === 0 ? (
            <EmptyState type="no-tabs" onAction={() => setTabDialog({ open: true, editData: null })} />
          ) : !activeTabId ? null : (
            <div className="absolute inset-0 overflow-hidden bg-[#0a0f1a] text-slate-100">
              <section
                ref={diagramBoardRef}
                onMouseDown={handleDiagramBoardPanStart}
                onWheel={handleDiagramBoardWheel}
                className={`absolute inset-0 overflow-hidden ${diagramDrag?.type === 'pan-board' ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: DIAGRAM_BOARD_WIDTH,
                    height: DIAGRAM_BOARD_HEIGHT,
                    transform: `translate(${diagramViewport.x}px, ${diagramViewport.y}px) scale(${diagramViewport.zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top,#172036,transparent_45%),linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.6)]" />
                  <svg className="absolute inset-0 h-full w-full overflow-visible">
                    <defs>
                      {visibleDiagramEdges.map((edge) => (
                        <marker
                          key={`arrow-${edge.id}`}
                          id={`arrow-${edge.id}`}
                          viewBox={`0 0 ${DIAGRAM_ARROW_SIZE} ${DIAGRAM_ARROW_SIZE}`}
                          markerWidth={DIAGRAM_ARROW_SIZE}
                          markerHeight={DIAGRAM_ARROW_SIZE}
                          refX={DIAGRAM_ARROW_SIZE - 6}
                          refY={DIAGRAM_ARROW_SIZE / 2}
                          orient="auto-start-reverse"
                          markerUnits="userSpaceOnUse"
                        >
                          <path
                            d={`M 0 0 L ${DIAGRAM_ARROW_SIZE} ${DIAGRAM_ARROW_SIZE / 2} L 0 ${DIAGRAM_ARROW_SIZE} z`}
                            fill={edge.color}
                          />
                        </marker>
                      ))}
                    </defs>
                    {visibleDiagramEdges.map((edge) => {
                      const fromNode = visibleDiagramNodes.find((node) => node.id === edge.fromNodeId);
                      const toNode = visibleDiagramNodes.find((node) => node.id === edge.toNodeId);
                      if (!fromNode || !toNode) return null;
                      const start = getNodeAnchorPoint(fromNode, toNode);
                      const end = getNodeAnchorPoint(toNode, fromNode);
                      const x1 = start.x;
                      const y1 = start.y;
                      const x2 = end.x;
                      const y2 = end.y;
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      const markerEnd =
                        edge.direction === 'forward' || edge.direction === 'both' ? `url(#arrow-${edge.id})` : undefined;
                      const markerStart =
                        edge.direction === 'backward' || edge.direction === 'both' ? `url(#arrow-${edge.id})` : undefined;
                      return (
                        <g
                          key={edge.id}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => handleDiagramEdgeSelect(edge.id)}
                        >
                          <path
                            d={`M ${x1} ${y1} L ${x2} ${y2}`}
                            stroke={edge.color}
                            strokeWidth={selectedDiagramEdgeId === edge.id ? '5' : '4'}
                            strokeLinecap="round"
                            opacity="0.95"
                            fill="none"
                            markerEnd={markerEnd}
                            markerStart={markerStart}
                            className="cursor-pointer"
                          />
                          <rect
                            x={midX - 52}
                            y={midY - 12}
                            width="104"
                            height="24"
                            rx="12"
                            fill="#020617"
                            opacity="0.92"
                          />
                          <text
                            x={midX}
                            y={midY + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill={edge.color}
                            className="pointer-events-none"
                          >
                            {getEdgeDisplayLabel(edge, getDiagramToolConfig(edge.toolId || edge.type))}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  {visibleDiagramNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onMouseDown={(event) => handleDiagramNodeDragStart(node.id, event)}
                      onClick={() => handleDiagramNodeClick(node.id)}
                      className={`absolute z-20 w-44 rounded-2xl border bg-slate-950/90 px-4 py-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur-sm cursor-grab active:cursor-grabbing ${
                        diagramDrag?.type === 'move-node' && diagramDrag.nodeId === node.id && diagramDrag.overSidebar
                          ? 'border-rose-400/80 ring-2 ring-rose-400/40'
                          : pendingConnectionNodeId === node.id
                          ? 'border-sky-400/80 ring-2 ring-sky-400/35'
                          : 'border-slate-700'
                      }`}
                      style={{ left: node.x, top: node.y }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 min-h-10 min-w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
                          style={{ backgroundColor: node.categoryColor }}
                        >
                          {node.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">{node.name}</div>
                          <div className="truncate text-xs text-slate-400">{node.categoryName}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {diagramDrag?.type === 'new-node' && (
                  <div
                    className="pointer-events-none fixed z-[120] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: diagramDrag.clientX, top: diagramDrag.clientY }}
                  >
                    <div className="w-44 rounded-2xl border border-dashed border-sky-400/80 bg-slate-950/90 px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-xs font-semibold text-sky-200">
                          {diagramDrag.character.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">
                            {diagramDrag.character.name}
                          </div>
                          <div className="truncate text-xs text-slate-400">Drop to place node</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              <aside
                ref={diagramSidebarRef}
                className={`absolute left-4 top-4 bottom-4 z-30 flex flex-col rounded-2xl border bg-[#0f1726]/94 px-5 py-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[width] duration-200 ${
                  diagramSidebarTab === 'tools' && diagramToolManagerOpen ? 'w-[460px]' : 'w-[350px]'
                } ${
                  diagramDrag?.type === 'move-node' && diagramDrag.overSidebar
                    ? 'border-rose-400/80 ring-2 ring-rose-400/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Diagram Mode</h2>
                    <p className="text-sm text-slate-400">
                      {selectedDiagramTool
                        ? `Connecting with ${selectedDiagramTool.name}. Pick two nodes.`
                        : 'Build your board from the sidebar.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/', { state: { activeTabId } })}
                    className="gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                </div>
                <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => setDiagramSidebarTab('characters')}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      diagramSidebarTab === 'characters'
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Characters
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramSidebarTab('tools')}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      diagramSidebarTab === 'tools'
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tools
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramSidebarTab('advanced')}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      diagramSidebarTab === 'advanced'
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                {diagramSidebarTab === 'characters' ? (
                  <div className="space-y-6">
                    {diagramCategories.length === 0 ? (
                      <div className="text-sm text-slate-500">No characters in this tab yet.</div>
                    ) : (
                      diagramCategories.map((category) => (
                        <section key={category.id}>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </div>
                          <div className="mt-2 space-y-1.5 pl-[18px]">
                            {category.characters.map((character) => (
                              <button
                                key={character.id}
                                type="button"
                                onMouseDown={(event) => handleDiagramCharacterDragStart(character, event)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
                              >
                                {character.name}
                              </button>
                            ))}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                ) : diagramSidebarTab === 'tools' ? (
                  <div className="space-y-5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDiagramToolManagerOpen((current) => !current)}
                        className={`flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          diagramToolManagerOpen
                            ? 'border-sky-400/70 bg-sky-500/10 text-sky-200'
                            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {diagramToolManagerOpen ? 'Close Manager' : 'Customize Tools'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDiagramToolCategoryAdd}
                        className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
                      >
                        Add Category
                      </button>
                    </div>

                    {diagramToolManagerOpen && (
                      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Tool Manager</div>
                        {diagramToolGroups.map((group) => (
                          <section key={group.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                            <div className="flex items-center gap-2">
                              <input
                                value={group.title}
                                onChange={(event) => handleDiagramToolCategoryUpdate(group.id, event.target.value)}
                                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleDiagramToolAdd(group.id)}
                                className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 hover:border-slate-500"
                              >
                                Add Tool
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDiagramToolCategoryDelete(group.id)}
                                className="rounded-lg border border-rose-500/50 px-2 py-2 text-xs text-rose-200 hover:border-rose-400"
                              >
                                Delete
                              </button>
                            </div>

                            <div className="space-y-3">
                              {group.items.map((tool) => (
                                <div key={tool.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                                  <div className="grid grid-cols-[1fr_auto] gap-2">
                                    <input
                                      value={tool.name}
                                      onChange={(event) => handleDiagramToolUpdate(group.id, tool.id, { name: event.target.value })}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDiagramToolDelete(group.id, tool.id)}
                                      className="rounded-lg border border-rose-500/50 px-2 py-2 text-xs text-rose-200 hover:border-rose-400"
                                    >
                                      Delete Tool
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Color</div>
                                    <div className="flex flex-wrap gap-2">
                                      {COLOR_OPTIONS.map((color) => {
                                        const selected = tool.color === color;
                                        return (
                                          <button
                                            key={color}
                                            type="button"
                                            onClick={() => handleDiagramToolUpdate(group.id, tool.id, { color })}
                                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-105 ${
                                              selected ? 'border-white ring-2 ring-white/30' : 'border-slate-900'
                                            }`}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Select ${color}`}
                                            title={color}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      value={tool.behavior || 'standard'}
                                      onChange={(event) => handleDiagramToolUpdate(group.id, tool.id, { behavior: event.target.value })}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none"
                                    >
                                      <option value="standard">Standard</option>
                                      <option value="family">Family</option>
                                    </select>
                                    <select
                                      value={tool.defaultDirection || 'none'}
                                      onChange={(event) => handleDiagramToolUpdate(group.id, tool.id, { defaultDirection: event.target.value })}
                                      disabled={tool.behavior === 'family'}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none disabled:opacity-50"
                                    >
                                      <option value="none">No Arrow</option>
                                      <option value="forward">Forward</option>
                                      <option value="backward">Backward</option>
                                      <option value="both">Both Ends</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Variants</div>
                                      {tool.behavior !== 'family' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDiagramVariantAdd(group.id, tool.id)}
                                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                                        >
                                          Add Variant
                                        </button>
                                      )}
                                    </div>
                                    {tool.variants.map((variant) => (
                                      <div key={variant.id} className="grid grid-cols-[1fr_auto_auto] gap-2">
                                        <input
                                          value={variant.label}
                                          onChange={(event) =>
                                            handleDiagramVariantUpdate(group.id, tool.id, variant.id, { label: event.target.value })
                                          }
                                          disabled={tool.behavior === 'family'}
                                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none disabled:opacity-60"
                                        />
                                        <select
                                          value={variant.direction}
                                          onChange={(event) =>
                                            handleDiagramVariantUpdate(group.id, tool.id, variant.id, { direction: event.target.value })
                                          }
                                          disabled={tool.behavior === 'family'}
                                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 outline-none disabled:opacity-60"
                                        >
                                          <option value="none">No Arrow</option>
                                          <option value="forward">Forward</option>
                                          <option value="backward">Backward</option>
                                          <option value="both">Both Ends</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => handleDiagramVariantDelete(group.id, tool.id, variant.id)}
                                          disabled={tool.behavior === 'family' || tool.variants.length <= 1}
                                          className="rounded-lg border border-rose-500/40 px-2 py-2 text-xs text-rose-200 hover:border-rose-400 disabled:opacity-40"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}

                    {diagramToolGroups.map((group) => (
                      <section key={group.id}>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {group.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleDiagramToolSelect(item)}
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                selectedDiagramTool?.id === item.id
                                  ? 'text-white'
                                  : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'
                              }`}
                              style={
                                selectedDiagramTool?.id === item.id
                                  ? {
                                      borderColor: item.color,
                                      backgroundColor: `${item.color}22`,
                                      color: item.color,
                                    }
                                  : undefined
                              }
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDiagramToolId(null);
                        setPendingConnectionNodeId(null);
                      }}
                      className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {!selectedDiagramEdge ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                        Select a wire to edit its subtype, direction, or endpoints.
                      </div>
                    ) : (
                      <>
                        {isFamilyEdge(selectedDiagramEdge, selectedDiagramEdgeTool) ? (
                          <>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected Wire</div>
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: selectedDiagramEdge.color }}
                                />
                                <span className="text-sm font-semibold text-slate-100">
                                  {getEdgeDisplayLabel(selectedDiagramEdge, selectedDiagramEdgeTool)}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-slate-400">
                                {visibleDiagramNodeMap.get(selectedDiagramEdge.fromNodeId)?.name || 'Unknown'}
                                {' - '}
                                {visibleDiagramNodeMap.get(selectedDiagramEdge.toNodeId)?.name || 'Unknown'}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                {getFamilyEdgeSummary(selectedDiagramEdge, visibleDiagramNodeMap, selectedDiagramEdgeTool)}
                              </div>
                            </div>

                            <section>
                              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Relation
                              </h3>
                              <div className="mt-2 grid grid-cols-1 gap-2">
                                {[
                                  { value: 'related', label: 'Related' },
                                  { value: 'lineage', label: 'Parent / Child' },
                                  { value: 'siblings', label: 'Siblings' },
                                  { value: 'cousins', label: 'Cousins' },
                                ].map((option) => {
                                  const familyMeta = getFamilyEdgeMeta(selectedDiagramEdge, selectedDiagramEdgeTool);
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedFamilyRelationKindChange(option.value)}
                                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                        familyMeta?.relationKind === option.value
                                          ? 'border-sky-400/70 bg-sky-500/10 text-sky-200'
                                          : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </section>

                            {getFamilyEdgeMeta(selectedDiagramEdge, selectedDiagramEdgeTool)?.relationKind === 'lineage' && (
                              <>
                                <section>
                                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Parent / Child
                                  </h3>
                                  <div className="mt-2 grid grid-cols-1 gap-2">
                                    {[selectedDiagramEdge.fromNodeId, selectedDiagramEdge.toNodeId].map((nodeId) => {
                                      const familyMeta = getFamilyEdgeMeta(selectedDiagramEdge, selectedDiagramEdgeTool);
                                      const node = visibleDiagramNodeMap.get(nodeId);
                                      const isParent = String(familyMeta?.parentNodeId) === String(nodeId);
                                      const counterpartId =
                                        String(nodeId) === String(selectedDiagramEdge.fromNodeId)
                                          ? selectedDiagramEdge.toNodeId
                                          : selectedDiagramEdge.fromNodeId;
                                      const counterpart = visibleDiagramNodeMap.get(counterpartId);
                                      return (
                                        <button
                                          key={nodeId}
                                          type="button"
                                          onClick={() => handleSelectedFamilyRoleAssign(nodeId)}
                                          className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                            isParent
                                              ? 'border-sky-400/70 bg-sky-500/10 text-sky-200'
                                              : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                                          }`}
                                        >
                                          {node?.name || 'Unknown'} is the parent
                                          <span className="block text-xs text-slate-500">
                                            {counterpart?.name || 'Unknown'} becomes the child
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>

                                <section>
                                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 hover:border-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedDiagramEdge.familyAdoptive)}
                                      onChange={handleSelectedFamilyAdoptiveToggle}
                                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-400"
                                    />
                                    <span>Adoptive relationship</span>
                                  </label>
                                </section>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected Wire</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: selectedDiagramEdge.color }}
                            />
                            <span className="text-sm font-semibold text-slate-100">
                              {getEdgeDisplayLabel(selectedDiagramEdge, selectedDiagramEdgeTool)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {visibleDiagramNodeMap.get(selectedDiagramEdge.fromNodeId)?.name || 'Unknown'}
                            {' -> '}
                            {visibleDiagramNodeMap.get(selectedDiagramEdge.toNodeId)?.name || 'Unknown'}
                          </div>
                        </div>

                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Variant
                          </h3>
                          <div className="mt-2 space-y-2">
                            {(selectedDiagramEdgeTool?.variants || []).map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => handleSelectedEdgeVariantChange(variant.id)}
                                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                  selectedDiagramEdge.variantId === variant.id || selectedDiagramEdge.variant === variant.label
                                    ? 'border-sky-400/70 bg-sky-500/10 text-sky-200'
                                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                                }`}
                              >
                                {variant.label}
                              </button>
                            ))}
                          </div>
                        </section>
                          </>
                        )}

                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Direction
                          </h3>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {[
                              { value: 'none', label: 'No Arrow' },
                              { value: 'forward', label: 'Forward' },
                              { value: 'backward', label: 'Backward' },
                              { value: 'both', label: 'Both Ends' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelectedEdgeDirectionChange(option.value)}
                                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                                  selectedDiagramEdge.direction === option.value
                                    ? 'border-sky-400/70 bg-sky-500/10 text-sky-200'
                                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </section>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSelectedEdgeSwapNodes}
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                          >
                            Swap Ends
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiagramEdgeDelete(selectedDiagramEdge.id)}
                            className="flex-1 rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:border-rose-400"
                          >
                            Delete Wire
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </div>
              </aside>
              <aside
                className={`absolute right-4 top-4 bottom-4 z-30 flex flex-col rounded-2xl border border-slate-800 bg-[#0f1726]/94 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[width] duration-200 ${
                  diagramCanvasDockOpen ? 'w-[280px] px-4 py-5' : 'w-[80px] h-[65px] px-2 py-3'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDiagramCanvasDockOpen((current) => !current)}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  {diagramCanvasDockOpen ? 'Hide' : 'Deck'}
                </button>

                {diagramCanvasDockOpen && (
                  <div className="mt-4 flex min-h-0 flex-1 flex-col">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Tab</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{activeDiagramTabName}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {visibleDiagramCanvases.length} saved canvas{visibleDiagramCanvases.length === 1 ? '' : 'es'}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDiagramCanvasAdd}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                      >
                        Add Canvas
                      </button>
                      <button
                        type="button"
                        onClick={handleCurrentDiagramCanvasDelete}
                        disabled={visibleDiagramCanvases.length <= 1}
                        className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:border-rose-400 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>

                    {currentDiagramCanvas && (
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Canvas Name</div>
                        <input
                          value={currentDiagramCanvas.name}
                          onChange={(event) => handleCurrentDiagramCanvasRename(event.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                        />
                      </div>
                    )}

                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                      <div className="space-y-2">
                        {visibleDiagramCanvases.map((canvas) => {
                          const selected = canvas.id === activeDiagramCanvasId;
                          return (
                            <button
                              key={canvas.id}
                              type="button"
                              onClick={() => handleDiagramCanvasSelect(canvas.id)}
                              className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                                selected
                                  ? 'border-sky-400/70 bg-sky-500/10 text-sky-100'
                                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="text-sm font-semibold">{canvas.name}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                {diagramNodes.filter((node) => node.canvasId === canvas.id).length} nodes
                                {' • '}
                                {diagramEdges.filter((edge) => edge.canvasId === canvas.id).length} wires
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )
        ) : tabs.length === 0 ? (
          <EmptyState type="no-tabs" onAction={() => setTabDialog({ open: true, editData: null })} />
        ) : !activeTabId ? null : activeCategories.length === 0 ? (
          <EmptyState type="no-categories" onAction={() => setCategoryDialog({ open: true, editData: null })} />
        ) : localQuery.trim().length > 0 && visibleCategories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-medium">No matching characters</p>
            <p className="text-sm mt-1">Try a different search to bring categories back into view.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full overflow-x-auto overflow-y-hidden pb-2">
              <div className="flex h-full items-stretch gap-5">
              {visibleCategories.map((cat) => (
                <div
                  key={cat.id}
                  onDragOver={(event) => {
                    if (listDrag?.type !== 'category') return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    updateListDragTarget('category', cat.id);
                  }}
                  onDrop={(event) => {
                    if (listDrag?.type !== 'category') return;
                    event.preventDefault();
                    handleCategoryReorder(cat.id);
                  }}
                  className={`h-full transition-transform ${
                    listDrag?.type === 'category' && String(listDrag.id) === String(cat.id) ? 'opacity-60' : ''
                  } ${
                    listDrag?.type === 'category' && String(listDrag.overId) === String(cat.id) ? 'scale-[1.01]' : ''
                  }`}
                >
                  <CategoryColumn
                    category={cat}
                    characters={getCategoryCharacters(cat.id)}
                    allCategories={visibleCategories}
                    tags={tags}
                    highlightedId={highlightedId}
                    isFiltering={localQuery.trim().length > 0}
                    isReorderTarget={listDrag?.type === 'category' && String(listDrag.overId) === String(cat.id)}
                    onReorderDragStart={() => startListDrag('category', cat)}
                    onAddCharacter={(catId) => setCharacterDialog({ open: true, editData: null, defaultCategoryId: catId })}
                    onEditCategory={(cat) => setCategoryDialog({ open: true, editData: cat })}
                    onDeleteCategory={(cat) => setDeleteConfirm({ open: true, type: 'category', item: cat })}
                    onEditCharacter={(char) => setCharacterDialog({ open: true, editData: char, defaultCategoryId: null })}
                    onDeleteCharacter={(char) => setDeleteConfirm({ open: true, type: 'character', item: char })}
                    onMoveCharacter={(char, catId) => moveCharacter.mutate({ character: char, newCategoryId: catId })}
                    onProxyDragStart={handleProxyDragStart}
                    onProxySelect={handleProxySelect}
                  />
                </div>
              ))}
              </div>
            </div>
          </DragDropContext>
        )}
      </main>

      {proxyDrag && (
        <div
          className="fixed left-0 top-0 pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(${proxyDrag.x}px, ${proxyDrag.y}px) translate(-50%, -50%)` }}
        >
          <div
            className={`min-w-[220px] rounded-lg border-2 border-dashed bg-card/95 px-3 py-2 shadow-xl ${
              proxyDrag.hoveredCategoryId &&
              String(proxyDrag.hoveredCategoryId) !== String(proxyDrag.character.category_id)
                ? 'border-primary'
                : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {proxyDrag.character.image_url ? (
                  <img
                    src={proxyDrag.character.image_url}
                    alt={proxyDrag.character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{proxyDrag.character.name}</div>
                <div className="text-[11px] text-muted-foreground">Multi-category proxy</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sheet open={homeSidebarOpen} onOpenChange={setHomeSidebarOpen}>
        <SheetContent side="left" className="w-[320px] sm:max-w-[320px] p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border/50 px-6 py-5 text-left">
              <SheetTitle className="font-heading text-xl">Workspace</SheetTitle>
              <SheetDescription>
                Quick access to tab tools and future navigation.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 px-6 py-5">
              <div className="space-y-2">
                <label htmlFor="tab-local-search" className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tab-local-search"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    placeholder="Search Tab"
                  className="pl-9 pr-9 h-10 text-sm"
                    disabled={!activeTabId || diagramMode}
                  />
                  {localQuery && (
                    <button
                      type="button"
                      onClick={() => setLocalQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeTabId
                    ? `${filteredCharacterCount} / ${activeCharacterCount} shown in this tab`
                    : 'Pick a tab to search within it.'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-3 h-11"
                onClick={() => {
                  setHomeSidebarOpen(false);
                  if (activeTabId) navigate('/diagram', { state: { activeTabId } });
                }}
                disabled={!activeTabId}
              >
                <PanelTopOpen className="w-4 h-4" />
                Diagram Mode
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-3 h-11"
                onClick={() => {
                  setHomeSidebarOpen(false);
                  if (activeTabId) navigate('/concepts', { state: { activeTabId } });
                }}
                disabled={!activeTabId}
              >
                <Lightbulb className="w-4 h-4" />
                Concepts
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-3 h-11"
                onClick={() => {
                  setHomeSidebarOpen(false);
                  if (activeTabId) navigate(`/timeline/${activeTabId}`);
                }}
                disabled={!activeTabId}
              >
                <Clock3 className="w-4 h-4" />
                Timeline
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-3 h-11"
                onClick={() => {
                  setHomeSidebarOpen(false);
                  if (activeTabId) setTagsDialogOpen(true);
                }}
                disabled={!activeTabId}
              >
                <TagsIcon className="w-4 h-4" />
                Tags
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
              Delete {deleteConfirm.type === 'tab' ? 'Tab' : deleteConfirm.type === 'category' ? 'Category' : deleteConfirm.item?.is_proxy ? 'Proxy' : 'Character'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.type === 'tab'
                ? 'This will permanently delete this tab, all its categories, and all characters inside them.'
                : deleteConfirm.type === 'category'
                ? 'This will permanently delete this category and all characters inside it.'
                : deleteConfirm.item?.is_proxy
                ? 'This will permanently delete this proxy. The original character will remain.'
                : 'This will permanently delete this character and all of its proxies.'}
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

    </div>
  );
}
