package migrations

import (
	"context"
	"embed"
	"io/fs"
	"sort"
	"strings"
)

//go:embed *.sql
var migrationFiles embed.FS

type Executor interface {
	Exec(ctx context.Context, sql string) error
}

func Apply(ctx context.Context, executor Executor) error {
	entries, err := fs.ReadDir(migrationFiles, ".")
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		content, err := migrationFiles.ReadFile(entry.Name())
		if err != nil {
			return err
		}
		if err := executor.Exec(ctx, string(content)); err != nil {
			return err
		}
	}
	return nil
}
