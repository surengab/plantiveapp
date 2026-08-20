#!/usr/bin/env bash
#
# Publishes the built site to the `gh-pages` branch.
#
#   npm run deploy
#
# Why a branch instead of the Actions workflow in .github/workflows/deploy.yml:
# GitHub Actions is currently blocked on this account by a billing lock, but
# GitHub's own Pages branch pipeline still runs. This path needs no Actions
# minutes. Once billing is cleared, switch Settings > Pages > Source back to
# "GitHub Actions" and the committed workflow takes over — delete nothing.
#
# Requires Settings > Pages > Source = "Deploy from a branch" -> gh-pages / (root)

set -euo pipefail

BRANCH="gh-pages"
WORKTREE="$(mktemp -d)/gh-pages"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "==> Building"
npm run build

if [ ! -f dist/index.html ]; then
  echo "!! dist/index.html missing — aborting rather than publishing an empty site." >&2
  exit 1
fi

# .nojekyll is essential: Jekyll ignores paths beginning with an underscore, and
# Astro emits all its JS/CSS into _astro/. Without it the site renders unstyled.
if [ ! -f dist/.nojekyll ]; then
  echo "!! dist/.nojekyll missing — public/.nojekyll should have produced it." >&2
  exit 1
fi

echo "==> Preparing $BRANCH worktree"
git fetch origin "$BRANCH" --quiet 2>/dev/null || true

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git worktree add --quiet "$WORKTREE" -B "$BRANCH" "origin/$BRANCH"
else
  git worktree add --quiet --orphan -b "$BRANCH" "$WORKTREE"
fi

cleanup() {
  cd "$ROOT"
  git worktree remove --force "$WORKTREE" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Syncing build output"
# Keep .git, replace everything else, so deleted pages actually disappear.
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/

cd "$WORKTREE"
git add -A

if git diff --cached --quiet; then
  echo "==> No changes to publish."
  exit 0
fi

git commit -q -m "Deploy site $(git -C "$ROOT" rev-parse --short HEAD)"
git push -q origin "$BRANCH"

echo "==> Published $(find . -name '*.html' | wc -l | tr -d ' ') pages to $BRANCH"
