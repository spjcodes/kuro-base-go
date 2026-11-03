package router

import (
	"net/http"

	"kuro-base-api/database"
	"kuro-base-api/handlers"
	"kuro-base-api/middleware"
	"kuro-base-api/models"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// devOrigins covers the Expo dev server and the common local web ports.
var devOrigins = []string{
	"http://localhost:8081",
	"http://localhost:19006",
	"http://127.0.0.1:3000",
	"http://localhost:3000",
	"http://localhost:8082",
}

// SetUpRouter builds the API.
//
// New domain routes go beside /user below. Everything that needs an identity
// mounts on the `base` group; anything public goes on `router` directly.
func SetUpRouter(db database.Database) (*gin.Engine, error) {
	deps, err := NewDeps(db)
	if err != nil {
		return nil, err
	}

	userHandle := handlers.NewUserHandlers(deps.UserServ)

	router := gin.New()
	applyCommonMiddleware(router, devOrigins)

	// SWAGGER DOCUMENTATION
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// PING
	router.GET("/ping", Health)

	// AUTH ROUTES
	authRoute := router.Group("/auth")
	authRoute.Use(middleware.UserServContext(deps.UserServ))
	authRoute.POST("/login", handlers.Login)
	authRoute.POST("/register", handlers.Register)
	authRoute.GET("/refresh", handlers.RefreshToken)

	// PROTECTED ROUTES (require authentication)
	base := router.Group("/")
	base.Use(middleware.RequireAuth())

	// USER ROUTE
	userRoute := base.Group("user")
	userRoute.GET("", userHandle.GetByID)
	userRoute.DELETE("", userHandle.Delete)
	userRoute.PUT("", userHandle.Update)

	return router, nil
}

// Health godoc
// @Summary      Health check
// @Description  Check if the API is running
// @Tags         health
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.HealthResponse
// @Router       /ping [get]
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, models.HealthResponse{Message: "Pong"})
}
