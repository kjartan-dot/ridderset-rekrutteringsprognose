import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import path from "node:path";
import { createApp } from "./app";
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
  setGlobalDispatcher(new EnvHttpProxyAgent());
const port = Number(process.env.PORT ?? 3001);
const app = createApp({
  staticDir:
    process.env.NODE_ENV === "production"
      ? path.resolve("dist/client")
      : undefined,
});
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Ridderset API: http://localhost:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
