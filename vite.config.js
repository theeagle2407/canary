import {canaryProtocolsPlugin} from './scripts/protocols-plugin.mjs';
import {canaryIdentityPlugin} from './scripts/qie-id-plugin.mjs';
import {canarySnapshotPlugin} from './scripts/snapshot-plugin.mjs';
import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import tailwindcss from '@tailwindcss/vite';export default defineConfig({plugins:[canaryProtocolsPlugin(),canaryIdentityPlugin(),canarySnapshotPlugin(),react(),tailwindcss()],resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}}});
