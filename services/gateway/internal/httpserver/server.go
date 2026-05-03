package httpserver

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ServerConfig struct {
	ServiceName      string
	Version          string
	ProblemClient    ProblemClient
	SubmissionClient SubmissionClient
	UserClient       UserClient
}

type ProblemClient interface {
	CreatePresignedUpload(ctx context.Context, req *problemv1.CreatePresignedUploadRequest) (*problemv1.CreatePresignedUploadResponse, error)
	ValidateProblemImport(ctx context.Context, req *problemv1.ValidateProblemImportRequest) (*problemv1.ImportWizard, error)
	TeacherQuickUpload(ctx context.Context, req *problemv1.TeacherQuickUploadRequest) (*problemv1.ProblemDraft, error)
	StudentDraftSubmission(ctx context.Context, req *problemv1.StudentDraftSubmissionRequest) (*problemv1.ProblemDraft, error)
}

type SubmissionClient interface {
	CreateSubmission(ctx context.Context, req *submissionv1.CreateSubmissionRequest) (*submissionv1.Submission, error)
	GetSubmission(ctx context.Context, req *submissionv1.GetSubmissionRequest) (*submissionv1.Submission, error)
	ListSubmissions(ctx context.Context, req *submissionv1.ListSubmissionsRequest) (*submissionv1.ListSubmissionsResponse, error)
	StreamSubmission(ctx context.Context, req *submissionv1.StreamSubmissionRequest) (SubmissionEventStream, error)
}

type SubmissionEventStream interface {
	Recv() (*submissionv1.SubmissionEvent, error)
}

type UserClient interface {
	Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthSession, error)
	Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthSession, error)
}

// New builds the HTTP edge as a standard net/http handler. Keeping this return
// type generic makes the gateway easy to test, wrap with middleware, or mount
// behind another server without leaking Echo through the rest of the codebase.
func New(config ServerConfig) http.Handler {
	if config.ServiceName == "" {
		config.ServiceName = "gateway"
	}
	if config.Version == "" {
		config.Version = "dev"
	}

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://127.0.0.1:3000", "http://localhost:3000"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderContentType, "X-Rin-Actor-ID"},
	}))

	// /healthz must stay dependency-light. Kubernetes, Docker Compose, and local
	// smoke tests should still work even if downstream services are unavailable.
	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"service": config.ServiceName,
			"version": config.Version,
		})
	})

	if config.SubmissionClient != nil {
		registerSubmissionRoutes(e, config.SubmissionClient)
	}
	if config.ProblemClient != nil {
		registerProblemIntakeRoutes(e, config.ProblemClient)
	}
	if config.UserClient != nil {
		registerAuthRoutes(e, config.UserClient)
	}

	return e
}

func registerAuthRoutes(e *echo.Echo, client UserClient) {
	e.POST("/v1/auth/register", func(c echo.Context) error {
		var req registerRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}
		session, err := client.Register(c.Request().Context(), &userv1.RegisterRequest{
			Email:    req.Email,
			Username: req.Username,
			Password: req.Password,
			Locale:   req.Locale,
		})
		if err != nil {
			return authHTTPError(err)
		}
		return c.JSON(http.StatusCreated, newAuthSessionResponse(session))
	})

	e.POST("/v1/auth/login", func(c echo.Context) error {
		var req loginRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}
		session, err := client.Login(c.Request().Context(), &userv1.LoginRequest{
			Login:    req.Login,
			Password: req.Password,
			TotpCode: req.TOTPCode,
		})
		if err != nil {
			return authHTTPError(err)
		}
		return c.JSON(http.StatusOK, newAuthSessionResponse(session))
	})
}

func authHTTPError(err error) *echo.HTTPError {
	if grpcStatus, ok := status.FromError(err); ok {
		switch grpcStatus.Code() {
		case codes.InvalidArgument:
			return echo.NewHTTPError(http.StatusBadRequest, grpcStatus.Message())
		case codes.AlreadyExists:
			return echo.NewHTTPError(http.StatusConflict, grpcStatus.Message())
		case codes.Unauthenticated:
			return echo.NewHTTPError(http.StatusUnauthorized, grpcStatus.Message())
		}
	}
	return echo.NewHTTPError(http.StatusBadGateway, "authentication service is temporarily unavailable")
}

