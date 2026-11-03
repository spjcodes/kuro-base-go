package handlers

import (
	"net/http"

	"kuro-base-api/httperr"
	"kuro-base-api/i18n"
	"kuro-base-api/models"
	"kuro-base-api/services"

	"github.com/gin-gonic/gin"
)

type userHandlers struct {
	services services.UserServices
}

func NewUserHandlers(h services.UserServices) *userHandlers {
	return &userHandlers{
		services: h,
	}
}

// GetByID godoc
// @Summary      Get current user
// @Description  Retrieve the authenticated user's information
// @Tags         users
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.UserViewResponse
// @Failure      401  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Security     BearerAuth
// @Router       /user [get]
func (u *userHandlers) GetByID(c *gin.Context) {
	id, ok := requireUserID(c)
	if !ok {
		return
	}

	user, err := u.services.GetByID(id)
	if err != nil {
		// A token naming a user who no longer exists is a 404, not a 400: the
		// request was fine, there is just nothing there.
		httperr.Respond(c, err, i18n.MsgInternal)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": models.NewUserView(*user)})
}

// Update godoc
// @Summary      Update current user
// @Description  Update the authenticated user's information
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        user  body      models.UpdateUserRequest  true  "Updated user data"
// @Success      202  {object}  models.SuccessResponse
// @Failure      400  {object}  models.ErrorResponse
// @Failure      401  {object}  models.ErrorResponse
// @Failure      409  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Security     BearerAuth
// @Router       /user [put]
func (u *userHandlers) Update(c *gin.Context) {
	id, ok := requireUserID(c)
	if !ok {
		return
	}

	var req models.UpdateUserRequest

	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		httperr.BadRequest(c, i18n.MsgInvalidRequest, err)
		return
	}

	// Only the fields the request carries are set, so GORM's Updates (which
	// skips zero values) leaves everything else on the row alone.
	user := models.User{Name: req.Name, Email: req.Email}

	if err := u.services.Update(&user, id); err != nil {
		// Changing to an email that is already taken is a 409; anything else is
		// ours to fix.
		httperr.Respond(c, err, i18n.MsgInternal)
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": i18n.T(locale(c), i18n.MsgUserUpdated),
	})
}

// Delete godoc
// @Summary      Delete current user
// @Description  Delete the authenticated user's account
// @Tags         users
// @Accept       json
// @Produce      json
// @Success      202  {object}  models.SuccessResponse
// @Failure      401  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Security     BearerAuth
// @Router       /user [delete]
func (u *userHandlers) Delete(c *gin.Context) {
	id, ok := requireUserID(c)
	if !ok {
		return
	}

	if err := u.services.Delete(id); err != nil {
		httperr.Respond(c, err, i18n.MsgInternal)
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": i18n.T(locale(c), i18n.MsgUserDeleted),
	})
}
