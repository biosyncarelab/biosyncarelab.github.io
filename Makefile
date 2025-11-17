.PHONY := up aup serve seed-prod

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
	@if [ -z "$(BSC_FIREBASE_PROJECT)" ]; then \
		echo "BSC_FIREBASE_PROJECT must be set"; \
		exit 1; \
	fi
	@if [ -z "$(GOOGLE_APPLICATION_CREDENTIALS)" ] && ! gcloud auth application-default print-access-token >/dev/null 2>&1; then \
		echo "Authenticate via GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login"; \
		exit 1; \
	fi
	BSC_ALLOW_PROD_SEED=1 BSC_FIREBASE_PROJECT=$(BSC_FIREBASE_PROJECT) \
	GOOGLE_APPLICATION_CREDENTIALS=$(GOOGLE_APPLICATION_CREDENTIALS) \
	npm run seed:firestore:prod

ifneq ($(strip $(RAW_ARGS)),)
.PHONY += $(RAW_ARGS)
$(RAW_ARGS):
	@:
endif