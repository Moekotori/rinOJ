package intake

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"
)

const MaxProblemPackageBytes int64 = 512 * 1024 * 1024

const defaultUploadExpiry = 15 * time.Minute

type ProblemType string

const (
	ProblemTypeTraditional  ProblemType = "traditional"
	ProblemTypeSpecialJudge ProblemType = "special_judge"
	ProblemTypeInteractive  ProblemType = "interactive"
)

type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityReview  Visibility = "review"
	VisibilityPublic  Visibility = "public"
)

type ProblemManifest struct {
	Title       string      `json:"title"`
	TimeLimit   int         `json:"timeLimit"`
	MemoryLimit int         `json:"memoryLimit"`
	Type        ProblemType `json:"type"`
	JudgeType   ProblemType `json:"judgeType"`
}

type ProblemPackage struct {
	SourceFilename string
	ProblemJSON    ProblemManifest
	Statements     map[string]string
	Samples        []SampleCase
	TestFiles      []string
}

type SampleCase struct {
	Name   string
	Input  string
	Output string
}

type ImportWizard struct {
	ImportID      string
	DetectedTitle string
	DetectedType  ProblemType
	Statements    map[string]string
	Samples       []SampleCase
	Validations   []ImportValidation
	NextActions   []string
}

type ImportValidation struct {
	Code     string
	Severity string
	Message  string
	Path     string
}

// Valid returns true only when there are no blocking errors. Warnings can still
// be shown in the UI while allowing a teacher/student to continue editing.
func (w ImportWizard) Valid() bool {
	for _, validation := range w.Validations {
		if validation.Severity == "error" {
			return false
		}
	}
	return true
}

func ValidateProblemImport(pkg ProblemPackage) ImportWizard {
	// The import wizard is intentionally domain-level and storage-agnostic.
	// ZIP parsing, MinIO downloads, and virus scanning should happen outside
	// this function; here we validate the normalized package manifest.
	wizard := ImportWizard{
		ImportID:      newID("imp"),
		DetectedTitle: strings.TrimSpace(pkg.ProblemJSON.Title),
		DetectedType:  normalizeProblemType(problemManifestType(pkg.ProblemJSON)),
		Statements:    pkg.Statements,
		Samples:       pkg.Samples,
		NextActions: []string{
			"preview_statement",
			"confirm_limits",
			"save_private_draft",
			"request_review",
		},
	}

	// Validation messages are written for teachers and students, not just
	// developers. The frontend can display them directly in the guided upload.
	if wizard.DetectedTitle == "" {
		wizard.Validations = append(wizard.Validations, ImportValidation{
			Code:     "title.required",
			Severity: "error",
			Message:  "Add a title in problem.json or the guided form.",
			Path:     "problem.json/title",
		})
	}
	if len(pkg.Statements) == 0 {
		wizard.Validations = append(wizard.Validations, ImportValidation{
			Code:     "statement.required",
			Severity: "error",
			Message:  "Add at least one Markdown statement, such as statements/zh-CN.md.",
			Path:     "statements",
		})
	}
	if len(pkg.Samples) == 0 {
		wizard.Validations = append(wizard.Validations, ImportValidation{
			Code:     "sample.required",
			Severity: "error",
			Message:  "Add at least one sample input/output pair for preview and quick checking.",
			Path:     "samples",
		})
	}
	if !hasInputAndOutput(pkg.TestFiles) {
		wizard.Validations = append(wizard.Validations, ImportValidation{
			Code:     "tests.required",
			Severity: "error",
			Message:  "Add test data with matching .in and .out files, or upload tests later before publish.",
			Path:     "tests",
		})
	}

	return wizard
}

type IDGenerator interface {
	NewID(prefix string) string
}

type StaticIDGenerator struct {
	Value string
}

func (g StaticIDGenerator) NewID(prefix string) string {
	if g.Value != "" {
		return prefix + "_" + g.Value
	}
	return newID(prefix)
}

type UploadSigner interface {
	PresignUploadPart(ctx context.Context, objectKey string, partNumber int32, expires time.Duration) (PresignedUploadPart, error)
}

