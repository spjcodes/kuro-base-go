package models

import (
	"errors"

	"kuro-base-api/i18n"
)

// ErrNotFound is returned by repositories when the requested record does not
// exist. Handlers can map it to a 404 via errors.Is.
var ErrNotFound = errors.New("record not found")

// ErrConflict is returned when a write would violate a uniqueness constraint.
// Repositories wrap it with the offending value so the message stays useful.
// Handlers can map it to a 409 via errors.Is.
var ErrConflict = errors.New("record already exists")

// ErrValidation is returned when a value the client supplied is well-formed but
// not acceptable - an unknown enum member, a negative quantity, a field that
// fails a model-level rule. Handlers can map it to a 400 via errors.Is.
var ErrValidation = errors.New("validation failed")

// BusinessError marks an error that is safe to show the client, carrying the
// status code and the message key it should be answered with.
//
// Most errors do not need it: the sentinels above cover the common shapes
// (missing, conflicting, invalid) and a handler answers those by name. Reach
// for BusinessError when the semantics are more specific than a sentinel can
// express, or when the status genuinely differs from the sentinel's default.
//
// Err is the underlying cause. It is what gets logged, and what the
// non-production `error` field carries; it is never shown to a production
// client.
type BusinessError struct {
	Status int
	Key    i18n.Key
	Err    error
}

// NewBusinessError builds a BusinessError. err may be nil for an error that is
// purely a decision rather than a wrapped cause.
func NewBusinessError(status int, key i18n.Key, err error) *BusinessError {
	return &BusinessError{Status: status, Key: key, Err: err}
}

func (e *BusinessError) Error() string {
	if e.Err == nil {
		return string(e.Key)
	}
	return e.Err.Error()
}

// Unwrap lets errors.Is and errors.As see through to the underlying cause.
func (e *BusinessError) Unwrap() error {
	return e.Err
}
