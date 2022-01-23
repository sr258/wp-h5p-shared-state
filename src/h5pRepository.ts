import fetch from "node-fetch";
import {
  ILibraryMetadata,
  ILibraryName,
  LibraryName,
} from "@lumieducation/h5p-server";
import Settings from "./Settings";

export const getLibraryMetadata =
  (settings: Settings) =>
  async (library: ILibraryName): Promise<ILibraryMetadata> => {
    const ubername = LibraryName.toUberName(library);
    const result = await fetch(
      settings.wordpressUrl +
        "/wp-content/uploads/h5p/libraries/" +
        ubername +
        "/library.json"
    );
    return (await result.json()) as ILibraryMetadata;
  };

export const getLibraryFileAsJson =
  (settings: Settings) =>
  async (libraryName: ILibraryName, filename: string): Promise<any> => {
    const ubername = LibraryName.toUberName(libraryName);
    const result = await fetch(
      settings.wordpressUrl +
        "/wp-content/uploads/h5p/libraries/" +
        ubername +
        "/" +
        filename
    );
    return (await result.json()) as any;
  };
