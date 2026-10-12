# The one command (D74): the whole system on a local chain. `npm run dev` does the same where make isn't
# installed, such as Windows. scripts/dev/up.mjs says what each step does.
.PHONY: dev dev-check

dev:
	node scripts/dev/up.mjs

# Starts everything, checks that each part answers, and stops.
dev-check:
	node scripts/dev/up.mjs --check
