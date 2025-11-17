.PHONY := up aup

RAW_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
COMMIT_MSG := $(if $(strip $(RAW_ARGS)),$(strip $(RAW_ARGS)),up)

up:
	git commit -am "$(COMMIT_MSG)" && git push

aup:
	git add . && git commit -am "$(COMMIT_MSG)" && git push

ifneq ($(strip $(RAW_ARGS)),)
.PHONY += $(RAW_ARGS)
$(RAW_ARGS):
	@:
endif