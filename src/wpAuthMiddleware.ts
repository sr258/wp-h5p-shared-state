import express from "express";
import debug from "debug";
import * as wpAuth from "wp-auth";

import Settings from "./Settings";
import WordPressDB from "./WordPressDB";

const log = debug("wp-auth-middleware");

/**
 * Authenticates requests with WordPress session information
 */
export default (
  settings: Settings,
  db: WordPressDB,
  options?: {
    unauthenticatedBehavior?: "redirect" | "error" | "next";
  }
) => {
  const authenticator = wpAuth.create({
    wpurl: settings.wordpressUrl,
    logged_in_key: settings.loggedInKey,
    logged_in_salt: settings.loggedInSalt,
    mysql_host: settings.dbHost,
    mysql_user: settings.dbUser,
    mysql_pass: settings.dbPassword,
    mysql_db: settings.dbName,
    mysql_port: settings.dbPort,
    wp_table_prefix: settings.tablePrefix,
  });
  log("WordPress authenticator initialized");

  return (req: express.Request, res: express.Response, next): void => {
    authenticator
      .checkAuth(req)
      .on("auth", async (authIsValid: boolean, userId: string | undefined) => {
        const fail = () => {
          if (options?.unauthenticatedBehavior === "next") {
            log("User not authenticated. Calling next");
            return next();
          }
          if (options?.unauthenticatedBehavior === "error") {
            log("User not authenticated. Returning 401");
            res.status(401).send();
          } else if (
            options?.unauthenticatedBehavior === "redirect" ||
            !options?.unauthenticatedBehavior
          ) {
            log("User not authenticated. Redirecting to login page");
            res.redirect(
              `${settings.wordpressUrl}/wp-login.php?redirect_to=${settings.microserviceUrl}`
            );
          }
        };

        log("Received authentication information from WP");
        if (authIsValid && userId) {
          const data = await db.getUserData(userId);
          if (!data) {
            log("User does not exist in user table.");
            return fail();
          }

          let roles: { [role: string]: boolean };
          try {
            roles = await new Promise((resolve, reject) => {
              authenticator.getUserMeta(userId, "wp_capabilities", (roles) => {
                if (!roles) {
                  reject();
                }
                resolve(roles);
              });
            });
          } catch (error) {
            log("Error while getting user meta for user id %s", userId);
            return fail();
          }

          req.user = { ...data, id: userId };
          for (const role in roles) {
            if (roles[role] !== true) {
              continue;
            }
            if (db.hasCapability(role, "edit_posts")) {
              req.user.permission = "privileged";
            }
          }
          if (!req.user?.permission) {
            req.user.permission = "user";
          }
          log(
            "User is logged in with permission level %s",
            req.user.permission
          );
          next();
        } else {
          log("User is not logged in.");
          return fail();
        }
      });
  };
};
