package router

import (
	"kuro-base-api/middleware"

	"github.com/gin-gonic/gin"
)

// applyCommonMiddleware mounts the stack every router shares.
//
// Order matters:
//
//   - Recovery first, so a panic anywhere below is caught rather than killing
//     the process. This replaces gin.Default()'s recovery, which writes an
//     empty-bodied 500; if this is ever dropped from the stack, nothing else
//     will notice until a panic takes the server down.
//   - RequestID before Logger, which attaches the id to every line.
//   - Locale ahead of everything that can answer, so a 401 from RequireAuth -
//     mounted later, on the route groups - is translated too.
func applyCommonMiddleware(router *gin.Engine, origins []string) {
	router.Use(middleware.Recovery())
	router.Use(corsMiddleware(origins))
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger())
	router.Use(middleware.Locale())
}
