export const seedDatabase = {
  products: [
    {
      id: 'prod_001',
      skuCode: 'CR-NTB-BLK-A5',
      name: 'Black Hardcover Notebook',
      category: 'Stationery',
      status: 'published',
      retailPrice: 2800,
      inventoryCount: 65,
      channelCount: 1,
      updatedAt: '2026-04-06T08:00:00.000Z'
    },
    {
      id: 'prod_002',
      skuCode: 'CR-SKB-MDN-A5',
      name: 'Sketchbook Pro Watercolor',
      category: 'Art Supplies',
      status: 'published',
      retailPrice: 3800,
      inventoryCount: 100,
      channelCount: 1,
      updatedAt: '2026-04-06T08:00:00.000Z'
    },
    {
      id: 'prod_003',
      skuCode: 'CR-BSH-SET-12',
      name: 'Artist Precision Paint Brush Set',
      category: 'Art Supplies',
      status: 'published',
      retailPrice: 4900,
      inventoryCount: 85,
      channelCount: 2,
      updatedAt: '2026-04-06T08:00:00.000Z'
    },
    {
      id: 'prod_004',
      skuCode: 'CR-ART-MYTH-10',
      name: 'Japanese Mythical Creatures Collection',
      category: 'Art Prints',
      status: 'published',
      retailPrice: 1980,
      inventoryCount: 275,
      channelCount: 2,
      updatedAt: '2026-04-06T08:00:00.000Z'
    }
  ],
  listings: [
    {
      id: 'lst_001',
      skuCode: 'CR-NTB-BLK-A5-A4',
      channel: 'amazon',
      title: 'Black Hardcover Notebook A4',
      status: 'published',
      price: 2800,
      currency: 'JPY',
      syncState: 'healthy',
      updatedAt: '2026-04-06T08:00:00.000Z'
    },
    {
      id: 'lst_002',
      skuCode: 'CR-SKB-MDN-A5-HC',
      channel: 'rakuten',
      title: 'Sketchbook Pro Hardcover A5',
      status: 'published',
      price: 3800,
      currency: 'JPY',
      syncState: 'healthy',
      updatedAt: '2026-04-06T08:00:00.000Z'
    },
    {
      id: 'lst_003',
      skuCode: 'CR-BSH-SET-12',
      channel: 'shopee',
      title: 'Artist Precision Brush Set 12pc',
      status: 'published',
      price: 4900,
      currency: 'JPY',
      syncState: 'attention',
      updatedAt: '2026-04-05T08:00:00.000Z'
    },
    {
      id: 'lst_004',
      skuCode: 'CR-ART-MYTH-10',
      channel: 'website',
      title: 'Japanese Mythical Creatures Art Pack',
      status: 'draft',
      price: 1980,
      currency: 'JPY',
      syncState: 'draft',
      updatedAt: '2026-04-04T08:00:00.000Z'
    }
  ],
  inventoryBrain: [
    {
      id: 'inv_001',
      signalName: 'Tokyo notebook stock lane',
      skuCode: 'CR-NTB-BLK-A5',
      warehouseCode: 'CR-JP',
      ats: 42,
      reserved: 8,
      riskLevel: 'healthy',
      replenishmentState: 'balanced',
      updatedAt: '2026-04-23T04:10:00.000Z'
    },
    {
      id: 'inv_002',
      signalName: 'SEA brush bundle watch',
      skuCode: 'CR-BSH-SET-12',
      warehouseCode: '3PL-VN',
      ats: 14,
      reserved: 11,
      riskLevel: 'watch',
      replenishmentState: 'reorder',
      updatedAt: '2026-04-22T06:40:00.000Z'
    },
    {
      id: 'inv_003',
      signalName: 'Mythical art cross-border hold',
      skuCode: 'CR-ART-MYTH-10',
      warehouseCode: 'RSL-SG',
      ats: 6,
      reserved: 4,
      riskLevel: 'critical',
      replenishmentState: 'restricted',
      updatedAt: '2026-04-21T03:30:00.000Z'
    }
  ],
  warehouses: [
    {
      id: 'wh_crjp',
      code: 'CR-JP',
      name: 'CyberRecord Japan HQ',
      country: 'JP',
      type: 'internal',
      status: 'active',
      capabilityCount: 3,
      updatedAt: '2026-04-01T08:00:00.000Z'
    },
    {
      id: 'wh_rslsg',
      code: 'RSL-SG',
      name: 'Reseller Singapore',
      country: 'SG',
      type: 'internal',
      status: 'active',
      capabilityCount: 2,
      updatedAt: '2026-04-01T08:00:00.000Z'
    },
    {
      id: 'wh_fbsmy',
      code: 'FBS-MY',
      name: 'Fulfillment By Shopee Malaysia',
      country: 'MY',
      type: 'fbs',
      status: 'active',
      capabilityCount: 2,
      updatedAt: '2026-04-01T08:00:00.000Z'
    },
    {
      id: 'wh_3plvn',
      code: '3PL-VN',
      name: 'Vietnam 3PL Partner',
      country: 'VN',
      type: '3pl',
      status: 'active',
      capabilityCount: 1,
      updatedAt: '2026-04-01T08:00:00.000Z'
    }
  ],
  omsOrders: [
    {
      id: 'oms_001',
      orderCode: 'OMS-JP-1042',
      channel: 'rakuten',
      market: 'JP',
      customerName: 'Emma Thompson',
      paymentStatus: 'paid',
      status: 'released',
      updatedAt: '2026-04-23T04:55:00.000Z'
    },
    {
      id: 'oms_002',
      orderCode: 'OMS-VN-0881',
      channel: 'shopee',
      market: 'VN',
      customerName: 'Linh Dao',
      paymentStatus: 'paid',
      status: 'packed',
      updatedAt: '2026-04-22T08:05:00.000Z'
    },
    {
      id: 'oms_003',
      orderCode: 'OMS-JP-1028',
      channel: 'website',
      market: 'JP',
      customerName: 'Kenji Morita',
      paymentStatus: 'pending',
      status: 'review',
      updatedAt: '2026-04-21T02:15:00.000Z'
    }
  ],
  fulfillmentControl: [
    {
      id: 'ful_001',
      jobCode: 'FUL-JP-2201',
      warehouseCode: 'CR-JP',
      carrier: 'Yamato',
      priority: 'standard',
      slaHours: 24,
      status: 'picking',
      updatedAt: '2026-04-23T05:05:00.000Z'
    },
    {
      id: 'ful_002',
      jobCode: 'FUL-VN-0988',
      warehouseCode: '3PL-VN',
      carrier: 'GHN',
      priority: 'rush',
      slaHours: 12,
      status: 'in_transit',
      updatedAt: '2026-04-22T08:20:00.000Z'
    },
    {
      id: 'ful_003',
      jobCode: 'FUL-SG-0710',
      warehouseCode: 'RSL-SG',
      carrier: 'Ninja Van',
      priority: 'escalated',
      slaHours: 8,
      status: 'exception',
      updatedAt: '2026-04-21T07:30:00.000Z'
    }
  ],
  policies: [
    {
      id: 'pol_001',
      name: 'Standard 3 Day SLA',
      description: 'Default commitment for core marketplace orders.',
      scope: 'fulfillment',
      defaultDays: 3,
      isActive: true,
      updatedAt: '2026-04-03T08:00:00.000Z'
    },
    {
      id: 'pol_002',
      name: 'Launch Decision Guardrail',
      description: 'Keep creator and customer approvals in sync before campaign release.',
      scope: 'intelligence',
      defaultDays: 1,
      isActive: true,
      updatedAt: '2026-04-05T08:00:00.000Z'
    },
    {
      id: 'pol_003',
      name: 'Warehouse Routing Exception',
      description: 'Escalate orders when cross-border stock falls below target.',
      scope: 'routing',
      defaultDays: 2,
      isActive: false,
      updatedAt: '2026-04-02T08:00:00.000Z'
    }
  ],
  eventAudit: [
    {
      id: 'audit_001',
      eventName: 'Launch approval synced to campaign ops',
      source: 'intelligence',
      entityRef: 'launch_001',
      severity: 'info',
      status: 'reviewed',
      updatedAt: '2026-04-23T05:45:00.000Z'
    },
    {
      id: 'audit_002',
      eventName: 'Carrier exception escalated from fulfillment',
      source: 'fulfillment',
      entityRef: 'FUL-SG-0710',
      severity: 'high',
      status: 'escalated',
      updatedAt: '2026-04-22T08:30:00.000Z'
    },
    {
      id: 'audit_003',
      eventName: 'OMS payment mismatch flagged for review',
      source: 'oms',
      entityRef: 'OMS-JP-1028',
      severity: 'warning',
      status: 'logged',
      updatedAt: '2026-04-21T02:25:00.000Z'
    }
  ],
  intelligenceCreators: [
    {
      id: 'intel_creator_001',
      creatorName: 'Linh Dao',
      imageUrl: 'https://i.pravatar.cc/300?u=primeos-linh-dao',
      market: 'JP',
      primaryChannel: 'instagram',
      fitScore: 95,
      linkedSku: 'CR-NTB-BLK-A5-A4',
      audienceFit: 'Women 25-34 already respond to creator-led desk setup and refill storytelling.',
      marketFit: 'JP demand is strongest where premium notebook refills already convert with repeat buyers.',
      recentProof: 'Recent product-proof clips hold attention well enough to open launch review with confidence.',
      status: 'shortlisted',
      updatedAt: '2026-04-23T05:15:00.000Z'
    },
    {
      id: 'intel_creator_002',
      creatorName: 'Mina Sato',
      imageUrl: 'https://i.pravatar.cc/300?u=primeos-mina-sato',
      market: 'JP',
      primaryChannel: 'tiktok',
      fitScore: 88,
      linkedSku: 'CR-SKB-MDN-A5',
      audienceFit: 'Short-form art audiences react well to hands-on watercolor and sketchbook demonstrations.',
      marketFit: 'JP creative buyers still show warm repeat demand for premium art bundles in this lane.',
      recentProof: 'Recent creator content already generates saves and bundle interest without requiring deep discounting.',
      status: 'watchlist',
      updatedAt: '2026-04-22T09:00:00.000Z'
    },
    {
      id: 'intel_creator_003',
      creatorName: 'Ari Nguyen',
      imageUrl: 'https://i.pravatar.cc/300?u=primeos-ari-nguyen',
      market: 'VN',
      primaryChannel: 'youtube',
      fitScore: 82,
      linkedSku: 'CR-BSH-SET-12',
      audienceFit: 'Creator-led explainer content works well for brush and bundle education before conversion.',
      marketFit: 'VN market fit is strongest when premium art tools are framed as upgrade products, not impulse buys.',
      recentProof: 'Recent explainer-style product content gives PrimeOS a usable proof layer for launch planning.',
      status: 'approved',
      updatedAt: '2026-04-21T11:30:00.000Z'
    }
  ],
  intelligenceCustomers: [
    {
      id: 'intel_customer_001',
      segmentName: 'Dormant repeat customers',
      lifecycle: 'dormant_repeat',
      market: 'JP',
      recommendedProduct: 'CR-NTB-BLK-A5-A4',
      potentialScore: 96,
      segmentSize: 1280,
      recentIntent: '214 refill-page revisits and 38 abandoned carts reappeared in the last 7 days.',
      bestChannel: 'TikTok + CRM + WhatsApp',
      nextMove: 'Win back dormant repeat buyers with a refill bundle recommendation led by creator proof.',
      benefit: 'Unlocks repeat revenue quickly without relying on heavy discounting or cold acquisition spend.',
      status: 'active',
      updatedAt: '2026-04-23T05:20:00.000Z'
    },
    {
      id: 'intel_customer_002',
      segmentName: 'Rising art bundle buyers',
      lifecycle: 'active_repeat',
      market: 'JP',
      recommendedProduct: 'CR-BSH-SET-12',
      potentialScore: 87,
      segmentSize: 860,
      recentIntent: '67 bundle saves and 24 high-intent chats suggest buyers are ready for a premium spring offer.',
      bestChannel: 'TikTok + Email',
      nextMove: 'Push the brush bundle while art buyers are still clustering around premium desk and studio content.',
      benefit: 'Raises average order value by turning warm repeat demand into bundle conversion instead of single-item sales.',
      status: 'testing',
      updatedAt: '2026-04-22T09:20:00.000Z'
    },
    {
      id: 'intel_customer_003',
      segmentName: 'Prospecting SEA wholesale leads',
      lifecycle: 'prospecting',
      market: 'SEA',
      recommendedProduct: 'CR-ART-MYTH-10',
      potentialScore: 78,
      segmentSize: 142,
      recentIntent: '19 new wholesale inquiries and 6 quote requests are clustering around export-friendly collectible SKUs.',
      bestChannel: 'WhatsApp + Sales follow-up',
      nextMove: 'Route prospects into a quote-first launch path with MOQ clarity, creator proof, and delivery readiness.',
      benefit: 'Builds a financeable RFQ pipeline instead of leaving wholesale demand sitting in generic lead queues.',
      status: 'watch',
      updatedAt: '2026-04-20T08:00:00.000Z'
    }
  ],
  launchDecisions: [
    {
      id: 'launch_001',
      decisionName: 'Notebook refill bundle launch',
      skuCode: 'CR-NTB-BLK-A5-A4',
      customerSegment: 'Dormant repeat customers',
      creatorName: 'Linh Dao',
      approvalStatus: 'approved',
      confidence: 96,
      whyThisLaunch: 'Dormant refill buyers are back on the product and Linh Dao gives the SKU premium, creator-led trust.',
      blocker: 'Final bundle pricing lock still needs confirmation from Ecom before broader paid scale.',
      owner: 'Growth lead · Mika Sato',
      expectedResponse: 'Lift repeat conversion and win back refill demand inside 7 days with limited incentive support.',
      updatedAt: '2026-04-23T05:35:00.000Z'
    },
    {
      id: 'launch_002',
      decisionName: 'Watercolor spring creator push',
      skuCode: 'CR-SKB-MDN-A5',
      customerSegment: 'Rising art bundle buyers',
      creatorName: 'Mina Sato',
      approvalStatus: 'review',
      confidence: 84,
      whyThisLaunch: 'Warm art buyers already cluster around creator-led usage content, but the launch still needs one stronger proof asset.',
      blocker: 'Need one approved creator usage clip before moving budget from review into live deployment.',
      owner: 'Creator manager · Emi Tan',
      expectedResponse: 'Increase bundle CTR and reduce hesitation before the premium spring art push goes live.',
      updatedAt: '2026-04-22T09:45:00.000Z'
    }
  ],
  campaignOps: [
    {
      id: 'campaign_ops_001',
      campaignName: 'JP refill push wave 01',
      channel: 'tiktok',
      linkedSku: 'CR-NTB-BLK-A5-A4',
      owner: 'Growth lead',
      budget: 180000,
      status: 'ready',
      updatedAt: '2026-04-23T05:50:00.000Z'
    },
    {
      id: 'campaign_ops_002',
      campaignName: 'Rakuten spring art sale',
      channel: 'rakuten_ads',
      linkedSku: 'CR-BSH-SET-12',
      owner: 'Performance lead',
      budget: 240000,
      status: 'active',
      updatedAt: '2026-04-21T08:40:00.000Z'
    }
  ],
  contentCreatorOps: [
    {
      id: 'creator_ops_001',
      briefName: 'Refill bundle creator proof clip',
      creatorName: 'Linh Dao',
      deliverable: 'short_form_video',
      owner: 'Creator manager',
      linkedSku: 'CR-NTB-BLK-A5-A4',
      status: 'ready',
      updatedAt: '2026-04-23T05:55:00.000Z'
    },
    {
      id: 'creator_ops_002',
      briefName: 'Mythical art product explainer',
      creatorName: 'Ari Nguyen',
      deliverable: 'product_explainer',
      owner: 'Content lead',
      linkedSku: 'CR-ART-MYTH-10',
      status: 'in_production',
      updatedAt: '2026-04-22T10:15:00.000Z'
    }
  ],
  leadResponseCapture: [
    {
      id: 'lead_flow_001',
      flowName: 'Notebook inbound lead form',
      source: 'landing_page',
      market: 'JP',
      owner: 'CRM manager',
      slaHours: 4,
      status: 'active',
      updatedAt: '2026-04-23T04:30:00.000Z'
    },
    {
      id: 'lead_flow_002',
      flowName: 'Shopee live request follow-up',
      source: 'live_event',
      market: 'VN',
      owner: 'Response lead',
      slaHours: 2,
      status: 'watch',
      updatedAt: '2026-04-21T07:20:00.000Z'
    }
  ],
  retargetingOutreach: [
    {
      id: 'retarget_001',
      audienceName: 'Dormant refill buyers',
      channel: 'whatsapp',
      trigger: '30 days without reorder',
      cadenceDays: 7,
      owner: 'CRM ops',
      status: 'active',
      updatedAt: '2026-04-23T03:45:00.000Z'
    },
    {
      id: 'retarget_002',
      audienceName: 'Abandoned art cart buyers',
      channel: 'email',
      trigger: 'cart abandoned after 6 hours',
      cadenceDays: 3,
      owner: 'Growth CRM',
      status: 'testing',
      updatedAt: '2026-04-22T06:45:00.000Z'
    }
  ],
  capitalReadiness: [
    {
      id: 'capital_001',
      programName: 'JP notebook scale readiness',
      market: 'JP',
      owner: 'Finance lead',
      linkedLaunch: 'JP notebook refill comeback',
      linkedSku: 'CR-NTB-BLK-A5-A4',
      fundingNeed: 280000,
      readinessScore: 88,
      readinessReason: 'Approved launch, repeat-customer pull, and creator proof already align around one SKU.',
      nextReview: '2026-05-05T09:00:00.000Z',
      status: 'ready',
      updatedAt: '2026-04-23T02:30:00.000Z'
    },
    {
      id: 'capital_002',
      programName: 'SEA quote-first expansion readiness',
      market: 'SEA',
      owner: 'Regional finance',
      linkedLaunch: 'SEA collectible quote-first launch',
      linkedSku: 'CR-ART-MYTH-10',
      fundingNeed: 420000,
      readinessScore: 74,
      readinessReason: 'Wholesale intent is real, but MOQ, inventory, and repayment path still need tighter confirmation.',
      nextReview: '2026-05-12T09:00:00.000Z',
      status: 'watch',
      updatedAt: '2026-04-20T05:10:00.000Z'
    }
  ],
  capitalOffers: [
    {
      id: 'offer_001',
      offerName: 'JP campaign scale line',
      providerName: 'SMBC growth desk',
      capitalType: 'campaign_financing',
      market: 'JP',
      owner: 'Partnership lead',
      linkedLaunch: 'JP notebook refill comeback',
      amount: 280000,
      feeRate: 2.8,
      termDays: 45,
      repaymentModel: 'split_settlement',
      status: 'active',
      updatedAt: '2026-04-23T02:45:00.000Z'
    },
    {
      id: 'offer_002',
      offerName: 'SEA RFQ working capital line',
      providerName: 'SEA embedded capital partner',
      capitalType: 'working_capital',
      market: 'SEA',
      owner: 'Finance partnerships',
      linkedLaunch: 'SEA collectible quote-first launch',
      amount: 420000,
      feeRate: 3.4,
      termDays: 60,
      repaymentModel: 'invoice_sweep',
      status: 'onboarding',
      updatedAt: '2026-04-21T03:20:00.000Z'
    }
  ],
  riskTrust: [
    {
      id: 'risk_001',
      profileName: 'Notebook refill trust lane',
      signalSource: 'OMS + CRM compact + service history',
      trustScore: 84,
      severity: 'medium',
      owner: 'Risk lead',
      topRisk: 'Inventory pressure on refill SKU before campaign scale',
      recommendedFix: 'Lock bundle pricing and stock allocation before approving wider paid deployment.',
      status: 'active',
      updatedAt: '2026-04-23T01:20:00.000Z'
    },
    {
      id: 'risk_002',
      profileName: 'SEA quote-first trust lane',
      signalSource: 'Inventory brain + RFQ pipeline',
      trustScore: 71,
      severity: 'high',
      owner: 'Ops risk',
      topRisk: 'Cross-border stock and MOQ uncertainty could delay settlement.',
      recommendedFix: 'Confirm MOQ, supplier timing, and invoice repayment sequence before funding.',
      status: 'watch',
      updatedAt: '2026-04-22T06:10:00.000Z'
    }
  ],
  settlementRepayment: [
    {
      id: 'settlement_001',
      facilityName: 'JP refill launch settlement',
      market: 'JP',
      disbursementTarget: 'Campaign Ops budget',
      repaymentSource: 'Split settlement from launch revenue',
      outstandingBalance: 180000,
      nextDueAmount: 42000,
      nextDueDate: '2026-05-06T09:00:00.000Z',
      collectionMode: 'split_settlement',
      status: 'collecting',
      updatedAt: '2026-04-23T04:15:00.000Z'
    },
    {
      id: 'settlement_002',
      facilityName: 'SEA quote-first repayment lane',
      market: 'SEA',
      disbursementTarget: 'Supplier + sales ops',
      repaymentSource: 'Invoice sweep from converted RFQs',
      outstandingBalance: 420000,
      nextDueAmount: 70000,
      nextDueDate: '2026-05-14T09:00:00.000Z',
      collectionMode: 'invoice_sweep',
      status: 'scheduled',
      updatedAt: '2026-04-22T08:35:00.000Z'
    }
  ],
  financePortfolio: [
    {
      id: 'portfolio_001',
      portfolioName: 'PrimeOS merchant capital book',
      market: 'Multi-market',
      sellerCohort: 'Growth sellers',
      totalOutstanding: 600000,
      totalFunded: 1050000,
      overdueRate: 2.1,
      roiPercent: 18.4,
      recoveryRate: 96.2,
      status: 'healthy',
      updatedAt: '2026-04-23T05:00:00.000Z'
    }
  ],
  crmCompact: [
    {
      id: 'crm_001',
      segmentName: 'VIP stationery repeaters',
      market: 'JP',
      owner: 'CRM manager',
      nextAction: 'Offer refill bundle in 7 days',
      customerCount: 124,
      status: 'active',
      updatedAt: '2026-04-23T04:00:00.000Z'
    },
    {
      id: 'crm_002',
      segmentName: 'SEA first-time art buyers',
      market: 'SEA',
      owner: 'Regional CRM',
      nextAction: 'Push watercolor onboarding sequence',
      customerCount: 89,
      status: 'testing',
      updatedAt: '2026-04-22T05:00:00.000Z'
    }
  ],
  serviceDesk: [
    {
      id: 'service_001',
      queueName: 'JP marketplace support',
      market: 'JP',
      owner: 'Service lead',
      slaHours: 24,
      openCases: 14,
      status: 'active',
      updatedAt: '2026-04-23T03:10:00.000Z'
    },
    {
      id: 'service_002',
      queueName: 'SEA delivery escalation queue',
      market: 'SEA',
      owner: 'Regional support',
      slaHours: 12,
      openCases: 9,
      status: 'watch',
      updatedAt: '2026-04-22T02:10:00.000Z'
    }
  ],
  admins: [
    {
      id: 'adm_001',
      fullName: 'Aiko Tanaka',
      email: 'aiko.tanaka@primeos.jp',
      accessLevel: 'super_admin',
      workspace: 'Global control room',
      status: 'active',
      lastSeenAt: '2026-04-22T06:20:00.000Z',
      createdAt: '2026-03-14T08:00:00.000Z',
      updatedAt: '2026-04-22T06:20:00.000Z'
    },
    {
      id: 'adm_002',
      fullName: 'Minh Pham',
      email: 'minh.pham@primeos.vn',
      accessLevel: 'ops_admin',
      workspace: 'SEA ops desk',
      status: 'active',
      lastSeenAt: '2026-04-23T01:05:00.000Z',
      createdAt: '2026-03-21T08:00:00.000Z',
      updatedAt: '2026-04-23T01:05:00.000Z'
    },
    {
      id: 'adm_003',
      fullName: 'Haruto Sato',
      email: 'haruto.sato@primeos.jp',
      accessLevel: 'catalog_admin',
      workspace: 'Catalog governance',
      status: 'invited',
      lastSeenAt: '2026-04-18T03:15:00.000Z',
      createdAt: '2026-04-11T08:00:00.000Z',
      updatedAt: '2026-04-18T03:15:00.000Z'
    }
  ],
  users: [
    {
      id: 'usr_001',
      fullName: 'Emma Thompson',
      email: 'emma.thompson@cyberrecord.jp',
      company: 'CyberRecord Japan',
      market: 'JP',
      seatType: 'brand_manager',
      status: 'active',
      createdAt: '2026-02-10T08:00:00.000Z',
      updatedAt: '2026-04-21T09:40:00.000Z'
    },
    {
      id: 'usr_002',
      fullName: 'Linh Dao',
      email: 'linh.dao@primeos.vn',
      company: 'Prime Commerce VN',
      market: 'VN',
      seatType: 'seller',
      status: 'active',
      createdAt: '2026-02-22T08:00:00.000Z',
      updatedAt: '2026-04-22T05:50:00.000Z'
    },
    {
      id: 'usr_003',
      fullName: 'Kenji Morita',
      email: 'kenji.morita@rakuten.jp',
      company: 'Rakuten partner desk',
      market: 'JP',
      seatType: 'partner',
      status: 'suspended',
      createdAt: '2026-01-30T08:00:00.000Z',
      updatedAt: '2026-04-14T02:25:00.000Z'
    },
    {
      id: 'usr_004',
      fullName: 'Sara Nguyen',
      email: 'sara.nguyen@primeos.sg',
      company: 'Prime Commerce SEA',
      market: 'SG',
      seatType: 'viewer',
      status: 'invited',
      createdAt: '2026-04-09T08:00:00.000Z',
      updatedAt: '2026-04-20T11:10:00.000Z'
    }
  ]
};
