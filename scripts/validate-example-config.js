const { loadConfigFromPath } = require('../build/src/config/load-config');

async function main() {
  const config = await loadConfigFromPath(
    '.github/pull-request-policy.yml.sample',
  );
  console.log(`Validated ${config.resolvedPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
