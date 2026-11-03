const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { fail } = require('./utils/response');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [config.frontendUrl, config.appUrl, /\.vercel\.app$/, /\.hostingersite\.com$/].filter(
      Boolean
    ),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Same-folder Hostinger: PassengerBaseURI /api strips the prefix, so use API_BASE_PATH=/
// Standalone / local: keep default /api
const apiBase = (process.env.API_BASE_PATH || '/api').replace(/\/$/, '') || '/';
app.use(
  apiBase === '/' ? '/uploads' : `${apiBase}/uploads`,
  express.static(path.resolve(process.cwd(), config.upload.dir))
);
app.use(apiBase === '/' ? '/' : apiBase, routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use((err, _req, res, _next) => fail(res, err));

const isPassenger = typeof PhusionPassenger !== 'undefined';
if (isPassenger) {
  // Hostinger / CloudLinux Passenger
  // eslint-disable-next-line no-undef
  PhusionPassenger.configure({ autoInstall: false });
  app.listen('passenger', () => {
    console.log(`Terranexus Properties API running under Passenger [${config.env}]`);
  });
} else {
  app.listen(config.port, () => {
    console.log(`Terranexus Properties API running on port ${config.port} [${config.env}]`);
  });
}

module.exports = app;
