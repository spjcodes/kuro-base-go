package database

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient is the cache surface the rest of the app sees.
//
// It is an interface, like Database, so a repository can be tested without a
// running Redis. Nothing in the base project calls it yet; it is wired in
// Deps.Redis so the first feature that needs a cache does not have to add a
// dependency and a config knob of its own.
type RedisClient interface {
	Set(ctx context.Context, key string, value interface{}) error
	Get(ctx context.Context, key string) (string, error)
	Del(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	Close() error
}

type redisClient struct {
	client *redis.Client
}

// NewRedisClient builds the shared cache client.
//
// go-redis connects lazily, so a wrong address does not stop startup - the
// first cache call reports it instead. That is deliberate for a cache: an
// unavailable cache is a performance problem, not a reason for the API to be
// down.
func NewRedisClient() RedisClient {
	redis := redis.NewClient(&redis.Options{
		Addr:     envOr("REDIS_ADDR", "localhost:6379"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       envIntOr("REDIS_DB", 0),
	})

	return &redisClient{
		client: redis,
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envIntOr(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		// A typo'd value would otherwise silently fall back to a different
		// database index, which is exactly the failure this avoids.
		panic(fmt.Errorf("%s must be an integer, got %q", key, v))
	}
	return n
}

func (r *redisClient) Set(ctx context.Context, key string, value interface{}) error {
	return r.client.Set(ctx, key, value, 5*time.Minute).Err()
}

func (r *redisClient) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *redisClient) Del(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *redisClient) Exists(ctx context.Context, key string) (bool, error) {
	result, err := r.client.Exists(ctx, key).Result()
	return result > 0, err
}

func (r *redisClient) Close() error {
	return r.client.Close()
}
