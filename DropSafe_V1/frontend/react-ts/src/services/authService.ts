import type { AuthResult, LoginCredentials } from "../types/auth";

export async function login(
  credentials: LoginCredentials
): Promise<AuthResult> {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  if (!credentials.email || !credentials.password) {
    return {
      success: false,
      message: "Email and password are required.",
    };
  }

  return {
    success: true,
  };
}