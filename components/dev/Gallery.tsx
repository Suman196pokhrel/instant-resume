"use client";

import { addTransitionType, startTransition, useState, ViewTransition } from "react";
import { ArrowDownUp, FileText, LayoutList, Palette, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogClose, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Chip, Count, Pill } from "@/components/ui/pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4">{title}</h2>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </section>
  );
}

export function Gallery() {
  const [step, setStep] = useState(1);
  const [sort, setSort] = useState("newest");
  const go = (delta: 1 | -1) =>
    startTransition(() => {
      addTransitionType(delta > 0 ? "forward" : "back");
      setStep((s) => s + delta);
    });

  return (
    <>
      <Section title="Tooltips">
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip A</TooltipTrigger>
          <TooltipContent title="Title">Tooltip A text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip B</TooltipTrigger>
          <TooltipContent>Tooltip B text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip below</TooltipTrigger>
          <TooltipContent side="bottom">Placed below</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger-ghost">Danger</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="link">Link</Button>
        <Button size="sm">Small</Button>
        <Button size="sm" variant="ghost">Small ghost</Button>
        <Button size="icon" aria-label="Undo">
          <Undo2 />
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Toasts">
        <Button variant="ghost" onClick={() => toast("Saved to knowledge base")}>
          Show toast
        </Button>
        <Button variant="ghost" onClick={() => toast("Application deleted", { action: { label: "Undo", onClick: () => toast("Restored") } })}>
          Show toast with action
        </Button>
        <Button variant="ghost" onClick={() => toast("Something went wrong", { kind: "error" })}>
          Show error toast
        </Button>
      </Section>

      <Section title="Transitions">
        <div className="w-full">
          <ViewTransition
            key={step}
            enter={{ forward: "step-in-forward", back: "step-in-back", default: "none" }}
            exit={{ forward: "step-out-forward", back: "step-out-back", default: "none" }}
            default="none"
          >
            <div className="mb-4 rounded-md border border-line bg-surface-2 p-4">
              <h3>Step {step}</h3>
              <p className="mt-1 text-muted-foreground">Next slides left, back slides right. The page around it stays put.</p>
            </div>
          </ViewTransition>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={step === 1} onClick={() => go(-1)}>
              Previous step
            </Button>
            <Button disabled={step === 3} onClick={() => go(1)}>
              Next step
            </Button>
          </div>
        </div>
      </Section>
      <Section title="Segmented and tabs">
        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-wrap gap-5">
            <Segmented aria-label="Paper size" defaultValue="a4" options={[{ value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} />
            <Segmented
              aria-label="Page budget"
              defaultValue="1"
              options={[{ value: "1", label: "1 page" }, { value: "2", label: "2 pages" }, { value: "3", label: "3 pages" }]}
            />
          </div>
          <Tabs defaultValue="resume">
            <TabsList aria-label="Document">
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover">Cover letter</TabsTrigger>
            </TabsList>
            <TabsContent value="resume" className="text-ink-2">Resume preview</TabsContent>
            <TabsContent value="cover" className="text-ink-2">Cover letter preview</TabsContent>
          </Tabs>
          <Tabs defaultValue="content" className="w-[372px] rounded-lg border border-line">
            <TabsList variant="underline" aria-label="Inspector">
              <TabsTrigger value="content"><FileText />Content</TabsTrigger>
              <TabsTrigger value="structure"><LayoutList />Structure</TabsTrigger>
              <TabsTrigger value="design"><Palette />Design</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="px-4 pb-4 text-ink-2">Edit bullets here.</TabsContent>
            <TabsContent value="structure" className="px-4 pb-4 text-ink-2">Reorder sections here.</TabsContent>
            <TabsContent value="design" className="px-4 pb-4 text-ink-2">Adjust the theme here.</TabsContent>
          </Tabs>
        </div>
      </Section>

      <Section title="Toggles">
        <div className="flex items-center gap-3">
          <span id="sw-cover">Cover letter</span>
          <Switch aria-labelledby="sw-cover" />
        </div>
        <label className="ml-6 flex items-center gap-2.5">
          <Checkbox />
          Include referees
        </label>
      </Section>

      <Section title="Slider">
        <div className="w-[300px]">
          <Slider label="Font size" defaultValue={10.5} min={9} max={12} step={0.5} unit="pt" />
        </div>
      </Section>

      <Section title="Disclosure">
        <Collapsible className="w-full">
          <CollapsibleTrigger>Job description</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-ink-2">Senior product designer, Sydney. Hybrid, full time.</CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" />}>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete application</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>This removes the resume, cover letter and history for this application.</DialogDescription>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="danger-ghost" />}>Delete</DialogClose>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <DialogClose render={<Button />}>Keep</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" />}>Open wide dialog</DialogTrigger>
          <DialogContent size="wide">
            <DialogHeader>
              <DialogTitle>Compare revisions</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>The wide variant holds side-by-side content.</DialogDescription>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Menu">
        <div className="flex w-full justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <ArrowDownUp />
              Sort by
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>
      <Section title="Form fields">
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3.5 max-[900px]:grid-cols-1">
          <Field id="g-title" label="Job title">
            <Input placeholder="Senior Software Engineer" />
          </Field>
          <Field id="g-loc" label="Location" optional>
            <Input placeholder="Sydney NSW" />
          </Field>
          <Field id="g-email" label="Email" error="Enter an email like name@example.com">
            <Input type="email" defaultValue="nope" />
          </Field>
          <Field id="g-rights" label="Work rights">
            <NativeSelect defaultValue="">
              <option value="">Choose…</option>
              <option>Australian citizen</option>
            </NativeSelect>
          </Field>
          <Field id="g-notes" label="Details" className="col-span-full">
            <Textarea rows={3} />
          </Field>
        </div>
      </Section>

      <Section title="Pills, chips and counts">
        <Pill>Default</Pill>
        <Pill variant="ok">In use</Pill>
        <Pill variant="warn">Gap</Pill>
        <Pill variant="metric">2M quotes a month</Pill>
        <Chip>React</Chip>
        <Count>3</Count>
      </Section>

      <Section title="Callouts">
        <Callout className="w-full">
          <FileText />
          <div>Default: a note with an icon.</div>
        </Callout>
        <Callout variant="warn" className="w-full">
          <FileText />
          <div>Warn: something to check.</div>
        </Callout>
        <Callout variant="error" className="w-full">
          <FileText />
          <div>Error: something went wrong.</div>
        </Callout>
      </Section>

      <Section title="Empty state">
        <EmptyState title="No applications yet" icon={<FileText />} action={<Button>New application</Button>} className="w-full">
          An application holds the job description, your tailored resume and your cover letter for one job.
        </EmptyState>
        <EmptyState size="sm" title="No volunteer work yet" className="w-full">
          Add one and it becomes available to every application.
        </EmptyState>
      </Section>
      <div aria-hidden className="h-[120vh]" />
    </>
  );
}
