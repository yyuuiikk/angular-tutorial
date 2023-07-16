import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/angular-app/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  // server.get('*', (req, res) => {
  //   res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  // });

  const cacheManager = require('cache-manager');

  const memoryCache = cacheManager.caching({
    store: 'memory',
    max: 50
  });

// Serving server rendered routes
  server.get('*',
    (req, res, next) => {
      // try to get the requested url from cache
      memoryCache.get(req.originalUrl).then((cachedHtml: any) => {
        if (cachedHtml) {
          // Cached page exists. Send it.
          res.send(cachedHtml);
        } else {
          // Cached page does not exist.
          // Render a response using the Angular express engine
          next();
        }
      }).catch((error: any) => {
        // if we have an error render using angular univesal
        next();
      });
    },
    (req, res) => {
      res.render(
        indexHtml, {req, providers:
            [{provide: APP_BASE_HREF, useValue: req.baseUrl}]},
        (err: Error, html: string) => {
          // Cache the rendered `html` for this request url to
          // use for subsequent requests
          // Cache the rendered page and set the cache to be
          // eviced after 300s (5 minutes)
          memoryCache.set(req.originalUrl, html, 300)
            .catch((err: any) => console.log('Could not cache the request', err));

          res.send(html);
        }
      );
    }
  );


  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
