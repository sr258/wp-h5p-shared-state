"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const h5p_shared_state_server_1 = __importDefault(require("@lumieducation/h5p-shared-state-server"));
let sharedStateServer;
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    // We now set up the Express server in the usual fashion.
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.json({ limit: "500mb" }));
    app.use(body_parser_1.default.urlencoded({
        extended: true,
    }));
    const port = process.env.PORT || "8080";
    // We need to create our own http server to pass it to the shared state
    // package.
    const server = http_1.default.createServer(app);
    // Add shared state websocket and ShareDB to the server
    sharedStateServer = new h5p_shared_state_server_1.default(server, () => { }, () => { }, (req) => __awaiter(void 0, void 0, void 0, function* () {
        // We get the raw request that was upgraded to the websocket from
        // SharedStateServer and have to get the user for it from the
        // session. As the request hasn't passed through the express
        // middleware, we have to call the required middleware ourselves.
    }), (user, contentId) => __awaiter(void 0, void 0, void 0, function* () {
        // user lookup
    }), () => { }, () => { });
    server.listen(port);
});
// We can't use await outside a an async function, so we use the start()
// function as a workaround.
start();
