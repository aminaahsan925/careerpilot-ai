import { Award, CheckCircle2, Printer, ShieldCheck } from "lucide-react";

import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { Button } from "@/components/ui/button";

type CompletionCertificateProps = {
  studentName: string;
  targetRole: string;
  targetCompany?: string | null;
  completedPaths: number;
  totalPaths: number;
  completedDays: number;
  totalDays: number;
  unlocked: boolean;
};

function certificateCode(studentName: string, targetRole: string) {
  const source = `${studentName}:${targetRole}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `CP-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

export function CompletionCertificate({
  studentName,
  targetRole,
  targetCompany,
  completedPaths,
  totalPaths,
  completedDays,
  totalDays,
  unlocked,
}: CompletionCertificateProps) {
  const code = certificateCode(studentName, targetRole);

  return (
    <SpotlightCard className="card-surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-cp-paper/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-lime/20 text-cp-paper">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[14.5px] font-bold text-cp-paper">CareerPilot Certificate</h3>
            <p className="mt-0.5 text-[11.5px] text-cp-paper/60">
              AI-generated proof of roadmap completion
            </p>
          </div>
        </div>
        {unlocked && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-[11px]"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Save PDF
          </Button>
        )}
      </div>

      <div className="p-5">
        {unlocked ? (
          <div className="rounded-2xl border-2 border-cp-lime/60 bg-cp-ink p-5 text-center text-cp-paper">
            <ShieldCheck className="mx-auto h-7 w-7 text-cp-lime" />
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cp-lime">
              Verified learning achievement
            </p>
            <p className="font-display mt-2 text-lg font-bold">{studentName}</p>
            <p className="mt-1 text-[12px] text-cp-paper/80">
              completed the CareerPilot path for <span className="font-semibold">{targetRole}</span>
              {targetCompany ? ` at ${targetCompany}` : ""}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-[11px]">
              <div className="rounded-xl bg-white/10 p-2.5">
                <p className="text-cp-paper/70">Learning paths</p>
                <p className="mt-0.5 font-bold">
                  {completedPaths}/{totalPaths}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <p className="text-cp-paper/70">Practice days</p>
                <p className="mt-0.5 font-bold">
                  {completedDays}/{totalDays}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-semibold tracking-wider text-cp-paper/70">
              Credential ID: {code}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-cp-paper/65">
              Finish every learning path and its assessment gates to unlock a recruiter-ready
              completion certificate.
            </p>
            <div className="space-y-2 text-[11.5px] text-cp-paper/75">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cp-lime2" />
                <span>
                  {completedPaths}/{totalPaths || "?"} learning paths complete
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cp-lime2" />
                <span>
                  {completedDays}/{totalDays || "?"} practice days complete
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