type TextObjectWriter interface {
	PutText(ctx context.Context, objectKey string, content string) error
}

type DraftRepository interface {
	SaveDraft(ctx context.Context, draft ProblemDraft) error
	GetDraft(ctx context.Context, draftID string) (ProblemDraft, error)
}

type Service struct {
	repository DraftRepository
	signer     UploadSigner
	textWriter TextObjectWriter
	ids        IDGenerator
}

type Option func(*Service)

func WithDraftRepository(repository DraftRepository) Option {
	return func(service *Service) {
		service.repository = repository
	}
}

func WithUploadSigner(signer UploadSigner) Option {
	return func(service *Service) {
		service.signer = signer
	}
}

func WithTextObjectWriter(writer TextObjectWriter) Option {
	return func(service *Service) {
		service.textWriter = writer
	}
}

func WithIDGenerator(ids IDGenerator) Option {
	return func(service *Service) {
		service.ids = ids
	}
}

func NewService(options ...Option) *Service {
	service := &Service{
		repository: NewMemoryDraftRepository(),
		ids:        StaticIDGenerator{},
	}
	for _, option := range options {
		option(service)
	}
	return service
}

type TeacherQuickUploadInput struct {
	TeacherID          string
	ClassID            string
	UploadObjectKey    string
	PublishImmediately bool
	RequestAdminReview bool
	Wizard             ImportWizard
}

type StudentDraftSubmissionInput struct {
	StudentID       string
	ClassID         string
	UploadObjectKey string
	NoteToReviewer  string
	Wizard          ImportWizard
}

type InlineDraftInput struct {
	ActorID        string
	Title          string
	TimeLimit      int
	MemoryLimit    int
	JudgeType      ProblemType
	Locale         string
	Statement      string
	Samples        []SampleCase
	TestCases      []InlineTestCase
	ClassID        string
	NoteToReviewer string
}

type InlineTestCase struct {
	InputText       string
	OutputText      string
	InputObjectKey  string
	OutputObjectKey string
}

type ProblemDraft struct {
	DraftID         string
	ProblemID       string
	OwnerUserID     string
	ClassID         string
	UploadObjectKey string
	Title           string
	Visibility      Visibility
	ReviewerNote    string
	Wizard          ImportWizard
}

type CreatePresignedUploadInput struct {
	ActorID     string
	Filename    string
	ContentType string
	SizeBytes   int64
	PartCount   int32
}

type CreatePresignedUploadOutput struct {
	ObjectKey     string
	Parts         []PresignedUploadPart
	ExpiresAtUnix int64
}

type PresignedUploadPart struct {
	PartNumber int32
	UploadURL  string
	Headers    map[string]string
}

type FlatZIPMetadata struct {
	Title       string
	TimeLimit   int
	MemoryLimit int
	JudgeType   ProblemType
}

type ValidateProblemImportInput struct {
	ActorID         string
	UploadObjectKey string
	SourceFilename  string
	FlatMetadata    *FlatZIPMetadata
}

func (s *Service) CreatePresignedUpload(ctx context.Context, input CreatePresignedUploadInput) (CreatePresignedUploadOutput, error) {
	if s.signer == nil {
		return CreatePresignedUploadOutput{}, errors.New("upload signer is not configured")
	}
	if strings.TrimSpace(input.ActorID) == "" {
		return CreatePresignedUploadOutput{}, errors.New("actor id is required")
	}
	if strings.TrimSpace(input.Filename) == "" {
		return CreatePresignedUploadOutput{}, errors.New("filename is required")
	}
	if input.ContentType != "application/zip" && input.ContentType != "application/octet-stream" {
		return CreatePresignedUploadOutput{}, errors.New("problem package must be a zip upload")
	}
	if input.SizeBytes <= 0 {
		return CreatePresignedUploadOutput{}, errors.New("upload size is required")
	}
	if input.SizeBytes > MaxProblemPackageBytes {
		return CreatePresignedUploadOutput{}, errors.New("problem package is too large")
	}
	if input.PartCount <= 0 || input.PartCount > 1000 {
		return CreatePresignedUploadOutput{}, errors.New("part count must be between 1 and 1000")
	}

	objectKey := fmt.Sprintf("problem-intake/%s/%s-%s", sanitizePathSegment(input.ActorID), s.ids.NewID("upload"), sanitizeFilename(input.Filename))
	parts := make([]PresignedUploadPart, 0, input.PartCount)
	for partNumber := int32(1); partNumber <= input.PartCount; partNumber++ {
		part, err := s.signer.PresignUploadPart(ctx, objectKey, partNumber, defaultUploadExpiry)
		if err != nil {
			return CreatePresignedUploadOutput{}, err
		}
		parts = append(parts, part)
	}

	return CreatePresignedUploadOutput{
		ObjectKey:     objectKey,
		Parts:         parts,
		ExpiresAtUnix: time.Now().Add(defaultUploadExpiry).Unix(),
	}, nil
}

