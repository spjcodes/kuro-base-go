package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"`
	Email     string    `json:"email" gorm:"uniqueIndex"`
	Password  string    `json:"-" gorm:"not null"`
	Role      string    `json:"role" gorm:"default:'user'"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	// DeletedAt soft-deletes the row. It is gorm.DeletedAt rather than a
	// *time.Time for one reason: the type is what makes GORM add
	// "deleted_at IS NULL" to every query and turn Delete into an UPDATE. A bare
	// *time.Time column is not recognised as a soft-delete marker, so DELETE
	// /user issued a hard DELETE - and every row that referenced the account
	// held it by foreign key.
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index" swaggertype:"string" example:"2026-10-09T10:00:00Z"`
}
