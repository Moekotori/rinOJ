package grpcserver

import (
	"context"
	"sort"

	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/intake"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	problemv1.UnimplementedProblemServiceServer
	service *intake.Service
}

func New(service *intake.Service) *Server {
	return &Server{service: service}
}

func (s *Server) CreatePresignedUpload(ctx context.Context, req *problemv1.CreatePresignedUploadRequest) (*problemv1.CreatePresignedUploadResponse, error) {
	upload, err := s.service.CreatePresignedUpload(ctx, intake.CreatePresignedUploadInput{
		ActorID:     req.GetActorId(),
		Filename:    req.GetFilename(),
		ContentType: req.GetContentType(),
		SizeBytes:   req.GetSizeBytes(),
		PartCount:   req.GetPartCount(),
	})
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	parts := make([]*problemv1.PresignedUploadPart, 0, len(upload.Parts))
	for _, part := range upload.Parts {
		parts = append(parts, &problemv1.PresignedUploadPart{
			PartNumber: part.PartNumber,
			UploadUrl:  part.UploadURL,
			Headers:    part.Headers,
		})
	}

	return &problemv1.CreatePresignedUploadResponse{
		ObjectKey:     upload.ObjectKey,
		Parts:         parts,
		ExpiresAtUnix: upload.ExpiresAtUnix,
	}, nil
}

func (s *Server) TeacherQuickUpload(ctx context.Context, req *problemv1.TeacherQuickUploadRequest) (*problemv1.ProblemDraft, error) {
	draft, err := s.service.TeacherQuickUpload(intake.TeacherQuickUploadInput{
		TeacherID:          req.GetTeacherId(),
		ClassID:            req.GetClassId(),
		UploadObjectKey:    req.GetUploadObjectKey(),
		PublishImmediately: req.GetPublishImmediately(),
		RequestAdminReview: req.GetRequestAdminReview(),
		Wizard: intake.ImportWizard{
			DetectedTitle: "Imported problem",
			DetectedType:  intake.ProblemTypeTraditional,
		},
	})
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	return problemDraftToProto(draft), nil
}

func (s *Server) StudentDraftSubmission(ctx context.Context, req *problemv1.StudentDraftSubmissionRequest) (*problemv1.ProblemDraft, error) {
	draft, err := s.service.StudentDraftSubmission(intake.StudentDraftSubmissionInput{
		StudentID:       req.GetStudentId(),
		ClassID:         req.GetClassId(),
		UploadObjectKey: req.GetUploadObjectKey(),
		NoteToReviewer:  req.GetNoteToReviewer(),
		Wizard: intake.ImportWizard{
			DetectedTitle: "Student draft",
			DetectedType:  intake.ProblemTypeTraditional,
		},
	})
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	return problemDraftToProto(draft), nil
}

func (s *Server) CreateProblemDraft(ctx context.Context, req *problemv1.CreateProblemDraftRequest) (*problemv1.ProblemDraft, error) {
	return nil, status.Error(codes.Unimplemented, "create problem draft is not implemented in the skeleton")
}

func (s *Server) ValidateProblemImport(ctx context.Context, req *problemv1.ValidateProblemImportRequest) (*problemv1.ImportWizard, error) {
	wizard, err := s.service.ValidateProblemImport(intake.ValidateProblemImportInput{
		ActorID:         req.GetActorId(),
		UploadObjectKey: req.GetUploadObjectKey(),
		SourceFilename:  req.GetSourceFilename(),
	})
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	return importWizardToProto(wizard), nil
}

func (s *Server) PublishProblem(ctx context.Context, req *problemv1.PublishProblemRequest) (*problemv1.Problem, error) {
	return nil, status.Error(codes.Unimplemented, "publish problem is not implemented in the skeleton")
}

func (s *Server) GetProblem(ctx context.Context, req *problemv1.GetProblemRequest) (*problemv1.Problem, error) {
	return nil, status.Error(codes.Unimplemented, "get problem is not implemented in the skeleton")
}

func (s *Server) ListProblems(ctx context.Context, req *problemv1.ListProblemsRequest) (*problemv1.ListProblemsResponse, error) {
	return nil, status.Error(codes.Unimplemented, "list problems is not implemented in the skeleton")
}

func problemDraftToProto(draft intake.ProblemDraft) *problemv1.ProblemDraft {
	return &problemv1.ProblemDraft{
		DraftId:      draft.DraftID,
		ProblemId:    draft.ProblemID,
		OwnerUserId:  draft.OwnerUserID,
		Visibility:   visibilityToProto(draft.Visibility),
		ImportWizard: importWizardToProto(draft.Wizard),
	}
}

func importWizardToProto(wizard intake.ImportWizard) *problemv1.ImportWizard {
	statements := make([]*problemv1.LocalizedStatement, 0, len(wizard.Statements))
	locales := make([]string, 0, len(wizard.Statements))
	for locale := range wizard.Statements {
		locales = append(locales, locale)
	}
	sort.Strings(locales)
	for _, locale := range locales {
		statements = append(statements, &problemv1.LocalizedStatement{
			Locale:   locale,
			Title:    wizard.DetectedTitle,
			Markdown: wizard.Statements[locale],
		})
	}

	samples := make([]*problemv1.SampleCase, 0, len(wizard.Samples))
	for _, sample := range wizard.Samples {
		samples = append(samples, &problemv1.SampleCase{
			Name:   sample.Name,
			Input:  sample.Input,
			Output: sample.Output,
		})
	}

	validations := make([]*problemv1.ImportValidation, 0, len(wizard.Validations))
	for _, validation := range wizard.Validations {
		validations = append(validations, &problemv1.ImportValidation{
			Code:     validation.Code,
			Severity: validation.Severity,
			Message:  validation.Message,
			Path:     validation.Path,
		})
	}

	return &problemv1.ImportWizard{
		ImportId:      wizard.ImportID,
		DetectedTitle: wizard.DetectedTitle,
		DetectedType:  problemTypeToProto(wizard.DetectedType),
		Statements:    statements,
		Samples:       samples,
		Validations:   validations,
		NextActions:   append([]string(nil), wizard.NextActions...),
	}
}

func problemTypeToProto(problemType intake.ProblemType) problemv1.ProblemType {
	switch problemType {
	case intake.ProblemTypeSpecialJudge:
		return problemv1.ProblemType_PROBLEM_TYPE_SPECIAL_JUDGE
	case intake.ProblemTypeInteractive:
		return problemv1.ProblemType_PROBLEM_TYPE_INTERACTIVE
	default:
		return problemv1.ProblemType_PROBLEM_TYPE_TRADITIONAL
	}
}

func visibilityToProto(visibility intake.Visibility) problemv1.ProblemVisibility {
	switch visibility {
	case intake.VisibilityPrivate:
		return problemv1.ProblemVisibility_PROBLEM_VISIBILITY_PRIVATE
	case intake.VisibilityPublic:
		return problemv1.ProblemVisibility_PROBLEM_VISIBILITY_PUBLIC
	default:
		return problemv1.ProblemVisibility_PROBLEM_VISIBILITY_REVIEW
	}
}
