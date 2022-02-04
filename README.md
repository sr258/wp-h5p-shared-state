# WordPress H5P Shared State Microservice

This is a microservice that runs alongside a WordPress installation and allows
content types to have a shared state.

## Requirements

- NodeJS >= 16
- NPM >= 7

## Installation

- Configure you service with environment variables or .env (see example.env)
- Start the service (`npm ci && npm run build && npm start`)
- Configure WordPress by adding a library configuration in `wp-config.php`
  (change the hostnames according to your setup):

  ```php
  define('H5P_LIBRARY_CONFIG', array(
      "H5P.ShareDBTest" => array(
              "serverUrl" => "ws://localhost:3000/shared-state",
              "auth" => "http://localhost:3000/auth-data")
          ));
  ```

- Add this to `wp-config.php` to allow multiple uploads of the same library
  version for testing purposes:

  ```php
  define('H5P_DEV', true);
  define('H5P_DISABLE_AGGREGATION', true);
  ```

- Start WordPress. Make sure you've set WORDPRESS_LOGGED_IN_KEY and
  WORDPRESS_LOGGED_IN_SALT to the same value as used in this microservice!
