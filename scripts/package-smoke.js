#!/usr/bin/env node
import { execFileSync } from "node:child_process";

execFileSync("npm", ["pack", "--dry-run"], { stdio: "inherit" });
