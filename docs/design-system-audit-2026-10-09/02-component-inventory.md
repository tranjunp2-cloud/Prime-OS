# PRIME OS — Inventory component và props API

Snapshot: 2026-10-09, commit `0bc504a`. Phụ lục của báo cáo Design System.

Đọc trực tiếp TypeScript AST. Bao gồm các khai báo export tên PascalCase trong `components/`, `features/` và các helper UI nội bộ của admin. Các helper nội bộ không tự động được xem là API dùng chung. Component có mặt trong source không đồng nghĩa đang được render ở production. Alias tới Radix/HTML giữ nguyên contract thư viện; không chép toàn bộ typings bên ngoài. `className`, native attributes và ref chỉ được hỗ trợ khi type/source ghi rõ. Props type nghiệp vụ nhập từ file khác giữ nguyên tên để tránh diễn giải sai. Các block CVA là cấu hình thực tế, gồm variants và defaults.

## Danh mục export

| File | Exports UI / alias | Lớp |
| --- | --- | --- |
| [apps/admin/src/App.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/admin/src/App.tsx) | `App` | Domain / feature |
| [apps/web/src/components/channels/ChannelLogo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ChannelLogo.tsx) | `ChannelLogo` | Domain / feature |
| [apps/web/src/components/channels/ConnectStoreWizardModal.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ConnectStoreWizardModal.tsx) | `ConnectStoreWizardModal` | Domain / feature |
| [apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx) | `ShopDefaultWarehouseForm` | Domain / feature |
| [apps/web/src/components/channels/Step1ChannelCatalog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step1ChannelCatalog.tsx) | `Step1ChannelCatalog` | Domain / feature |
| [apps/web/src/components/channels/Step2StoreAuth.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step2StoreAuth.tsx) | `Step2StoreAuth` | Domain / feature |
| [apps/web/src/components/channels/Step3WarehouseConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step3WarehouseConfig.tsx) | `Step3WarehouseConfig` | Domain / feature |
| [apps/web/src/components/channels/Step4CatalogSync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step4CatalogSync.tsx) | `Step4CatalogSync` | Domain / feature |
| [apps/web/src/components/common/LanguageToggle.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/common/LanguageToggle.tsx) | `LanguageToggle` | Domain / feature |
| [apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx) | `ConfigureChannelDrawer` | Domain / feature |
| [apps/web/src/components/conversation-channels/ConnectConversationModal.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConnectConversationModal.tsx) | `ConnectConversationModal` | Domain / feature |
| [apps/web/src/components/conversation-channels/Step1SelectSource.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step1SelectSource.tsx) | `SourceIcon`, `Step1SelectSource` | Domain / feature |
| [apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx) | `Step2RoutingConfig` | Domain / feature |
| [apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx) | `Step3AutomationConfig` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotActions.tsx) | `GlobalCopilotActions` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotChatThread.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotChatThread.tsx) | `GlobalCopilotChatThread` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotComposer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotComposer.tsx) | `GlobalCopilotComposer` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotDrawer.tsx) | `GlobalCopilotDrawer` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotFAB.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotFAB.tsx) | `GlobalCopilotFAB` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx) | `GlobalCopilotQuickPrompts` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotSurface.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotSurface.tsx) | `GlobalCopilotSurface` | Domain / feature |
| [apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx) | `GlobalCopilotWorkspace` | Domain / feature |
| [apps/web/src/components/dashboard/AlertsFeed.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/AlertsFeed.tsx) | `AlertsFeed` | Domain / feature |
| [apps/web/src/components/dashboard/ControlTowerKpiRow.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/ControlTowerKpiRow.tsx) | `ControlTowerKpiCard`, `ControlTowerKpiRow` | Domain / feature |
| [apps/web/src/components/dashboard/DashboardSkeleton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/DashboardSkeleton.tsx) | `DashboardSkeleton` | Domain / feature |
| [apps/web/src/components/dashboard/HealthCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/HealthCard.tsx) | `HealthCard` | Domain / feature |
| [apps/web/src/components/dashboard/KPICard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/KPICard.tsx) | `KPICard` | Domain / feature |
| [apps/web/src/components/dashboard/PerformanceCharts.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PerformanceCharts.tsx) | `PerformanceCharts` | Domain / feature |
| [apps/web/src/components/dashboard/PipelineCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PipelineCard.tsx) | `PipelineCard` | Domain / feature |
| [apps/web/src/components/fulfillment/CreateShipmentDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/CreateShipmentDialog.tsx) | `CreateShipmentDialog` | Domain / feature |
| [apps/web/src/components/fulfillment/DispositionDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/DispositionDialog.tsx) | `DispositionDialog` | Domain / feature |
| [apps/web/src/components/fulfillment/ExceptionDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ExceptionDialog.tsx) | `ExceptionDialog` | Domain / feature |
| [apps/web/src/components/fulfillment/FbaInventorySync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaInventorySync.tsx) | `FbaInventorySync` | Domain / feature |
| [apps/web/src/components/fulfillment/FbaShipmentPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaShipmentPanel.tsx) | `FbaShipmentPanel` | Domain / feature |
| [apps/web/src/components/fulfillment/FlowTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FlowTypeBadge.tsx) | `FlowTypeBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx) | `FulfillmentJobsTable` | Domain / feature |
| [apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx) | `FulfillmentWorkflowTimeline` | Domain / feature |
| [apps/web/src/components/fulfillment/JobStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/JobStatusBadge.tsx) | `JobStatusBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/PartnerStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerStatusBadge.tsx) | `PartnerStatusBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/PartnerTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerTypeBadge.tsx) | `PartnerTypeBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/PartnersTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnersTable.tsx) | `PartnersTable` | Domain / feature |
| [apps/web/src/components/fulfillment/QCDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/QCDialog.tsx) | `QCDialog` | Domain / feature |
| [apps/web/src/components/fulfillment/ReturnReviewQueue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnReviewQueue.tsx) | `ReturnReviewQueue` | Domain / feature |
| [apps/web/src/components/fulfillment/ReturnStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusBadge.tsx) | `ReturnStatusBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/ReturnStatusStepper.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusStepper.tsx) | `ReturnStatusStepper` | Domain / feature |
| [apps/web/src/components/fulfillment/ReturnsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnsTable.tsx) | `ReturnsTable` | Domain / feature |
| [apps/web/src/components/fulfillment/ShipmentPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentPanel.tsx) | `ShipmentPanel` | Domain / feature |
| [apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx) | `ShipmentStatusBadge` | Domain / feature |
| [apps/web/src/components/fulfillment/TrackingTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/TrackingTimeline.tsx) | `TrackingTimeline` | Domain / feature |
| [apps/web/src/components/inventory/ATSBucketChart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSBucketChart.tsx) | `ATSBucketChart` | Domain / feature |
| [apps/web/src/components/inventory/ATSHealthDonut.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSHealthDonut.tsx) | `ATSHealthDonut` | Domain / feature |
| [apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx) | `AdjustWarehouseStockDialog` | Domain / feature |
| [apps/web/src/components/inventory/AdjustmentTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentTypeBadge.tsx) | `AdjustmentTypeBadge` | Domain / feature |
| [apps/web/src/components/inventory/AdjustmentsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentsTable.tsx) | `AdjustmentsTable` | Domain / feature |
| [apps/web/src/components/inventory/FulfillmentModeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/FulfillmentModeBadge.tsx) | `FulfillmentModeBadge` | Domain / feature |
| [apps/web/src/components/inventory/InventoryStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventoryStatusBadge.tsx) | `InventoryStatusBadge` | Domain / feature |
| [apps/web/src/components/inventory/InventorySummaryTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventorySummaryTable.tsx) | `InventorySummaryTable` | Domain / feature |
| [apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx) | `LinkWarehouseShopsDrawer` | Domain / feature |
| [apps/web/src/components/inventory/ManageStockHoldsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ManageStockHoldsDialog.tsx) | `ManageStockHoldsButton`, `StockHoldHistory`, `ManageStockHoldsDialog` | Domain / feature |
| [apps/web/src/components/inventory/MovementTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementTypeBadge.tsx) | `MovementTypeBadge` | Domain / feature |
| [apps/web/src/components/inventory/MovementsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementsTable.tsx) | `MovementsTable` | Domain / feature |
| [apps/web/src/components/inventory/MyWarehouses.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MyWarehouses.tsx) | `MyWarehouses` | Domain / feature |
| [apps/web/src/components/inventory/ReservationLedger.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger.tsx) | `ReservationLedger` | Domain / feature |
| [apps/web/src/components/inventory/ReservationLedger5State.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger5State.tsx) | `ReservationLedger5State` | Domain / feature |
| [apps/web/src/components/inventory/StockActivityDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockActivityDrawer.tsx) | `StockActivityDrawer` | Domain / feature |
| [apps/web/src/components/inventory/StockAvailability.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx) | `InventoryAmount`, `StockGuide`, `AvailabilityMetrics`, `AvailabilityCoverage`, `StockBreakdown` | Domain / feature |
| [apps/web/src/components/inventory/StockRowActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockRowActions.tsx) | `StockRowActions` | Domain / feature |
| [apps/web/src/components/inventory/StockTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockTable.tsx) | `StockTable` | Domain / feature |
| [apps/web/src/components/inventory/TransferStockDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/TransferStockDrawer.tsx) | `TransferStockDrawer` | Domain / feature |
| [apps/web/src/components/inventory/VirtualWarehouseBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/VirtualWarehouseBadge.tsx) | `VirtualWarehouseBadge`, `MarketplaceSyncBadge` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx) | `WarehouseCapabilityBadges` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseSelector.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSelector.tsx) | `WarehouseSelector`, `WarehouseFilter` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseSetup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSetup.tsx) | `CreateWarehouseDrawer`, `AddWarehouseStockDrawer` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseShops.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseShops.tsx) | `WarehouseShopsCell`, `WarehouseShopsDrawer` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStatusBadge.tsx) | `WarehouseStatusBadge` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseStockTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStockTable.tsx) | `StockNumber`, `WarehouseStockTable` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTable.tsx) | `WarehouseTable` | Domain / feature |
| [apps/web/src/components/inventory/WarehouseTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTypeBadge.tsx) | `WarehouseTypeBadge` | Domain / feature |
| [apps/web/src/components/layout/AppHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppHeader.tsx) | `AppHeader` | App shell |
| [apps/web/src/components/layout/AppLayout.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppLayout.tsx) | `AppLayout` | App shell |
| [apps/web/src/components/layout/AppSidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppSidebar.tsx) | `AppSidebar` | App shell |
| [apps/web/src/components/layout/ContextSelector.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/ContextSelector.tsx) | `ContextSelector` | App shell |
| [apps/web/src/components/layout/DemoModeTabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/DemoModeTabs.tsx) | `DemoModeTabs` | App shell |
| [apps/web/src/components/layout/PrimeCommandPalette.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/PrimeCommandPalette.tsx) | `PrimeCommandPalette` | App shell |
| [apps/web/src/components/layout/SidebarUserFooter.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/SidebarUserFooter.tsx) | `SidebarUserFooter` | App shell |
| [apps/web/src/components/layout/WorkspaceSwitcher.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/WorkspaceSwitcher.tsx) | `WorkspaceSwitcher` | App shell |
| [apps/web/src/components/listings/AISuggestionPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/AISuggestionPanel.tsx) | `AISuggestionPanel` | Domain / feature |
| [apps/web/src/components/listings/ListingPreview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/ListingPreview.tsx) | `ListingPreview` | Domain / feature |
| [apps/web/src/components/listings/groups/MediaGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/MediaGroup.tsx) | `MediaGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/OfferGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/OfferGroup.tsx) | `OfferGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/ProductDetailsGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductDetailsGroup.tsx) | `ProductDetailsGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/ProductIdentityGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductIdentityGroup.tsx) | `ProductIdentityGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx) | `SafetyComplianceGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/ShippingGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ShippingGroup.tsx) | `ShippingGroup` | Domain / feature |
| [apps/web/src/components/listings/groups/VariantSelectionStep.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariantSelectionStep.tsx) | `VariantSelectionStep` | Domain / feature |
| [apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx) | `VariationRelationshipsGroup` | Domain / feature |
| [apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx) | `CreateLiveSessionWizard` | Domain / feature |
| [apps/web/src/components/live-commerce/EditSessionDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/EditSessionDrawer.tsx) | `EditSessionDrawer` | Domain / feature |
| [apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx) | `LiveWarRoomDrawer` | Domain / feature |
| [apps/web/src/components/live-commerce/SessionOperationsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/SessionOperationsTable.tsx) | `SessionOperationsTable` | Domain / feature |
| [apps/web/src/components/oms/RoutingConfigEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/RoutingConfigEditor.tsx) | `RoutingConfigEditor` | Domain / feature |
| [apps/web/src/components/oms/SlaBreachBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/SlaBreachBadge.tsx) | `SlaBreachBadge` | Domain / feature |
| [apps/web/src/components/onboarding/InitialSetupBanner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/InitialSetupBanner.tsx) | `InitialSetupBanner` | Domain / feature |
| [apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx) | `OnboardingChecklistDrawer` | Domain / feature |
| [apps/web/src/components/orders/CopyValue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/CopyValue.tsx) | `CopyValue` | Domain / feature |
| [apps/web/src/components/orders/HandlingTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/HandlingTypeBadge.tsx) | `HandlingTypeBadge` | Domain / feature |
| [apps/web/src/components/orders/LifecycleStageBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/LifecycleStageBadge.tsx) | `LifecycleStageBadge` | Domain / feature |
| [apps/web/src/components/orders/ManualOrderDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/ManualOrderDialog.tsx) | `OrderField`, `ManualOrderDialog` | Domain / feature |
| [apps/web/src/components/orders/OrderBatchDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderBatchDialog.tsx) | `OrderBatchDialog` | Domain / feature |
| [apps/web/src/components/orders/OrderEventTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderEventTimeline.tsx) | `OrderEventTimeline` | Domain / feature |
| [apps/web/src/components/orders/OrderFilters.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderFilters.tsx) | `OrderFilters` | Domain / feature |
| [apps/web/src/components/orders/OrderLifecycleBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderLifecycleBadge.tsx) | `OrderLifecycleBadge` | Domain / feature |
| [apps/web/src/components/orders/OrderNavigation.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderNavigation.tsx) | `OrderNavigation` | Domain / feature |
| [apps/web/src/components/orders/OrderPreparationDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderPreparationDialog.tsx) | `OrderPreparationDialog` | Domain / feature |
| [apps/web/src/components/orders/OrderProcessingDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderProcessingDialog.tsx) | `OrderProcessingDialog` | Domain / feature |
| [apps/web/src/components/orders/OrderShipmentJourney.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderShipmentJourney.tsx) | `OrderShipmentJourney` | Domain / feature |
| [apps/web/src/components/orders/OrderStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusBadge.tsx) | `OrderStatusBadge` | Domain / feature |
| [apps/web/src/components/orders/OrderStatusTabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusTabs.tsx) | `OrderStatusTabs` | Domain / feature |
| [apps/web/src/components/orders/OrderToolbar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderToolbar.tsx) | `OrderToolbar` | Domain / feature |
| [apps/web/src/components/orders/OrderWorkspaceDetail.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderWorkspaceDetail.tsx) | `OrderWorkspaceDetail` | Domain / feature |
| [apps/web/src/components/orders/OrdersTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrdersTable.tsx) | `OrdersTable` | Domain / feature |
| [apps/web/src/components/prime/IntelligenceDragBoard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/IntelligenceDragBoard.tsx) | `IntelligenceDragBoard` | Domain / feature |
| [apps/web/src/components/prime/MyInvoisStatusPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/MyInvoisStatusPanel.tsx) | `MyInvoisStatusPanel` | Domain / feature |
| [apps/web/src/components/prime/PartnerWorkspacePanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PartnerWorkspacePanel.tsx) | `PartnerWorkspacePanel` | Domain / feature |
| [apps/web/src/components/prime/PrimeOperatingSystem.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx) | `IdentifierText`, `OwnerSlaBadge`, `LinkedEntityStrip`, `DecisionHeader`, `OperatingLoop`, `HandoffRail`, `EvidenceStack`, `GuardrailCard`, `OutcomePreview`, `ActionSetupPanel`, `RegistryList` | Domain / feature |
| [apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx) | `CustomerProfileFloor` | Domain / feature |
| [apps/web/src/components/products/ApplyMasterSheet.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ApplyMasterSheet.tsx) | `ApplyMasterSheet` | Domain / feature |
| [apps/web/src/components/products/BrandChannelMappings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/BrandChannelMappings.tsx) | `BrandChannelMappings` | Domain / feature |
| [apps/web/src/components/products/CategorySchemaChanges.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CategorySchemaChanges.tsx) | `CategorySchemaChanges` | Domain / feature |
| [apps/web/src/components/products/ChannelListingEditorDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingEditorDrawer.tsx) | `ChannelListingEditorDrawer` | Domain / feature |
| [apps/web/src/components/products/ChannelListingPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingPanel.tsx) | `ChannelListingPanel` | Domain / feature |
| [apps/web/src/components/products/ChannelListingWizard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingWizard.tsx) | `ChannelListingWizard` | Domain / feature |
| [apps/web/src/components/products/CreateProductDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CreateProductDialog.tsx) | `CreateProductDialog` | Domain / feature |
| [apps/web/src/components/products/FieldProvenanceBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/FieldProvenanceBadge.tsx) | `FieldProvenanceBadge` | Domain / feature |
| [apps/web/src/components/products/LinkExistingListingsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkExistingListingsDialog.tsx) | `LinkExistingListingsDialog` | Domain / feature |
| [apps/web/src/components/products/LinkedListingDetails.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkedListingDetails.tsx) | `LinkedListingDetails` | Domain / feature |
| [apps/web/src/components/products/ListingChannelReadiness.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingChannelReadiness.tsx) | `ListingChannelReadiness` | Domain / feature |
| [apps/web/src/components/products/ListingComparisonTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingComparisonTable.tsx) | `ListingComparisonTable` | Domain / feature |
| [apps/web/src/components/products/ListingFieldMappingRow.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingFieldMappingRow.tsx) | `ListingFieldMappingRow` | Domain / feature |
| [apps/web/src/components/products/ListingMappingContext.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingContext.tsx) | `ListingMappingContext` | Domain / feature |
| [apps/web/src/components/products/ListingMappingReviewDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingReviewDialog.tsx) | `ListingMappingReviewDialog` | Domain / feature |
| [apps/web/src/components/products/ListingMasterCompletion.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterCompletion.tsx) | `ListingMasterCompletion` | Domain / feature |
| [apps/web/src/components/products/ListingMasterDraftFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterDraftFields.tsx) | `ListingMasterDraftFields` | Domain / feature |
| [apps/web/src/components/products/ListingMasterReview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterReview.tsx) | `ListingMasterReview` | Domain / feature |
| [apps/web/src/components/products/ListingMasterSummary.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSummary.tsx) | `ListingMasterSummary` | Domain / feature |
| [apps/web/src/components/products/ListingMasterSync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSync.tsx) | `ListingMasterSyncControl`, `ListingMasterSyncDialog` | Domain / feature |
| [apps/web/src/components/products/ListingPricingFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingPricingFields.tsx) | `ListingPricingFields` | Domain / feature |
| [apps/web/src/components/products/ListingRequirementNotice.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRequirementNotice.tsx) | `ListingRequirementNotice` | Domain / feature |
| [apps/web/src/components/products/ListingReviewBanner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewBanner.tsx) | `ListingReviewBanner` | Domain / feature |
| [apps/web/src/components/products/ListingReviewGuide.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewGuide.tsx) | `ListingReviewGuide` | Domain / feature |
| [apps/web/src/components/products/ListingReviewHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewHelp.tsx) | `ListingReviewHelp` | Domain / feature |
| [apps/web/src/components/products/ListingReviewResult.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewResult.tsx) | `ListingReviewResult` | Domain / feature |
| [apps/web/src/components/products/ListingRowActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRowActions.tsx) | `ListingRowActions` | Domain / feature |
| [apps/web/src/components/products/ListingSaveSummary.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSaveSummary.tsx) | `ListingSaveSummary` | Domain / feature |
| [apps/web/src/components/products/ListingShopValue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingShopValue.tsx) | `ListingShopValue` | Domain / feature |
| [apps/web/src/components/products/ListingSkuMappings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSkuMappings.tsx) | `ListingSkuMappings` | Domain / feature |
| [apps/web/src/components/products/ListingSyncConfiguration.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSyncConfiguration.tsx) | `ListingSyncConfiguration` | Domain / feature |
| [apps/web/src/components/products/MasterStatusHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/MasterStatusHelp.tsx) | `MasterStatusHelp` | Domain / feature |
| [apps/web/src/components/products/ProductActivityHistory.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductActivityHistory.tsx) | `ProductActivityHistory` | Domain / feature |
| [apps/web/src/components/products/ProductChannelListings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductChannelListings.tsx) | `ProductChannelListings` | Domain / feature |
| [apps/web/src/components/products/ProductGettingStarted.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductGettingStarted.tsx) | `ProductGettingStarted` | Domain / feature |
| [apps/web/src/components/products/ProductImagesEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductImagesEditor.tsx) | `ProductImagesEditor` | Domain / feature |
| [apps/web/src/components/products/ProductLifecycleActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductLifecycleActions.tsx) | `ProductLifecycleMenuItems` | Domain / feature |
| [apps/web/src/components/products/ProductListingIntake.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductListingIntake.tsx) | `ProductListingIntake` | Domain / feature |
| [apps/web/src/components/products/ProductMasterForm.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductMasterForm.tsx) | `ProductMasterForm` | Domain / feature |
| [apps/web/src/components/products/ProductOverviewSnapshot.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductOverviewSnapshot.tsx) | `ProductOverviewSnapshot` | Domain / feature |
| [apps/web/src/components/products/ProductReadinessCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductReadinessCard.tsx) | `ProductReadinessCard` | Domain / feature |
| [apps/web/src/components/products/ProductSalesPerformance.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductSalesPerformance.tsx) | `ProductSalesPerformance` | Domain / feature |
| [apps/web/src/components/products/ProductWorkspaceHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductWorkspaceHelp.tsx) | `ProductWorkspaceHelp` | Domain / feature |
| [apps/web/src/components/products/SalesMetricHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SalesMetricHelp.tsx) | `SalesMetricHelp` | Domain / feature |
| [apps/web/src/components/products/SelectVariantsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectVariantsDialog.tsx) | `SelectVariantsDialog` | Domain / feature |
| [apps/web/src/components/products/SelectedListingsOverview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectedListingsOverview.tsx) | `SelectedListingsOverview` | Domain / feature |
| [apps/web/src/components/products/ShopListingEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ShopListingEditor.tsx) | `ShopListingEditor` | Domain / feature |
| [apps/web/src/components/products/SuggestedListingLinksDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SuggestedListingLinksDialog.tsx) | `SuggestedListingLinksDialog` | Domain / feature |
| [apps/web/src/components/products/VariantInventoryDetails.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariantInventoryDetails.tsx) | `VariantInventoryDetails` | Domain / feature |
| [apps/web/src/components/products/VariationThemeBuilder.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariationThemeBuilder.tsx) | `VariationThemeBuilder` | Domain / feature |
| [apps/web/src/components/routing/LegacyEntityRedirect.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/routing/LegacyEntityRedirect.tsx) | `LegacyPathRedirect`, `LegacyEntityRedirect` | Domain / feature |
| [apps/web/src/components/seller-onboarding/SellerSetupFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/seller-onboarding/SellerSetupFields.tsx) | `SellerSetupFields` | Domain / feature |
| [apps/web/src/components/settings/PricingRuleDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/PricingRuleDialog.tsx) | `PricingRuleDialog` | Domain / feature |
| [apps/web/src/components/settings/ShopPricingSettings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/ShopPricingSettings.tsx) | `ShopPricingSettings` | Domain / feature |
| [apps/web/src/components/settings/TeamAccessConfiguration.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/TeamAccessConfiguration.tsx) | `TeamAccessConfiguration` | Domain / feature |
| [apps/web/src/components/shared/ChannelSourceFilter.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/ChannelSourceFilter.tsx) | `ChannelSourceFilter` | Domain / feature |
| [apps/web/src/components/shared/OverviewDemoMode.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/OverviewDemoMode.tsx) | `OverviewDemoMode`, `OverviewNoData` | Domain / feature |
| [apps/web/src/components/shared/SeedDemoDataButton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedDemoDataButton.tsx) | `SeedDemoDataButton` | Domain / feature |
| [apps/web/src/components/shared/SeedFullDemoButton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedFullDemoButton.tsx) | `SeedFullDemoButton` | Domain / feature |
| [apps/web/src/components/system/ActionToolbar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ActionToolbar.tsx) | `ActionToolbar` | System pattern |
| [apps/web/src/components/system/AlertSeverityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/AlertSeverityBadge.tsx) | `AlertSeverityBadge` | System pattern |
| [apps/web/src/components/system/ChannelBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBadge.tsx) | `ChannelBadge` | System pattern |
| [apps/web/src/components/system/ChannelBrand.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBrand.tsx) | `ChannelMark`, `ChannelWordmark` | System pattern |
| [apps/web/src/components/system/ConfirmDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ConfirmDialog.tsx) | `ConfirmDialog` | System pattern |
| [apps/web/src/components/system/DataTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DataTable.tsx) | `DataTable` | System pattern |
| [apps/web/src/components/system/DetailInfoCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DetailInfoCard.tsx) | `DetailInfoCard` | System pattern |
| [apps/web/src/components/system/EmptyState.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/EmptyState.tsx) | `EmptyState` | System pattern |
| [apps/web/src/components/system/FiltersBar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/FiltersBar.tsx) | `FiltersBar` | System pattern |
| [apps/web/src/components/system/PageDataState.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageDataState.tsx) | `PageDataState` | System pattern |
| [apps/web/src/components/system/PageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageHeader.tsx) | `PageHeader` | System pattern |
| [apps/web/src/components/system/PriorityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PriorityBadge.tsx) | `PriorityBadge` | System pattern |
| [apps/web/src/components/system/SkuBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SkuBadge.tsx) | `SkuBadge` | System pattern |
| [apps/web/src/components/system/SlaIndicator.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SlaIndicator.tsx) | `SlaIndicator` | System pattern |
| [apps/web/src/components/system/StatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/StatusBadge.tsx) | `StatusBadge` | System pattern |
| [apps/web/src/components/system/SummaryMetricCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SummaryMetricCard.tsx) | `SummaryMetricCard` | System pattern |
| [apps/web/src/components/system/SystemPageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SystemPageHeader.tsx) | `SystemPageHeader` | System pattern |
| [apps/web/src/components/system/ThemeModeSwitcher.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ThemeModeSwitcher.tsx) | `ThemeModeSwitcher` | System pattern |
| [apps/web/src/components/system/UserFeedbackWidget.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/UserFeedbackWidget.tsx) | `UserFeedbackWidget` | System pattern |
| [apps/web/src/components/system/WorkspacePageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/WorkspacePageHeader.tsx) | `WorkspacePageHeader` | System pattern |
| [apps/web/src/components/system/surfaces/PanelSurfaces.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx) | `GlassPanel`, `SolidPanel`, `ToolbarSurface`, `WorkspacePane` | System pattern |
| [apps/web/src/components/theme-provider.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/theme-provider.tsx) | `ThemeProvider` | Domain / feature |
| [apps/web/src/components/ui/accordion.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx) | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Primitive |
| [apps/web/src/components/ui/alert-dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx) | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` | Primitive |
| [apps/web/src/components/ui/alert.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx) | `Alert`, `AlertTitle`, `AlertDescription` | Primitive |
| [apps/web/src/components/ui/aspect-ratio.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/aspect-ratio.tsx) | `AspectRatio` | Primitive |
| [apps/web/src/components/ui/avatar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx) | `Avatar`, `AvatarImage`, `AvatarFallback` | Primitive |
| [apps/web/src/components/ui/badge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/badge.tsx) | `Badge` | Primitive |
| [apps/web/src/components/ui/breadcrumb.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx) | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` | Primitive |
| [apps/web/src/components/ui/button.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/button.tsx) | `Button` | Primitive |
| [apps/web/src/components/ui/calendar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/calendar.tsx) | `Calendar` | Primitive |
| [apps/web/src/components/ui/card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Primitive |
| [apps/web/src/components/ui/carousel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx) | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` | Primitive |
| [apps/web/src/components/ui/chart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx) | `ChartContainer`, `ChartStyle`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent` | Primitive |
| [apps/web/src/components/ui/checkbox.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/checkbox.tsx) | `Checkbox` | Primitive |
| [apps/web/src/components/ui/collapsible.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx) | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Primitive |
| [apps/web/src/components/ui/command.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx) | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandSeparator`, `CommandItem`, `CommandShortcut` | Primitive |
| [apps/web/src/components/ui/context-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx) | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuRadioGroup`, `ContextMenuSubTrigger`, `ContextMenuSubContent`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut` | Primitive |
| [apps/web/src/components/ui/demo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/demo.tsx) | `DemoOne` | Primitive |
| [apps/web/src/components/ui/dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx) | `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` | Primitive |
| [apps/web/src/components/ui/drawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx) | `Drawer`, `DrawerTrigger`, `DrawerPortal`, `DrawerClose`, `DrawerOverlay`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription` | Primitive |
| [apps/web/src/components/ui/dropdown-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx) | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuRadioGroup`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut` | Primitive |
| [apps/web/src/components/ui/form-field.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form-field.tsx) | `FormField` | Primitive |
| [apps/web/src/components/ui/form.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx) | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` | Primitive |
| [apps/web/src/components/ui/hover-card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx) | `HoverCard`, `HoverCardTrigger`, `HoverCardContent` | Primitive |
| [apps/web/src/components/ui/input-otp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx) | `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator` | Primitive |
| [apps/web/src/components/ui/input.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input.tsx) | `Input` | Primitive |
| [apps/web/src/components/ui/label.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/label.tsx) | `Label` | Primitive |
| [apps/web/src/components/ui/menubar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx) | `MenubarMenu`, `MenubarGroup`, `MenubarPortal`, `MenubarSub`, `MenubarRadioGroup`, `Menubar`, `MenubarTrigger`, `MenubarSubTrigger`, `MenubarSubContent`, `MenubarContent`, `MenubarItem`, `MenubarCheckboxItem`, `MenubarRadioItem`, `MenubarLabel`, `MenubarSeparator`, `MenubarShortcut` | Primitive |
| [apps/web/src/components/ui/navigation-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx) | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`, `NavigationMenuViewport`, `NavigationMenuIndicator` | Primitive |
| [apps/web/src/components/ui/pagination.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx) | `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis` | Primitive |
| [apps/web/src/components/ui/popover.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx) | `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent` | Primitive |
| [apps/web/src/components/ui/progress.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/progress.tsx) | `Progress` | Primitive |
| [apps/web/src/components/ui/radio-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/radio-group.tsx) | `RadioGroup`, `RadioGroupItem` | Primitive |
| [apps/web/src/components/ui/resizable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx) | `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` | Primitive |
| [apps/web/src/components/ui/scroll-area.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/scroll-area.tsx) | `ScrollArea`, `ScrollBar` | Primitive |
| [apps/web/src/components/ui/select.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx) | `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectScrollUpButton`, `SelectScrollDownButton`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator` | Primitive |
| [apps/web/src/components/ui/separator.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/separator.tsx) | `Separator` | Primitive |
| [apps/web/src/components/ui/sheet.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx) | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` | Primitive |
| [apps/web/src/components/ui/sidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx) | `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `SidebarRail`, `SidebarInset`, `SidebarInput`, `SidebarHeader`, `SidebarFooter`, `SidebarSeparator`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` | Primitive |
| [apps/web/src/components/ui/skeleton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/skeleton.tsx) | `Skeleton` | Primitive |
| [apps/web/src/components/ui/slider.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/slider.tsx) | `Slider` | Primitive |
| [apps/web/src/components/ui/sonner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sonner.tsx) | `Toaster` | Primitive |
| [apps/web/src/components/ui/switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/switch.tsx) | `Switch` | Primitive |
| [apps/web/src/components/ui/table.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx) | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | Primitive |
| [apps/web/src/components/ui/tabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx) | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Primitive |
| [apps/web/src/components/ui/textarea.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/textarea.tsx) | `Textarea` | Primitive |
| [apps/web/src/components/ui/theme-switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/theme-switch.tsx) | `ThemeSwitch` | Primitive |
| [apps/web/src/components/ui/toast.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx) | `ToastProvider`, `ToastViewport`, `Toast`, `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription` | Primitive |
| [apps/web/src/components/ui/toaster.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toaster.tsx) | `Toaster` | Primitive |
| [apps/web/src/components/ui/toggle-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle-group.tsx) | `ToggleGroup`, `ToggleGroupItem` | Primitive |
| [apps/web/src/components/ui/toggle.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle.tsx) | `Toggle` | Primitive |
| [apps/web/src/components/ui/tooltip.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx) | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` | Primitive |
| [apps/web/src/components/workspace/TabContentHost.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/TabContentHost.tsx) | `TabContentHost` | Domain / feature |
| [apps/web/src/components/workspace/WorkspaceTabBar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/WorkspaceTabBar.tsx) | `WorkspaceTabBar` | Domain / feature |
| [apps/web/src/features/primeweb/Editor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Editor.tsx) | `Editor` | Domain / feature |
| [apps/web/src/features/primeweb/Management.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx) | `Websites`, `CreateWebsite`, `Overview`, `PagesContent`, `Storefront`, `Domains`, `SeoAnalytics`, `WebsiteSettings` | Domain / feature |
| [apps/web/src/features/primeweb/PrimeWebWorkspace.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/PrimeWebWorkspace.tsx) | `PrimeWebWorkspace` | Domain / feature |
| [apps/web/src/features/primeweb/StorefrontPreview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/StorefrontPreview.tsx) | `StorefrontPreview` | Domain / feature |
| [apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx) | `EditorSidebar` | Domain / feature |
| [apps/web/src/features/primeweb/ui.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx) | `Action`, `Panel`, `Field`, `Pill`, `Heading`, `MainLink`, `Modal` | Domain / feature |

## apps/admin/src/App.tsx

Nguồn: [apps/admin/src/App.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/admin/src/App.tsx)

### LoginScreen (nội bộ admin)

[apps/admin/src/App.tsx:1994](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/admin/src/App.tsx#L1994)

```tsx
{
  busy,
  error,
  onLogin
}: {
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
}
```

### App

[apps/admin/src/App.tsx:2076](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/admin/src/App.tsx#L2076)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type ResourceKey =
  | 'intelligenceCreators'
  | 'intelligenceCustomers'
  | 'launchDecisions'
  | 'products'
  | 'listings'
  | 'inventoryBrain'
  | 'warehouses'
  | 'omsOrders'
  | 'fulfillmentControl'
  | 'policies'
  | 'eventAudit'
  | 'campaignOps'
  | 'contentCreatorOps'
  | 'leadResponseCapture'
  | 'retargetingOutreach'
  | 'capitalReadiness'
  | 'capitalOffers'
  | 'riskTrust'
  | 'settlementRepayment'
  | 'financePortfolio'
  | 'crmCompact'
  | 'serviceDesk'
  | 'admins'
  | 'users';

type ViewerRole = 'admin' | 'user';

type ResourceGroupKey = 'intelligence' | 'ecom' | 'crm' | 'finance' | 'customer' | 'identity';

type FieldType = 'text' | 'email' | 'number' | 'select' | 'textarea' | 'boolean' | 'image';

type SortMode = 'updated' | 'title' | 'status';

type AdminValue = string | number | boolean | undefined;

type AdminRecord = Record<string, AdminValue> & { id?: string };

interface FieldOption {
  label: string;
  value: string;
}

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: number;
  options?: FieldOption[];
}

interface ResourceConfig {
  group: ResourceGroupKey;
  label: string;
  singular: string;
  description: string;
  tableTitle: string;
  strategy: string;
  evidence: string[];
  statusKey?: string;
  createDefault: () => AdminRecord;
  fields: FieldConfig[];
  toTitle: (record: AdminRecord) => string;
  toMeta: (record: AdminRecord) => string;
  columns: Array<{ key: string; label: string }>;
}

interface AuthAccount {
  id: string;
  role: ViewerRole;
  fullName: string;
  email: string;
  workspace?: string;
  seatType?: string;
}

interface SessionResponse {
  role: ViewerRole;
  roleLabel: string;
  description: string;
  canReset: boolean;
  canWrite: boolean;
  visibleResources: ResourceKey[];
  writableResources: ResourceKey[];
  hiddenResources: ResourceKey[];
  resourcePermissions: Record<ResourceKey, { read: boolean; write: boolean }>;
  account: AuthAccount | null;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  session: SessionResponse;
}

interface MetaResponse {
  resourceCounts: Partial<Record<ResourceKey, number>>;
  totalVisibleRecords: number;
  adminCount: number;
  userCount: number;
  writableResourceCount: number;
  updatedAt: string;
}

interface ResourceGroup {
  key: ResourceGroupKey;
  label: string;
  description: string;
  resources: ResourceKey[];
}

type LanguageCode = (typeof languageOptions)[number]['code'];
```

## apps/web/src/components/channels/ChannelLogo.tsx

Nguồn: [apps/web/src/components/channels/ChannelLogo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ChannelLogo.tsx)

### ChannelLogo

[apps/web/src/components/channels/ChannelLogo.tsx:4](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ChannelLogo.tsx#L4)

```tsx
{ channel, size = 'md', muted = false }: { channel: { key: string; label?: string }; size?: 'sm' | 'md' | 'lg'; muted?: boolean }
```

## apps/web/src/components/channels/ConnectStoreWizardModal.tsx

Nguồn: [apps/web/src/components/channels/ConnectStoreWizardModal.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ConnectStoreWizardModal.tsx)

### ConnectStoreWizardModal

[apps/web/src/components/channels/ConnectStoreWizardModal.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ConnectStoreWizardModal.tsx#L18)

```tsx
{ open, onOpenChange, onConnected }: { open: boolean; onOpenChange: (open: boolean) => void; onConnected: (channel: ConnectedChannelRecord) => void }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type WizardStep = 'CHANNEL_SELECTION' | 'AUTHORIZATION' | 'WAREHOUSE_MAPPING' | 'CATALOG_STRATEGY';
```

## apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx

Nguồn: [apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx)

### ShopDefaultWarehouseForm

[apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ShopDefaultWarehouseForm.tsx#L9)

```tsx
{ shop, shops, target, onSaved, onBusyChange, onReload }: {
  shop: ConnectedChannelRecord; shops: ConnectedChannelRecord[]; target?: ChannelWarehouse;
  onSaved?: (shop: ConnectedChannelRecord) => void; onBusyChange?: (busy: boolean) => void; onReload: () => void;
}
```

## apps/web/src/components/channels/Step1ChannelCatalog.tsx

Nguồn: [apps/web/src/components/channels/Step1ChannelCatalog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step1ChannelCatalog.tsx)

### Step1ChannelCatalog

[apps/web/src/components/channels/Step1ChannelCatalog.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step1ChannelCatalog.tsx#L8)

```tsx
{ platforms, query, category, onQueryChange, onCategoryChange, onSelect }: { platforms: AvailablePlatform[]; query: string; category: 'All' | ChannelCategory; onQueryChange: (value: string) => void; onCategoryChange: (value: 'All' | ChannelCategory) => void; onSelect: (platform: AvailablePlatform) => void }
```

## apps/web/src/components/channels/Step2StoreAuth.tsx

Nguồn: [apps/web/src/components/channels/Step2StoreAuth.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step2StoreAuth.tsx)

### Step2StoreAuth

[apps/web/src/components/channels/Step2StoreAuth.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step2StoreAuth.tsx#L7)

```tsx
{ platform, storeName, region, authorizing, error, onStoreNameChange, onRegionChange, onAuthorize }: { platform: AvailablePlatform; storeName: string; region: string; authorizing: boolean; error: string; onStoreNameChange: (value: string) => void; onRegionChange: (value: string) => void; onAuthorize: () => void }
```

## apps/web/src/components/channels/Step3WarehouseConfig.tsx

Nguồn: [apps/web/src/components/channels/Step3WarehouseConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step3WarehouseConfig.tsx)

### Step3WarehouseConfig

[apps/web/src/components/channels/Step3WarehouseConfig.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step3WarehouseConfig.tsx#L7)

```tsx
{ warehouses, warehouseId, services, pickup, returns, onWarehouseChange, onServiceChange, onPickupChange, onReturnChange }: { warehouses: ChannelWarehouse[]; warehouseId: string; services: { price: boolean; stock: boolean; orders: boolean }; pickup: boolean; returns: boolean; onWarehouseChange: (value: string) => void; onServiceChange: (key: 'price' | 'stock' | 'orders', value: boolean) => void; onPickupChange: (value: boolean) => void; onReturnChange: (value: boolean) => void }
```

## apps/web/src/components/channels/Step4CatalogSync.tsx

Nguồn: [apps/web/src/components/channels/Step4CatalogSync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step4CatalogSync.tsx)

### Step4CatalogSync

[apps/web/src/components/channels/Step4CatalogSync.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/Step4CatalogSync.tsx#L7)

```tsx
{ value, onChange }: { value: CatalogStrategy; onChange: (value: CatalogStrategy) => void }
```

## apps/web/src/components/common/LanguageToggle.tsx

Nguồn: [apps/web/src/components/common/LanguageToggle.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/common/LanguageToggle.tsx)

### LanguageToggle

[apps/web/src/components/common/LanguageToggle.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/common/LanguageToggle.tsx#L15)

```tsx
{ className, compact = false }: LanguageToggleProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface LanguageToggleProps {
    className?: string;
    compact?: boolean;
}
```

## apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx

Nguồn: [apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx)

### ConfigureChannelDrawer

[apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConfigureChannelDrawer.tsx#L16)

```tsx
{ channel, onClose, onChanged }: ConfigureChannelDrawerProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ConfigureChannelDrawerProps {
  channel: Channel | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}
```

## apps/web/src/components/conversation-channels/ConnectConversationModal.tsx

Nguồn: [apps/web/src/components/conversation-channels/ConnectConversationModal.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConnectConversationModal.tsx)

### ConnectConversationModal

[apps/web/src/components/conversation-channels/ConnectConversationModal.tsx:47](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/ConnectConversationModal.tsx#L47)

```tsx
{ open, onOpenChange, onLinked }: ConnectConversationModalProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type StandaloneSource = (typeof standaloneSources)[number];

type ConnectionMode = 'QUICK_LINK' | 'STANDALONE_OAUTH';

interface ConnectConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => Promise<void> | void;
}
```

## apps/web/src/components/conversation-channels/Step1SelectSource.tsx

Nguồn: [apps/web/src/components/conversation-channels/Step1SelectSource.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step1SelectSource.tsx)

### SourceIcon

[apps/web/src/components/conversation-channels/Step1SelectSource.tsx:2](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step1SelectSource.tsx#L2)

```tsx
{label,tone='indigo'}:{label:string;tone?:string}
```

### Step1SelectSource

[apps/web/src/components/conversation-channels/Step1SelectSource.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step1SelectSource.tsx#L3)

```tsx
{stores,loading,onQuick,onStandalone}:{stores:QuickStore[];loading:boolean;onQuick:(s:QuickStore)=>void;onStandalone:(p:typeof standaloneSources[number])=>void}
```

## apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx

Nguồn: [apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx)

### Step2RoutingConfig

[apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step2RoutingConfig.tsx#L3)

```tsx
{value,onChange}:{value:RoutingForm;onChange:(v:RoutingForm)=>void}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface RoutingForm{display_name:string;strategy:Strategy;target_team_id:string;sla_minutes:number}
```

## apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx

Nguồn: [apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx)

### Step3AutomationConfig

[apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/conversation-channels/Step3AutomationConfig.tsx#L3)

```tsx
{value,onChange}:{value:AutomationForm;onChange:(v:AutomationForm)=>void}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface AutomationForm{enable_welcome_msg:boolean;welcome_template:string;enable_ai_copilot:boolean;enable_ai_order_lookup:boolean}
```

## apps/web/src/components/copilot/GlobalCopilotActions.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotActions.tsx)

### GlobalCopilotActions

[apps/web/src/components/copilot/GlobalCopilotActions.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotActions.tsx#L13)

```tsx
{ actions }: GlobalCopilotActionsProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotActionsProps {
  actions: GlobalCopilotAction[];
}
```

## apps/web/src/components/copilot/GlobalCopilotChatThread.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotChatThread.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotChatThread.tsx)

### GlobalCopilotChatThread

[apps/web/src/components/copilot/GlobalCopilotChatThread.tsx:112](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotChatThread.tsx#L112)

```tsx
{
  messages,
  isProcessing,
  onPromptSelect,
  disabled,
}: GlobalCopilotChatThreadProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotChatThreadProps {
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
}
```

## apps/web/src/components/copilot/GlobalCopilotComposer.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotComposer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotComposer.tsx)

### GlobalCopilotComposer

[apps/web/src/components/copilot/GlobalCopilotComposer.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotComposer.tsx#L11)

```tsx
{
  onSend,
  disabled,
}: GlobalCopilotComposerProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}
```

## apps/web/src/components/copilot/GlobalCopilotDrawer.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotDrawer.tsx)

### GlobalCopilotDrawer

[apps/web/src/components/copilot/GlobalCopilotDrawer.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotDrawer.tsx#L19)

```tsx
{
  open,
  onOpenChange,
  context,
  messages,
  isProcessing,
  quickPrompts,
  telemetry,
  onPromptSelect,
  onSend,
  onClear,
  onExpand,
}: GlobalCopilotDrawerProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CopilotContextSummary;
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  quickPrompts: CopilotQuickPrompt[];
  telemetry?: CopilotTelemetry;
  onPromptSelect: (prompt: string) => void;
  onSend: (message: string) => void;
  onClear: () => void;
  onExpand: () => void;
}
```

## apps/web/src/components/copilot/GlobalCopilotFAB.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotFAB.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotFAB.tsx)

### GlobalCopilotFAB

[apps/web/src/components/copilot/GlobalCopilotFAB.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotFAB.tsx#L11)

```tsx
{ onClick, isOpen = false, label = 'Prime AI' }: GlobalCopilotFABProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotFABProps {
  onClick: () => void;
  isOpen?: boolean;
  label?: string;
}
```

## apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx)

### GlobalCopilotQuickPrompts

[apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotQuickPrompts.tsx#L9)

```tsx
{ prompts, onSelect, disabled }: GlobalCopilotQuickPromptsProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotQuickPromptsProps {
  prompts: Array<{ label: string; prompt: string }>;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}
```

## apps/web/src/components/copilot/GlobalCopilotSurface.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotSurface.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotSurface.tsx)

### GlobalCopilotSurface

[apps/web/src/components/copilot/GlobalCopilotSurface.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotSurface.tsx#L20)

```tsx
{
  context,
  messages,
  isProcessing,
  quickPrompts,
  telemetry,
  onPromptSelect,
  onSend,
  onClose,
  onExpand,
}: GlobalCopilotSurfaceProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotSurfaceProps {
  context: CopilotContextSummary;
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  quickPrompts: CopilotQuickPrompt[];
  telemetry?: CopilotTelemetry;
  onPromptSelect: (prompt: string) => void;
  onSend: (message: string) => void;
  onClose: () => void;
  onExpand?: () => void;
}
```

## apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx

Nguồn: [apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx)

### GlobalCopilotWorkspace

[apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/copilot/GlobalCopilotWorkspace.tsx#L12)

```tsx
{ children }: GlobalCopilotWorkspaceProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface GlobalCopilotWorkspaceProps {
  children: React.ReactNode;
}
```

## apps/web/src/components/dashboard/AlertsFeed.tsx

Nguồn: [apps/web/src/components/dashboard/AlertsFeed.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/AlertsFeed.tsx)

### AlertsFeed

[apps/web/src/components/dashboard/AlertsFeed.tsx:25](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/AlertsFeed.tsx#L25)

```tsx
{ alerts, maxItems, loading = false }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface Props {
    alerts: ControlTowerAlert[];
    maxItems?: number;
    loading?: boolean;
}
```

## apps/web/src/components/dashboard/ControlTowerKpiRow.tsx

Nguồn: [apps/web/src/components/dashboard/ControlTowerKpiRow.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/ControlTowerKpiRow.tsx)

### ControlTowerKpiCard

[apps/web/src/components/dashboard/ControlTowerKpiRow.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/ControlTowerKpiRow.tsx#L17)

```tsx
{ title, value, secondaryValue, zeroStateLabel, trend, icon, linkTo }: KpiProps
```

### ControlTowerKpiRow

[apps/web/src/components/dashboard/ControlTowerKpiRow.tsx:61](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/ControlTowerKpiRow.tsx#L61)

```tsx
{ children }: { children: ReactNode }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface KpiProps {
    title: string;
    value: string | number;
    secondaryValue?: string;
    zeroStateLabel?: string;
    trend?: { value: number; label: string };
    icon: ReactNode;
    linkTo?: string;
}
```

## apps/web/src/components/dashboard/DashboardSkeleton.tsx

Nguồn: [apps/web/src/components/dashboard/DashboardSkeleton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/DashboardSkeleton.tsx)

### DashboardSkeleton

[apps/web/src/components/dashboard/DashboardSkeleton.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/DashboardSkeleton.tsx#L5)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/dashboard/HealthCard.tsx

Nguồn: [apps/web/src/components/dashboard/HealthCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/HealthCard.tsx)

### HealthCard

[apps/web/src/components/dashboard/HealthCard.tsx:22](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/HealthCard.tsx#L22)

```tsx
{ title, description, metrics, linkTo, linkText, children }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface HealthMetric {
    label: string;
    value: string | number;
    subtext?: string;
    status?: "ok" | "warning" | "critical";
}

interface Props {
    title: string;
    description?: string;
    metrics: HealthMetric[];
    linkTo: string;
    linkText?: string;
    children?: React.ReactNode;
}
```

## apps/web/src/components/dashboard/KPICard.tsx

Nguồn: [apps/web/src/components/dashboard/KPICard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/KPICard.tsx)

### KPICard

[apps/web/src/components/dashboard/KPICard.tsx:45](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/KPICard.tsx#L45)

```tsx
{ 
  title, 
  value, 
  delta, 
  sparkline = [], 
  format = 'number',
  onClick,
  icon,
}: KPICardProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  sparkline?: number[];
  format?: 'number' | 'currency' | 'percent';
  onClick?: () => void;
  icon?: React.ReactNode;
}
```

## apps/web/src/components/dashboard/PerformanceCharts.tsx

Nguồn: [apps/web/src/components/dashboard/PerformanceCharts.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PerformanceCharts.tsx)

### PerformanceCharts

[apps/web/src/components/dashboard/PerformanceCharts.tsx:53](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PerformanceCharts.tsx#L53)

```tsx
{
  ordersByStatus,
  salesByChannel,
  ordersByWarehouse,
  lowStockByWarehouse,
  loading,
}: PerformanceChartsProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface BreakdownItem {
  label: string;
  value: number;
}

interface PerformanceChartsProps {
  ordersByStatus: BreakdownItem[];
  salesByChannel: BreakdownItem[];
  ordersByWarehouse: BreakdownItem[];
  lowStockByWarehouse: BreakdownItem[];
  loading?: boolean;
}
```

## apps/web/src/components/dashboard/PipelineCard.tsx

Nguồn: [apps/web/src/components/dashboard/PipelineCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PipelineCard.tsx)

### PipelineCard

[apps/web/src/components/dashboard/PipelineCard.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/dashboard/PipelineCard.tsx#L18)

```tsx
{ title, stages, linkTo }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PipelineStage {
    label: string;
    count: number;
    colorClass: string;
}

interface Props {
    title: string;
    stages: PipelineStage[];
    linkTo: string;
}
```

## apps/web/src/components/fulfillment/CreateShipmentDialog.tsx

Nguồn: [apps/web/src/components/fulfillment/CreateShipmentDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/CreateShipmentDialog.tsx)

### CreateShipmentDialog

[apps/web/src/components/fulfillment/CreateShipmentDialog.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/CreateShipmentDialog.tsx#L24)

```tsx
{ open, onOpenChange, onSubmit, isLoading }: CreateShipmentDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { carrierCode: string; trackingNumber?: string; serviceLevel?: string }) => void;
  isLoading?: boolean;
}
```

## apps/web/src/components/fulfillment/DispositionDialog.tsx

Nguồn: [apps/web/src/components/fulfillment/DispositionDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/DispositionDialog.tsx)

### DispositionDialog

[apps/web/src/components/fulfillment/DispositionDialog.tsx:25](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/DispositionDialog.tsx#L25)

```tsx
{ open, onOpenChange, item, onSubmit, isLoading }: DispositionDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface DispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReturnItem;
  onSubmit: (data: { disposition: Disposition; reason?: string }) => Promise<void>;
  isLoading?: boolean;
}
```

## apps/web/src/components/fulfillment/ExceptionDialog.tsx

Nguồn: [apps/web/src/components/fulfillment/ExceptionDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ExceptionDialog.tsx)

### ExceptionDialog

[apps/web/src/components/fulfillment/ExceptionDialog.tsx:30](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ExceptionDialog.tsx#L30)

```tsx
{ open, onOpenChange, onSubmit, isLoading }: ExceptionDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; severity: string; note?: string }) => Promise<void>;
  isLoading?: boolean;
}
```

## apps/web/src/components/fulfillment/FbaInventorySync.tsx

Nguồn: [apps/web/src/components/fulfillment/FbaInventorySync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaInventorySync.tsx)

### FbaInventorySync

[apps/web/src/components/fulfillment/FbaInventorySync.tsx:76](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaInventorySync.tsx#L76)

```tsx
{
  records,
  onSync,
  onDisconnect,
  isSyncing = false,
  lastSyncAt,
  amazonConfigStatus = 'disconnected',
  errorMessage,
}: FbaInventorySyncProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface FbaInventoryRecord {
  sku: string;
  fnsku: string;
  asin: string;
  localAts: number;
  fbaQuantity: number;
  fbaFulfillable: number;
  fbaInboundWorking: number;
  fbaInboundShipped: number;
  fbaInboundReceiving: number;
  lastUpdated: string;
  syncedAt: string | null;
}

interface FbaInventorySyncProps {
  records: FbaInventoryRecord[];
  onSync: () => Promise<void>;
  onDisconnect?: () => void;
  isSyncing?: boolean;
  lastSyncAt?: string | null;
  amazonConfigStatus?: 'connected' | 'disconnected' | 'pending_setup';
  errorMessage?: string | null;
}
```

## apps/web/src/components/fulfillment/FbaShipmentPanel.tsx

Nguồn: [apps/web/src/components/fulfillment/FbaShipmentPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaShipmentPanel.tsx)

### FbaShipmentPanel

[apps/web/src/components/fulfillment/FbaShipmentPanel.tsx:63](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FbaShipmentPanel.tsx#L63)

```tsx
{
  job,
  isReadOnly = false,
  onUpdatePrepStatus,
  onSyncShipment,
  onConfirmShipment,
  isSyncing = false,
  isUpdating = false,
}: FbaShipmentPanelProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface FbaShipmentPanelProps {
  job: FulfillmentJob;
  isReadOnly?: boolean;
  onUpdatePrepStatus?: (status: FbaPrepStatus) => void;
  onSyncShipment?: () => void;
  onConfirmShipment?: (fulfillmentCenterId: string) => void;
  isSyncing?: boolean;
  isUpdating?: boolean;
}
```

## apps/web/src/components/fulfillment/FlowTypeBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/FlowTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FlowTypeBadge.tsx)

### FlowTypeBadge

[apps/web/src/components/fulfillment/FlowTypeBadge.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FlowTypeBadge.tsx#L16)

```tsx
{ flowType, className }: FlowTypeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface FlowTypeBadgeProps {
  flowType: FlowType | string;
  className?: string;
}
```

## apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx

Nguồn: [apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx)

### FulfillmentJobsTable

[apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentJobsTable.tsx#L17)

```tsx
{ jobs, isLoading }: FulfillmentJobsTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface FulfillmentJobsTableProps {
  jobs: FulfillmentJob[];
  isLoading: boolean;
}
```

## apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx

Nguồn: [apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx)

### FulfillmentWorkflowTimeline

[apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx:55](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/FulfillmentWorkflowTimeline.tsx#L55)

```tsx
{ job }: FulfillmentWorkflowTimelineProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type WorkflowStep = (typeof FULFILLMENT_STEPS)[number];

type StepVisualState = 'done' | 'active' | 'pending';

interface FulfillmentWorkflowTimelineProps {
  job: FulfillmentJob;
}
```

## apps/web/src/components/fulfillment/JobStatusBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/JobStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/JobStatusBadge.tsx)

### JobStatusBadge

[apps/web/src/components/fulfillment/JobStatusBadge.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/JobStatusBadge.tsx#L11)

```tsx
{ status, className }: JobStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface JobStatusBadgeProps {
  status: JobStatus | string;
  className?: string;
}
```

## apps/web/src/components/fulfillment/PartnerStatusBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/PartnerStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerStatusBadge.tsx)

### PartnerStatusBadge

[apps/web/src/components/fulfillment/PartnerStatusBadge.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerStatusBadge.tsx#L11)

```tsx
{ status, className }: PartnerStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PartnerStatusBadgeProps {
  status: PartnerStatus;
  className?: string;
}
```

## apps/web/src/components/fulfillment/PartnerTypeBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/PartnerTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerTypeBadge.tsx)

### PartnerTypeBadge

[apps/web/src/components/fulfillment/PartnerTypeBadge.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnerTypeBadge.tsx#L16)

```tsx
{ type, className }: PartnerTypeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PartnerTypeBadgeProps {
  type: PartnerType;
  className?: string;
}
```

## apps/web/src/components/fulfillment/PartnersTable.tsx

Nguồn: [apps/web/src/components/fulfillment/PartnersTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnersTable.tsx)

### PartnersTable

[apps/web/src/components/fulfillment/PartnersTable.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/PartnersTable.tsx#L16)

```tsx
{ partners, isLoading }: PartnersTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PartnersTableProps {
  partners: FulfillmentPartner[];
  isLoading: boolean;
}
```

## apps/web/src/components/fulfillment/QCDialog.tsx

Nguồn: [apps/web/src/components/fulfillment/QCDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/QCDialog.tsx)

### QCDialog

[apps/web/src/components/fulfillment/QCDialog.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/QCDialog.tsx#L24)

```tsx
{ open, onOpenChange, item, onSubmit, isLoading }: QCDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface QCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReturnItem;
  onSubmit: (data: { grade: string; outcome: 'pass' | 'fail'; notes?: string }) => Promise<void>;
  isLoading?: boolean;
}
```

## apps/web/src/components/fulfillment/ReturnReviewQueue.tsx

Nguồn: [apps/web/src/components/fulfillment/ReturnReviewQueue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnReviewQueue.tsx)

### ReturnReviewQueue

[apps/web/src/components/fulfillment/ReturnReviewQueue.tsx:28](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnReviewQueue.tsx#L28)

```tsx
{
  items,
  selectedItemId,
  filter,
  stats,
  onFilterChange,
  onSelect,
}: ReturnReviewQueueProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReturnReviewQueueProps {
  items: ReturnItem[];
  selectedItemId: string | null;
  filter: ReturnQueueFilter;
  stats: ReturnReviewStats;
  onFilterChange: (filter: ReturnQueueFilter) => void;
  onSelect: (itemId: string) => void;
}
```

## apps/web/src/components/fulfillment/ReturnStatusBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/ReturnStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusBadge.tsx)

### ReturnStatusBadge

[apps/web/src/components/fulfillment/ReturnStatusBadge.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusBadge.tsx#L10)

```tsx
{ status, className }: ReturnStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReturnStatusBadgeProps {
  status: string;
  className?: string;
}
```

## apps/web/src/components/fulfillment/ReturnStatusStepper.tsx

Nguồn: [apps/web/src/components/fulfillment/ReturnStatusStepper.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusStepper.tsx)

### ReturnStatusStepper

[apps/web/src/components/fulfillment/ReturnStatusStepper.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnStatusStepper.tsx#L23)

```tsx
{ currentStatus, className }: ReturnStatusStepperProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReturnStatusStepperProps {
  currentStatus: ReturnStatus;
  className?: string;
}
```

## apps/web/src/components/fulfillment/ReturnsTable.tsx

Nguồn: [apps/web/src/components/fulfillment/ReturnsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnsTable.tsx)

### ReturnsTable

[apps/web/src/components/fulfillment/ReturnsTable.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ReturnsTable.tsx#L16)

```tsx
{ returns, isLoading }: ReturnsTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReturnsTableProps {
  returns: Return[];
  isLoading: boolean;
}
```

## apps/web/src/components/fulfillment/ShipmentPanel.tsx

Nguồn: [apps/web/src/components/fulfillment/ShipmentPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentPanel.tsx)

### ShipmentPanel

[apps/web/src/components/fulfillment/ShipmentPanel.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentPanel.tsx#L24)

```tsx
{
  shipments,
  isReadOnly,
  onCreateShipment,
  onMarkShipped,
  isCreating,
  isShipping,
}: ShipmentPanelProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ShipmentPanelProps {
  shipments: Shipment[];
  isReadOnly: boolean;
  onCreateShipment: (data: { carrierCode: string; trackingNumber?: string; serviceLevel?: string }) => void;
  onMarkShipped: (shipmentId: string, trackingNumber?: string) => void;
  isCreating?: boolean;
  isShipping?: boolean;
}
```

## apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx

Nguồn: [apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx)

### ShipmentStatusBadge

[apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/ShipmentStatusBadge.tsx#L11)

```tsx
{ status, className }: ShipmentStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ShipmentStatusBadgeProps {
  status: ShipmentStatus | string;
  className?: string;
}
```

## apps/web/src/components/fulfillment/TrackingTimeline.tsx

Nguồn: [apps/web/src/components/fulfillment/TrackingTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/TrackingTimeline.tsx)

### TrackingTimeline

[apps/web/src/components/fulfillment/TrackingTimeline.tsx:43](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/fulfillment/TrackingTimeline.tsx#L43)

```tsx
{
  events,
  isReadOnly,
  onAddEvent,
  isAdding,
  hasShipment,
  isShipmentDispatched,
  shipmentStatus,
  trackingNumber,
  onOpenShipmentStep,
}: TrackingTimelineProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface TrackingTimelineProps {
  events: TrackingEvent[];
  isReadOnly: boolean;
  onAddEvent: (eventCode: string, eventMessage: string) => void;
  isAdding?: boolean;
  hasShipment: boolean;
  isShipmentDispatched: boolean;
  shipmentStatus?: ShipmentStatus | null;
  trackingNumber?: string | null;
  onOpenShipmentStep?: () => void;
}
```

## apps/web/src/components/inventory/ATSBucketChart.tsx

Nguồn: [apps/web/src/components/inventory/ATSBucketChart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSBucketChart.tsx)

### ATSBucketChart

[apps/web/src/components/inventory/ATSBucketChart.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSBucketChart.tsx#L15)

```tsx
{ warehouseId, topN = 15 }: ATSBucketChartProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ATSBucketChartProps {
  warehouseId?: string;
  topN?: number;
}
```

## apps/web/src/components/inventory/ATSHealthDonut.tsx

Nguồn: [apps/web/src/components/inventory/ATSHealthDonut.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSHealthDonut.tsx)

### ATSHealthDonut

[apps/web/src/components/inventory/ATSHealthDonut.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSHealthDonut.tsx#L15)

```tsx
{ warehouseId }: ATSHealthDonutProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ATSHealthDonutProps {
  warehouseId?: string;
}
```

## apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx

Nguồn: [apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx)

### AdjustWarehouseStockDialog

[apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustWarehouseStockDialog.tsx#L24)

```tsx
{ target, products, warehouses, onClose, onSaved, lockProduct = false, lockSku = false, initializeLocation: initialMode = false }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  target: Partial<StockAdjustmentTarget>;
  products: Product[];
  warehouses: StockLocation[];
  onClose: () => void;
  onSaved: (recordId: string) => void;
  lockProduct?: boolean;
  lockSku?: boolean;
  initializeLocation?: boolean;
};
```

## apps/web/src/components/inventory/AdjustmentTypeBadge.tsx

Nguồn: [apps/web/src/components/inventory/AdjustmentTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentTypeBadge.tsx)

### AdjustmentTypeBadge

[apps/web/src/components/inventory/AdjustmentTypeBadge.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentTypeBadge.tsx#L19)

```tsx
{ type, className }: AdjustmentTypeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type AdjustmentType = 'damage' | 'cycle_count' | 'return_restock' | 'expired' | 'transfer' | 'correction';

interface AdjustmentTypeBadgeProps {
  type: string;
  className?: string;
}
```

## apps/web/src/components/inventory/AdjustmentsTable.tsx

Nguồn: [apps/web/src/components/inventory/AdjustmentsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentsTable.tsx)

### AdjustmentsTable

[apps/web/src/components/inventory/AdjustmentsTable.tsx:45](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/AdjustmentsTable.tsx#L45)

```tsx
{ adjustments, isLoading }: AdjustmentsTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface InventoryAdjustment {
  id: string;
  adjustment_id: string | null; // Now optional (adjustment_code)
  sku_id: string | null;
  warehouse_id: string | null;
  qty_delta: number;
  fulfillment_method_name: string;
  adjustment_type: AdjustmentType;
  reason: string;
  note: string | null;
  created_by: string;
  created_at: string;
  status: string;
  // Joined data
  sku_code?: string;
  variation_name?: string;
  product_title?: string;
  product_id?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

interface AdjustmentsTableProps {
  adjustments: InventoryAdjustment[];
  isLoading?: boolean;
}
```

## apps/web/src/components/inventory/FulfillmentModeBadge.tsx

Nguồn: [apps/web/src/components/inventory/FulfillmentModeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/FulfillmentModeBadge.tsx)

### FulfillmentModeBadge

[apps/web/src/components/inventory/FulfillmentModeBadge.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/FulfillmentModeBadge.tsx#L15)

```tsx
{ mode, className }: FulfillmentModeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface FulfillmentModeBadgeProps {
  mode: string;
  className?: string;
}
```

## apps/web/src/components/inventory/InventoryStatusBadge.tsx

Nguồn: [apps/web/src/components/inventory/InventoryStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventoryStatusBadge.tsx)

### InventoryStatusBadge

[apps/web/src/components/inventory/InventoryStatusBadge.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventoryStatusBadge.tsx#L26)

```tsx
{ status, className }: InventoryStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type InventoryHealth = 'healthy' | 'low' | 'critical';

interface InventoryStatusBadgeProps {
  status: InventoryHealth | string;
  className?: string;
}
```

## apps/web/src/components/inventory/InventorySummaryTable.tsx

Nguồn: [apps/web/src/components/inventory/InventorySummaryTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventorySummaryTable.tsx)

### InventorySummaryTable

[apps/web/src/components/inventory/InventorySummaryTable.tsx:65](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/InventorySummaryTable.tsx#L65)

```tsx
{
  items,
  isLoading,
  totalCount,
}: InventorySummaryTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface InventoryPositionRow {
  id: string;
  product_name: string;
  variation_name: string | null;
  sku_code: string;
  variation_attributes: Record<string, string> | null;
  product_id: string;
  sku_id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  type: string;
  country: string;
  platform: string | null;
  available_qty: number;
  low_stock_threshold: number;
}

interface InventorySummaryTableProps {
  items: InventoryPositionRow[];
  isLoading?: boolean;
  totalCount: number;
}
```

## apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx

Nguồn: [apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx)

### LinkWarehouseShopsDrawer

[apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/LinkWarehouseShopsDrawer.tsx#L10)

```tsx
{ warehouse, onClose, onSaved }: { warehouse: StockLocation; onClose: () => void; onSaved?: () => void }
```

## apps/web/src/components/inventory/ManageStockHoldsDialog.tsx

Nguồn: [apps/web/src/components/inventory/ManageStockHoldsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ManageStockHoldsDialog.tsx)

### ManageStockHoldsButton

[apps/web/src/components/inventory/ManageStockHoldsDialog.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ManageStockHoldsDialog.tsx#L18)

```tsx
{ product, warehouseId, sku, value }: Target & { value?: StockValue }
```

### StockHoldHistory

[apps/web/src/components/inventory/ManageStockHoldsDialog.tsx:37](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ManageStockHoldsDialog.tsx#L37)

```tsx
{ productId, warehouseId, sku }: { productId?: string; warehouseId?: string; sku?: string }
```

### ManageStockHoldsDialog

[apps/web/src/components/inventory/ManageStockHoldsDialog.tsx:56](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ManageStockHoldsDialog.tsx#L56)

```tsx
{ product: initialProduct, products = getProducts(), warehouseId: initialWarehouseId, sku: initialSku, onClose, onSaved }: {
  product?: Product; products?: Product[]; warehouseId?: string; sku?: string; onClose: () => void; onSaved: (recordId: string) => void;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Target = { product: Product; warehouseId?: string; sku?: string };
```

## apps/web/src/components/inventory/MovementTypeBadge.tsx

Nguồn: [apps/web/src/components/inventory/MovementTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementTypeBadge.tsx)

### MovementTypeBadge

[apps/web/src/components/inventory/MovementTypeBadge.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementTypeBadge.tsx#L20)

```tsx
{ type, className }: MovementTypeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface MovementTypeBadgeProps {
  type: string;
  className?: string;
}
```

## apps/web/src/components/inventory/MovementsTable.tsx

Nguồn: [apps/web/src/components/inventory/MovementsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementsTable.tsx)

### MovementsTable

[apps/web/src/components/inventory/MovementsTable.tsx:59](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MovementsTable.tsx#L59)

```tsx
{ movements, isLoading, onBatchClick }: MovementsTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface InventoryMovement {
  id: string;
  created_at: string;
  fulfillment_method_name: string;
  sku: string;
  qty_change: number;
  movement_type: 'RESERVE' | 'SHIP' | 'RETURN' | 'ADJUST' | 'REPLENISH';
  source_type: 'ORDER' | 'RETURN' | 'ADJUSTMENT' | 'REPLENISHMENT' | 'MARKETPLACE_SYNC';
  source_ref: string | null;
  batch_id: string | null;
  balance_after: number | null;
}

interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  fulfillment_type_mapping: string | null;
}

interface MovementsTableProps {
  movements: InventoryMovement[];
  isLoading?: boolean;
  onBatchClick?: (batchId: string) => void;
}
```

## apps/web/src/components/inventory/MyWarehouses.tsx

Nguồn: [apps/web/src/components/inventory/MyWarehouses.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MyWarehouses.tsx)

### MyWarehouses

[apps/web/src/components/inventory/MyWarehouses.tsx:22](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/MyWarehouses.tsx#L22)

```tsx
{ warehouses, products, onAdjustStock, positions = getInventoryPositions(), initialSearch = '', warehouseId: controlledWarehouse, onSelectWarehouse, onAddStock, onLinkShops, onTransferStock }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Location = { id: string; name: string; code?: string; address?: string | null };

type Props = { warehouses: Location[]; products: Product[]; positions?: InventoryPosition[]; initialSearch?: string; onAdjustStock?: (target: StockAdjustmentTarget) => void; warehouseId?: string; onSelectWarehouse?: (id: string) => void; onAddStock?: (warehouse: StockLocation) => void; onLinkShops?: (warehouse: StockLocation) => void; onTransferStock?: (target: Partial<StockAdjustmentTarget>) => void };
```

## apps/web/src/components/inventory/ReservationLedger.tsx

Nguồn: [apps/web/src/components/inventory/ReservationLedger.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger.tsx)

### ReservationLedger

[apps/web/src/components/inventory/ReservationLedger.tsx:30](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger.tsx#L30)

```tsx
{ compact = false }: ReservationLedgerProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReservationLedgerProps {
  compact?: boolean;
}
```

## apps/web/src/components/inventory/ReservationLedger5State.tsx

Nguồn: [apps/web/src/components/inventory/ReservationLedger5State.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger5State.tsx)

### ReservationLedger5State

[apps/web/src/components/inventory/ReservationLedger5State.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ReservationLedger5State.tsx#L31)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/inventory/StockActivityDrawer.tsx

Nguồn: [apps/web/src/components/inventory/StockActivityDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockActivityDrawer.tsx)

### StockActivityDrawer

[apps/web/src/components/inventory/StockActivityDrawer.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockActivityDrawer.tsx#L20)

```tsx
{ open, onOpenChange, products, warehouses, onNewAction, recentId, onReceive, onPrepareDestination }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: StockLocation[];
  onNewAction: (action: StockActivityAction) => void;
  recentId?: string | null;
  onReceive?: (productId: string, recordId: string) => void;
  onPrepareDestination?: (productId: string, warehouseId: string, sku: string) => void;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type StockActivityAction = 'receipt' | 'transfer' | 'adjustment' | 'holds';
```

## apps/web/src/components/inventory/StockAvailability.tsx

Nguồn: [apps/web/src/components/inventory/StockAvailability.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx)

### InventoryAmount

[apps/web/src/components/inventory/StockAvailability.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx#L11)

```tsx
{ value, highlight = false }: { value: StockValue; highlight?: boolean }
```

### StockGuide

[apps/web/src/components/inventory/StockAvailability.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx#L17)

```tsx
{ iconOnly = false }: { iconOnly?: boolean }
```

### AvailabilityMetrics

[apps/web/src/components/inventory/StockAvailability.tsx:33](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx#L33)

```tsx
{ summary }: { summary: AvailabilitySummary }
```

### AvailabilityCoverage

[apps/web/src/components/inventory/StockAvailability.tsx:39](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx#L39)

```tsx
{ summary }: { summary: AvailabilitySummary }
```

### StockBreakdown

[apps/web/src/components/inventory/StockAvailability.tsx:54](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockAvailability.tsx#L54)

```tsx
{ title, summary, warehouses, onClose, mode = 'atp', onManageHolds }: { title: string; summary: AvailabilitySummary; warehouses: StockLocation[]; onClose: () => void; mode?: StockBreakdownMode; onManageHolds?: () => void }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type StockBreakdownMode = 'atp' | 'orders' | 'holds';
```

## apps/web/src/components/inventory/StockRowActions.tsx

Nguồn: [apps/web/src/components/inventory/StockRowActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockRowActions.tsx)

### StockRowActions

[apps/web/src/components/inventory/StockRowActions.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockRowActions.tsx#L6)

```tsx
{ label, onAdjust, onInitialize, onManage, onTransfer, onReceive, onSetup, readOnly = true }: {
  label: string;
  onAdjust?: () => void;
  onInitialize?: () => void;
  onManage?: () => void;
  onTransfer?: () => void;
  onReceive?: () => void;
  onSetup?: () => void;
  readOnly?: boolean;
}
```

## apps/web/src/components/inventory/StockTable.tsx

Nguồn: [apps/web/src/components/inventory/StockTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockTable.tsx)

### StockTable

[apps/web/src/components/inventory/StockTable.tsx:37](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/StockTable.tsx#L37)

```tsx
{ items, isLoading }: StockTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface StockItem {
  sku: string;
  warehouse_name: string;
  warehouse_code: string;
  quantity: number;
  reserved: number;
  in_transit: number;
  available: number;
  fulfillment_mode: 'auto' | 'fixed';
}

interface StockTableProps {
  items: StockItem[];
  isLoading?: boolean;
}
```

## apps/web/src/components/inventory/TransferStockDrawer.tsx

Nguồn: [apps/web/src/components/inventory/TransferStockDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/TransferStockDrawer.tsx)

### TransferStockDrawer

[apps/web/src/components/inventory/TransferStockDrawer.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/TransferStockDrawer.tsx#L14)

```tsx
{ products, target, onClose, onSaved }: { products: Product[]; target?: Partial<StockAdjustmentTarget>; onClose: () => void; onSaved: (id: string, inTransit: boolean) => void }
```

## apps/web/src/components/inventory/VirtualWarehouseBadge.tsx

Nguồn: [apps/web/src/components/inventory/VirtualWarehouseBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/VirtualWarehouseBadge.tsx)

### VirtualWarehouseBadge

[apps/web/src/components/inventory/VirtualWarehouseBadge.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/VirtualWarehouseBadge.tsx#L10)

```tsx
{ isVirtual, className }: VirtualWarehouseBadgeProps
```

### MarketplaceSyncBadge

[apps/web/src/components/inventory/VirtualWarehouseBadge.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/VirtualWarehouseBadge.tsx#L24)

```tsx
{ syncStatus, className }: MarketplaceSyncBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface VirtualWarehouseBadgeProps {
  isVirtual?: boolean;
  size?: string;
  showLabel?: boolean;
  className?: string;
}

interface MarketplaceSyncBadgeProps {
  syncStatus?: string | null;
  className?: string;
}
```

## apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx)

### WarehouseCapabilityBadges

[apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseCapabilityBadge.tsx#L31)

```tsx
{ capabilities, tags, className }: WarehouseCapabilityBadgesProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface WarehouseCapabilityBadgesProps {
  capabilities?: string[];
  tags?: string[];
  maxVisible?: number;
  className?: string;
}
```

## apps/web/src/components/inventory/WarehouseSelector.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseSelector.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSelector.tsx)

### WarehouseSelector

[apps/web/src/components/inventory/WarehouseSelector.tsx:72](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSelector.tsx#L72)

```tsx
{
  value,
  onChange,
  multiple = false,
  placeholder = 'Select warehouse',
  showTypeBadge = true,
  filterTypes,
  disabled = false,
  excludeTransit = false,
  className,
}: WarehouseSelectorProps
```

### WarehouseFilter

[apps/web/src/components/inventory/WarehouseSelector.tsx:241](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSelector.tsx#L241)

```tsx
{ value, onChange, className }: WarehouseFilterProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  status: string;
  tags?: string[];
  isVirtual?: boolean;
  adjustmentAllowed?: 'yes' | 'limited' | 'no';
}

interface WarehouseSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  showTypeBadge?: boolean;
  filterTypes?: ('own' | 'fba' | '3pl')[];
  disabled?: boolean;
  excludeTransit?: boolean;
  className?: string;
}

interface WarehouseFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}
```

## apps/web/src/components/inventory/WarehouseSetup.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseSetup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSetup.tsx)

### CreateWarehouseDrawer

[apps/web/src/components/inventory/WarehouseSetup.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSetup.tsx#L12)

```tsx
{ onClose, onCreated }: { onClose: () => void; onCreated: (warehouse: Warehouse) => void }
```

### AddWarehouseStockDrawer

[apps/web/src/components/inventory/WarehouseSetup.tsx:46](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseSetup.tsx#L46)

```tsx
{ warehouse, products, onClose, onSaved }: { warehouse: StockLocation; products: Product[]; onClose: () => void; onSaved: (ids: string[]) => void }
```

## apps/web/src/components/inventory/WarehouseShops.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseShops.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseShops.tsx)

### WarehouseShopsCell

[apps/web/src/components/inventory/WarehouseShops.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseShops.tsx#L8)

```tsx
{ summary, status, productName, warehouseName, onOpen }: {
  summary: WarehouseShopSummary; status: ShopLinksState; productName: string; warehouseName: string; onOpen: () => void;
}
```

### WarehouseShopsDrawer

[apps/web/src/components/inventory/WarehouseShops.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseShops.tsx#L26)

```tsx
{ summary, productName, warehouseName, onClose }: {
  summary: WarehouseShopSummary; productName: string; warehouseName: string; onClose: () => void;
}
```

## apps/web/src/components/inventory/WarehouseStatusBadge.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStatusBadge.tsx)

### WarehouseStatusBadge

[apps/web/src/components/inventory/WarehouseStatusBadge.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStatusBadge.tsx#L10)

```tsx
{ status, className }: WarehouseStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface WarehouseStatusBadgeProps {
  status: string;
  className?: string;
}
```

## apps/web/src/components/inventory/WarehouseStockTable.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseStockTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStockTable.tsx)

### StockNumber

[apps/web/src/components/inventory/WarehouseStockTable.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStockTable.tsx#L24)

```tsx
{ value, compact = false }: { value: StockValue; compact?: boolean }
```

### WarehouseStockTable

[apps/web/src/components/inventory/WarehouseStockTable.tsx:50](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseStockTable.tsx#L50)

```tsx
{ products, warehouses, positions = getInventoryPositions(), warehouseId, onShowAll, onAdjustStock, onRecordOpeningStock, onViewWarehouse, onTransferStock, initialSearch = '', shops = noShops, shopLinksState = 'ready' }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type StockLocation = { id: string; name: string; code?: string; address?: string | null; unknown?: boolean; external?: boolean };

export type StockAdjustmentTarget = { product: Product; warehouse?: StockLocation; sku?: string; initializeLocation?: boolean; mode?: 'receive' | 'availability' };

type Props = {
  shops?: ConnectedChannelRecord[];
  shopLinksState?: ShopLinksState;
  onTransferStock?: (target: Partial<StockAdjustmentTarget>) => void;
  onViewWarehouse?: (warehouseId: string) => void;
  onAdjustStock?: (target: StockAdjustmentTarget) => void;
  onRecordOpeningStock?: () => void;
  products: Product[];
  warehouses: StockLocation[];
  positions?: InventoryPosition[];
  warehouseId: string;
  onShowAll: () => void;
  initialSearch?: string;
};
```

## apps/web/src/components/inventory/WarehouseTable.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTable.tsx)

### WarehouseTable

[apps/web/src/components/inventory/WarehouseTable.tsx:58](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTable.tsx#L58)

```tsx
{
  warehouses,
  isLoading,
  onEdit,
  onDelete,
  onRowClick,
  selectedWarehouseId,
}: WarehouseTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: string;
  type: 'own' | 'fba' | '3pl';
  status: 'active' | 'inactive';
  tags: string[];
  address: string | null;
  fulfillment_type_mapping: string | null;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
  prefecture: string | null;
  city: string | null;
  postal_code: string | null;
  is_virtual: boolean;
  sync_status: string | null;
  sync_source: string | null;
  last_synced_at: string | null;
  map_x: number | null;
  map_y: number | null;
}

interface WarehouseTableProps {
  warehouses: Warehouse[];
  isLoading?: boolean;
  onEdit?: (warehouse: Warehouse) => void;
  onDelete?: (warehouse: Warehouse) => void;
  onRowClick?: (warehouse: Warehouse) => void;
  selectedWarehouseId?: string | null;
}
```

## apps/web/src/components/inventory/WarehouseTypeBadge.tsx

Nguồn: [apps/web/src/components/inventory/WarehouseTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTypeBadge.tsx)

### WarehouseTypeBadge

[apps/web/src/components/inventory/WarehouseTypeBadge.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/WarehouseTypeBadge.tsx#L16)

```tsx
{ type, className }: WarehouseTypeBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface WarehouseTypeBadgeProps {
  type: string;
  className?: string;
}
```

## apps/web/src/components/layout/AppHeader.tsx

Nguồn: [apps/web/src/components/layout/AppHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppHeader.tsx)

### AppHeader

[apps/web/src/components/layout/AppHeader.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppHeader.tsx#L5)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/layout/AppLayout.tsx

Nguồn: [apps/web/src/components/layout/AppLayout.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppLayout.tsx)

### AppLayout

[apps/web/src/components/layout/AppLayout.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppLayout.tsx#L14)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/layout/AppSidebar.tsx

Nguồn: [apps/web/src/components/layout/AppSidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppSidebar.tsx)

### AppSidebar

[apps/web/src/components/layout/AppSidebar.tsx:181](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/AppSidebar.tsx#L181)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavItem[];
};

type NavGroup = { id: string; label: string; items: NavItem[] };

type SearchResult = NavItem & { trail: string[]; parentIds: string[] };
```

## apps/web/src/components/layout/ContextSelector.tsx

Nguồn: [apps/web/src/components/layout/ContextSelector.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/ContextSelector.tsx)

### ContextSelector

[apps/web/src/components/layout/ContextSelector.tsx:22](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/ContextSelector.tsx#L22)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/layout/DemoModeTabs.tsx

Nguồn: [apps/web/src/components/layout/DemoModeTabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/DemoModeTabs.tsx)

### DemoModeTabs

[apps/web/src/components/layout/DemoModeTabs.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/DemoModeTabs.tsx#L5)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/layout/PrimeCommandPalette.tsx

Nguồn: [apps/web/src/components/layout/PrimeCommandPalette.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/PrimeCommandPalette.tsx)

### PrimeCommandPalette

[apps/web/src/components/layout/PrimeCommandPalette.tsx:54](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/PrimeCommandPalette.tsx#L54)

```tsx
{ open, onOpenChange }: PrimeCommandPaletteProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type PrimeCommandPaletteProps = {
  open: boolean;
  onOpenChange: Dispatch<boolean>;
};

type CommandRoute = {
  id: string;
  label: string;
  area: string;
  href: string;
  external: boolean;
  icon?: PrimeNavNode['icon'];
};
```

## apps/web/src/components/layout/SidebarUserFooter.tsx

Nguồn: [apps/web/src/components/layout/SidebarUserFooter.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/SidebarUserFooter.tsx)

### SidebarUserFooter

[apps/web/src/components/layout/SidebarUserFooter.tsx:45](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/SidebarUserFooter.tsx#L45)

```tsx
{ collapsed }: { collapsed: boolean }
```

## apps/web/src/components/layout/WorkspaceSwitcher.tsx

Nguồn: [apps/web/src/components/layout/WorkspaceSwitcher.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/WorkspaceSwitcher.tsx)

### WorkspaceSwitcher

[apps/web/src/components/layout/WorkspaceSwitcher.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/layout/WorkspaceSwitcher.tsx#L8)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/listings/AISuggestionPanel.tsx

Nguồn: [apps/web/src/components/listings/AISuggestionPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/AISuggestionPanel.tsx)

### AISuggestionPanel

[apps/web/src/components/listings/AISuggestionPanel.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/AISuggestionPanel.tsx#L19)

```tsx
{ suggestions, onAccept, onReject, loading }: AISuggestionPanelProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface AISuggestionPanelProps {
  suggestions: AISuggestion[];
  onAccept: (suggestion: AISuggestion, editedValue?: string) => void;
  onReject: (suggestion: AISuggestion) => void;
  loading?: boolean;
}
```

## apps/web/src/components/listings/ListingPreview.tsx

Nguồn: [apps/web/src/components/listings/ListingPreview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/ListingPreview.tsx)

### ListingPreview

[apps/web/src/components/listings/ListingPreview.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/ListingPreview.tsx#L18)

```tsx
{
  platform,
  title,
  description,
  price,
  images,
  attributes,
}: ListingPreviewProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ListingPreviewProps {
  platform: PlatformType;
  title: string;
  description: string;
  price: number;
  images?: string[];
  attributes?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/MediaGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/MediaGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/MediaGroup.tsx)

### MediaGroup

[apps/web/src/components/listings/groups/MediaGroup.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/MediaGroup.tsx#L17)

```tsx
{ data, onChange, errors = {} }: MediaGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface MediaGroupProps {
  data: MediaData;
  onChange: (data: MediaData) => void;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/OfferGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/OfferGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/OfferGroup.tsx)

### OfferGroup

[apps/web/src/components/listings/groups/OfferGroup.tsx:25](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/OfferGroup.tsx#L25)

```tsx
{ 
  offerData, 
  selectedVariants,
  onChange, 
  errors = {} 
}: OfferGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface OfferGroupProps {
  offerData: Record<string, SkuOfferInfo>;
  selectedVariants: SkuForListing[];
  onChange: (data: Record<string, SkuOfferInfo>) => void;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/ProductDetailsGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/ProductDetailsGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductDetailsGroup.tsx)

### ProductDetailsGroup

[apps/web/src/components/listings/groups/ProductDetailsGroup.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductDetailsGroup.tsx#L18)

```tsx
{ 
  data, 
  onChange, 
  suggestedFields = new Set(),
  errors = {} 
}: ProductDetailsGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ProductDetailsGroupProps {
  data: ProductDetailsData;
  onChange: (data: ProductDetailsData) => void;
  suggestedFields?: Set<string>;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/ProductIdentityGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/ProductIdentityGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductIdentityGroup.tsx)

### ProductIdentityGroup

[apps/web/src/components/listings/groups/ProductIdentityGroup.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ProductIdentityGroup.tsx#L15)

```tsx
{ 
  data, 
  onChange, 
  suggestedFields = new Set(),
  errors = {} 
}: ProductIdentityGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ProductIdentityGroupProps {
  data: ProductIdentityData;
  onChange: (data: ProductIdentityData) => void;
  suggestedFields?: Set<string>;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx)

### SafetyComplianceGroup

[apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx:44](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/SafetyComplianceGroup.tsx#L44)

```tsx
{ 
  data, 
  onChange, 
  platform,
  errors = {} 
}: SafetyComplianceGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SafetyComplianceGroupProps {
  data: SafetyData;
  onChange: (data: SafetyData) => void;
  platform: 'amazon' | 'shopee' | 'rakuten';
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/ShippingGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/ShippingGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ShippingGroup.tsx)

### ShippingGroup

[apps/web/src/components/listings/groups/ShippingGroup.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/ShippingGroup.tsx#L26)

```tsx
{ 
  shippingData, 
  selectedVariants,
  onChange, 
  errors = {} 
}: ShippingGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ShippingGroupProps {
  shippingData: Record<string, SkuShippingInfo>;
  selectedVariants: SkuForListing[];
  onChange: (data: Record<string, SkuShippingInfo>) => void;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/listings/groups/VariantSelectionStep.tsx

Nguồn: [apps/web/src/components/listings/groups/VariantSelectionStep.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariantSelectionStep.tsx)

### VariantSelectionStep

[apps/web/src/components/listings/groups/VariantSelectionStep.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariantSelectionStep.tsx#L18)

```tsx
{ 
  variants, 
  onSelectionChange, 
}: VariantSelectionStepProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface VariantSelectionStepProps {
  variants: SkuForListing[];
  onSelectionChange: (variants: SkuForListing[]) => void;
  onCheckAsin?: () => Promise<void>;
  asinCheckLoading?: boolean;
}
```

## apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx

Nguồn: [apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx)

### VariationRelationshipsGroup

[apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/listings/groups/VariationRelationshipsGroup.tsx#L17)

```tsx
{ 
  data, 
  selectedVariants,
  onChange, 
  errors = {} 
}: VariationRelationshipsGroupProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface VariationRelationshipsGroupProps {
  data: VariationData;
  selectedVariants: SkuForListing[];
  onChange: (data: VariationData) => void;
  errors?: Record<string, string>;
}
```

## apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx

Nguồn: [apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx)

### CreateLiveSessionWizard

[apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/CreateLiveSessionWizard.tsx#L17)

```tsx
{ open, onOpenChange, options, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; options: LiveOptions | null; onCreated: () => void }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Allocation = { selected: boolean; allocated_qty: number; live_price: number };
```

## apps/web/src/components/live-commerce/EditSessionDrawer.tsx

Nguồn: [apps/web/src/components/live-commerce/EditSessionDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/EditSessionDrawer.tsx)

### EditSessionDrawer

[apps/web/src/components/live-commerce/EditSessionDrawer.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/EditSessionDrawer.tsx#L11)

```tsx
{ session, open, onOpenChange, options, onChanged }: { session: LiveSession | null; open: boolean; onOpenChange: (open: boolean) => void; options: LiveOptions | null; onChanged: () => void }
```

## apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx

Nguồn: [apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx)

### LiveWarRoomDrawer

[apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/LiveWarRoomDrawer.tsx#L11)

```tsx
{ session, open, onOpenChange, options, onChanged }: { session: LiveSession | null; open: boolean; onOpenChange: (open: boolean) => void; options: LiveOptions | null; onChanged: () => void }
```

## apps/web/src/components/live-commerce/SessionOperationsTable.tsx

Nguồn: [apps/web/src/components/live-commerce/SessionOperationsTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/SessionOperationsTable.tsx)

### SessionOperationsTable

[apps/web/src/components/live-commerce/SessionOperationsTable.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/live-commerce/SessionOperationsTable.tsx#L16)

```tsx
{ sessions, loading, onSelect }: { sessions: LiveSession[]; loading: boolean; onSelect: (session: LiveSession) => void }
```

## apps/web/src/components/oms/RoutingConfigEditor.tsx

Nguồn: [apps/web/src/components/oms/RoutingConfigEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/RoutingConfigEditor.tsx)

### RoutingConfigEditor

[apps/web/src/components/oms/RoutingConfigEditor.tsx:30](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/RoutingConfigEditor.tsx#L30)

```tsx
{ warehouseId, warehouseName, warehouseCountry }: RoutingConfigEditorProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface RoutingConfigEditorProps {
  warehouseId: string;
  warehouseName: string;
  warehouseCountry: string;
}
```

## apps/web/src/components/oms/SlaBreachBadge.tsx

Nguồn: [apps/web/src/components/oms/SlaBreachBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/SlaBreachBadge.tsx)

### SlaBreachBadge

[apps/web/src/components/oms/SlaBreachBadge.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/oms/SlaBreachBadge.tsx#L10)

```tsx
{ deadline, className }: SlaBreachBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SlaBreachBadgeProps {
  deadline: string | Date | null | undefined;
  className?: string;
}
```

## apps/web/src/components/onboarding/InitialSetupBanner.tsx

Nguồn: [apps/web/src/components/onboarding/InitialSetupBanner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/InitialSetupBanner.tsx)

### InitialSetupBanner

[apps/web/src/components/onboarding/InitialSetupBanner.tsx:50](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/InitialSetupBanner.tsx#L50)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx

Nguồn: [apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx)

### OnboardingChecklistDrawer

[apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/onboarding/OnboardingChecklistDrawer.tsx#L14)

```tsx
{ open, onOpenChange, onboarding }: OnboardingChecklistDrawerProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface OnboardingChecklistDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onboarding: OnboardingStatus;
}
```

## apps/web/src/components/orders/CopyValue.tsx

Nguồn: [apps/web/src/components/orders/CopyValue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/CopyValue.tsx)

### CopyValue

[apps/web/src/components/orders/CopyValue.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/CopyValue.tsx#L3)

```tsx
{ value, label }: { value: string; label: string }
```

## apps/web/src/components/orders/HandlingTypeBadge.tsx

Nguồn: [apps/web/src/components/orders/HandlingTypeBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/HandlingTypeBadge.tsx)

### HandlingTypeBadge

[apps/web/src/components/orders/HandlingTypeBadge.tsx:4](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/HandlingTypeBadge.tsx#L4)

```tsx
{ order }: { order: OrderRecord }
```

## apps/web/src/components/orders/LifecycleStageBadge.tsx

Nguồn: [apps/web/src/components/orders/LifecycleStageBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/LifecycleStageBadge.tsx)

### LifecycleStageBadge

[apps/web/src/components/orders/LifecycleStageBadge.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/LifecycleStageBadge.tsx#L11)

```tsx
{ stage, className }: LifecycleStageBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface LifecycleStageBadgeProps {
  stage: LifecycleStage;
  className?: string;
}
```

## apps/web/src/components/orders/ManualOrderDialog.tsx

Nguồn: [apps/web/src/components/orders/ManualOrderDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/ManualOrderDialog.tsx)

### OrderField

[apps/web/src/components/orders/ManualOrderDialog.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/ManualOrderDialog.tsx#L9)

```tsx
{ label, children }: { label: string; children: React.ReactNode }
```

### ManualOrderDialog

[apps/web/src/components/orders/ManualOrderDialog.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/ManualOrderDialog.tsx#L10)

```tsx
{ onClose, onCreated, warehouses, initialOrder }: { onClose: () => void; onCreated: (order: OrderRecord) => void; warehouses: string[]; initialOrder?: OrderRecord }
```

## apps/web/src/components/orders/OrderBatchDialog.tsx

Nguồn: [apps/web/src/components/orders/OrderBatchDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderBatchDialog.tsx)

### OrderBatchDialog

[apps/web/src/components/orders/OrderBatchDialog.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderBatchDialog.tsx#L15)

```tsx
{orders, canWrite, initialAction, scope = 'selected', onClose, onUpdated}: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Result = {id: string; orderKey: string; status: 'success' | 'failed' | 'skipped'; message: string; order?: OrderRecord};

type Props = {orders: OrderRecord[]; canWrite: boolean; initialAction?: BatchAction; scope?: 'selected' | 'filtered'; onClose: () => void; onUpdated: (order: OrderRecord) => void};
```

## apps/web/src/components/orders/OrderEventTimeline.tsx

Nguồn: [apps/web/src/components/orders/OrderEventTimeline.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderEventTimeline.tsx)

### OrderEventTimeline

[apps/web/src/components/orders/OrderEventTimeline.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderEventTimeline.tsx#L11)

```tsx
{ events, isLoading }: OrderEventTimelineProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface OrderEventTimelineProps {
  events: OrderEvent[];
  isLoading?: boolean;
}
```

## apps/web/src/components/orders/OrderFilters.tsx

Nguồn: [apps/web/src/components/orders/OrderFilters.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderFilters.tsx)

### OrderFilters

[apps/web/src/components/orders/OrderFilters.tsx:42](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderFilters.tsx#L42)

```tsx
{
  searchQuery,
  onSearchChange,
  channelFilter,
  onChannelChange,
  warehouseFilter,
  onWarehouseChange,
  warehouses,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
}: OrderFiltersProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  channelFilter: string;
  onChannelChange: (value: string) => void;
  warehouseFilter: string;
  onWarehouseChange: (value: string) => void;
  warehouses: WarehouseOption[];
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}
```

## apps/web/src/components/orders/OrderLifecycleBadge.tsx

Nguồn: [apps/web/src/components/orders/OrderLifecycleBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderLifecycleBadge.tsx)

### OrderLifecycleBadge

[apps/web/src/components/orders/OrderLifecycleBadge.tsx:4](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderLifecycleBadge.tsx#L4)

```tsx
{ status }: { status: string }
```

## apps/web/src/components/orders/OrderNavigation.tsx

Nguồn: [apps/web/src/components/orders/OrderNavigation.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderNavigation.tsx)

### OrderNavigation

[apps/web/src/components/orders/OrderNavigation.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderNavigation.tsx#L7)

```tsx
{ items, value, loaded, onChange }: {
  items: { key: OrderQueue; label: string; count: number }[];
  value: OrderQueue;
  loaded: boolean;
  onChange: (value: OrderQueue) => void;
}
```

## apps/web/src/components/orders/OrderPreparationDialog.tsx

Nguồn: [apps/web/src/components/orders/OrderPreparationDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderPreparationDialog.tsx)

### OrderPreparationDialog

[apps/web/src/components/orders/OrderPreparationDialog.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderPreparationDialog.tsx#L26)

```tsx
{order, onClose, onUpdated}: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = { order: OrderRecord; onClose: () => void; onUpdated: (order: OrderRecord) => void };
```

## apps/web/src/components/orders/OrderProcessingDialog.tsx

Nguồn: [apps/web/src/components/orders/OrderProcessingDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderProcessingDialog.tsx)

### OrderProcessingDialog

[apps/web/src/components/orders/OrderProcessingDialog.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderProcessingDialog.tsx#L20)

```tsx
props: ProcessingProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type ProcessingProps = {order: OrderRecord; action: ProcessingAction; onClose: () => void; onUpdated: (order: OrderRecord) => void};
```

## apps/web/src/components/orders/OrderShipmentJourney.tsx

Nguồn: [apps/web/src/components/orders/OrderShipmentJourney.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderShipmentJourney.tsx)

### OrderShipmentJourney

[apps/web/src/components/orders/OrderShipmentJourney.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderShipmentJourney.tsx#L11)

```tsx
{order, onUpdated, disabled = false}: {order: OrderRecord; onUpdated: (order: OrderRecord) => void; disabled?: boolean}
```

## apps/web/src/components/orders/OrderStatusBadge.tsx

Nguồn: [apps/web/src/components/orders/OrderStatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusBadge.tsx)

### OrderStatusBadge

[apps/web/src/components/orders/OrderStatusBadge.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusBadge.tsx#L10)

```tsx
{ status, className }: OrderStatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}
```

## apps/web/src/components/orders/OrderStatusTabs.tsx

Nguồn: [apps/web/src/components/orders/OrderStatusTabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusTabs.tsx)

### OrderStatusTabs

[apps/web/src/components/orders/OrderStatusTabs.tsx:21](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderStatusTabs.tsx#L21)

```tsx
{ activeStatus, onStatusChange, orderCounts }: OrderStatusTabsProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface OrderStatusTabsProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  orderCounts?: Record<string, number>;
}
```

## apps/web/src/components/orders/OrderToolbar.tsx

Nguồn: [apps/web/src/components/orders/OrderToolbar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderToolbar.tsx)

### OrderToolbar

[apps/web/src/components/orders/OrderToolbar.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderToolbar.tsx#L15)

```tsx
props: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Field = {label: string; control: ReactNode; active: boolean};

type Props = {
  search: string; onSearch: (value: string) => void;
  status: Field; shop: Field; payment: Field; action: Field;
  tools: ReactNode; advancedFilters: ReactNode;
  open: boolean; onOpenChange: (open: boolean) => void; detailedCount: number;
};
```

## apps/web/src/components/orders/OrderWorkspaceDetail.tsx

Nguồn: [apps/web/src/components/orders/OrderWorkspaceDetail.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderWorkspaceDetail.tsx)

### OrderWorkspaceDetail

[apps/web/src/components/orders/OrderWorkspaceDetail.tsx:42](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrderWorkspaceDetail.tsx#L42)

```tsx
{ order, canWrite, onClose, onUpdated, onEditDraft, onNext, onPrevious, positionLabel, startProcessing = false }: {
  order: OrderRecord; canWrite: boolean; onClose: () => void; onUpdated: (order: OrderRecord) => void; onEditDraft: () => void; onNext?: () => void; onPrevious?: () => void; positionLabel?: string; startProcessing?: boolean;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Action = 'hold' | 'release-hold' | 'submit' | 'confirm' | 'cancel' | 'close' | 'payment' | 'assign' | 'warehouse' | 'note' | 'exception';
```

## apps/web/src/components/orders/OrdersTable.tsx

Nguồn: [apps/web/src/components/orders/OrdersTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrdersTable.tsx)

### OrdersTable

[apps/web/src/components/orders/OrdersTable.tsx:32](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/orders/OrdersTable.tsx#L32)

```tsx
{ orders, isLoading, emptyState }: OrdersTableProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface OrderListItem {
  id: string;
  order_id: string;
  order_date: string;
  customer_name: string | null;
  channel: Channel;
  total_amount: number;
  status: OrderStatus;
  lifecycle_stage?: string;
  risk_flags?: string[];
  tracking_number?: string | null;
}

interface OrdersTableProps {
  orders: OrderListItem[];
  isLoading: boolean;
  emptyState?: ReactNode;
}
```

## apps/web/src/components/prime/IntelligenceDragBoard.tsx

Nguồn: [apps/web/src/components/prime/IntelligenceDragBoard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/IntelligenceDragBoard.tsx)

### IntelligenceDragBoard

[apps/web/src/components/prime/IntelligenceDragBoard.tsx:61](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/IntelligenceDragBoard.tsx#L61)

```tsx
{ board, onMoveCard, onSelectCard, className }: IntelligenceDragBoardProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type IntelligenceDragBoardProps = {
  board: IntelligenceBoardSnapshot;
  onMoveCard?: (cardId: string, toLaneId: IntelligenceBoardLaneId, toRank: number) => void;
  onSelectCard?: (card: IntelligenceBoardCard) => void;
  className?: string;
};
```

## apps/web/src/components/prime/MyInvoisStatusPanel.tsx

Nguồn: [apps/web/src/components/prime/MyInvoisStatusPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/MyInvoisStatusPanel.tsx)

### MyInvoisStatusPanel

[apps/web/src/components/prime/MyInvoisStatusPanel.tsx:27](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/MyInvoisStatusPanel.tsx#L27)

```tsx
{ readiness }: { readiness: MyInvoisOrderReadiness }
```

## apps/web/src/components/prime/PartnerWorkspacePanel.tsx

Nguồn: [apps/web/src/components/prime/PartnerWorkspacePanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PartnerWorkspacePanel.tsx)

### PartnerWorkspacePanel

[apps/web/src/components/prime/PartnerWorkspacePanel.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PartnerWorkspacePanel.tsx#L7)

```tsx
{ summary }: { summary: PartnerWorkspaceSummary }
```

## apps/web/src/components/prime/PrimeOperatingSystem.tsx

Nguồn: [apps/web/src/components/prime/PrimeOperatingSystem.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx)

### IdentifierText

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:115](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L115)

```tsx
{ children, className }: { children: ReactNode; className?: string }
```

### OwnerSlaBadge

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:119](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L119)

```tsx
{
  owner,
  sla,
  className,
}: {
  owner: string;
  sla?: string;
  className?: string;
}
```

### LinkedEntityStrip

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:142](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L142)

```tsx
{
  entities,
  className,
}: {
  entities: Array<{ label: string; value: string; href?: string; tone?: Tone }>;
  className?: string;
}
```

### DecisionHeader

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:175](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L175)

```tsx
{
  eyebrow,
  title,
  description,
  confidence,
  status,
  actions,
  evidence,
  variant = 'default',
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  confidence?: number;
  status?: string;
  actions?: ReactNode;
  evidence?: EvidenceItem[];
  variant?: 'default' | 'compact';
  className?: string;
}
```

### OperatingLoop

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:279](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L279)

```tsx
{ steps, className }: { steps: OperatingLoopStep[]; className?: string }
```

### HandoffRail

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:319](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L319)

```tsx
{
  from,
  to,
  detail,
  href,
  className,
}: {
  from: string;
  to: string;
  detail: string;
  href: string;
  className?: string;
}
```

### EvidenceStack

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:356](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L356)

```tsx
{ items, className }: { items: EvidenceItem[]; className?: string }
```

### GuardrailCard

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:378](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L378)

```tsx
{
  title,
  detail,
  status = 'Watch',
  tone = 'warning',
  action,
  className,
}: {
  title: string;
  detail: ReactNode;
  status?: string;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
}
```

### OutcomePreview

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:413](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L413)

```tsx
{
  label,
  value,
  detail,
  tone = 'success',
  className,
}: {
  label?: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  className?: string;
}
```

### ActionSetupPanel

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:438](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L438)

```tsx
{
  title,
  detail,
  actionLabel,
  href,
  className,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  className?: string;
}
```

### RegistryList

[apps/web/src/components/prime/PrimeOperatingSystem.tsx:473](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/PrimeOperatingSystem.tsx#L473)

```tsx
{ items, className }: { items: RegistryItem[]; className?: string }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';

export type OperatingLoopStep = {
  label: string;
  title: string;
  detail: string;
  href?: string;
  tone?: Tone;
};

export type EvidenceItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
};

export type RegistryItem = {
  id: string;
  label: string;
  title: string;
  detail?: string;
  meta?: string;
  href?: string;
  tone?: Tone;
};
```

## apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx

Nguồn: [apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx)

### CustomerProfileFloor

[apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx:482](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/prime/customer-profile/CustomerProfileFloor.tsx#L482)

```tsx
{ snapshot, defaultSubFloor = 'overview' }: { snapshot: PrimeSnapshot; defaultSubFloor?: CustomerSubFloor }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type AccountFormState = Pick<CustomerAccount,
  'companyName' | 'displayName' | 'customerType' | 'lifecycle' | 'status' | 'ownerId' | 'tags' | 'primaryEmail' | 'website' | 'industry' | 'country' | 'source'
>;

type ContactFormState = Pick<CustomerContact,
  'fullName' | 'title' | 'role' | 'email' | 'phone' | 'preferredChannel' | 'isPrimary'
>;

type CustomerSubFloor = 'overview' | 'account' | 'identity';
```

## apps/web/src/components/products/ApplyMasterSheet.tsx

Nguồn: [apps/web/src/components/products/ApplyMasterSheet.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ApplyMasterSheet.tsx)

### ApplyMasterSheet

[apps/web/src/components/products/ApplyMasterSheet.tsx:121](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ApplyMasterSheet.tsx#L121)

```tsx
{ open, onOpenChange, form, images, enabledChannels, listingDrafts, initialChannel, initialChannels, onApply }: ApplyMasterSheetProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type OverrideChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';

type FieldGroupKey = 'content' | 'media' | 'shipping';

interface FormState {
  name: string;
  description: string;
  brand: string;
  retail_price: string;
  price_currency: string;
  pkg_length: string;
  pkg_width: string;
  pkg_height: string;
  pkg_weight: string;
  country_of_origin: string;
  hs_code: string;
  [key: string]: unknown;
}

interface EnabledChannel {
  key: OverrideChannel;
  label: string;
  account?: string;
  connectionStatus: 'connected' | 'attention' | 'not_connected';
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}

interface FieldGroup {
  key: FieldGroupKey;
  label: string;
  risk: 'safe' | 'caution';
  cautionNote?: string;
  defaultChecked: boolean;
  fieldPreviews: (form: FormState, images: string[]) => Array<{ label: string; value: string }>;
  buildPatch: (form: FormState) => Partial<ChannelWizardDraft>;
}

interface ApplyMasterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormState;
  images: string[];
  enabledChannels: EnabledChannel[];
  listingDrafts: Record<OverrideChannel, ChannelWizardDraft>;
  initialChannel?: OverrideChannel | null;
  initialChannels?: OverrideChannel[];
  onApply: (patch: Partial<Record<OverrideChannel, Partial<ChannelWizardDraft>>>) => void;
}
```

## apps/web/src/components/products/BrandChannelMappings.tsx

Nguồn: [apps/web/src/components/products/BrandChannelMappings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/BrandChannelMappings.tsx)

### BrandChannelMappings

[apps/web/src/components/products/BrandChannelMappings.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/BrandChannelMappings.tsx#L11)

```tsx
{ value, onChange }: { value: CatalogBrand; onChange: (brand: CatalogBrand) => void }
```

## apps/web/src/components/products/CategorySchemaChanges.tsx

Nguồn: [apps/web/src/components/products/CategorySchemaChanges.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CategorySchemaChanges.tsx)

### CategorySchemaChanges

[apps/web/src/components/products/CategorySchemaChanges.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CategorySchemaChanges.tsx#L5)

```tsx
{ diff, attributes, specifications = [] }: {
  diff: ReturnType<typeof categorySchemaDiff>;
  attributes: CatalogAttribute[];
  specifications?: Specification[];
}
```

## apps/web/src/components/products/ChannelListingEditorDrawer.tsx

Nguồn: [apps/web/src/components/products/ChannelListingEditorDrawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingEditorDrawer.tsx)

### ChannelListingEditorDrawer

[apps/web/src/components/products/ChannelListingEditorDrawer.tsx:57](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingEditorDrawer.tsx#L57)

```tsx
{ open, onOpenChange, channel, draft, masterSku, productName = '', rakutenBrandName = '', basePrice, baseCurrency = 'JPY', productVariants = [], inventorySources = [], masterImages = [], onUploadMasterImage, uploadingImages = false, masterMissingItems, onEditMaster, masterPersisted, masterHasUnsavedChanges, masterDataComplete, masterBlockingReason, onSaveMaster, onSave, onPublish, syncSettings }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type EditorTab = ListingEditorTab;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: WizardChannel | null;
  draft: ChannelWizardDraft | null;
  masterSku: string;
  productName?: string;
  rakutenBrandName?: string;
  basePrice?: number;
  baseCurrency?: string;
  productVariants?: Array<{ id: string; label: string; sku: string }>;
  inventorySources?: ListingInventorySource[];
  masterImages?: string[];
  onUploadMasterImage?: (file: File) => Promise<void>;
  uploadingImages?: boolean;
  masterMissingItems?: Array<{ id: string; label: string }>;
  onEditMaster?: (checkId: string) => void;
  masterPersisted: boolean;
  masterHasUnsavedChanges: boolean;
  masterDataComplete: boolean;
  masterBlockingReason?: string;
  onSaveMaster: () => boolean;
  onSave: (patch: Partial<ChannelWizardDraft>) => void;
  onPublish?: (draft: ChannelWizardDraft) => Promise<void>;
  syncSettings?: { preference: MasterSyncPreference; master: Product; listing: ChannelListing; onConfigure: () => void };
}
```

## apps/web/src/components/products/ChannelListingPanel.tsx

Nguồn: [apps/web/src/components/products/ChannelListingPanel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingPanel.tsx)

### ChannelListingPanel

[apps/web/src/components/products/ChannelListingPanel.tsx:166](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingPanel.tsx#L166)

```tsx
{
  channels,
  onChannelsChange,
  disabled,
}: ChannelListingPanelProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ChannelListingPanelProps {
  channels: ChannelListing[];
  onChannelsChange: (channels: ChannelListing[]) => void;
  disabled?: boolean;
}
```

## apps/web/src/components/products/ChannelListingWizard.tsx

Nguồn: [apps/web/src/components/products/ChannelListingWizard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingWizard.tsx)

### ChannelListingWizard

[apps/web/src/components/products/ChannelListingWizard.tsx:88](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ChannelListingWizard.tsx#L88)

```tsx
{ open, onOpenChange, embedded = false, channels, drafts, masterSku, productName, productCategory, rakutenBrandName = '', availableStock, imageCount, productType, basePrice, baseCurrency = 'JPY', localizedContent = {}, onChange, onSubmitted }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface ChannelWizardDraft extends ListingPricing {
  enabled: boolean;
  title: string;
  price_markup: string;
  description: string;
  listing_sku: string;
  category: string;
  fulfillment: string;
  variant_scope: string;
  selected_variant_ids?: string[];
  listing_mode: string;
  identifier: string;
  condition: string;
  stock_quantity: string;
  warehouse: string;
  brand: string;
  shipping_option: string;
  bullet_points: string;
  search_terms: string;
  preorder_days: string;
  warranty: string;
  certification: string;
  video_url: string;
  web_slug: string;
  pos_barcode: string;
  visibility: string;
  sync_policy: string;
  safety_buffer: string;
  allocation_cap: string;
  media_scope: string;
  compliance_notes: string;
  tax_code: string;
  attribute_material: string;
  attribute_color: string;
  localized_content_confirmed: boolean;
}

export interface WizardChannel {
  key: string;
  label: string;
  description: string;
  icon: typeof Store;
  iconClassName: string;
  account?: string;
  connectionStatus?: 'connected' | 'attention' | 'not_connected';
  unavailableReason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  channels: WizardChannel[];
  drafts: Record<string, ChannelWizardDraft>;
  masterSku: string;
  productName: string;
  productCategory: string;
  rakutenBrandName?: string;
  availableStock: number;
  imageCount: number;
  productType: string;
  basePrice?: number;
  baseCurrency?: string;
  localizedContent?: Partial<Record<string, { name?: string; description?: string }>>;
  onChange: (channel: string, patch: Partial<ChannelWizardDraft>) => void;
  onSubmitted?: (selectedDrafts: Record<string, ChannelWizardDraft>) => void;
}
```

## apps/web/src/components/products/CreateProductDialog.tsx

Nguồn: [apps/web/src/components/products/CreateProductDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CreateProductDialog.tsx)

### CreateProductDialog

[apps/web/src/components/products/CreateProductDialog.tsx:50](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/CreateProductDialog.tsx#L50)

```tsx
{ open, onOpenChange, existingSkus, onConfirm, existingProducts = [], onOpenExisting }: CreateProductDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface CreateProductDraftInput {
  sku: string;
  name: string;
  productType: ProductType;
  category: string;
  categoryId?: string;
}

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: string[];
  onConfirm: (input: CreateProductDraftInput) => void;
  existingProducts?: Array<{ id: string; name: string; sku_code: string }>;
  onOpenExisting?: (id: string) => void;
}
```

## apps/web/src/components/products/FieldProvenanceBadge.tsx

Nguồn: [apps/web/src/components/products/FieldProvenanceBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/FieldProvenanceBadge.tsx)

### FieldProvenanceBadge

[apps/web/src/components/products/FieldProvenanceBadge.tsx:22](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/FieldProvenanceBadge.tsx#L22)

```tsx
{
  source,
  confidence,
  isProtected,
  onToggleProtect,
  className,
}: FieldProvenanceBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type FieldSource = 'pim' | 'rakuten_import' | 'shopee_import' | 'amazon_import' | 'csv_import';

interface FieldProvenanceBadgeProps {
  source: FieldSource;
  confidence?: number;
  isProtected: boolean;
  onToggleProtect: () => void;
  className?: string;
}
```

## apps/web/src/components/products/LinkExistingListingsDialog.tsx

Nguồn: [apps/web/src/components/products/LinkExistingListingsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkExistingListingsDialog.tsx)

### LinkExistingListingsDialog

[apps/web/src/components/products/LinkExistingListingsDialog.tsx:49](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkExistingListingsDialog.tsx#L49)

```tsx
{ master, hasUnsavedMasterChanges, onClose, restoreFocus, onLinked }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  master: Product;
  hasUnsavedMasterChanges?: boolean;
  onClose: () => void;
  restoreFocus: () => void;
  onLinked: (result: ReturnType<typeof confirmListingIntake>, previousVersion: number, listings: CatalogImportItem[]) => void;
};

type Review = { master: Product; listings: CatalogImportItem[] };
```

## apps/web/src/components/products/LinkedListingDetails.tsx

Nguồn: [apps/web/src/components/products/LinkedListingDetails.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkedListingDetails.tsx)

### LinkedListingDetails

[apps/web/src/components/products/LinkedListingDetails.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/LinkedListingDetails.tsx#L23)

```tsx
{ detail, masterName, onClose, restoreFocus }: { detail: LinkedListingDetail | null; masterName: string; onClose: () => void; restoreFocus: () => void }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface LinkedListingDetail {
  listing: ChannelListing;
  channelLabel: string;
  data: ListingShopData;
}
```

## apps/web/src/components/products/ListingChannelReadiness.tsx

Nguồn: [apps/web/src/components/products/ListingChannelReadiness.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingChannelReadiness.tsx)

### ListingChannelReadiness

[apps/web/src/components/products/ListingChannelReadiness.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingChannelReadiness.tsx#L16)

```tsx
{ product, sources, mappings, drafts = {}, onChange, disabled = false, activateMaster = false }: {
  product: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  drafts?: Record<string, ListingDraftValues>; onChange?: (drafts: Record<string, ListingDraftValues>) => void; disabled?: boolean;
  activateMaster?: boolean;
}
```

## apps/web/src/components/products/ListingComparisonTable.tsx

Nguồn: [apps/web/src/components/products/ListingComparisonTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingComparisonTable.tsx)

### ListingComparisonTable

[apps/web/src/components/products/ListingComparisonTable.tsx:22](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingComparisonTable.tsx#L22)

```tsx
{ baseline, product, current, sources, onChange, onEditingChange, onSetupSkus }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  baseline: Product; product: Product; current: CatalogImportItem; sources: CatalogImportItem[];
  onChange: (product: Product) => void; onEditingChange: (editing: boolean, dirty: boolean) => void;
  onSetupSkus: () => void;
};
```

## apps/web/src/components/products/ListingFieldMappingRow.tsx

Nguồn: [apps/web/src/components/products/ListingFieldMappingRow.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingFieldMappingRow.tsx)

### ListingFieldMappingRow

[apps/web/src/components/products/ListingFieldMappingRow.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingFieldMappingRow.tsx#L13)

```tsx
{ product, baseline, sources, target, onChange, multiline, children }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = { product: Product; baseline?: Product; sources: CatalogImportItem[]; target: MappingTarget; onChange: (product: Product) => void; multiline?: boolean; children?: (value: string | number, set: (value: string | number) => void, id: string) => ReactNode };
```

## apps/web/src/components/products/ListingMappingContext.tsx

Nguồn: [apps/web/src/components/products/ListingMappingContext.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingContext.tsx)

### ListingMappingContext

[apps/web/src/components/products/ListingMappingContext.tsx:34](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingContext.tsx#L34)

```tsx
{ listings, activeIndex, reviewedIds, needsSkuReviewIds = [], proposed = false, master, masterImage, onView, onChangeMaster, onCreateMaster, disabled = false }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  disabled?: boolean;
  listings: CatalogImportItem[];
  activeIndex: number;
  reviewedIds: string[];
  needsSkuReviewIds?: string[];
  proposed?: boolean;
  master: Product;
  masterImage: ReactNode;
  onView: (index: number) => void;
  onChangeMaster: () => void;
  onCreateMaster: () => void;
};
```

## apps/web/src/components/products/ListingMappingReviewDialog.tsx

Nguồn: [apps/web/src/components/products/ListingMappingReviewDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingReviewDialog.tsx)

### ListingMappingReviewDialog

[apps/web/src/components/products/ListingMappingReviewDialog.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMappingReviewDialog.tsx#L17)

```tsx
{ listing, hasUnsavedMasterChanges, onClose, restoreFocus, onSaved }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  listing: CatalogImportItem;
  hasUnsavedMasterChanges: boolean;
  onClose: () => void;
  restoreFocus: () => void;
  onSaved: (result: ReturnType<typeof confirmListingIntake>, created: boolean) => void;
};
```

## apps/web/src/components/products/ListingMasterCompletion.tsx

Nguồn: [apps/web/src/components/products/ListingMasterCompletion.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterCompletion.tsx)

### ListingMasterCompletion

[apps/web/src/components/products/ListingMasterCompletion.tsx:32](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterCompletion.tsx#L32)

```tsx
{ product: proposal, sources, onChange: applyProduct, mappings: proposalMappings, onMappingsChange: applyMappings, verifiedSingles = [], onMediaReady, preservedSkuIds, baseline, creationSetup, onEditingChange, readFirst }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  product: Product; sources: CatalogImportItem[]; onChange: (product: Product) => void;
  mappings: VariantMappings; onMappingsChange: (mappings: VariantMappings) => void;
  verifiedSingles?: string[];
  onMediaReady: (ready: boolean) => void;
  preservedSkuIds?: string[];
  baseline?: Product;
  creationSetup?: (product: Product, onChange: (product: Product) => void) => ReactNode;
  onEditingChange?: (editing: boolean, dirty: boolean) => void;
  readFirst?: boolean;
};
```

## apps/web/src/components/products/ListingMasterDraftFields.tsx

Nguồn: [apps/web/src/components/products/ListingMasterDraftFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterDraftFields.tsx)

### ListingMasterDraftFields

[apps/web/src/components/products/ListingMasterDraftFields.tsx:66](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterDraftFields.tsx#L66)

```tsx
{ source, groupSize, value, onChange }: {
  source: CatalogImportItem; groupSize: number; value: ListingMasterDraftValues;
  onChange: (value: ListingMasterDraftValues) => void;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type ListingMasterDraftValues = {
  name: string;
  sku: string;
  productType: ProductType;
  categoryId: string;
  brandId: string;
  copySourcePrice: boolean;
};

type CatalogOption = { id: string; label: string; keywords?: string[] };
```

## apps/web/src/components/products/ListingMasterReview.tsx

Nguồn: [apps/web/src/components/products/ListingMasterReview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterReview.tsx)

### ListingMasterReview

[apps/web/src/components/products/ListingMasterReview.tsx:61](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterReview.tsx#L61)

```tsx
{ catalog = savedListingCatalog, listings, initialMode, onBack, backLabel = 'Back to listings', remainingCount, batchProgress, onSkip, onStageChange, onDirtyChange, onSaved }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type IntakeStage = 'queue' | 'group' | 'choose' | 'compare' | 'create' | 'complete';

type Props = {
  catalog?: ListingIntakeCatalog;
  listings: CatalogImportItem[];
  initialMode: 'existing' | 'new';
  onBack: () => void;
  backLabel?: string;
  remainingCount?: number;
  batchProgress?: { index: number; total: number };
  onSkip?: () => void;
  onStageChange?: (stage: IntakeStage) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: (result: ReturnType<typeof confirmListingIntake>, created: boolean) => void;
};
```

## apps/web/src/components/products/ListingMasterSummary.tsx

Nguồn: [apps/web/src/components/products/ListingMasterSummary.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSummary.tsx)

### ListingMasterSummary

[apps/web/src/components/products/ListingMasterSummary.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSummary.tsx#L15)

```tsx
{ group, product, sources, mappings, imageStates }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = { group: string; product: Product; sources: CatalogImportItem[]; mappings: VariantMappings; imageStates: Record<string, boolean> };
```

## apps/web/src/components/products/ListingMasterSync.tsx

Nguồn: [apps/web/src/components/products/ListingMasterSync.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSync.tsx)

### ListingMasterSyncControl

[apps/web/src/components/products/ListingMasterSync.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSync.tsx#L14)

```tsx
{ preference, shop, onOpen, disabled, disabledReason }: {
  preference: MasterSyncPreference; shop: string; onOpen: () => void; disabled?: boolean; disabledReason?: string;
}
```

### ListingMasterSyncDialog

[apps/web/src/components/products/ListingMasterSync.tsx:28](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingMasterSync.tsx#L28)

```tsx
{ shop, sku, preference, master, listing, currentDescription, onClose, onSave, restoreFocus }: {
  shop: string; sku: string; preference: MasterSyncPreference; master: Product; listing: ChannelListing;
  currentContent?: string; currentImages?: number; currentBrand?: string; currentDescription?: string;
  onClose: () => void; onSave: (preference: MasterSyncPreference, reviewedPlan: string) => void; restoreFocus: () => void;
}
```

## apps/web/src/components/products/ListingPricingFields.tsx

Nguồn: [apps/web/src/components/products/ListingPricingFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingPricingFields.tsx)

### ListingPricingFields

[apps/web/src/components/products/ListingPricingFields.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingPricingFields.tsx#L8)

```tsx
{ draft, basePrice, baseCurrency, shopLabel: defaultShopLabel, onChange, reviewMode = 'field', syncManaged = false }: { draft: ListingPricing; basePrice: number; baseCurrency: string; shopLabel: string; onChange: (patch: ListingPricing) => void; reviewMode?: 'field' | 'submit'; syncManaged?: boolean }
```

## apps/web/src/components/products/ListingRequirementNotice.tsx

Nguồn: [apps/web/src/components/products/ListingRequirementNotice.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRequirementNotice.tsx)

### ListingRequirementNotice

[apps/web/src/components/products/ListingRequirementNotice.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRequirementNotice.tsx#L5)

```tsx
{ product, listing }: { product: Product; listing: ChannelListing }
```

## apps/web/src/components/products/ListingReviewBanner.tsx

Nguồn: [apps/web/src/components/products/ListingReviewBanner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewBanner.tsx)

### ListingReviewBanner

[apps/web/src/components/products/ListingReviewBanner.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewBanner.tsx#L9)

```tsx
{ listings, onReview, unfinishedCount = 0 }: { listings: CatalogImportItem[]; onReview: () => void; unfinishedCount?: number }
```

## apps/web/src/components/products/ListingReviewGuide.tsx

Nguồn: [apps/web/src/components/products/ListingReviewGuide.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewGuide.tsx)

### ListingReviewGuide

[apps/web/src/components/products/ListingReviewGuide.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewGuide.tsx#L14)

```tsx
{ hasListings, actionContainer }: { hasListings: boolean; actionContainer?: HTMLElement | null }
```

## apps/web/src/components/products/ListingReviewHelp.tsx

Nguồn: [apps/web/src/components/products/ListingReviewHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewHelp.tsx)

### ListingReviewHelp

[apps/web/src/components/products/ListingReviewHelp.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewHelp.tsx#L7)

```tsx
{ label, children, caption }: { label: string; children: ReactNode; caption?: string }
```

## apps/web/src/components/products/ListingReviewResult.tsx

Nguồn: [apps/web/src/components/products/ListingReviewResult.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewResult.tsx)

### ListingReviewResult

[apps/web/src/components/products/ListingReviewResult.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingReviewResult.tsx#L12)

```tsx
{ receipt, onOpenMaster, onContinue }: {
  receipt: ListingReviewReceipt;
  onOpenMaster?: (id: string) => void;
  onContinue?: () => void;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type ListingReviewReceipt = {
  pairs: { channel: string; listingId: string; listing: string; shop: string; masterId: string; master: string; readiness?: { label: string; ready: boolean; reasons: string[] } }[];
  deferred: boolean;
  masterState: string;
  reviewSaved: boolean;
};
```

## apps/web/src/components/products/ListingRowActions.tsx

Nguồn: [apps/web/src/components/products/ListingRowActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRowActions.tsx)

### ListingRowActions

[apps/web/src/components/products/ListingRowActions.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingRowActions.tsx#L6)

```tsx
{ label, canWrite, onManage, onActivity, onUnlink }: {
  label: string; canWrite: boolean; onManage: (event: MouseEvent<HTMLButtonElement>) => void;
  onActivity: () => void; onUnlink: () => void;
}
```

## apps/web/src/components/products/ListingSaveSummary.tsx

Nguồn: [apps/web/src/components/products/ListingSaveSummary.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSaveSummary.tsx)

### ListingSaveSummary

[apps/web/src/components/products/ListingSaveSummary.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSaveSummary.tsx#L12)

```tsx
{ product, baseline, sources, mappings, listingDrafts, editing, creating, confirmLabel, onBack, onConfirm }: {
  product: Product; baseline?: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  editing: boolean; creating: boolean; confirmLabel: string; onBack: () => void; onConfirm: () => void;
  listingDrafts?: Record<string, ListingDraftValues>;
}
```

## apps/web/src/components/products/ListingShopValue.tsx

Nguồn: [apps/web/src/components/products/ListingShopValue.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingShopValue.tsx)

### ListingShopValue

[apps/web/src/components/products/ListingShopValue.tsx:4](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingShopValue.tsx#L4)

```tsx
{ data, field }: { data: ListingShopData; field: 'price' | 'stock' }
```

## apps/web/src/components/products/ListingSkuMappings.tsx

Nguồn: [apps/web/src/components/products/ListingSkuMappings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSkuMappings.tsx)

### ListingSkuMappings

[apps/web/src/components/products/ListingSkuMappings.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSkuMappings.tsx#L10)

```tsx
{ product, sources, mappings, onChange, onReload, compact = false, focusRequest = 0, verifiedSingles = [] }: {
  product: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  onChange: (value: VariantMappings) => void;
  onReload?: (sourceId: string) => void;
  compact?: boolean;
  focusRequest?: number;
  verifiedSingles?: string[];
}
```

## apps/web/src/components/products/ListingSyncConfiguration.tsx

Nguồn: [apps/web/src/components/products/ListingSyncConfiguration.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSyncConfiguration.tsx)

### ListingSyncConfiguration

[apps/web/src/components/products/ListingSyncConfiguration.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ListingSyncConfiguration.tsx#L12)

```tsx
{ field, master, listing, draft, onChange }: {
  field: MasterSyncField; master: Product; listing: ChannelListing; draft: MasterSyncPreference;
  onChange: (patch: Partial<MasterSyncPreference>) => void;
}
```

## apps/web/src/components/products/MasterStatusHelp.tsx

Nguồn: [apps/web/src/components/products/MasterStatusHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/MasterStatusHelp.tsx)

### MasterStatusHelp

[apps/web/src/components/products/MasterStatusHelp.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/MasterStatusHelp.tsx#L15)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/products/ProductActivityHistory.tsx

Nguồn: [apps/web/src/components/products/ProductActivityHistory.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductActivityHistory.tsx)

### ProductActivityHistory

[apps/web/src/components/products/ProductActivityHistory.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductActivityHistory.tsx#L15)

```tsx
{ product, showDemoInitially = false, initialListingChannel, initialListingKey, initialRevisionId }: {
  product: Product; showDemoInitially?: boolean; initialListingChannel?: string | null; initialListingKey?: string | null; initialRevisionId?: string | null;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Scope = 'all' | 'master' | 'listing';
```

## apps/web/src/components/products/ProductChannelListings.tsx

Nguồn: [apps/web/src/components/products/ProductChannelListings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductChannelListings.tsx)

### ProductChannelListings

[apps/web/src/components/products/ProductChannelListings.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductChannelListings.tsx#L19)

```tsx
{ rows }: { rows: ProductChannelListingRow[] }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface ProductChannelListingRow {
  id: string;
  channelKey: string;
  channelLabel: string;
  shop: string;
  sku: string;
  context?: ReactNode;
  price: ReactNode;
  stock: ReactNode;
  status: ReactNode;
  actions: ReactNode;
  newlyLinked?: boolean;
}
```

## apps/web/src/components/products/ProductGettingStarted.tsx

Nguồn: [apps/web/src/components/products/ProductGettingStarted.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductGettingStarted.tsx)

### ProductGettingStarted

[apps/web/src/components/products/ProductGettingStarted.tsx:43](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductGettingStarted.tsx#L43)

```tsx
{ snapshot, pendingCount, createdCount = 0, sourceChannels = [], preview, onReview, onImport, onCreate, onRetry, onShops, onConnect }: {
  createdCount?: number;
  snapshot: ChannelSetupSnapshot; pendingCount: number;
  sourceChannels?: Array<{ key: string; label: string }>;
  preview?: ProductOnboardingPreview;
  onReview: () => void; onImport: () => void; onCreate: () => void; onRetry: () => void; onShops: () => void; onConnect: () => void;
}
```

## apps/web/src/components/products/ProductImagesEditor.tsx

Nguồn: [apps/web/src/components/products/ProductImagesEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductImagesEditor.tsx)

### ProductImagesEditor

[apps/web/src/components/products/ProductImagesEditor.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductImagesEditor.tsx#L20)

```tsx
{
  images,
  productId,
  userId,
  disabled,
  onChange,
  onUploaded,
}: ProductImagesEditorProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ProductImagesEditorProps {
  images: string[];
  productId: string;
  userId: string;
  disabled?: boolean;
  onChange: (images: string[]) => void;
  onUploaded: (upload: { path: string; url: string }) => void;
}
```

## apps/web/src/components/products/ProductLifecycleActions.tsx

Nguồn: [apps/web/src/components/products/ProductLifecycleActions.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductLifecycleActions.tsx)

### ProductLifecycleMenuItems

[apps/web/src/components/products/ProductLifecycleActions.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductLifecycleActions.tsx#L6)

```tsx
{ product, onAction, disabled = false }: {
  product: Product; onAction: (product: Product, action: ProductLifecycleAction) => void; disabled?: boolean;
}
```

## apps/web/src/components/products/ProductListingIntake.tsx

Nguồn: [apps/web/src/components/products/ProductListingIntake.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductListingIntake.tsx)

### ProductListingIntake

[apps/web/src/components/products/ProductListingIntake.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductListingIntake.tsx#L19)

```tsx
{ catalog = savedListingCatalog, onChanged, onOpenMaster, stayInQueue = false, onStageChange, onDirtyChange, guideActionContainer }: { catalog?: ListingIntakeCatalog; onChanged: (productIds: string[], created?: boolean) => void; onOpenMaster: (id: string) => void; stayInQueue?: boolean; onStageChange?: (stage: IntakeStage) => void; onDirtyChange?: (dirty: boolean) => void; guideActionContainer?: HTMLElement | null }
```

## apps/web/src/components/products/ProductMasterForm.tsx

Nguồn: [apps/web/src/components/products/ProductMasterForm.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductMasterForm.tsx)

### ProductMasterForm

[apps/web/src/components/products/ProductMasterForm.tsx:85](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductMasterForm.tsx#L85)

```tsx
{
  defaultValues,
  suggestedData,
  suggestedFields = [],
  onSubmit,
  onCancel,
  isLoading,
  productType = 'single',
  productId,
  userId,
  onImageUploaded,
}: ProductMasterFormProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type ProductFormValues = z.infer<typeof productSchema>;

interface SuggestedField {
  field: string;
  value: string | number;
}

interface ProductMasterFormProps {
  defaultValues?: Partial<ProductFormValues>;
  suggestedData?: AmazonCatalogProduct | null;
  suggestedFields?: SuggestedField[];
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  productType?: 'single' | 'variant' | 'bundle';
  productId?: string;
  userId?: string;
  onImageUploaded?: (upload: UploadedProductImage) => void;
}
```

## apps/web/src/components/products/ProductOverviewSnapshot.tsx

Nguồn: [apps/web/src/components/products/ProductOverviewSnapshot.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductOverviewSnapshot.tsx)

### ProductOverviewSnapshot

[apps/web/src/components/products/ProductOverviewSnapshot.tsx:50](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductOverviewSnapshot.tsx#L50)

```tsx
{ name, images, imageAltTexts, brand, category, productStructure, stock, price, listingCount, channelCount, translations, imported, source, onCommerce, onListings, onProductData, onSelectLocale, onReviewImportedLinks }: SnapshotProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface TranslationSummary {
  locale: string;
  label: string;
  status: 'complete' | 'partial' | 'missing';
}

interface SnapshotProps {
  name: string;
  images: readonly string[];
  imageAltTexts: readonly string[];
  brand: string;
  category: string;
  productStructure: string;
  stock: string;
  price: string;
  listingCount: number;
  channelCount: number;
  translations: TranslationSummary[];
  imported: boolean;
  source?: string | undefined;
  onCommerce: () => void;
  onListings: () => void;
  onProductData: () => void;
  onSelectLocale: (locale: string) => void;
  onReviewImportedLinks?: (() => void) | undefined;
}
```

## apps/web/src/components/products/ProductReadinessCard.tsx

Nguồn: [apps/web/src/components/products/ProductReadinessCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductReadinessCard.tsx)

### ProductReadinessCard

[apps/web/src/components/products/ProductReadinessCard.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductReadinessCard.tsx#L23)

```tsx
{ checks, isActive, onSelectCheck, onViewAll }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ReadinessCheck {
  id: string;
  label: string;
  done: boolean;
  workspace: string;
}

interface Props {
  checks: ReadinessCheck[];
  isActive: boolean;
  onSelectCheck: (id: string) => void;
  onViewAll: () => void;
}
```

## apps/web/src/components/products/ProductSalesPerformance.tsx

Nguồn: [apps/web/src/components/products/ProductSalesPerformance.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductSalesPerformance.tsx)

### ProductSalesPerformance

[apps/web/src/components/products/ProductSalesPerformance.tsx:36](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductSalesPerformance.tsx#L36)

```tsx
{ product, showDemoInitially = false, data, onReviewChannels, now: suppliedNow }: {
  product?: Product;
  showDemoInitially?: boolean;
  /** Real analytics must arrive through a shop-aware adapter, not the legacy SKU-only OMS store. */
  data?: ProductSalesData;
  onReviewChannels: () => void;
  now?: Date;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type SalesRow = ReturnType<typeof summarizeProductSales>['rows'][number];
```

## apps/web/src/components/products/ProductWorkspaceHelp.tsx

Nguồn: [apps/web/src/components/products/ProductWorkspaceHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductWorkspaceHelp.tsx)

### ProductWorkspaceHelp

[apps/web/src/components/products/ProductWorkspaceHelp.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ProductWorkspaceHelp.tsx#L23)

```tsx
{ scope }: { scope: WorkspaceScope }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type WorkspaceScope = 'master' | 'listings';
```

## apps/web/src/components/products/SalesMetricHelp.tsx

Nguồn: [apps/web/src/components/products/SalesMetricHelp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SalesMetricHelp.tsx)

### SalesMetricHelp

[apps/web/src/components/products/SalesMetricHelp.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SalesMetricHelp.tsx#L7)

```tsx
{ label, description }: { label: string; description: string }
```

## apps/web/src/components/products/SelectVariantsDialog.tsx

Nguồn: [apps/web/src/components/products/SelectVariantsDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectVariantsDialog.tsx)

### SelectVariantsDialog

[apps/web/src/components/products/SelectVariantsDialog.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectVariantsDialog.tsx#L19)

```tsx
{
  open,
  product,
  onSelect,
  onCancel,
}: SelectVariantsDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SelectVariantsDialogProps {
  open: boolean;
  product: {
    title: string;
    asin: string;
    images: string[];
    variants?: AmazonVariant[];
  } | null;
  onSelect: (variants: AmazonVariant[]) => void;
  onCancel: () => void;
}
```

## apps/web/src/components/products/SelectedListingsOverview.tsx

Nguồn: [apps/web/src/components/products/SelectedListingsOverview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectedListingsOverview.tsx)

### SelectedListingsOverview

[apps/web/src/components/products/SelectedListingsOverview.tsx:25](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SelectedListingsOverview.tsx#L25)

```tsx
{ listings, activeIndex, reviewedIds = [], onView }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = {
  listings: CatalogImportItem[];
  activeIndex?: number;
  reviewedIds?: string[];
  onView?: (index: number) => void;
};
```

## apps/web/src/components/products/ShopListingEditor.tsx

Nguồn: [apps/web/src/components/products/ShopListingEditor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ShopListingEditor.tsx)

### ShopListingEditor

[apps/web/src/components/products/ShopListingEditor.tsx:68](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/ShopListingEditor.tsx#L68)

```tsx
{ product, listing, channelLabel, shopLabel, onClose, restoreFocus, onSave }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface Props {
  product: Product;
  listing: ChannelListing;
  channelLabel: string;
  shopLabel?: string;
  onClose: () => void;
  restoreFocus: () => void;
  onSave: (patch: ListingDraftValues, snapshot: string, syncChange?: ListingSyncDraft) => void;
}

type Tab = typeof tabs[number];

type Form = ReturnType<typeof toForm>;
```

## apps/web/src/components/products/SuggestedListingLinksDialog.tsx

Nguồn: [apps/web/src/components/products/SuggestedListingLinksDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SuggestedListingLinksDialog.tsx)

### SuggestedListingLinksDialog

[apps/web/src/components/products/SuggestedListingLinksDialog.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/SuggestedListingLinksDialog.tsx#L14)

```tsx
{ catalog, pairs, onClose, onSaved }: {
  catalog?: ListingIntakeCatalog;
  pairs: SuggestedLinkPreview[];
  onClose: () => void;
  onSaved: (result: ReturnType<typeof confirmSuggestedListingLinks>) => void;
}
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type SuggestedLinkPreview = { listing: CatalogImportItem; master: Product; review: ListingMatchReview };
```

## apps/web/src/components/products/VariantInventoryDetails.tsx

Nguồn: [apps/web/src/components/products/VariantInventoryDetails.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariantInventoryDetails.tsx)

### VariantInventoryDetails

[apps/web/src/components/products/VariantInventoryDetails.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariantInventoryDetails.tsx#L11)

```tsx
{ name, product, view, canWrite, onAdd, onAdjust }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type Props = { name: string; product?: Product | null; view: VariantInventoryView; canWrite: boolean; onAdd: () => void; onAdjust: (warehouseId: string) => void };
```

## apps/web/src/components/products/VariationThemeBuilder.tsx

Nguồn: [apps/web/src/components/products/VariationThemeBuilder.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariationThemeBuilder.tsx)

### VariationThemeBuilder

[apps/web/src/components/products/VariationThemeBuilder.tsx:36](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/products/VariationThemeBuilder.tsx#L36)

```tsx
{ 
  baseSku, 
  basePrice, 
  onGenerate,
  existingVariantCount = 0,
  catalogVariationTheme,
  catalogVariants,
}: VariationThemeBuilderProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface VariationThemeBuilderProps {
  baseSku: string;
  basePrice: number;
  onGenerate: (variants: GeneratedVariant[]) => void;
  existingVariantCount?: number;
  catalogVariationTheme?: string;
  catalogVariants?: CatalogVariant[];
}
```

## apps/web/src/components/routing/LegacyEntityRedirect.tsx

Nguồn: [apps/web/src/components/routing/LegacyEntityRedirect.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/routing/LegacyEntityRedirect.tsx)

### LegacyPathRedirect

[apps/web/src/components/routing/LegacyEntityRedirect.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/routing/LegacyEntityRedirect.tsx#L3)

```tsx
{ to }: { to: string }
```

### LegacyEntityRedirect

[apps/web/src/components/routing/LegacyEntityRedirect.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/routing/LegacyEntityRedirect.tsx#L16)

```tsx
{ basePath }: { basePath: string }
```

## apps/web/src/components/seller-onboarding/SellerSetupFields.tsx

Nguồn: [apps/web/src/components/seller-onboarding/SellerSetupFields.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/seller-onboarding/SellerSetupFields.tsx)

### SellerSetupFields

[apps/web/src/components/seller-onboarding/SellerSetupFields.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/seller-onboarding/SellerSetupFields.tsx#L31)

```tsx
{ data, update, toggleChannel }: Props
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface Props {
  data: SellerDemo;
  update: (patch: Partial<SellerDemo>) => void;
  toggleChannel: (channel: string) => void;
}
```

## apps/web/src/components/settings/PricingRuleDialog.tsx

Nguồn: [apps/web/src/components/settings/PricingRuleDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/PricingRuleDialog.tsx)

### PricingRuleDialog

[apps/web/src/components/settings/PricingRuleDialog.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/PricingRuleDialog.tsx#L7)

```tsx
{ rule, baseCurrency = 'JPY', targetCurrency = 'VND', onClose, onSaved }: { rule?: PricingRule; baseCurrency?: string; targetCurrency?: string; onClose: () => void; onSaved: (rule: PricingRule) => void }
```

## apps/web/src/components/settings/ShopPricingSettings.tsx

Nguồn: [apps/web/src/components/settings/ShopPricingSettings.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/ShopPricingSettings.tsx)

### ShopPricingSettings

[apps/web/src/components/settings/ShopPricingSettings.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/ShopPricingSettings.tsx#L8)

```tsx
{ shopId, label, currency = '', baseCurrency, onSaved }: { shopId: string; label: string; currency?: string; baseCurrency?: string; onSaved?: () => void }
```

## apps/web/src/components/settings/TeamAccessConfiguration.tsx

Nguồn: [apps/web/src/components/settings/TeamAccessConfiguration.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/TeamAccessConfiguration.tsx)

### TeamAccessConfiguration

[apps/web/src/components/settings/TeamAccessConfiguration.tsx:38](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/settings/TeamAccessConfiguration.tsx#L38)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/shared/ChannelSourceFilter.tsx

Nguồn: [apps/web/src/components/shared/ChannelSourceFilter.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/ChannelSourceFilter.tsx)

### ChannelSourceFilter

[apps/web/src/components/shared/ChannelSourceFilter.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/ChannelSourceFilter.tsx#L14)

```tsx
{ value, onChange, counts }: { value: ChannelSource; onChange: (value: ChannelSource) => void; counts?: Partial<Record<ChannelSource, number>> }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type ChannelSource = 'all' | 'primeweb' | 'pos' | 'shopee' | 'social';
```

## apps/web/src/components/shared/OverviewDemoMode.tsx

Nguồn: [apps/web/src/components/shared/OverviewDemoMode.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/OverviewDemoMode.tsx)

### OverviewDemoMode

[apps/web/src/components/shared/OverviewDemoMode.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/OverviewDemoMode.tsx#L8)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

### OverviewNoData

[apps/web/src/components/shared/OverviewDemoMode.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/OverviewDemoMode.tsx#L31)

```tsx
{ analytics = false }: { analytics?: boolean }
```

## apps/web/src/components/shared/SeedDemoDataButton.tsx

Nguồn: [apps/web/src/components/shared/SeedDemoDataButton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedDemoDataButton.tsx)

### SeedDemoDataButton

[apps/web/src/components/shared/SeedDemoDataButton.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedDemoDataButton.tsx#L15)

```tsx
{ 
  onSeeded, 
  variant = 'outline',
  size = 'sm',
  label = 'Add Demo Data'
}: SeedDemoDataButtonProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SeedDemoDataButtonProps {
  onSeeded?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
}
```

## apps/web/src/components/shared/SeedFullDemoButton.tsx

Nguồn: [apps/web/src/components/shared/SeedFullDemoButton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedFullDemoButton.tsx)

### SeedFullDemoButton

[apps/web/src/components/shared/SeedFullDemoButton.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/shared/SeedFullDemoButton.tsx#L13)

```tsx
{ onSeeded }: SeedFullDemoButtonProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SeedFullDemoButtonProps {
  onSeeded?: () => void;
}
```

## apps/web/src/components/system/ActionToolbar.tsx

Nguồn: [apps/web/src/components/system/ActionToolbar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ActionToolbar.tsx)

### ActionToolbar

[apps/web/src/components/system/ActionToolbar.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ActionToolbar.tsx#L10)

```tsx
{ children, className, alwaysVisible = false }: ActionToolbarProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ActionToolbarProps {
  children: ReactNode;
  className?: string;
  alwaysVisible?: boolean;
}
```

## apps/web/src/components/system/AlertSeverityBadge.tsx

Nguồn: [apps/web/src/components/system/AlertSeverityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/AlertSeverityBadge.tsx)

### AlertSeverityBadge

[apps/web/src/components/system/AlertSeverityBadge.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/AlertSeverityBadge.tsx#L18)

```tsx
{ severity, className }: AlertSeverityBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}
```

## apps/web/src/components/system/ChannelBadge.tsx

Nguồn: [apps/web/src/components/system/ChannelBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBadge.tsx)

### ChannelBadge

[apps/web/src/components/system/ChannelBadge.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBadge.tsx#L12)

```tsx
{ platform, channel, className }: ChannelBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ChannelBadgeProps {
  platform?: string;
  channel?: string;
  className?: string;
}
```

## apps/web/src/components/system/ChannelBrand.tsx

Nguồn: [apps/web/src/components/system/ChannelBrand.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBrand.tsx)

### ChannelMark

[apps/web/src/components/system/ChannelBrand.tsx:184](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBrand.tsx#L184)

```tsx
{ channel, className }: ChannelBrandProps
```

### ChannelWordmark

[apps/web/src/components/system/ChannelBrand.tsx:193](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBrand.tsx#L193)

```tsx
{ channel, className }: ChannelBrandProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type ChannelBrand = 'amazon' | 'shopee' | 'rakuten' | 'website' | 'tiktok' | 'manual';

interface ChannelBrandProps {
  channel: string;
  className?: string;
}
```

## apps/web/src/components/system/ConfirmDialog.tsx

Nguồn: [apps/web/src/components/system/ConfirmDialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ConfirmDialog.tsx)

### ConfirmDialog

[apps/web/src/components/system/ConfirmDialog.tsx:28](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ConfirmDialog.tsx#L28)

```tsx
{
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  confirmingText = 'Confirming...',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  isConfirming = false,
}: ConfirmDialogProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmText?: string
  confirmingText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
  isConfirming?: boolean
}
```

## apps/web/src/components/system/DataTable.tsx

Nguồn: [apps/web/src/components/system/DataTable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DataTable.tsx)

### DataTable

[apps/web/src/components/system/DataTable.tsx:46](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DataTable.tsx#L46)

```tsx
{
    columns,
    data,
    keyExtractor,
    isLoading,
    emptyState,
    onRowClick,
    totalCount,
    className,
    variant = "index",
    wrapperClassName,
    rowClassName,
    rowHref,
    rowState,
    rowLabel,
    emptyTitle = "No records found",
    emptyDescription = "There is no data to display right now.",
    emptyVariant = "empty",
}: DataTableProps<T>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface Column<T> {
    header: ReactNode
    accessor_key?: keyof T
    cell?: (item: T) => ReactNode
    className?: string
    headerClassName?: string
    cellClassName?: string
    width?: string
}

export interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    keyExtractor: (item: T) => string
    isLoading?: boolean
    emptyState?: ReactNode
    onRowClick?: (item: T) => void
    totalCount?: number
    className?: string
    variant?: TableVariant
    wrapperClassName?: string
    rowClassName?: string | ((item: T) => string)
    rowHref?: (item: T) => string | undefined
    rowState?: (item: T) => unknown
    rowLabel?: (item: T) => string
    emptyTitle?: string
    emptyDescription?: string
    emptyVariant?: 'empty' | 'filtered' | 'unavailable' | 'error'
}
```

## apps/web/src/components/system/DetailInfoCard.tsx

Nguồn: [apps/web/src/components/system/DetailInfoCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DetailInfoCard.tsx)

### DetailInfoCard

[apps/web/src/components/system/DetailInfoCard.tsx:16](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/DetailInfoCard.tsx#L16)

```tsx
{
  label,
  value,
  meta,
  className,
  valueClassName,
  tone = 'default',
  truncate = true,
}: DetailInfoCardProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface DetailInfoCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  className?: string;
  valueClassName?: string;
  tone?: SemanticTone | 'default';
  truncate?: boolean;
}
```

## apps/web/src/components/system/EmptyState.tsx

Nguồn: [apps/web/src/components/system/EmptyState.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/EmptyState.tsx)

### EmptyState

[apps/web/src/components/system/EmptyState.tsx:21](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/EmptyState.tsx#L21)

```tsx
{
  title,
  description,
  icon,
  action,
  className,
  variant = 'empty',
}: EmptyStateProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
    variant?: 'empty' | 'filtered' | 'unavailable' | 'error';
}
```

## apps/web/src/components/system/FiltersBar.tsx

Nguồn: [apps/web/src/components/system/FiltersBar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/FiltersBar.tsx)

### FiltersBar

[apps/web/src/components/system/FiltersBar.tsx:81](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/FiltersBar.tsx#L81)

```tsx
{
  children,
  className,
  actions,
  search,
  primaryFilters,
  secondaryFilters,
  resultCount,
  clearAll,
}: FiltersBarProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
  activeClassName?: string;
  inactiveClassName?: string;
}

interface FilterGroupConfig {
  value: string;
  onChange: (value: string) => void;
  options: FilterPillOption[];
  label?: string;
  allowToggleOff?: boolean;
}

interface FilterSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  className?: string;
}

export interface FiltersBarProps {
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
  search?: FilterSearchConfig;
  primaryFilters?: FilterGroupConfig;
  secondaryFilters?: FilterGroupConfig;
  resultCount?: string;
  clearAll?: () => void;
}
```

## apps/web/src/components/system/PageDataState.tsx

Nguồn: [apps/web/src/components/system/PageDataState.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageDataState.tsx)

### PageDataState

[apps/web/src/components/system/PageDataState.tsx:44](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageDataState.tsx#L44)

```tsx
{
  data,
  isLoading,
  error,
  refetch,
  emptyTitle = "No data yet",
  emptyDescription,
  isEmpty,
  skeleton,
  emptyIcon,
  mode = 'page',
  className,
  children,
}: PageDataStateProps<T>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PageDataStateProps<T> {
  /** Data returned from useQuery */
  data: T | undefined;
  /** isLoading from useQuery */
  isLoading: boolean;
  /** error from useQuery */
  error: Error | null;
  /** refetch function from useQuery */
  refetch: () => void;
  /** Title for empty state */
  emptyTitle?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Custom check if data is "empty" (e.g. array length === 0) */
  isEmpty?: (data: T) => boolean;
  /** Custom skeleton to render during initial load */
  skeleton?: ReactNode;
  /** Icon for empty state */
  emptyIcon?: ReactNode;
  /** Render density */
  mode?: 'page' | 'section';
  className?: string;
  /** Render function — only called when data exists */
  children: (data: T) => ReactNode;
}
```

## apps/web/src/components/system/PageHeader.tsx

Nguồn: [apps/web/src/components/system/PageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageHeader.tsx)

### PageHeader

[apps/web/src/components/system/PageHeader.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PageHeader.tsx#L13)

```tsx
{ title, description, actions, className }: PageHeaderProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}
```

## apps/web/src/components/system/PriorityBadge.tsx

Nguồn: [apps/web/src/components/system/PriorityBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PriorityBadge.tsx)

### PriorityBadge

[apps/web/src/components/system/PriorityBadge.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/PriorityBadge.tsx#L11)

```tsx
{ priority, className, fallbackLabel = '—' }: PriorityBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface PriorityBadgeProps {
  priority: string | null | undefined;
  className?: string;
  fallbackLabel?: string;
}
```

## apps/web/src/components/system/SkuBadge.tsx

Nguồn: [apps/web/src/components/system/SkuBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SkuBadge.tsx)

### SkuBadge

[apps/web/src/components/system/SkuBadge.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SkuBadge.tsx#L23)

```tsx
{
  sku,
  tone = 'default',
  size = 'default',
  className,
}: SkuBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SkuBadgeProps {
  sku: string | null | undefined;
  tone?: 'default' | 'variant';
  size?: 'default' | 'compact';
  className?: string;
}
```

## apps/web/src/components/system/SlaIndicator.tsx

Nguồn: [apps/web/src/components/system/SlaIndicator.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SlaIndicator.tsx)

### SlaIndicator

[apps/web/src/components/system/SlaIndicator.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SlaIndicator.tsx#L14)

```tsx
{
  state,
  className,
  label,
  variant = 'badge',
  showIcon = true,
}: SlaIndicatorProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SlaIndicatorProps {
  state: SlaState;
  className?: string;
  label?: string;
  variant?: 'badge' | 'text';
  showIcon?: boolean;
}
```

## apps/web/src/components/system/StatusBadge.tsx

Nguồn: [apps/web/src/components/system/StatusBadge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/StatusBadge.tsx)

### StatusBadge

[apps/web/src/components/system/StatusBadge.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/StatusBadge.tsx#L12)

```tsx
{ status, domain, className, fallbackLabel }: StatusBadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface StatusBadgeProps {
  status: string;
  domain?: StatusDomain;
  className?: string;
  fallbackLabel?: string;
}
```

## apps/web/src/components/system/SummaryMetricCard.tsx

Nguồn: [apps/web/src/components/system/SummaryMetricCard.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SummaryMetricCard.tsx)

### SummaryMetricCard

[apps/web/src/components/system/SummaryMetricCard.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SummaryMetricCard.tsx#L26)

```tsx
{
  label,
  value,
  meta,
  metaTooltip,
  status,
  icon,
  tone = 'muted',
  className,
  valueClassName,
  loading = false,
}: SummaryMetricCardProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SummaryMetricCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  metaTooltip?: ReactNode;
  status?: ReactNode;
  icon?: ReactNode;
  tone?: SemanticTone;
  className?: string;
  valueClassName?: string;
  loading?: boolean;
}
```

## apps/web/src/components/system/SystemPageHeader.tsx

Nguồn: [apps/web/src/components/system/SystemPageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SystemPageHeader.tsx)

### SystemPageHeader

[apps/web/src/components/system/SystemPageHeader.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/SystemPageHeader.tsx#L20)

```tsx
{
  title,
  description,
  icon: Icon,
  metadata,
  status,
  primaryAction,
  secondaryActions,
  navigation,
  variant = 'workspace',
  className,
}: SystemPageHeaderProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type SystemPageHeaderVariant = 'workspace' | 'collection' | 'detail';

interface SystemPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  metadata?: ReactNode;
  status?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  navigation?: ReactNode;
  variant?: SystemPageHeaderVariant;
  className?: string;
}
```

## apps/web/src/components/system/ThemeModeSwitcher.tsx

Nguồn: [apps/web/src/components/system/ThemeModeSwitcher.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ThemeModeSwitcher.tsx)

### ThemeModeSwitcher

[apps/web/src/components/system/ThemeModeSwitcher.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ThemeModeSwitcher.tsx#L23)

```tsx
{ compact = false, className }: ThemeModeSwitcherProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface ThemeModeSwitcherProps {
  compact?: boolean;
  className?: string;
}
```

## apps/web/src/components/system/UserFeedbackWidget.tsx

Nguồn: [apps/web/src/components/system/UserFeedbackWidget.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/UserFeedbackWidget.tsx)

### UserFeedbackWidget

[apps/web/src/components/system/UserFeedbackWidget.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/UserFeedbackWidget.tsx#L26)

```tsx
{ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }
```

## apps/web/src/components/system/WorkspacePageHeader.tsx

Nguồn: [apps/web/src/components/system/WorkspacePageHeader.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/WorkspacePageHeader.tsx)

### WorkspacePageHeader

[apps/web/src/components/system/WorkspacePageHeader.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/WorkspacePageHeader.tsx#L14)

```tsx
{
  title,
  description,
  icon: Icon,
  titleAccessory,
  actions,
  className,
}: WorkspacePageHeaderProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface WorkspacePageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  titleAccessory?: ReactNode;
  actions?: ReactNode;
  className?: string;
}
```

## apps/web/src/components/system/surfaces/PanelSurfaces.tsx

Nguồn: [apps/web/src/components/system/surfaces/PanelSurfaces.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx)

### GlassPanel

[apps/web/src/components/system/surfaces/PanelSurfaces.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx#L6)

```tsx
{ className, ...props }: DivProps
```

### SolidPanel

[apps/web/src/components/system/surfaces/PanelSurfaces.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx#L10)

```tsx
{ className, ...props }: DivProps
```

### ToolbarSurface

[apps/web/src/components/system/surfaces/PanelSurfaces.tsx:14](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx#L14)

```tsx
{ className, ...props }: DivProps
```

### WorkspacePane

[apps/web/src/components/system/surfaces/PanelSurfaces.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/surfaces/PanelSurfaces.tsx#L18)

```tsx
{ className, ...props }: DivProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type DivProps = React.HTMLAttributes<HTMLDivElement>;
```

## apps/web/src/components/theme-provider.tsx

Nguồn: [apps/web/src/components/theme-provider.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/theme-provider.tsx)

### ThemeProvider

[apps/web/src/components/theme-provider.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/theme-provider.tsx#L23)

```tsx
{ children, defaultTheme = 'dark', storageKey = 'vite-ui-theme', ...props }: ThemeProviderProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type Theme = 'dark' | 'light' | 'system';

type ResolvedTheme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};
```

## apps/web/src/components/ui/accordion.tsx

Nguồn: [apps/web/src/components/ui/accordion.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx)

### Accordion

[apps/web/src/components/ui/accordion.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx#L7)

```tsx
Alias → AccordionPrimitive.Root
```

### AccordionItem

[apps/web/src/components/ui/accordion.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx#L9)

```tsx
React.ElementRef<typeof AccordionPrimitive.Item>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
```

### AccordionTrigger

[apps/web/src/components/ui/accordion.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx#L17)

```tsx
React.ElementRef<typeof AccordionPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
```

### AccordionContent

[apps/web/src/components/ui/accordion.tsx:37](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx#L37)

```tsx
React.ElementRef<typeof AccordionPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
```

## apps/web/src/components/ui/alert-dialog.tsx

Nguồn: [apps/web/src/components/ui/alert-dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx)

### AlertDialog

[apps/web/src/components/ui/alert-dialog.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L7)

```tsx
Alias → AlertDialogPrimitive.Root
```

### AlertDialogTrigger

[apps/web/src/components/ui/alert-dialog.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L8)

```tsx
Alias → AlertDialogPrimitive.Trigger
```

### AlertDialogPortal

[apps/web/src/components/ui/alert-dialog.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L9)

```tsx
Alias → AlertDialogPrimitive.Portal
```

### AlertDialogOverlay

[apps/web/src/components/ui/alert-dialog.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L11)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
```

### AlertDialogContent

[apps/web/src/components/ui/alert-dialog.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L26)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
```

### AlertDialogHeader

[apps/web/src/components/ui/alert-dialog.tsx:44](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L44)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### AlertDialogFooter

[apps/web/src/components/ui/alert-dialog.tsx:49](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L49)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### AlertDialogTitle

[apps/web/src/components/ui/alert-dialog.tsx:54](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L54)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
```

### AlertDialogDescription

[apps/web/src/components/ui/alert-dialog.tsx:62](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L62)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
```

### AlertDialogAction

[apps/web/src/components/ui/alert-dialog.tsx:70](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L70)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Action>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
```

### AlertDialogCancel

[apps/web/src/components/ui/alert-dialog.tsx:78](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx#L78)

```tsx
React.ElementRef<typeof AlertDialogPrimitive.Cancel>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
```

## apps/web/src/components/ui/alert.tsx

Nguồn: [apps/web/src/components/ui/alert.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx)

### Alert

[apps/web/src/components/ui/alert.tsx:21](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx#L21)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
```

### AlertTitle

[apps/web/src/components/ui/alert.tsx:29](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx#L29)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>
```

### AlertDescription

[apps/web/src/components/ui/alert.tsx:36](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx#L36)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
```

## apps/web/src/components/ui/aspect-ratio.tsx

Nguồn: [apps/web/src/components/ui/aspect-ratio.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/aspect-ratio.tsx)

### AspectRatio

[apps/web/src/components/ui/aspect-ratio.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/aspect-ratio.tsx#L3)

```tsx
Alias → AspectRatioPrimitive.Root
```

## apps/web/src/components/ui/avatar.tsx

Nguồn: [apps/web/src/components/ui/avatar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx)

### Avatar

[apps/web/src/components/ui/avatar.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx#L6)

```tsx
React.ElementRef<typeof AvatarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
```

### AvatarImage

[apps/web/src/components/ui/avatar.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx#L18)

```tsx
React.ElementRef<typeof AvatarPrimitive.Image>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
```

### AvatarFallback

[apps/web/src/components/ui/avatar.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx#L26)

```tsx
React.ElementRef<typeof AvatarPrimitive.Fallback>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
```

## apps/web/src/components/ui/badge.tsx

Nguồn: [apps/web/src/components/ui/badge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/badge.tsx)

### Badge

[apps/web/src/components/ui/badge.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/badge.tsx#L26)

```tsx
{ className, variant, ...props }: BadgeProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        warning: "border-warning/25 bg-warning/10 text-warning",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
```

## apps/web/src/components/ui/breadcrumb.tsx

Nguồn: [apps/web/src/components/ui/breadcrumb.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx)

### Breadcrumb

[apps/web/src/components/ui/breadcrumb.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L7)

```tsx
HTMLElement, React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode;
  }
```

### BreadcrumbList

[apps/web/src/components/ui/breadcrumb.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L15)

```tsx
HTMLOListElement, React.ComponentPropsWithoutRef<"ol">
```

### BreadcrumbItem

[apps/web/src/components/ui/breadcrumb.tsx:29](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L29)

```tsx
HTMLLIElement, React.ComponentPropsWithoutRef<"li">
```

### BreadcrumbLink

[apps/web/src/components/ui/breadcrumb.tsx:36](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L36)

```tsx
HTMLAnchorElement, React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
```

### BreadcrumbPage

[apps/web/src/components/ui/breadcrumb.tsx:48](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L48)

```tsx
HTMLSpanElement, React.ComponentPropsWithoutRef<"span">
```

### BreadcrumbSeparator

[apps/web/src/components/ui/breadcrumb.tsx:62](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L62)

```tsx
{ children, className, ...props }: React.ComponentProps<"li">
```

### BreadcrumbEllipsis

[apps/web/src/components/ui/breadcrumb.tsx:69](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx#L69)

```tsx
{ className, ...props }: React.ComponentProps<"span">
```

## apps/web/src/components/ui/button.tsx

Nguồn: [apps/web/src/components/ui/button.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/button.tsx)

### Button

[apps/web/src/components/ui/button.tsx:44](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/button.tsx#L44)

```tsx
HTMLButtonElement, ButtonProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
```

## apps/web/src/components/ui/calendar.tsx

Nguồn: [apps/web/src/components/ui/calendar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/calendar.tsx)

### Calendar

[apps/web/src/components/ui/calendar.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/calendar.tsx#L10)

```tsx
{ className, classNames, showOutsideDays = true, ...props }: CalendarProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type CalendarProps = React.ComponentProps<typeof DayPicker>;
```

## apps/web/src/components/ui/card.tsx

Nguồn: [apps/web/src/components/ui/card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx)

### Card

[apps/web/src/components/ui/card.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L5)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### CardHeader

[apps/web/src/components/ui/card.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L17)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### CardTitle

[apps/web/src/components/ui/card.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L24)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>
```

### CardDescription

[apps/web/src/components/ui/card.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L31)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>
```

### CardContent

[apps/web/src/components/ui/card.tsx:38](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L38)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### CardFooter

[apps/web/src/components/ui/card.tsx:43](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx#L43)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

## apps/web/src/components/ui/carousel.tsx

Nguồn: [apps/web/src/components/ui/carousel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx)

### Carousel

[apps/web/src/components/ui/carousel.tsx:41](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx#L41)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CarouselProps
```

### CarouselContent

[apps/web/src/components/ui/carousel.tsx:134](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx#L134)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### CarouselItem

[apps/web/src/components/ui/carousel.tsx:151](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx#L151)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### CarouselPrevious

[apps/web/src/components/ui/carousel.tsx:168](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx#L168)

```tsx
HTMLButtonElement, React.ComponentProps<typeof Button>
```

### CarouselNext

[apps/web/src/components/ui/carousel.tsx:196](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx#L196)

```tsx
HTMLButtonElement, React.ComponentProps<typeof Button>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type CarouselApi = UseEmblaCarouselType[1];

type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;

type CarouselOptions = UseCarouselParameters[0];

type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;
```

## apps/web/src/components/ui/chart.tsx

Nguồn: [apps/web/src/components/ui/chart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx)

### ChartContainer

[apps/web/src/components/ui/chart.tsx:32](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L32)

```tsx
HTMLDivElement, React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
```

### ChartStyle

[apps/web/src/components/ui/chart.tsx:63](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L63)

```tsx
{ id, config }: { id: string; config: ChartConfig }
```

### ChartTooltip

[apps/web/src/components/ui/chart.tsx:92](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L92)

```tsx
Alias → RechartsPrimitive.Tooltip
```

### ChartTooltipContent

[apps/web/src/components/ui/chart.tsx:94](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L94)

```tsx
HTMLDivElement, React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }
```

### ChartLegend

[apps/web/src/components/ui/chart.tsx:230](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L230)

```tsx
Alias → RechartsPrimitive.Legend
```

### ChartLegendContent

[apps/web/src/components/ui/chart.tsx:232](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx#L232)

```tsx
HTMLDivElement, React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean;
    nameKey?: string;
  }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};
```

## apps/web/src/components/ui/checkbox.tsx

Nguồn: [apps/web/src/components/ui/checkbox.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/checkbox.tsx)

### Checkbox

[apps/web/src/components/ui/checkbox.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/checkbox.tsx#L7)

```tsx
React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
```

## apps/web/src/components/ui/collapsible.tsx

Nguồn: [apps/web/src/components/ui/collapsible.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx)

### Collapsible

[apps/web/src/components/ui/collapsible.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx#L3)

```tsx
Alias → CollapsiblePrimitive.Root
```

### CollapsibleTrigger

[apps/web/src/components/ui/collapsible.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx#L5)

```tsx
Alias → CollapsiblePrimitive.CollapsibleTrigger
```

### CollapsibleContent

[apps/web/src/components/ui/collapsible.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx#L7)

```tsx
Alias → CollapsiblePrimitive.CollapsibleContent
```

## apps/web/src/components/ui/command.tsx

Nguồn: [apps/web/src/components/ui/command.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx)

### Command

[apps/web/src/components/ui/command.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L9)

```tsx
React.ElementRef<typeof CommandPrimitive>, React.ComponentPropsWithoutRef<typeof CommandPrimitive>
```

### CommandDialog

[apps/web/src/components/ui/command.tsx:26](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L26)

```tsx
{ children, ...props }: CommandDialogProps
```

### CommandInput

[apps/web/src/components/ui/command.tsx:39](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L39)

```tsx
React.ElementRef<typeof CommandPrimitive.Input>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
```

### CommandList

[apps/web/src/components/ui/command.tsx:58](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L58)

```tsx
React.ElementRef<typeof CommandPrimitive.List>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
```

### CommandEmpty

[apps/web/src/components/ui/command.tsx:71](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L71)

```tsx
React.ElementRef<typeof CommandPrimitive.Empty>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
```

### CommandGroup

[apps/web/src/components/ui/command.tsx:78](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L78)

```tsx
React.ElementRef<typeof CommandPrimitive.Group>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
```

### CommandSeparator

[apps/web/src/components/ui/command.tsx:94](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L94)

```tsx
React.ElementRef<typeof CommandPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
```

### CommandItem

[apps/web/src/components/ui/command.tsx:102](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L102)

```tsx
React.ElementRef<typeof CommandPrimitive.Item>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
```

### CommandShortcut

[apps/web/src/components/ui/command.tsx:118](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx#L118)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLSpanElement>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type CommandDialogProps = DialogProps;
```

## apps/web/src/components/ui/context-menu.tsx

Nguồn: [apps/web/src/components/ui/context-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx)

### ContextMenu

[apps/web/src/components/ui/context-menu.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L7)

```tsx
Alias → ContextMenuPrimitive.Root
```

### ContextMenuTrigger

[apps/web/src/components/ui/context-menu.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L9)

```tsx
Alias → ContextMenuPrimitive.Trigger
```

### ContextMenuGroup

[apps/web/src/components/ui/context-menu.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L11)

```tsx
Alias → ContextMenuPrimitive.Group
```

### ContextMenuPortal

[apps/web/src/components/ui/context-menu.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L13)

```tsx
Alias → ContextMenuPrimitive.Portal
```

### ContextMenuSub

[apps/web/src/components/ui/context-menu.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L15)

```tsx
Alias → ContextMenuPrimitive.Sub
```

### ContextMenuRadioGroup

[apps/web/src/components/ui/context-menu.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L17)

```tsx
Alias → ContextMenuPrimitive.RadioGroup
```

### ContextMenuSubTrigger

[apps/web/src/components/ui/context-menu.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L19)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
```

### ContextMenuSubContent

[apps/web/src/components/ui/context-menu.tsx:40](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L40)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
```

### ContextMenuContent

[apps/web/src/components/ui/context-menu.tsx:55](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L55)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
```

### ContextMenuItem

[apps/web/src/components/ui/context-menu.tsx:72](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L72)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
```

### ContextMenuCheckboxItem

[apps/web/src/components/ui/context-menu.tsx:90](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L90)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
```

### ContextMenuRadioItem

[apps/web/src/components/ui/context-menu.tsx:113](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L113)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
```

### ContextMenuLabel

[apps/web/src/components/ui/context-menu.tsx:135](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L135)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.Label>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
```

### ContextMenuSeparator

[apps/web/src/components/ui/context-menu.tsx:149](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L149)

```tsx
React.ElementRef<typeof ContextMenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
```

### ContextMenuShortcut

[apps/web/src/components/ui/context-menu.tsx:157](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx#L157)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLSpanElement>
```

## apps/web/src/components/ui/demo.tsx

Nguồn: [apps/web/src/components/ui/demo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/demo.tsx)

### DemoOne

[apps/web/src/components/ui/demo.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/demo.tsx#L3)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/ui/dialog.tsx

Nguồn: [apps/web/src/components/ui/dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx)

### Dialog

[apps/web/src/components/ui/dialog.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L7)

```tsx
Alias → DialogPrimitive.Root
```

### DialogTrigger

[apps/web/src/components/ui/dialog.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L8)

```tsx
Alias → DialogPrimitive.Trigger
```

### DialogPortal

[apps/web/src/components/ui/dialog.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L9)

```tsx
Alias → DialogPrimitive.Portal
```

### DialogClose

[apps/web/src/components/ui/dialog.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L10)

```tsx
Alias → DialogPrimitive.Close
```

### DialogOverlay

[apps/web/src/components/ui/dialog.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L12)

```tsx
React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
```

### DialogContent

[apps/web/src/components/ui/dialog.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L31)

```tsx
React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps
```

### DialogHeader

[apps/web/src/components/ui/dialog.tsx:55](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L55)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### DialogFooter

[apps/web/src/components/ui/dialog.tsx:60](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L60)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### DialogTitle

[apps/web/src/components/ui/dialog.tsx:65](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L65)

```tsx
React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
```

### DialogDescription

[apps/web/src/components/ui/dialog.tsx:77](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx#L77)

```tsx
React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  overlayClassName?: string;
}
```

## apps/web/src/components/ui/drawer.tsx

Nguồn: [apps/web/src/components/ui/drawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx)

### Drawer

[apps/web/src/components/ui/drawer.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L6)

```tsx
{ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>
```

### DrawerTrigger

[apps/web/src/components/ui/drawer.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L11)

```tsx
Alias → DrawerPrimitive.Trigger
```

### DrawerPortal

[apps/web/src/components/ui/drawer.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L13)

```tsx
Alias → DrawerPrimitive.Portal
```

### DrawerClose

[apps/web/src/components/ui/drawer.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L15)

```tsx
Alias → DrawerPrimitive.Close
```

### DrawerOverlay

[apps/web/src/components/ui/drawer.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L17)

```tsx
React.ElementRef<typeof DrawerPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
```

### DrawerContent

[apps/web/src/components/ui/drawer.tsx:25](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L25)

```tsx
React.ElementRef<typeof DrawerPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
```

### DrawerHeader

[apps/web/src/components/ui/drawer.tsx:46](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L46)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### DrawerFooter

[apps/web/src/components/ui/drawer.tsx:51](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L51)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### DrawerTitle

[apps/web/src/components/ui/drawer.tsx:56](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L56)

```tsx
React.ElementRef<typeof DrawerPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
```

### DrawerDescription

[apps/web/src/components/ui/drawer.tsx:68](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx#L68)

```tsx
React.ElementRef<typeof DrawerPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
```

## apps/web/src/components/ui/dropdown-menu.tsx

Nguồn: [apps/web/src/components/ui/dropdown-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx)

### DropdownMenu

[apps/web/src/components/ui/dropdown-menu.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L7)

```tsx
Alias → DropdownMenuPrimitive.Root
```

### DropdownMenuTrigger

[apps/web/src/components/ui/dropdown-menu.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L9)

```tsx
Alias → DropdownMenuPrimitive.Trigger
```

### DropdownMenuGroup

[apps/web/src/components/ui/dropdown-menu.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L11)

```tsx
Alias → DropdownMenuPrimitive.Group
```

### DropdownMenuPortal

[apps/web/src/components/ui/dropdown-menu.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L13)

```tsx
Alias → DropdownMenuPrimitive.Portal
```

### DropdownMenuSub

[apps/web/src/components/ui/dropdown-menu.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L15)

```tsx
Alias → DropdownMenuPrimitive.Sub
```

### DropdownMenuRadioGroup

[apps/web/src/components/ui/dropdown-menu.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L17)

```tsx
Alias → DropdownMenuPrimitive.RadioGroup
```

### DropdownMenuSubTrigger

[apps/web/src/components/ui/dropdown-menu.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L19)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
```

### DropdownMenuSubContent

[apps/web/src/components/ui/dropdown-menu.tsx:40](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L40)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
```

### DropdownMenuContent

[apps/web/src/components/ui/dropdown-menu.tsx:55](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L55)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
```

### DropdownMenuItem

[apps/web/src/components/ui/dropdown-menu.tsx:73](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L73)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.Item>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
```

### DropdownMenuCheckboxItem

[apps/web/src/components/ui/dropdown-menu.tsx:91](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L91)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
```

### DropdownMenuRadioItem

[apps/web/src/components/ui/dropdown-menu.tsx:114](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L114)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
```

### DropdownMenuLabel

[apps/web/src/components/ui/dropdown-menu.tsx:136](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L136)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.Label>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
```

### DropdownMenuSeparator

[apps/web/src/components/ui/dropdown-menu.tsx:150](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L150)

```tsx
React.ElementRef<typeof DropdownMenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
```

### DropdownMenuShortcut

[apps/web/src/components/ui/dropdown-menu.tsx:158](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx#L158)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLSpanElement>
```

## apps/web/src/components/ui/form-field.tsx

Nguồn: [apps/web/src/components/ui/form-field.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form-field.tsx)

### FormField

[apps/web/src/components/ui/form-field.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form-field.tsx#L15)

```tsx
{ label, htmlFor, required, error, helper, children, className }: FormFieldProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}
```

## apps/web/src/components/ui/form.tsx

Nguồn: [apps/web/src/components/ui/form.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx)

### Form

[apps/web/src/components/ui/form.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L9)

```tsx
Alias → FormProvider
```

### FormField

[apps/web/src/components/ui/form.tsx:20](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L20)

```tsx
{
  ...props
}: ControllerProps<TFieldValues, TName>
```

### FormItem

[apps/web/src/components/ui/form.tsx:62](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L62)

```tsx
HTMLDivElement, React.HTMLAttributes<HTMLDivElement>
```

### FormLabel

[apps/web/src/components/ui/form.tsx:75](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L75)

```tsx
React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
```

### FormControl

[apps/web/src/components/ui/form.tsx:85](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L85)

```tsx
React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>
```

### FormDescription

[apps/web/src/components/ui/form.tsx:102](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L102)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>
```

### FormMessage

[apps/web/src/components/ui/form.tsx:111](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx#L111)

```tsx
HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

type FormItemContextValue = {
  id: string;
};
```

## apps/web/src/components/ui/hover-card.tsx

Nguồn: [apps/web/src/components/ui/hover-card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx)

### HoverCard

[apps/web/src/components/ui/hover-card.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx#L6)

```tsx
Alias → HoverCardPrimitive.Root
```

### HoverCardTrigger

[apps/web/src/components/ui/hover-card.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx#L8)

```tsx
Alias → HoverCardPrimitive.Trigger
```

### HoverCardContent

[apps/web/src/components/ui/hover-card.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx#L10)

```tsx
React.ElementRef<typeof HoverCardPrimitive.Content>, React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
```

## apps/web/src/components/ui/input-otp.tsx

Nguồn: [apps/web/src/components/ui/input-otp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx)

### InputOTP

[apps/web/src/components/ui/input-otp.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx#L7)

```tsx
React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>
```

### InputOTPGroup

[apps/web/src/components/ui/input-otp.tsx:19](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx#L19)

```tsx
React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">
```

### InputOTPSlot

[apps/web/src/components/ui/input-otp.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx#L24)

```tsx
React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div"> & { index: number }
```

### InputOTPSeparator

[apps/web/src/components/ui/input-otp.tsx:52](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx#L52)

```tsx
React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">
```

## apps/web/src/components/ui/input.tsx

Nguồn: [apps/web/src/components/ui/input.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input.tsx)

### Input

[apps/web/src/components/ui/input.tsx:5](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input.tsx#L5)

```tsx
HTMLInputElement, React.ComponentProps<"input">
```

## apps/web/src/components/ui/label.tsx

Nguồn: [apps/web/src/components/ui/label.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/label.tsx)

### Label

[apps/web/src/components/ui/label.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/label.tsx#L9)

```tsx
React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
```

CVA variants và defaults:

```tsx

```

## apps/web/src/components/ui/menubar.tsx

Nguồn: [apps/web/src/components/ui/menubar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx)

### MenubarMenu

[apps/web/src/components/ui/menubar.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L7)

```tsx
Alias → MenubarPrimitive.Menu
```

### MenubarGroup

[apps/web/src/components/ui/menubar.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L9)

```tsx
Alias → MenubarPrimitive.Group
```

### MenubarPortal

[apps/web/src/components/ui/menubar.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L11)

```tsx
Alias → MenubarPrimitive.Portal
```

### MenubarSub

[apps/web/src/components/ui/menubar.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L13)

```tsx
Alias → MenubarPrimitive.Sub
```

### MenubarRadioGroup

[apps/web/src/components/ui/menubar.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L15)

```tsx
Alias → MenubarPrimitive.RadioGroup
```

### Menubar

[apps/web/src/components/ui/menubar.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L17)

```tsx
React.ElementRef<typeof MenubarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
```

### MenubarTrigger

[apps/web/src/components/ui/menubar.tsx:29](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L29)

```tsx
React.ElementRef<typeof MenubarPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
```

### MenubarSubTrigger

[apps/web/src/components/ui/menubar.tsx:44](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L44)

```tsx
React.ElementRef<typeof MenubarPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
```

### MenubarSubContent

[apps/web/src/components/ui/menubar.tsx:65](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L65)

```tsx
React.ElementRef<typeof MenubarPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
```

### MenubarContent

[apps/web/src/components/ui/menubar.tsx:80](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L80)

```tsx
React.ElementRef<typeof MenubarPrimitive.Content>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
```

### MenubarItem

[apps/web/src/components/ui/menubar.tsx:100](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L100)

```tsx
React.ElementRef<typeof MenubarPrimitive.Item>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
```

### MenubarCheckboxItem

[apps/web/src/components/ui/menubar.tsx:118](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L118)

```tsx
React.ElementRef<typeof MenubarPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
```

### MenubarRadioItem

[apps/web/src/components/ui/menubar.tsx:141](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L141)

```tsx
React.ElementRef<typeof MenubarPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
```

### MenubarLabel

[apps/web/src/components/ui/menubar.tsx:163](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L163)

```tsx
React.ElementRef<typeof MenubarPrimitive.Label>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
```

### MenubarSeparator

[apps/web/src/components/ui/menubar.tsx:177](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L177)

```tsx
React.ElementRef<typeof MenubarPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
```

### MenubarShortcut

[apps/web/src/components/ui/menubar.tsx:185](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx#L185)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLSpanElement>
```

## apps/web/src/components/ui/navigation-menu.tsx

Nguồn: [apps/web/src/components/ui/navigation-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx)

### NavigationMenu

[apps/web/src/components/ui/navigation-menu.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L8)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.Root>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
```

### NavigationMenuList

[apps/web/src/components/ui/navigation-menu.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L23)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.List>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
```

### NavigationMenuItem

[apps/web/src/components/ui/navigation-menu.tsx:35](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L35)

```tsx
Alias → NavigationMenuPrimitive.Item
```

### NavigationMenuTrigger

[apps/web/src/components/ui/navigation-menu.tsx:41](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L41)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
```

### NavigationMenuContent

[apps/web/src/components/ui/navigation-menu.tsx:59](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L59)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
```

### NavigationMenuLink

[apps/web/src/components/ui/navigation-menu.tsx:74](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L74)

```tsx
Alias → NavigationMenuPrimitive.Link
```

### NavigationMenuViewport

[apps/web/src/components/ui/navigation-menu.tsx:76](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L76)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.Viewport>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
```

### NavigationMenuIndicator

[apps/web/src/components/ui/navigation-menu.tsx:93](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx#L93)

```tsx
React.ElementRef<typeof NavigationMenuPrimitive.Indicator>, React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
```

CVA variants và defaults:

```tsx

```

## apps/web/src/components/ui/pagination.tsx

Nguồn: [apps/web/src/components/ui/pagination.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx)

### Pagination

[apps/web/src/components/ui/pagination.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L7)

```tsx
{ className, ...props }: React.ComponentProps<"nav">
```

### PaginationContent

[apps/web/src/components/ui/pagination.tsx:17](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L17)

```tsx
HTMLUListElement, React.ComponentProps<"ul">
```

### PaginationItem

[apps/web/src/components/ui/pagination.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L24)

```tsx
HTMLLIElement, React.ComponentProps<"li">
```

### PaginationLink

[apps/web/src/components/ui/pagination.tsx:34](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L34)

```tsx
{ className, isActive, size = "icon", ...props }: PaginationLinkProps
```

### PaginationPrevious

[apps/web/src/components/ui/pagination.tsx:49](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L49)

```tsx
{ className, ...props }: React.ComponentProps<typeof PaginationLink>
```

### PaginationNext

[apps/web/src/components/ui/pagination.tsx:57](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L57)

```tsx
{ className, ...props }: React.ComponentProps<typeof PaginationLink>
```

### PaginationEllipsis

[apps/web/src/components/ui/pagination.tsx:65](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx#L65)

```tsx
{ className, ...props }: React.ComponentProps<"span">
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;
```

## apps/web/src/components/ui/popover.tsx

Nguồn: [apps/web/src/components/ui/popover.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx)

### Popover

[apps/web/src/components/ui/popover.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx#L6)

```tsx
Alias → PopoverPrimitive.Root
```

### PopoverTrigger

[apps/web/src/components/ui/popover.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx#L8)

```tsx
Alias → PopoverPrimitive.Trigger
```

### PopoverAnchor

[apps/web/src/components/ui/popover.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx#L10)

```tsx
Alias → PopoverPrimitive.Anchor
```

### PopoverContent

[apps/web/src/components/ui/popover.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx#L12)

```tsx
React.ElementRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
```

## apps/web/src/components/ui/progress.tsx

Nguồn: [apps/web/src/components/ui/progress.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/progress.tsx)

### Progress

[apps/web/src/components/ui/progress.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/progress.tsx#L6)

```tsx
React.ElementRef<typeof ProgressPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
```

## apps/web/src/components/ui/radio-group.tsx

Nguồn: [apps/web/src/components/ui/radio-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/radio-group.tsx)

### RadioGroup

[apps/web/src/components/ui/radio-group.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/radio-group.tsx#L7)

```tsx
React.ElementRef<typeof RadioGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
```

### RadioGroupItem

[apps/web/src/components/ui/radio-group.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/radio-group.tsx#L15)

```tsx
React.ElementRef<typeof RadioGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
```

## apps/web/src/components/ui/resizable.tsx

Nguồn: [apps/web/src/components/ui/resizable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx)

### ResizablePanelGroup

[apps/web/src/components/ui/resizable.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx#L6)

```tsx
{ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>
```

### ResizablePanel

[apps/web/src/components/ui/resizable.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx#L13)

```tsx
Alias → ResizablePrimitive.Panel
```

### ResizableHandle

[apps/web/src/components/ui/resizable.tsx:15](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx#L15)

```tsx
{
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}
```

## apps/web/src/components/ui/scroll-area.tsx

Nguồn: [apps/web/src/components/ui/scroll-area.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/scroll-area.tsx)

### ScrollArea

[apps/web/src/components/ui/scroll-area.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/scroll-area.tsx#L6)

```tsx
React.ElementRef<typeof ScrollAreaPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
```

### ScrollBar

[apps/web/src/components/ui/scroll-area.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/scroll-area.tsx#L18)

```tsx
React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>, React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
```

## apps/web/src/components/ui/select.tsx

Nguồn: [apps/web/src/components/ui/select.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx)

### Select

[apps/web/src/components/ui/select.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L7)

```tsx
Alias → SelectPrimitive.Root
```

### SelectGroup

[apps/web/src/components/ui/select.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L8)

```tsx
Alias → SelectPrimitive.Group
```

### SelectValue

[apps/web/src/components/ui/select.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L9)

```tsx
Alias → SelectPrimitive.Value
```

### SelectTrigger

[apps/web/src/components/ui/select.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L11)

```tsx
React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
```

### SelectScrollUpButton

[apps/web/src/components/ui/select.tsx:31](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L31)

```tsx
React.ElementRef<typeof SelectPrimitive.ScrollUpButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
```

### SelectScrollDownButton

[apps/web/src/components/ui/select.tsx:45](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L45)

```tsx
React.ElementRef<typeof SelectPrimitive.ScrollDownButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
```

### SelectContent

[apps/web/src/components/ui/select.tsx:59](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L59)

```tsx
React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
```

### SelectLabel

[apps/web/src/components/ui/select.tsx:91](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L91)

```tsx
React.ElementRef<typeof SelectPrimitive.Label>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
```

### SelectItem

[apps/web/src/components/ui/select.tsx:99](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L99)

```tsx
React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
```

### SelectSeparator

[apps/web/src/components/ui/select.tsx:121](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx#L121)

```tsx
React.ElementRef<typeof SelectPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
```

## apps/web/src/components/ui/separator.tsx

Nguồn: [apps/web/src/components/ui/separator.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/separator.tsx)

### Separator

[apps/web/src/components/ui/separator.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/separator.tsx#L6)

```tsx
React.ElementRef<typeof SeparatorPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
```

## apps/web/src/components/ui/sheet.tsx

Nguồn: [apps/web/src/components/ui/sheet.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx)

### Sheet

[apps/web/src/components/ui/sheet.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L8)

```tsx
Alias → SheetPrimitive.Root
```

### SheetTrigger

[apps/web/src/components/ui/sheet.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L9)

```tsx
Alias → SheetPrimitive.Trigger
```

### SheetClose

[apps/web/src/components/ui/sheet.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L10)

```tsx
Alias → SheetPrimitive.Close
```

### SheetPortal

[apps/web/src/components/ui/sheet.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L11)

```tsx
Alias → SheetPrimitive.Portal
```

### SheetOverlay

[apps/web/src/components/ui/sheet.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L13)

```tsx
React.ElementRef<typeof SheetPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
```

### SheetContent

[apps/web/src/components/ui/sheet.tsx:49](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L49)

```tsx
React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps
```

### SheetHeader

[apps/web/src/components/ui/sheet.tsx:65](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L65)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### SheetFooter

[apps/web/src/components/ui/sheet.tsx:70](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L70)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

### SheetTitle

[apps/web/src/components/ui/sheet.tsx:75](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L75)

```tsx
React.ElementRef<typeof SheetPrimitive.Title>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
```

### SheetDescription

[apps/web/src/components/ui/sheet.tsx:83](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx#L83)

```tsx
React.ElementRef<typeof SheetPrimitive.Description>, React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}
```

CVA variants và defaults:

```tsx
{
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
```

## apps/web/src/components/ui/sidebar.tsx

Nguồn: [apps/web/src/components/ui/sidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx)

### SidebarProvider

[apps/web/src/components/ui/sidebar.tsx:43](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L43)

```tsx
HTMLDivElement, React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
```

### Sidebar

[apps/web/src/components/ui/sidebar.tsx:131](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L131)

```tsx
HTMLDivElement, React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
```

### SidebarTrigger

[apps/web/src/components/ui/sidebar.tsx:219](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L219)

```tsx
React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>
```

### SidebarRail

[apps/web/src/components/ui/sidebar.tsx:244](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L244)

```tsx
HTMLButtonElement, React.ComponentProps<"button">
```

### SidebarInset

[apps/web/src/components/ui/sidebar.tsx:272](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L272)

```tsx
HTMLDivElement, React.ComponentProps<"main">
```

### SidebarInput

[apps/web/src/components/ui/sidebar.tsx:287](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L287)

```tsx
React.ElementRef<typeof Input>, React.ComponentProps<typeof Input>
```

### SidebarHeader

[apps/web/src/components/ui/sidebar.tsx:304](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L304)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarFooter

[apps/web/src/components/ui/sidebar.tsx:309](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L309)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarSeparator

[apps/web/src/components/ui/sidebar.tsx:314](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L314)

```tsx
React.ElementRef<typeof Separator>, React.ComponentProps<typeof Separator>
```

### SidebarContent

[apps/web/src/components/ui/sidebar.tsx:328](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L328)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarGroup

[apps/web/src/components/ui/sidebar.tsx:343](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L343)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarGroupLabel

[apps/web/src/components/ui/sidebar.tsx:355](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L355)

```tsx
HTMLDivElement, React.ComponentProps<"div"> & { asChild?: boolean }
```

### SidebarGroupAction

[apps/web/src/components/ui/sidebar.tsx:375](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L375)

```tsx
HTMLButtonElement, React.ComponentProps<"button"> & { asChild?: boolean }
```

### SidebarGroupContent

[apps/web/src/components/ui/sidebar.tsx:397](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L397)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarMenu

[apps/web/src/components/ui/sidebar.tsx:404](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L404)

```tsx
HTMLUListElement, React.ComponentProps<"ul">
```

### SidebarMenuItem

[apps/web/src/components/ui/sidebar.tsx:409](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L409)

```tsx
HTMLLIElement, React.ComponentProps<"li">
```

### SidebarMenuButton

[apps/web/src/components/ui/sidebar.tsx:436](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L436)

```tsx
HTMLButtonElement, React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
```

### SidebarMenuAction

[apps/web/src/components/ui/sidebar.tsx:477](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L477)

```tsx
HTMLButtonElement, React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
```

### SidebarMenuBadge

[apps/web/src/components/ui/sidebar.tsx:508](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L508)

```tsx
HTMLDivElement, React.ComponentProps<"div">
```

### SidebarMenuSkeleton

[apps/web/src/components/ui/sidebar.tsx:528](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L528)

```tsx
HTMLDivElement, React.ComponentProps<"div"> & {
    showIcon?: boolean;
  }
```

### SidebarMenuSub

[apps/web/src/components/ui/sidebar.tsx:561](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L561)

```tsx
HTMLUListElement, React.ComponentProps<"ul">
```

### SidebarMenuSubItem

[apps/web/src/components/ui/sidebar.tsx:577](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L577)

```tsx
HTMLLIElement, React.ComponentProps<"li">
```

### SidebarMenuSubButton

[apps/web/src/components/ui/sidebar.tsx:582](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx#L582)

```tsx
HTMLAnchorElement, React.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type SidebarContext = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
```

## apps/web/src/components/ui/skeleton.tsx

Nguồn: [apps/web/src/components/ui/skeleton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/skeleton.tsx)

### Skeleton

[apps/web/src/components/ui/skeleton.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/skeleton.tsx#L3)

```tsx
{ className, ...props }: React.HTMLAttributes<HTMLDivElement>
```

## apps/web/src/components/ui/slider.tsx

Nguồn: [apps/web/src/components/ui/slider.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/slider.tsx)

### Slider

[apps/web/src/components/ui/slider.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/slider.tsx#L6)

```tsx
React.ElementRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
```

## apps/web/src/components/ui/sonner.tsx

Nguồn: [apps/web/src/components/ui/sonner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sonner.tsx)

### Toaster

[apps/web/src/components/ui/sonner.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sonner.tsx#L6)

```tsx
{ ...props }: ToasterProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type ToasterProps = React.ComponentProps<typeof Sonner>;
```

## apps/web/src/components/ui/switch.tsx

Nguồn: [apps/web/src/components/ui/switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/switch.tsx)

### Switch

[apps/web/src/components/ui/switch.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/switch.tsx#L6)

```tsx
React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
```

## apps/web/src/components/ui/table.tsx

Nguồn: [apps/web/src/components/ui/table.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx)

### Table

[apps/web/src/components/ui/table.tsx:48](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L48)

```tsx
HTMLTableElement, TableProps
```

### TableHeader

[apps/web/src/components/ui/table.tsx:66](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L66)

```tsx
HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>
```

### TableBody

[apps/web/src/components/ui/table.tsx:71](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L71)

```tsx
HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>
```

### TableFooter

[apps/web/src/components/ui/table.tsx:78](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L78)

```tsx
HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>
```

### TableRow

[apps/web/src/components/ui/table.tsx:85](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L85)

```tsx
HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>
```

### TableHead

[apps/web/src/components/ui/table.tsx:103](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L103)

```tsx
HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>
```

### TableCell

[apps/web/src/components/ui/table.tsx:121](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L121)

```tsx
HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>
```

### TableCaption

[apps/web/src/components/ui/table.tsx:135](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx#L135)

```tsx
HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type TableVariant = "index" | "embedded" | "compact";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  wrapperClassName?: string;
  variant?: TableVariant;
};
```

## apps/web/src/components/ui/tabs.tsx

Nguồn: [apps/web/src/components/ui/tabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx)

### Tabs

[apps/web/src/components/ui/tabs.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx#L6)

```tsx
Alias → TabsPrimitive.Root
```

### TabsList

[apps/web/src/components/ui/tabs.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx#L8)

```tsx
React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
```

### TabsTrigger

[apps/web/src/components/ui/tabs.tsx:23](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx#L23)

```tsx
React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
```

### TabsContent

[apps/web/src/components/ui/tabs.tsx:38](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx#L38)

```tsx
React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
```

## apps/web/src/components/ui/textarea.tsx

Nguồn: [apps/web/src/components/ui/textarea.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/textarea.tsx)

### Textarea

[apps/web/src/components/ui/textarea.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/textarea.tsx#L7)

```tsx
HTMLTextAreaElement, TextareaProps
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
```

## apps/web/src/components/ui/theme-switch.tsx

Nguồn: [apps/web/src/components/ui/theme-switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/theme-switch.tsx)

### ThemeSwitch

[apps/web/src/components/ui/theme-switch.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/theme-switch.tsx#L11)

```tsx
{
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>
```

## apps/web/src/components/ui/toast.tsx

Nguồn: [apps/web/src/components/ui/toast.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx)

### ToastProvider

[apps/web/src/components/ui/toast.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L8)

```tsx
Alias → ToastPrimitives.Provider
```

### ToastViewport

[apps/web/src/components/ui/toast.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L10)

```tsx
React.ElementRef<typeof ToastPrimitives.Viewport>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
```

### Toast

[apps/web/src/components/ui/toast.tsx:40](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L40)

```tsx
React.ElementRef<typeof ToastPrimitives.Root>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
```

### ToastAction

[apps/web/src/components/ui/toast.tsx:48](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L48)

```tsx
React.ElementRef<typeof ToastPrimitives.Action>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
```

### ToastClose

[apps/web/src/components/ui/toast.tsx:63](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L63)

```tsx
React.ElementRef<typeof ToastPrimitives.Close>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
```

### ToastTitle

[apps/web/src/components/ui/toast.tsx:81](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L81)

```tsx
React.ElementRef<typeof ToastPrimitives.Title>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
```

### ToastDescription

[apps/web/src/components/ui/toast.tsx:89](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx#L89)

```tsx
React.ElementRef<typeof ToastPrimitives.Description>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
```

Types khai báo tại file (bao gồm props và type hỗ trợ):

```tsx
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
```

## apps/web/src/components/ui/toaster.tsx

Nguồn: [apps/web/src/components/ui/toaster.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toaster.tsx)

### Toaster

[apps/web/src/components/ui/toaster.tsx:3](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toaster.tsx#L3)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/ui/toggle-group.tsx

Nguồn: [apps/web/src/components/ui/toggle-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle-group.tsx)

### ToggleGroup

[apps/web/src/components/ui/toggle-group.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle-group.tsx#L13)

```tsx
React.ElementRef<typeof ToggleGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>
```

### ToggleGroupItem

[apps/web/src/components/ui/toggle-group.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle-group.tsx#L24)

```tsx
React.ElementRef<typeof ToggleGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>
```

## apps/web/src/components/ui/toggle.tsx

Nguồn: [apps/web/src/components/ui/toggle.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle.tsx)

### Toggle

[apps/web/src/components/ui/toggle.tsx:28](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle.tsx#L28)

```tsx
React.ElementRef<typeof TogglePrimitive.Root>, React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
```

CVA variants và defaults:

```tsx
{
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
```

## apps/web/src/components/ui/tooltip.tsx

Nguồn: [apps/web/src/components/ui/tooltip.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx)

### TooltipProvider

[apps/web/src/components/ui/tooltip.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx#L6)

```tsx
Alias → TooltipPrimitive.Provider
```

### Tooltip

[apps/web/src/components/ui/tooltip.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx#L8)

```tsx
Alias → TooltipPrimitive.Root
```

### TooltipTrigger

[apps/web/src/components/ui/tooltip.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx#L10)

```tsx
Alias → TooltipPrimitive.Trigger
```

### TooltipContent

[apps/web/src/components/ui/tooltip.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx#L12)

```tsx
React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
```

## apps/web/src/components/workspace/TabContentHost.tsx

Nguồn: [apps/web/src/components/workspace/TabContentHost.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/TabContentHost.tsx)

### TabContentHost

[apps/web/src/components/workspace/TabContentHost.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/TabContentHost.tsx#L18)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/components/workspace/WorkspaceTabBar.tsx

Nguồn: [apps/web/src/components/workspace/WorkspaceTabBar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/WorkspaceTabBar.tsx)

### WorkspaceTabBar

[apps/web/src/components/workspace/WorkspaceTabBar.tsx:24](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/workspace/WorkspaceTabBar.tsx#L24)

```tsx
{ onNavigate, onOpenProductSettings }: { onNavigate: (url: string) => void; onOpenProductSettings: () => void }
```

## apps/web/src/features/primeweb/Editor.tsx

Nguồn: [apps/web/src/features/primeweb/Editor.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Editor.tsx)

### Editor

[apps/web/src/features/primeweb/Editor.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Editor.tsx#L12)

```tsx
{ site, onPublish }: { site: Website; onPublish: () => void }
```

## apps/web/src/features/primeweb/Management.tsx

Nguồn: [apps/web/src/features/primeweb/Management.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx)

### Websites

[apps/web/src/features/primeweb/Management.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L10)

```tsx
{ sites, onCreate }: { sites: Website[]; onCreate: () => void }
```

### CreateWebsite

[apps/web/src/features/primeweb/Management.tsx:18](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L18)

```tsx
{ onClose, onCreated }: { onClose: () => void; onCreated: (site: Website) => void }
```

### Overview

[apps/web/src/features/primeweb/Management.tsx:33](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L33)

```tsx
{ site }: { site: Website }
```

### PagesContent

[apps/web/src/features/primeweb/Management.tsx:38](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L38)

```tsx
{ site }: { site: Website }
```

### Storefront

[apps/web/src/features/primeweb/Management.tsx:45](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L45)

```tsx
{ site }: { site: Website }
```

### Domains

[apps/web/src/features/primeweb/Management.tsx:50](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L50)

```tsx
{ site, onPublish }: { site: Website; onPublish: () => void }
```

### SeoAnalytics

[apps/web/src/features/primeweb/Management.tsx:55](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L55)

```tsx
{ site }: { site: Website }
```

### WebsiteSettings

[apps/web/src/features/primeweb/Management.tsx:60](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/Management.tsx#L60)

```tsx
{ site }: { site: Website }
```

## apps/web/src/features/primeweb/PrimeWebWorkspace.tsx

Nguồn: [apps/web/src/features/primeweb/PrimeWebWorkspace.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/PrimeWebWorkspace.tsx)

### PrimeWebWorkspace

[apps/web/src/features/primeweb/PrimeWebWorkspace.tsx:13](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/PrimeWebWorkspace.tsx#L13)

```tsx
Không có props khai báo / props suy luận từ wrapper
```

## apps/web/src/features/primeweb/StorefrontPreview.tsx

Nguồn: [apps/web/src/features/primeweb/StorefrontPreview.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/StorefrontPreview.tsx)

### StorefrontPreview

[apps/web/src/features/primeweb/StorefrontPreview.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/StorefrontPreview.tsx#L8)

```tsx
{ content, selectedBlock, onSelect, pageId, interactive = false }: { content: WebsiteContent; selectedBlock?: string; onSelect?: (id: string) => void; pageId?: string; interactive?: boolean }
```

## apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx

Nguồn: [apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx)

### EditorSidebar

[apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/source-ui/EditorSidebar.tsx#L6)

```tsx
{ tabs, activeTab, onTabChange, children }: { tabs: { id: string; label: string; icon: ReactNode }[]; activeTab: string; onTabChange: (id: string) => void; children: ReactNode }
```

## apps/web/src/features/primeweb/ui.tsx

Nguồn: [apps/web/src/features/primeweb/ui.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx)

### Action

[apps/web/src/features/primeweb/ui.tsx:6](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L6)

```tsx
{ children, primary, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }
```

### Panel

[apps/web/src/features/primeweb/ui.tsx:7](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L7)

```tsx
{ children, className = '' }: { children: ReactNode; className?: string }
```

### Field

[apps/web/src/features/primeweb/ui.tsx:8](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L8)

```tsx
{ label, children }: { label: string; children: ReactNode }
```

### Pill

[apps/web/src/features/primeweb/ui.tsx:9](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L9)

```tsx
{ children, good }: { children: ReactNode; good?: boolean }
```

### Heading

[apps/web/src/features/primeweb/ui.tsx:10](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L10)

```tsx
{ title, description, children }: { title: string; description: string; children?: ReactNode }
```

### MainLink

[apps/web/src/features/primeweb/ui.tsx:11](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L11)

```tsx
{ to, children }: { to: string; children: ReactNode }
```

### Modal

[apps/web/src/features/primeweb/ui.tsx:12](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/features/primeweb/ui.tsx#L12)

```tsx
{ title, description, open, onClose, children }: { title: string; description: string; open: boolean; onClose: () => void; children: ReactNode }
```
