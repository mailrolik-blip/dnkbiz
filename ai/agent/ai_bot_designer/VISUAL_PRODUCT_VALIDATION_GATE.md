# Visual Product Validation Gate

DNK must not start a public SaaS, billing, or self-serve generic image bot build before this gate is met.

## Technical Gate

- `<= 1.2` AI image calls/job across pilot jobs.
- No normal `hybrid_economy` job may exceed 1 automatic AI image call.
- Duplicate paid jobs from one trigger: `0`.
- Estimated provider cost/job must stay under the configured threshold.
- At least `70%` of jobs accepted without another AI call.
- Simple Brand Recipe onboarding target: `<= 4 hours`.

## Commercial Gate

- 5 serious external demos completed.
- At least 2 prospects explicitly willing to pay.
- At least 1 real paid Brand Recipe pilot.

Until the gate is met, keep the product positioned as internal/operator-led Brand Recipe automation, not public SaaS.
