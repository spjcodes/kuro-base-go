package models

import "time"

// UserView is what the API serialises for a user.
//
// It exists so the client contract never contains the password hash or any
// other column added to the table later. The auth handlers hand-build the same
// shape from their response maps; naming it here is what lets the generated
// client type it.
type UserView struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func NewUserView(u User) UserView {
	return UserView{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
