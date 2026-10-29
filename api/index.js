import {
  createSliceServer,
  sliceFallback,
  sliceErrorHandler
} from 'slicejs-web-framework/api/framework/server.js';

const server = createSliceServer();

// Vercel imports this module instead of running it: there is no listener, so the
// usual `start()` cannot run, and since framework 4.1.1 the terminal SPA fallback
// lives in `start()` (not in the factory). Without it, "/" answers Express's
// default "Cannot GET /" 404. Mount the fallback by hand; `start()` skips it when
// it is already there. (If this app ever configures `seo`, move these two lines
// into the Vercel branch: the prepared SEO context is built inside `start()`.)
server.app.use(sliceFallback());
server.app.use(sliceErrorHandler());

if (!process.env.VERCEL) {
  await server.start();
}

export default server.app;
