package queue

import "encoding/json"

const JudgeSubmitTaskType = "judge.submit.v1"

type JudgeTaskPayload struct {
	SubmissionID string `json:"submissionId"`
	ProblemID    string `json:"problemId"`
	ContestID    string `json:"contestId,omitempty"`
	LanguageID   string `json:"languageId"`
	SourceCode   string `json:"sourceCode"`
}

func EncodeJudgeTask(payload JudgeTaskPayload) ([]byte, error) {
	return json.Marshal(payload)
}

func DecodeJudgeTask(data []byte) (JudgeTaskPayload, error) {
	var payload JudgeTaskPayload
	err := json.Unmarshal(data, &payload)
	return payload, err
}
