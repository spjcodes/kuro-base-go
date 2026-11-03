package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"kuro-base-api/config"
	"kuro-base-api/i18n"
	"kuro-base-api/repositories"
	"kuro-base-api/utils"

	"github.com/gin-gonic/gin"
)

// Logger writes one structured line per request.
//
// It is the only place a request's outcome is recorded, which is why the error
// responder hands the error to it through SetRequestError instead of logging
// itself: this is the first point that knows the status actually written, so
// logging here means one line per request rather than two.
//
// Levels separate the two kinds of 4xx. A business rejection is an expected
// answer and logs at Warn; a 5xx is a defect and logs at Error.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		status := c.Writer.Status()

		attrs := []any{
			"request_id", RequestIDFrom(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", status,
			"latency_ms", time.Since(start).Milliseconds(),
		}
		if userID, ok := c.Get("userID"); ok {
			attrs = append(attrs, "user_id", userID)
		}
		if err := RequestErrorFrom(c); err != nil {
			attrs = append(attrs, "error", err.Error())
		}

		switch {
		case status >= http.StatusInternalServerError:
			slog.Error("request failed", attrs...)
		case status >= http.StatusBadRequest:
			slog.Warn("request rejected", attrs...)
		default:
			slog.Info("request served", attrs...)
		}
	}
}

// Recovery replaces gin.Recovery.
//
// gin's built-in recovery writes a bare 500 with an empty body: no message
// field, so every client's error handling falls through to its generic case,
// and no request id or log line, so the panic is untraceable. This writes the
// same ErrorResponse shape as every other failure and records the stack.
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		slog.Error("panic recovered",
			"request_id", RequestIDFrom(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"panic", fmt.Sprint(recovered),
			"stack", string(debug.Stack()),
		)

		// Built here rather than through the error responder on purpose: that
		// package imports this one, so calling back into it would be a cycle.
		body := gin.H{"message": i18n.T(LocaleFrom(c), i18n.MsgInternal)}
		if !config.IsProduction() {
			body["error"] = fmt.Sprint(recovered)
		}

		c.AbortWithStatusJSON(http.StatusInternalServerError, body)
	})
}

// RequireAuth refuses a request without a usable access token and puts the
// identity it proves on the context.
//
// The role comes from the JWT claims, not a database read: the token is expired
// in fifteen minutes, so a promotion or demotion reaches the next token rather
// than being frozen into this request's answer.
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authorization := c.GetHeader("Authorization")
		if authorization == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(LocaleFrom(c), i18n.MsgAuthHeaderNotFound)})
			c.Abort()
			return
		}

		// SplitN with a length check rather than Split(...)[1]: a header of
		// "Bearer" with no token makes that a one-element slice, and indexing it
		// panics into a 500 on a request that should simply be rejected as 401.
		parts := strings.SplitN(authorization, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(LocaleFrom(c), i18n.MsgAuthRefreshMalformed)})
			c.Abort()
			return
		}
		token := parts[1]

		claims, err := utils.ValidateAccessToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": i18n.T(LocaleFrom(c), i18n.MsgAuthInvalidAccessToken)})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

// UserServContext hands the user repository to the auth handlers.
//
// The handlers read it with c.MustGet("userService"); keeping the dependency on
// the context, rather than on a handler struct, is what lets them stay plain
// functions mounted on a route group.
func UserServContext(s repositories.UserRepositories) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("userService", s)
		c.Next()
	}
}
