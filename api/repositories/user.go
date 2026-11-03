package repositories

import (
	"kuro-base-api/models"

	"gorm.io/gorm"
)

type UserRepositories interface {
	GetAll() ([]models.User, error)
	GetByID(id uint) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User, id uint) error
	Delete(id uint) error
	GetUserByEmail(e string) (*models.User, error)
}

// userRepositories reads users straight from Postgres. It deliberately holds no
// Redis client.
//
// A User cannot be round-tripped through JSON faithfully: Password is tagged
// `json:"-"`, so a cached copy would come back with an empty hash and every
// login against it would fail. The tag is correct and has to stay - the hash
// must never reach the wire - so the row is read instead. Nothing here is hot:
// RequireAuth takes the role from the JWT claims, so the only readers are the
// login handlers and the profile screen.
type userRepositories struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepositories {
	return &userRepositories{
		DB: db,
	}
}

func (r *userRepositories) GetAll() ([]models.User, error) {
	var users []models.User
	if err := r.DB.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *userRepositories) GetByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.DB.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, translateNotFound(err)
	}
	return &user, nil
}

// GetUserByEmail backs the login handler, which is the one caller that needs
// the stored hash - which is exactly why this reads the row and not a cache.
func (r *userRepositories) GetUserByEmail(e string) (*models.User, error) {
	var user models.User
	if err := r.DB.Where("email = ?", e).First(&user).Error; err != nil {
		return nil, translateNotFound(err)
	}
	return &user, nil
}

func (r *userRepositories) Create(user *models.User) error {
	// A duplicate email is the one failure here the caller can act on, and the
	// users table has a unique index on it. Without this the raw Postgres error
	// - constraint name and SQLSTATE included - would travel up to the client.
	return translateUniqueViolation(r.DB.Create(user).Error, "email is already registered")
}

func (r *userRepositories) Update(user *models.User, id uint) error {
	// Same unique index as Create, so the same leak is possible: changing an
	// email to one already in use would otherwise hand the client the raw
	// Postgres error naming the index and the SQLSTATE code.
	return translateUniqueViolation(
		r.DB.Model(&models.User{}).Where("id = ?", id).Updates(user).Error,
		"email is already registered",
	)
}

// Delete closes an account without removing the row.
//
// DeletedAt is a gorm.DeletedAt, so this is an UPDATE of that column and every
// read in this file stops seeing the row. The unique index on email still
// covers it, so the same address cannot be registered again and a login finds
// nothing to compare a password against.
func (r *userRepositories) Delete(id uint) error {
	return r.DB.Where("id = ?", id).Delete(&models.User{}).Error
}
