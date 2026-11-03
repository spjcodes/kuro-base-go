package handlers

import (
	"kuro-base-api/httperr"
	"kuro-base-api/i18n"
	"kuro-base-api/middleware"

	"github.com/gin-gonic/gin"
)

// locale reads the response language negotiated by middleware.Locale.
func locale(c *gin.Context) string {
	return middleware.LocaleFrom(c)
}

// requireUserID reads the identity RequireAuth put on the context.
//
// The middleware already refuses the request when there is no valid token, so a
// miss here means this route was mounted outside the protected group - a wiring
// bug, not a rejected caller. It is still answered as a 401 rather than a panic,
// because a misconfiguration should not take the process down.
func requireUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		httperr.Unauthorized(c, i18n.MsgAuthNotAuthenticated)
		return 0, false
	}

	id, ok := userID.(uint)
	if !ok {
		httperr.Unauthorized(c, i18n.MsgAuthNotAuthenticated)
		return 0, false
	}

	return id, true
}
