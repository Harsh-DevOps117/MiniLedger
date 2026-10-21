.PHONY: setup up down logs test test-integration check web mobile clean-test
TEST_DB_PORT ?= 5433
setup:
	@test -f .env || cp .env.example .env
	@test -f apps/mobile/.env || cp apps/mobile/.env.example apps/mobile/.env
	npm ci
	npm run build:shared
up:
	docker compose up --build -d
down:
	docker compose down
logs:
	docker compose logs -f api
test:
	npm test
test-integration:
	TEST_DB_PORT=$(TEST_DB_PORT) docker compose -f compose.test.yaml up -d --wait
	TEST_DATABASE_URL=postgresql://miniledger:miniledger_test@localhost:$(TEST_DB_PORT)/miniledger_test npm run test:integration
clean-test:
	docker compose -f compose.test.yaml down
check:
	npm run check
web:
	npm run dev:web
mobile:
	npm run dev:mobile
