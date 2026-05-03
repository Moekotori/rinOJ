package queue

import "testing"

func TestJudgeTaskPayloadRoundTrip(t *testing.T) {
	payload := JudgeTaskPayload{
		SubmissionID: "sub_1",
		ProblemID:    "prob_1",
		LanguageID:   "cpp17",
		SourceCode:   "int main(){return 0;}",
	}

	encoded, err := EncodeJudgeTask(payload)
	if err != nil {
		t.Fatalf("EncodeJudgeTask returned error: %v", err)
	}

	decoded, err := DecodeJudgeTask(encoded)
	if err != nil {
		t.Fatalf("DecodeJudgeTask returned error: %v", err)
	}
	if decoded != payload {
		t.Fatalf("decoded payload mismatch: %#v", decoded)
	}
}
