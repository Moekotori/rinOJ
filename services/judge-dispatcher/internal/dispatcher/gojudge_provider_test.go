package dispatcher

import (
	"strings"
	"testing"
)

func TestGoJudgeRuntimeSupportsSubmissionLanguages(t *testing.T) {
	languageIDs := []string{
		"c11",
		"c17",
		"cpp17",
		"cpp20",
		"cpp23",
		"go",
		"golang",
		"java",
		"java17",
		"kotlin",
		"nodejs20",
		"php83",
		"pypy3",
		"python3",
		"ruby33",
		"rust",
	}

	for _, languageID := range languageIDs {
		runtime, ok := goJudgeRuntimeForLanguage(languageID)
		if !ok {
			t.Fatalf("expected %s to be supported", languageID)
		}
		if runtime.SourceFile == "" {
			t.Fatalf("%s should declare a source file", languageID)
		}
		if len(runtime.RunArgs) == 0 {
			t.Fatalf("%s should declare run args", languageID)
		}
	}
}

func TestSupportedGoJudgeLanguageIDsIncludesRuntimeNames(t *testing.T) {
	supported := supportedGoJudgeLanguageIDs()
	for _, languageID := range []string{"cpp23", "golang", "java", "kotlin", "nodejs20", "python3", "rust"} {
		if !strings.Contains(supported, languageID) {
			t.Fatalf("supported language list %q should include %s", supported, languageID)
		}
	}
}
