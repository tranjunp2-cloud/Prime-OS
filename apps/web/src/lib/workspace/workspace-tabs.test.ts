import { describe, expect, it } from 'vitest';
import { closeOtherWorkspaceTabs, closeRightWorkspaceTabs, closeWorkspaceTab, focusWorkspaceTab, markWorkspaceTabDirty, moveWorkspaceTab, openWorkspaceTab, pinWorkspaceTab, reopenLastClosedWorkspaceTab, MAX_WORKSPACE_TABS, type WorkspaceTabsState } from './workspace-tabs';

const emptyState: WorkspaceTabsState = { tabs: [], activeId: null, lastClosed: [] };

describe('workspace tabs', () => {
  it('opens a product tab and marks it active', () => {
    const state = openWorkspaceTab(emptyState, {
      productId: 'mdec',
      url: '/crm/mdec',
      title: 'MDEC',
    }, 1000);

    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe(state.tabs[0].id);
    expect(state.tabs[0]).toMatchObject({ productId: 'mdec', url: '/crm/mdec', title: 'MDEC' });
  });

  it('reuses an existing product tab by default', () => {
    const first = openWorkspaceTab(emptyState, { productId: 'mdec', url: '/crm/mdec', title: 'MDEC' }, 1000);
    const second = openWorkspaceTab(first, { productId: 'mdec', url: '/crm/mdec?view=composer', title: 'MDEC' }, 2000);

    expect(second.tabs).toHaveLength(1);
    expect(second.tabs[0].url).toBe('/crm/mdec?view=composer');
    expect(second.tabs[0].lastActiveAt).toBe(2000);
  });

  it('focuses and closes tabs with neighbor fallback', () => {
    const one = openWorkspaceTab(emptyState, { productId: 'overview', url: '/overview', title: 'Overview' }, 1000);
    const two = openWorkspaceTab(one, { productId: 'inventory', url: '/ecom/cos/inventory-brain', title: 'Inventory' }, 2000);
    const focused = focusWorkspaceTab(two, two.tabs[0].id, 3000);
    const closed = closeWorkspaceTab(focused, two.tabs[0].id);

    expect(closed.tabs).toHaveLength(1);
    expect(closed.activeId).toBe(two.tabs[1].id);
    expect(closed.lastClosed[0].productId).toBe('overview');
  });

  it('marks dirty state and reopens the last closed tab cleanly', () => {
    const one = openWorkspaceTab(emptyState, { productId: 'overview', url: '/overview', title: 'Overview' }, 1000);
    const dirty = markWorkspaceTabDirty(one, one.tabs[0].id, true);
    const closed = closeWorkspaceTab(dirty, one.tabs[0].id);
    const reopened = reopenLastClosedWorkspaceTab(closed, 2000);

    expect(dirty.tabs[0].dirty).toBe(true);
    expect(closed.tabs).toHaveLength(0);
    expect(reopened.tabs).toHaveLength(1);
    expect(reopened.tabs[0]).toMatchObject({ productId: 'overview', dirty: false, lastActiveAt: 2000 });
  });

  it('closes other and right-side tabs for tab management shortcuts', () => {
    const one = openWorkspaceTab(emptyState, { productId: 'overview', url: '/overview', title: 'Overview' }, 1000);
    const two = openWorkspaceTab(one, { productId: 'inventory', url: '/ecom/cos/inventory-brain', title: 'Inventory' }, 2000);
    const three = openWorkspaceTab(two, { productId: 'products', url: '/ecom/cos/product-master', title: 'Products' }, 3000);
    const closedRight = closeRightWorkspaceTabs(three, three.tabs[0].id);
    const closedOthers = closeOtherWorkspaceTabs(three, three.tabs[1].id);

    expect(closedRight.tabs.map((tab) => tab.productId)).toEqual(['overview']);
    expect(closedRight.lastClosed).toHaveLength(2);
    expect(closedOthers.tabs.map((tab) => tab.productId)).toEqual(['inventory']);
    expect(closedOthers.activeId).toBe(three.tabs[1].id);
  });



  it('reuses a tab for functions under the same root product scope', () => {
    const state = openWorkspaceTab(emptyState, { productId: 'products', rootProductId: 'cos', url: '/ecom/cos/product-master', title: 'Products', reuseScope: 'product' }, 1000);
    const updated = openWorkspaceTab(state, { productId: 'fulfillment', rootProductId: 'cos', url: '/ecom/cos/fulfillment', title: 'Fulfillment', reuseScope: 'product' }, 2000);

    expect(updated.tabs).toHaveLength(1);
    expect(updated.activeId).toBe(state.tabs[0].id);
    expect(updated.tabs[0]).toMatchObject({ productId: 'fulfillment', rootProductId: 'cos', url: '/ecom/cos/fulfillment', title: 'Fulfillment' });
  });

  it('opens a new tab for a different root product scope', () => {
    const state = openWorkspaceTab(emptyState, { productId: 'products', rootProductId: 'cos', url: '/ecom/cos/product-master', title: 'Products', reuseScope: 'product' }, 1000);
    const updated = openWorkspaceTab(state, { productId: 'mdec', rootProductId: 'mdec', url: '/crm/mdec', title: 'MDEC', reuseScope: 'product' }, 2000);

    expect(updated.tabs).toHaveLength(2);
    expect(updated.tabs.map((tab) => tab.rootProductId)).toEqual(['cos', 'mdec']);
  });


  it('keeps at most ten tabs and auto-closes the first tab on overflow', () => {
    const fullState = Array.from({ length: MAX_WORKSPACE_TABS }).reduce<WorkspaceTabsState>((state, _, index) => (
      openWorkspaceTab(state, {
        productId: `product-${index}`,
        url: `/product-${index}`,
        title: `Product ${index}`,
        reuseScope: 'none',
      }, 1000 + index)
    ), emptyState);

    const overflowed = openWorkspaceTab(fullState, {
      productId: 'product-10',
      url: '/product-10',
      title: 'Product 10',
      reuseScope: 'none',
    }, 2000);

    expect(overflowed.tabs).toHaveLength(MAX_WORKSPACE_TABS);
    expect(overflowed.tabs[0].productId).toBe('product-1');
    expect(overflowed.tabs.at(-1)?.productId).toBe('product-10');
    expect(overflowed.activeId).toBe(overflowed.tabs.at(-1)?.id);
    expect(overflowed.lastClosed[0].productId).toBe('product-0');
  });

  it('reuses a legacy tab when root scope is recovered from match paths', () => {
    const legacyProductsTab = openWorkspaceTab(emptyState, { productId: 'product-master', url: '/ecom/cos/product-master', title: 'Products' }, 1000);
    const updated = openWorkspaceTab(legacyProductsTab, {
      productId: 'inventory-brain',
      rootProductId: 'cos',
      rootProductMatchPaths: ['/ecom/cos/product-master', '/ecom/cos/inventory-brain', '/ecom/cos/fulfillment'],
      url: '/ecom/cos/inventory-brain',
      title: 'Inventory Brain',
      reuseScope: 'product',
    }, 2000);

    expect(updated.tabs).toHaveLength(1);
    expect(updated.tabs[0]).toMatchObject({ productId: 'inventory-brain', rootProductId: 'cos', url: '/ecom/cos/inventory-brain' });
  });

  it('pins tabs before regular tabs and supports reorder', () => {
    const one = openWorkspaceTab(emptyState, { productId: 'overview', url: '/overview', title: 'Overview' }, 1000);
    const two = openWorkspaceTab(one, { productId: 'inventory', url: '/ecom/cos/inventory-brain', title: 'Inventory' }, 2000);
    const three = openWorkspaceTab(two, { productId: 'products', url: '/ecom/cos/product-master', title: 'Products' }, 3000);
    const pinned = pinWorkspaceTab(three, three.tabs[2].id, true);
    const moved = moveWorkspaceTab(pinned, pinned.tabs[2].id, 1);

    expect(pinned.tabs.map((tab) => tab.productId)).toEqual(['products', 'overview', 'inventory']);
    expect(pinned.tabs[0].pinned).toBe(true);
    expect(moved.tabs.map((tab) => tab.productId)).toEqual(['products', 'inventory', 'overview']);
  });

});
