package i18n

// enMessages is the reference catalog: it is the fallback every other locale is
// measured against, so every Key must have an entry here.
var enMessages = map[Key]string{
	MsgInvalidID:      "Invalid ID",
	MsgInternal:       "Something went wrong",
	MsgInvalidRequest: "Invalid request data",
	MsgNotFound:       "Not found",
	MsgConflict:       "That conflicts with something that already exists",

	MsgAuthInvalidBody:         "Invalid request data",
	MsgAuthInvalidCredentials:  "Invalid credentials",
	MsgAuthTokenFailed:         "Unable to generate token",
	MsgAuthLoginSuccess:        "Login successful",
	MsgAuthRegisterInvalid:     "Invalid request data",
	MsgAuthHashFailed:          "Unable to hash password",
	MsgAuthCreateFailed:        "Failed to create user",
	MsgAuthRegisterTokenFailed: "Failed to generate tokens",
	MsgAuthRegistered:          "User created successfully",
	MsgAuthRefreshNotFound:     "Refresh token not found",
	MsgAuthRefreshMalformed:    "Malformed authorization header",
	MsgAuthRefreshInvalid:      "Invalid refresh token",
	MsgAuthRefreshFailed:       "Failed to generate tokens",
	MsgAuthEmailTaken:          "That email is already registered",
	MsgAuthRefreshed:           "Tokens refreshed successfully",
	MsgAuthNotAuthenticated:    "User not authenticated",
	MsgAuthHeaderNotFound:      "Authorization header not found",
	MsgAuthInvalidAccessToken:  "Invalid access token",

	MsgUserCreated:  "User created successfully",
	MsgUserUpdated:  "User updated successfully",
	MsgUserDeleted:  "User deleted successfully",
	MsgUserNotFound: "User not found",
}
