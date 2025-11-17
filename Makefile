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
	BSC_FIREBASE_PROJECT=$(BSC_FIREBASE_PROJECT) \
	GOOGLE_APPLICATION_CREDENTIALS=$(GOOGLE_APPLICATION_CREDENTIALS) \
	bash scripts/seed-prod.sh

ifneq ($(strip $(RAW_ARGS)),)
.PHONY += $(RAW_ARGS)
$(RAW_ARGS):
	@:
endif