/***************************************************************************************************
 * Angular Universal + Express Server (MindLink UI)
 * Funziona con build:ssr e serve:ssr
 * Include proxy automatico per backend Django locale.
 ***************************************************************************************************/

import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppServerModule } from './src/main.server';

// === 🔧 CONFIGURAZIONE BACKEND DJANGO (modifica se serve) ===
const DJANGO_API_URL = process.env['DJANGO_API_URL'] || 'http://localhost:8000';

// ============================================================
// Express App Factory
// ============================================================
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/mindlink-ui/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? 'index.original.html'
    : 'index';

  // === Template Engine Angular Universal ===
  server.engine(
    'html',
    ngExpressEngine({
      bootstrap: AppServerModule,
    }),
  );

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // === Proxy per Backend Django ===
  server.use(
    '/api',
    createProxyMiddleware({
      target: DJANGO_API_URL,
      changeOrigin: true,
      logLevel: 'debug',
    }),
  );

  // === Static Files (browser assets) ===
  server.get(
    '*.*',
    express.static(distFolder, {
      maxAge: '1y',
    }),
  );

  // === Rotte Angular Universal ===
  server.get('*', (req, res) => {
    res.render(indexHtml, {
      req,
      providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
    });
  });

  // === Middleware di errore generale ===
  server.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Errore SSR:', err);
    res.status(500).send('Internal Server Error');
  });

  return server;
}

// ============================================================
// Server Bootstrap
// ============================================================
function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {
    console.log(`🚀 MindLink SSR server avviato su http://localhost:${port}`);
    console.log(`🔁 Proxy API attivo su ${DJANGO_API_URL}/api`);
  });
}

// ============================================================
// Avvio condizionale
// ============================================================
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';

if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

// Esporta per build SSR
export * from './src/main.server';
