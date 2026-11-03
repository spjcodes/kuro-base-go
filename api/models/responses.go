package models

// Response models for Swagger documentation.

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

type UserViewResponse struct {
	Data UserView `json:"data"`
}

type UsersResponse struct {
	Data []User `json:"data"`
}

type LoginResponse struct {
	Message string                 `json:"message"`
	User    map[string]interface{} `json:"user"`
	Tokens  map[string]interface{} `json:"tokens"`
}

type RegisterResponse struct {
	Message string                 `json:"message"`
	User    map[string]interface{} `json:"user"`
	Tokens  map[string]interface{} `json:"tokens"`
}

type RefreshTokenResponse struct {
	Message string                 `json:"message"`
	Tokens  map[string]interface{} `json:"tokens"`
}

type HealthResponse struct {
	Message string `json:"Message"`
}
