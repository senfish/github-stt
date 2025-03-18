#!/usr/bin/env node
import fs from "fs";
import { Command } from "commander";
import {
  getList,
  onUse,
  onAdd,
  onRename,
  onDelete,
  onUpdate,
  onGet,
  onSetDir,
} from "./actions";
import { ensureConfigJson } from "./utils";
import packageJson from "../package.json";
ensureConfigJson();
const { name, version, description } = packageJson;

const program = new Command();
program
  .name(name)
  .description(description)
  .version(`${version}`, "-v, -V", "output the current version");

program.command("ls").description("List all the config").action(getList);

program.command("use [name]").description("Use config name").action(onUse);

program.command("add [name] [value]").description("Add config").action(onAdd);

program
  .command("rename <name> <newName>")
  .description("Rename config name")
  .action(onRename);

program
  .command("del [name]")
  .description("Delete config name")
  .action(onDelete);

program
  .command("set-dir [name]")
  .description("Set output dir value")
  .action(onSetDir);

program.command("get [name]").description("Get config info").action(onGet);

program
  .command("update [name]")
  .description("Generate .d.ts file")
  .action(onUpdate);

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
