.PHONY: run docs build test fmt vet tidy

run:
	go run ./cmd/api

docs:
	@./scripts/generate-openapi.sh

build:
	go build -o bin/api ./cmd/api

test:
	go test ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

tidy:
	go mod tidy
