# Security policy

## Reporting a vulnerability

Please do not publish exploitable details, tokens, credentials, database connection strings, or private user records in a public issue.

Use GitHub's private vulnerability reporting feature for this repository when enabled. If private reporting is unavailable, contact the repository owner privately through a trusted channel and share only the minimum reproducible details. Avoid posting a public proof of concept until the issue has been triaged.

## Supported deployment boundary

The hosted GitHub Pages interface runs in browser-demo mode unless explicitly reconfigured. Browser-demo storage and its demo token are not a secure server-side account system. The API currently records deployment intent and telemetry values; it does not execute builds or provision cloud resources.

## Remediation expectations

Security reports should include the affected commit or deployment, impact, reproduction steps, and a suggested mitigation when available. Do not include live secrets in test fixtures. Rotate any secret that may have been exposed before investigating further.
