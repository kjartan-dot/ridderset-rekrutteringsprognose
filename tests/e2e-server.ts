// A separate test entry point. The production entry point never imports fixtures.
import path from "node:path";
import { createApp } from "../src/server/app";
import { fixtureFetch } from "./helpers";
createApp({
  fetcher: fixtureFetch,
  rateLimit: 10000,
  staticDir: path.resolve("dist/client"),
}).listen(4173, "127.0.0.1");
