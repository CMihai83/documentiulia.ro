'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
  metadata?: Record<string, unknown>;
}

export type TreeSelectionMode = 'single' | 'multiple' | 'none';

// ============================================================================
// Icons
// ============================================================================

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <motion.svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={false}
    animate={{ rotate: expanded ? 90 : 0 }}
    transition={{ duration: 0.2 }}
  >
    <polyline points="9 18 15 12 9 6" />
  </motion.svg>
);

const FolderIcon = ({ open }: { open?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-yellow-500"
  >
    {open ? (
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    ) : (
      <>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </>
    )}
  </svg>
);

const FileIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-muted-foreground"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// ============================================================================
// Tree Context
// ============================================================================

interface TreeContextValue {
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  selectionMode: TreeSelectionMode;
  showIcons: boolean;
  showLines: boolean;
  toggleExpanded: (id: string) => void;
  toggleSelected: (id: string) => void;
  isExpanded: (id: string) => boolean;
  isSelected: (id: string) => boolean;
}

const TreeContext = React.createContext<TreeContextValue | undefined>(undefined);

function useTree() {
  const context = React.useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within a TreeView component');
  }
  return context;
}

// ============================================================================
// Tree View Root
// ============================================================================

interface TreeViewProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TreeNode[];
  defaultExpanded?: string[];
  defaultSelected?: string[];
  selectionMode?: TreeSelectionMode;
  showIcons?: boolean;
  showLines?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onExpansionChange?: (expandedIds: string[]) => void;
  onNodeClick?: (node: TreeNode) => void;
}

export const TreeView = React.forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      data,
      defaultExpanded = [],
      defaultSelected = [],
      selectionMode = 'single',
      showIcons = true,
      showLines = false,
      onSelectionChange,
      onExpansionChange,
      onNodeClick,
      ...props
    },
    ref
  ) => {
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
      new Set(defaultExpanded)
    );
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
      new Set(defaultSelected)
    );

    const toggleExpanded = React.useCallback(
      (id: string) => {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          onExpansionChange?.(Array.from(next));
          return next;
        });
      },
      [onExpansionChange]
    );

    const toggleSelected = React.useCallback(
      (id: string) => {
        if (selectionMode === 'none') return;

        setSelectedIds((prev) => {
          const next = new Set(selectionMode === 'single' ? [] : prev);
          if (prev.has(id) && selectionMode === 'multiple') {
            next.delete(id);
          } else {
            next.add(id);
          }
          onSelectionChange?.(Array.from(next));
          return next;
        });
      },
      [selectionMode, onSelectionChange]
    );

    const isExpanded = (id: string) => expandedIds.has(id);
    const isSelected = (id: string) => selectedIds.has(id);

    return (
      <TreeContext.Provider
        value={{
          expandedIds,
          selectedIds,
          selectionMode,
          showIcons,
          showLines,
          toggleExpanded,
          toggleSelected,
          isExpanded,
          isSelected,
        }}
      >
        <div
          ref={ref}
          role="tree"
          className={cn('text-sm', className)}
          {...props}
        >
          {data.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      </TreeContext.Provider>
    );
  }
);
TreeView.displayName = 'TreeView';

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
}

