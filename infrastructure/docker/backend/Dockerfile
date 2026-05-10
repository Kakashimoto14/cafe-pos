FROM php:8.3-cli-alpine

RUN docker-php-ext-install pdo pdo_pgsql

WORKDIR /var/www/html

COPY apps/backend /var/www/html

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=9000"]
