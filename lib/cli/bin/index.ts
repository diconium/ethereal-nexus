#!/usr/bin/env node
import { Command } from "commander"
import { publish } from '../src/commands/publish';
import { init } from '../src/commands/init';
import { getPackageInfo } from "../src/utils/get-package-info"
import { authLogin, authLogout, authKeys } from '../src/commands/auth';

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

function main() {
  const packageInfo = getPackageInfo();

  const program = new Command()
    .name("ethereal")
    .description("Add components and dependencies to your Nexus projects.")
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number"
    )

  program
    .addCommand(init)
    .addCommand(authLogin)
    .addCommand(authLogout)
    .addCommand(authKeys)
    .addCommand(publish)
    .parse()
}

main()
