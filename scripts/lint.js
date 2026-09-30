#!/usr/bin/env node
/**
 * StoreOps architecture lint.
 *
 * This is a deliberately small, dependency-free static checker that
 * enforces the specific rules in Section 3.5 of the capstone spec. It
 * substitutes for ESLint + dependency-cruiser, which cannot be installed
 * in this sandbox (no npm registry access — see DESIGN_BRIEF.md Section D).
 *
 * It is intentionally narrow: it checks exactly the four StoreOps rules
 * below, not general code style. This is also the tool the Evaluator
 * agent's hard gates call (see .harness/agents/evaluator.agent.md).
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const MODULES = ["activities", "programmes", "staff", "alerts", "reports"];

let violations = [];

function readFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

function moduleOf(filePath) {
  const rel = path.relative(SRC_DIR, filePath);
  const first = rel.split(path.sep)[0];
  return MODULES.includes(first) ? first : null;
}

function layerOf(filePath) {
  const base = path.basename(filePath);
  if (base === "repository.ts") return "repository";
  if (base === "service.ts") return "service";
  if (base === "routes.ts") return "routes";
  return "other";
}

const allFiles = readFiles(SRC_DIR);

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const mod = moduleOf(file);
  const layer = layerOf(file);
  const rel = path.relative(process.cwd(), file);
  const importLines = content.split("\n").map((line, i) => ({ line, num: i + 1 })).filter((l) => /^\s*import /.test(l.line));

  // --- RULE 1: Module boundary ---
  // No module may import directly from another module's repository.
  for (const { line, num } of importLines) {
    const match = line.match(/from ["']\.\.\/([a-zA-Z]+)\/repository["']/);
    if (match) {
      const importedModule = match[1];
      if (mod && importedModule !== mod && MODULES.includes(importedModule)) {
        violations.push({
          rule: "module-boundary",
          file: rel,
          line: num,
          message: `${mod} module imports directly from ${importedModule}'s repository — cross-module reads must go through ${importedModule}'s service layer only.`,
        });
      }
    }
  }

  // --- RULE 2: Event bus only ---
  // No module's service may import another module's service directly,
  // EXCEPT staff's service (the one permitted read-only lookup — Section 3.4).
  if (layer === "service") {
    for (const { line, num } of importLines) {
      const match = line.match(/from ["']\.\.\/([a-zA-Z]+)\/service["']/);
      if (match) {
        const importedModule = match[1];
        if (mod && importedModule !== mod && MODULES.includes(importedModule) && importedModule !== "staff") {
          violations.push({
            rule: "event-bus-only",
            file: rel,
            line: num,
            message: `${mod} service imports ${importedModule}'s service directly. Cross-module side effects must be raised via EventBus.emit(), not direct service-to-service import. (staff is the only module whose service may be imported directly, for read-only lookups.)`,
          });
        }
      }
    }
  }

  // --- RULE 3: Error contract ---
  // No raw `throw new Error(` in services or routes.
  if (layer === "service" || layer === "routes") {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (/throw\s+new\s+Error\s*\(/.test(line)) {
        violations.push({
          rule: "error-contract",
          file: rel,
          line: idx + 1,
          message: `Raw "throw new Error(...)" found. All errors must extend AppError (see src/shared/errors.ts).`,
        });
      }
    });
  }

  // --- RULE 4: Layer separation ---
  // Routes must not import a repository directly (must go through service).
  if (layer === "routes") {
    for (const { line, num } of importLines) {
      if (/from ["']\.\/repository["']/.test(line) || /from ["']\.\.\/[a-zA-Z]+\/repository["']/.test(line)) {
        violations.push({
          rule: "layer-separation",
          file: rel,
          line: num,
          message: `Routes file imports a repository directly. Routes must call the Service layer only; Service calls Repository.`,
        });
      }
    }
  }
  // Repositories must not import the router/http layer (no HTTP logic in repositories).
  if (layer === "repository") {
    for (const { line, num } of importLines) {
      if (/shared\/router/.test(line) || /node:http/.test(line)) {
        violations.push({
          rule: "layer-separation",
          file: rel,
          line: num,
          message: `Repository file imports HTTP/router code. Repositories must be data-access only.`,
        });
      }
    }
  }

  // --- RULE 5: Read-only reports ---
  // The reports module must not import any other module's repository
  // (it may only read via service layers, and even then must not write).
  if (mod === "reports") {
    for (const { line, num } of importLines) {
      const match = line.match(/from ["']\.\.\/([a-zA-Z]+)\/repository["']/);
      if (match && match[1] !== "reports") {
        violations.push({
          rule: "read-only-reports",
          file: rel,
          line: num,
          message: `reports module imports ${match[1]}'s repository directly — reports must be read-only and must never write to other modules.`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\nSTOREOPS LINT: ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}\n    ${v.message}\n`);
  }
  process.exit(1);
} else {
  console.log(`STOREOPS LINT: 0 violations across ${allFiles.length} files. All architecture rules satisfied.`);
  process.exit(0);
}
