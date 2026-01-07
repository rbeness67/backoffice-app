export default function Home() {
  const token = localStorage.getItem("token");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Home</h1>
      <p className="text-muted-foreground">
        Token présent: {token ? "✅ oui" : "❌ non"}
      </p>
    </div>
  );
}
