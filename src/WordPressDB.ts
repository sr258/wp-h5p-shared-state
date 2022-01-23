import mysql, { RowDataPacket } from "mysql2/promise";
import serialize from "wp-auth/serialize";
import debug from "debug";
import {
  ContentId,
  ContentParameters,
  IContentMetadata,
  IUser,
} from "@lumieducation/h5p-server";

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
  public hasCapability = async (
    role: string,
    capability: string
  ): Promise<boolean> => {
    if (!this.initialized) {
      await this.init();
    }
    return this.capabilities[role]?.capabilities[capability] ?? false;
  };

  public getCapabilities = async (
    role: string | string[]
  ): Promise<string[]> => {
    if (Array.isArray(role)) {
      return Array.from(
        new Set<string>(
          (
            await Promise.all(
              role.map((role) => this.getCapabilitiesForSingleRole(role))
            )
          ).reduce((prev, curr) => {
            return prev.concat(curr);
          }, [])
        )
      );
    } else {
      return this.getCapabilitiesForSingleRole(role);
    }
  };

  public getCapabilitiesForSingleRole = async (
    role: string
  ): Promise<string[]> => {
    if (!this.initialized) {
      await this.init();
    }

    const roleObject = this.capabilities[role];
    if (!roleObject) {
      return [];
    }

    const caps: string[] = [];
    for (const cap in roleObject.capabilities) {
      if (roleObject.capabilities[cap]) {
        caps.push(cap);
      }
    }
    return caps;
  };

  /**
   * Loads capabilities from the WordPress database.
   * @throws an error if unable to connect to database
   */
  public init = async () => {
    log("Loading roles from WP database ...");

    const connection = await this.getConnection();

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
  };

  /**
   * Gets information about a user from the database
   * @param id the user id (!= username; this is the primary key of the user)
   * @returns information about the user or undefined if it did not exist
   * @throws an error if the database is unavailable
   */
  public getUserData = async (
    id: string
  ): Promise<
    { username: string; displayName: string; email: string } | undefined
  > => {
    log("Getting user information for id %d from WP database...", id);

    const connection = await this.getConnection();

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
  };

  public getContentMetadata = async (
    contentId: ContentId
  ): Promise<IContentMetadata> => {
    const connection = await this.getConnection();

    const contentIdNumber = Number.parseInt(contentId);

    try {
      const [cRows] = await connection.query(
        `SELECT c.title, 
                c.embed_type, 
                c.content_type, 
                c.authors,
                c.source,
                c.year_from, 
                c.year_to, 
                c.license, 
                c.license_version, 
                c.license_extras, 
                c.author_comments, 
                c.changes, 
                c.default_language, 
                c.a11y_title, 
                l.name 
                FROM wp_h5p_contents AS c
                JOIN wp_h5p_libraries AS l
                ON c.library_id = l.id
                WHERE c.id = ?`,
        [contentIdNumber]
      );
      log("Got content info.");
      if (!cRows[0]) {
        throw new Error("No content with this contentId!");
      }

      const [lRows] = (await connection.query(
        `SELECT l.name,
                l.major_version,
                l.minor_version,
                cl.dependency_type
                FROM wp_h5p_libraries AS l
                JOIN wp_h5p_contents_libraries AS cl
                ON l.id = cl.library_id
                WHERE cl.content_id = ?`,
        [contentIdNumber]
      )) as RowDataPacket[][];

      return {
        a11yTitle: cRows[0].a11y_title,
        authorComments: cRows[0].author_comments,
        authors: JSON.parse(cRows[0].authors),
        changes: JSON.parse(cRows[0].changes),
        contentType: cRows[0].content_type,
        defaultLanguage: cRows[0].default_language,
        editorDependencies: lRows
          .filter((d) => d.dependency_type === "editor")
          .map((d) => ({
            machineName: d.name,
            majorVersion: d.major_version,
            minorVersion: d.minor_version,
          })),
        embedTypes: [cRows[0].embed_type],
        language: cRows[0].default_language,
        license: cRows[0].license,
        licenseExtras: cRows[0].license_extras,
        licenseVersion: cRows[0].license_version,
        mainLibrary: cRows[0].name,
        preloadedDependencies: lRows
          .filter((d) => d.dependency_type === "preloaded")
          .map((d) => ({
            machineName: d.name,
            majorVersion: d.major_version,
            minorVersion: d.minor_version,
          })),
        source: cRows[0].source,
        title: cRows[0].title,
        yearFrom: cRows[0].year_from,
        yearTo: cRows[0].year_to,
      };
    } catch (error) {
      log("Error while getting content metadata from database: %s", error);
      throw error;
    }
  };
  public getContentParameters = async (
    contentId: ContentId
  ): Promise<ContentParameters> => {
    const connection = await this.getConnection();

    const contentIdNumber = Number.parseInt(contentId);

    try {
      const [cRows] = await connection.query(
        `SELECT parameters
                FROM wp_h5p_contents
                WHERE id = ?`,
        [contentIdNumber]
      );
      log("Got content parameters.");
      if (!cRows[0]) {
        throw new Error("No content with this contentId!");
      }

      return JSON.parse(cRows[0].parameters);
    } catch (error) {
      log("Error while getting parameters from database: %s", error);
      throw error;
    }
  };

  private getConnection = async (): Promise<mysql.Connection> => {
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
    return connection;
  };
}
