package handlers

import (
	"errors"
	"net/http"
	"strings"

	"kuro-base-api/httperr"
	"kuro-base-api/i18n"
	"kuro-base-api/models"
	"kuro-base-api/services"
	"kuro-base-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LoginPayload struct {
	Email    string `json:"email" binding:"required,email,min=3" example:"test@example.com"`
	Password string `json:"password" binding:"required,min=8" example:"password"`
}

type RegisterPayload struct {
	Name     string `json:"name" binding:"required,min=2" example:"John Doe"`
	Email    string `json:"email" binding:"required,email,min=3" example:"test@example.com"`
	Password string `json:"password" binding:"required,min=8" example:"password"`
}

// Login godoc
// @Summary      Login user
// @Description  Authenticate user and return access and refresh tokens
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        login body LoginPayload true "Login credentials"
// @Success      200  {object}  models.LoginResponse
// @Failure      400  {object}  models.ErrorResponse
// @Failure      401  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /auth/login [post]
func Login(c *gin.Context) {
	var payload LoginPayload

	if err := c.ShouldBindBodyWithJSON(&payload); err != nil {
		httperr.BadRequest(c, i18n.MsgAuthInvalidBody, err)
		return
	}

	// Get user service from gin context (injected via middleware)
	userService := c.MustGet("userService").(services.UserServices)

	user, err := userService.GetUserByEmail(payload.Email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) || errors.Is(err, gorm.ErrRecordNotFound) {
			// A 404 for an unknown email is the existing contract. A database
			// outage, which used to be answered 404 here too, is now a 500.
			httperr.NotFound(c, i18n.MsgAuthInvalidCredentials)
			return
		}
		httperr.Respond(c, err, i18n.MsgInternal)
		return
	}

	if err := utils.CheckPassword(payload.Password, user.Password); err != nil {
		httperr.Unauthorized(c, i18n.MsgAuthInvalidCredentials)
		return
	}

	token, err := utils.GenerateTokenPair(user)
	if err != nil {
		// Signing a token is our job, not the caller's; failing it is a 500.
		httperr.Respond(c, err, i18n.MsgAuthTokenFailed)
		return
	}

	c.SetCookie("acc_token", token.AccessToken, 3600, "/", "localhost", false, true)
	c.SetCookie("ref_token", token.RefreshToken, 86400, "/", "localhost", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(locale(c), i18n.MsgAuthLoginSuccess),
		"user":    models.NewUserView(*user),
		"tokens":  token,
	})
}

// Register godoc
// @Summary      Register new user
// @Description  Create a new user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        register body RegisterPayload true "User registration data"
// @Success      201  {object}  models.RegisterResponse
// @Failure      400  {object}  models.ErrorResponse
// @Failure      409  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /auth/register [post]
func Register(c *gin.Context) {
	var payload RegisterPayload

	if err := c.ShouldBindBodyWithJSON(&payload); err != nil {
		httperr.BadRequest(c, i18n.MsgAuthRegisterInvalid, err)
		return
	}

	hashedPass, err := utils.HashPassword(payload.Password)
	if err != nil {
		httperr.Respond(c, err, i18n.MsgAuthHashFailed)
		return
	}

	user := &models.User{
		Name:     payload.Name,
		Email:    payload.Email,
		Password: hashedPass,
		Role:     "user", // default role
	}

	userService := c.MustGet("userService").(services.UserServices)

	if err := userService.Create(user); err != nil {
		// The users table has a unique index on email, and the repository
		// translates a violation into models.ErrConflict. That is the one
		// failure here the person filling in the form can do something about, so
		// it gets a message naming the field rather than the generic conflict.
		if errors.Is(err, models.ErrConflict) {
			httperr.Conflict(c, i18n.MsgAuthEmailTaken, err)
			return
		}
		httperr.Respond(c, err, i18n.MsgAuthCreateFailed)
		return
	}

	token, err := utils.GenerateTokenPair(user)
	if err != nil {
		httperr.Respond(c, err, i18n.MsgAuthRegisterTokenFailed)
		return
	}

	c.SetCookie("acc_token", token.AccessToken, 3600, "/", "localhost", false, true)
	c.SetCookie("ref_token", token.RefreshToken, 86400, "/", "localhost", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"message": i18n.T(locale(c), i18n.MsgAuthRegistered),
		"user":    models.NewUserView(*user),
		"tokens":  token,
	})
}

// RefreshToken godoc
// @Summary      Refresh access token
// @Description  Generate new access and refresh tokens using refresh token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.RefreshTokenResponse
// @Failure      401  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /auth/refresh [get]
func RefreshToken(c *gin.Context) {
	header := c.GetHeader("Authorization")
	if header == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(locale(c), i18n.MsgAuthRefreshNotFound)})
		return
	}

	// SplitN with a length check rather than Split(header, " ")[1]: a header of
	// "Bearer" with no token makes that a one-element slice, and indexing it
	// panics into a 500 on a request that should simply be rejected as 401.
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(locale(c), i18n.MsgAuthRefreshMalformed)})
		return
	}
	token := parts[1]

	claims, err := utils.ValidateRefreshToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(locale(c), i18n.MsgAuthRefreshInvalid)})
		return
	}

	// New TokenPair, built from the stored row rather than from the claims.
	//
	// A refresh token lives for a day, which is long enough for the account to be
	// closed underneath it. Re-reading is what makes DELETE /user mean anything
	// beyond the access token already in hand, and it is also what keeps the role
	// honest - a promotion or demotion reaches the next token.
	userService := c.MustGet("userService").(services.UserServices)
	user, err := userService.GetByID(claims.UserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(locale(c), i18n.MsgAuthRefreshInvalid)})
			return
		}
		httperr.Respond(c, err, i18n.MsgAuthRefreshFailed)
		return
	}

	newTokenPair, err := utils.GenerateTokenPair(user)
	if err != nil {
		httperr.Respond(c, err, i18n.MsgAuthRefreshFailed)
		return
	}

	c.SetCookie("acc_token", newTokenPair.AccessToken, 3600, "/", "localhost", false, true)
	c.SetCookie("ref_token", newTokenPair.RefreshToken, 86400, "/", "localhost", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(locale(c), i18n.MsgAuthRefreshed),
		"tokens":  newTokenPair,
	})
}
