package router

import (
	"os"
	"strings"
	"time"

	"kuro-base-api/database"
	"kuro-base-api/repositories"
	"kuro-base-api/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Deps is the object graph the router builds on.
//
// Handlers are deliberately NOT held here: they are cheap structs over a
// service, and each router only needs the handful it actually mounts.
type Deps struct {
	DB    database.Database
	Redis database.RedisClient

	UserRepo repositories.UserRepositories

	UserServ services.UserServices
}

func NewDeps(db database.Database) (*Deps, error) {
	redis := database.NewRedisClient()

	deps := &Deps{
		DB:    db,
		Redis: redis,
	}

	// Repositories
	//
	// UserRepo takes no cache on purpose - see the note on userRepositories: a
	// User cannot survive a JSON round-trip, because Password is json:"-".
	deps.UserRepo = repositories.NewUserRepository(db.GetDB())

	// Services
	deps.UserServ = services.NewUserServices(deps.UserRepo)

	return deps, nil
}

// corsMiddleware builds the CORS policy for the API.
//
// The allowed origins were hardcoded and identical for every environment. Now
// each caller passes its own defaults, and CORS_ORIGINS can override them per
// environment without a rebuild.
func corsMiddleware(defaultOrigins []string) gin.HandlerFunc {
	origins := defaultOrigins
	if v := os.Getenv("CORS_ORIGINS"); v != "" {
		origins = nil
		for _, o := range strings.Split(v, ",") {
			if o = strings.TrimSpace(o); o != "" {
				origins = append(origins, o)
			}
		}
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "Idempotency-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
