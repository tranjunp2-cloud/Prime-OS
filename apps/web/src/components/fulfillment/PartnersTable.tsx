import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PartnerTypeBadge } from './PartnerTypeBadge';
import { PartnerStatusBadge } from './PartnerStatusBadge';
import { Globe, Eye } from 'lucide-react';
import type { FulfillmentPartner } from '@/lib/partner-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime } from '@/lib/i18n/format';

interface PartnersTableProps {
  partners: FulfillmentPartner[];
  isLoading: boolean;
}

export function PartnersTable({ partners, isLoading }: PartnersTableProps) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="surface-solid rounded-lg py-12 text-center text-muted-foreground">
        <Globe className="size-12 mx-auto mb-4 opacity-50" />
        <p>{t('fulfillment.partnersTable.emptyTitle')}</p>
        <p className="text-sm mt-1">{t('fulfillment.partnersTable.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <Table wrapperClassName="max-h-[calc(100vh-260px)]">
      <TableHeader>
        <TableRow>
          <TableHead>{t('fulfillment.partnersTable.colName')}</TableHead>
          <TableHead>{t('fulfillment.partnersTable.colType')}</TableHead>
          <TableHead>{t('fulfillment.partnersTable.colProvider')}</TableHead>
          <TableHead>{t('fulfillment.partnersTable.colStatus')}</TableHead>
          <TableHead>{t('fulfillment.partnersTable.colCreated')}</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {partners.map((partner) => (
          <TableRow
            key={partner.id}
            className="group/partner cursor-pointer"
            onClick={() => navigate(`/fulfillment/partners/${partner.id}`)}
          >
            <TableCell className="py-3.5">
              <Link
                to={`/fulfillment/partners/${partner.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {partner.name}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">{partner.provider_key}</span>
            </TableCell>
            <TableCell className="py-3.5">
              <PartnerTypeBadge type={partner.partner_type} />
            </TableCell>
            <TableCell className="py-3.5 text-sm text-muted-foreground">{partner.provider_key}</TableCell>
            <TableCell className="py-3.5">
              <PartnerStatusBadge status={partner.status} />
            </TableCell>
            <TableCell className="py-3.5 text-sm text-muted-foreground">
              {formatLocalizedDateTime(locale, partner.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
            </TableCell>
            <TableCell className="py-3.5">
              <Link
                to={`/fulfillment/partners/${partner.id}`}
                className="inline-flex text-muted-foreground opacity-70 transition-opacity group-hover/partner:opacity-100 hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <Eye className="size-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
