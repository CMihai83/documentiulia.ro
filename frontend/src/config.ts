// API Configuration
export const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost/api/v1'
  : 'https://documentiulia.ro/api/v1';

export const APP_NAME = 'DocumentIulia';
export const APP_VERSION = '1.0.0';

// e-Factura Configuration
export const EFACTURA_CONFIG = {
  OAUTH_REDIRECT_URI: `${window.location.origin}/efactura/oauth-callback`,
  DEFAULT_DOWNLOAD_DAYS: 60,
  DEFAULT_ANALYTICS_PERIOD: 30
};
