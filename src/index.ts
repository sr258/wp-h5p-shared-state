import bodyParser from "body-parser";
import express from "express";
import http from "http";
import SharedStateServer from "@lumieducation/h5p-shared-state-server";
import debug from "debug";
import { promisify } from "util";
import cors from "cors";

import Settings from "./Settings";
import WordPressDB from "./WordPressDB";
import wpAuthMiddleware from "./wpAuthMiddleware";
import * as h5pRepository from "./h5pRepository";
import User from "./User";

const log = debug("wp-microservice");

let db: WordPressDB;
let settings: Settings;
let sharedStateServer: SharedStateServer;

const main = async (): Promise<void> => {
  // Get settings (from environment variables or .env file. See example.env what
  // variables can and must be set)
  settings = Settings.load();
  log("Settings loaded");

  // Set up database repository
  db = new WordPressDB(
    settings.dbHost,
    settings.dbUser,
    settings.dbPassword,
    settings.dbName
  );

  // Load roles from WordPress database for later checks
  try {
    await db.init();
  } catch (error) {
    console.error(error);
    // Terminate with non-zero error code if the roles could not be loaded
    // (usually a problem with the DB connection)
    process.exit(1);
  }
  log("Initialized database");

  // Create express server
  const app = express();

  app.use(bodyParser.json({ limit: "500mb" }));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  // We need CORS for the HTTP XHR request sent to /auth-data/:contentId. We
  // only allow requests originating from the WordPress site and also allow the
  // cookie.
  app.use(cors({ origin: settings.wordpressUrl, credentials: true }));

  // authenticate users with the WordPress session
  const wpAuth = wpAuthMiddleware(settings, db, {
    unauthenticatedBehavior: "next",
  });
  app.use(wpAuth);

  // For later use in callback
  const wpAuthPromised = promisify(
    wpAuthMiddleware(settings, db, { unauthenticatedBehavior: "next" })
  ).bind(wpAuth);

  /**
   * This route returns human-readable information about the currently logged in
   * user. Only for debugging purposes to test the authentication.
   */
  app.get("/auth-test", (req, res) => {
    const output = `Hello ${
      req.user?.displayName ?? "not logged in user"
    }!\nI have this information about you: ${JSON.stringify(
      req.user,
      undefined,
      2
    )}`.replace("\n", "<br/>");
    res.send(output);
  });

  /**
   * The route returns information about the user. It is used by the client to
   * find out who the user is and what privilege level he/she has. This
   * information is not included in the WordPress H5P integration object and we
   * avoid forking the H5P plugin by adding this route here.
   */
  app.get(
    "/auth-data/:contentId",
    (req: express.Request<{ contentId: string }>, res) => {
      if (!req.user) {
        res.status(200).json({ level: "anonymous" });
      } else {
        let level: string;
        // We currently give everyone who can edit H5Ps privileged permission.
        // TODO: follow the pattern of the main H5P plugin and respect
        // "edit_others_h5p_contents" and check the owner of the content
        if (req.user.permissions.includes("edit_h5p_contents")) {
          level = "privileged";
        } else {
          level = "user";
        }
        res.status(200).json({ level, userId: req.user.id?.toString() });
      }
    }
  );

  // We need to create our own http server to pass it to the shared state
  // package.
  const server = http.createServer(app);

  // Add shared state websocket and ShareDB to the server
  sharedStateServer = new SharedStateServer(
    server,
    h5pRepository.getLibraryMetadata(settings),
    h5pRepository.getLibraryFileAsJson(settings),
    async (req: express.Request) => {
      // This function is called when a user connects to the websocket. The
      // Express middleware above isn't applied for websockets, so we have to
      // call the authentication middleware ourselves.
      await wpAuthPromised(req, null as any);
      if (!req.user || !req.user.id) {
        console.log("Unauthenticated user tried to access websocket.");
        // TODO: improve and assign own session
        return new User("anonymous", "anonymous", "", "anonymous");
      } else {
        return {
          ...req.user,
          type: "local",
          canCreateRestricted: false,
          canInstallRecommended: false,
          canUpdateAndInstallLibraries: false,
          name: req.user.displayName ?? "",
          email: req.user.email ?? "",
          id: req.user.id ?? "",
        };
      }
    },
    async (user, contentId) => {
      // Determine the permission level for the specific content type that the
      // user wants to access
      if ((user as any)?.permissions?.includes("edit_h5p_contents")) {
        return "privileged";
      } else {
        return "user";
      }
    },
    db.getContentMetadata,
    db.getContentParameters
  );

  server.listen(settings.port, () => {
    console.log(`Microservice listening at http://localhost:${settings.port}`);
    console.log(`Microservice public URL is ${settings.microserviceUrl}`);
  });
};

// We can't use await outside a an async function, so we use the main()
// function as a workaround.
main();
