// This load the .env file
import "dotenv/config";

/**
 * Central repository for global settings. Initialize with the load() factory
 * method.
 */
export default class Settings {
  private constructor() {}

  public wordpressUrl: string = "";
  public microserviceUrl: string = "";
  public loggedInKey: string = "";
  public loggedInSalt: string = "";
  public dbHost: string = "";
  public dbUser: string = "";
  public dbPassword: string = "";
  public dbName: string = "";
  public dbPort: number = 3306;
  public tablePrefix: string = "wp_";
  public port: number = 3000;

  /**
   * Factory method that loads the settings from the environment variables and
   * returns an instance of the settings class
   * @returns an instance of the settings class
   */
  public static load(): Settings {
    const settings = new Settings();
    if (settings.checkEnvVars()) {
      console.error("The service cannot be started.");
      process.exit();
    }
    settings.loadEnvVars();
    return settings;
  }

  private loadEnvVars() {
    this.wordpressUrl = process.env.WORDPRESS_URL as string;
    this.microserviceUrl = process.env.MICROSERVICE_URL as string;
    this.loggedInKey = process.env.WORDPRESS_LOGGED_IN_KEY as string;
    this.loggedInSalt = process.env.WORDPRESS_LOGGED_IN_SALT as string;
    this.dbHost = process.env.WORDPRESS_DB_HOST as string;
    this.dbUser = process.env.WORDPRESS_DB_USER as string;
    this.dbPassword = process.env.WORDPRESS_DB_PASSWORD as string;
    this.dbName = process.env.WORDPRESS_DB_NAME as string;
    if (process.env.WORDPRESS_DB_PORT) {
      this.dbPort = Number.parseInt(process.env.WORDPRESS_DB_PORT);
    }
    if (process.env.WORDPRESS_TABLE_PREFIX) {
      this.tablePrefix = process.env.WORDPRESS_TABLE_PREFIX;
    }
    if (process.env.PORT) {
      this.port = Number.parseInt(process.env.PORT);
    }
  }

  /**
   * Checks the environment variables and reports errors in the console.
   * @returns true if there was an error false if there was none
   */
  private checkEnvVars(): boolean {
    let err: boolean = false;
    if (!process.env.WORDPRESS_URL) {
      console.error("WORDPRESS_URL must be set for the microservice to run.");
      err = true;
    }
    if (!process.env.MICROSERVICE_URL) {
      console.error(
        "MICROSERVICE_URL must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_LOGGED_IN_KEY) {
      console.error(
        "WORDPRESS_LOGGED_IN_KEY must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_LOGGED_IN_SALT) {
      console.error(
        "WORDPRESS_LOGGED_IN_SALT must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_DB_HOST) {
      console.error(
        "WORDPRESS_DB_HOST must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_DB_USER) {
      console.error(
        "WORDPRESS_DB_USER must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_DB_PASSWORD) {
      console.error(
        "WORDPRESS_DB_PASSWORD must be set for the microservice to run."
      );
      err = true;
    }
    if (!process.env.WORDPRESS_DB_NAME) {
      console.error(
        "WORDPRESS_DB_NAME must be set for the microservice to run."
      );
      err = true;
    }
    if (
      process.env.WORDPRESS_DB_PORT &&
      Number.parseInt(process.env.WORDPRESS_DB_PORT) === Number.NaN
    ) {
      console.error("WORDPRESS_DB_PORT has an invalid value.");
      err = true;
    }

    return err;
  }
}
