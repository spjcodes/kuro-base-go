package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword returns a bcrypt hash of password at the library's default cost.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword reports whether password matches hash. bcrypt returns a plain
// error for a mismatch; callers answer it as a rejected credential.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
