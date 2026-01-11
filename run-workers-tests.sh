#!/usr/bin/env bash
set -euo pipefail

# Run workers vitest suite from the workers/ directory so vitest include globs match.
# Usage:
#   ./run-workers-tests.sh            # run all workers unit tests
#   ./run-workers-tests.sh apify.wrapper.test.ts   # run a single test file (name under workers/tests/unit)
#   ./run-workers-tests.sh full/path/to/file.test.ts # run by exact path under repo root

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKERS_DIR="${ROOT_DIR}/workers"

if [ ! -d "${WORKERS_DIR}" ]; then
  echo "ERROR: workers directory not found at ${WORKERS_DIR}"
  exit 2
fi

# Accept optional test file argument; support either filename under workers/tests/unit or full path
ARG="${1:-}"

cd "${WORKERS_DIR}"

# Use the local vitest.config.ts in the workers folder
CONFIG="./vitest.config.ts"

if [ -n "${ARG}" ]; then
  # If argument is a simple filename like apify.wrapper.test.ts, try relative path under tests/unit
  if [ -f "tests/unit/${ARG}" ]; then
    TEST_PATH="tests/unit/${ARG}"
  elif [ -f "${ARG}" ]; then
    TEST_PATH="${ARG}"
  else
    # fallback: pass arg through (vitest will try to resolve)
    TEST_PATH="${ARG}"
  fi

  echo "Running workers vitest for: ${TEST_PATH}"
  pnpm exec vitest run --config "${CONFIG}" "${TEST_PATH}"
else
  echo "Running all workers unit tests (from ${WORKERS_DIR})"
  pnpm exec vitest run --config "${CONFIG}" tests/unit
fi
