FROM php:8.4-fpm-alpine

RUN set -eux; \
    apk add --no-cache \
        nginx \
        supervisor \
        git \
        curl \
        zip \
        unzip \
        libpng-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev \
        icu-dev; \
    apk add --no-cache --virtual .build-deps $PHPIZE_DEPS; \
    docker-php-ext-install pdo_pgsql mbstring zip gd pcntl bcmath intl; \
    git clone --branch 6.1.0 --depth 1 https://github.com/phpredis/phpredis.git /tmp/phpredis; \
    cd /tmp/phpredis; \
    phpize; \
    ./configure; \
    make -j"$(nproc)"; \
    make install; \
    rm -rf /tmp/phpredis; \
    docker-php-ext-enable redis; \
    apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN set -eux; \
    composer install --no-dev --optimize-autoloader --no-interaction; \
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