function TreeNodeComponent({ node, level, onNodeClick }: TreeNodeComponentProps) {
  const {
    showIcons,
    showLines,
    toggleExpanded,
    toggleSelected,
    isExpanded,
    isSelected,
  } = useTree();

  const hasChildren = node.children && node.children.length > 0;
  const expanded = isExpanded(node.id);
  const selected = isSelected(node.id);

  const handleClick = () => {
    if (node.disabled) return;
    toggleSelected(node.id);
    onNodeClick?.(node);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleExpanded(node.id);
    }
  };

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent',
          selected && 'bg-accent',
          node.disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={handleExpand}
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0',
            !hasChildren && 'invisible'
          )}
        >
          {hasChildren && <ChevronIcon expanded={expanded} />}
        </button>

        {/* Icon */}
        {showIcons && (
          <span className="shrink-0">
            {node.icon || (hasChildren ? <FolderIcon open={expanded} /> : <FileIcon />)}
          </span>
        )}

        {/* Label */}
        <span className="truncate">{node.label}</span>
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('overflow-hidden', showLines && 'border-l border-border ml-4')}
          >
            {node.children!.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                onNodeClick={onNodeClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Tree Item (For custom tree building)
// ============================================================================

interface TreeItemProps extends React.HTMLAttributes<HTMLDivElement> {
  nodeId: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  ({ className, nodeId, label, icon, disabled, children, ...props }, ref) => {
    const { showIcons, toggleExpanded, toggleSelected, isExpanded, isSelected } =
      useTree();

    const hasChildren = React.Children.count(children) > 0;
    const expanded = isExpanded(nodeId);
    const selected = isSelected(nodeId);

    return (
      <div ref={ref} role="treeitem" {...props}>
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-accent',
            selected && 'bg-accent',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          onClick={() => !disabled && toggleSelected(nodeId)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpanded(nodeId);
            }}
            className={cn('w-4 h-4 flex items-center justify-center', !hasChildren && 'invisible')}
          >
            {hasChildren && <ChevronIcon expanded={expanded} />}
          </button>
          {showIcons && icon}
          <span className="truncate">{label}</span>
        </div>
        <AnimatePresence>
          {hasChildren && expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-4 overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
TreeItem.displayName = 'TreeItem';

// ============================================================================
// Simple Tree View
// ============================================================================

interface SimpleTreeViewProps {
  data: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  className?: string;
}

export function SimpleTreeView({ data, onSelect, className }: SimpleTreeViewProps) {
  return (
    <TreeView
      data={data}
      selectionMode="single"
      onNodeClick={onSelect}
      className={className}
    />
  );
}

// ============================================================================
// File Explorer Tree
// ============================================================================

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  extension?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect?: (file: FileNode) => void;
  className?: string;
}

const getFileIcon = (extension?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    ts: (
      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3zm10.71 14.29c.18.18.43.29.71.29s.53-.11.71-.29l2.83-2.83a.996.996 0 1 0-1.41-1.41L14.5 15.09V9.5a1 1 0 0 0-2 0v5.59l-2.04-2.04a.996.996 0 1 0-1.41 1.41l2.83 2.83z" />
      </svg>
    ),
    tsx: (
      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 0 1-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9s-1.17 0-1.71.03c-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03s1.17 0 1.71-.03c.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26s-1.18-1.63-3.28-2.26c-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26s1.18 1.63 3.28 2.26c.25-.76.55-1.51.89-2.26m9 2.26-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-9.82 1.12c.54.5 1.07.98 1.58 1.4.18-.5.39-1.03.63-1.56-.42-.06-.85-.14-1.26-.24-.31.14-.63.27-.95.4m9.75 0c-.32-.13-.63-.26-.95-.4-.41.1-.84.18-1.26.24.24.53.45 1.06.63 1.56.51-.42 1.04-.9 1.58-1.4m-9.75-6.76c.32.13.63.26.95.4.41-.1.84-.18 1.26-.24-.24-.53-.45-1.06-.63-1.56-.51.42-1.04.9-1.58 1.4m9.75 0c-.54-.5-1.07-.98-1.58-1.4-.18.5-.39 1.03-.63 1.56.42.06.85.14 1.26.24.31-.14.63-.27.95-.4m-4.83 8.38c-.94.71-1.87 1.17-2.64 1.28.59.09 1.21.14 1.87.14.66 0 1.28-.05 1.87-.14-.77-.11-1.7-.57-2.64-1.28m0-10.44c.94-.71 1.87-1.17 2.64-1.28-.59-.09-1.21-.14-1.87-.14-.66 0-1.28.05-1.87.14.77.11 1.7.57 2.64 1.28z" />
      </svg>
    ),
    js: (
      <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3m4.73 15.04c.4.85 1.19 1.55 2.54 1.55 1.5 0 2.53-.8 2.53-2.55v-5.78h-1.7V17c0 .86-.35 1.08-.9 1.08-.58 0-.82-.4-1.09-.87l-1.38.83m5.98-.18c.5.98 1.51 1.73 3.09 1.73 1.6 0 2.8-.83 2.8-2.36 0-1.41-.81-2.04-2.25-2.66l-.42-.18c-.73-.31-1.04-.52-1.04-1.02 0-.41.31-.73.81-.73.48 0 .8.21 1.09.73l1.31-.87c-.55-.96-1.33-1.33-2.4-1.33-1.51 0-2.48.96-2.48 2.23 0 1.38.81 2.03 2.03 2.55l.42.18c.78.34 1.24.55 1.24 1.13 0 .48-.45.83-1.15.83-.83 0-1.31-.43-1.67-1.03l-1.38.8z" />
      </svg>
    ),
    json: (
      <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 3h2v2H5v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 0 0-2-2H0v-2h1a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2m14 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5h-2V3h2m-7 12a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m-4 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m8 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1z" />
      </svg>
    ),
    md: (
      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 16V8h2.5l2.5 3 2.5-3H12v8H9.5v-5L7 12l-2.5-3v5H2m15 0v-4h-2v-2h2V8h2v2h2v2h-2v4h-2z" />
      </svg>
    ),
    css: (
      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 3l-.65 3.34h13.59L17.5 8.5H3.92l-.66 3.33h13.59l-.76 3.81-5.48 1.81-4.75-1.81.33-1.64H2.85l-.79 4 7.85 3 9.05-3 1.2-6.03.24-1.21L21.94 3H5z" />
      </svg>
    ),
  };

  return iconMap[extension || ''] || <FileIcon />;
};

function convertToTreeNodes(files: FileNode[], parentId = ''): TreeNode[] {
  return files.map((file, index) => {
    const id = parentId ? `${parentId}-${index}` : `${index}`;
    return {
      id,
      label: file.name,
      icon:
        file.type === 'folder' ? undefined : getFileIcon(file.extension),
      children: file.children ? convertToTreeNodes(file.children, id) : undefined,
    };
  });
}

export function FileExplorer({ files, onFileSelect, className }: FileExplorerProps) {
  const treeData = React.useMemo(() => convertToTreeNodes(files), [files]);

  const handleNodeClick = (node: TreeNode) => {
    // Find the original file node
    const findFile = (nodes: FileNode[], targetLabel: string): FileNode | undefined => {
      for (const file of nodes) {
        if (file.name === targetLabel) return file;
        if (file.children) {
          const found = findFile(file.children, targetLabel);
          if (found) return found;
        }
      }
      return undefined;
    };

    const file = findFile(files, node.label);
    if (file && file.type === 'file') {
      onFileSelect?.(file);
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg p-2', className)}>
      <TreeView
        data={treeData}
        selectionMode="single"
        onNodeClick={handleNodeClick}
        defaultExpanded={treeData.map((n) => n.id)}
      />
    </div>
  );
}

// ============================================================================
// Category Tree (For accounting)
// ============================================================================

interface CategoryNode {
  id: string;
  name: string;
  count?: number;
  children?: CategoryNode[];
}

interface CategoryTreeProps {
  categories: CategoryNode[];
  onSelect?: (category: CategoryNode) => void;
  selectedId?: string;
  className?: string;
}

function convertCategoriesToTreeNodes(categories: CategoryNode[]): TreeNode[] {
  return categories.map((cat) => ({
    id: cat.id,
    label: cat.count !== undefined ? `${cat.name} (${cat.count})` : cat.name,
    children: cat.children ? convertCategoriesToTreeNodes(cat.children) : undefined,
    metadata: { originalName: cat.name, count: cat.count },
  }));
}

export function CategoryTree({
  categories,
  onSelect,
  selectedId,
  className,
}: CategoryTreeProps) {
  const treeData = React.useMemo(
    () => convertCategoriesToTreeNodes(categories),
    [categories]
  );

  const handleNodeClick = (node: TreeNode) => {
    const findCategory = (nodes: CategoryNode[], id: string): CategoryNode | undefined => {
      for (const cat of nodes) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const category = findCategory(categories, node.id);
    if (category) {
      onSelect?.(category);
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg p-2', className)}>
      <TreeView
        data={treeData}
        selectionMode="single"
        defaultSelected={selectedId ? [selectedId] : []}
        onNodeClick={handleNodeClick}
        showIcons={false}
      />
    </div>
  );
}

// ============================================================================
// Checkbox Tree
// ============================================================================

interface CheckboxTreeProps {
  data: TreeNode[];
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  className?: string;
}

export function CheckboxTree({
  data,
  selected = [],
  onSelectionChange,
  className,
}: CheckboxTreeProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set(selected));

  const toggleNode = (id: string, node: TreeNode) => {
    const newSelected = new Set(selectedIds);

    const toggleWithChildren = (n: TreeNode, add: boolean) => {
      if (add) {
        newSelected.add(n.id);
      } else {
        newSelected.delete(n.id);
      }
      n.children?.forEach((child) => toggleWithChildren(child, add));
    };

    const shouldAdd = !selectedIds.has(id);
    toggleWithChildren(node, shouldAdd);

    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const renderNode = (node: TreeNode, level: number) => {
    const isSelected = selectedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const [expanded, setExpanded] = React.useState(true);

    // Check if all children are selected
    const allChildrenSelected = node.children?.every((child) =>
      selectedIds.has(child.id)
    );
    const someChildrenSelected =
      node.children?.some((child) => selectedIds.has(child.id)) && !allChildrenSelected;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1 hover:bg-accent rounded px-2"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-4 h-4 flex items-center justify-center"
            >
              <ChevronIcon expanded={expanded} />
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <input
            type="checkbox"
            checked={isSelected}
            ref={(el) => {
              if (el) el.indeterminate = someChildrenSelected || false;
            }}
            onChange={() => toggleNode(node.id, node)}
            className="w-4 h-4 rounded border-input"
          />
          <span className="text-sm">{node.label}</span>
        </div>
        {hasChildren && expanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('text-sm', className)}>
      {data.map((node) => renderNode(node, 0))}
    </div>
  );
}

// ============================================================================
// Draggable Tree (for reordering)
// ============================================================================

interface DraggableTreeProps {
  data: TreeNode[];
  onReorder?: (data: TreeNode[]) => void;
  className?: string;
}

export function DraggableTree({ data, onReorder, className }: DraggableTreeProps) {
  const [items, setItems] = React.useState(data);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newItems = [...items];
    const draggedIndex = newItems.findIndex((item) => item.id === draggedId);
    const targetIndex = newItems.findIndex((item) => item.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);
      setItems(newItems);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    onReorder?.(items);
  };

  return (
    <div className={cn('text-sm space-y-1', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            'flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md cursor-move',
            draggedId === item.id && 'opacity-50'
          )}
        >
          <svg
            className="w-4 h-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
          {item.icon}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export { useTree };
