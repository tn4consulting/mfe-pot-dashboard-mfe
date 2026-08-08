// Literal first import -- must run, including require-in-the-middle's
// module-patching hook installation, before `./app` pulls in express (see
// mfe-pot-platform/CLAUDE.md's observability section for why the ordering
// matters). Instrumenting undici here matters specifically for this BFF:
// its own fan-out to job-bank-bff/employment-insurance-bff (overview.ts)
// uses the native fetch API, not http.request.
import '@tn4consulting/shared-observability-server/register';
import { createApp } from './app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3004;

createApp().listen(port, host, () => {
  console.log(`[ ready ] dashboard-bff listening at http://${host}:${port}`);
});
