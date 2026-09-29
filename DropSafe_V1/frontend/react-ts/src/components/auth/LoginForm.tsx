import type { FormEvent } from "react";
import { useState } from "react";
import { login } from "../../services/authService";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const result = await login({
        email,
        password,
      });

      if (!result.success) {
        setError(result.message ?? "Login failed.");
        return;
      }

      // Temporary mock success flow.
      // Real authenticated navigation will be added
      // when the authentication API is available.
      console.log("Mock login successful");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__field">
        <label htmlFor="email">Email</label>

        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="password">Password</label>

        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        className="login-form__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <div
        className="login-form__error"
        role="alert"
        aria-live="polite"
      >
        {error}
      </div>
    </form>
  );
}

export default LoginForm;