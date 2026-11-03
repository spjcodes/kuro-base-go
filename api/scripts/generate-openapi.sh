#!/bin/bash

# Regenerates the OpenAPI 3.0 spec the frontends generate their SDK from.
#
# swaggo/swag emits Swagger 2.0, so the spec is converted for the SDK
# generators (hey-api reads OpenAPI 3.0). swagger.json is replaced with the
# converted document so that the Swagger UI at /swagger/index.html and the SDK
# describe the same API.

set -e

swag init -g cmd/api/main.go -o docs/api
npx --yes swagger2openapi docs/api/swagger.json -o docs/api/openapi.json -y
cp docs/api/openapi.json docs/api/swagger.json

echo "✅ OpenAPI 3.0 documentation ready"