func (s *Service) ValidateProblemImport(input ValidateProblemImportInput) (ImportWizard, error) {
	if strings.TrimSpace(input.ActorID) == "" {
		return ImportWizard{}, errors.New("actor id is required")
	}
	if strings.TrimSpace(input.UploadObjectKey) == "" {
		return ImportWizard{}, errors.New("upload object key is required")
	}
	if strings.TrimSpace(input.SourceFilename) == "" {
		return ImportWizard{}, errors.New("source filename is required")
	}

	title := humanizeProblemTitle(input.SourceFilename)
	detectedType := ProblemTypeTraditional
	if input.FlatMetadata != nil {
		if strings.TrimSpace(input.FlatMetadata.Title) != "" {
			title = strings.TrimSpace(input.FlatMetadata.Title)
		}
		detectedType = normalizeProblemType(input.FlatMetadata.JudgeType)
	}

	// This is the synchronous metadata pass. A later ZIP parser can enrich the
	// same ImportWizard with real statements, samples, tests, and stronger
	// validations without changing the gRPC or HTTP contract.
	wizard := ImportWizard{
		ImportID:      s.ids.NewID("imp"),
		DetectedTitle: title,
		DetectedType:  detectedType,
		Statements: map[string]string{
			"zh-CN": "# " + title + "\n",
		},
		Validations: []ImportValidation{
			{
				Code:     "package.parser.pending",
				Severity: "warning",
				Message:  "Package metadata accepted. Full ZIP parsing will verify statements, samples, and tests before publish.",
				Path:     input.UploadObjectKey,
			},
		},
		NextActions: []string{
			"preview_statement",
			"confirm_limits",
			"save_private_draft",
			"request_review",
		},
	}
	if input.FlatMetadata != nil {
		wizard.Validations = append(wizard.Validations, ImportValidation{
			Code:     "package.flat_metadata.accepted",
			Severity: "info",
			Message:  "Simplified ZIP metadata accepted. The flat ZIP parser will verify statement.md and root .in/.out pairs before publish.",
			Path:     input.UploadObjectKey,
		})
	}
	return wizard, nil
}

func (s *Service) TeacherQuickUpload(input TeacherQuickUploadInput) (ProblemDraft, error) {
	if strings.TrimSpace(input.TeacherID) == "" {
		return ProblemDraft{}, errors.New("teacher id is required")
	}
	if strings.TrimSpace(input.UploadObjectKey) == "" {
		return ProblemDraft{}, errors.New("upload object key is required")
	}

	// Teachers get a review-ready draft by default. That keeps uploading fast
	// while still allowing schools to require admin approval before publish.
	visibility := VisibilityReview
	if input.PublishImmediately {
		visibility = VisibilityPublic
	}

	draft := ProblemDraft{
		DraftID:         newID("draft"),
		ProblemID:       newID("prob"),
		OwnerUserID:     input.TeacherID,
		ClassID:         input.ClassID,
		UploadObjectKey: input.UploadObjectKey,
		Title:           input.Wizard.DetectedTitle,
		Visibility:      visibility,
		Wizard:          input.Wizard,
	}
	if err := s.repository.SaveDraft(context.Background(), draft); err != nil {
		return ProblemDraft{}, err
	}
	return draft, nil
}

