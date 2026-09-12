export default async function handler(request, response) {
  const { app } = await import('../apps/api/src/server.js');
  return app(request, response);
}
