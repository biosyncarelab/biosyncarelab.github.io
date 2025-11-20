.PHONY := up aup serve seed-prod seed-local firebase-login deploy-firestore-rules test test-structures web-sync-music-data export-structures-jsonld validate-structures-shacl shacl-deps

BSC_FIREBASE_PROJECT ?= bsc-lab

RAW_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
COMMIT_MSG := $(if $(strip $(RAW_ARGS)),$(strip $(RAW_ARGS)),up)

up:
	git commit -am "$(COMMIT_MSG)" && git push

aup:
	git add . && git commit -am "$(COMMIT_MSG)" && git push

serve:
	@PORT=$(if $(strip $(RAW_ARGS)),$(firstword $(RAW_ARGS)),4173); \
	printf 'Serving static site on http://localhost:%s\n' "$$PORT"; \
	(open "http://localhost:$$PORT" >/dev/null 2>&1 || true); \
	python3 -m http.server "$$PORT"

seed-prod:
	@BSC_FIREBASE_PROJECT="$(BSC_FIREBASE_PROJECT)" \
	GOOGLE_APPLICATION_CREDENTIALS="$$PWD/hidden/bsc-lab-firebase-adminsdk-fbsvc-9262a53b1c.json" \
	bash scripts/seed-prod.sh

seed-local:
	npm run seed:firestore

firebase-login:
	firebase login $(FIREBASE_LOGIN_FLAGS)

deploy-firestore-rules:
	firebase deploy --only firestore:rules --project "$(BSC_FIREBASE_PROJECT)"

test:
	npm test

test-structures:
	npm run test:structures

web-sync-music-data:
	@echo "Syncing comprehensive music structures to frontend..."
	@cp external/biosyncare/scripts/music/output/musicStructures.compact.json data/structures/music-structures-comprehensive.json
	@echo "✓ Copied musicStructures.compact.json → data/structures/music-structures-comprehensive.json"
	@echo "  Size: $$(du -h data/structures/music-structures-comprehensive.json | cut -f1)"

export-structures-jsonld:
	npm run export:structures:jsonld

validate-structures-shacl: export-structures-jsonld
	python3 scripts/validate_structures_shacl.py

shacl-deps:
	python3 -m pip install --user pyshacl rdflib rdflib-jsonld

export-runtime-jsonld:
	@echo "Run this in browser console after kernel is active:"
	@echo "await kernel.toJsonLdSnapshot()"

ifneq ($(strip $(RAW_ARGS)),)
.PHONY += $(RAW_ARGS)
$(RAW_ARGS):
	@:
endif
