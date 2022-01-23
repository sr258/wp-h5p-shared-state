import bodyParser from "body-parser";
import express from "express";
import http from "http";
import SharedStateServer from "@lumieducation/h5p-shared-state-server";
import debug from "debug";

import Settings from "./Settings";
import WordPressDB from "./WordPressDB";
import wpAuthMiddleware from "./wpAuthMiddleware";

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

  app.use(wpAuthMiddleware(settings, db));

  // We need to create our own http server to pass it to the shared state
  // package.
  const server = http.createServer(app);

  // Add shared state websocket and ShareDB to the server
  sharedStateServer = new SharedStateServer(
    server,
    (library) => { fetch()},
    () => {},
    async (req: express.Request) => {
      // We get the raw request that was upgraded to the websocket from
      // SharedStateServer and have to get the user for it from the
      // session. As the request hasn't passed through the express
      // middleware, we have to call the required middleware ourselves.
    },
    async (user, contentId) => {
      // user lookup
    },
    () => {},
    () => {}
  );

  server.listen(settings.port, () => {
    console.log(`Microservice listening at http://localhost:${settings.port}`);
    console.log(`Microservice public URL is ${settings.microserviceUrl}`);
  });
};

// We can't use await outside a an async function, so we use the start()
// function as a workaround.

start();
