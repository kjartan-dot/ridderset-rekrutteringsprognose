import express from "express";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import path from "node:path";
import { assessmentSchema, worklifeSchema } from "../shared/contracts";
import { counties } from "../shared/types";
import { assessWorklife } from "../shared/worklife";
import { buildReport, reportText } from "../shared/assessment";
import { ApiError, JsonClient, type Fetcher } from "./http";
import { BrregAdapter } from "./adapters/brreg";
import { SsbAdapter, unavailableSalary } from "./adapters/ssb";
import { navMarket } from "./adapters/nav";
import { occupations, searchOccupations } from "./occupations";
export function createApp(
  options: { fetcher?: Fetcher; rateLimit?: number; staticDir?: string } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": [
            "'self'",
            "https://ridderset.no",
            "https://www.ridderset.no",
          ],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "upgrade-insecure-requests":
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      frameguard: false,
    }),
  );
  app.use(compression());
  const api = express.Router();
  api.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: options.rateLimit ?? 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMIT",
          message: "For mange oppslag. Vent ett minutt før du prøver igjen.",
        },
      },
    }),
  );
  api.use(express.json({ limit: "32kb", type: "application/json" }));
  const client = new JsonClient(options.fetcher);
  const brreg = new BrregAdapter(client),
    ssb = new SsbAdapter(client);
  const kindSchema = z.enum(["entity", "unit"]).default("entity");
  const occupationSchema = z
    .string()
    .regex(/^\d{4}$/)
    .refine(
      (code) => occupations.some((o) => o.code === code),
      "Velg en gyldig STYRK08-kode.",
    );
  const countySchema = z.enum(
    counties.map((x) => x[0]) as [string, ...string[]],
  );
  const marketQuery = z.object({
    occupation: occupationSchema,
    county: countySchema,
  });
  const salary = async (code: string) => {
    try {
      return await ssb.salary(code);
    } catch (e) {
      if (e instanceof ApiError) return unavailableSalary(e.message);
      throw e;
    }
  };
  api.get("/health", (_req, res) =>
    res.json({
      status: "ok",
      version: "0.1.0",
      navFeed: "unavailable",
      persistence: "none",
    }),
  );
  api.get("/companies/search", async (req, res) => {
    const { q, kind, page } = z
      .object({
        q: z.string().trim().min(2).max(100),
        kind: kindSchema,
        page: z.coerce.number().int().min(0).max(1000).default(0),
      })
      .parse(req.query);
    res.json(await brreg.search(q, kind, page));
  });
  api.get("/companies/:orgnr/units", async (req, res) => {
    const orgnr = z
      .string()
      .regex(/^\d{9}$/)
      .parse(req.params.orgnr);
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(1000)
      .default(0)
      .parse(req.query.page);
    res.json(await brreg.search("", "unit", page, orgnr));
  });
  api.get("/companies/:orgnr", async (req, res) =>
    res.json(
      await brreg.get(
        z
          .string()
          .regex(/^\d{9}$/)
          .parse(req.params.orgnr),
        kindSchema.parse(req.query.kind),
      ),
    ),
  );
  api.get("/occupations/search", (req, res) => {
    const q = z.string().trim().min(1).max(100).parse(req.query.q);
    res.json({ items: searchOccupations(q), catalogSize: occupations.length });
  });
  api.get("/salary", async (req, res) =>
    res.json(await salary(occupationSchema.parse(req.query.occupation))),
  );
  api.get("/sources/ssb/:table/metadata", async (req, res) =>
    res.json(await ssb.metadata(req.params.table)),
  );
  api.get("/market/vacancies", (req, res) => {
    const { occupation, county } = marketQuery.parse(req.query);
    res.json(navMarket(occupation, county));
  });
  api.get("/market/shortage", (req, res) => {
    const { occupation, county } = marketQuery.parse(req.query);
    const data = navMarket(occupation, county);
    res.json({
      occupation: data.occupationShortage,
      county: data.countyShortage,
    });
  });
  api.post("/assessment/worklife", (req, res) =>
    res.json(assessWorklife(worklifeSchema.parse(req.body))),
  );
  const makeReport: express.RequestHandler = async (req, res) => {
    const input = assessmentSchema.parse(req.body);
    const occupation = occupations.find(
      (o) => o.code === input.role.occupationCode,
    );
    if (!occupation)
      throw new ApiError(
        400,
        "INVALID_OCCUPATION",
        "Velg en gyldig STYRK08-kode.",
      );
    // Register data is re-resolved server-side. Client-supplied registry facts are not trusted.
    input.company =
      input.company.kind === "manual"
        ? {
            ...input.company,
            source: "employer",
            parentOrgnr: null,
            addressType: "manual",
            retrievedAt: new Date().toISOString(),
          }
        : await brreg.get(input.company.orgnr ?? "", input.company.kind);
    const report = buildReport(
      input,
      occupation,
      await salary(occupation.code),
      navMarket(occupation.code, input.role.county),
    );
    res.json({ report, text: reportText(report) });
  };
  api.post("/assessment", makeReport);
  api.post("/report", makeReport);
  api.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "API-endepunktet finnes ikke.")),
  );
  app.use("/api", api);
  if (options.staticDir) {
    app.use(express.static(options.staticDir, { maxAge: "1h", index: false }));
    app.get("/{*path}", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(options.staticDir!, "index.html"));
    });
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Kontroller feltene og velg gyldige verdier.",
            fields: error.issues.map((i) => i.path.join(".")),
          },
        });
        return;
      }
      if (error instanceof ApiError) {
        res.status(error.status).json({
          error: {
            code: error.code,
            message: error.message,
            upstreamStatus: error.upstreamStatus,
          },
        });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({
          error: {
            code: "INVALID_JSON",
            message: "Forespørselen inneholder ugyldig JSON.",
          },
        });
        return;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.too.large"
      ) {
        res.status(413).json({
          error: {
            code: "BODY_TOO_LARGE",
            message: "Forespørselen er for stor.",
          },
        });
        return;
      }
      console.error("API_INTERNAL_ERROR"); // Never log submitted profiles, query strings, or upstream payloads.
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Noe gikk galt. Prøv igjen.",
        },
      });
    },
  );
  return app;
}
