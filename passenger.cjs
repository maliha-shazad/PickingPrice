// Custom Passenger startup file. Select this filename in your hosting panel.
/* eslint-disable @typescript-eslint/no-require-imports */
const { pathToFileURL } = require('node:url');
const { tsImport } = require('tsx/esm/api');
process.chdir(__dirname);
// Optional absolute path to a private environment file, set through the panel.
if (process.env.PP_ENV_FILE) process.loadEnvFile(process.env.PP_ENV_FILE);
if (!process.env.DATABASE_URL || !process.env.APP_ORIGIN || !process.env.UPLOADS_DIR) {
  console.error('Set DATABASE_URL, APP_ORIGIN and UPLOADS_DIR in the hosting environment or PP_ENV_FILE.');
  process.exitCode = 1;
} else {
  tsImport('./server/index.ts', pathToFileURL(__filename).href).catch(() => {
    console.error('Picking Price could not start. Check runtime, database access and migration configuration.');
    process.exit(1);
  });
}
