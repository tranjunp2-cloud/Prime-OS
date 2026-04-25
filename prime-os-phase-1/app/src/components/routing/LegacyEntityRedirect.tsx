import { Navigate, useLocation, useParams } from 'react-router-dom';

export function LegacyPathRedirect({ to }: { to: string }) {
  const params = useParams();
  const location = useLocation();
  const resolvedPath = to.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];

    return value ? encodeURIComponent(value) : '';
  });
  const separator = resolvedPath.includes('?') || !location.search ? '' : location.search;

  return <Navigate to={`${resolvedPath}${separator}`} replace />;
}

export function LegacyEntityRedirect({ basePath }: { basePath: string }) {
  const { id } = useParams();
  const location = useLocation();

  return <Navigate to={`${id ? `${basePath}/${encodeURIComponent(id)}` : basePath}${location.search}`} replace />;
}
