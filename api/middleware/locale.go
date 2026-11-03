package middleware

import (
	"kuro-base-api/i18n"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/language"
)

const localeContextKey = "locale"

// Locale negotiates the response language from Accept-Language and stores it on
// the context for handlers to read with LocaleFrom.
//
// Mounted globally, ahead of the per-route auth middleware, so every response -
// including a 401 from RequireAuth - can be translated.
func Locale() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(localeContextKey, negotiate(c.GetHeader("Accept-Language")))
		c.Next()
	}
}

// supportedBases maps a base language subtag to a catalog locale. Comparing
// base tags rather than the full tag means zh-CN, zh-Hans and zh-TW all land on
// the same catalog, and so do en-GB and ja-JP.
var supportedBases = map[string]string{
	"zh": i18n.ZH,
	"en": i18n.EN,
	"ja": i18n.JA,
}

// negotiate picks the best supported locale for an Accept-Language header.
// ParseAcceptLanguage returns the tags already ordered by q-value, so the first
// supported one wins. Anything absent, malformed or unsupported falls back to
// i18n.Default.
func negotiate(header string) string {
	if header == "" {
		return i18n.Default
	}

	tags, _, err := language.ParseAcceptLanguage(header)
	if err != nil {
		return i18n.Default
	}

	for _, tag := range tags {
		base, _ := tag.Base()
		if locale, ok := supportedBases[base.String()]; ok {
			return locale
		}
	}

	return i18n.Default
}

// LocaleFrom reads the negotiated locale off the context.
//
// The default is repeated here rather than assumed, so a handler mounted
// without the middleware still answers in English instead of panicking on a
// missing key.
func LocaleFrom(c *gin.Context) string {
	if value, ok := c.Get(localeContextKey); ok {
		if locale, ok := value.(string); ok && locale != "" {
			return locale
		}
	}
	return i18n.Default
}
