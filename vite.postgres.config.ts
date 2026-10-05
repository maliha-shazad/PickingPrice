import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
// The shared screens read this public key the Next.js way; a plain Vite build has to inline it explicitly.
const define={'process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY':JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY||'')};
export default defineConfig({root:resolve('client'),publicDir:resolve('public'),plugins:[react()],define,resolve:{alias:{'@':resolve('.')}},build:{outDir:resolve('server/public'),emptyOutDir:true}});
