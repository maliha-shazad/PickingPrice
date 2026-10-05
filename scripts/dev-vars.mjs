// `wrangler dev` reads local secrets from a `.dev.vars` beside its config, which here
// is the generated dist/server/wrangler.json. That folder is wiped on every build, so
// the project-root `.dev.vars` is copied in each time the local server starts.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../.dev.vars", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../dist/server/", import.meta.url));
if (existsSync(source) && existsSync(outputDirectory)) {
  copyFileSync(source, outputDirectory + ".dev.vars");
}
