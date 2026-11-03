package config

import (
	"log/slog"
	"os"
	"strings"
)

// SetupLogging installs the process-wide slog logger. Called once, first thing,
// before anything can log.
//
// JSON in production because the output is read by a log shipper, text in
// development because it is read by a person.
func SetupLogging() {
	opts := &slog.HandlerOptions{Level: logLevel()}

	var handler slog.Handler
	if IsProduction() {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}

// logLevel reads LOG_LEVEL, defaulting to Info. An unset or unrecognised value
// is Info rather than an error: a typo in an optional knob should not stop the
// process from starting.
func logLevel() slog.Level {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("LOG_LEVEL"))) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
