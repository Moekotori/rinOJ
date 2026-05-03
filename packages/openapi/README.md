# Rin OJ OpenAPI Contracts

`openapi.yaml` describes the gateway-facing HTTP API. Internal services continue to use Protobuf/gRPC.

The first public surface focuses on:

- Auth session creation and refresh
- Problem browsing
- Problem Intake for teacher quick uploads and student draft submissions
- Submission creation and cursor-based listing
- Contest scoreboard reads
