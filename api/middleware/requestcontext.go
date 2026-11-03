package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const (
	requestIDContextKey = "requestID"
	requestErrorKey     = "requestError"

	// RequestIDHeader is echoed on every response so a client - or a bug
	// report - can name the request it is asking about.
	RequestIDHeader = "X-Request-Id"
)

// RequestID gives every request an identifier and returns it in the response.
//
// The id is always generated here and never taken from an inbound header. A
// client-supplied value would let a caller forge log correlation - writing
// entries that appear to belong to another request, or making a real request
// untraceable by colliding with an id already in use.
//
// Mounted before Logger, which reads the id, and before Locale, so the header
// is already set when a middleware-level response like a 401 is written.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(requestIDContextKey, newRequestID())
		c.Header(RequestIDHeader, RequestIDFrom(c))
		c.Next()
	}
}

// RequestIDFrom returns the id set by RequestID, or "" outside that middleware.
func RequestIDFrom(c *gin.Context) string {
	if value, ok := c.Get(requestIDContextKey); ok {
		if id, ok := value.(string); ok {
			return id
		}
	}
	return ""
}

func newRequestID() string {
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err != nil {
		// crypto/rand failing means the system entropy source is gone, which
		// nothing here can fix. The id is diagnostic rather than
		// security-critical, so a constant is better than failing the request.
		return "unavailable"
	}
	return hex.EncodeToString(buf[:])
}

// SetRequestError records the error behind a response.
//
// The error responder does not log - the access logger does, because only it
// knows the status that was finally written. This is the handover between them.
func SetRequestError(c *gin.Context, err error) {
	c.Set(requestErrorKey, err)
}

// RequestErrorFrom returns the error recorded by SetRequestError, if any.
func RequestErrorFrom(c *gin.Context) error {
	if value, ok := c.Get(requestErrorKey); ok {
		if err, ok := value.(error); ok {
			return err
		}
	}
	return nil
}