func (s *Service) StudentDraftSubmission(input StudentDraftSubmissionInput) (ProblemDraft, error) {
	if strings.TrimSpace(input.StudentID) == "" {
		return ProblemDraft{}, errors.New("student id is required")
	}
	if strings.TrimSpace(input.UploadObjectKey) == "" {
		return ProblemDraft{}, errors.New("upload object key is required")
	}

	// Student-submitted problems are private until a teacher/admin reviews them.
	// This lets students contribute without accidentally publishing bad tests.
	draft := ProblemDraft{
		DraftID:         newID("draft"),
		OwnerUserID:     input.StudentID,
		ClassID:         input.ClassID,
		UploadObjectKey: input.UploadObjectKey,
		Title:           input.Wizard.DetectedTitle,
		Visibility:      VisibilityPrivate,
		ReviewerNote:    input.NoteToReviewer,
		Wizard:          input.Wizard,
	}
	if err := s.repository.SaveDraft(context.Background(), draft); err != nil {
		return ProblemDraft{}, err
	}
	return draft, nil
}

func (s *Service) CreateInlineDraft(input InlineDraftInput) (ProblemDraft, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if actorID == "" {
		return ProblemDraft{}, errors.New("actor id is required")
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return ProblemDraft{}, errors.New("title is required")
	}
	statement := strings.TrimSpace(input.Statement)
	if statement == "" {
		return ProblemDraft{}, errors.New("statement is required")
	}

	timeLimit := defaultPositive(input.TimeLimit, 1000)
	memoryLimit := defaultPositive(input.MemoryLimit, 256)
	locale := strings.TrimSpace(input.Locale)
	if locale == "" {
		locale = "zh-CN"
	}

	testFiles := make([]string, 0, len(input.TestCases)*2)
	for index, testCase := range input.TestCases {
		inputKey, outputKey, err := s.materializeInlineTestCase(actorID, index+1, testCase)
		if err != nil {
			return ProblemDraft{}, err
		}
		testFiles = append(testFiles, inputKey, outputKey)
	}

	pkg := ProblemPackage{
		SourceFilename: "inline-form",
		ProblemJSON: ProblemManifest{
			Title:       title,
			TimeLimit:   timeLimit,
			MemoryLimit: memoryLimit,
			Type:        normalizeProblemType(input.JudgeType),
			JudgeType:   normalizeProblemType(input.JudgeType),
		},
		Statements: map[string]string{
			locale: input.Statement,
		},
		Samples:   append([]SampleCase(nil), input.Samples...),
		TestFiles: testFiles,
	}
	wizard := ValidateProblemImport(pkg)
	draft := ProblemDraft{
		DraftID:      s.ids.NewID("draft"),
		ProblemID:    s.ids.NewID("prob"),
		OwnerUserID:  actorID,
		ClassID:      input.ClassID,
		Title:        title,
		Visibility:   VisibilityPrivate,
		ReviewerNote: input.NoteToReviewer,
		Wizard:       wizard,
	}
	if err := s.repository.SaveDraft(context.Background(), draft); err != nil {
		return ProblemDraft{}, err
	}
	return draft, nil
}

func (s *Service) materializeInlineTestCase(actorID string, number int, testCase InlineTestCase) (string, string, error) {
	inputKey := strings.TrimSpace(testCase.InputObjectKey)
	outputKey := strings.TrimSpace(testCase.OutputObjectKey)
	if strings.TrimSpace(testCase.InputText) == "" && inputKey == "" {
		return "", "", fmt.Errorf("test case %d input is required", number)
	}
	if strings.TrimSpace(testCase.OutputText) == "" && outputKey == "" {
		return "", "", fmt.Errorf("test case %d output is required", number)
	}

	if inputKey == "" {
		inputKey = s.inlineTestObjectKey(actorID, number, "in")
		if err := s.putInlineText(inputKey, testCase.InputText); err != nil {
			return "", "", err
		}
	}
	if outputKey == "" {
		outputKey = s.inlineTestObjectKey(actorID, number, "out")
		if err := s.putInlineText(outputKey, testCase.OutputText); err != nil {
			return "", "", err
		}
	}
	return inputKey, outputKey, nil
}

