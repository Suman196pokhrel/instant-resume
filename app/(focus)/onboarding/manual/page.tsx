// Full-screen wizard with its own top bar and progress (SPEC §14.1). Arrives with TASK-7.
export default function Page() {
  return (
    <main className="mx-auto max-w-[760px] p-7">
      <h1>Contact details</h1>
      <p className="mt-2 text-muted-foreground">The manual onboarding wizard arrives with TASK-7.</p>
    </main>
  );
}
