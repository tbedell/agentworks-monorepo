import type { CanvasComponent } from '../types/ui-builder';

/**
 * Get all child components of a given parent
 */
export function getComponentChildren(
  componentId: string,
  allComponents: CanvasComponent[]
): CanvasComponent[] {
  return allComponents.filter(c => c.parentId === componentId);
}

/**
 * Get all root-level components (no parent)
 */
export function getRootComponents(components: CanvasComponent[]): CanvasComponent[] {
  return components.filter(c => !c.parentId);
}

/**
 * Check if one component is an ancestor of another
 */
export function isAncestorOf(
  potentialAncestorId: string,
  componentId: string,
  components: CanvasComponent[]
): boolean {
  const componentMap = new Map(components.map(c => [c.id, c]));
  let current = componentMap.get(componentId);

  while (current?.parentId) {
    if (current.parentId === potentialAncestorId) {
      return true;
    }
    current = componentMap.get(current.parentId);
  }

  return false;
}

/**
 * Get the full ancestor chain of a component (excluding itself)
 */
export function getAncestors(
  componentId: string,
  components: CanvasComponent[]
): CanvasComponent[] {
  const componentMap = new Map(components.map(c => [c.id, c]));
  const ancestors: CanvasComponent[] = [];
  let current = componentMap.get(componentId);

  while (current?.parentId) {
    const parent = componentMap.get(current.parentId);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a component (recursive)
 */
export function getDescendants(
  componentId: string,
  components: CanvasComponent[]
): CanvasComponent[] {
  const descendants: CanvasComponent[] = [];
  const children = getComponentChildren(componentId, components);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getDescendants(child.id, components));
  }

  return descendants;
}

/**
 * Move a component to a new parent container
 */
export function moveComponentToContainer(
  componentId: string,
  newParentId: string | null,
  components: CanvasComponent[],
  dropPosition: { x: number; y: number }
): CanvasComponent[] {
  // Prevent moving a component into its own descendant
  if (newParentId && isAncestorOf(componentId, newParentId, components)) {
    return components;
  }

  return components.map(c => {
    if (c.id === componentId) {
      // Calculate relative position if moving into a container
      let newX = dropPosition.x;
      let newY = dropPosition.y;

      if (newParentId) {
        const parent = components.find(p => p.id === newParentId);
        if (parent) {
          newX = dropPosition.x - parent.x;
          newY = dropPosition.y - parent.y;
        }
      }

      return {
        ...c,
        parentId: newParentId,
        x: newX,
        y: newY,
      };
    }

    // Update old parent's childIds
    if (c.childIds?.includes(componentId)) {
      return {
        ...c,
        childIds: c.childIds.filter(id => id !== componentId),
      };
    }

    // Update new parent's childIds
    if (c.id === newParentId && c.childIds && !c.childIds.includes(componentId)) {
      return {
        ...c,
        childIds: [...c.childIds, componentId],
      };
    }

    return c;
  });
}

/**
 * Remove a component and optionally its children
 */
export function removeComponent(
  componentId: string,
  components: CanvasComponent[],
  removeChildren: boolean = true
): CanvasComponent[] {
  const idsToRemove = new Set([componentId]);

  if (removeChildren) {
    const descendants = getDescendants(componentId, components);
    descendants.forEach(d => idsToRemove.add(d.id));
  }

  return components
    .filter(c => !idsToRemove.has(c.id))
    .map(c => ({
      ...c,
      childIds: c.childIds?.filter(id => !idsToRemove.has(id)),
    }));
}

/**
 * Calculate absolute position of a component (accounting for parent offsets)
 */
export function getAbsolutePosition(
  component: CanvasComponent,
  components: CanvasComponent[]
): { x: number; y: number } {
  const ancestors = getAncestors(component.id, components);
  let x = component.x;
  let y = component.y;

  for (const ancestor of ancestors) {
    x += ancestor.x;
    y += ancestor.y;
  }

  return { x, y };
}

/**
 * Convert absolute position to relative position within a parent
 */
export function absoluteToRelativePosition(
  absoluteX: number,
  absoluteY: number,
  parentId: string | null,
  components: CanvasComponent[]
): { x: number; y: number } {
  if (!parentId) {
    return { x: absoluteX, y: absoluteY };
  }

  const parent = components.find(c => c.id === parentId);
  if (!parent) {
    return { x: absoluteX, y: absoluteY };
  }

  const parentAbsPos = getAbsolutePosition(parent, components);
  return {
    x: absoluteX - parentAbsPos.x,
    y: absoluteY - parentAbsPos.y,
  };
}

/**
 * Check if a component can accept children
 */
export function canAcceptChildren(component: CanvasComponent): boolean {
  return component.isContainer === true || component.acceptsChildren === true;
}

/**
 * Find the deepest container at a given position
 */
export function findContainerAtPosition(
  x: number,
  y: number,
  components: CanvasComponent[],
  excludeId?: string
): CanvasComponent | null {
  // Sort by zIndex (higher first) to check overlapping containers
  const containers = components
    .filter(c => canAcceptChildren(c) && c.id !== excludeId)
    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  for (const container of containers) {
    const absPos = getAbsolutePosition(container, components);
    if (
      x >= absPos.x &&
      x <= absPos.x + container.width &&
      y >= absPos.y &&
      y <= absPos.y + container.height
    ) {
      // Check for nested containers
      const nestedContainer = findContainerAtPosition(
        x,
        y,
        getComponentChildren(container.id, components),
        excludeId
      );
      return nestedContainer || container;
    }
  }

  return null;
}

/**
 * Build a tree structure from flat component list
 */
export function buildComponentTree(
  components: CanvasComponent[]
): Map<string | null, CanvasComponent[]> {
  const tree = new Map<string | null, CanvasComponent[]>();
  tree.set(null, []); // Root level

  for (const component of components) {
    const parentKey = component.parentId || null;
    if (!tree.has(parentKey)) {
      tree.set(parentKey, []);
    }
    tree.get(parentKey)!.push(component);
  }

  return tree;
}

/**
 * Flatten a component tree back to array (preserves parent-child order)
 */
export function flattenComponentTree(
  tree: Map<string | null, CanvasComponent[]>,
  parentId: string | null = null
): CanvasComponent[] {
  const result: CanvasComponent[] = [];
  const children = tree.get(parentId) || [];

  for (const child of children) {
    result.push(child);
    result.push(...flattenComponentTree(tree, child.id));
  }

  return result;
}
