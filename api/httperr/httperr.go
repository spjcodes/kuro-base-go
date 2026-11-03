// Package httperr turns a Go error into an HTTP response.
//
// Every handler used to decide for itself what a failed call meant, and the
// answers drifted: a database outage came back as a 400 in one file and a 500
// in another, and `err.Error()` - usually raw Postgres text with constraint
// names and SQLSTATE codes - was pasted into response bodies.
//
// The rule here is one mapping table, consulted in one order, so that the same
// error always produces the same status and the same translated message, and so
// that anything unrecognised fails closed: it becomes a 500 with a generic
// message, with the detail going to the log instead of the client.
package httperr

import (
	"errors"
	"log/slog"
	"net/http"

	"kuro-base-api/config"
	"kuro-base-api/i18n"
	"kuro-base-api/middleware"
	"kuro-base-api/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// mapping is one row of the table: a sentinel error and the answer it earns.
type mapping struct {
	err    error
	status int
	key    i18n.Key
}

// table is ordered, and the order is the precedence: the first entry whose
// sentinel the error satisfies wins.
var table = []mapping{
	{models.ErrNotFound, http.StatusNotFound, i18n.MsgNotFound},
	{models.ErrConflict, http.StatusConflict, i18n.MsgConflict},
	{models.ErrValidation, http.StatusBadRequest, i18n.MsgInvalidRequest},
}

// Respond answers c according to err.
//
// fallback names the operation that failed - "Failed to create user" rather
// than "Something went wrong" - and is used only when nothing in the table
// matches, i.e. for a genuine server-side fault.
func Respond(c *gin.Context, err error, fallback i18n.Key) {
	if err == nil {
		// A programming error, and one that would otherwise panic on the nil
		// dereference below. Answer as a server fault rather than crashing the
		// request, and make the mistake visible in the log.
		slog.Error("httperr.Respond called with a nil error",
			"request_id", middleware.RequestIDFrom(c),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
		)
		write(c, http.StatusInternalServerError, i18n.MsgInternal, nil)
		return
	}

	if status, key, ok := classify(err); ok {
		write(c, status, key, err)
		return
	}

	// Unregistered. Logged here in addition to the access logger, because only
	// this point knows the error matched nothing in the table - the access line
	// reports that a request failed, this one reports that the vocabulary is
	// missing a word for why.
	slog.Error("unhandled error",
		"request_id", middleware.RequestIDFrom(c),
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"error", err.Error(),
	)
	write(c, http.StatusInternalServerError, fallback, err)
}

// Fail answers c with a 500 and the generic message.
func Fail(c *gin.Context, err error) {
	Respond(c, err, i18n.MsgInternal)
}

// BadRequest answers client input that never reached the domain layer: a JSON
// body that would not bind, a path parameter that would not parse.
func BadRequest(c *gin.Context, key i18n.Key, err error) {
	write(c, http.StatusBadRequest, key, err)
}

// Unauthorized answers a request with no usable identity.
func Unauthorized(c *gin.Context, key i18n.Key) {
	write(c, http.StatusUnauthorized, key, nil)
}

// NotFound answers a missing resource whose key is already known.
func NotFound(c *gin.Context, key i18n.Key) {
	write(c, http.StatusNotFound, key, nil)
}

// Conflict answers a write that contradicts existing state, where the caller
// knows which message fits better than the generic one.
func Conflict(c *gin.Context, key i18n.Key, err error) {
	write(c, http.StatusConflict, key, err)
}

// Detail returns the underlying error text to put in a response body, or "" in
// production.
func Detail(err error) string {
	if err == nil || config.IsProduction() {
		return ""
	}
	return err.Error()
}

// Report parks err on the context so the access logger prints it.
func Report(c *gin.Context, err error) {
	middleware.SetRequestError(c, err)
}

// classify runs the table, then the structural fallbacks.
func classify(err error) (status int, key i18n.Key, ok bool) {
	// A BusinessError is the most specific thing in the chain, so it is checked
	// before the table even though its Unwrap may also satisfy a sentinel.
	var business *models.BusinessError
	if errors.As(err, &business) {
		if business.Status == 0 {
			slog.Warn("models.BusinessError has no status; treating as an internal error",
				"key", string(business.Key),
			)
			return 0, "", false
		}
		return business.Status, business.Key, true
	}

	for _, row := range table {
		if errors.Is(err, row.err) {
			return row.status, row.key, true
		}
	}

	// gorm.ErrRecordNotFound reaches the handler unwrapped from repositories
	// that never translated it. It means the same thing as models.ErrNotFound,
	// so it gets the same answer rather than being logged as an internal fault.
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return http.StatusNotFound, i18n.MsgNotFound, true
	}

	return 0, "", false
}

// write emits the response, and parks the error on the context for the access
// logger.
//
// The `error` field is developer-facing detail - Postgres constraint names,
// driver text. Outside production it saves a round trip to the logs; in
// production it is an information leak with no consumer, since the client reads
// `message` and ignores this field.
func write(c *gin.Context, status int, key i18n.Key, err error) {
	body := models.ErrorResponse{
		Message: i18n.T(middleware.LocaleFrom(c), key),
	}

	body.Error = Detail(err)

	if err != nil {
		Report(c, err)
	}

	c.JSON(status, body)
}
