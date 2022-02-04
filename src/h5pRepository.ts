import fetch from "node-fetch";
import {
  ILibraryMetadata,
  ILibraryName,
  LibraryName,
} from "@lumieducation/h5p-server";
import Settings from "./Settings";

/**
 * Returns library metadata by getting it from the WordPress HTTP server. If
 * WordPress and the microservice live on the same machine, this could also be
 * replaced by a function getting the data from the file system.
 */
export const getLibraryMetadata =
  (settings: Settings) =>
  async (library: ILibraryName): Promise<ILibraryMetadata> => {
    const ubername = LibraryName.toUberName(library);
    const result = await fetch(
      settings.wordpressUrlFetch +
        "/wp-content/uploads/h5p/libraries/" +
        ubername +
        "/library.json"
    );
    return (await result.json()) as ILibraryMetadata;
  };

/**
 * Returns an arbitrary library file by getting it from the WordPress HTTP
 * server. If WordPress and the microservice live on the same machine, this
 * could also be replaced by a function getting the data from the file system.
 *
 * @throws an error if you request a file that is not valid JSON
 */
export const getLibraryFileAsJson =
  (settings: Settings) =>
  async (libraryName: ILibraryName, filename: string): Promise<any> => {
    const ubername = LibraryName.toUberName(libraryName);
    const result = await fetch(
      settings.wordpressUrlFetch +
        "/wp-content/uploads/h5p/libraries/" +
        ubername +
        "/" +
        filename
    );
    return (await result.json()) as any;
  };
