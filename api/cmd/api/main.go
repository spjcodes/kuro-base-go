package main

import (
	"log"
	"log/slog"
	"os"

	"kuro-base-api/config"
	"kuro-base-api/database"
	"kuro-base-api/router"

	"github.com/joho/godotenv"

	_ "kuro-base-api/docs/api" // This is important for swagger to work
)

// @title           Kuro Base API
// @version         1.0
// @description     A RESTful base API built with Go and Gin: JWT authentication, users, i18n and structured errors.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.
func main() {
	// Before SetupLogging, because LOG_LEVEL and APP_ENV themselves come from
	// .env: database.Connect loads it too, but that runs later, so without this
	// the first two variables silently fall back to their defaults.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Before anything can log, so startup failures are structured rather than
	// bare prints.
	config.SetupLogging()

	db, err := database.Connect()
	if err != nil {
		slog.Error("database unavailable", "error", err)
		panic(err)
	}
	defer db.Close()

	if database.MigrationsEnabled() {
		if err := db.Migrate(); err != nil {
			slog.Error("migration failed", "error", err)
			panic(err)
		}
	}

	r, err := router.SetUpRouter(db)
	if err != nil {
		slog.Error("router setup failed", "error", err)
		panic(err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	slog.Info("server starting", "port", port, "env", config.Environment())

	if err := r.Run(":" + port); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
