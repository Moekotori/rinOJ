package app

import (
	"encoding/base64"
	"encoding/json"
)

type SubmissionCursor struct {
	CreatedAtUnix int64  `json:"createdAtUnix"`
	SubmissionID  string `json:"submissionId"`
}

func EncodeSubmissionCursor(cursor SubmissionCursor) (string, error) {
	payload, err := json.Marshal(cursor)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(payload), nil
}

func DecodeSubmissionCursor(value string) (SubmissionCursor, error) {
	if value == "" {
		return SubmissionCursor{}, nil
	}

	payload, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return SubmissionCursor{}, err
	}

	var cursor SubmissionCursor
	if err := json.Unmarshal(payload, &cursor); err != nil {
		return SubmissionCursor{}, err
	}
	return cursor, nil
}
