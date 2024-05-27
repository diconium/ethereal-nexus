import path from "path"
import fs from "fs-extra"
import { __dirname } from "./dirname"
import { type PackageJson } from "type-fest"

export function getPackageInfo() {
  const packageJsonPath = path.join(__dirname, "../package.json")

  return fs.readJSONSync(packageJsonPath) as PackageJson
}