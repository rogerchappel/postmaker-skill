# Contributing

Thanks for helping improve `postmaker-skill`.

## Development

Development requires Node.js 18 or newer. Node 18 remains the supported legacy
floor declared in `package.json`; CI runs the release checks on Node 18, 20, 22,
and 24 so that the floor and each subsequent even-numbered release stay covered.
When the supported range changes, update the package engine and CI matrix
together.

```bash
npm install
npm run release:check
```

Use synthetic repository evidence in fixtures and tests. Do not commit private launch plans, credentials, customer data, or unreleased third-party claims.

## Pull Requests

- Describe the launch-draft behavior being changed.
- Add or update fixture-backed tests when output rules change.
- Run `npm run release:check` before requesting review.
