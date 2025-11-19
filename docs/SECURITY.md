# Security Guidelines

**Last Updated:** October 6, 2025

---

## Overview

This document describes security measures implemented in MobilePixel to protect against common vulnerabilities.

---

## Input Sanitization

All user inputs are sanitized using the `input-sanitizer` module to prevent:

- **Command injection** - Shell commands are escaped
- **Path traversal** - File paths are validated (no `../` patterns)
- **XSS/injection** - Special characters are removed or escaped
- **DoS** - Input length limits are enforced

### Usage

```typescript
import {
  sanitizeDescription,
  sanitizeFilePath,
  sanitizeDeviceId,
  sanitizePackageName,
  sanitizeCommandArg
} from './security/input-sanitizer';

// Sanitize element description
const desc = sanitizeDescription(userInput);

// Sanitize file path (prevents path traversal)
const path = sanitizeFilePath(userFilePath);

// Sanitize device ID (alphanumeric only)
const deviceId = sanitizeDeviceId(userDeviceId);

// Sanitize command arguments (escapes shell chars)
const arg = sanitizeCommandArg(userArg);
```

### Validation Rules

| Input Type | Allowed Characters | Max Length | Notes |
|------------|-------------------|------------|-------|
| Description | Unicode, alphanumeric, spaces | 1000 | Removes control chars |
| File Path | Alphanumeric, `/`, `\`, `.`, `-`, `_` | 500 | No `../` patterns |
| Device ID | Alphanumeric, `.`, `:`, `-`, `_` | 100 | Device identifiers |
| Package Name | Lowercase, alphanumeric, `.`, `_` | 200 | Must contain `.` |
| Command Arg | Any (escaped) | 1000 | Shell chars escaped |
| URL | Valid URL format | N/A | http/https/ws/wss only |

---

## Credential Management

### Environment Variables (Recommended)

**Never hardcode credentials in source code!** Use environment variables:

```bash
# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Example `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
CLAUDE_API_KEY=sk-ant-your-key-here
GITHUB_TOKEN=ghp_your-token
NPM_AUTH_TOKEN=npm_your-token
```

**Important:** Add `.env` to `.gitignore` to prevent committing!

### Using Credential Manager

```typescript
import { getCredentialManager } from './security/credential-manager';

const credManager = getCredentialManager();

// Get optional credential
const apiKey = credManager.get('openaiApiKey');

// Get required credential (throws if not set)
const token = credManager.getRequired('githubToken');

// Check if credential exists
if (credManager.has('claudeApiKey')) {
  // Use Claude API
}

// Get credentials for specific service
const adbCreds = credManager.getForService('adb');
```

### Masking Sensitive Data

Always mask credentials in logs:

```typescript
import { CredentialManager, maskSensitiveData } from './security/credential-manager';

const apiKey = "sk-abc123xyz789";

// Mask for logging
console.log("API Key:", CredentialManager.mask(apiKey));
// Output: API Key: sk-a****z789

// Mask entire text
const text = "Using API key sk-abc123xyz789 to connect";
console.log(maskSensitiveData(text));
// Output: Using API key sk-a****z789 to connect
```

---

## CI/CD Security

### GitHub Secrets

Store sensitive credentials in GitHub Secrets (Settings → Secrets and variables → Actions):

- `NPM_AUTH_TOKEN` - For publishing to NPM
- `GITHUB_TOKEN` - For creating releases (auto-provided)
- `CODECOV_TOKEN` - For coverage reports (optional)

### Secret Scanning

GitHub automatically scans for accidentally committed secrets. If detected:

1. **Revoke** the exposed credential immediately
2. **Generate** a new credential
3. **Update** GitHub Secrets and local `.env`

---

## Best Practices

### DO

- Use environment variables for credentials
- Sanitize all user inputs before use
- Mask credentials in logs and errors
- Add `.env` to `.gitignore`
- Rotate credentials regularly
- Use GitHub Secrets for CI/CD
- Validate input types and ranges
- Limit input lengths (prevent DoS)

### DON'T

- Hardcode credentials in source code
- Commit `.env` files to git
- Log full API keys or passwords
- Share credentials via chat/email
- Use production credentials in tests
- Skip input validation
- Trust user input without sanitization

---

## Security Checklist

Before deploying:

- [ ] All credentials stored in environment variables
- [ ] `.env` added to `.gitignore`
- [ ] All user inputs sanitized
- [ ] Credentials masked in logs
- [ ] GitHub Secrets configured for CI/CD
- [ ] Security audit passing (`npm audit`)
- [ ] Input validation tests passing
- [ ] No hardcoded secrets in code

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. **Email** security concerns to the maintainers
3. **Include** steps to reproduce and impact assessment
4. **Wait** for response before public disclosure

---

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Command Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)



