import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
// Builds the browser app (client/) into server/public, which the Express server serves.
// The optional Google Maps key for location detection is built into the page.
const define={'process.env.GOOGLE_MAPS_KEY':JSON.stringify(process.env.GOOGLE_MAPS_KEY||'')};
export default defineConfig({root:resolve('client'),publicDir:resolve('public'),plugins:[react()],define,resolve:{alias:{'@':resolve('.')}},build:{outDir:resolve('server/public'),emptyOutDir:true}});
