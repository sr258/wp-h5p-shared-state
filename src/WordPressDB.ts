import mysql from "mysql2/promise";
import serialize from "wp-auth/serialize";
import debug from "debug";

const log = debug("wp-microservice:db");

/**
 * Queries the WordPress database
 */
export default class WordPressDB {
  constructor(
    private dbHost: string,
    private dbUser: string,
    private dbPassword: string,
    private dbDatabase: string
  ) {}

  /**
   * Caches the capabilities
   */
  private capabilities: {
    [role: string]: {
      name: string;
      capabilities: {
        [name: string]: boolean;
      };
    };
  } = {};

  private initialized: boolean = false;

  /**
   * Checks if a certain role has a capability.
   * @param role a WordPress role
   * @param capability a WordPress capability
   * @returns true if the role has the capability
   */
  public hasCapability(role: string, capability: string): boolean {
    if (!this.initialized) {
      this.init();
    }
    return this.capabilities[role]?.capabilities[capability] ?? false;
  }

  /**
   * Loads capabilities from the WordPress database.
   * @throws an error if unable to connect to database
   */
  async init() {
    log("Loading roles from WP database ...");

    let connection: mysql.Connection;
    try {
      connection = await mysql.createConnection({
        host: this.dbHost,
        user: this.dbUser,
        password: this.dbPassword,
        database: this.dbDatabase,
      });
    } catch (error) {
      console.error("Error while connecting to database: ", error);
      throw error;
    }

    let res;
    try {
      res = await connection.query(
        "SELECT option_value FROM wp_options WHERE `option_name` = 'wp_user_roles'"
      );
    } catch (error) {
      log("Error while getting roles from database: %s", error);
      return undefined;
    }

    this.capabilities = serialize.unserialize(res[0][0].option_value);

    if (this.capabilities) {
      log("%d roles loaded.", Object.keys(this.capabilities).length);
    } else {
      console.error("Could not load roles and capabilities from database!");
      this.initialized = false;
    }

    this.initialized = true;
  }

  /**
   * Gets information about a user from the database
   * @param id the user id (!= username; this is the primary key of the user)
   * @returns information about the user or undefined if it did not exist
   * @throws an error if the database is unavailable
   */
  async getUserData(
    id: string
  ): Promise<
    { username: string; displayName: string; email: string } | undefined
  > {
    log("Getting user information for id %d from WP database...", id);
    let connection: mysql.Connection;
    try {
      connection = await mysql.createConnection({
        host: this.dbHost,
        user: this.dbUser,
        password: this.dbPassword,
        database: this.dbDatabase,
      });
    } catch (error) {
      console.error("Error while connecting to database: ", error);
      throw error;
    }

    try {
      const res = await connection.query(
        "SELECT display_name, user_email, user_nicename FROM wp_users WHERE `ID` = ?",
        [id]
      );
      log("Got user information from db.");

      return {
        displayName: res[0][0].display_name,
        email: res[0][0].user_email,
        username: res[0][0].user_nicename,
      };
    } catch (error) {
      log("Error while getting user information from database: %s", error);
      return undefined;
    }
  }
}
