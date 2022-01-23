import bodyParser from "body-parser";
import express from "express";
import http from "http";
import SharedStateServer from "@lumieducation/h5p-shared-state-server";
import debug from "debug";
import { promisify } from "util";

import Settings from "./Settings";
import WordPressDB from "./WordPressDB";
import wpAuthMiddleware from "./wpAuthMiddleware";
import * as h5pRepository from "./h5pRepository";
import User from "./User";

const log = debug("wp-microservice");
let db: WordPressDB;
let settings: Settings;
let sharedStateServer: SharedStateServer;

const start = async (): Promise<void> => {
  // Get settings (from environment variables)
  settings = Settings.load();
  log("Settings loaded");

  // Set up database repository
  db = new WordPressDB(
    settings.dbHost,
    settings.dbUser,
    settings.dbPassword,
    settings.dbName
  );
  // Load roles from WordPress database to allow checks
  try {
    await db.init();
  } catch (error) {
    console.error(error);
    // Terminate with non-zero error code
    process.exit(1);
  }
  log("Initialized database");

  // We now set up the Express server in the usual fashion.
  const app = express();

  app.use(bodyParser.json({ limit: "500mb" }));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  const wpAuth = wpAuthMiddleware(settings, db);

  const wpAuthPromised = promisify(
    wpAuthMiddleware(settings, db, { unauthenticatedBehavior: "next" })
  ).bind(wpAuth);
  app.use(wpAuth);

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

  // We need to create our own http server to pass it to the shared state
  // package.
  const server = http.createServer(app);

  // Add shared state websocket and ShareDB to the server
  sharedStateServer = new SharedStateServer(
    server,
    h5pRepository.getLibraryMetadata(settings),
    h5pRepository.getLibraryFileAsJson(settings),
    async (req: express.Request) => {
      await wpAuthPromised(req, null as any);
      if (!req.user || !req.user.id) {
        console.log("Unauthenticated user tried to access websocket.");
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
      if ((user as any).permissions.includes("edit_h5p_contents")) {
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

// We can't use await outside a an async function, so we use the start()
// function as a workaround.

start();
