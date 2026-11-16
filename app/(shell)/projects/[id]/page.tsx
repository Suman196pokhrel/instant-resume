// The Workspace has its own 54px bar instead of the top bar (SPEC §11.4). Arrives with TASK-15.
export default function Page() {
  return (
    <main className="p-7">
      <h1>Workspace</h1>
      <p className="mt-2 text-muted-foreground">Job panel, preview and inspector arrive with TASK-15.</p>
    </main>
  );
}
