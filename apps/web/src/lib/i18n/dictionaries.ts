import {
    type AuditDictionary,
    auditDictionaries,
    type FulfillmentDictionary,
    fulfillmentDictionaries,
} from './ops-dictionaries';

export const SUPPORTED_LOCALES = ['en-US', 'ja-JP', 'vi-VN'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en-US';

export type LocaleMeta = {
    nativeName: string;
    shortLabel: string;
    currency: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
    'en-US': { nativeName: 'English', shortLabel: 'EN', currency: 'USD' },
    'ja-JP': { nativeName: '日本語', shortLabel: 'JP', currency: 'JPY' },
    'vi-VN': { nativeName: 'Tiếng Việt', shortLabel: 'VI', currency: 'VND' },
};

export function isSupportedLocale(value: unknown): value is Locale {
    return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

export function getLocaleMeta(locale: Locale): LocaleMeta {
    return LOCALE_META[locale] ?? LOCALE_META[DEFAULT_LOCALE];
}

export type Dictionary = {
    sidebar: {
        dashboardGroup: string;
        overview: string;
        liveView: string;
        kpiDashboard: string;
        productsGroup: string;
        productMaster: string;
        channelListings: string;
        ordersGroup: string;
        allOrders: string;
        allocation: string;
        auditLogs: string;
        analytics: string;
        fulfillmentGroup: string;
        jobs: string;
        partners: string;
        returns: string;
        inventoryGroup: string;
        summary: string;
        stockOverview: string;
        warehouses: string;
        movements: string;
        adjustments: string;
        slaPolicies: string;
        routingPlans: string;
        fulfillmentJobs: string;
        settings: string;
        signOut: string;
        lightMode: string;
        darkMode: string;
        currentView: string;
        workspace: string;
        brandDescriptor: string;
    };
    settings: {
        pageTitle: string;
        pageDesc: string;
        appearanceTitle: string;
        appearanceDesc: string;
        currentTheme: string;
        lightModeBadge: string;
        lightModeHint: string;
        languageTitle: string;
        languageDesc: string;
        systemInfoTitle: string;
        systemInfoDesc: string;
        projectIdLabel: string;
        regionLabel: string;
        statusLabel: string;
        connected: string;
        modulesTitle: string;
        modulesDesc: string;
        moduleProductMasterName: string;
        moduleProductMasterDesc: string;
        moduleInventoryName: string;
        moduleInventoryDesc: string;
        moduleOmsName: string;
        moduleOmsDesc: string;
        moduleFulfillmentName: string;
        moduleFulfillmentDesc: string;
        active: string;
        dbTablesTitle: string;
        dbTablesDesc: string;
    };
    warehouses: {
        pageTitle: string;
        pageDesc: string;
        addDemo: string;
        addWarehouse: string;
        editWarehouse: string;
        searchPlaceholder: string;
        allCountries: string;
        allTypes: string;
        mapPins: string;
        globalWarehousesTitle: string;
        globalWarehousesDesc: string;
        locationsText: string;
        noMapPin: string;
        title: string;
        colCountry: string;
        colType: string;
        colStatus: string;
        colTags: string;
        colActions: string;
        noWarehouses: string;
        addFirstWarehouse: string;
        details: string;
        notConfigured: string;
        typeInHouse: string;
        type3pl: string;
        typeMarketplace: string;
        marketplaceManagedAlert: string;
        location: string;
        mapPosition: string;
        connectLedgerNotice: string;
        viewDetails: string;
        virtualManagedNotice: string;
        virtualDeleteNotice: string;
        fulfillmentJpSeller: string;
        fulfillmentJpFba: string;
        fulfillmentUsSeller: string;
        fulfillmentUsFba: string;
        fulfillmentSg3pl: string;
        fulfillmentJpReturn: string;
        fulfillmentOutboundReplenishment: string;
        colCode: string;
        colName: string;
        fulfillmentType: string;
        fulfillmentTypeHint: string;
        selectCountry: string;
        selectPrefecture: string;
        postalCode: string;
        latitude: string;
        longitude: string;
        mapX: string;
        mapY: string;
        mapPinHint: string;
        tagsHint: string;
        detailBack: string;
        detailNotFound: string;
        detailNotFoundDesc: string;
        detailVirtual: string;
        detailVirtualDesc: string;
        detailLastSync: string;
        detailSourceApi: string;
        detailTabOverview: string;
        detailTabInventory: string;
        detailTabRouting: string;
        detailInfoTitle: string;
        detailAddress: string;
        routingErrorLoaded: string;
        routingMarketplaceManaged: string;
        routingMarketplaceManagedDesc: string;
        routingTitle: string;
        routingDesc: string;
        routingReset: string;
        routingSaving: string;
        routingSaveConfig: string;
        routingGroups: string;
        routingGroupsDesc: string;
        routingSupplierPart: string;
        routingCriteriaOrder: string;
        routingCriteriaDesc: string;
        routingSlaPart: string;
        routingSlaConfig: string;
        routingSlaDesc: string;
        routingFooterNote: string;
        marketplaceManagedHint: string;
        adding: string;
        saving: string;
        mapLocationsBadge: string;
        mapResetView: string;
        mapVisibleWarehouses: string;
        mapCountryNodesSummary: string;
        mapCountriesInView: string;
        mapCountryActivitySummary: string;
        mapWarehouseCount: string;
        mapWorldLoadError: string;
        mapWorldLoading: string;
        mapShownOnMap: string;
        mapShownOnSchematic: string;
        mapMissingLocationSummary: string;
        mapCountryLoadError: string;
        mapCountryLoading: string;
        mapNoCoordinatesTitle: string;
        mapNoCoordinatesDesc: string;
        mapBackToGlobal: string;
        mapDetailSummary: string;
        mapRendererSvg: string;
        mapRendererHighcharts: string;
        mapShownSummary: string;
        mapMissingLocationTitle: string;
        mapNoPositionAvailable: string;
        mapNoSchematicTitle: string;
        mapNoSchematicDesc: string;
        mapStatusLabel: string;
        mapStatusUnknown: string;
        mapTypeUnknown: string;
        locationSetupTitle: string;
        locationAutoLocate: string;
        locationAdjustPin: string;
        locationApplyPin: string;
        locationResetToAuto: string;
        locationCancelPin: string;
        locationSourceLabel: string;
        locationSourceEmpty: string;
        locationSourceAuto: string;
        locationSourceManual: string;
        locationSuggestedFrom: string;
        locationCoordinatesReady: string;
        locationCoordinatesMissing: string;
    };
    ordersAllocation: {
        pageTitle: string;
        pageDesc: string;
        filtersTitle: string;
        searchPlaceholder: string;
        allChannels: string;
        allWarehouses: string;
        noAllocations: string;
        noAllocationsDesc: string;
        colOrder: string;
        colChannel: string;
        colCustomer: string;
        colWarehouse: string;
        colType: string;
        colStrategy: string;
        colAllocatedAt: string;
        manual: string;
        unassigned: string;
    };
    dashboard: {
        pageTitle: string;
        pageDesc: string;
        addProduct: string;
        netSales: string;
        orders: string;
        aov: string;
        lowStockSkus: string;
        noDataTitle: string;
        noDataDesc: string;
        importCsv: string;
        regionalOverviewTitle: string;
        countryMetrics: string;
        regionAggregate: string;
        countrySummary: string;
        inventoryNode: string;
        warehouse: string;
        fulfillmentHealth: string;
        inventoryRisk: string;
        returns: string;
        onTime: string;
        noShipments: string;
        exceptions: string;
        lowStockSkusLabel: string;
        regionalBreakdown: string;
        topProducts: string;
        sold: string;
        time10m: string;
        time1h: string;
        time24h: string;
        time7d: string;
        channelAll: string;
        global: string;
        northAmerica: string;
        japan: string;
        vietnam: string;
    };
    liveView: {
        pageTitle: string;
        lastXMinutes: string;
        liveSessions: string;
        liveOrders: string;
        liveSales: string;
        todaySessions: string;
        todayOrders: string;
        todaySales: string;
        today: string;
    };
    products: {
        pageTitle: string;
        pageDesc: string;
        addProduct: string;
        searchPlaceholder: string;
        loading: string;
        noProductsFound: string;
        noProductsYet: string;
        tryAdjusting: string;
        addFirstProduct: string;
        colProduct: string;
        colSku: string;
        colPrice: string;
        colStock: string;
        colPlatforms: string;
        variantsCount: string;
        noListings: string;
        viewDetails: string;
        delete: string;
        variantX: string;
        notFound: string;
        notFoundDesc: string;
        backToProducts: string;
        edit: string;
        deleteTitle: string;
        deleteDesc: string;
        cancel: string;
        deleting: string;
        images: string;
        imagesEditorDescription: string;
        addImages: string;
        primaryImage: string;
        setPrimaryImage: string;
        replaceImage: string;
        noImagesYet: string;
        noImagesYetDescription: string;
        imageUploadHint: string;
        imageUploadFailed: string;
        imageReplaceFailed: string;
        imageCleanupWarning: string;
        description: string;
        variantsList: string;
        variant: string;
        sku: string;
        price: string;
        stock: string;
        platformListings: string;
        list: string;
        manage: string;
        listingId: string;
        noPlatformListings: string;
        pricing: string;
        basePrice: string;
        costPrice: string;
        margin: string;
        inventory: string;
        inStock: string;
        reserved: string;
        available: string;
        location: string;
        details: string;
        brand: string;
        category: string;
        weight: string;
        dimensions: string;
        tags: string;
        created: string;
        updated: string;
        editProductMaster: string;
        basicInfo: string;
        shipping: string;
        addVariant: string;
        productName: string;
        productType: string;
        barcode: string;
        originalPrice: string;
        placeholderRedLarge: string;
        noVariantsMessage: string;
        createNewProduct: string;
        publishedCount: string;
        draftCount: string;
        totalCount: string;
        searchByNameBrand: string;
        resultCount: string;
        colType: string;
        colCategory: string;
        colChannels: string;
        colOriginalPrice: string;
        colRetailPrice: string;
        colStatus: string;
        colUpdated: string;
        colActions: string;
        noProductsFoundDesc: string;
        noProductsYetDesc: string;
        collapseVariants: string;
        expandVariants: string;
        variantLabel: string;
        noImageAvailable: string;
        showImageAria: string;
        imageViewAlt: string;
        statusLabel: string;
        typeLabel: string;
        salesChannels: string;
        openChannelListingAria: string;
        openChannelListingTitle: string;
        channelSku: string;
        lastSynced: string;
        editProduct: string;
        deleteProduct: string;
        keepProduct: string;
        deleteProductConfirm: string;
        deleteSuccessTitle: string;
        deleteSuccessDesc: string;
    };
    orders: {
        pageTitle: string;
        pageDesc: string;
        clearFilters: string;
        searchPlaceholder: string;
        channel: string;
        allChannels: string;
        allWarehouses: string;
        dateRange: string;
        colOrderId: string;
        colDate: string;
        colType: string;
        colCustomer: string;
        colChannel: string;
        colTotal: string;
        colStatus: string;
        kpiTotalOrders: string;
        kpiPending: string;
        kpiShipping: string;
        kpiCompleted: string;
        kpiAtRisk: string;
        kpiExceptions: string;
        kpiTotalMeta: string;
        kpiPendingMeta: string;
        kpiReadyMeta: string;
        kpiShippingMeta: string;
        resultCount: string;
        statusAll: string;
        statusPending: string;
        statusReady: string;
        statusShipping: string;
        statusCompleted: string;
        statusCancelled: string;
        statusReturned: string;
        emptyFilteredTitle: string;
        emptyFilteredDesc: string;
        emptyTitle: string;
        emptyDesc: string;
        detailBack: string;
        detailBackAria: string;
        detailNotFound: string;
        detailNotFoundDesc: string;
        detailOrder: string;
        detailReference: string;
        detailPlacedOn: string;
        detailSla: string;
        errorTitle: string;
        detailAllocate: string;
        detailReserve: string;
        detailSendFulfillment: string;
        detailSendDirect: string;
        detailSend3pl: string;
        detailCancel: string;
        detailCancelTitle: string;
        detailCancelDesc: string;
        detailKeepOrder: string;
        detailActionsTitle: string;
        detailSelectWarehouse: string;
        detailSelectWarehouseDesc: string;
        detailCloseAllocate: string;
        detailNoItems: string;
        detailRiskFlags: string;
        detailRiskFlag: string;
        detailAllocatePending: string;
        detailReservePending: string;
        detailSendPending: string;
        detailCancelPending: string;
        detailTotalMeta: string;
        detailReturn: string;
        tabOverview: string;
        tabAllocation: string;
        tabFulfillment: string;
        tabTimeline: string;
        cardCustomer: string;
        cardShipTo: string;
        cardItems: string;
        colQty: string;
        colUnitPrice: string;
        subtotal: string;
        shippingFee: string;
        discount: string;
        analyticsTitle: string;
        analyticsDesc: string;
        analyticsCompleted: string;
        analyticsOnTimeRate: string;
        analyticsOpenExceptions: string;
        chartOrdersByStatus: string;
        chartOrdersByChannel: string;
        chartNoData: string;
        chartAvgProcessingTime: string;
        chartDays: string;
        chartAvgProcessingDesc: string;
        chartExceptionsBySeverity: string;
        chartNoExceptions: string;
        reservationsTitle: string;
        reservationsDesc: string;
        resAll: string;
        resDraft: string;
        resReserved: string;
        resReleased: string;
        resFailed: string;
        resFilters: string;
        resSearchPlaceholder: string;
        resAllWarehouses: string;
        colOrder: string;
        colSku: string;
        colWarehouse: string;
        resNoFound: string;
        resNoFoundDesc: string;
        resUnknown: string;
        resUpdated: string;
    };
    inventory: {
        pageTitle: string;
        pageDesc: string;
        kpiTotalStock: string;
        kpiAvailable: string;
        kpiReserved: string;
        kpiInTransit: string;
        modeAuto: string;
        modeFixed: string;
        modeAutoTooltip: string;
        modeFixedTooltip: string;
        filterSelect: string;
        filterAllWarehouses: string;
        summaryTitle: string;
        summaryDesc: string;
        addDemoInventory: string;
        tableNoData: string;
        tableNoDataDesc: string;
        colSku: string;
        colWarehouse: string;
        colCountry: string;
        colStock: string;
        colReserved: string;
        colInTransit: string;
        colAvailable: string;
        colMode: string;
        tooltipReserved: string;
        tooltipInTransit: string;
        tooltipModeAutoTitle: string;
        tooltipModeAutoDesc: string;
        tooltipModeFixedTitle: string;
        tooltipModeFixedDesc: string;
        filterLowStock: string;
        filterSearchPlaceholder: string;
        filterAllTypes: string;
        filterAllCountries: string;
        showingRecords: string;
        colProductVariation: string;
        colVariationAttributes: string;
        colPlatform: string;
        colAvailableStock: string;
        colStatus: string;
        adjTitle: string;
        adjDesc: string;
        adjAddDemo: string;
        adjNew: string;
        adjTotal: string;
        adjNetPositive: string;
        adjNetNegative: string;
        adjUnitsAdded: string;
        adjUnitsRemoved: string;
        filterDateFrom: string;
        filterDateTo: string;
        filterAdjustmentType: string;
        filterQuickSearch: string;
        filterSkuPrimary: string;
        filterSearchSkuPlaceholder: string;
        filterAllSkus: string;
        typeInbound: string;
        typeCorrection: string;
        typeReturn: string;
        typeDamage: string;
        typeReconciliation: string;
        typeRestock: string;
        typeOther: string;
        colQtyDelta: string;
        colReasonNote: string;
        noAdjustments: string;
        createFirstAdjustment: string;
        movTitle: string;
        movDesc: string;
        movAddDemo: string;
        movApproveSuccess: string;
        movApproveError: string;
        movAiSuggested: string;
        movPending: string;
        movAiSuggestedDesc: string;
        movUnits: string;
        filterTriggeredBy: string;
        filterAllSources: string;
        filterSearchSku: string;
        srcOrder: string;
        srcReturn: string;
        srcAdjustment: string;
        srcReplenishment: string;
        srcMarketplaceSync: string;
        typeOrderAllocation: string;
        typeShipped: string;
        typeReturned: string;
        typeAdjustment: string;
        typeReplenishment: string;
        typeWarehouseTransfer: string;
        colDateTime: string;
        colQtyChange: string;
        colReference: string;
        colBalanceAfter: string;
        noMovements: string;
        noMovementsDesc: string;
        tooltipTypeAllocation: string;
        tooltipTypeShipped: string;
        tooltipOwnerMarketplace: string;
        tooltipOwner3pl: string;
        tooltipOwnerSeller: string;
        errorSkuNotFound: string;
        colSkuName: string;
        colCurrent: string;
        colUpdated: string;
        colAction: string;
        noItemsAdded: string;
        placeholderQty: string;
        addItem: string;
        batchDetails: string;
        batchId: string;
        noBatchSelected: string;
        noMovementsForBatch: string;
        colTime: string;
        colQty: string;
        noFulfillmentAssignments: string;
        noFulfillmentAssignmentsDesc: string;
        fulfillmentGroup: string;
        fulfillmentGroupTooltip: string;
        serviceArea: string;
        platformAutoSelectionNotice: string;
        grpMarketplaceOrders: string;
        grpCrossBorderOrders: string;
        grpReturnsHandling: string;
        grpLocalOrders: string;
        grpReplenishmentHub: string;
        locUnitedStates: string;
        locJapan: string;
        locAsiaPacific: string;
        locSingapore: string;
        locAllRegions: string;
        roleExecutor: string;
        roleReturnQc: string;
        roleReplenishment: string;
        priorityHigh: string;
        priorityMedium: string;
        priorityLow: string;
        inventoryByStatus: string;
        inventoryByStatusDesc: string;
        syncedFromMarketplace: string;
        statusOnhand: string;
        statusOnhandTooltip: string;
        statusAvailable: string;
        statusAvailableTooltip: string;
        statusReserved: string;
        statusReservedTooltip: string;
        statusInbound: string;
        statusInboundTooltip: string;
        statusIntransit: string;
        statusIntransitTooltip: string;
        statusQchold: string;
        statusQcholdTooltip: string;
        statusDamaged: string;
        statusDamagedTooltip: string;
        noFulfillmentMapping: string;
        setFulfillmentMapping: string;
        stockTipTitle: string;
        stockTipDesc: string;
        priorityHeader: string;
        manageWarehouses: string;
        allWarehouses: string;
        localTab: string;
        reservationsTab: string;
        fbaTab: string;
        matchingSkus: string;
        kpiTotalAts: string;
        kpiTotalAtsMeta: string;
        kpiTotalOnHand: string;
        kpiTotalOnHandMeta: string;
        kpiWarehouses: string;
        kpiWarehousesMeta: string;
        inventoryHealth: string;
        fbaSyncSurface: string;
        reservationLedgerTitle: string;
        atsBySku: string;
        emptyFilteredTitle: string;
        emptyFilteredDesc: string;
        emptyEmptyTitle: string;
        emptyEmptyDesc: string;
    };
    listings: {
        pageTitle: string;
        pageDesc: string;
        newListing: string;
        totalListings: string;
        totalListingsMeta: string;
        published: string;
        publishedMeta: string;
        draft: string;
        draftMeta: string;
        needsAttention: string;
        needsAttentionMeta: string;
        searchPlaceholder: string;
        allChannels: string;
        resultCount: string;
        sectionTitle: string;
        filteredEmptyTitle: string;
        filteredEmptyDesc: string;
        emptyTitle: string;
        emptyDesc: string;
        colProduct: string;
        colSku: string;
        colChannel: string;
        colChannelId: string;
        colPrice: string;
        colStatus: string;
        colPublished: string;
        colLastSynced: string;
    };
    returnsPage: {
        pageTitle: string;
        pageDesc: string;
        searchPlaceholder: string;
        allStatuses: string;
        approved: string;
        received: string;
        inQc: string;
        completed: string;
        resultCount: string;
        filteredEmptyTitle: string;
        filteredEmptyDesc: string;
        emptyTitle: string;
        emptyDesc: string;
        colRma: string;
        colOrder: string;
        colReason: string;
        colStatus: string;
        colGrade: string;
        colDisposition: string;
        colRefund: string;
        colCreated: string;
        openReturn: string;
        detailBack: string;
        detailBackAria: string;
        detailNotFound: string;
        detailNotFoundDesc: string;
        detailOrder: string;
        detailItemsCount: string;
        detailCustomer: string;
        detailRefundAmount: string;
        detailCreated: string;
        detailItemsTitle: string;
        detailPendingQc: string;
        detailNoItems: string;
        detailExpected: string;
        detailReceived: string;
        detailGrade: string;
        detailQcResult: string;
        detailDisposition: string;
        detailActions: string;
        detailQcAction: string;
        detailDispositionAction: string;
        detailRestocked: string;
        detailPending: string;
        detailPass: string;
        detailFail: string;
        detailQcSummary: string;
        detailPassedCount: string;
        detailFailedCount: string;
        detailRestockedCount: string;
    };

    common: {
        saveChanges: string;
        cancel: string;
        delete: string;
        clear: string;
        clearSearch: string;
        edit: string;
        active: string;
        inactive: string;
        typeInHouse: string;
        type3PL: string;
        typeMarketplace: string;
        search: string;
        viewDetails: string;
        items: string;
    };
    controlTower: {
        pageTitle: string;
        pageDesc: string;
        refreshData: string;
        tabExecutive: string;
        tabOperations: string;
        tabSystem: string;
        loading: string;
        failedLoad: string;
        netRevenue: string;
        orders: string;
        aov: string;
        listingCoverage: string;
        skus: string;
        shipSlaSuccess: string;
        criticalAlerts: string;
        salesByMarketplace: string;
        salesByCountry: string;
        viewRegionalMap: string;
        integrationHealth: string;
        orderPipeline: string;
        vsLastMonth: string;
        vsTarget: string;
        pendingOrders: string;
        totalAtsInventory: string;
        units: string;
        inboundReceipts: string;
        pickTimeP50: string;
        packTimeP50: string;
        avgDeliveryTime: string;
        h: string;
        d: string;
        orchestrationPipeline: string;
        stageCreated: string;
        stageValidated: string;
        stageAllocated: string;
        stageReserved: string;
        stageInFulfillment: string;
        stageShipped: string;
        stageDelivered: string;
        inventoryByNode: string;
        totalNetworkAts: string;
        totalReserved: string;
        viewWarehouses: string;
        ats: string;
        r: string;
        fulfillmentNodePerformance: string;
        colNode: string;
        colShipSlaSuccess: string;
        colBacklog: string;
        viewFulfillmentOps: string;
        activeConnectors: string;
        totalSyncErrors: string;
        time24h: string;
        avgSyncLag: string;
        timeMins: string;
        omsIngestionRate: string;
        ordersPerH: string;
        routingSuccess: string;
        allocLatencyP50: string;
        timeMs: string;
        channelConnectorsStatus: string;
        productMasterHealth: string;
        mappingCoverage: string;
        contentCompleteness: string;
        priorityAlerts: string;
        noPriorityAlerts: string;
        viewFullPipeline: string;
        syncLag: string;
        errorRate: string;
        viewSystemIntegrations: string;
        liveAt: string;
        syncing: string;
        emptyTitle: string;
        emptyDescription: string;
        zeroPendingOrders: string;
        zeroInboundReceipts: string;
        zeroDeliveries: string;
    };
    fulfillment: FulfillmentDictionary;
    audit: AuditDictionary;
};

const enUS: Dictionary = {
    sidebar: {
        dashboardGroup: 'Dashboard',
        overview: 'Overview',
        liveView: 'Live View',
        kpiDashboard: 'KPI Dashboard',
        productsGroup: 'Products',
        productMaster: 'Product Master',
        channelListings: 'Channel Listings',
        ordersGroup: 'Orders',
        allOrders: 'All Orders',
        allocation: 'Allocation',
        auditLogs: 'Audit Logs',
        analytics: 'Analytics',
        fulfillmentGroup: 'Fulfillment',
        jobs: 'Jobs',
        partners: 'Partners',
        returns: 'Returns',
        inventoryGroup: 'Inventory',
        summary: 'Inventory Summary',
        stockOverview: 'Stock Overview',
        warehouses: 'Warehouses',
        movements: 'Movements',
        adjustments: 'Adjustments',
        slaPolicies: 'SLA Policies',
        routingPlans: 'Routing Plans',
        fulfillmentJobs: 'Fulfillment Jobs',
        settings: 'Settings',
        signOut: 'Sign Out',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        currentView: 'Current View',
        workspace: 'Workspace',
        brandDescriptor: 'Commerce Orchestration System',
    },
    settings: {
        pageTitle: 'Settings',
        pageDesc: 'Configure appearance, language, and system information',
        appearanceTitle: 'Appearance',
        appearanceDesc: 'Switch between light and dark mode manually.',
        currentTheme: 'Current theme: {theme}',
        lightModeBadge: 'Light mode V1',
        lightModeHint: 'Light mode shares the same semantic tokens as dark mode so tables, badges, and panels keep consistent visual logic.',
        languageTitle: 'Language',
        languageDesc: 'Choose the UI language for navigation, dashboards, and operational workflows.',
        systemInfoTitle: 'Supabase Connection',
        systemInfoDesc: 'Connected to the COS - SME backend project',
        projectIdLabel: 'Project ID',
        regionLabel: 'Region',
        statusLabel: 'Status',
        connected: 'Connected',
        modulesTitle: 'System Modules',
        modulesDesc: 'Core orchestration towers active in this deployment',
        moduleProductMasterName: 'Product Master',
        moduleProductMasterDesc: 'Products, SKUs, listings, and channel mappings',
        moduleInventoryName: 'Inventory',
        moduleInventoryDesc: 'ATS, reservations, and warehouse sync',
        moduleOmsName: 'OMS',
        moduleOmsDesc: 'Orders, SLA engine, and routing logic',
        moduleFulfillmentName: 'Fulfillment',
        moduleFulfillmentDesc: 'Jobs, shipments, and returns QC',
        active: 'Active',
        dbTablesTitle: 'Database Tables',
        dbTablesDesc: '14 tables in the COS - SME schema',
    },
    warehouses: {
        pageTitle: 'Warehouses',
        pageDesc: 'Manage your warehouse locations',
        addDemo: 'Add Demo Warehouses',
        addWarehouse: 'Add Warehouse',
        editWarehouse: 'Edit Warehouse',
        searchPlaceholder: 'Search by name or code...',
        allCountries: 'All Countries',
        allTypes: 'All Types',
        mapPins: 'Warehouse Pins',
        globalWarehousesTitle: 'Global Warehouses',
        globalWarehousesDesc: 'Total warehouses globally',
        locationsText: 'Locations',
        noMapPin: 'No map pin',
        title: 'Warehouse',
        colCountry: 'Country',
        colType: 'Type',
        colStatus: 'Status',
        colTags: 'Tags',
        colActions: 'Actions',
        noWarehouses: 'No warehouses found',
        addFirstWarehouse: 'Add your first warehouse to get started',
        details: 'Warehouse Details',
        notConfigured: 'Not configured',
        typeInHouse: 'In-house',
        type3pl: '3PL Partner',
        typeMarketplace: 'Marketplace',
        marketplaceManagedAlert: 'This warehouse is marketplace-managed. Inventory and shipments are synced automatically.',
        location: 'Location',
        mapPosition: 'Map position',
        connectLedgerNotice: 'Connect inventory ledger to view actual quantities',
        viewDetails: 'View Details',
        virtualManagedNotice: 'Virtual warehouses are managed automatically',
        virtualDeleteNotice: 'Virtual warehouses cannot be deleted',
        fulfillmentJpSeller: 'JP Local (Seller Fulfillment)',
        fulfillmentJpFba: 'Amazon JP FBA',
        fulfillmentUsSeller: 'US Seller Fulfillment',
        fulfillmentUsFba: 'Amazon US FBA',
        fulfillmentSg3pl: '3PL Singapore',
        fulfillmentJpReturn: 'JP Return Center',
        fulfillmentOutboundReplenishment: 'Outbound Replenishment',
        colCode: 'Code',
        colName: 'Name',
        fulfillmentType: 'Fulfillment Type',
        fulfillmentTypeHint: 'Links this warehouse to existing inventory data',
        selectCountry: 'Select country',
        selectPrefecture: 'Select prefecture',
        postalCode: 'Postal Code',
        latitude: 'Latitude',
        longitude: 'Longitude',
        mapX: 'Map X (0..1)',
        mapY: 'Map Y (0..1)',
        mapPinHint: 'Normalized position (0..1) to place this warehouse on the Japan map.',
        tagsHint: 'Add capability and performance tags for this warehouse',
        detailBack: 'Back to Warehouses',
        detailNotFound: 'Warehouse not found',
        detailNotFoundDesc: 'The warehouse you\'re looking for doesn\'t exist.',
        detailVirtual: 'Virtual Warehouse',
        detailVirtualDesc: 'This is a virtual warehouse synced from the marketplace (Amazon FBA). Inventory is managed automatically and cannot be manually adjusted.',
        detailLastSync: 'Last sync',
        detailSourceApi: 'Source: Marketplace API',
        detailTabOverview: 'Overview',
        detailTabInventory: 'Inventory',
        detailTabRouting: 'Routing Config',
        detailInfoTitle: 'Warehouse Information',
        detailAddress: 'Address',
        routingErrorLoaded: 'Error Loading Configuration',
        routingMarketplaceManaged: 'Marketplace-Managed Warehouse',
        routingMarketplaceManagedDesc: 'Routing is handled automatically by the marketplace. Configuration is read-only.',
        routingTitle: 'Routing Configuration',
        routingDesc: 'Configure weighted scoring and ranking criteria for order routing',
        routingReset: 'Reset',
        routingSaving: 'Saving...',
        routingSaveConfig: 'Save Config',
        routingGroups: 'Fulfillment Groups',
        routingGroupsDesc: 'Select a group to configure its supplier ranking and SLA policy',
        routingSupplierPart: 'Supplier Ranking',
        routingCriteriaOrder: 'Criteria Order & Weights',
        routingCriteriaDesc: 'Drag to reorder priority. Weights auto-normalize to 100%.',
        routingSlaPart: 'SLA Policy',
        routingSlaConfig: 'SLA Configuration',
        routingSlaDesc: 'Define delivery targets and failover behavior',
        routingFooterNote: 'Changes apply to routing policy. Orders are automatically routed based on weighted scoring:',
        marketplaceManagedHint: 'Marketplace warehouses are managed automatically. Inventory and shipments are synced from the marketplace.',
        adding: 'Adding...',
        saving: 'Saving...',
        mapLocationsBadge: '{count} locations',
        mapResetView: 'Reset view',
        mapVisibleWarehouses: '{count} visible warehouses',
        mapCountryNodesSummary: '{count} country nodes, {missing} missing location',
        mapCountriesInView: '{count} countries in view',
        mapCountryActivitySummary: '{active} active, {missing} missing location',
        mapWarehouseCount: '{count} warehouses',
        mapWorldLoadError: 'Unable to load world map. You can still click the country cards below to open detail.',
        mapWorldLoading: 'Loading world map...',
        mapShownOnMap: '{count} shown on map',
        mapShownOnSchematic: '{count} shown on schematic',
        mapMissingLocationSummary: '{count} missing location',
        mapCountryLoadError: 'Unable to load country topology. You can still select a warehouse from the list below.',
        mapCountryLoading: 'Loading country map...',
        mapNoCoordinatesTitle: 'No warehouse has coordinates to display',
        mapNoCoordinatesDesc: 'Warehouses in this country still appear in the list, but they need valid lat/lng or map_x/map_y to render on the map.',
        mapBackToGlobal: 'Global',
        mapDetailSummary: '{warehouses} warehouses, {active} active, {missing} missing location',
        mapRendererSvg: 'SVG detail map',
        mapRendererHighcharts: 'Highcharts country map',
        mapShownSummary: '{mapped} shown on map, {missing} missing location',
        mapMissingLocationTitle: 'Missing location',
        mapNoPositionAvailable: 'No warehouse position available',
        mapNoSchematicTitle: 'No warehouse can be shown on the schematic map',
        mapNoSchematicDesc: 'This renderer uses curated Japan anchors first, then map_x/map_y, then falls back to lat/lng interpolated within the country bounds.',
        mapStatusLabel: 'Status',
        mapStatusUnknown: 'Unknown',
        mapTypeUnknown: 'Unknown',
        locationSetupTitle: 'Location Setup',
        locationAutoLocate: 'Auto locate',
        locationAdjustPin: 'Adjust pin',
        locationApplyPin: 'Apply pin',
        locationResetToAuto: 'Reset to auto',
        locationCancelPin: 'Cancel',
        locationSourceLabel: 'Location source',
        locationSourceEmpty: 'No location',
        locationSourceAuto: 'Auto-located',
        locationSourceManual: 'Manual override',
        locationSuggestedFrom: 'Suggested from {label}',
        locationCoordinatesReady: 'Coordinates ready',
        locationCoordinatesMissing: 'Coordinates missing',
    },
    ordersAllocation: {
        pageTitle: 'Order Allocation',
        pageDesc: 'Manage warehouse allocation for orders',
        filtersTitle: 'Filters',
        searchPlaceholder: 'Search order ID or customer...',
        allChannels: 'All Channels',
        allWarehouses: 'All Warehouses',
        noAllocations: 'No allocations found',
        noAllocationsDesc: 'Allocations will appear here when orders are assigned to warehouses.',
        colOrder: 'Order',
        colChannel: 'Channel',
        colCustomer: 'Customer',
        colWarehouse: 'Warehouse',
        colType: 'Type',
        colStrategy: 'Strategy',
        colAllocatedAt: 'Allocated At',
        manual: 'Manual',
        unassigned: 'Unassigned',
    },
    dashboard: {
        pageTitle: 'Dashboard',
        pageDesc: 'Overview of your multi-channel operations',
        addProduct: 'Add Product',
        netSales: 'Net Sales',
        orders: 'Orders',
        aov: 'AOV',
        lowStockSkus: 'Low Stock SKUs',
        noDataTitle: 'No data yet',
        noDataDesc: 'Start by adding products and processing orders to see your business insights here.',
        importCsv: 'Import from CSV',
        regionalOverviewTitle: 'Regional Overview',
        countryMetrics: 'Country Metrics',
        regionAggregate: 'Region Aggregate',
        countrySummary: 'Country Summary',
        inventoryNode: 'Inventory Node',
        warehouse: 'Warehouse',
        fulfillmentHealth: 'Fulfillment Health',
        inventoryRisk: 'Inventory Risk',
        returns: 'Returns',
        onTime: 'on-time',
        noShipments: 'No shipments',
        exceptions: 'exceptions',
        lowStockSkusLabel: 'low-stock SKUs',
        regionalBreakdown: 'Region Breakdown',
        topProducts: 'Top Products',
        sold: 'sold',
        time10m: 'Last 10 min',
        time1h: 'Last 1 hour',
        time24h: 'Last 24 hours',
        time7d: 'Last 7 days',
        channelAll: 'All Channels',
        global: 'Global',
        northAmerica: 'North America',
        japan: 'Japan',
        vietnam: 'Vietnam',
    },
    liveView: {
        pageTitle: 'Live View',
        lastXMinutes: 'Last {x} minutes',
        liveSessions: 'Live sessions',
        liveOrders: 'Live orders',
        liveSales: 'Live sales',
        todaySessions: "Today's sessions",
        todayOrders: "Today's orders",
        todaySales: "Today's sales",
        today: 'Today',
    },
    products: {
        pageTitle: 'Products',
        pageDesc: 'Manage your product catalog',
        addProduct: 'Add Product',
        searchPlaceholder: 'Search products...',
        loading: 'Loading products...',
        noProductsFound: 'No products found',
        noProductsYet: 'No products yet',
        tryAdjusting: 'Try adjusting your search terms',
        addFirstProduct: 'Add your first product to get started',
        colProduct: 'Product',
        colSku: 'SKU',
        colPrice: 'Price',
        colStock: 'Stock',
        colPlatforms: 'Platforms',
        variantsCount: '{count} variants',
        noListings: 'No listings',
        viewDetails: 'View Details',
        delete: 'Delete',
        variantX: 'Variant {x}',
        notFound: 'Product not found',
        notFoundDesc: "This product doesn't exist or you don't have access to it.",
        backToProducts: 'Back to Products',
        edit: 'Edit',
        deleteTitle: 'Delete Product',
        deleteDesc: 'Are you sure you want to delete "{title}"? This will also delete all associated listings and inventory data. This action cannot be undone.',
        cancel: 'Cancel',
        deleting: 'Deleting...',
        images: 'Images',
        imagesEditorDescription: 'Manage existing product images, replace them, or upload new ones.',
        addImages: 'Add Images',
        primaryImage: 'Primary',
        setPrimaryImage: 'Set as Primary',
        replaceImage: 'Replace',
        noImagesYet: 'No product images yet',
        noImagesYetDescription: 'Upload one or more images to keep the product detail and listing previews complete.',
        imageUploadHint: 'Supported formats: JPG, PNG, WEBP, GIF. Maximum 10 MB per image.',
        imageUploadFailed: 'Failed to upload image.',
        imageReplaceFailed: 'Failed to replace image.',
        imageCleanupWarning: 'Product was saved, but some removed images could not be deleted from storage.',
        description: 'Description',
        variantsList: 'Variants ({count})',
        variant: 'Variant',
        sku: 'SKU',
        price: 'Price',
        stock: 'Stock',
        platformListings: 'Platform Listings ({count})',
        list: 'List',
        manage: 'Manage',
        listingId: 'ID: {id}',
        noPlatformListings: 'No platform listings yet',
        pricing: 'Pricing',
        basePrice: 'Base Price',
        costPrice: 'Cost Price',
        margin: 'Margin',
        inventory: 'Inventory',
        inStock: 'In Stock',
        reserved: 'Reserved',
        available: 'Available',
        location: 'Location',
        details: 'Details',
        brand: 'Brand',
        category: 'Category',
        weight: 'Weight',
        dimensions: 'Dimensions',
        tags: 'Tags',
        created: 'Created: ',
        updated: 'Updated: ',
        editProductMaster: 'Edit Product Master',
        basicInfo: 'Basic Information',
        shipping: 'Shipping',
        addVariant: 'Add Variant',
        productName: 'Product Name *',
        productType: 'Product Type (Category)',
        barcode: 'Barcode / GTIN',
        originalPrice: 'Original Price (USD) *',
        placeholderRedLarge: 'e.g. Red / Large',
        noVariantsMessage: 'No variants. This product has a single SKU.',
        createNewProduct: 'Create New Product',
        publishedCount: '{count} published',
        draftCount: '{count} draft',
        totalCount: '{count} total',
        searchByNameBrand: 'Search by name, brand, category, or SKU...',
        resultCount: '{count} result{suffix}',
        colType: 'Type',
        colCategory: 'Category',
        colChannels: 'Channels',
        colOriginalPrice: 'Original Price',
        colRetailPrice: 'Retail Price',
        colStatus: 'Status',
        colUpdated: 'Updated',
        colActions: 'Actions',
        noProductsFoundDesc: 'Try a different search term.',
        noProductsYetDesc: 'Create your first product to get started.',
        collapseVariants: 'Collapse variants',
        expandVariants: 'Expand variants',
        variantLabel: 'variant',
        noImageAvailable: 'No image available',
        showImageAria: 'Show image {index} of {total}',
        imageViewAlt: '{name} view {index}',
        statusLabel: 'Status',
        typeLabel: 'Type',
        salesChannels: 'Sales Channels',
        openChannelListingAria: 'Open {channel} listing for {name}',
        openChannelListingTitle: 'Open {channel} listing',
        channelSku: 'Channel SKU',
        lastSynced: 'Last Synced',
        editProduct: 'Edit product',
        deleteProduct: 'Delete product',
        keepProduct: 'Keep Product',
        deleteProductConfirm: 'Delete Product',
        deleteSuccessTitle: 'Product deleted',
        deleteSuccessDesc: '"{name}" has been removed.',
    },
    orders: {
        pageTitle: 'Orders',
        pageDesc: 'Order Management System - Manage and track orders across all channels',
        clearFilters: 'Clear Filters',
        searchPlaceholder: 'Search by Order ID or Customer...',
        channel: 'Channel',
        allChannels: 'All Channels',
        allWarehouses: 'All Warehouses',
        dateRange: 'Date Range',
        colOrderId: 'Order ID',
        colDate: 'Date',
        colType: 'Type',
        colCustomer: 'Customer',
        colChannel: 'Channel',
        colTotal: 'Total',
        colStatus: 'Status',
        kpiTotalOrders: 'Total Orders',
        kpiPending: 'Pending',
        kpiShipping: 'Shipping',
        kpiCompleted: 'Completed',
        kpiAtRisk: 'At-Risk SLA',
        kpiExceptions: 'Exceptions',
        kpiTotalMeta: 'Across all connected channels',
        kpiPendingMeta: 'Captured and awaiting allocation or validation',
        kpiReadyMeta: 'Prepared for release into fulfillment',
        kpiShippingMeta: 'Orders already moving through delivery',
        resultCount: '{count} result{suffix}',
        statusAll: 'All',
        statusPending: 'Pending',
        statusReady: 'Ready to Ship',
        statusShipping: 'Shipping',
        statusCompleted: 'Completed',
        statusCancelled: 'Cancelled',
        statusReturned: 'Returned',
        emptyFilteredTitle: 'No orders match this view',
        emptyFilteredDesc: 'Clear the current search or status filters to broaden the order queue.',
        emptyTitle: 'No orders have arrived yet',
        emptyDesc: 'Orders from your connected channels will appear here once sync is active.',
        detailBack: 'Back to Orders',
        detailBackAria: 'Back to {label}',
        detailNotFound: 'Order not found',
        detailNotFoundDesc: 'This order may have been removed from the current demo session, or the link is stale.',
        detailOrder: 'Order {id}',
        detailReference: 'Ref: {ref}',
        detailPlacedOn: 'Placed on {date}',
        detailSla: 'SLA: {days} days',
        errorTitle: 'Error',
        detailAllocate: 'Allocate Warehouse',
        detailReserve: 'Reserve Inventory',
        detailSendFulfillment: 'Send to Fulfillment',
        detailSendDirect: 'Send to Fulfillment (CR Direct)',
        detailSend3pl: 'Send via 3PL',
        detailCancel: 'Cancel Order',
        detailCancelTitle: 'Cancel this order?',
        detailCancelDesc: 'Use this only when the order should stop moving through allocation, reservation, and fulfillment.',
        detailKeepOrder: 'Keep Order',
        detailActionsTitle: 'Actions',
        detailSelectWarehouse: 'Select warehouse',
        detailSelectWarehouseDesc: 'Choose the best active node before reserving inventory or sending this order to fulfillment.',
        detailCloseAllocate: 'Close',
        detailNoItems: 'No items found.',
        detailRiskFlags: '{count} risk flags',
        detailRiskFlag: '{count} risk flag',
        detailAllocatePending: 'Allocating warehouse...',
        detailReservePending: 'Reserving inventory...',
        detailSendPending: 'Sending order to fulfillment...',
        detailCancelPending: 'Cancelling order...',
        detailTotalMeta: 'Subtotal: {amount}',
        detailReturn: 'Request Return',
        tabOverview: 'Overview',
        tabAllocation: 'Allocation & Inventory',
        tabFulfillment: 'Fulfillment & Shipment',
        tabTimeline: 'Timeline',
        cardCustomer: 'Customer',
        cardShipTo: 'Ship To',
        cardItems: 'Order Items',
        colQty: 'Qty',
        colUnitPrice: 'Unit Price',
        subtotal: 'Subtotal',
        shippingFee: 'Shipping',
        discount: 'Discount',
        analyticsTitle: 'Analytics',
        analyticsDesc: 'Order management system insights and metrics',
        analyticsCompleted: 'Completed',
        analyticsOnTimeRate: 'On-Time Rate',
        analyticsOpenExceptions: 'Open Exceptions',
        chartOrdersByStatus: 'Orders by Status',
        chartOrdersByChannel: 'Orders by Channel',
        chartNoData: 'No data available',
        chartAvgProcessingTime: 'Avg Processing Time',
        chartDays: 'days',
        chartAvgProcessingDesc: 'From order received to shipped',
        chartExceptionsBySeverity: 'Exceptions by Severity',
        chartNoExceptions: 'No exceptions recorded',
        reservationsTitle: 'Inventory Reservations',
        reservationsDesc: 'Manage inventory reservations for orders',
        resAll: 'All',
        resDraft: 'Draft',
        resReserved: 'Reserved',
        resReleased: 'Released',
        resFailed: 'Failed',
        resFilters: 'Filters',
        resSearchPlaceholder: 'Search order ID or SKU...',
        resAllWarehouses: 'All Warehouses',
        colOrder: 'Order',
        colSku: 'SKU',
        colWarehouse: 'Warehouse',
        resNoFound: 'No reservations found',
        resNoFoundDesc: 'Inventory reservations will appear here when orders reserve stock.',
        resUnknown: 'Unknown',
        resUpdated: 'Updated',
    },
    inventory: {
        pageTitle: 'Stock Overview',
        pageDesc: 'View inventory levels across all warehouses',
        kpiTotalStock: 'Total Stock',
        kpiAvailable: 'Available',
        kpiReserved: 'Reserved',
        kpiInTransit: 'In Transit',
        modeAuto: 'Auto',
        modeFixed: 'Fixed',
        modeAutoTooltip: 'System automatically selects the best warehouse based on cost & delivery speed',
        modeFixedTooltip: 'Orders always ship from your selected warehouse(s)',
        filterSelect: 'Select warehouse',
        filterAllWarehouses: 'All Warehouses',
        summaryTitle: 'Inventory Summary',
        summaryDesc: 'Overview of inventory across all warehouses, products, and SKUs',
        addDemoInventory: 'Add Demo Inventory',
        tableNoData: 'No stock data found',
        tableNoDataDesc: 'Add inventory to see stock levels',
        colSku: 'SKU',
        colWarehouse: 'Warehouse',
        colCountry: 'Country',
        colStock: 'Stock',
        colReserved: 'Reserved',
        colInTransit: 'In Transit',
        colAvailable: 'Available',
        colMode: 'Mode',
        tooltipReserved: 'Reserved for pending orders - not available for new sales',
        tooltipInTransit: 'Stock currently being transferred between warehouses',
        tooltipModeAutoTitle: 'Auto:',
        tooltipModeAutoDesc: 'System selects best warehouse based on cost & speed',
        tooltipModeFixedTitle: 'Fixed:',
        tooltipModeFixedDesc: 'Ships from your selected warehouse(s)',
        filterLowStock: 'Low stock only',
        filterSearchPlaceholder: 'Search by product name or SKU...',
        filterAllTypes: 'All Types',
        filterAllCountries: 'All Countries',
        showingRecords: 'Showing {current} of {total} inventory records',
        colProductVariation: 'Product / Variation Name',
        colVariationAttributes: 'Variation Attributes',
        colPlatform: 'Platform',
        colAvailableStock: 'Available Stock',
        colStatus: 'Status',
        adjTitle: 'Inventory Adjustments',
        adjDesc: 'SKU-centric inventory operations for stock corrections, inbound, and more',
        adjAddDemo: 'Add Demo Adjustments',
        adjNew: 'New Adjustment',
        adjTotal: 'Total Adjustments',
        adjNetPositive: 'Net Positive',
        adjNetNegative: 'Net Negative',
        adjUnitsAdded: 'Units added',
        adjUnitsRemoved: 'Units removed',
        filterDateFrom: 'From Date',
        filterDateTo: 'To Date',
        filterAdjustmentType: 'Adjustment Type',
        filterQuickSearch: 'Quick Search',
        filterSkuPrimary: 'SKU (Primary)',
        filterSearchSkuPlaceholder: 'Search by SKU...',
        filterAllSkus: 'All SKUs',
        typeInbound: 'INBOUND',
        typeCorrection: 'CORRECTION',
        typeReturn: 'RETURN',
        typeDamage: 'DAMAGE',
        typeReconciliation: 'RECONCILIATION',
        typeRestock: 'RESTOCK',
        typeOther: 'OTHER',
        colQtyDelta: 'Qty Delta',
        colReasonNote: 'Reason / Note',
        noAdjustments: 'No inventory adjustments',
        createFirstAdjustment: 'Create your first adjustment to manage inventory',
        movTitle: 'Inventory Movements',
        movDesc: 'Complete audit log of all inventory quantity changes',
        movAddDemo: 'Add Demo Movements',
        movApproveSuccess: 'Transfer approved and scheduled',
        movApproveError: 'Failed to approve transfer: ',
        movAiSuggested: 'AI-Suggested Transfers',
        movPending: 'pending',
        movAiSuggestedDesc: 'These transfer drafts were created by AI Copilot and require your approval.',
        movUnits: 'units',
        filterTriggeredBy: 'Triggered By',
        filterAllSources: 'All sources',
        filterSearchSku: 'Search SKU...',
        srcOrder: 'Order',
        srcReturn: 'Customer Return',
        srcAdjustment: 'Manual Adjustment',
        srcReplenishment: 'Warehouse Transfer',
        srcMarketplaceSync: 'Marketplace Sync',
        typeOrderAllocation: 'Order Allocation',
        typeShipped: 'Shipped',
        typeReturned: 'Returned',
        typeAdjustment: 'Adjustment',
        typeReplenishment: 'Replenishment',
        typeWarehouseTransfer: 'Warehouse Transfer',
        colDateTime: 'Date / Time',
        colQtyChange: 'Qty Change',
        colReference: 'Reference',
        colBalanceAfter: 'Balance After',
        noMovements: 'No inventory movements',
        noMovementsDesc: 'Inventory changes will appear here as they occur',
        tooltipTypeAllocation: 'Order Allocation = Reserved for order',
        tooltipTypeShipped: 'Shipped = Sent to customer',
        tooltipOwnerMarketplace: 'Owner: Marketplace',
        tooltipOwner3pl: 'Owner: 3PL Partner',
        tooltipOwnerSeller: 'Owner: Seller',
        errorSkuNotFound: 'Could not find SKU details',
        colSkuName: 'SKU / Name',
        colCurrent: 'Current',
        colUpdated: 'Updated',
        colAction: 'Action',
        noItemsAdded: 'No items added. Click "Add Item" to begin.',
        placeholderQty: '+/- qty',
        addItem: 'Add Item',
        batchDetails: 'Batch Details',
        batchId: 'Batch ID',
        noBatchSelected: 'No batch selected',
        noMovementsForBatch: 'No movements found for this batch',
        colTime: 'Time',
        colQty: 'Qty',
        noFulfillmentAssignments: 'No fulfillment assignments configured',
        noFulfillmentAssignmentsDesc: 'This warehouse is not assigned to any fulfillment network',
        fulfillmentGroup: 'Fulfillment Group',
        fulfillmentGroupTooltip: 'The type of orders this warehouse handles. The platform automatically routes orders based on these assignments.',
        serviceArea: 'Service Area',
        platformAutoSelectionNotice: 'The platform automatically selects the best warehouse based on cost, delivery speed, and inventory availability. You don\'t need to manually assign orders to warehouses.',
        grpMarketplaceOrders: 'Marketplace Orders',
        grpCrossBorderOrders: 'Cross-border Orders',
        grpReturnsHandling: 'Returns Handling',
        grpLocalOrders: 'Local Orders',
        grpReplenishmentHub: 'Replenishment Hub',
        locUnitedStates: 'United States',
        locJapan: 'Japan',
        locAsiaPacific: 'Asia Pacific',
        locSingapore: 'Singapore',
        locAllRegions: 'All Regions',
        roleExecutor: 'Executor',
        roleReturnQc: 'Return / QC',
        roleReplenishment: 'Replenishment',
        priorityHigh: 'High',
        priorityMedium: 'Medium',
        priorityLow: 'Low',
        inventoryByStatus: 'Inventory by Status',
        inventoryByStatusDesc: 'Current inventory levels broken down by status.',
        syncedFromMarketplace: ' Synced from marketplace.',
        statusOnhand: 'On-hand',
        statusOnhandTooltip: 'Total physical inventory currently in this warehouse',
        statusAvailable: 'Available',
        statusAvailableTooltip: 'Inventory available for sale (On-hand minus Reserved)',
        statusReserved: 'Reserved',
        statusReservedTooltip: 'Reserved for pending orders - not available for new sales',
        statusInbound: 'Inbound',
        statusInboundTooltip: 'Expected inventory arrivals (purchase orders, transfers)',
        statusIntransit: 'In-transit',
        statusIntransitTooltip: 'Stock currently being transferred to other warehouses',
        statusQchold: 'QC-hold',
        statusQcholdTooltip: 'Inventory pending quality control inspection',
        statusDamaged: 'Damaged',
        statusDamagedTooltip: 'Damaged or unsellable inventory',
        noFulfillmentMapping: 'No fulfillment type mapping configured for this warehouse.',
        setFulfillmentMapping: 'Set a fulfillment type mapping to view inventory.',
        stockTipTitle: 'Physical Stock vs Sellable Stock:',
        stockTipDesc: '"Available" is what you can sell today. "Reserved" is already committed to orders. "On-hand" is the total physical count.',
        priorityHeader: 'Priority',
        manageWarehouses: 'Manage Warehouses',
        allWarehouses: 'All Warehouses',
        localTab: 'Local',
        reservationsTab: 'Reservations',
        fbaTab: 'FBA',
        matchingSkus: '{count} matching SKU{suffix}',
        kpiTotalAts: 'Total ATS',
        kpiTotalAtsMeta: 'Available to sell across active inventory positions',
        kpiTotalOnHand: 'Total On-Hand',
        kpiTotalOnHandMeta: 'Physical stock before reservation allocation',
        kpiWarehouses: 'Warehouses',
        kpiWarehousesMeta: '{count} operating warehouse nodes in scope',
        inventoryHealth: 'Inventory Health',
        fbaSyncSurface: 'FBA Sync Surface',
        reservationLedgerTitle: 'Reservation Ledger',
        atsBySku: 'ATS by SKU',
        emptyFilteredTitle: 'No inventory matches this view',
        emptyFilteredDesc: 'Try clearing the current warehouse filter or search query.',
        emptyEmptyTitle: 'No inventory positions yet',
        emptyEmptyDesc: 'Inventory positions will appear here once stock is seeded or warehouse sync is connected.',
    },
    listings: {
        pageTitle: 'Channel Listings',
        pageDesc: '{count} listings across {channels} channels',
        newListing: 'New Listing',
        totalListings: 'Total Listings',
        totalListingsMeta: '{count} active channel buckets',
        published: 'Published',
        publishedMeta: 'Visible across connected channels',
        draft: 'Draft',
        draftMeta: 'Awaiting product or channel completion',
        needsAttention: 'Needs Attention',
        needsAttentionMeta: 'Paused or error listings require follow-up',
        searchPlaceholder: 'Search by SKU, product, listing title, or channel...',
        allChannels: 'All',
        resultCount: '{count} matching listing{suffix}',
        sectionTitle: 'Channel Inventory',
        filteredEmptyTitle: 'No listings match this view',
        filteredEmptyDesc: 'Adjust the current channel filter or search query to broaden the listing view.',
        emptyTitle: 'No listings yet',
        emptyDesc: 'Listings published from Product Master will appear here once channels are mapped.',
        colProduct: 'Product',
        colSku: 'SKU',
        colChannel: 'Channel',
        colChannelId: 'Channel ID',
        colPrice: 'Price',
        colStatus: 'Status',
        colPublished: 'Published',
        colLastSynced: 'Last Synced',
    },
    returnsPage: {
        pageTitle: 'Returns',
        pageDesc: 'Manage return requests and QC',
        searchPlaceholder: 'Search by RMA, order, customer, or reason...',
        allStatuses: 'All',
        approved: 'Approved',
        received: 'Received',
        inQc: 'In QC',
        completed: 'Completed',
        resultCount: '{count} result{suffix}',
        filteredEmptyTitle: 'No returns match this view',
        filteredEmptyDesc: 'Try clearing the current search or status filter.',
        emptyTitle: 'No returns yet',
        emptyDesc: 'Approved, received, QC, and completed returns will appear here.',
        colRma: 'RMA #',
        colOrder: 'Order',
        colReason: 'Reason',
        colStatus: 'Status',
        colGrade: 'Grade',
        colDisposition: 'Disposition',
        colRefund: 'Refund',
        colCreated: 'Created',
        openReturn: 'Open return {id}',
        detailBack: 'Back to Returns',
        detailBackAria: 'Back to {label}',
        detailNotFound: 'Return not found',
        detailNotFoundDesc: 'This return may have been removed from the current demo session, or the link is stale.',
        detailOrder: 'Order: {id}',
        detailItemsCount: '{count} item{suffix}',
        detailCustomer: 'Customer',
        detailRefundAmount: 'Refund Amount',
        detailCreated: 'Created',
        detailItemsTitle: 'Return Items ({count})',
        detailPendingQc: '{count} pending QC',
        detailNoItems: 'No items in this return.',
        detailExpected: 'Expected',
        detailReceived: 'Received',
        detailGrade: 'Grade',
        detailQcResult: 'QC Result',
        detailDisposition: 'Disposition',
        detailActions: 'Actions',
        detailQcAction: 'QC',
        detailDispositionAction: 'Disposition',
        detailRestocked: 'Restocked',
        detailPending: 'Pending',
        detailPass: 'Pass',
        detailFail: 'Fail',
        detailQcSummary: 'QC Summary',
        detailPassedCount: 'Passed: {count}',
        detailFailedCount: 'Failed: {count}',
        detailRestockedCount: 'Restocked: {count}',
    },

    common: {
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        delete: 'Delete',
        clear: 'Clear',
        clearSearch: 'Clear search',
        edit: 'Edit',
        active: 'Active',
        inactive: 'Inactive',
        typeInHouse: 'In-house',
        type3PL: '3PL',
        typeMarketplace: 'Marketplace',
        search: 'Search',
        viewDetails: 'View Details',
        items: 'items',
    },
    controlTower: {
        pageTitle: 'Control Tower',
        pageDesc: 'COS - SME 1.0 operations dashboard',
        refreshData: 'Refresh Data',
        tabExecutive: 'Executive',
        tabOperations: 'Operations',
        tabSystem: 'System',
        loading: 'Composing Control Tower metrics...',
        failedLoad: 'Failed to load dashboard data.',
        netRevenue: 'Net Revenue',
        orders: 'Orders',
        aov: 'AOV',
        listingCoverage: 'Listing Coverage',
        skus: 'SKUs',
        shipSlaSuccess: 'Ship SLA Success',
        criticalAlerts: 'Critical Alerts',
        salesByMarketplace: 'Sales by Marketplace',
        salesByCountry: 'Sales by Country',
        viewRegionalMap: 'View Regional Map',
        integrationHealth: 'Integration Health',
        orderPipeline: 'Order Pipeline',
        vsLastMonth: 'vs last month',
        vsTarget: 'vs target',
        pendingOrders: 'Pending Orders',
        totalAtsInventory: 'Total ATS Inventory',
        units: 'Units',
        inboundReceipts: 'Inbound Receipts',
        pickTimeP50: 'Pick Time (P50)',
        packTimeP50: 'Pack Time (P50)',
        avgDeliveryTime: 'Avg Delivery Time',
        h: 'h',
        d: 'd',
        orchestrationPipeline: 'Orchestration Pipeline',
        stageCreated: 'Created',
        stageValidated: 'Validated',
        stageAllocated: 'Allocated',
        stageReserved: 'Reserved',
        stageInFulfillment: 'In Fulfillment',
        stageShipped: 'Shipped',
        stageDelivered: 'Delivered',
        inventoryByNode: 'Inventory by Node',
        totalNetworkAts: 'Total Network ATS',
        totalReserved: 'Total Reserved',
        viewWarehouses: 'View Warehouses',
        ats: 'ATS',
        r: 'R',
        fulfillmentNodePerformance: 'Fulfillment Node Performance',
        colNode: 'Node',
        colShipSlaSuccess: 'Ship SLA Success',
        colBacklog: 'Backlog (Orders)',
        viewFulfillmentOps: 'View Fulfillment Operations',
        activeConnectors: 'Active Connectors',
        totalSyncErrors: 'Total Sync Errors',
        time24h: '24h',
        avgSyncLag: 'Avg Sync Lag',
        timeMins: 'm',
        omsIngestionRate: 'OMS Ingestion Rate',
        ordersPerH: 'orders/h',
        routingSuccess: 'Routing Success',
        allocLatencyP50: 'Alloc Latency p50',
        timeMs: 'ms',
        channelConnectorsStatus: 'Channel Connectors Status',
        productMasterHealth: 'Product Master Health',
        mappingCoverage: 'Mapping Coverage',
        contentCompleteness: 'Content Completeness',
        priorityAlerts: 'Priority Alerts',
        noPriorityAlerts: 'No priority alerts matching criteria.',
        viewFullPipeline: 'View Full Pipeline',
        syncLag: 'Sync Lag',
        errorRate: 'Error Rate',
        viewSystemIntegrations: 'View System Integrations',
        liveAt: 'Live · {time}',
        syncing: 'Syncing dashboard',
        emptyTitle: 'No dashboard data yet',
        emptyDescription: 'As signals from product, inventory, OMS, and fulfillment arrive, Control Tower will surface KPI cards, alerts, and execution queues here.',
        zeroPendingOrders: 'No pending orders right now',
        zeroInboundReceipts: 'No inbound receipts in queue',
        zeroDeliveries: 'No deliveries completed yet',
    },
    fulfillment: fulfillmentDictionaries['en-US'],
    audit: auditDictionaries['en-US'],
};

const jaJP: Dictionary = {
    sidebar: {
        dashboardGroup: 'ダッシュボード',
        overview: '概要',
        liveView: 'ライブビュー',
        kpiDashboard: 'KPIダッシュボード',
        productsGroup: '商品',
        productMaster: '商品マスター',
        channelListings: 'チャネル出品',
        ordersGroup: '注文',
        allOrders: 'すべての注文',
        allocation: '引き当て',
        auditLogs: '監査ログ',
        analytics: '分析',
        fulfillmentGroup: 'フルフィルメント',
        jobs: 'ジョブ',
        partners: 'パートナー',
        returns: '返品',
        inventoryGroup: '在庫',
        summary: '在庫サマリー',
        stockOverview: '在庫概要',
        warehouses: '倉庫',
        movements: '移動',
        adjustments: '調整',
        slaPolicies: 'SLAポリシー',
        routingPlans: 'ルーティング計画',
        fulfillmentJobs: 'フルフィルメントジョブ',
        settings: '設定',
        signOut: 'サインアウト',
        lightMode: 'ライトモード',
        darkMode: 'ダークモード',
        currentView: '現在の画面',
        workspace: 'ワークスペース',
        brandDescriptor: 'Commerce Orchestration System',
    },
    settings: {
        pageTitle: '設定',
        pageDesc: '外観、言語、システム情報を設定します',
        appearanceTitle: '表示設定',
        appearanceDesc: 'ライトモードとダークモードを手動で切り替えます。',
        currentTheme: '現在のテーマ: {theme}',
        lightModeBadge: 'ライトモード V1',
        lightModeHint: 'ライトモードでもダークモードと同じセマンティックトークンを使うため、テーブル・バッジ・パネルの意味づけが一貫します。',
        languageTitle: '言語',
        languageDesc: 'ナビゲーション、ダッシュボード、運用画面で使う表示言語を選択します。',
        systemInfoTitle: 'Supabase 接続',
        systemInfoDesc: 'COS - SME バックエンドプロジェクトに接続済み',
        projectIdLabel: 'プロジェクト ID',
        regionLabel: 'リージョン',
        statusLabel: '状態',
        connected: '接続済み',
        modulesTitle: 'システムモジュール',
        modulesDesc: 'この環境で有効なコアオーケストレーション塔',
        moduleProductMasterName: '商品マスター',
        moduleProductMasterDesc: '商品、SKU、出品、チャネルマッピング',
        moduleInventoryName: '在庫',
        moduleInventoryDesc: 'ATS、引当、倉庫同期',
        moduleOmsName: 'OMS',
        moduleOmsDesc: '注文、SLA エンジン、ルーティング',
        moduleFulfillmentName: 'フルフィルメント',
        moduleFulfillmentDesc: 'ジョブ、出荷、返品 QC',
        active: '有効',
        dbTablesTitle: 'データベーステーブル',
        dbTablesDesc: 'COS - SME スキーマ内の 14 テーブル',
    },
    warehouses: {
        pageTitle: '倉庫管理',
        pageDesc: '倉庫の拠点を管理します',
        addDemo: 'デモデータを追加',
        addWarehouse: '倉庫を追加',
        editWarehouse: '倉庫を編集',
        searchPlaceholder: '名前またはコードで検索...',
        allCountries: 'すべての国',
        allTypes: 'すべてのタイプ',
        mapPins: '倉庫ピン',
        globalWarehousesTitle: 'グローバル倉庫',
        globalWarehousesDesc: '全世界の倉庫合計',
        locationsText: '拠点',
        noMapPin: 'ピンなし',
        title: '倉庫',
        colCountry: '国',
        colType: 'タイプ',
        colStatus: 'ステータス',
        colTags: 'タグ',
        colActions: '操作',
        noWarehouses: '倉庫が見つかりません',
        addFirstWarehouse: '最初の倉庫を追加して開始しましょう',
        details: '倉庫詳細',
        notConfigured: '未設定',
        typeInHouse: '自社倉庫',
        type3pl: '3PLパートナー',
        typeMarketplace: 'マーケットプレイス',
        marketplaceManagedAlert: 'この倉庫はマーケットプレイスによって管理されています。在庫と出荷は自動的に同期されます。',
        location: '所在地',
        mapPosition: '地図上の位置',
        connectLedgerNotice: '実際の数量を表示するには在庫台帳を連携してください',
        viewDetails: '詳細を表示',
        virtualManagedNotice: '仮想倉庫は自動的に管理されます',
        virtualDeleteNotice: '仮想倉庫は削除できません',
        fulfillmentJpSeller: '日本国内（自己発送）',
        fulfillmentJpFba: 'Amazon JP FBA',
        fulfillmentUsSeller: '米国自己発送',
        fulfillmentUsFba: 'Amazon US FBA',
        fulfillmentSg3pl: '3PLシンガポール',
        fulfillmentJpReturn: '日本返品センター',
        fulfillmentOutboundReplenishment: '補充出荷',
        colCode: 'コード',
        colName: '名前',
        fulfillmentType: 'フルフィルメントタイプ',
        fulfillmentTypeHint: 'この倉庫を既存の在庫データにリンクします',
        selectCountry: '国を選択',
        selectPrefecture: '都道府県を選択',
        postalCode: '郵便番号',
        latitude: '緯度',
        longitude: '経度',
        mapX: 'マップ X (0..1)',
        mapY: 'マップ Y (0..1)',
        mapPinHint: '日本地図上にこの倉庫を配置するための正規化された位置（0〜1）。',
        tagsHint: 'この倉庫の機能およびパフォーマンスのタグを追加します',
        detailBack: '倉庫一覧に戻る',
        detailNotFound: '倉庫が見つかりません',
        detailNotFoundDesc: 'お探しの倉庫は存在しません。',
        detailVirtual: '仮想倉庫',
        detailVirtualDesc: 'これはマーケットプレイス（Amazon FBA）から同期された仮想倉庫です。在庫は自動的に管理され、手動で調整することはできません。',
        detailLastSync: '最終同期',
        detailSourceApi: 'ソース：マーケットプレイスAPI',
        detailTabOverview: '概要',
        detailTabInventory: '在庫',
        detailTabRouting: 'ルーティング設定',
        detailInfoTitle: '倉庫情報',
        detailAddress: '住所',
        routingErrorLoaded: '設定の読み込み中にエラーが発生しました',
        routingMarketplaceManaged: 'マーケットプレイス管理倉庫',
        routingMarketplaceManagedDesc: 'ルーティングはマーケットプレイスによって自動的に処理されます。設定は読み取り専用です。',
        routingTitle: 'ルーティング設定',
        routingDesc: '注文ルーティングの加重スコアリングおよびランキング基準を設定する',
        routingReset: 'リセット',
        routingSaving: '保存中...',
        routingSaveConfig: '設定を保存',
        routingGroups: 'フルフィルメントグループ',
        routingGroupsDesc: 'グループを選択して、サプライヤーのランキングとSLAポリシーを設定します',
        routingSupplierPart: 'サプライヤーランキング',
        routingCriteriaOrder: '基準の順序と重み',
        routingCriteriaDesc: 'ドラッグして優先順位を並べ替えます。重みは自動的に100%に正規化されます。',
        routingSlaPart: 'SLAポリシー',
        routingSlaConfig: 'SLA設定',
        routingSlaDesc: '配送目標とフェイルオーバー動作を定義する',
        routingFooterNote: '変更はルーティングポリシーに適用されます。注文は加重スコアリングに基づいて自動的にルーティングされます：',
        marketplaceManagedHint: 'マーケットプレイス倉庫は自動的に管理されます。在庫と出荷はマーケットプレイスから同期されます。',
        adding: '追加中...',
        saving: '保存中...',
        mapLocationsBadge: '{count} 拠点',
        mapResetView: '表示をリセット',
        mapVisibleWarehouses: '{count} 件の倉庫を表示中',
        mapCountryNodesSummary: '{count} 件の国ノード、位置情報なし {missing} 件',
        mapCountriesInView: '{count} か国を表示中',
        mapCountryActivitySummary: '稼働中 {active} 件、位置情報なし {missing} 件',
        mapWarehouseCount: '{count} 件の倉庫',
        mapWorldLoadError: 'ワールドマップを読み込めませんでした。下の国カードから詳細を開くことはできます。',
        mapWorldLoading: 'ワールドマップを読み込み中...',
        mapShownOnMap: '地図上に {count} 件表示',
        mapShownOnSchematic: 'スキーマ上に {count} 件表示',
        mapMissingLocationSummary: '位置情報なし {count} 件',
        mapCountryLoadError: '国別トポロジーを読み込めませんでした。下の一覧から倉庫を選択できます。',
        mapCountryLoading: '国別マップを読み込み中...',
        mapNoCoordinatesTitle: '表示できる座標を持つ倉庫がありません',
        mapNoCoordinatesDesc: 'この国の倉庫は一覧には残りますが、地図に表示するには有効な緯度経度または map_x/map_y が必要です。',
        mapBackToGlobal: 'グローバル',
        mapDetailSummary: '倉庫 {warehouses} 件、稼働中 {active} 件、位置情報なし {missing} 件',
        mapRendererSvg: 'SVG 詳細マップ',
        mapRendererHighcharts: 'Highcharts 国別マップ',
        mapShownSummary: '地図上に {mapped} 件、位置情報なし {missing} 件',
        mapMissingLocationTitle: '位置情報なし',
        mapNoPositionAvailable: '表示できる倉庫位置がありません',
        mapNoSchematicTitle: 'スキーママップに表示できる倉庫がありません',
        mapNoSchematicDesc: 'このレンダラーはまず日本向けの調整済みアンカーを使い、その後に map_x/map_y、最後に国の範囲内で補間した緯度経度を利用します。',
        mapStatusLabel: 'ステータス',
        mapStatusUnknown: '不明',
        mapTypeUnknown: '不明',
        locationSetupTitle: '位置設定',
        locationAutoLocate: '自動配置',
        locationAdjustPin: 'ピンを調整',
        locationApplyPin: 'ピンを適用',
        locationResetToAuto: '自動配置に戻す',
        locationCancelPin: 'キャンセル',
        locationSourceLabel: '位置ソース',
        locationSourceEmpty: '位置なし',
        locationSourceAuto: '自動配置済み',
        locationSourceManual: '手動上書き',
        locationSuggestedFrom: '{label} から候補を適用',
        locationCoordinatesReady: '座標あり',
        locationCoordinatesMissing: '座標なし',
    },
    ordersAllocation: {
        pageTitle: '注文の引き当て',
        pageDesc: '注文の倉庫引き当てを管理します',
        filtersTitle: 'フィルター',
        searchPlaceholder: '注文IDまたは顧客名で検索...',
        allChannels: 'すべてのチャネル',
        allWarehouses: 'すべての倉庫',
        noAllocations: '引き当てデータがありません',
        noAllocationsDesc: '注文が倉庫に割り当てられると、ここに表示されます。',
        colOrder: '注文',
        colChannel: 'チャネル',
        colCustomer: '顧客',
        colWarehouse: '倉庫',
        colType: 'タイプ',
        colStrategy: '戦略',
        colAllocatedAt: '割り当て日時',
        manual: '手動',
        unassigned: '未割り当て',
    },
    dashboard: {
        pageTitle: 'ダッシュボード',
        pageDesc: 'マルチチャネル運営の概要',
        addProduct: '商品を追加',
        netSales: '純売上高',
        orders: '注文数',
        aov: '平均注文額 (AOV)',
        lowStockSkus: '在庫僅少SKU',
        noDataTitle: 'データがありません',
        noDataDesc: '商品を追加し、注文を処理してビジネスインサイトを確認しましょう。',
        importCsv: 'CSVからインポート',
        regionalOverviewTitle: '地域別概要',
        countryMetrics: '国別指標',
        regionAggregate: '地域集計',
        countrySummary: '国別サマリー',
        inventoryNode: '在庫ノード',
        warehouse: '倉庫',
        fulfillmentHealth: 'フルフィルメント状態',
        inventoryRisk: '在庫リスク',
        returns: '返品',
        onTime: '定刻配達',
        noShipments: '出荷なし',
        exceptions: '例外',
        lowStockSkusLabel: '在庫が少ないSKU',
        regionalBreakdown: '地域の内訳',
        topProducts: 'トップ製品',
        sold: '販売済み',
        time10m: '過去10分',
        time1h: '過去1時間',
        time24h: '過去24時間',
        time7d: '過去7日間',
        channelAll: 'すべてのチャネル',
        global: 'グローバル',
        northAmerica: '北米',
        japan: '日本',
        vietnam: 'ベトナム',
    },
    liveView: {
        pageTitle: 'ライブビュー',
        lastXMinutes: '直近 {x} 分',
        liveSessions: 'ライブセッション',
        liveOrders: 'リアルタイム注文',
        liveSales: 'リアルタイム売上',
        todaySessions: '本日のセッション',
        todayOrders: '本日の注文',
        todaySales: '本日の売上',
        today: '本日',
    },
    products: {
        pageTitle: '商品',
        pageDesc: '商品カタログの管理',
        addProduct: '商品を追加',
        searchPlaceholder: '商品を検索...',
        loading: '商品を読み込み中...',
        noProductsFound: '商品が見つかりません',
        noProductsYet: '商品はまだありません',
        tryAdjusting: '検索条件を変更してください',
        addFirstProduct: '最初の商品の追加から始めてください',
        colProduct: '商品',
        colSku: 'SKU',
        colPrice: '価格',
        colStock: '在庫',
        colPlatforms: 'プラットフォーム',
        variantsCount: '{count} バリエーション',
        noListings: '出品なし',
        viewDetails: '詳細を表示',
        delete: '削除',
        variantX: 'バリエーション {x}',
        notFound: '商品が見つかりません',
        notFoundDesc: 'この商品は存在しないか、アクセス権がありません。',
        backToProducts: '商品一覧に戻る',
        edit: '編集',
        deleteTitle: '商品を削除',
        deleteDesc: '「{title}」を削除してもよろしいですか？関連するすべての出品と在庫データも削除されます。この操作は元に戻せません。',
        cancel: 'キャンセル',
        deleting: '削除中...',
        images: '画像',
        imagesEditorDescription: '既存の商品画像を管理し、差し替えや新規アップロードを行います。',
        addImages: '画像を追加',
        primaryImage: 'メイン画像',
        setPrimaryImage: 'メインに設定',
        replaceImage: '差し替え',
        noImagesYet: '商品画像がありません',
        noImagesYetDescription: '1枚以上の画像をアップロードすると、商品詳細や出品プレビューがより正確になります。',
        imageUploadHint: '対応形式: JPG, PNG, WEBP, GIF。1画像あたり最大10MB。',
        imageUploadFailed: '画像のアップロードに失敗しました。',
        imageReplaceFailed: '画像の差し替えに失敗しました。',
        imageCleanupWarning: '商品は保存されましたが、削除済み画像の一部をストレージから削除できませんでした。',
        description: '説明',
        variantsList: 'バリエーション（{count}）',
        variant: 'バリエーション',
        sku: 'SKU',
        price: '価格',
        stock: '在庫',
        platformListings: 'プラットフォームの出品（{count}）',
        list: '出品',
        manage: '管理',
        listingId: 'ID：{id}',
        noPlatformListings: 'まだプラットフォームの出品はありません',
        pricing: '価格設定',
        basePrice: '基本価格',
        costPrice: '原価',
        margin: '利益率',
        inventory: '在庫',
        inStock: '在庫あり',
        reserved: '予約済み',
        available: '利用可能',
        location: '場所',
        details: '詳細',
        brand: 'ブランド',
        category: 'カテゴリー',
        weight: '重量',
        dimensions: '寸法',
        tags: 'タグ',
        created: '作成日： ',
        updated: '更新日： ',
        editProductMaster: '製品マスターを編集',
        basicInfo: '基本情報',
        shipping: '配送',
        addVariant: 'バリエーションを追加',
        productName: '製品名 *',
        productType: '製品タイプ (カテゴリー)',
        barcode: 'バーコード / GTIN',
        originalPrice: '元の価格 (USD) *',
        placeholderRedLarge: '例：赤 / 大',
        noVariantsMessage: 'バリエーションはありません。この製品は単一のSKUです。',
        createNewProduct: '新しい商品を作成',
        publishedCount: '{count} 件公開中',
        draftCount: '{count} 件ドラフト',
        totalCount: '合計 {count} 件',
        searchByNameBrand: '商品名、ブランド、カテゴリ、SKU で検索...',
        resultCount: '{count} 件の結果',
        colType: 'タイプ',
        colCategory: 'カテゴリ',
        colChannels: 'チャネル',
        colOriginalPrice: '元価格',
        colRetailPrice: '販売価格',
        colStatus: 'ステータス',
        colUpdated: '更新日',
        colActions: '操作',
        noProductsFoundDesc: '別の検索語でお試しください。',
        noProductsYetDesc: '最初の商品を作成して開始しましょう。',
        collapseVariants: 'バリエーションを折りたたむ',
        expandVariants: 'バリエーションを展開',
        variantLabel: 'バリエーション',
        noImageAvailable: '画像がありません',
        showImageAria: '{total}枚中{index}枚目の画像を表示',
        imageViewAlt: '{name} 表示 {index}',
        statusLabel: 'ステータス',
        typeLabel: 'タイプ',
        salesChannels: '販売チャネル',
        openChannelListingAria: '{name} の {channel} 出品を開く',
        openChannelListingTitle: '{channel} 出品を開く',
        channelSku: 'チャネル SKU',
        lastSynced: '最終同期',
        editProduct: '商品を編集',
        deleteProduct: '商品を削除',
        keepProduct: '商品を保持',
        deleteProductConfirm: '商品を削除',
        deleteSuccessTitle: '商品を削除しました',
        deleteSuccessDesc: '「{name}」を削除しました。',
    },
    orders: {
        pageTitle: '注文',
        pageDesc: '受注管理システム - すべてのチャネルでの注文の管理と追跡',
        clearFilters: 'フィルターをクリア',
        searchPlaceholder: '注文IDまたは顧客名で検索...',
        channel: 'チャネル',
        allChannels: 'すべてのチャネル',
        allWarehouses: 'すべての倉庫',
        dateRange: '期間',
        colOrderId: '注文ID',
        colDate: '日付',
        colType: 'タイプ',
        colCustomer: '顧客',
        colChannel: 'チャネル',
        colTotal: '合計',
        colStatus: 'ステータス',
        kpiTotalOrders: '総注文数',
        kpiPending: '保留中',
        kpiShipping: '発送中',
        kpiCompleted: '完了',
        kpiAtRisk: 'リスクあり (SLA)',
        kpiExceptions: '例外',
        kpiTotalMeta: '接続済みチャネル全体',
        kpiPendingMeta: '割当または検証待ち',
        kpiReadyMeta: 'フルフィルメント投入準備完了',
        kpiShippingMeta: '配送中の注文',
        resultCount: '{count} 件の結果',
        statusAll: 'すべて',
        statusPending: '保留中',
        statusReady: '出荷準備完了',
        statusShipping: '発送中',
        statusCompleted: '完了',
        statusCancelled: 'キャンセル',
        statusReturned: '返品',
        emptyFilteredTitle: 'この条件に一致する注文はありません',
        emptyFilteredDesc: '検索条件またはステータスフィルターをクリアしてください。',
        emptyTitle: '注文はまだありません',
        emptyDesc: '接続済みチャネルからの注文は、同期が有効になるとここに表示されます。',
        detailBack: '注文一覧に戻る',
        detailBackAria: '{label} に戻る',
        detailNotFound: '注文が見つかりません',
        detailNotFoundDesc: 'この注文は現在のデモセッションから削除されたか、リンクが無効になっている可能性があります。',
        detailOrder: '注文 {id}',
        detailReference: '参照: {ref}',
        detailPlacedOn: '{date} の注文',
        detailSla: 'SLA: {days} 日',
        errorTitle: 'エラー',
        detailAllocate: '倉庫を割り当て',
        detailReserve: '在庫を引当',
        detailSendFulfillment: '発送センターに転送',
        detailSendDirect: 'フルフィルメントへ送信 (CR Direct)',
        detailSend3pl: '3PL 経由で送信',
        detailCancel: '注文をキャンセル',
        detailCancelTitle: 'この注文をキャンセルしますか？',
        detailCancelDesc: '割当、引当、フルフィルメントを停止させる必要がある場合のみ実行してください。',
        detailKeepOrder: '注文を保持',
        detailActionsTitle: '操作',
        detailSelectWarehouse: '倉庫を選択',
        detailSelectWarehouseDesc: '在庫を引当する前、またはこの注文をフルフィルメントへ送る前に、最適な稼働ノードを選択してください。',
        detailCloseAllocate: '閉じる',
        detailNoItems: '商品が見つかりません。',
        detailRiskFlags: 'リスクフラグ {count} 件',
        detailRiskFlag: 'リスクフラグ {count} 件',
        detailAllocatePending: '倉庫を割当中...',
        detailReservePending: '在庫を引当中...',
        detailSendPending: '注文をフルフィルメントへ送信中...',
        detailCancelPending: '注文をキャンセル中...',
        detailTotalMeta: '小計: {amount}',
        detailReturn: '返品をリクエスト',
        tabOverview: '概要',
        tabAllocation: '割り当て・在庫',
        tabFulfillment: '発送処理',
        tabTimeline: '履歴',
        cardCustomer: '顧客情報',
        cardShipTo: 'お届け先',
        cardItems: '注文商品',
        colQty: '数量',
        colUnitPrice: '単価',
        subtotal: '小計',
        shippingFee: '送料',
        discount: '割引',
        analyticsTitle: '分析',
        analyticsDesc: '受注管理システムのインサイトと指標',
        analyticsCompleted: '完了',
        analyticsOnTimeRate: '定時配送率',
        analyticsOpenExceptions: '未解決の例外',
        chartOrdersByStatus: 'ステータス別注文数',
        chartOrdersByChannel: 'チャネル別注文数',
        chartNoData: 'データがありません',
        chartAvgProcessingTime: '平均処理時間',
        chartDays: '日',
        chartAvgProcessingDesc: '注文受付から発送まで',
        chartExceptionsBySeverity: '深刻度別の例外',
        chartNoExceptions: '例外は記録されていません',
        reservationsTitle: '在庫予約',
        reservationsDesc: '注文の在庫予約を管理する',
        resAll: 'すべて',
        resDraft: '下書き',
        resReserved: '予約済み',
        resReleased: 'リリース済み',
        resFailed: '失敗',
        resFilters: 'フィルター',
        resSearchPlaceholder: '注文IDまたはSKUを検索...',
        resAllWarehouses: 'すべての倉庫',
        colOrder: '注文',
        colSku: 'SKU',
        colWarehouse: '倉庫',
        resNoFound: '予約が見つかりません',
        resNoFoundDesc: '注文が在庫を予約すると、ここに在庫予約が表示されます。',
        resUnknown: '不明',
        resUpdated: '更新日',
    },
    inventory: {
        pageTitle: '在庫概要',
        pageDesc: 'すべての倉庫の在庫レベルを表示',
        kpiTotalStock: '総在庫数',
        kpiAvailable: '利用可能',
        kpiReserved: '引当済み',
        kpiInTransit: '移動中',
        modeAuto: '自動',
        modeFixed: '固定',
        modeAutoTooltip: 'システムがコストと配送スピードに基づいて最適な倉庫を自動的に選択します',
        modeFixedTooltip: '注文は常に選択した倉庫から発送されます',
        filterSelect: '倉庫を選択',
        filterAllWarehouses: 'すべての倉庫',
        summaryTitle: '在庫サマリー',
        summaryDesc: 'すべての倉庫、製品、SKUにわたる在庫の概要',
        addDemoInventory: 'デモ在庫を追加',
        tableNoData: '在庫データが見つかりません',
        tableNoDataDesc: '在庫レベルを表示するには在庫を追加してください',
        colSku: 'SKU',
        colWarehouse: '倉庫',
        colCountry: '国',
        colStock: '在庫',
        colReserved: '引当済み',
        colInTransit: '移動中',
        colAvailable: '利用可能',
        colMode: 'モード',
        tooltipReserved: '保留中の注文用に保留 - 新規販売には利用不可',
        tooltipInTransit: '倉庫間で移動中の在庫',
        tooltipModeAutoTitle: '自動:',
        tooltipModeAutoDesc: 'コストとスピードに基づいて最適な倉庫をシステムが選択',
        tooltipModeFixedTitle: '固定:',
        tooltipModeFixedDesc: '選択した倉庫から発送',
        filterLowStock: '低在庫のみ',
        filterSearchPlaceholder: '商品名またはSKUで検索...',
        filterAllTypes: 'すべてのタイプ',
        filterAllCountries: 'すべての国',
        showingRecords: '{total}件中{current}件の在庫レコードを表示しています',
        colProductVariation: '商品 / バリエーション名',
        colVariationAttributes: 'バリエーション属性',
        colPlatform: 'プラットフォーム',
        colAvailableStock: '利用可能在庫',
        colStatus: 'ステータス',
        adjTitle: '在庫調整',
        adjDesc: '在庫修正、入庫などのSKU中心の在庫操作',
        adjAddDemo: 'デモ調整を追加',
        adjNew: '新規調整',
        adjTotal: '合計調整数',
        adjNetPositive: '正の純増',
        adjNetNegative: '負の純減',
        adjUnitsAdded: '追加されたユニット',
        adjUnitsRemoved: '削除されたユニット',
        filterDateFrom: '開始日',
        filterDateTo: '終了日',
        filterAdjustmentType: '調整タイプ',
        filterQuickSearch: 'クイック検索',
        filterSkuPrimary: 'SKU (主要)',
        filterSearchSkuPlaceholder: 'SKUで検索...',
        filterAllSkus: 'すべてのSKU',
        typeInbound: '入荷',
        typeCorrection: '修正',
        typeReturn: '返品',
        typeDamage: '破損',
        typeReconciliation: '照合',
        typeRestock: '再入荷',
        typeOther: 'その他',
        colQtyDelta: '数量差分',
        colReasonNote: '理由 / 備考',
        noAdjustments: '在庫調整がありません',
        createFirstAdjustment: '在庫を管理するために最初の調整を作成してください',
        movTitle: '在庫移動',
        movDesc: 'すべての在庫数量変更の完全な監査ログ',
        movAddDemo: 'デモ移動を追加',
        movApproveSuccess: '転送が承認され、スケジュールされました',
        movApproveError: '転送の承認に失敗しました: ',
        movAiSuggested: 'AI提案の転送',
        movPending: '保留中',
        movAiSuggestedDesc: 'これらの転送ドラフトはAI Copilotによって作成され、承認が必要です。',
        movUnits: 'ユニット',
        filterTriggeredBy: 'トリガー',
        filterAllSources: 'すべてのソース',
        filterSearchSku: 'SKUを検索...',
        srcOrder: '注文',
        srcReturn: '顧客返品',
        srcAdjustment: '手動調整',
        srcReplenishment: '倉庫転送',
        srcMarketplaceSync: 'マーケットプレイス同期',
        typeOrderAllocation: '注文の割り当て',
        typeShipped: '出荷済み',
        typeReturned: '返品済み',
        typeAdjustment: '調整',
        typeReplenishment: '補充',
        typeWarehouseTransfer: '倉庫転送',
        colDateTime: '日時',
        colQtyChange: '数量変更',
        colReference: '参照',
        colBalanceAfter: '変更後の在庫',
        noMovements: '在庫の移動がありません',
        noMovementsDesc: '在庫の変更が発生するとここに表示されます',
        tooltipTypeAllocation: '注文の割り当て = 注文用に引当',
        tooltipTypeShipped: '出荷済み = 顧客に送付',
        tooltipOwnerMarketplace: '所有者: マーケットプレイス',
        tooltipOwner3pl: '所有者: 3PLパートナー',
        tooltipOwnerSeller: '所有者: セラー',
        errorSkuNotFound: 'SKUの詳細が見つかりませんでした',
        colSkuName: 'SKU / 名称',
        colCurrent: '現在庫',
        colUpdated: '更新後',
        colAction: '操作',
        noItemsAdded: 'アイテムが追加されていません。「アイテムを追加」をクリックして開始してください。',
        placeholderQty: '+/- 数量',
        addItem: 'アイテムを追加',
        batchDetails: 'バッチ詳細',
        batchId: 'バッチID',
        noBatchSelected: 'バッチが選択されていません',
        noMovementsForBatch: 'このバッチの移動は見つかりませんでした',
        colTime: '時間',
        colQty: '数量',
        noFulfillmentAssignments: 'フルフィルメント割り当てが設定されていません',
        noFulfillmentAssignmentsDesc: 'この倉庫はフルフィルメントネットワークに割り当てられていません',
        fulfillmentGroup: 'フルフィルメントグループ',
        fulfillmentGroupTooltip: 'この倉庫が処理する注文の種類。プラットフォームはこれらの割り当てに基づいて注文を自動的にルーティングします。',
        serviceArea: 'サービスエリア',
        platformAutoSelectionNotice: 'プラットフォームはコスト、配送速度、在庫状況に基づいて最適な倉庫を自動的に選択します。注文を手動で倉庫に割り当てる必要はありません。',
        grpMarketplaceOrders: 'マーケットプレイス注文',
        grpCrossBorderOrders: '越境注文',
        grpReturnsHandling: '返品処理',
        grpLocalOrders: 'ローカル注文',
        grpReplenishmentHub: '補充拠点',
        locUnitedStates: 'アメリカ合衆国',
        locJapan: '日本',
        locAsiaPacific: 'アジア太平洋',
        locSingapore: 'シンガポール',
        locAllRegions: '全地域',
        roleExecutor: '実行者',
        roleReturnQc: '返品 / 検品',
        roleReplenishment: '補充',
        priorityHigh: '高',
        priorityMedium: '中',
        priorityLow: '低',
        inventoryByStatus: 'ステータス別在庫',
        inventoryByStatusDesc: '現在の在庫レベルをステータス別に表示しています。',
        syncedFromMarketplace: ' マーケットプレイスから同期済み。',
        statusOnhand: '実在庫',
        statusOnhandTooltip: '現在この倉庫にある物理的な在庫の総数',
        statusAvailable: '有効在庫',
        statusAvailableTooltip: '販売可能な在庫（実在庫から予約済みを引いたもの）',
        statusReserved: '予約済み',
        statusReservedTooltip: '保留中の注文に割り当てられた在庫 - 新規販売には利用不可',
        statusInbound: '入荷待ち',
        statusInboundTooltip: '入荷予定の在庫（発注書、移動など）',
        statusIntransit: '輸送中',
        statusIntransitTooltip: '他の倉庫へ移動中の在庫',
        statusQchold: '検品待ち',
        statusQcholdTooltip: '品質管理（QC）検査待ちの在庫',
        statusDamaged: '損傷品',
        statusDamagedTooltip: '損傷または販売不可の在庫',
        noFulfillmentMapping: 'この倉庫にはフルフィルメントタイプのマッピングが設定されていません。',
        setFulfillmentMapping: '在庫を表示するにはフルフィルメントタイプのマッピングを設定してください。',
        stockTipTitle: '実在庫 vs 販売可能在庫:',
        stockTipDesc: '「有効在庫」は今日販売できる数です。「予約済み」はすでに注文に割り当てられています。「実在庫」は物理的な総数です。',
        priorityHeader: '優先度',
        manageWarehouses: '倉庫を管理',
        allWarehouses: 'すべての倉庫',
        localTab: 'ローカル',
        reservationsTab: '引当',
        fbaTab: 'FBA',
        matchingSkus: '{count} 件の該当 SKU',
        kpiTotalAts: '総 ATS',
        kpiTotalAtsMeta: '販売可能な在庫ポジション合計',
        kpiTotalOnHand: '総物理在庫',
        kpiTotalOnHandMeta: '引当前の物理在庫総数',
        kpiWarehouses: '倉庫数',
        kpiWarehousesMeta: '対象範囲の稼働倉庫ノード {count} 件',
        inventoryHealth: '在庫ヘルス',
        fbaSyncSurface: 'FBA 同期サーフェス',
        reservationLedgerTitle: '引当台帳',
        atsBySku: 'SKU 別 ATS',
        emptyFilteredTitle: 'この条件に一致する在庫はありません',
        emptyFilteredDesc: '倉庫フィルターまたは検索条件をクリアしてください。',
        emptyEmptyTitle: '在庫ポジションはまだありません',
        emptyEmptyDesc: '在庫が登録または同期されると、ここに表示されます。',
    },
    listings: {
        pageTitle: 'チャネル出品',
        pageDesc: '{channels} チャネルで {count} 件の出品',
        newListing: '新規出品',
        totalListings: '総出品数',
        totalListingsMeta: '{count} 件の稼働チャネルバケット',
        published: '公開中',
        publishedMeta: '接続済みチャネルに表示中',
        draft: 'ドラフト',
        draftMeta: '商品情報またはチャネル設定の完了待ち',
        needsAttention: '要対応',
        needsAttentionMeta: '停止中またはエラーの出品は確認が必要です',
        searchPlaceholder: 'SKU、商品、出品タイトル、チャネルで検索...',
        allChannels: 'すべて',
        resultCount: '{count} 件の一致する出品',
        sectionTitle: 'チャネル在庫',
        filteredEmptyTitle: 'この条件に一致する出品はありません',
        filteredEmptyDesc: 'チャネルフィルターまたは検索条件を調整してください。',
        emptyTitle: '出品はまだありません',
        emptyDesc: '商品マスターから公開された出品は、チャネルが接続されるとここに表示されます。',
        colProduct: '商品',
        colSku: 'SKU',
        colChannel: 'チャネル',
        colChannelId: 'チャネル ID',
        colPrice: '価格',
        colStatus: 'ステータス',
        colPublished: '公開日',
        colLastSynced: '最終同期',
    },
    returnsPage: {
        pageTitle: '返品',
        pageDesc: '返品リクエストと QC を管理します',
        searchPlaceholder: 'RMA、注文、顧客、理由で検索...',
        allStatuses: 'すべて',
        approved: '承認済み',
        received: '受領済み',
        inQc: 'QC 中',
        completed: '完了',
        resultCount: '{count} 件の結果',
        filteredEmptyTitle: 'この条件に一致する返品はありません',
        filteredEmptyDesc: '検索条件またはステータスフィルターをクリアしてください。',
        emptyTitle: '返品はまだありません',
        emptyDesc: '承認、受領、QC、完了した返品はここに表示されます。',
        colRma: 'RMA #',
        colOrder: '注文',
        colReason: '理由',
        colStatus: 'ステータス',
        colGrade: 'グレード',
        colDisposition: '処置',
        colRefund: '返金',
        colCreated: '作成日',
        openReturn: '返品 {id} を開く',
        detailBack: '返品一覧に戻る',
        detailBackAria: '{label} に戻る',
        detailNotFound: '返品が見つかりません',
        detailNotFoundDesc: 'この返品は現在のデモセッションから削除されたか、リンクが無効になっている可能性があります。',
        detailOrder: '注文: {id}',
        detailItemsCount: '{count} 件',
        detailCustomer: '顧客',
        detailRefundAmount: '返金額',
        detailCreated: '作成日',
        detailItemsTitle: '返品商品 ({count})',
        detailPendingQc: 'QC 待ち {count} 件',
        detailNoItems: 'この返品に商品はありません。',
        detailExpected: '予定数',
        detailReceived: '受領数',
        detailGrade: 'グレード',
        detailQcResult: 'QC 結果',
        detailDisposition: '処置',
        detailActions: '操作',
        detailQcAction: 'QC',
        detailDispositionAction: '処置',
        detailRestocked: '再入庫済み',
        detailPending: '保留中',
        detailPass: '合格',
        detailFail: '不合格',
        detailQcSummary: 'QC サマリー',
        detailPassedCount: '合格: {count}',
        detailFailedCount: '不合格: {count}',
        detailRestockedCount: '再入庫: {count}',
    },

    common: {
        saveChanges: '変更を保存',
        cancel: 'キャンセル',
        delete: '削除',
        clear: 'クリア',
        clearSearch: '検索をクリア',
        edit: '編集',
        active: '有効',
        inactive: '無効',
        typeInHouse: '自社',
        type3PL: '外部委託 (3PL)',
        typeMarketplace: 'マーケットプレイス',
        search: '検索',
        viewDetails: '詳細を見る',
        items: '件',
    },
    controlTower: {
        pageTitle: 'コントロールタワー',
        pageDesc: 'COS - SME 1.0 運用ダッシュボード',
        refreshData: 'データを更新',
        tabExecutive: 'エグゼクティブ',
        tabOperations: 'オペレーション',
        tabSystem: 'システム',
        loading: 'コントロールタワー指標を構築中...',
        failedLoad: 'ダッシュボードのデータの読み込みに失敗しました。',
        netRevenue: '純利益',
        orders: '注文',
        aov: '平均注文額',
        listingCoverage: '出品カバレッジ',
        skus: 'SKU',
        shipSlaSuccess: '出荷SLA成功率',
        criticalAlerts: '重大なアラート',
        salesByMarketplace: 'ストア別売上',
        salesByCountry: '国別売上',
        viewRegionalMap: '地域マップを表示',
        integrationHealth: '連携ステータス',
        orderPipeline: '注文パイプライン',
        vsLastMonth: '先月比',
        vsTarget: '目標比',
        pendingOrders: '保留中の注文',
        totalAtsInventory: '総ATS在庫',
        units: 'ユニット',
        inboundReceipts: '入荷予定',
        pickTimeP50: 'ピッキング時間 (P50)',
        packTimeP50: '梱包時間 (P50)',
        avgDeliveryTime: '平均配送時間',
        h: '時間',
        d: '日',
        orchestrationPipeline: 'オーケストレーションパイプライン',
        stageCreated: '作成済',
        stageValidated: '検証済',
        stageAllocated: '割当済',
        stageReserved: '引当済',
        stageInFulfillment: '出荷処理中',
        stageShipped: '出荷済',
        stageDelivered: '配達済',
        inventoryByNode: 'ノード別在庫',
        totalNetworkAts: '総ネットワークATS',
        totalReserved: '総引当済',
        viewWarehouses: '倉庫一覧を見る',
        ats: 'ATS',
        r: '引',
        fulfillmentNodePerformance: 'フルフィルメントノードのパフォーマンス',
        colNode: 'ノード',
        colShipSlaSuccess: '出荷SLA成功率',
        colBacklog: 'バックログ (注文)',
        viewFulfillmentOps: 'フルフィルメントの操作を見る',
        activeConnectors: 'アクティブな連携',
        totalSyncErrors: '総同期エラー',
        time24h: '24時間',
        avgSyncLag: '平均同期ラグ',
        timeMins: '分',
        omsIngestionRate: 'OMS取り込み速度',
        ordersPerH: '注文/時',
        routingSuccess: 'ルーティング成功率',
        allocLatencyP50: '割当遅延 p50',
        timeMs: 'ミリ秒',
        channelConnectorsStatus: 'チャネル連携ステータス',
        productMasterHealth: '商品マスターヘルス',
        mappingCoverage: 'マッピングカバレッジ',
        contentCompleteness: 'コンテンツ完全性',
        priorityAlerts: '優先アラート',
        noPriorityAlerts: '基準に一致する優先アラートはありません。',
        viewFullPipeline: '完全なパイプラインを表示',
        syncLag: '同期ラグ',
        errorRate: 'エラー率',
        viewSystemIntegrations: 'システム連携を表示',
        liveAt: 'ライブ · {time}',
        syncing: 'ダッシュボードを同期中',
        emptyTitle: 'ダッシュボードデータがまだありません',
        emptyDescription: '商品、在庫、OMS、フルフィルメントの信号が入ると、Control Tower に KPI カード、アラート、実行キューが表示されます。',
        zeroPendingOrders: '現在、保留中の注文はありません',
        zeroInboundReceipts: '入荷待ちの受領はありません',
        zeroDeliveries: '完了した配送はまだありません',
    },
    fulfillment: fulfillmentDictionaries['ja-JP'],
    audit: auditDictionaries['ja-JP'],
};

const viVN: Dictionary = {
    sidebar: {
        dashboardGroup: 'Bảng Điều Khiển',
        overview: 'Tổng Quan',
        liveView: 'Xem Trực Tiếp',
        kpiDashboard: 'Bảng KPI',
        productsGroup: 'Sản Phẩm',
        productMaster: 'Quản Lý Sản Phẩm',
        channelListings: 'Kênh Bán Hàng',
        ordersGroup: 'Đơn Hàng',
        allOrders: 'Tất Cả Đơn Hàng',
        allocation: 'Phân Bổ',
        auditLogs: 'Lịch Sử Hoạt Động',
        analytics: 'Phân Tích',
        fulfillmentGroup: 'Xử Lý Đơn Hàng',
        jobs: 'Công Việc',
        partners: 'Đối Tác',
        returns: 'Trả Hàng',
        inventoryGroup: 'Tồn Kho',
        summary: 'Tổng Quan Tồn Kho',
        stockOverview: 'Tổng Quan Tồn Kho',
        warehouses: 'Nhà Kho',
        movements: 'Luân Chuyển',
        adjustments: 'Điều Chỉnh',
        slaPolicies: 'Chính Sách SLA',
        routingPlans: 'Kế Hoạch Điều Hướng',
        fulfillmentJobs: 'Lệnh Fulfillment',
        settings: 'Cài Đặt',
        signOut: 'Đăng Xuất',
        lightMode: 'Giao Diện Sáng',
        darkMode: 'Giao Diện Tối',
        currentView: 'Màn Hình Hiện Tại',
        workspace: 'Không Gian Làm Việc',
        brandDescriptor: 'Commerce Orchestration System',
    },
    settings: {
        pageTitle: 'Cài Đặt',
        pageDesc: 'Thiết lập giao diện, ngôn ngữ và thông tin hệ thống',
        appearanceTitle: 'Giao Diện',
        appearanceDesc: 'Chuyển thủ công giữa giao diện sáng và tối.',
        currentTheme: 'Giao diện hiện tại: {theme}',
        lightModeBadge: 'Light mode V1',
        lightModeHint: 'Bản light mode dùng cùng semantic token với dark mode để bảng, badge và panel giữ logic màu nhất quán.',
        languageTitle: 'Ngôn Ngữ',
        languageDesc: 'Chọn ngôn ngữ hiển thị cho navigation, dashboard và các luồng vận hành.',
        systemInfoTitle: 'Kết Nối Supabase',
        systemInfoDesc: 'Đang kết nối với backend COS - SME',
        projectIdLabel: 'Project ID',
        regionLabel: 'Khu vực',
        statusLabel: 'Trạng thái',
        connected: 'Đã kết nối',
        modulesTitle: 'Các Module Hệ Thống',
        modulesDesc: 'Các tower điều phối đang hoạt động trong môi trường này',
        moduleProductMasterName: 'Product Master',
        moduleProductMasterDesc: 'Sản phẩm, SKU, listing và mapping kênh',
        moduleInventoryName: 'Inventory',
        moduleInventoryDesc: 'ATS, reservation và đồng bộ kho',
        moduleOmsName: 'OMS',
        moduleOmsDesc: 'Đơn hàng, engine SLA và logic điều hướng',
        moduleFulfillmentName: 'Fulfillment',
        moduleFulfillmentDesc: 'Jobs, shipments và QC đổi trả',
        active: 'Đang hoạt động',
        dbTablesTitle: 'Bảng Dữ Liệu',
        dbTablesDesc: '14 bảng trong schema COS - SME',
    },
    warehouses: {
        pageTitle: 'Nhà Kho',
        pageDesc: 'Quản lý các địa điểm nhà kho của bạn',
        addDemo: 'Thêm Dữ Liệu Mẫu',
        addWarehouse: 'Thêm Nhà Kho',
        editWarehouse: 'Sửa Nhà Kho',
        searchPlaceholder: 'Tìm kiếm theo tên hoặc mã...',
        allCountries: 'Tất Cả Quốc Gia',
        allTypes: 'Tất Cả Loại',
        mapPins: 'Vị Trí Bản Đồ',
        globalWarehousesTitle: 'Nhà Kho Toàn Cầu',
        globalWarehousesDesc: 'Tổng số nhà kho trên toàn thế giới',
        locationsText: 'Địa Điểm',
        noMapPin: 'Không có vị trí',
        title: 'Kho hàng',
        colCountry: 'Quốc gia',
        colType: 'Loại',
        colStatus: 'Trạng thái',
        colTags: 'Thẻ',
        colActions: 'Thao tác',
        noWarehouses: 'Không tìm thấy kho hàng nào',
        addFirstWarehouse: 'Thêm kho hàng đầu tiên để bắt đầu',
        details: 'Chi tiết kho hàng',
        notConfigured: 'Chưa cấu hình',
        typeInHouse: 'Nội bộ',
        type3pl: 'Đối tác 3PL',
        typeMarketplace: 'Sàn TMĐT',
        marketplaceManagedAlert: 'Kho hàng này được quản lý bởi sàn TMĐT. Tồn kho và vận chuyển được đồng bộ tự động.',
        location: 'Địa điểm',
        mapPosition: 'Vị trí bản đồ',
        connectLedgerNotice: 'Kết nối sổ cái tồn kho để xem số lượng thực tế',
        viewDetails: 'Xem chi tiết',
        virtualManagedNotice: 'Kho ảo được quản lý tự động',
        virtualDeleteNotice: 'Không thể xóa kho ảo',
        fulfillmentJpSeller: 'Nội địa JP (Người bán vận chuyển)',
        fulfillmentJpFba: 'Amazon JP FBA',
        fulfillmentUsSeller: 'Người bán US vận chuyển',
        fulfillmentUsFba: 'Amazon US FBA',
        fulfillmentSg3pl: '3PL Singapore',
        fulfillmentJpReturn: 'Trung Tâm Trả Hàng JP',
        fulfillmentOutboundReplenishment: 'Bổ Sung Kho Xuất Khẩu',
        colCode: 'Mã',
        colName: 'Tên',
        fulfillmentType: 'Loại Hoàn Thiện Đơn Hàng',
        fulfillmentTypeHint: 'Liên kết kho này với dữ liệu tồn kho hiện có',
        selectCountry: 'Chọn quốc gia',
        selectPrefecture: 'Chọn tỉnh/thành',
        postalCode: 'Mã bưu điện',
        latitude: 'Vĩ độ',
        longitude: 'Kinh độ',
        mapX: 'Tọa độ X (0..1)',
        mapY: 'Tọa độ Y (0..1)',
        mapPinHint: 'Vị trí chuẩn hóa (0..1) để đặt kho này trên bản đồ Nhật Bản.',
        tagsHint: 'Thêm các thẻ khả năng và hiệu suất cho kho hàng này',
        detailBack: 'Trở lại Nhà kho',
        detailNotFound: 'Không tìm thấy nhà kho',
        detailNotFoundDesc: 'Nhà kho bạn đang tìm kiếm không tồn tại.',
        detailVirtual: 'Kho Ảo',
        detailVirtualDesc: 'Đây là kho ảo được đồng bộ từ sàn TMĐT (Amazon FBA). Tồn kho được quản lý tự động và không thể điều chỉnh thủ công.',
        detailLastSync: 'Lần đồng bộ cuối',
        detailSourceApi: 'Nguồn: Marketplace API',
        detailTabOverview: 'Tổng quan',
        detailTabInventory: 'Tồn kho',
        detailTabRouting: 'Cấu hình Điều hướng',
        detailInfoTitle: 'Thông tin Nhà kho',
        detailAddress: 'Địa chỉ',
        routingErrorLoaded: 'Lỗi tải Trạng thái',
        routingMarketplaceManaged: 'Kho hàng Sàn TMĐT quản lý',
        routingMarketplaceManagedDesc: 'Việc điều hướng được sàn xử lý tự động. Cấu hình chỉ có thể đọc.',
        routingTitle: 'Cấu hình Điều hướng',
        routingDesc: 'Cấu hình tiêu chí xếp hạng và tính điểm trọng số cho điều hướng đơn hàng',
        routingReset: 'Thiết lập lại',
        routingSaving: 'Đang lưu...',
        routingSaveConfig: 'Lưu Phân Cấu',
        routingGroups: 'Nhóm Hoàn Thiện',
        routingGroupsDesc: 'Chọn một nhóm để cấu hình xếp hạng nhà cung cấp và chính sách SLA',
        routingSupplierPart: 'Xếp hạng Nhà cung cấp',
        routingCriteriaOrder: 'Thứ tự và Trọng số Tiêu chí',
        routingCriteriaDesc: 'Kéo để sắp xếp ưu tiên. Trọng số tự động chia đến 100%.',
        routingSlaPart: 'Chính sách SLA',
        routingSlaConfig: 'Cấu hình SLA',
        routingSlaDesc: 'Xác định mục tiêu giao hàng và quy trình chuyển đổi dự phòng',
        routingFooterNote: 'Những thay đổi áp dụng cho chính sách điều hướng. Đơn hàng được tự động điều hướng dựa trên tính điểm trọng số:',
        marketplaceManagedHint: 'Kho hàng sàn TMĐT được quản lý tự động. Tồn kho và vận chuyển được đồng bộ từ sàn.',
        adding: 'Đang thêm...',
        saving: 'Đang lưu...',
        mapLocationsBadge: '{count} địa điểm',
        mapResetView: 'Đặt lại góc nhìn',
        mapVisibleWarehouses: '{count} nhà kho đang hiển thị',
        mapCountryNodesSummary: '{count} nút quốc gia, {missing} kho thiếu vị trí',
        mapCountriesInView: '{count} quốc gia trong khung nhìn',
        mapCountryActivitySummary: '{active} đang hoạt động, {missing} thiếu vị trí',
        mapWarehouseCount: '{count} nhà kho',
        mapWorldLoadError: 'Không tải được bản đồ thế giới. Vẫn có thể bấm thẻ quốc gia bên dưới để mở chi tiết.',
        mapWorldLoading: 'Đang tải bản đồ thế giới...',
        mapShownOnMap: '{count} hiển thị trên bản đồ',
        mapShownOnSchematic: '{count} hiển thị trên sơ đồ',
        mapMissingLocationSummary: '{count} thiếu vị trí',
        mapCountryLoadError: 'Không tải được topology quốc gia. Vẫn có thể chọn nhà kho ở danh sách bên dưới.',
        mapCountryLoading: 'Đang tải bản đồ quốc gia...',
        mapNoCoordinatesTitle: 'Không có nhà kho nào có tọa độ để hiển thị',
        mapNoCoordinatesDesc: 'Các nhà kho trong quốc gia này vẫn xuất hiện trong danh sách, nhưng cần lat/lng hoặc map_x/map_y hợp lệ để lên bản đồ.',
        mapBackToGlobal: 'Toàn cầu',
        mapDetailSummary: '{warehouses} nhà kho, {active} hoạt động, {missing} thiếu vị trí',
        mapRendererSvg: 'Bản đồ chi tiết SVG',
        mapRendererHighcharts: 'Bản đồ quốc gia Highcharts',
        mapShownSummary: '{mapped} hiển thị trên bản đồ, {missing} thiếu vị trí',
        mapMissingLocationTitle: 'Thiếu vị trí',
        mapNoPositionAvailable: 'Không có vị trí nhà kho để hiển thị',
        mapNoSchematicTitle: 'Không có nhà kho nào hiển thị được trên sơ đồ',
        mapNoSchematicDesc: 'Renderer này ưu tiên anchor hiệu chỉnh cho Nhật, sau đó mới dùng map_x/map_y, cuối cùng fallback sang lat/lng nội suy trong phạm vi quốc gia.',
        mapStatusLabel: 'Trạng thái',
        mapStatusUnknown: 'Không xác định',
        mapTypeUnknown: 'Không xác định',
        locationSetupTitle: 'Thiết lập vị trí',
        locationAutoLocate: 'Định vị tự động',
        locationAdjustPin: 'Chỉnh pin',
        locationApplyPin: 'Áp dụng pin',
        locationResetToAuto: 'Khôi phục tự động',
        locationCancelPin: 'Hủy',
        locationSourceLabel: 'Nguồn vị trí',
        locationSourceEmpty: 'Chưa có vị trí',
        locationSourceAuto: 'Tự động định vị',
        locationSourceManual: 'Chỉnh tay',
        locationSuggestedFrom: 'Gợi ý từ {label}',
        locationCoordinatesReady: 'Đã có tọa độ',
        locationCoordinatesMissing: 'Thiếu tọa độ',
    },
    ordersAllocation: {
        pageTitle: 'Phân Bổ Đơn Hàng',
        pageDesc: 'Quản lý việc phân bổ nhà kho cho các đơn hàng',
        filtersTitle: 'Bộ Lọc',
        searchPlaceholder: 'Tìm kiếm ID đơn hàng hoặc khách hàng...',
        allChannels: 'Tất Cả Các Kênh',
        allWarehouses: 'Tất Cả Nhà Kho',
        noAllocations: 'Không tìm thấy phân bổ nào',
        noAllocationsDesc: 'Các phân bổ sẽ xuất hiện ở đây khi đơn hàng được giao cho nhà kho.',
        colOrder: 'Đơn Hàng',
        colChannel: 'Kênh',
        colCustomer: 'Khách Hàng',
        colWarehouse: 'Nhà Kho',
        colType: 'Loại',
        colStrategy: 'Chiến Lược',
        colAllocatedAt: 'Đã Phân Bổ Lúc',
        manual: 'Thủ công',
        unassigned: 'Chưa giao',
    },
    dashboard: {
        pageTitle: 'Bảng Điều Khiển',
        pageDesc: 'Tổng quan hoạt động bán hàng đa kênh',
        addProduct: 'Thêm Sản Phẩm',
        netSales: 'Doanh Thu Thuần',
        orders: 'Đơn Hàng',
        aov: 'Giá Trị Đơn Trung Bình',
        lowStockSkus: 'Sản Phẩm Sắp Hết Ngắn',
        noDataTitle: 'Chưa có dữ liệu',
        noDataDesc: 'Hãy bắt đầu thêm sản phẩm và xử lý đơn hàng để xem thống kê của bạn.',
        importCsv: 'Nhập từ CSV',
        regionalOverviewTitle: 'Tổng Quan Theo Khu Vực',
        countryMetrics: 'Chỉ Số Quốc Gia',
        regionAggregate: 'Tổng Hợp Khu Vực',
        countrySummary: 'Tóm Tắt Khái Quát Quốc Gia',
        inventoryNode: 'Cụm Tồn Kho',
        warehouse: 'Nhà Kho',
        fulfillmentHealth: 'Trạng thái vận đơn',
        inventoryRisk: 'Rủi ro tồn kho',
        returns: 'Đổi trả',
        onTime: 'đúng hạn',
        noShipments: 'Không có đơn',
        exceptions: 'ngoại lệ',
        lowStockSkusLabel: 'SKU sắp hết',
        regionalBreakdown: 'Kết quả theo Khu vực',
        topProducts: 'Sản phẩm bán chạy',
        sold: 'đã bán',
        time10m: '10 phút trước',
        time1h: '1 giờ trước',
        time24h: '24 giờ trước',
        time7d: '7 ngày trước',
        channelAll: 'Tất cả Kênh',
        global: 'Toàn cầu',
        northAmerica: 'Bắc Mỹ',
        japan: 'Nhật Bản',
        vietnam: 'Việt Nam',
    },
    liveView: {
        pageTitle: 'Xem Trực Tiếp',
        lastXMinutes: '{x} phút qua',
        liveSessions: 'Phiên trực tiếp',
        liveOrders: 'Đơn hàng trực tiếp',
        liveSales: 'Doanh số trực tiếp',
        todaySessions: 'Phiên hôm nay',
        todayOrders: 'Đơn hôm nay',
        todaySales: 'Doanh số hôm nay',
        today: 'Hôm nay',
    },
    products: {
        pageTitle: 'Sản Phẩm',
        pageDesc: 'Quản lý danh mục sản phẩm của bạn',
        addProduct: 'Thêm Sản Phẩm',
        searchPlaceholder: 'Tìm kiếm sản phẩm...',
        loading: 'Đang tải sản phẩm...',
        noProductsFound: 'Không tìm thấy sản phẩm',
        noProductsYet: 'Chưa có sản phẩm nào',
        tryAdjusting: 'Hãy thử đổi từ khóa tìm kiếm',
        addFirstProduct: 'Thêm sản phẩm đầu tiên để bắt đầu',
        colProduct: 'Sản Phẩm',
        colSku: 'Mã SKU',
        colPrice: 'Giá',
        colStock: 'Tồn Kho',
        colPlatforms: 'Nền Tảng',
        variantsCount: '{count} phân loại',
        noListings: 'Chưa đăng bán',
        viewDetails: 'Xem Chi Tiết',
        delete: 'Xóa',
        variantX: 'Phân loại {x}',
        notFound: 'Không tìm thấy sản phẩm',
        notFoundDesc: 'Sản phẩm này không tồn tại hoặc bạn không có quyền truy cập.',
        backToProducts: 'Quay lại danh sách sản phẩm',
        edit: 'Sửa',
        deleteTitle: 'Xóa Sản phẩn',
        deleteDesc: 'Bạn có chắc chắn muốn xóa "{title}" không? Hành động này cũng sẽ xóa tất cả danh sách niêm yết và dữ liệu tồn kho liên quan. Không thể hoàn tác.',
        cancel: 'Hủy',
        deleting: 'Đang xóa...',
        images: 'Hình ảnh',
        imagesEditorDescription: 'Quản lý ảnh sản phẩm hiện có, thay ảnh cũ hoặc tải thêm ảnh mới.',
        addImages: 'Thêm ảnh',
        primaryImage: 'Ảnh chính',
        setPrimaryImage: 'Đặt làm ảnh chính',
        replaceImage: 'Thay ảnh',
        noImagesYet: 'Chưa có ảnh sản phẩm',
        noImagesYetDescription: 'Tải lên một hoặc nhiều ảnh để phần chi tiết và preview đăng bán đầy đủ hơn.',
        imageUploadHint: 'Hỗ trợ JPG, PNG, WEBP, GIF. Tối đa 10 MB mỗi ảnh.',
        imageUploadFailed: 'Tải ảnh lên thất bại.',
        imageReplaceFailed: 'Thay ảnh thất bại.',
        imageCleanupWarning: 'Đã lưu sản phẩm nhưng chưa xóa được một số ảnh cũ khỏi storage.',
        description: 'Mô tả',
        variantsList: 'Phân loại ({count})',
        variant: 'Phân loại',
        sku: 'Mã SKU',
        price: 'Giá',
        stock: 'Tồn kho',
        platformListings: 'Danh sách trên Sàn ({count})',
        list: 'Đăng bán',
        manage: 'Quản lý',
        listingId: 'ID: {id}',
        noPlatformListings: 'Chưa có danh sách niêm yết trên nền tảng',
        pricing: 'Định giá',
        basePrice: 'Giá Cơ bản',
        costPrice: 'Giá Vốn',
        margin: 'Biên lợi nhuận',
        inventory: 'Kho hàng',
        inStock: 'Tồn kho',
        reserved: 'Đã giữ',
        available: 'Có sẵn',
        location: 'Vị trí',
        details: 'Chi tiết',
        brand: 'Thương hiệu',
        category: 'Danh mục',
        weight: 'Trọng lượng',
        dimensions: 'Kích thước',
        tags: 'Thẻ',
        created: 'Đã tạo: ',
        updated: 'Đã cập nhật: ',
        editProductMaster: 'Chỉnh sửa Sản Phẩm',
        basicInfo: 'Thông tin cơ bản',
        shipping: 'Giao hàng',
        addVariant: 'Thêm biến thể',
        productName: 'Tên sản phẩm *',
        productType: 'Loại sản phẩm (Danh mục)',
        barcode: 'Mã vạch / GTIN',
        originalPrice: 'Giá gốc (USD) *',
        placeholderRedLarge: 'VD: Đỏ / Lớn',
        noVariantsMessage: 'Không có biến thể. Sản phẩm này chỉ có 1 SKU.',
        createNewProduct: 'Tạo Sản Phẩm Mới',
        publishedCount: '{count} đã xuất bản',
        draftCount: '{count} bản nháp',
        totalCount: 'Tổng {count}',
        searchByNameBrand: 'Tìm theo tên, thương hiệu, danh mục hoặc SKU...',
        resultCount: '{count} kết quả',
        colType: 'Loại',
        colCategory: 'Danh mục',
        colChannels: 'Kênh',
        colOriginalPrice: 'Giá gốc',
        colRetailPrice: 'Giá bán',
        colStatus: 'Trạng thái',
        colUpdated: 'Cập nhật',
        colActions: 'Thao tác',
        noProductsFoundDesc: 'Hãy thử một từ khóa khác.',
        noProductsYetDesc: 'Tạo sản phẩm đầu tiên để bắt đầu.',
        collapseVariants: 'Thu gọn biến thể',
        expandVariants: 'Mở rộng biến thể',
        variantLabel: 'biến thể',
        noImageAvailable: 'Không có hình ảnh',
        showImageAria: 'Hiển thị ảnh {index} trên {total}',
        imageViewAlt: '{name} góc nhìn {index}',
        statusLabel: 'Trạng thái',
        typeLabel: 'Loại',
        salesChannels: 'Kênh bán',
        openChannelListingAria: 'Mở listing {channel} của {name}',
        openChannelListingTitle: 'Mở listing {channel}',
        channelSku: 'SKU trên kênh',
        lastSynced: 'Đồng bộ gần nhất',
        editProduct: 'Sửa sản phẩm',
        deleteProduct: 'Xóa sản phẩm',
        keepProduct: 'Giữ sản phẩm',
        deleteProductConfirm: 'Xóa Sản Phẩm',
        deleteSuccessTitle: 'Đã xóa sản phẩm',
        deleteSuccessDesc: 'Đã xóa "{name}".',
    },
    orders: {
        pageTitle: 'Đơn Hàng',
        pageDesc: 'Hệ Thống Quản Lý Đơn Hàng - Quản lý và theo dõi đơn hàng trên mọi kênh',
        clearFilters: 'Xóa Bộ Lọc',
        searchPlaceholder: 'Tìm kiếm theo ID đơn hàng hoặc khách hàng...',
        channel: 'Kênh',
        allChannels: 'Tất Cả Kênh',
        allWarehouses: 'Tất Cả Nhà Kho',
        dateRange: 'Khoảng thời gian',
        colOrderId: 'Mã Đơn',
        colDate: 'Ngày',
        colType: 'Loại',
        colCustomer: 'Khách Hàng',
        colChannel: 'Kênh',
        colTotal: 'Tổng',
        colStatus: 'Trạng Thái',
        kpiTotalOrders: 'Tổng Đơn Hàng',
        kpiPending: 'Đang chờ',
        kpiShipping: 'Đang giao',
        kpiCompleted: 'Hoàn thành',
        kpiAtRisk: 'Nguy cơ trễ (SLA)',
        kpiExceptions: 'Ngoại lệ',
        kpiTotalMeta: 'Trên tất cả kênh đã kết nối',
        kpiPendingMeta: 'Đã ghi nhận và chờ phân bổ hoặc xác minh',
        kpiReadyMeta: 'Sẵn sàng đưa vào fulfillment',
        kpiShippingMeta: 'Đơn đang ở trong quá trình giao hàng',
        resultCount: '{count} kết quả',
        statusAll: 'Tất cả',
        statusPending: 'Đang chờ',
        statusReady: 'Sẵn sàng giao',
        statusShipping: 'Đang giao',
        statusCompleted: 'Hoàn thành',
        statusCancelled: 'Đã hủy',
        statusReturned: 'Trả hàng',
        emptyFilteredTitle: 'Không có đơn nào khớp với chế độ xem này',
        emptyFilteredDesc: 'Hãy xóa tìm kiếm hoặc bộ lọc trạng thái hiện tại để mở rộng hàng đợi đơn hàng.',
        emptyTitle: 'Chưa có đơn hàng nào',
        emptyDesc: 'Đơn từ các kênh đã kết nối sẽ xuất hiện tại đây khi đồng bộ hoạt động.',
        detailBack: 'Quay lại',
        detailBackAria: 'Quay lại {label}',
        detailNotFound: 'Không tìm thấy đơn hàng',
        detailNotFoundDesc: 'Đơn này có thể đã bị xóa khỏi phiên demo hiện tại hoặc đường dẫn không còn hợp lệ.',
        detailOrder: 'Đơn hàng {id}',
        detailReference: 'Tham chiếu: {ref}',
        detailPlacedOn: 'Đặt vào {date}',
        detailSla: 'Thời gian cam kết (SLA): {days} ngày',
        errorTitle: 'Lỗi',
        detailAllocate: 'Phân bổ nhà kho',
        detailReserve: 'Giữ trước tồn kho',
        detailSendFulfillment: 'Gửi yêu cầu đóng gói',
        detailSendDirect: 'Gửi sang fulfillment (CR Direct)',
        detailSend3pl: 'Gửi qua 3PL',
        detailCancel: 'Hủy đơn hàng',
        detailCancelTitle: 'Hủy đơn hàng này?',
        detailCancelDesc: 'Chỉ dùng khi đơn hàng cần dừng toàn bộ luồng phân bổ, giữ tồn kho và fulfillment.',
        detailKeepOrder: 'Giữ đơn',
        detailActionsTitle: 'Hành động',
        detailSelectWarehouse: 'Chọn kho',
        detailSelectWarehouseDesc: 'Chọn node đang hoạt động phù hợp nhất trước khi giữ tồn kho hoặc gửi đơn này sang fulfillment.',
        detailCloseAllocate: 'Đóng',
        detailNoItems: 'Không tìm thấy sản phẩm trong đơn.',
        detailRiskFlags: '{count} cờ rủi ro',
        detailRiskFlag: '{count} cờ rủi ro',
        detailAllocatePending: 'Đang phân bổ kho...',
        detailReservePending: 'Đang giữ tồn kho...',
        detailSendPending: 'Đang gửi đơn sang fulfillment...',
        detailCancelPending: 'Đang hủy đơn...',
        detailTotalMeta: 'Tạm tính: {amount}',
        detailReturn: 'Yêu cầu trả hàng',
        tabOverview: 'Tổng quan',
        tabAllocation: 'Phân bổ & Tồn kho',
        tabFulfillment: 'Vận đơn & Giao hàng',
        tabTimeline: 'Lịch sử nhật ký',
        cardCustomer: 'Khách hàng',
        cardShipTo: 'Giao đến',
        cardItems: 'Sản phẩm đơn hàng',
        colQty: 'Số lượng',
        colUnitPrice: 'Đơn giá',
        subtotal: 'Tạm tính',
        shippingFee: 'Phí vận chuyển',
        discount: 'Giảm giá',
        analyticsTitle: 'Phân tích',
        analyticsDesc: 'Số liệu và phân tích hệ thống quản lý đơn hàng',
        analyticsCompleted: 'Hoàn thành',
        analyticsOnTimeRate: 'Tỷ lệ đúng hạn',
        analyticsOpenExceptions: 'Ngoại lệ đang mở',
        chartOrdersByStatus: 'Đơn hàng theo trạng thái',
        chartOrdersByChannel: 'Đơn hàng theo kênh',
        chartNoData: 'Không có dữ liệu',
        chartAvgProcessingTime: 'Thời gian xử lý TB',
        chartDays: 'ngày',
        chartAvgProcessingDesc: 'Từ lúc nhận đơn đến lúc giao',
        chartExceptionsBySeverity: 'Ngoại lệ theo mức độ nghiêm trọng',
        chartNoExceptions: 'Không có ngoại lệ nào',
        reservationsTitle: 'Đặt Trước Tồn Kho',
        reservationsDesc: 'Quản lý việc đặt trước tồn kho cho các đơn hàng',
        resAll: 'Tất cả',
        resDraft: 'Nháp',
        resReserved: 'Đã đặt',
        resReleased: 'Đã giải phóng',
        resFailed: 'Thất bại',
        resFilters: 'Bộ lọc',
        resSearchPlaceholder: 'Tìm kiếm ID đơn hoặc SKU...',
        resAllWarehouses: 'Tất cả Kho',
        colOrder: 'Đơn Hàng',
        colSku: 'SKU',
        colWarehouse: 'Kho',
        resNoFound: 'Không tìm thấy đặt trước nào',
        resNoFoundDesc: 'Các đặt trước tồn kho sẽ xuất hiện ở đây khi đơn hàng được đặt.',
        resUnknown: 'Không xác định',
        resUpdated: 'Đã cập nhật',
    },
    inventory: {
        pageTitle: 'Tổng Quan Tồn Kho',
        pageDesc: 'Xem số lượng tồn kho trên toàn bộ kho',
        kpiTotalStock: 'Tổng Tồn Kho',
        kpiAvailable: 'Có Sẵn',
        kpiReserved: 'Đã Giữ',
        kpiInTransit: 'Đang Vận Chuyển',
        modeAuto: 'Tự động',
        modeFixed: 'Cố định',
        modeAutoTooltip: 'Hệ thống tự động chọn kho tốt nhất dựa trên chi phí & tốc độ giao hàng',
        modeFixedTooltip: 'Đơn hàng luôn được giao từ (các) kho bạn đã chọn',
        filterSelect: 'Chọn nhà kho',
        filterAllWarehouses: 'Tất Cả Nhà Kho',
        summaryTitle: 'Tổng Quan Tồn Kho',
        summaryDesc: 'Tổng quan tồn kho trên tất cả nhà kho, sản phẩm và SKU',
        addDemoInventory: 'Thêm dữ liệu mẫu',
        tableNoData: 'Không có dữ liệu tồn kho',
        tableNoDataDesc: 'Thêm hàng tồn kho để xem mức tồn kho',
        colSku: 'SKU',
        colWarehouse: 'Nhà kho',
        colCountry: 'Quốc gia',
        colStock: 'Tồn kho',
        colReserved: 'Đã giữ',
        colInTransit: 'Đang giao',
        colAvailable: 'Có sẵn',
        colMode: 'Chế độ',
        tooltipReserved: 'Đã giữ cho các đơn hàng đang chờ - không có sẵn để bán mới',
        tooltipInTransit: 'Hàng hóa đang được chuyển giữa các kho',
        tooltipModeAutoTitle: 'Tự động:',
        tooltipModeAutoDesc: 'Hệ thống chọn kho tốt nhất dựa trên chi phí & tốc độ',
        tooltipModeFixedTitle: 'Cố định:',
        tooltipModeFixedDesc: 'Gửi hàng từ (các) kho bạn đã chọn',
        filterLowStock: 'Chỉ hàng sắp hết',
        filterSearchPlaceholder: 'Tìm theo tên sản phẩm hoặc SKU...',
        filterAllTypes: 'Tất Cả Loại',
        filterAllCountries: 'Tất Cả Quốc Gia',
        showingRecords: 'Hiển thị {current} trên {total} bản ghi tồn kho',
        colProductVariation: 'Tên Sản phẩm / Biến thể',
        colVariationAttributes: 'Thuộc tính biến thể',
        colPlatform: 'Nền tảng',
        colAvailableStock: 'Tồn kho khả dụng',
        colStatus: 'Trạng thái',
        adjTitle: 'Điều Chỉnh Tồn Kho',
        adjDesc: 'Các hoạt động điều chỉnh, nhập hàng và các thao tác tồn kho khác',
        adjAddDemo: 'Thêm điều chỉnh mẫu',
        adjNew: 'Điều chỉnh mới',
        adjTotal: 'Tổng điều chỉnh',
        adjNetPositive: 'Tổng tăng',
        adjNetNegative: 'Tổng giảm',
        adjUnitsAdded: 'Đơn vị đã thêm',
        adjUnitsRemoved: 'Đơn vị đã giảm',
        filterDateFrom: 'Từ ngày',
        filterDateTo: 'Đến ngày',
        filterAdjustmentType: 'Loại điều chỉnh',
        filterQuickSearch: 'Tìm nhanh',
        filterSkuPrimary: 'SKU (Chính)',
        filterSearchSkuPlaceholder: 'Tìm theo SKU...',
        filterAllSkus: 'Tất cả SKU',
        typeInbound: 'NHẬP HÀNG',
        typeCorrection: 'ĐIỀU CHỈNH',
        typeReturn: 'TRẢ HÀNG',
        typeDamage: 'HƯ HỎNG',
        typeReconciliation: 'KIỂM KÊ',
        typeRestock: 'TĂNG KHO',
        typeOther: 'KHÁC',
        colQtyDelta: 'Chênh lệch SL',
        colReasonNote: 'Lý do / Ghi chú',
        noAdjustments: 'Không có điều chỉnh tồn kho',
        createFirstAdjustment: 'Tạo điều chỉnh đầu tiên để quản lý tồn kho',
        movTitle: 'Biến Động Tồn Kho',
        movDesc: 'Nhật ký đầy đủ về tất cả các thay đổi số lượng tồn kho',
        movAddDemo: 'Thêm biến động mẫu',
        movApproveSuccess: 'Yêu cầu chuyển kho đã được phê duyệt và lên lịch',
        movApproveError: 'Phê duyệt chuyển kho thất bại: ',
        movAiSuggested: 'Gợi ý chuyển kho từ AI',
        movPending: 'đang chờ',
        movAiSuggestedDesc: 'Các bản nháp chuyển kho này được tạo bởi AI Copilot và cần bạn phê duyệt.',
        movUnits: 'đơn vị',
        filterTriggeredBy: 'Kích hoạt bởi',
        filterAllSources: 'Tất cả nguồn',
        filterSearchSku: 'Tìm SKU...',
        srcOrder: 'Đơn hàng',
        srcReturn: 'Khách trả hàng',
        srcAdjustment: 'Điều chỉnh thủ công',
        srcReplenishment: 'Chuyển kho',
        srcMarketplaceSync: 'Đồng bộ sàn',
        typeOrderAllocation: 'Phân bổ đơn hàng',
        typeShipped: 'Đã giao hàng',
        typeReturned: 'Đã trả hàng',
        typeAdjustment: 'Điều chỉnh',
        typeReplenishment: 'Bổ sung kho',
        typeWarehouseTransfer: 'Chuyển kho',
        colDateTime: 'Ngày / Giờ',
        colQtyChange: 'Thay đổi SL',
        colReference: 'Tham chiếu',
        colBalanceAfter: 'Số dư cuối',
        noMovements: 'Không có biến động tồn kho',
        noMovementsDesc: 'Các thay đổi tồn kho sẽ xuất hiện ở đây khi chúng xảy ra',
        tooltipTypeAllocation: 'Phân bổ đơn hàng = Giữ chỗ cho đơn hàng',
        tooltipTypeShipped: 'Đã giao hàng = Đã gửi cho khách',
        tooltipOwnerMarketplace: 'Chủ sở hữu: Sàn TMĐT',
        tooltipOwner3pl: 'Chủ sở hữu: Đối tác 3PL',
        tooltipOwnerSeller: 'Chủ sở hữu: Người bán',
        errorSkuNotFound: 'Không tìm thấy chi tiết SKU',
        colSkuName: 'SKU / Tên',
        colCurrent: 'Hiện tại',
        colUpdated: 'Cập nhật',
        colAction: 'Thao tác',
        noItemsAdded: 'Chưa có mục nào được thêm. Nhấp vào "Thêm mục" để bắt đầu.',
        placeholderQty: '+/- SL',
        addItem: 'Thêm mục',
        batchDetails: 'Chi tiết lô',
        batchId: 'Mã lô',
        noBatchSelected: 'Chưa chọn lô',
        noMovementsForBatch: 'Không tìm thấy biến động cho lô này',
        colTime: 'Thời gian',
        colQty: 'SL',
        noFulfillmentAssignments: 'Chưa cấu hình phân bổ hoàn thiện đơn hàng',
        noFulfillmentAssignmentsDesc: 'Kho này chưa được chỉ định vào bất kỳ mạng lưới hoàn thiện đơn hàng nào',
        fulfillmentGroup: 'Nhóm hoàn thiện đơn hàng',
        fulfillmentGroupTooltip: 'Loại đơn hàng mà kho này xử lý. Hệ thống tự động điều phối đơn hàng dựa trên các nhóm này.',
        serviceArea: 'Khu vực phục vụ',
        platformAutoSelectionNotice: 'Hệ thống tự động chọn kho hàng tốt nhất dựa trên chi phí, tốc độ giao hàng và tồn kho có sẵn. Bạn không cần chỉ định kho hàng thủ công cho mỗi đơn hàng.',
        grpMarketplaceOrders: 'Đơn sàn TMĐT',
        grpCrossBorderOrders: 'Đơn xuyên biên giới',
        grpReturnsHandling: 'Xử lý trả hàng',
        grpLocalOrders: 'Đơn hàng nội địa',
        grpReplenishmentHub: 'Trung tâm bổ sung kho',
        locUnitedStates: 'Hoa Kỳ',
        locJapan: 'Nhật Bản',
        locAsiaPacific: 'Châu Á Thái Bình Dương',
        locSingapore: 'Singapore',
        locAllRegions: 'Tất cả khu vực',
        roleExecutor: 'Người thực hiện',
        roleReturnQc: 'Trả hàng / QC',
        roleReplenishment: 'Bổ sung kho',
        priorityHigh: 'Cao',
        priorityMedium: 'Trung bình',
        priorityLow: 'Thấp',
        inventoryByStatus: 'Tồn kho theo trạng thái',
        inventoryByStatusDesc: 'Mức tồn kho hiện tại được chia theo trạng thái.',
        syncedFromMarketplace: ' Đồng bộ từ sàn TMĐT.',
        statusOnhand: 'Thực tế',
        statusOnhandTooltip: 'Tổng số lượng tồn kho vật lý hiện có tại kho này',
        statusAvailable: 'Khả dụng',
        statusAvailableTooltip: 'Tồn kho có sẵn để bán (Thực tế trừ giữ chỗ)',
        statusReserved: 'Giữ chỗ',
        statusReservedTooltip: 'Đã giữ cho các đơn hàng đang chờ - không có sẵn để bán mới',
        statusInbound: 'Đang về',
        statusInboundTooltip: 'Tồn kho dự kiến sẽ về (đơn mua hàng, điều chuyển)',
        statusIntransit: 'Đang chuyển',
        statusIntransitTooltip: 'Hàng đang được điều chuyển đến các kho khác',
        statusQchold: 'Chờ QC',
        statusQcholdTooltip: 'Tồn kho đang chờ kiểm tra chất lượng',
        statusDamaged: 'Hư hỏng',
        statusDamagedTooltip: 'Tồn kho bị hư hỏng hoặc không thể bán',
        noFulfillmentMapping: 'Chưa cấu hình ánh xạ loại hoàn thiện đơn hàng cho kho này.',
        setFulfillmentMapping: 'Thiết lập ánh xạ loại hoàn thiện đơn hàng để xem tồn kho.',
        stockTipTitle: 'Tồn kho vật lý vs Tồn kho có thể bán:',
        stockTipDesc: '"Khả dụng" là số lượng bạn có thể bán ngay. "Giữ chỗ" là số lượng đã có đơn hàng. "Thực tế" là tổng số lượng vật lý.',
        priorityHeader: 'Ưu tiên',
        manageWarehouses: 'Quản Lý Nhà Kho',
        allWarehouses: 'Tất Cả Nhà Kho',
        localTab: 'Local',
        reservationsTab: 'Reservations',
        fbaTab: 'FBA',
        matchingSkus: '{count} SKU phù hợp',
        kpiTotalAts: 'Tổng ATS',
        kpiTotalAtsMeta: 'Số lượng có thể bán trên các vị trí tồn kho đang hoạt động',
        kpiTotalOnHand: 'Tổng Thực Tế',
        kpiTotalOnHandMeta: 'Tồn kho vật lý trước khi phân bổ giữ chỗ',
        kpiWarehouses: 'Nhà Kho',
        kpiWarehousesMeta: '{count} node kho đang nằm trong phạm vi xem',
        inventoryHealth: 'Sức Khỏe Tồn Kho',
        fbaSyncSurface: 'Bề Mặt Đồng Bộ FBA',
        reservationLedgerTitle: 'Sổ Cái Reservation',
        atsBySku: 'ATS Theo SKU',
        emptyFilteredTitle: 'Không có tồn kho nào khớp với bộ lọc này',
        emptyFilteredDesc: 'Hãy xóa bộ lọc kho hoặc từ khóa tìm kiếm hiện tại.',
        emptyEmptyTitle: 'Chưa có vị trí tồn kho',
        emptyEmptyDesc: 'Các vị trí tồn kho sẽ xuất hiện ở đây sau khi seed dữ liệu hoặc kết nối đồng bộ kho.',
    },
    listings: {
        pageTitle: 'Kênh Bán Hàng',
        pageDesc: '{count} listing trên {channels} kênh',
        newListing: 'Listing Mới',
        totalListings: 'Tổng Listing',
        totalListingsMeta: '{count} nhóm kênh đang hoạt động',
        published: 'Đã xuất bản',
        publishedMeta: 'Đang hiển thị trên các kênh đã kết nối',
        draft: 'Bản nháp',
        draftMeta: 'Đang chờ hoàn thiện thông tin sản phẩm hoặc kênh',
        needsAttention: 'Cần xử lý',
        needsAttentionMeta: 'Listing bị pause hoặc lỗi cần được theo dõi',
        searchPlaceholder: 'Tìm theo SKU, sản phẩm, tiêu đề listing hoặc kênh...',
        allChannels: 'Tất cả',
        resultCount: '{count} listing phù hợp',
        sectionTitle: 'Tồn Kho Theo Kênh',
        filteredEmptyTitle: 'Không có listing nào khớp với bộ lọc này',
        filteredEmptyDesc: 'Hãy đổi bộ lọc kênh hoặc từ khóa tìm kiếm để mở rộng kết quả.',
        emptyTitle: 'Chưa có listing nào',
        emptyDesc: 'Listing xuất bản từ Product Master sẽ xuất hiện ở đây sau khi map xong kênh.',
        colProduct: 'Sản phẩm',
        colSku: 'SKU',
        colChannel: 'Kênh',
        colChannelId: 'ID trên kênh',
        colPrice: 'Giá',
        colStatus: 'Trạng thái',
        colPublished: 'Xuất bản',
        colLastSynced: 'Đồng bộ gần nhất',
    },
    returnsPage: {
        pageTitle: 'Trả Hàng',
        pageDesc: 'Quản lý yêu cầu trả hàng và QC',
        searchPlaceholder: 'Tìm theo RMA, đơn hàng, khách hàng hoặc lý do...',
        allStatuses: 'Tất cả',
        approved: 'Đã duyệt',
        received: 'Đã nhận',
        inQc: 'Đang QC',
        completed: 'Hoàn tất',
        resultCount: '{count} kết quả',
        filteredEmptyTitle: 'Không có yêu cầu trả hàng nào khớp với bộ lọc này',
        filteredEmptyDesc: 'Hãy xóa bộ lọc trạng thái hoặc từ khóa tìm kiếm hiện tại.',
        emptyTitle: 'Chưa có yêu cầu trả hàng nào',
        emptyDesc: 'Các yêu cầu đã duyệt, đã nhận, QC và hoàn tất sẽ xuất hiện ở đây.',
        colRma: 'Mã RMA',
        colOrder: 'Đơn hàng',
        colReason: 'Lý do',
        colStatus: 'Trạng thái',
        colGrade: 'Grade',
        colDisposition: 'Disposition',
        colRefund: 'Hoàn tiền',
        colCreated: 'Ngày tạo',
        openReturn: 'Mở phiếu trả hàng {id}',
        detailBack: 'Quay lại trả hàng',
        detailBackAria: 'Quay lại {label}',
        detailNotFound: 'Không tìm thấy phiếu trả',
        detailNotFoundDesc: 'Phiếu trả này có thể đã bị xóa khỏi phiên demo hiện tại hoặc đường dẫn không còn hợp lệ.',
        detailOrder: 'Đơn: {id}',
        detailItemsCount: '{count} sản phẩm',
        detailCustomer: 'Khách hàng',
        detailRefundAmount: 'Số tiền hoàn',
        detailCreated: 'Ngày tạo',
        detailItemsTitle: 'Sản phẩm trả ({count})',
        detailPendingQc: '{count} mục chờ QC',
        detailNoItems: 'Không có sản phẩm nào trong phiếu trả này.',
        detailExpected: 'Dự kiến',
        detailReceived: 'Đã nhận',
        detailGrade: 'Phân loại',
        detailQcResult: 'Kết quả QC',
        detailDisposition: 'Xử lý',
        detailActions: 'Hành động',
        detailQcAction: 'QC',
        detailDispositionAction: 'Xử lý',
        detailRestocked: 'Đã nhập lại kho',
        detailPending: 'Đang chờ',
        detailPass: 'Đạt',
        detailFail: 'Không đạt',
        detailQcSummary: 'Tóm tắt QC',
        detailPassedCount: 'Đạt: {count}',
        detailFailedCount: 'Không đạt: {count}',
        detailRestockedCount: 'Đã nhập lại kho: {count}',
    },

    common: {
        saveChanges: 'Lưu Thay Đổi',
        cancel: 'Hủy Bỏ',
        delete: 'Xóa',
        clear: 'Xóa',
        clearSearch: 'Xóa tìm kiếm',
        edit: 'Sửa',
        active: 'Hoạt động',
        inactive: 'Ngưng',
        typeInHouse: 'Nội Bộ',
        type3PL: 'Đối Tác (3PL)',
        typeMarketplace: 'Sàn Thương Mại',
        search: 'Tìm kiếm',
        viewDetails: 'Xem Chi Tiết',
        items: 'mục',
    },
    controlTower: {
        pageTitle: 'Tháp Điều Khiển',
        pageDesc: 'Bảng điều khiển vận hành COS - SME 1.0',
        refreshData: 'Làm Mới Dữ Liệu',
        tabExecutive: 'Ban Quản Trị',
        tabOperations: 'Vận Hành',
        tabSystem: 'Hệ Thống',
        loading: 'Đang tổng hợp dữ liệu Tháp Điều Khiển...',
        failedLoad: 'Tải dữ liệu thất bại.',
        netRevenue: 'Doanh Thu Thuần',
        orders: 'Đơn Hàng',
        aov: 'Giá Trị Đơn Trung Bình',
        listingCoverage: 'Tỉ Lệ Phủ Sóng Listing',
        skus: 'SKUs',
        shipSlaSuccess: 'Tỉ Lệ Đạt SLA',
        criticalAlerts: 'Cảnh Báo Nghiêm Trọng',
        salesByMarketplace: 'Doanh Thu Theo Sàn',
        salesByCountry: 'Doanh Thu Theo Quốc Gia',
        viewRegionalMap: 'Xem Bản Đồ Khu Vực',
        integrationHealth: 'Sức Khoẻ Tích Hợp',
        orderPipeline: 'Tiến Trình Đơn Hàng',
        vsLastMonth: 'so với tháng trước',
        vsTarget: 'so với mục tiêu',
        pendingOrders: 'Đơn Chờ Xử Lý',
        totalAtsInventory: 'Tổng Tồn Kho Khả Dụng',
        units: 'Sản Phẩm',
        inboundReceipts: 'Nhập Kho Dự Kiến',
        pickTimeP50: 'Thời Gian Lấy (P50)',
        packTimeP50: 'Thời Gian Đóng Gói (P50)',
        avgDeliveryTime: 'Thời Gian Giao TB',
        h: 'h',
        d: 'ngày',
        orchestrationPipeline: 'Tiến Trình Xử Lý Đơn',
        stageCreated: 'Đã Tạo',
        stageValidated: 'Đã Xác Nhận',
        stageAllocated: 'Đã Chỉ Định Kho',
        stageReserved: 'Đã Giữ Chỗ',
        stageInFulfillment: 'Đang Hoàn Thiện',
        stageShipped: 'Đã Gửi Hàng',
        stageDelivered: 'Đã Giao Hàng',
        inventoryByNode: 'Tồn Kho Theo Node',
        totalNetworkAts: 'Tổng Khả Dụng Mạng Lưới',
        totalReserved: 'Tổng Đã Giữ Chỗ',
        viewWarehouses: 'Xem Kho Hàng',
        ats: 'ATS',
        r: 'R',
        fulfillmentNodePerformance: 'Hiệu Suất Hoàn Thiện Đơn',
        colNode: 'Node (Kho)',
        colShipSlaSuccess: 'Tỉ Lệ Đạt SLA',
        colBacklog: 'Tồn Đọng (Đơn Hàng)',
        viewFulfillmentOps: 'Xem Chờ Xử Lý',
        activeConnectors: 'Connector Lỗi Trạng',
        totalSyncErrors: 'Tổng Lỗi Đồng Bộ',
        time24h: '24h',
        avgSyncLag: 'Độ Trễ Đồng Bộ TB',
        timeMins: 'p',
        omsIngestionRate: 'Tốc Độ Xử Lý OMS',
        ordersPerH: 'đơn/h',
        routingSuccess: 'Tỉ Lệ Phân Bổ Thành Công',
        allocLatencyP50: 'Độ Trễ Phân Bổ p50',
        timeMs: 'ms',
        channelConnectorsStatus: 'Trạng Thái Kết Nối Kênh',
        productMasterHealth: 'Chất Lượng Product Master',
        mappingCoverage: 'Tỉ Lệ Map',
        contentCompleteness: 'Tỉ Lệ Hoàn Thiện Nội Dung',
        priorityAlerts: 'Cảnh Báo Ưu Tiên',
        noPriorityAlerts: 'Không có cảnh báo ưu tiên nào phù hợp với tiêu chí.',
        viewFullPipeline: 'Xem Toàn Bộ Tiến Trình',
        syncLag: 'Độ Trễ Đồng Bộ',
        errorRate: 'Tỉ Lệ Lỗi',
        viewSystemIntegrations: 'Xem Tích Hợp Hệ Thống',
        liveAt: 'Live · {time}',
        syncing: 'Đang đồng bộ dashboard',
        emptyTitle: 'Chưa có dữ liệu dashboard',
        emptyDescription: 'Khi dữ liệu từ product, inventory, OMS và fulfillment đổ về, Control Tower sẽ hiển thị KPI, cảnh báo và queue vận hành tại đây.',
        zeroPendingOrders: 'Hiện không có đơn nào đang chờ xử lý',
        zeroInboundReceipts: 'Hiện không có đợt nhập kho nào trong hàng chờ',
        zeroDeliveries: 'Chưa có lô giao hàng nào hoàn tất',
    },
    fulfillment: fulfillmentDictionaries['vi-VN'],
    audit: auditDictionaries['vi-VN'],
};

export const dictionaries: Record<Locale, Dictionary> = {
    'en-US': enUS,
    'ja-JP': jaJP,
    'vi-VN': viVN,
};
