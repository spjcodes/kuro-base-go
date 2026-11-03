// Package config reads the process environment.
//
// It exists so that "which environment is this?" has exactly one answer. The
// router and the error responder both need it, and each of them reading
// os.Getenv("APP_ENV") independently is how the answers drift apart.
package config

import (
	"os"
	"strings"
)

// Environment names, normalised. These are the values Environment returns.
const (
	Production  = "production"
	Development = "development"
	Test        = "test"
)

// Environment normalises APP_ENV into one of the three names above.
//
// Anything unrecognised - including unset, which is the normal state of a
// deploy that never set the variable - resolves to Production. The default is
// deliberately the restrictive one: APP_ENV gates whether an error response
// carries its underlying error detail, so a forgotten variable has to hide the
// detail rather than expose it.
//
// The value is read per call rather than cached in a sync.Once. It is consulted
// once per error, not once per request, and caching it would make tests that
// drive it with t.Setenv depend on execution order.
func Environment() string {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV"))) {
	case "dev", "development", "local":
		return Development
	case "test":
		return Test
	default:
		// Covers "", "prod", "production" and anything misspelled.
		return Production
	}
}

// IsProduction reports whether error detail must be withheld from responses.
func IsProduction() bool {
	return Environment() == Production
}
