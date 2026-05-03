package grpcserver

import (
	"context"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/app"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	submissionv1.UnimplementedSubmissionServiceServer
	service *app.Service
}

func New(service *app.Service) *Server {
	return &Server{service: service}
}

func (s *Server) CreateSubmission(ctx context.Context, req *submissionv1.CreateSubmissionRequest) (*submissionv1.Submission, error) {
	return s.service.CreateSubmission(ctx, app.CreateSubmissionCommand{
		ActorID:    req.GetActorId(),
		ProblemID:  req.GetProblemId(),
		ContestID:  req.GetContestId(),
		LanguageID: req.GetLanguageId(),
		SourceCode: req.GetSourceCode(),
	})
}

func (s *Server) GetSubmission(ctx context.Context, req *submissionv1.GetSubmissionRequest) (*submissionv1.Submission, error) {
	submission, err := s.service.GetSubmission(req.GetSubmissionId())
	if err != nil {
		return nil, status.Error(codes.NotFound, err.Error())
	}
	return submission, nil
}

func (s *Server) StreamSubmission(req *submissionv1.StreamSubmissionRequest, stream submissionv1.SubmissionService_StreamSubmissionServer) error {
	events, unsubscribe := s.service.Subscribe(req.GetSubmissionId())
	defer unsubscribe()

	for {
		select {
		case <-stream.Context().Done():
			return stream.Context().Err()
		case event, ok := <-events:
			if !ok {
				return nil
			}
			if err := stream.Send(event); err != nil {
				return err
			}
			if event.GetFinal() {
				return nil
			}
		}
	}
}

func (s *Server) ReportJudgeResult(ctx context.Context, req *submissionv1.ReportJudgeResultRequest) (*submissionv1.ReportJudgeResultResponse, error) {
	submission, err := s.service.ReportJudgeResult(ctx, app.JudgeResult{
		SubmissionID:  req.GetSubmissionId(),
		Status:        req.GetStatus(),
		TestCaseIndex: req.GetTestCaseIndex(),
		Message:       req.GetMessage(),
		TimeMs:        req.GetTimeMs(),
		MemoryBytes:   req.GetMemoryBytes(),
		Final:         req.GetFinal(),
	})
	if err != nil {
		return nil, err
	}
	return &submissionv1.ReportJudgeResultResponse{Submission: submission}, nil
}

func (s *Server) ListSubmissions(ctx context.Context, req *submissionv1.ListSubmissionsRequest) (*submissionv1.ListSubmissionsResponse, error) {
	result, err := s.service.ListSubmissions(ctx, app.ListSubmissionsQuery{
		Cursor:    req.GetCursor(),
		PageSize:  req.GetPageSize(),
		ActorID:   req.GetActorId(),
		ProblemID: req.GetProblemId(),
		ContestID: req.GetContestId(),
	})
	if err != nil {
		return nil, err
	}
	return &submissionv1.ListSubmissionsResponse{
		Submissions: result.Submissions,
		NextCursor:  result.NextCursor,
	}, nil
}

func (s *Server) Rejudge(ctx context.Context, req *submissionv1.RejudgeRequest) (*submissionv1.RejudgeResponse, error) {
	return nil, status.Error(codes.Unimplemented, "rejudge is not implemented in the skeleton")
}
