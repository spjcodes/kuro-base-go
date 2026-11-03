package models

// UpdateUserRequest is the body of PUT /user.
//
// Every field is optional: GORM's Updates skips zero values, so a field the
// caller omits is left on the row alone.
type UpdateUserRequest struct {
	Name  string `json:"name" example:"Jane Doe"`
	Email string `json:"email" example:"jane@example.com"`
}
