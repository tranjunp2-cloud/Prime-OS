import { Navigate, useLocation } from 'react-router-dom';
import { legacyStoreManagementTarget } from './navigation';

export default function LegacyPosRedirect() {
  const { pathname, search } = useLocation();
  const target = legacyStoreManagementTarget(search);
  return <Navigate replace to={target || `${pathname === '/products/pos-assortment' ? '/pos/products' : '/pos/settings'}${search}`} />;
}