func registerProblemIntakeRoutes(e *echo.Echo, client ProblemClient) {
	e.POST("/v1/problem-intake/uploads", func(c echo.Context) error {
		actorID, err := actorIDFromRequest(c)
		if err != nil {
			return err
		}

		var req createProblemIntakeUploadRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}

		upload, err := client.CreatePresignedUpload(c.Request().Context(), &problemv1.CreatePresignedUploadRequest{
			ActorId:     actorID,
			Filename:    req.Filename,
			ContentType: req.ContentType,
			SizeBytes:   req.SizeBytes,
			PartCount:   req.PartCount,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusCreated, newProblemUploadResponse(upload))
	})

	e.POST("/v1/problem-intake/imports:validate", func(c echo.Context) error {
		actorID, err := actorIDFromRequest(c)
		if err != nil {
			return err
		}

		var req validateProblemImportRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}

		wizard, err := client.ValidateProblemImport(c.Request().Context(), &problemv1.ValidateProblemImportRequest{
			ActorId:         actorID,
			UploadObjectKey: req.UploadObjectKey,
			SourceFilename:  req.SourceFilename,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusOK, newImportWizardResponse(wizard))
	})

	e.POST("/v1/problem-intake/teacher-quick-upload", func(c echo.Context) error {
		actorID, err := actorIDFromRequest(c)
		if err != nil {
			return err
		}

		var req teacherQuickUploadRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}

		draft, err := client.TeacherQuickUpload(c.Request().Context(), &problemv1.TeacherQuickUploadRequest{
			TeacherId:          actorID,
			ClassId:            req.ClassID,
			UploadObjectKey:    req.UploadObjectKey,
			PublishImmediately: req.PublishImmediately,
			RequestAdminReview: req.RequestAdminReview,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusCreated, newProblemDraftResponse(draft))
	})

	e.POST("/v1/problem-intake/student-drafts", func(c echo.Context) error {
		actorID, err := actorIDFromRequest(c)
		if err != nil {
			return err
		}

		var req studentDraftSubmissionRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}

		draft, err := client.StudentDraftSubmission(c.Request().Context(), &problemv1.StudentDraftSubmissionRequest{
			StudentId:       actorID,
			ClassId:         req.ClassID,
			UploadObjectKey: req.UploadObjectKey,
			NoteToReviewer:  req.NoteToReviewer,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusCreated, newProblemDraftResponse(draft))
	})
}

