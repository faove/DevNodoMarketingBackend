#!/bin/sh
set -eu

composer install --no-interaction
php artisan package:discover --ansi || true
php artisan config:clear || true

exec /usr/bin/supervisord -c /etc/supervisord.conf
