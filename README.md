# WordPress H5P Shared State Microservice

This is a microservice that runs alongside a WordPress installation and allows
content type to have a shared state.

## Installation

- Configure you service with environment variables or .env (see example.env)
- Start the service (`npm ci && npm run build && npm start`)
- Configure wordpress by adding a library configuration in `wp-config.php` (change the hostnames according to your setup):

  ```
  define('H5P_LIBRARY_CONFIG', array(
      "H5P.ShareDBTest" => array(
              "serverUrl" => "ws://localhost:3000/shared-state",
              "auth" => "http://localhost:3000/auth-data")
          ));
  ```

- Start WordPress. Make sure you've set WORDPRESS_LOGGED_IN_KEY and
  WORDPRESS_LOGGED_IN_SALT to the same value as used in this microservice!