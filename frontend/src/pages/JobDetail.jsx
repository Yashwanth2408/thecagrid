import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  useEffect(() => { api.get(`/jobs/${id}`).then((r) => setJob(r.data)).catch(() => toast.error("Job not found")); }, [id]);
  if (!job) return <AppShell breadcrumb="APP / JOBS"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  return (
    <AppShell breadcrumb={`APP / JOBS / ${job.job_id.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[900px] mx-auto px-6 lg:px-10 py-16" data-testid="job-detail-page">
        <Link to="/jobs" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition">← ALL JOBS</Link>
        <header className="mt-6 mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {job.type.toUpperCase().replace("_", " ")} ]</span>
            {job.is_sponsored && <span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#B4FF39] border border-[#B4FF39]/30 px-2 py-0.5">SPONSORED</span>}
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{job.company} · {job.location}</span>
          </div>
          <h1 className="font-display italic leading-[1.02] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(40px, 7vw, 80px)" }}>{job.title}</h1>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-1">SALARY</div><div className="font-display italic text-[24px] text-white">₹{Math.round(job.salary_min / 100000)}-{Math.round(job.salary_max / 100000)}L</div></div>
            <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-1">EXPERIENCE</div><div className="font-display italic text-[24px] text-white">{job.experience_min}-{job.experience_max} yrs</div></div>
            <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-1">DOMAIN</div><div className="font-body text-[14px] text-white/90">{(job.domain || []).join(" · ")}</div></div>
          </div>
        </header>
        <article className="border-t border-white/[0.06] pt-8">
          <div className="font-body text-[16px] text-[#E0E0E5] leading-relaxed whitespace-pre-wrap">{job.description_markdown}</div>
        </article>
        <div className="mt-10">
          {job.apply_url ? (
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" data-testid="job-apply-external" className="inline-block px-6 py-3 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">[ APPLY EXTERNALLY → ]</a>
          ) : (
            <div className="inline-block px-6 py-3 font-mono uppercase tracking-[0.22em] text-[11px] border border-white/[0.08] text-white/60">CONTACT VIA THE GRID · APPLY FLOW COMING SOON</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
