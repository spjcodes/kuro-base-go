package database

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"kuro-base-api/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Database interface {
	GetDB() *gorm.DB
	Migrate() error
	Ping(ctx context.Context) error
	Close() error
}

type database struct {
	Db *gorm.DB
}

// Connect opens the connection pool and verifies it is reachable. It never
// touches the schema - call Migrate for that.
//
// This is the single place that loads .env, so a binary that imports this
// package inherits the same configuration.
func Connect() (Database, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Println("No DB_URL found from OS ENV, using default")
		dbURL = "postgres://postgres:postgres@localhost:5432/kuro_base?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Printf("[error] failed to initialize database, got error %v", err)
		return nil, err
	}

	database := &database{Db: db}

	// Fail at startup rather than on the first request. A service that cannot
	// reach its database should never come up looking healthy.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := database.Ping(ctx); err != nil {
		log.Printf("[error] database is unreachable, got error %v", err)
		return nil, err
	}

	return database, nil
}

// MigrationsEnabled reports whether this process should own the schema.
//
// Default is true, which keeps `go run ./cmd/api` a one-command bootstrap.
// A multi-process deployment sets RUN_MIGRATIONS=false on every binary but the
// one that should run DDL.
func MigrationsEnabled() bool {
	raw := os.Getenv("RUN_MIGRATIONS")
	if raw == "" {
		return true
	}
	enabled, err := strconv.ParseBool(raw)
	if err != nil {
		log.Printf("[warn] RUN_MIGRATIONS=%q is not a boolean; defaulting to true", raw)
		return true
	}
	return enabled
}

func (d *database) GetDB() *gorm.DB {
	return d.Db
}

// Migrate brings the schema up to date.
//
// The base project has a single domain model. Add each new model to the
// AutoMigrate call below; GORM creates missing tables, columns and indexes and
// leaves existing data alone.
func (d *database) Migrate() error {
	return d.Db.AutoMigrate(
		&models.User{},
	)
}

func (d *database) Ping(ctx context.Context) error {
	sqlDb, err := d.Db.DB()
	if err != nil {
		return err
	}
	return sqlDb.PingContext(ctx)
}

func (d *database) Close() error {
	sqlDb, err := d.Db.DB()
	if err != nil {
		return err
	}
	return sqlDb.Close()
}
