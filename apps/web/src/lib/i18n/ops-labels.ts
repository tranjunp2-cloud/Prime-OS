import type {
  CarrierCode,
  ExceptionSeverity,
  ExceptionType,
  FlowType,
  JobStatus,
  ShipmentStatus,
} from '@/lib/fulfillment-types';
import type {
  PartnerStatus,
  PartnerType,
  QCOutcome,
  Disposition,
  ReturnStatus,
} from '@/lib/partner-types';

type Translator = (key: string) => string;

export function getLocalizedFlowTypeLabel(flowType: FlowType, t: Translator) {
  switch (flowType) {
    case 'seller_fulfilled':
      return t('fulfillment.flowType.sellerFulfilled');
    case 'marketplace_observer':
      return t('fulfillment.flowType.marketplaceObserver');
    case 'third_party_3pl':
      return t('fulfillment.flowType.thirdParty3pl');
  }
}

export function getLocalizedJobStatusLabel(status: JobStatus, t: Translator) {
  switch (status) {
    case 'pending':
      return t('fulfillment.jobStatus.pending');
    case 'picking':
      return t('fulfillment.jobStatus.picking');
    case 'packed':
      return t('fulfillment.jobStatus.packed');
    case 'shipped':
      return t('fulfillment.jobStatus.shipped');
    case 'done':
      return t('fulfillment.jobStatus.done');
    case 'cancelled':
      return t('fulfillment.jobStatus.cancelled');
    case 'exception':
      return t('fulfillment.jobStatus.exception');
    case 'observing':
      return t('fulfillment.jobStatus.observing');
  }
}

export function getLocalizedShipmentStatusLabel(status: ShipmentStatus, t: Translator) {
  switch (status) {
    case 'draft':
      return t('fulfillment.shipmentStatus.draft');
    case 'label_created':
      return t('fulfillment.shipmentStatus.labelCreated');
    case 'shipped':
      return t('fulfillment.shipmentStatus.shipped');
    case 'delivered':
      return t('fulfillment.shipmentStatus.delivered');
    case 'failed':
      return t('fulfillment.shipmentStatus.failed');
  }
}

export function getLocalizedExceptionTypeLabel(type: ExceptionType, t: Translator) {
  switch (type) {
    case 'short_pick':
      return t('fulfillment.exceptionType.shortPick');
    case 'damaged':
      return t('fulfillment.exceptionType.damaged');
    case 'delivery_failed':
      return t('fulfillment.exceptionType.deliveryFailed');
    case 'other':
      return t('fulfillment.exceptionType.other');
  }
}

export function getLocalizedExceptionSeverityLabel(severity: ExceptionSeverity, t: Translator) {
  switch (severity) {
    case 'low':
      return t('fulfillment.severity.low');
    case 'med':
      return t('fulfillment.severity.medium');
    case 'high':
      return t('fulfillment.severity.high');
  }
}

export function getLocalizedCarrierLabel(code: CarrierCode, t: Translator) {
  switch (code) {
    case 'japan_post':
      return t('fulfillment.carrier.japanPost');
    case 'sagawa':
      return t('fulfillment.carrier.sagawa');
    case 'yamato':
      return t('fulfillment.carrier.yamato');
    case 'ecms':
      return t('fulfillment.carrier.ecms');
    case 'manual':
      return t('fulfillment.carrier.manual');
  }
}

export function getLocalizedReturnStatusLabel(status: ReturnStatus, t: Translator) {
  switch (status) {
    case 'requested': return t('fulfillment.returnStatus.requested');
    case 'approved': return t('fulfillment.returnStatus.approved');
    case 'in_transit': return t('fulfillment.returnStatus.inTransit');
    case 'received': return t('fulfillment.returnStatus.received');
    case 'qc': return t('fulfillment.returnStatus.qc');
    case 'dispositioned': return t('fulfillment.returnStatus.dispositioned');
    case 'completed': return t('fulfillment.returnStatus.completed');
    case 'cancelled': return t('fulfillment.returnStatus.cancelled');
    case 'rejected': return t('fulfillment.returnStatus.rejected');
  }
}

export function getLocalizedQcOutcomeLabel(outcome: QCOutcome, t: Translator) {
  switch (outcome) {
    case 'pass': return t('fulfillment.qcOutcome.pass');
    case 'fail': return t('fulfillment.qcOutcome.fail');
    case null: return t('fulfillment.qcOutcome.pending');
  }
}

export function getLocalizedDispositionLabel(disposition: Disposition | null, t: Translator) {
  if (!disposition) return t('fulfillment.disposition.pending');
  switch (disposition) {
    case 'restock': return t('fulfillment.disposition.restock');
    case 'unfulfillable': return t('fulfillment.disposition.unfulfillable');
    case 'refurbish': return t('fulfillment.disposition.refurbish');
    case 'liquidation': return t('fulfillment.disposition.liquidation');
    case 'destroy': return t('fulfillment.disposition.destroy');
  }
}

export function getLocalizedPartnerTypeLabel(type: PartnerType, t: Translator) {
  switch (type) {
    case '3pl': return t('fulfillment.partnerType.threePl');
    case 'carrier': return t('fulfillment.partnerType.carrier');
    case 'supplier': return t('fulfillment.partnerType.supplier');
    case 'marketplace': return t('fulfillment.partnerType.marketplace');
  }
}

export function getLocalizedPartnerStatusLabel(status: PartnerStatus, t: Translator) {
  switch (status) {
    case 'active': return t('fulfillment.partnerStatus.active');
    case 'inactive': return t('fulfillment.partnerStatus.inactive');
    case 'pending': return t('fulfillment.partnerStatus.pending');
  }
}
