import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { releaseVersion } from "./version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const version = releaseVersion(process.env.GITHUB_RUN_NUMBER ?? process.argv[2]);

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = version;
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const lockJson = JSON.parse(await readFile(lockPath, "utf8"));
lockJson.version = version;
if (lockJson.packages?.[""]) lockJson.packages[""].version = version;
await writeFile(lockPath, `${JSON.stringify(lockJson, null, 2)}\n`);

console.log(`GoodLife.AI desktop release version: ${version}`);
