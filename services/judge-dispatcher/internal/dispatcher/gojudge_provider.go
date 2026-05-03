package dispatcher

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

type GoJudgeHTTPProvider struct {
	endpoint string
	client   *http.Client
}

func NewGoJudgeHTTPProvider(endpoint string) GoJudgeHTTPProvider {
	if endpoint == "" {
		endpoint = "http://127.0.0.1:5050"
	}
	return GoJudgeHTTPProvider{
		endpoint: strings.TrimRight(endpoint, "/"),
		client:   &http.Client{Timeout: 15 * time.Second},
	}
}

type goJudgeLanguageRuntime struct {
	DisplayName    string
	SourceFile     string
	CompileArgs    []string
	CompileEnv     []string
	CompileCached  []string
	RunArgs        []string
	RunEnv         []string
	RunArtifacts   []string
	RunMemoryLimit int64
	RunProcLimit   int64
}

var goJudgeLanguageRuntimes = map[string]goJudgeLanguageRuntime{
	"c11": {
		DisplayName:    "C11",
		SourceFile:     "main.c",
		CompileArgs:    []string{"/usr/bin/gcc", "main.c", "-O2", "-pipe", "-std=c11", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"c17": {
		DisplayName:    "C17",
		SourceFile:     "main.c",
		CompileArgs:    []string{"/usr/bin/gcc", "main.c", "-O2", "-pipe", "-std=c17", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"cpp17": {
		DisplayName:    "C++17",
		SourceFile:     "main.cc",
		CompileArgs:    []string{"/usr/bin/g++", "main.cc", "-O2", "-pipe", "-std=c++17", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"cpp20": {
		DisplayName:    "C++20",
		SourceFile:     "main.cc",
		CompileArgs:    []string{"/usr/bin/g++", "main.cc", "-O2", "-pipe", "-std=c++20", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"cpp23": {
		DisplayName:    "C++23",
		SourceFile:     "main.cc",
		CompileArgs:    []string{"/usr/bin/g++", "main.cc", "-O2", "-pipe", "-std=c++23", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"go": {
		DisplayName:    "Go",
		SourceFile:     "main.go",
		CompileArgs:    []string{"/usr/bin/go", "build", "-o", "main", "main.go"},
		CompileEnv:     goJudgeEnv("GO111MODULE=off", "GOCACHE=/tmp/go-cache", "GOMODCACHE=/tmp/go-mod", "HOME=/tmp"),
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"golang": {
		DisplayName:    "Golang",
		SourceFile:     "main.go",
		CompileArgs:    []string{"/usr/bin/go", "build", "-o", "main", "main.go"},
		CompileEnv:     goJudgeEnv("GO111MODULE=off", "GOCACHE=/tmp/go-cache", "GOMODCACHE=/tmp/go-mod", "HOME=/tmp"),
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"java": {
		DisplayName:    "Java",
		SourceFile:     "Main.java",
		CompileArgs:    []string{"/usr/bin/javac", "Main.java"},
		CompileCached:  []string{"Main.class"},
		RunArgs:        []string{"/usr/bin/java", "-Xss64m", "-Xmx256m", "Main"},
		RunArtifacts:   []string{"Main.class"},
		RunMemoryLimit: 512 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"java17": {
		DisplayName:    "Java 17",
		SourceFile:     "Main.java",
		CompileArgs:    []string{"/usr/bin/javac", "Main.java"},
		CompileCached:  []string{"Main.class"},
		RunArgs:        []string{"/usr/bin/java", "-Xss64m", "-Xmx256m", "Main"},
		RunArtifacts:   []string{"Main.class"},
		RunMemoryLimit: 512 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"kotlin": {
		DisplayName:    "Kotlin",
		SourceFile:     "Main.kt",
		CompileArgs:    []string{"/usr/bin/kotlinc", "Main.kt", "-include-runtime", "-d", "main.jar"},
		CompileCached:  []string{"main.jar"},
		RunArgs:        []string{"/usr/bin/java", "-Xss64m", "-Xmx256m", "-jar", "main.jar"},
		RunArtifacts:   []string{"main.jar"},
		RunMemoryLimit: 512 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"nodejs20": {
		DisplayName:    "JavaScript (Node.js)",
		SourceFile:     "main.js",
		RunArgs:        []string{"/usr/bin/node", "main.js"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   64,
	},
	"php83": {
		DisplayName:    "PHP",
		SourceFile:     "main.php",
		RunArgs:        []string{"/usr/bin/php", "main.php"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"pypy3": {
		DisplayName:    "PyPy 3",
		SourceFile:     "main.py",
		RunArgs:        []string{"/usr/bin/pypy3", "main.py"},
		RunMemoryLimit: 512 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"python3": {
		DisplayName:    "Python 3",
		SourceFile:     "main.py",
		RunArgs:        []string{"/usr/bin/python3", "main.py"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"ruby33": {
		DisplayName:    "Ruby",
		SourceFile:     "main.rb",
		RunArgs:        []string{"/usr/bin/ruby", "main.rb"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
	"rust": {
		DisplayName:    "Rust",
		SourceFile:     "main.rs",
		CompileArgs:    []string{"/usr/bin/rustc", "main.rs", "-O", "-o", "main"},
		CompileCached:  []string{"main"},
		RunArgs:        []string{"main"},
		RunArtifacts:   []string{"main"},
		RunMemoryLimit: 256 * 1024 * 1024,
		RunProcLimit:   32,
	},
}

func goJudgeEnv(extra ...string) []string {
	env := []string{"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}
	return append(env, extra...)
}

func goJudgeRuntimeForLanguage(languageID string) (goJudgeLanguageRuntime, bool) {
	runtime, ok := goJudgeLanguageRuntimes[languageID]
	if runtime.CompileEnv == nil {
		runtime.CompileEnv = goJudgeEnv()
	}
	if runtime.RunEnv == nil {
		runtime.RunEnv = goJudgeEnv()
	}
	if runtime.RunMemoryLimit == 0 {
		runtime.RunMemoryLimit = 256 * 1024 * 1024
	}
	if runtime.RunProcLimit == 0 {
		runtime.RunProcLimit = 32
	}
	return runtime, ok
}

func supportedGoJudgeLanguageIDs() string {
	ids := make([]string, 0, len(goJudgeLanguageRuntimes))
	for id := range goJudgeLanguageRuntimes {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return strings.Join(ids, ", ")
}

func (p GoJudgeHTTPProvider) Judge(ctx context.Context, task JudgeTask) (<-chan JudgeResult, error) {
	results := make(chan JudgeResult, 4)

	go func() {
		defer close(results)
		runtime, ok := goJudgeRuntimeForLanguage(task.LanguageID)
		if !ok {
			send(ctx, results, JudgeResult{
				SubmissionID: task.SubmissionID,
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR,
				Message:      fmt.Sprintf("unsupported languageId %q. Supported languageIds: %s", task.LanguageID, supportedGoJudgeLanguageIDs()),
				Final:        true,
			})
			return
		}

		send(ctx, results, JudgeResult{
			SubmissionID: task.SubmissionID,
			Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILING,
			Message:      "go-judge preparing " + runtime.DisplayName,
		})

		artifacts, compileResult, err := p.compileSource(ctx, runtime, task.SourceCode)
		if err != nil {
			send(ctx, results, JudgeResult{
				SubmissionID: task.SubmissionID,
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR,
				Message:      err.Error(),
				Final:        true,
			})
			return
		}
		if len(runtime.CompileArgs) > 0 && compileResult.Status != "Accepted" {
			send(ctx, results, JudgeResult{
				SubmissionID: task.SubmissionID,
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILE_ERROR,
				Message:      firstNonEmpty(compileResult.Files["stderr"], compileResult.Status),
				TimeMs:       nanoToMs(compileResult.Time),
				MemoryBytes:  compileResult.Memory,
				Final:        true,
			})
			return
		}

		send(ctx, results, JudgeResult{
			SubmissionID: task.SubmissionID,
			Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING,
			Message:      "go-judge running sample tests with " + runtime.DisplayName,
		})

		sample, ok := sampleForProblem(task.ProblemID)
		if !ok {
			send(ctx, results, JudgeResult{
				SubmissionID: task.SubmissionID,
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR,
				Message:      "no local sample test is configured for " + task.ProblemID,
				Final:        true,
			})
			return
		}

		runResult, err := p.runProgram(ctx, runtime, artifacts, task.SourceCode, sample.input)
		if err != nil {
			send(ctx, results, JudgeResult{
				SubmissionID: task.SubmissionID,
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR,
				Message:      err.Error(),
				Final:        true,
			})
			return
		}

		status := mapGoJudgeStatus(runResult.Status)
		message := firstNonEmpty(runResult.Files["stderr"], runResult.Status)
		if status == submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED {
			if normalizeOutput(runResult.Files["stdout"]) != normalizeOutput(sample.output) {
				status = submissionv1.SubmissionStatus_SUBMISSION_STATUS_WRONG_ANSWER
				message = fmt.Sprintf(
					"failed on sample test #1: expected %q, got %q",
					trimForJudgeMessage(sample.output),
					trimForJudgeMessage(runResult.Files["stdout"]),
				)
			} else {
				message = "sample test #1 accepted by go-judge"
			}
		}

		send(ctx, results, JudgeResult{
			SubmissionID:  task.SubmissionID,
			Status:        status,
			TestCaseIndex: 1,
			Message:       message,
			TimeMs:        nanoToMs(runResult.Time),
			MemoryBytes:   runResult.Memory,
			Final:         true,
		})
	}()

	return results, nil
}

func (p GoJudgeHTTPProvider) compileSource(ctx context.Context, runtime goJudgeLanguageRuntime, sourceCode string) (map[string]string, goJudgeResult, error) {
	if len(runtime.CompileArgs) == 0 {
		return map[string]string{}, goJudgeResult{Status: "Accepted"}, nil
	}

	response, err := p.run(ctx, goJudgeRequest{
		Cmd: []goJudgeCmd{{
			Args: runtime.CompileArgs,
			Env:  runtime.CompileEnv,
			// go-judge expects every stdio slot to be an explicit file object.
			// An empty stdin is still `{ "content": "" }`; omitting it makes the
			// request invalid.
			Files:       []goJudgeFile{contentFile(""), namedFile("stdout", 10240), namedFile("stderr", 10240)},
			CPULimit:    10_000_000_000,
			ClockLimit:  15_000_000_000,
			MemoryLimit: 1024 * 1024 * 1024,
			ProcLimit:   128,
			CopyIn: map[string]goJudgeCopyIn{
				runtime.SourceFile: {Content: sourceCode},
			},
			CopyOut:       []string{"stderr"},
			CopyOutCached: runtime.CompileCached,
		}},
	})
	if err != nil {
		return nil, goJudgeResult{}, err
	}
	if len(response) == 0 {
		return nil, goJudgeResult{}, fmt.Errorf("go-judge returned empty compile response")
	}

	artifacts := map[string]string{}
	if response[0].Status != "Accepted" {
		return artifacts, response[0], nil
	}
	for _, name := range runtime.RunArtifacts {
		fileID := response[0].FileIDs[name]
		if fileID == "" {
			return nil, response[0], fmt.Errorf("go-judge did not return compiled artifact %q", name)
		}
		artifacts[name] = fileID
	}
	return artifacts, response[0], nil
}

func (p GoJudgeHTTPProvider) runProgram(ctx context.Context, runtime goJudgeLanguageRuntime, artifacts map[string]string, sourceCode string, input string) (goJudgeResult, error) {
	copyIn := map[string]goJudgeCopyIn{}
	if len(runtime.CompileArgs) == 0 {
		copyIn[runtime.SourceFile] = goJudgeCopyIn{Content: sourceCode}
	} else {
		for _, name := range runtime.RunArtifacts {
			fileID := artifacts[name]
			if fileID == "" {
				return goJudgeResult{}, fmt.Errorf("missing compiled artifact %q", name)
			}
			copyIn[name] = goJudgeCopyIn{FileID: fileID}
		}
	}

	response, err := p.run(ctx, goJudgeRequest{
		Cmd: []goJudgeCmd{{
			Args:        runtime.RunArgs,
			Env:         runtime.RunEnv,
			Files:       []goJudgeFile{contentFile(input), namedFile("stdout", 10240), namedFile("stderr", 10240)},
			CPULimit:    1_000_000_000,
			ClockLimit:  2_000_000_000,
			MemoryLimit: runtime.RunMemoryLimit,
			ProcLimit:   runtime.RunProcLimit,
			CopyIn:      copyIn,
			CopyOut:     []string{"stdout", "stderr"},
		}},
	})
	if err != nil {
		return goJudgeResult{}, err
	}
	if len(response) == 0 {
		return goJudgeResult{}, fmt.Errorf("go-judge returned empty run response")
	}
	return response[0], nil
}

func (p GoJudgeHTTPProvider) run(ctx context.Context, request goJudgeRequest) ([]goJudgeResult, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint+"/run", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")

	response, err := p.client.Do(httpRequest)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(response.Body)
		return nil, fmt.Errorf("go-judge /run returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var results []goJudgeResult
	if err := json.NewDecoder(response.Body).Decode(&results); err != nil {
		return nil, err
	}
	return results, nil
}

type goJudgeRequest struct {
	Cmd []goJudgeCmd `json:"cmd"`
}

type goJudgeCmd struct {
	Args          []string                 `json:"args"`
	Env           []string                 `json:"env,omitempty"`
	Files         []goJudgeFile            `json:"files"`
	CPULimit      int64                    `json:"cpuLimit"`
	ClockLimit    int64                    `json:"clockLimit,omitempty"`
	MemoryLimit   int64                    `json:"memoryLimit"`
	ProcLimit     int64                    `json:"procLimit"`
	CopyIn        map[string]goJudgeCopyIn `json:"copyIn,omitempty"`
	CopyOut       []string                 `json:"copyOut,omitempty"`
	CopyOutCached []string                 `json:"copyOutCached,omitempty"`
}

type goJudgeFile struct {
	Content *string `json:"content,omitempty"`
	Name    string  `json:"name,omitempty"`
	Max     int64   `json:"max,omitempty"`
}

type goJudgeCopyIn struct {
	Content string `json:"content,omitempty"`
	FileID  string `json:"fileId,omitempty"`
}

func contentFile(content string) goJudgeFile {
	return goJudgeFile{Content: &content}
}

func namedFile(name string, max int64) goJudgeFile {
	return goJudgeFile{Name: name, Max: max}
}

type goJudgeResult struct {
	Status     string            `json:"status"`
	ExitStatus int64             `json:"exitStatus"`
	Time       int64             `json:"time"`
	Memory     int64             `json:"memory"`
	Files      map[string]string `json:"files"`
	FileIDs    map[string]string `json:"fileIds"`
}

type sampleCase struct {
	input  string
	output string
}

func sampleForProblem(problemID string) (sampleCase, bool) {
	samples := map[string]sampleCase{
		"P1001": {input: "1 2\n", output: "3\n"},
		"P1024": {input: "5 2\n1 2 3 4 5\n1 3\n2 5\n", output: "6\n14\n"},
		"P2048": {input: "3 4\nA 100\nB 80\nA 30\nC 60\n", output: "A\nA\nA\nA\n"},
		"P4096": {input: "4 5\n1 2 3\n1 3 2\n2 3 1\n2 4 2\n3 4 4\n", output: "5\n"},
	}
	sample, ok := samples[problemID]
	return sample, ok
}

func mapGoJudgeStatus(status string) submissionv1.SubmissionStatus {
	switch status {
	case "Accepted":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED
	case "Time Limit Exceeded":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_TIME_LIMIT_EXCEEDED
	case "Memory Limit Exceeded":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_MEMORY_LIMIT_EXCEEDED
	case "Non Zero Exit Status", "Signalled":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNTIME_ERROR
	default:
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR
	}
}

func normalizeOutput(output string) string {
	return strings.Join(strings.Fields(output), " ")
}

func nanoToMs(value int64) int64 {
	if value <= 0 {
		return 0
	}
	return value / int64(time.Millisecond)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func trimForJudgeMessage(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 120 {
		return value
	}
	return value[:117] + "..."
}
