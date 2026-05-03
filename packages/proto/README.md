# Rin OJ Protobuf Contracts

This package contains internal gRPC contracts. Domain services must communicate through these contracts instead of importing each other's persistence or application packages.

Initial domains:

- `rin.user.v1`
- `rin.problem.v1`
- `rin.submission.v1`
- `rin.contest.v1`
- `rin.judge.v1`
- `rin.event.v1`
