// Package i18n holds the server-side message catalog.
//
// Only the `message` field of a response is translated - the sibling `error`
// field carries a diagnostic string for logs and stays in English, because it
// is Go error text rather than prose written for a user.
package i18n

// Key identifies a user-facing message.
//
// These are typed constants rather than raw strings so that a typo is a compile
// error instead of a key that silently falls through to the key name at
// runtime.
type Key string

const (
	// Shared.
	MsgInvalidID      Key = "common.invalid_id"
	MsgInternal       Key = "common.internal"
	MsgInvalidRequest Key = "common.invalid_request"
	MsgNotFound       Key = "common.not_found"
	MsgConflict       Key = "common.conflict"

	// Auth.
	MsgAuthInvalidBody         Key = "auth.invalid_body"
	MsgAuthInvalidCredentials  Key = "auth.invalid_credentials"
	MsgAuthTokenFailed         Key = "auth.token_failed"
	MsgAuthLoginSuccess        Key = "auth.login_success"
	MsgAuthRegisterInvalid     Key = "auth.register_invalid_body"
	MsgAuthHashFailed          Key = "auth.hash_failed"
	MsgAuthCreateFailed        Key = "auth.create_failed"
	MsgAuthRegisterTokenFailed Key = "auth.register_token_failed"
	MsgAuthRegistered          Key = "auth.registered"
	MsgAuthRefreshNotFound     Key = "auth.refresh_not_found"
	MsgAuthRefreshMalformed    Key = "auth.refresh_malformed"
	MsgAuthRefreshInvalid      Key = "auth.refresh_invalid"
	MsgAuthRefreshFailed       Key = "auth.refresh_failed"
	MsgAuthEmailTaken          Key = "auth.email_taken"
	MsgAuthRefreshed           Key = "auth.refreshed"
	MsgAuthNotAuthenticated    Key = "auth.not_authenticated"
	MsgAuthHeaderNotFound      Key = "auth.authorization_header_not_found"
	MsgAuthInvalidAccessToken  Key = "auth.invalid_access_token"

	// Users.
	MsgUserCreated  Key = "user.created"
	MsgUserUpdated  Key = "user.updated"
	MsgUserDeleted  Key = "user.deleted"
	MsgUserNotFound Key = "user.not_found"
)
