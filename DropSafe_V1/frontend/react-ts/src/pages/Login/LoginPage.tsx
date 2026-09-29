import LoginForm from "../../components/auth/LoginForm";

function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__header">
          <h1>DropSafe</h1>
          <h2>Welcome Back</h2>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}

export default LoginPage;