func registerSubmissionRoutes(e *echo.Echo, client SubmissionClient) {
	e.POST("/v1/submissions", func(c echo.Context) error {
		var req createSubmissionRequest
		if err := c.Bind(&req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
		}

		actorID, err := actorIDFromRequest(c)
		if err != nil {
			return err
		}

		submission, err := client.CreateSubmission(c.Request().Context(), &submissionv1.CreateSubmissionRequest{
			ActorId:    actorID,
			ProblemId:  req.ProblemID,
			ContestId:  req.ContestID,
			LanguageId: req.LanguageID,
			SourceCode: req.SourceCode,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusAccepted, newSubmissionResponse(submission))
	})

	e.GET("/v1/submissions", func(c echo.Context) error {
		pageSize, err := parsePageSize(c.QueryParam("pageSize"))
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "pageSize must be an integer")
		}

		result, err := client.ListSubmissions(c.Request().Context(), &submissionv1.ListSubmissionsRequest{
			Cursor:    c.QueryParam("cursor"),
			PageSize:  pageSize,
			ActorId:   c.QueryParam("actorId"),
			ProblemId: c.QueryParam("problemId"),
			ContestId: c.QueryParam("contestId"),
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusOK, newSubmissionListResponse(result))
	})

	e.GET("/v1/submissions/:submissionId/events", func(c echo.Context) error {
		conn, err := websocket.Accept(c.Response(), c.Request(), &websocket.AcceptOptions{
			OriginPatterns: []string{"127.0.0.1:3000", "localhost:3000"},
		})
		if err != nil {
			return err
		}
		defer conn.CloseNow()

		stream, err := client.StreamSubmission(c.Request().Context(), &submissionv1.StreamSubmissionRequest{
			SubmissionId: c.Param("submissionId"),
		})
		if err != nil {
			return conn.Close(websocket.StatusInternalError, err.Error())
		}

		for {
			event, err := stream.Recv()
			if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
				return conn.Close(websocket.StatusNormalClosure, "stream closed")
			}
			if err != nil {
				return conn.Close(websocket.StatusInternalError, err.Error())
			}
			if err := wsjsonWrite(c.Request().Context(), conn, newSubmissionEventResponse(event)); err != nil {
				return err
			}
			if event.GetFinal() {
				return conn.Close(websocket.StatusNormalClosure, "final event delivered")
			}
		}
	})

	e.GET("/v1/submissions/:submissionId", func(c echo.Context) error {
		submission, err := client.GetSubmission(c.Request().Context(), &submissionv1.GetSubmissionRequest{
			SubmissionId: c.Param("submissionId"),
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusBadGateway, err.Error())
		}
		return c.JSON(http.StatusOK, newSubmissionResponse(submission))
	})
}

type createProblemIntakeUploadRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
	PartCount   int32  `json:"partCount"`
}

type registerRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	Locale   string `json:"locale"`
}

type loginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	TOTPCode string `json:"totpCode"`
}

type teacherQuickUploadRequest struct {
	ClassID            string `json:"classId"`
	UploadObjectKey    string `json:"uploadObjectKey"`
	PublishImmediately bool   `json:"publishImmediately"`
	RequestAdminReview bool   `json:"requestAdminReview"`
}

type studentDraftSubmissionRequest struct {
	ClassID         string `json:"classId"`
	UploadObjectKey string `json:"uploadObjectKey"`
	NoteToReviewer  string `json:"noteToReviewer"`
}

type validateProblemImportRequest struct {
	UploadObjectKey string `json:"uploadObjectKey"`
	SourceFilename  string `json:"sourceFilename"`
}

type problemUploadResponse struct {
	ObjectKey     string              `json:"objectKey"`
	Parts         []problemUploadPart `json:"parts"`
	ExpiresAtUnix int64               `json:"expiresAtUnix"`
}

type problemUploadPart struct {
	PartNumber int32             `json:"partNumber"`
	UploadURL  string            `json:"uploadUrl"`
	Headers    map[string]string `json:"headers,omitempty"`
}

type problemDraftResponse struct {
	DraftID     string `json:"draftId"`
	ProblemID   string `json:"problemId,omitempty"`
	OwnerUserID string `json:"ownerUserId"`
	Visibility  string `json:"visibility"`
}

type importWizardResponse struct {
	ImportID      string                     `json:"importId"`
	DetectedTitle string                     `json:"detectedTitle"`
	DetectedType  string                     `json:"detectedType"`
	Statements    []localizedStatement       `json:"statements"`
	Samples       []sampleCaseResponse       `json:"samples"`
	Validations   []importValidationResponse `json:"validations"`
	NextActions   []string                   `json:"nextActions"`
}

type localizedStatement struct {
	Locale   string `json:"locale"`
	Title    string `json:"title"`
	Markdown string `json:"markdown"`
}

type sampleCaseResponse struct {
	Name   string `json:"name"`
	Input  string `json:"input"`
	Output string `json:"output"`
}

