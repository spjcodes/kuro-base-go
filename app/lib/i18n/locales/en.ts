/**
 * The reference catalog. Its shape is the contract the other two are checked
 * against (see zh.ts), so a key added here is a compile error until it exists in
 * every language - the alternative, silently falling back to English, is only
 * visible to whoever happens to trigger that string in that language.
 *
 * Deliberately a plain object literal rather than `as const`: the other catalogs
 * are typed `typeof en`, and literal types would demand identical *values*
 * instead of just the same keys.
 *
 * Groups are the namespaces the strings belong to: `t('auth.signIn')`.
 */
export const en = {
  common: {
    back: 'Back',
    goBack: 'Go Back',
    retry: 'Try Again',
    error: 'Error',
    errorTitle: 'Something went wrong',
    errorMessage: 'We encountered an unexpected error. Please try again or go back.',
    success: 'Success',
    loading: 'Loading...',
    notFoundTitle: 'Oops!',
    notFoundMessage: "This screen doesn't exist.",
    goHome: 'Go to home screen!',
    ok: 'OK',
    somethingWentWrong: 'Something went wrong',
  },
  auth: {
    signIn: 'Sign In',
    signInTitle: 'Welcome Back',
    signInSubtitle: 'Sign in to continue',
    signInPending: 'Signing in...',
    signUp: 'Sign Up',
    signUpTitle: 'Create Account',
    signUpSubtitle: 'Sign up to get started',
    signUpPending: 'Creating Account...',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    createPasswordPlaceholder: 'Create a password',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm your password',
    forgotPassword: 'Forgot Password?',
    forgotPasswordSubtitle: "Enter your email and we'll send you a reset link",
    resetPasswordTitle: 'Reset Password',
    sendResetLink: 'Send Reset Link',
    sending: 'Sending...',
    rememberPassword: 'Remember your password?',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    checkYourEmail: 'Check Your Email',
    resetLinkSent: "We've sent a password reset link to {{email}}",
    backToSignIn: 'Back to Sign In',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
  },
  profile: {
    title: 'Profile',
    defaultUserName: 'User',
    noEmail: 'No email on file',
    logOut: 'Log Out',
    darkMode: 'Dark Mode',
    darkModeEnabled: 'Currently enabled',
    darkModeDisabled: 'Currently disabled',
    language: 'Language',
    languageSystem: 'System default',
  },
  home: {
    title: 'Home',
    subtitle: 'A full-stack starter: Expo + Go',
    welcome: 'Welcome back, {{name}}',
    statusTitle: 'API connection',
    statusChecking: 'Checking...',
    statusOk: 'Connected to the API',
    statusFailed: 'Cannot reach the API',
    statusHint: 'A live GET /ping through the generated client.',
    includedTitle: 'Included in this starter',
    includedAuth: 'Email/password auth with rotating refresh tokens',
    includedI18n: 'Three languages, remembered per device',
    includedTheme: 'Light and dark themes, applied before the first frame',
    includedErrors: 'One toast for every API failure',
  },
  tabs: {
    home: 'Home',
    profile: 'Profile',
  },
  errors: {
    forbidden: 'You are not allowed to do that.',
    sessionExpired: 'Your session expired. Please sign in again.',
    network: 'Cannot reach the server. Check your connection and try again.',
    server: 'The server is having trouble. Please try again shortly.',
    generic: 'Something went wrong. Please try again.',
  },
};