func (s *Service) inlineTestObjectKey(actorID string, number int, extension string) string {
	return fmt.Sprintf("problem-intake/%s/inline/%s/%03d.%s", sanitizePathSegment(actorID), s.ids.NewID("case"), number, extension)
}

func (s *Service) putInlineText(objectKey string, content string) error {
	if s.textWriter == nil {
		return nil
	}
	return s.textWriter.PutText(context.Background(), objectKey, content)
}

func (s *Service) GetDraft(ctx context.Context, draftID string) (ProblemDraft, error) {
	return s.repository.GetDraft(ctx, draftID)
}

func normalizeProblemType(value ProblemType) ProblemType {
	switch value {
	case ProblemTypeSpecialJudge, ProblemTypeInteractive:
		return value
	default:
		return ProblemTypeTraditional
	}
}

func problemManifestType(manifest ProblemManifest) ProblemType {
	if manifest.JudgeType != "" {
		return manifest.JudgeType
	}
	return manifest.Type
}

func hasInputAndOutput(files []string) bool {
	hasInput := false
	hasOutput := false
	for _, file := range files {
		lower := strings.ToLower(file)
		hasInput = hasInput || strings.HasSuffix(lower, ".in")
		hasOutput = hasOutput || strings.HasSuffix(lower, ".out") || strings.HasSuffix(lower, ".ans")
	}
	return hasInput && hasOutput
}

func newID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}

type MemoryDraftRepository struct {
	mu     sync.RWMutex
	drafts map[string]ProblemDraft
}

func NewMemoryDraftRepository() *MemoryDraftRepository {
	return &MemoryDraftRepository{drafts: make(map[string]ProblemDraft)}
}

func (r *MemoryDraftRepository) SaveDraft(ctx context.Context, draft ProblemDraft) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.drafts[draft.DraftID] = cloneDraft(draft)
	return nil
}

func (r *MemoryDraftRepository) GetDraft(ctx context.Context, draftID string) (ProblemDraft, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	draft, ok := r.drafts[draftID]
	if !ok {
		return ProblemDraft{}, errors.New("problem draft not found")
	}
	return cloneDraft(draft), nil
}

func cloneDraft(draft ProblemDraft) ProblemDraft {
	draft.Wizard.Statements = cloneStringMap(draft.Wizard.Statements)
	draft.Wizard.Samples = append([]SampleCase(nil), draft.Wizard.Samples...)
	draft.Wizard.Validations = append([]ImportValidation(nil), draft.Wizard.Validations...)
	draft.Wizard.NextActions = append([]string(nil), draft.Wizard.NextActions...)
	return draft
}

func cloneStringMap(input map[string]string) map[string]string {
	if input == nil {
		return nil
	}
	output := make(map[string]string, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

var unsafeFilenameChars = regexp.MustCompile(`[^a-z0-9._-]+`)

func sanitizePathSegment(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = unsafeFilenameChars.ReplaceAllString(value, "-")
	return strings.Trim(value, "-")
}

func sanitizeFilename(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = unsafeFilenameChars.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-")
	if value == "" {
		return "problem.zip"
	}
	if filepath.Ext(value) == "" {
		value += ".zip"
	}
	return value
}

func humanizeProblemTitle(filename string) string {
	name := filepath.Base(strings.TrimSpace(filename))
	extension := filepath.Ext(name)
	name = strings.TrimSuffix(name, extension)
	name = strings.NewReplacer("-", " ", "_", " ").Replace(name)
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return "Untitled Problem"
	}
	for index, field := range fields {
		runes := []rune(field)
		runes[0] = unicode.ToUpper(runes[0])
		fields[index] = string(runes)
	}
	return strings.Join(fields, " ")
}