type importValidationResponse struct {
	Code     string `json:"code"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
	Path     string `json:"path"`
}

type createSubmissionRequest struct {
	ProblemID  string `json:"problemId"`
	ContestID  string `json:"contestId"`
	LanguageID string `json:"languageId"`
	SourceCode string `json:"sourceCode"`
}

func newProblemUploadResponse(upload *problemv1.CreatePresignedUploadResponse) problemUploadResponse {
	parts := make([]problemUploadPart, 0, len(upload.GetParts()))
	for _, part := range upload.GetParts() {
		parts = append(parts, problemUploadPart{
			PartNumber: part.GetPartNumber(),
			UploadURL:  part.GetUploadUrl(),
			Headers:    part.GetHeaders(),
		})
	}
	return problemUploadResponse{
		ObjectKey:     upload.GetObjectKey(),
		Parts:         parts,
		ExpiresAtUnix: upload.GetExpiresAtUnix(),
	}
}

func newProblemDraftResponse(draft *problemv1.ProblemDraft) problemDraftResponse {
	return problemDraftResponse{
		DraftID:     draft.GetDraftId(),
		ProblemID:   draft.GetProblemId(),
		OwnerUserID: draft.GetOwnerUserId(),
		Visibility:  problemVisibilityName(draft.GetVisibility()),
	}
}

func newImportWizardResponse(wizard *problemv1.ImportWizard) importWizardResponse {
	statements := make([]localizedStatement, 0, len(wizard.GetStatements()))
	for _, statement := range wizard.GetStatements() {
		statements = append(statements, localizedStatement{
			Locale:   statement.GetLocale(),
			Title:    statement.GetTitle(),
			Markdown: statement.GetMarkdown(),
		})
	}

	samples := make([]sampleCaseResponse, 0, len(wizard.GetSamples()))
	for _, sample := range wizard.GetSamples() {
		samples = append(samples, sampleCaseResponse{
			Name:   sample.GetName(),
			Input:  sample.GetInput(),
			Output: sample.GetOutput(),
		})
	}

	validations := make([]importValidationResponse, 0, len(wizard.GetValidations()))
	for _, validation := range wizard.GetValidations() {
		validations = append(validations, importValidationResponse{
			Code:     validation.GetCode(),
			Severity: validation.GetSeverity(),
			Message:  validation.GetMessage(),
			Path:     validation.GetPath(),
		})
	}

	return importWizardResponse{
		ImportID:      wizard.GetImportId(),
		DetectedTitle: wizard.GetDetectedTitle(),
		DetectedType:  problemTypeName(wizard.GetDetectedType()),
		Statements:    statements,
		Samples:       samples,
		Validations:   validations,
		NextActions:   wizard.GetNextActions(),
	}
}

func actorIDFromRequest(c echo.Context) (string, error) {
	actorID := c.Request().Header.Get("X-Rin-Actor-ID")
	if actorID == "" {
		return "", echo.NewHTTPError(http.StatusUnauthorized, "missing actor identity")
	}
	return actorID, nil
}

type submissionResponse struct {
	SubmissionID string `json:"submissionId"`
	ActorID      string `json:"actorId,omitempty"`
	ProblemID    string `json:"problemId"`
	ContestID    string `json:"contestId,omitempty"`
	LanguageID   string `json:"languageId"`
	Status       string `json:"status"`
	Score        int64  `json:"score"`
}

type submissionEventResponse struct {
	SubmissionID  string `json:"submissionId"`
	Status        string `json:"status"`
	TestCaseIndex int32  `json:"testCaseIndex"`
	Message       string `json:"message"`
	TimeMs        int64  `json:"timeMs"`
	MemoryBytes   int64  `json:"memoryBytes"`
	Final         bool   `json:"final"`
}

type submissionListResponse struct {
	Items      []submissionResponse `json:"items"`
	NextCursor string               `json:"nextCursor,omitempty"`
}

type authSessionResponse struct {
	UserID               string `json:"userId"`
	AccessToken          string `json:"accessToken"`
	RefreshToken         string `json:"refreshToken"`
	AccessExpiresAtUnix  int64  `json:"accessExpiresAtUnix"`
	RefreshExpiresAtUnix int64  `json:"refreshExpiresAtUnix"`
}

func newAuthSessionResponse(session *userv1.AuthSession) authSessionResponse {
	return authSessionResponse{
		UserID:               session.GetUserId(),
		AccessToken:          session.GetAccessToken(),
		RefreshToken:         session.GetRefreshToken(),
		AccessExpiresAtUnix:  session.GetAccessExpiresAtUnix(),
		RefreshExpiresAtUnix: session.GetRefreshExpiresAtUnix(),
	}
}

func newSubmissionResponse(submission *submissionv1.Submission) submissionResponse {
	return submissionResponse{
		SubmissionID: submission.GetSubmissionId(),
		ActorID:      submission.GetActorId(),
		ProblemID:    submission.GetProblemId(),
		ContestID:    submission.GetContestId(),
		LanguageID:   submission.GetLanguageId(),
		Status:       statusName(submission.GetStatus()),
		Score:        submission.GetScore(),
	}
}

func newSubmissionListResponse(result *submissionv1.ListSubmissionsResponse) submissionListResponse {
	items := make([]submissionResponse, 0, len(result.GetSubmissions()))
	for _, submission := range result.GetSubmissions() {
		items = append(items, newSubmissionResponse(submission))
	}
	return submissionListResponse{
		Items:      items,
		NextCursor: result.GetNextCursor(),
	}
}

func newSubmissionEventResponse(event *submissionv1.SubmissionEvent) submissionEventResponse {
	return submissionEventResponse{
		SubmissionID:  event.GetSubmissionId(),
		Status:        statusName(event.GetStatus()),
		TestCaseIndex: event.GetTestCaseIndex(),
		Message:       event.GetMessage(),
		TimeMs:        event.GetTimeMs(),
		MemoryBytes:   event.GetMemoryBytes(),
		Final:         event.GetFinal(),
	}
}

func statusName(status submissionv1.SubmissionStatus) string {
	switch status {
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED:
		return "queued"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILING:
		return "compiling"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING:
		return "running"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED:
		return "accepted"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_WRONG_ANSWER:
		return "wrong_answer"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_TIME_LIMIT_EXCEEDED:
		return "time_limit_exceeded"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_MEMORY_LIMIT_EXCEEDED:
		return "memory_limit_exceeded"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNTIME_ERROR:
		return "runtime_error"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILE_ERROR:
		return "compile_error"
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR:
		return "system_error"
	default:
		return "unspecified"
	}
}

func problemVisibilityName(visibility problemv1.ProblemVisibility) string {
	switch visibility {
	case problemv1.ProblemVisibility_PROBLEM_VISIBILITY_PRIVATE:
		return "private"
	case problemv1.ProblemVisibility_PROBLEM_VISIBILITY_PUBLIC:
		return "public"
	case problemv1.ProblemVisibility_PROBLEM_VISIBILITY_CONTEST_ONLY:
		return "contest_only"
	case problemv1.ProblemVisibility_PROBLEM_VISIBILITY_REVIEW:
		return "review"
	default:
		return "unspecified"
	}
}

func problemTypeName(problemType problemv1.ProblemType) string {
	switch problemType {
	case problemv1.ProblemType_PROBLEM_TYPE_SPECIAL_JUDGE:
		return "special_judge"
	case problemv1.ProblemType_PROBLEM_TYPE_INTERACTIVE:
		return "interactive"
	case problemv1.ProblemType_PROBLEM_TYPE_SUBMIT_ANSWER:
		return "submit_answer"
	case problemv1.ProblemType_PROBLEM_TYPE_OUTPUT_ONLY:
		return "output_only"
	case problemv1.ProblemType_PROBLEM_TYPE_COMMUNICATION:
		return "communication"
	case problemv1.ProblemType_PROBLEM_TYPE_TRADITIONAL:
		return "traditional"
	default:
		return "unspecified"
	}
}

func wsjsonWrite(ctx context.Context, conn *websocket.Conn, payload any) error {
	return wsjson.Write(ctx, conn, payload)
}

func parsePageSize(raw string) (int32, error) {
	if raw == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	return int32(value), nil
}
