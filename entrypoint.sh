#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_INSFORGE_URL: "${VITE_INSFORGE_URL}",
  VITE_INSFORGE_ANON_KEY: "${VITE_INSFORGE_ANON_KEY}"
};
EOF

exec nginx -g 'daemon off;'
