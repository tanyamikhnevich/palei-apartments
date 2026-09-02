/**
 * The rules the login and password have to satisfy.
 *
 * Kept apart from the hashing so the admin panel can check a password as it is
 * typed without pulling PBKDF2 into the browser bundle.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;
export const LOGIN_MIN_LENGTH = 3;
export const LOGIN_MAX_LENGTH = 64;

export type PasswordProblem = 'too-short' | 'too-long' | 'no-letter' | 'no-digit';

/**
 * A length and a little variety — not a thicket of rules that pushes people
 * towards `Password1!`.
 */
export function checkPasswordStrength(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'too-short';
  if (password.length > PASSWORD_MAX_LENGTH) return 'too-long';
  if (!/\p{L}/u.test(password)) return 'no-letter';
  if (!/\d/u.test(password)) return 'no-digit';
  return null;
}

export function passwordProblemMessage(problem: PasswordProblem): string {
  switch (problem) {
    case 'too-short':
      return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    case 'too-long':
      return `Keep it under ${PASSWORD_MAX_LENGTH} characters.`;
    case 'no-letter':
      return 'Include at least one letter.';
    case 'no-digit':
      return 'Include at least one digit.';
  }
}

export function normaliseLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function loginIsWellFormed(login: string): boolean {
  const value = normaliseLogin(login);
  return value.length >= LOGIN_MIN_LENGTH && value.length <= LOGIN_MAX_LENGTH;
}
