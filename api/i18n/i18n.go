package i18n

import "fmt"

// Locale codes. These are also the values the middleware puts on the gin
// context, and the keys of the catalogs below.
const (
	ZH = "zh"
	EN = "en"
	JA = "ja"

	// Default is what an absent, malformed or unsupported Accept-Language
	// resolves to.
	Default = EN
)

// catalogs holds one message table per locale.
var catalogs = map[string]map[Key]string{
	ZH: zhMessages,
	EN: enMessages,
	JA: jaMessages,
}

// Keys returns every known message key. Used by the completeness test and by
// anything that needs to enumerate the catalog.
func Keys() []Key {
	keys := make([]Key, 0, len(enMessages))
	for k := range enMessages {
		keys = append(keys, k)
	}
	return keys
}

// T resolves key in locale, falling back to English and finally to the key
// itself. Returning the key rather than an empty string matters: a missing
// translation shows up as "auth.token_failed" on screen, which is impossible to
// mistake for a real message, instead of rendering nothing.
func T(locale string, key Key, args ...any) string {
	msg, ok := lookup(locale, key)
	if !ok {
		return string(key)
	}
	if len(args) == 0 {
		return msg
	}
	return fmt.Sprintf(msg, args...)
}

func lookup(locale string, key Key) (string, bool) {
	if table, ok := catalogs[locale]; ok {
		if msg, ok := table[key]; ok && msg != "" {
			return msg, true
		}
	}
	if locale != Default {
		if msg, ok := catalogs[Default][key]; ok && msg != "" {
			return msg, true
		}
	}
	return "", false
}
