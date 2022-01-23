import Settings from "../Settings";
import WordPressDB from "../WordPressDB";

let settings: Settings;

const test1 = async () => {
  const db = new WordPressDB(
    settings.dbHost,
    settings.dbUser,
    settings.dbPassword,
    settings.dbName
  );
  const metadata = await db.getContentMetadata("2");
  console.log(metadata);
};

const start = async () => {
  settings = Settings.load();
  await test1();
  process.exit(0);
};

start();
