package repositories

import (
	"errors"
	"fmt"
	"strings"

	"kuro-base-api/models"

	"gorm.io/gorm"
)

// translateNotFound replaces gorm's sentinel with the domain one, so a handler
// that knows what it was looking for can say "User not found" rather than the
// generic wording.
func translateNotFound(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ErrNotFound
	}
	return err
}

// translateUniqueViolation turns a Postgres unique-index error into ErrConflict
// so the handler can answer 409 instead of leaking the raw SQL error - which
// carries the constraint name, and with it the schema - to the client.
//
// what names the fields at stake ("email is already registered"), because the
// driver error reports the index, not the thing the caller typed.
func translateUniqueViolation(err error, what string) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
		return fmt.Errorf("%w: %s", models.ErrConflict, what)
	}
	return err
}
