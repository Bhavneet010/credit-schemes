const command = process.argv[2];
const modules = {
  validate: "./validate-command.mjs",
  scope: "./scope-command.mjs",
  "import-hp": "./import-hp-v2.mjs",
  "build-app": "./build-app-data.mjs",
  diff: "./diff-command.mjs"
};

if (!modules[command]) {
  console.error(`Unknown command: ${command || "<missing>"}`);
  process.exit(2);
}

try {
  const { run } = await import(modules[command]);
  process.exitCode = await run(process.argv.slice(3));
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
