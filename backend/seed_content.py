"""Phase 4 content hub seed — 20 editorial posts.

Content is intentionally substantive (700-1200 words each) and specific to the
Indian CA journey. Hero images are inline SVG gradients served by the frontend
via a `hero_gradient` seed field; the frontend renders them procedurally.
"""
from datetime import datetime, timedelta, timezone


def _days_ago(n):
    return datetime.now(timezone.utc) - timedelta(days=n)


def _read_min(md: str) -> int:
    # ~200 wpm average adult reading; round up to nearest int
    words = len(md.split())
    return max(3, round(words / 200))


def _post(slug, title, excerpt, body_md, author_name, author_role, tags, levels, days, hero_grad):
    return {
        "post_id": f"post_{slug.replace('-', '')[:16]}",
        "slug": slug,
        "title": title,
        "excerpt": excerpt,
        "body_markdown": body_md,
        "hero_gradient": hero_grad,  # tuple-like list of 3 hex colors
        "author_name": author_name,
        "author_role": author_role,
        "tags": tags,
        "level_filter": levels,
        "published_at": _days_ago(days),
        "read_minutes": _read_min(body_md),
    }


# ---------- Editorial content ----------
CONTENT_POSTS = [
    _post(
        slug="revision-framework-air-12",
        title="The revision framework that got me AIR 12",
        excerpt="A rank holder's actual revision system — the folder structure, the daily loops, the anti-procrastination rules. No motivational quotes.",
        body_md=(
            "## The three-pile system\n\n"
            "Before I cracked CA Final in the November 2024 attempt at AIR 12, I "
            "tried every revision framework the internet had to offer. Pomodoro. "
            "The Cornell method. Active recall via Anki. None of them survived contact "
            "with 850 pages of Direct Tax.\n\n"
            "What eventually worked was embarrassingly simple: I split every subject "
            "into **three piles**.\n\n"
            "1. **Blueprint pile** — this is the theory backbone. For DT, it's the "
            "  Sec 45–50 capital gains framework; for FR, it's the Ind AS 115 five-step "
            "  model. Whatever gives you 60% of the marks. I revised the blueprint pile "
            "  weekly, aggressively.\n"
            "2. **Practice pile** — worked examples, past-year papers, ICAI RTPs. I did "
            "  these in timed slots, no notes open, and marked which ones I got wrong.\n"
            "3. **Weak pile** — anything I got wrong twice. This pile got its own hour "
            "  every single day. If it fell out of the weak pile after three clean runs, "
            "  it graduated back to the blueprint pile.\n\n"
            "## The 5-3-1 daily loop\n\n"
            "Every day, I ran the same loop:\n\n"
            "- **5 hours** on a new topic (in the blueprint pile, working through the "
            "  chapter + one practice set)\n"
            "- **3 hours** on the weak pile, no exceptions, even on Sundays\n"
            "- **1 hour** on mock-style questions from a different subject\n\n"
            "The cross-subject hour is the piece nobody talks about. When you review "
            "Auditing at 10pm after a full day of Costing, your brain is forced to "
            "code-switch — and code-switching is exactly what the exam demands. Paper "
            "2 (Costing) and Paper 3 (FM) test different mental models; if you can't "
            "flip modes in 30 seconds, you leak marks.\n\n"
            "## What I stopped doing\n\n"
            "I stopped making pretty notes. I stopped re-reading modules front-to-back. "
            "I stopped watching lecture videos at 1.75x speed pretending it was revision. "
            "I stopped keeping a leaderboard against my batchmates.\n\n"
            "The last one was the hardest. Comparison eats attention. Whatever attention "
            "you spend thinking about someone else's Anki deck is attention you don't "
            "have for the ROI on the ITR-6 return you're trying to memorise.\n\n"
            "## The anti-procrastination rule\n\n"
            "Two months before the attempt I made one rule: if I sit down for a session "
            "and don't start within 3 minutes, I stand up, walk out of the room, and do "
            "20 pushups. Then I come back and start.\n\n"
            "It sounds silly. It works. The friction of the pushups is smaller than the "
            "friction of starting a taxation chapter cold, so my brain picks the smaller "
            "cost every time. And by the time I'm back in the chair I'm mildly out of "
            "breath and mentally reset.\n\n"
            "## What the last month looked like\n\n"
            "Week -4: full syllabus revision using the three-pile system.\n"
            "Week -3: mocks Monday-Wednesday, blueprint pile Thursday-Saturday, weak pile Sunday.\n"
            "Week -2: two full-mock sessions per week (7 papers over 2 days each), evaluated by a mentor.\n"
            "Week -1: only the weak pile. Nothing new. Sleep 8 hours minimum. Zero social media.\n\n"
            "## The single most useful habit\n\n"
            "A one-line **exam-log** at the end of every day: 'What was the hardest question I saw today, and why?' \n\n"
            "Three months of these entries gave me a pattern file — I could tell you the "
            "shape of my own weaknesses more precisely than my mentor could. On D-day, "
            "when Paper 4 asked a tricky question on Section 47 transfers, I had already "
            "written about a version of it three weeks earlier. I didn't panic; I opened "
            "the mental file and wrote the answer.\n\n"
            "That's what a good revision framework buys you. Not more knowledge. Faster "
            "retrieval under pressure."
        ),
        author_name="Rhea Menon",
        author_role="CA · AIR 12, Nov 2024",
        tags=["Strategy", "Revision", "Final"],
        levels=["Intermediate", "Final"],
        days=4,
        hero_grad=["#7C3AED", "#F59E0B", "#0A0A0C"],
    ),
    _post(
        slug="what-big4-audit-actually-looks-like",
        title="What Big 4 audit actually looks like",
        excerpt="Twelve months in, a Big 4 first-year associate breaks down her Tuesdays, the client calls, the working papers, and the parts nobody tells you about in campus placements.",
        body_md=(
            "## The first year is not what the brochures say\n\n"
            "When I signed my offer letter with a Big 4 in April 2024, the campus placement "
            "recruiter told me I'd be exposed to 'complex, cutting-edge assurance work "
            "across marquee clients'. That's technically true. It's also technically "
            "true that a hospital exposes you to complex medicine.\n\n"
            "The reality of first-year audit associate work is more granular, more "
            "mechanical, and — this is the part that surprised me most — more social than "
            "the brochures suggest.\n\n"
            "## A typical Tuesday, statutory audit busy season\n\n"
            "**7:30am** — I'm at the client. Their finance team is helpful but tired; "
            "they've been closing their books for two weeks.\n\n"
            "**8:00-11:00am** — Vouching and tracing. I have a sample of 40 revenue "
            "transactions from December. I'm reconciling them to the sales ledger, the "
            "GL, the invoice PDFs, the delivery challans, and the customer POs. Every "
            "mismatch becomes an audit query I email to the client's AR lead. Half the "
            "queries turn out to be timing differences; the other half are genuine "
            "recognition issues that will end up in the audit memo.\n\n"
            "**11:30am** — Team huddle. My senior asks what red flags I've found. I "
            "mention three. He tells me two are noise and one is a real cut-off issue "
            "that we need to walk to the CFO by end of day.\n\n"
            "**1:00pm** — Lunch. Real lunch, at the client cafeteria, with the audit "
            "team. This part surprised me. Big 4 audit is not the isolated, spreadsheet-"
            "in-a-corner job you see in movies. You spend 60% of your waking hours with "
            "the same 5-7 people for months. If you don't like them, that's the problem, "
            "not the technicals.\n\n"
            "**2:00-6:00pm** — I'm on the fixed assets section. Roll-forward from last "
            "year's closing balance. Additions vouched to invoices. Disposals traced to "
            "board minutes. Depreciation recalculated in my working paper. I spot a "
            "component-accounting issue where the client hasn't split a factory building "
            "into HVAC and civil components — that becomes a real Ind AS 16 finding.\n\n"
            "**6:30pm** — I document the finding in our audit tool. Screenshot of the "
            "GL. Cross-reference to the WP. Extract of the AS/Ind AS I'm relying on. "
            "Preliminary quantification. Then I upload to the review queue for my senior.\n\n"
            "**8:00pm** — Debrief with the senior. He edits my memo — cuts my adjectives, "
            "adds a materiality quantification, tightens the recommendation. I learn "
            "more from these 20 minutes than from any manual.\n\n"
            "**9:30pm** — Home. Or, this being year one, the office cafeteria for one "
            "more hour on a different client's tax pack.\n\n"
            "## The three things nobody warned me about\n\n"
            "**One.** The person you learn most from is not your manager, not your partner. "
            "It's the senior associate one year ahead of you. They still remember what "
            "confused them last year. Ask them everything.\n\n"
            "**Two.** Communication is 40% of the job. Every finding is only as good as "
            "the memo, and every memo is only as good as the conversation you can have "
            "with the client CFO about it. Practise writing tight two-paragraph summaries. "
            "Practise saying 'we noticed…' in a neutral, non-accusatory tone.\n\n"
            "**Three.** Statutory audit is 60% of the year. Tax audits, transfer pricing, "
            "internal financial control testing, and specific process reviews eat the "
            "other 40%. If you only enjoy statutory audit, you'll dread the other 40%. "
            "The associates who love the variety are the ones who thrive.\n\n"
            "## Should you sign up?\n\n"
            "If you like the granular puzzle-solving of financial reporting, the "
            "adversarial-but-friendly dance with client teams, and the compounding "
            "network of a Big 4 alumni base — yes.\n\n"
            "If you signed up because it 'looked good' on your resume — you'll probably "
            "leave in eighteen months. And that's fine, too."
        ),
        author_name="Priya Iyer",
        author_role="Associate · Big 4 Assurance (Mumbai)",
        tags=["Career", "Big 4", "Audit"],
        levels=["Articleship", "Qualified CA", "Final"],
        days=9,
        hero_grad=["#10B981", "#0A0A0C", "#7C3AED"],
    ),
    _post(
        slug="ind-as-115-in-under-2000-words",
        title="Ind AS 115 in under 2,000 words",
        excerpt="The five-step model, the four biggest exam traps, and the exact working-paper format that examiners reward.",
        body_md=(
            "## Why this standard matters\n\n"
            "Ind AS 115 replaced the old AS 9 / AS 7 duo and it's the single most "
            "tested revenue standard in both Inter and Final. The reason: it's a "
            "framework, not a rulebook, which means examiners can build questions "
            "around any industry and expect you to apply the five-step model.\n\n"
            "## Step 1 — Identify the contract\n\n"
            "A contract exists if it's enforceable, has commercial substance, has "
            "identified parties, has identified payment terms, and the collectability "
            "of consideration is probable. If any of these is missing, you don't have "
            "a contract yet. Questions frequently plant a soft-commit LOI or MOU that "
            "students mistakenly treat as a contract.\n\n"
            "**Trap #1:** Contract combination. Multiple contracts entered at or near "
            "the same time with the same customer are combined if they're negotiated "
            "as a package OR the goods/services in one are dependent on the other. "
            "Watch for the words 'entered into on the same day'.\n\n"
            "## Step 2 — Identify performance obligations\n\n"
            "A PO is a promise to transfer either (a) a distinct good/service or (b) "
            "a series of distinct goods/services that are substantially the same and "
            "have the same pattern of transfer.\n\n"
            "Distinct = the customer can benefit from it on its own OR with resources "
            "readily available, AND it is separately identifiable from other promises "
            "in the contract (the 'separately identifiable' test is where students lose "
            "marks — the good/service must not be an input to a combined output).\n\n"
            "**Trap #2:** Bundled contracts. A SaaS + implementation deal is a classic. "
            "If implementation is highly customised and only usable with the SaaS, "
            "they're one PO. If implementation is off-the-shelf, two POs.\n\n"
            "## Step 3 — Determine the transaction price\n\n"
            "Include fixed consideration, variable consideration (using the expected-"
            "value or most-likely-amount method — whichever better predicts), the "
            "financing component if payment is deferred > 1 year, non-cash "
            "consideration at fair value, and consideration payable to the customer as "
            "a reduction of TP unless the customer transfers a distinct good/service "
            "in return.\n\n"
            "**Trap #3:** Constraint on variable consideration. Include variable "
            "consideration only to the extent it's highly probable a significant "
            "reversal won't occur. If the question mentions 'volume rebate' or "
            "'contingent milestone', apply the constraint.\n\n"
            "## Step 4 — Allocate transaction price\n\n"
            "Allocate based on relative standalone selling prices. If a standalone "
            "selling price isn't observable, estimate using: adjusted market assessment, "
            "expected cost plus margin, or residual approach (only in limited "
            "circumstances). Discounts get allocated proportionally unless there's "
            "observable evidence the discount relates to specific POs.\n\n"
            "**Trap #4:** Residual approach applies **only** if the standalone selling "
            "price is highly variable or uncertain (like a licensing arrangement where "
            "you sell to different customers at different prices).\n\n"
            "## Step 5 — Recognise revenue\n\n"
            "**Over time** if any one of these three criteria is met:\n"
            "- Customer simultaneously receives and consumes benefits (e.g., routine "
            "  cleaning services)\n"
            "- The entity creates or enhances an asset the customer controls\n"
            "- Asset has no alternative use to the entity AND the entity has an "
            "  enforceable right to payment for performance to date\n\n"
            "Otherwise: point in time, when control transfers (usually delivery / "
            "acceptance / risks and rewards transfer).\n\n"
            "## The working-paper format that scores\n\n"
            "In the exam, examiners reward a structured layout. My template:\n\n"
            "1. Facts summary (2-3 lines)\n"
            "2. Issue identified (1 line)\n"
            "3. Standard analysis — step-by-step through the 5-step model\n"
            "4. Conclusion (2 lines)\n"
            "5. Journal entries (if asked)\n\n"
            "Follow that structure and you will not miss marks for presentation."
        ),
        author_name="Aditya Rao",
        author_role="Partner · Financial Reporting Advisory",
        tags=["Ind AS", "Advanced Accounts", "Final"],
        levels=["Intermediate", "Final"],
        days=13,
        hero_grad=["#7C3AED", "#0A0A0C", "#8B5CF6"],
    ),
    _post(
        slug="pomodoro-fails-for-numericals",
        title="Why 25/5 Pomodoro fails for numericals",
        excerpt="A rebuttal to the internet's favourite productivity system, plus the working-set-based method that actually holds up under Costing pressure.",
        body_md=(
            "## The problem with 25 minutes\n\n"
            "You'd be forgiven for thinking the Pomodoro Technique is objectively "
            "the best study system in existence. Twenty-five minutes of work, five "
            "minutes of rest, four cycles, and a long break. Simple. Universal. "
            "Ineffective for CA numericals.\n\n"
            "Here's the problem. Numerical problems in Costing, DT, and FM don't "
            "come in 25-minute units. A standard AFM portfolio question takes 32-40 "
            "minutes on a good day. A Direct Tax computation involving MAT + surcharge "
            "+ Chapter VI-A deductions eats an hour, easy. Stopping the timer in the "
            "middle of a working — halfway through a variance analysis — throws away "
            "20 minutes of context that took 20 minutes to load into your head.\n\n"
            "## What actually works: the working-set method\n\n"
            "I stole this from a friend who's a machine-learning engineer. His "
            "insight: your brain has a working set — the small collection of concepts "
            "you're actively juggling — and a much slower L2 cache. Loading concepts "
            "into the working set is expensive. Flushing it hurts.\n\n"
            "So instead of arbitrary 25-minute chunks, structure your study around "
            "**working-set boundaries**:\n\n"
            "- **Session unit** = one full problem or one full sub-topic within a "
            "  chapter, whichever completes a working-set cycle.\n"
            "- **Micro-break** = 3-5 minutes only at working-set boundaries, never "
            "  mid-problem.\n"
            "- **Macro-break** = 20 minutes after 3-4 completed working-set cycles.\n\n"
            "The rule: **never break the working set**. If you're partway through "
            "a computation, keep going even if 90 minutes have passed. Your L2 cache "
            "will punish you for context-switching mid-problem.\n\n"
            "## When Pomodoro does work\n\n"
            "Pomodoro is genuinely great for **theory subjects with self-contained "
            "sub-sections**. Auditing chapters, Company Law provisions, individual "
            "Ind AS narratives. These have natural 20-25 minute atomic units that fit "
            "neatly into the pomodoro rhythm. So don't throw the technique away — "
            "use it selectively.\n\n"
            "## What my calendar actually looks like on a Wednesday\n\n"
            "- 6:00-9:00am: DT numerical (one long working-set)\n"
            "- 9:00-9:20am: macro-break, breakfast\n"
            "- 9:20-11:20am: Ind AS 115 theory (four pomodoros)\n"
            "- 11:20am-12:00pm: DT problems from RTP (working-set method)\n"
            "- Lunch\n"
            "- 2:00-4:30pm: Costing variance analysis (one long working-set)\n"
            "- 4:30-5:00pm: break\n"
            "- 5:00-8:00pm: Auditing theory + one case study\n\n"
            "Total: ~10 focused hours. Notice the numericals get long uninterrupted "
            "runs; the theory sits in shorter pomodoros.\n\n"
            "## The one thing you must protect\n\n"
            "Sleep. Non-negotiable, 7-8 hours, dark room, no phone in bed. Every "
            "productivity technique in the world is a scam if you're chronically "
            "sleep-deprived. Your working-set capacity halves when you're tired, "
            "and no method fixes that."
        ),
        author_name="Karan Deshpande",
        author_role="CA · GST Practice Lead",
        tags=["Strategy", "Study Method"],
        levels=["Foundation", "Intermediate", "Final"],
        days=17,
        hero_grad=["#F59E0B", "#0A0A0C", "#B4FF39"],
    ),
    _post(
        slug="forensic-accounting-career-path",
        title="The forensic accounting career path",
        excerpt="Fraud investigations, expert-witness testimony, and why the demand is projected to double by 2030. A CA-Forensic explains the day-to-day.",
        body_md=(
            "## Not the CSI version\n\n"
            "Forensic accounting sounds glamorous — evidence, courtrooms, dramatic "
            "exposés. Actual forensic accounting is 80% pattern-matching across GL "
            "extracts, 15% interviews, and 5% high-stakes writeup. It's less "
            "'Numb3rs' and more 'endless-Excel-with-consequences'.\n\n"
            "That said, it's one of the most consistently interesting career "
            "specialisations available to a qualified CA in India, and demand is "
            "growing faster than supply.\n\n"
            "## What forensic engagements actually look like\n\n"
            "**Type 1 — Vendor Kickback Investigation.** A company suspects its "
            "procurement head is receiving kickbacks. We pull three years of AP data, "
            "run Benford's Law on invoice amounts, look for suspicious patterns "
            "(round-number invoices, sudden vendor volume spikes, invoice numbering "
            "gaps in a specific vendor). We interview procurement staff. We produce a "
            "report the client can use for internal action or FIR filing.\n\n"
            "**Type 2 — Financial Statement Fraud.** Something looks off in the "
            "audited numbers. We tear apart the revenue recognition, the receivables "
            "aging, the inventory counts. We look for round-tripping. We reconstruct "
            "GL entries and follow them back through the trial balance. This is the "
            "closest thing to 'audit on hard mode'.\n\n"
            "**Type 3 — Expert Witness Work.** For arbitration or litigation. You "
            "quantify the damages, defend your methodology in cross-examination, "
            "produce court-ready reports. Requires an entirely different writing style — "
            "everything must be defensible under adversarial questioning.\n\n"
            "## The skills that separate a good forensic from a mediocre one\n\n"
            "**Data literacy.** SQL and Python are non-negotiable. Excel gets you "
            "through the door; SQL gets you seniority. Being able to write a query "
            "that identifies all vendors with more than 3 invoices ending in exactly "
            ".00 in a month is a table-stakes skill.\n\n"
            "**Interviewing.** Forensic work involves talking to real humans who may "
            "be lying to you. You need to learn structured interviewing techniques — "
            "open questions first, silence to draw out fillers, deliberate "
            "'establish-baseline' small talk.\n\n"
            "**Writing under pressure.** Every report becomes evidence. Every "
            "sentence you write can be used in cross-examination. This trains a very "
            "particular kind of tight, defensible prose.\n\n"
            "## How to break in\n\n"
            "Post-qualification, target Big 4 forensic teams (Deloitte, KPMG, EY, PwC "
            "all have dedicated practices in India) or specialist firms like "
            "Kroll India, Nangia Andersen, or Riskpro. Boutique fraud shops also "
            "hire — sometimes at higher effective compensation than the Big 4.\n\n"
            "Certifications that add real value: CFE (Certified Fraud Examiner) is "
            "the gold standard. FAFD from ICAI is respected. Data-analytics "
            "certifications are increasingly asked for.\n\n"
            "## The uncomfortable part\n\n"
            "You will occasionally investigate someone senior. You will produce "
            "findings that get people fired, arrested, or worse. You will testify. "
            "This career requires a specific personality — someone who is comfortable "
            "with confrontation and drawn to hard truths. If you find that draining, "
            "there are calmer specialisations.\n\n"
            "## The upside\n\n"
            "The work is genuinely interesting every single day. You solve puzzles. "
            "You expose real wrongdoing. Compensation is above the Big 4 audit "
            "average. And demand is going up-and-to-the-right forever — every "
            "corporate governance failure, every regulatory tightening, every "
            "sanctions-compliance requirement fuels the pipeline.\n\n"
            "For the right personality, it's the most rewarding thing a CA can do."
        ),
        author_name="Aashna Kapoor",
        author_role="CA · Forensic Investigator, CFE",
        tags=["Career", "Forensic", "Specialisation"],
        levels=["Final", "Qualified CA"],
        days=22,
        hero_grad=["#0A0A0C", "#7C3AED", "#F59E0B"],
    ),
    # ---- 15 more posts (shorter ~700-800 words each) ----
    _post(
        slug="foundation-first-3-months",
        title="Foundation: your first three months",
        excerpt="Where to start, what to skip, and the 3 chapters that quietly decide your Foundation attempt.",
        body_md=(
            "## The first month\n\n"
            "Start with Paper 1 (Accounting) — the earlier you build fluency with "
            "journal entries and trial-balance mechanics, the easier every other "
            "subject becomes. Do NOT jump into Business Laws first because 'it's "
            "easy'. It's short, not easy, and starting there gives you no compounding.\n\n"
            "Spend the first month on chapters 1–5 of Paper 1, plus the first half "
            "of Paper 3 (Quant). Ratio, indices, logs — this is where confidence "
            "gets built or destroyed.\n\n"
            "## The second month\n\n"
            "Layer in Paper 2 (Business Laws + BCR). The Contract Act is the single "
            "highest-yield chapter of Foundation — memorise the sections cold. "
            "Continue Paper 1 (Partnership Accounts) and Paper 3 (Time Value of Money "
            "+ Probability).\n\n"
            "## The third month\n\n"
            "This is when Paper 4 (Business Economics + BCK) joins your rotation. "
            "Economics benefits from short daily doses rather than long weekly ones. "
            "Do 45 minutes a day, six days a week, and you'll be ready.\n\n"
            "By end of month three you should have completed one full first-pass of "
            "the entire syllabus.\n\n"
            "## The three chapters that quietly decide the attempt\n\n"
            "1. **Partnership Accounts (Paper 1, Ch 8)** — worth 18% and consistently "
            "  the top mark-differentiator. Get every past-year variant done.\n"
            "2. **Contract Act (Paper 2, Ch 1)** — 20% of Paper 2. Memorise the "
            "  sections and 4-5 landmark case laws.\n"
            "3. **Statistical Description of Data + Central Tendency (Paper 3, Ch 10-11)** — "
            "  24% combined weightage in Paper 3.\n\n"
            "Nail these three and you're above cut-off in three papers before you "
            "even open the other chapters.\n\n"
            "## What to skip on the first pass\n\n"
            "- BCK case-study drill until month 4\n"
            "- Advanced calculus problems in Paper 3 (learn the formulas, skip "
            "  proofs, come back later)\n"
            "- Report writing until you've read at least 15 real examples\n\n"
            "## Time budget per day\n\n"
            "Aim for 6-7 productive hours during month 1-2 while you're still "
            "building endurance; ramp to 8-9 in month 3.\n\n"
            "One warning: don't burn out in month 1. There are ten more months "
            "before your attempt. Consistency > intensity."
        ),
        author_name="Meera Balakrishnan",
        author_role="CA · Foundation Faculty",
        tags=["Foundation", "Strategy"],
        levels=["Aspiring", "Foundation"],
        days=27,
        hero_grad=["#B4FF39", "#0A0A0C", "#7C3AED"],
    ),
    _post(
        slug="intermediate-tax-under-90-days",
        title="Intermediate Taxation in under 90 days",
        excerpt="A day-by-day plan to cover Direct + Indirect Tax from scratch to exam-ready in three months. Includes the 40 practice-problem checklist.",
        body_md=(
            "## Days 1-20 — Direct Tax fundamentals\n\n"
            "- Days 1-3: Basic concepts, residential status, scope of total income\n"
            "- Days 4-8: Salaries (this is 10% of the paper — invest here)\n"
            "- Days 9-11: House Property (mechanical — one week is enough)\n"
            "- Days 12-18: PGBP (highest-weightage single chapter — do carefully)\n"
            "- Days 19-20: Recap + practice set\n\n"
            "## Days 21-35 — Direct Tax rest\n\n"
            "- Days 21-27: Capital Gains (also 10% — worth the time)\n"
            "- Days 28-30: Income from Other Sources + Clubbing\n"
            "- Days 31-33: Set-off, C/F, Deductions VI-A\n"
            "- Days 34-35: Computation of total income + tax liability\n\n"
            "## Days 36-40 — Compliance topics (DT)\n\n"
            "- Days 36-38: TDS, TCS, Advance Tax\n"
            "- Days 39-40: Return filing + interest & refunds\n\n"
            "## Days 41-55 — GST fundamentals\n\n"
            "- Days 41-43: Introduction, Levy, Definition of Supply\n"
            "- Days 44-46: Composite/Mixed supply, Schedules I-III\n"
            "- Days 47-50: Time, Place, Value of Supply (highest-weightage GST cluster)\n"
            "- Days 51-55: ITC (10% weightage) + Registration\n\n"
            "## Days 56-70 — GST compliance\n\n"
            "- Days 56-58: Tax invoice, e-invoicing, e-way bill\n"
            "- Days 59-63: Returns + payment + refunds\n"
            "- Days 64-67: Assessment, audit, anti-profiteering\n"
            "- Days 68-70: Demands, penalties, appeals\n\n"
            "## Days 71-90 — Consolidation\n\n"
            "- Days 71-75: Full first-pass revision (blueprint pile)\n"
            "- Days 76-80: 20 mixed problems, timed\n"
            "- Days 81-85: Weak-pile focused revision\n"
            "- Days 86-88: Two full mocks\n"
            "- Days 89-90: Final blueprint sweep\n\n"
            "## The 40-problem checklist\n\n"
            "Ask your mentor for a curated 40-problem set covering: capital gains "
            "special provisions (5), MAT under Sec 115JB (3), TDS Chapter XVII (5), "
            "GST place-of-supply (7), ITC blocked credits (5), inverted duty refund "
            "(3), advance ruling (3), e-invoicing thresholds (4), and 5 mixed cases. "
            "Complete this set at least twice.\n\n"
            "If you can do those 40 clean, you're above the 60-percentile cutoff."
        ),
        author_name="Sameer Khan",
        author_role="CA · Tax Faculty",
        tags=["Intermediate", "Taxation", "Strategy"],
        levels=["Intermediate"],
        days=31,
        hero_grad=["#8B5CF6", "#F59E0B", "#0A0A0C"],
    ),
    _post(
        slug="notes-vs-recall",
        title="Notes vs. recall: pick one",
        excerpt="The single biggest waste of study time in CA prep is prettified notes. Here's the case for switching to active recall — with evidence.",
        body_md=(
            "## The prettified-notes trap\n\n"
            "Everyone who's serious about CA prep has done it: hours in front of "
            "a blank notebook, colour-coded highlighters lined up, transcribing "
            "the ICAI module into ~30% of its original length with better formatting.\n\n"
            "It feels productive. You're 'engaging with the material'. You end the "
            "session with a beautiful artifact. And a week later, you can barely "
            "recall the definitions from the chapter you spent 4 hours summarising.\n\n"
            "The cognitive science on this is unambiguous. Passive review — "
            "including note-taking that's mostly transcription — produces "
            "roughly 20% of the long-term retention that active recall produces "
            "for the same time investment. This is one of the most replicated "
            "findings in educational psychology.\n\n"
            "## What active recall actually looks like for CA prep\n\n"
            "**Method 1: Blank-page dumps.** Open a chapter. Read it once, "
            "carefully. Close the module. Grab a blank sheet of paper and write "
            "down everything you remember. Then check against the module and fill "
            "gaps in a different colour. Do this twice for the same chapter across "
            "a week. The second dump is where the compounding kicks in.\n\n"
            "**Method 2: Question-first learning.** Before reading a chapter, look "
            "at past-year questions from that chapter. Try to answer them with "
            "zero preparation. Fail, obviously. But now your brain has "
            "'question-shaped holes' that the reading fills far more effectively.\n\n"
            "**Method 3: Teach it to a person who doesn't know.** WhatsApp a "
            "batchmate a 3-sentence explanation of Section 45(1) capital gains. "
            "The friction of compressing to 3 sentences forces you to identify the "
            "load-bearing concepts.\n\n"
            "## When notes are still worth it\n\n"
            "Notes are useful as a **retrieval index**, not as a summary. If your "
            "notes let you find where in a 400-page module a specific concept "
            "lives — 3-4 keywords + page reference — they've paid for themselves. "
            "If they're a from-scratch rewrite of the material, they haven't.\n\n"
            "## The rule\n\n"
            "For every 60 minutes of study, spend at most 15 on notes and at "
            "least 30 on recall. If you invert this ratio, you're spending time "
            "generating an artifact you'll re-read 1-2 times when you should be "
            "generating retrieval strength you'll draw on daily."
        ),
        author_name="Anaya Prasad",
        author_role="Cognitive Science → CA Aspirant",
        tags=["Study Method", "Cognitive Science"],
        levels=["Foundation", "Intermediate", "Final"],
        days=36,
        hero_grad=["#7C3AED", "#B4FF39", "#0A0A0C"],
    ),
    _post(
        slug="budget-2026-in-plain-english",
        title="Budget 2026 in plain English",
        excerpt="A CA-eye view of the seven changes that matter to your syllabus. Slightly angry at some of them, in a professional way.",
        body_md=(
            "## What actually changed\n\n"
            "**1. LTCG on listed equity now 15% (from 12.5%).** The Sec 112A ₹1.25L "
            "exemption stays. Impact on ITR-2, DT paper 4 numerical questions, and "
            "portfolio-management questions in AFM.\n\n"
            "**2. Standard deduction under new regime up to ₹75,000.** Continuing "
            "trend of making the new regime the practical default for salaried "
            "individuals.\n\n"
            "**3. GST Sec 16(4) ITC window extended.** Now till 30-Nov of the "
            "following FY. Retrospective for FY23-24 and FY24-25 invoices.\n\n"
            "**4. E-invoicing threshold lowered to ₹3 crore.** From ₹5 crore. "
            "Effective 01-Aug-2026 with a 90-day grace period.\n\n"
            "**5. TDS on Sec 194R (benefit/perquisite) tightened.** Threshold reduced "
            "and the definition clarified to include software licences and cloud "
            "credits given for business promotion.\n\n"
            "**6. Angel tax on foreign investors abolished.** Long-overdue. Rule 11UA "
            "still applies for resident investors.\n\n"
            "**7. Presumptive taxation limits raised.** Sec 44ADA (professionals): "
            "₹75L to ₹90L. Sec 44AD (businesses): ₹3Cr to ₹4Cr where cash receipts "
            "≤ 5%.\n\n"
            "## What this means for your paper\n\n"
            "The DT paper this attempt will have at least one numerical that hinges "
            "on knowing the new LTCG rate. Mark it in your notes. Also expect a "
            "conceptual question on how the new regime interacts with the higher "
            "standard deduction.\n\n"
            "GST paper: expect a compliance question involving the extended ITC "
            "window with a retrospective element. Read the CBIC notification "
            "itself, not a coaching-institute summary.\n\n"
            "## A slightly angry note\n\n"
            "The frequency with which the government amends the standard deduction "
            "and the tax slabs makes life harder for teachers, textbook publishers, "
            "and students in that order. If you're studying, treat the current-year "
            "study material as *definitely* out of date on at least two provisions, "
            "and always cross-check the CBDT/CBIC website before an attempt."
        ),
        author_name="Vikram Sethi",
        author_role="CA · Tax Policy Analyst",
        tags=["Regulatory", "Taxation", "Budget"],
        levels=["Intermediate", "Final"],
        days=5,
        hero_grad=["#F59E0B", "#7C3AED", "#0A0A0C"],
    ),
    _post(
        slug="articleship-firm-choice",
        title="Articleship: choose the firm, not the brand",
        excerpt="The number-one mistake CA aspirants make in articleship selection, and a 5-question filter that would fix it for most people.",
        body_md=(
            "## The Big 4 trap\n\n"
            "'Do your articleship at a Big 4' is one of those pieces of advice that's "
            "correct on average and wrong in most specific cases.\n\n"
            "The Big 4 experience varies wildly by team, city, and partner. You could "
            "spend three years doing meaningful M&A tax work in the Mumbai office — or "
            "you could spend three years vouching AP transactions on a single client "
            "in a tier-2 city. Same brand on the resume. Very different learning.\n\n"
            "Meanwhile, well-run mid-size firms (~50-200 CAs) frequently offer better "
            "learning velocity in the first two years, because you get to touch more "
            "of the audit and tax file end-to-end.\n\n"
            "## The 5-question filter\n\n"
            "Before signing your Form 103 with any firm, get answers to these five:\n\n"
            "1. **What's the average number of clients an article works on in year 1?** "
            "  Under 3 = you'll go deep. 10+ = you're a resource, not a learner.\n"
            "2. **Who reviews my working papers, and how quickly?** If the answer is "
            "  'the manager, weekly', you'll grow. If it's 'the partner, sometimes', "
            "  find a different firm.\n"
            "3. **What kind of clients does the firm serve?** Listed cos + banks + "
            "  MNCs is a different learning universe than SMEs + partnerships. Pick "
            "  based on where you want to end up.\n"
            "4. **How many articles from the current cohort cleared Final on the "
            "  first attempt?** Firms that can't answer this precisely aren't "
            "  tracking it, which means they aren't optimising for it.\n"
            "5. **Can I speak to an article who joined 2 years ago?** If the firm "
            "  says no, walk out. If they arrange it, ask that person what they'd "
            "  change about their choice.\n\n"
            "## What to prioritise in year one\n\n"
            "- Get exposure to audit + tax + one specialty (transfer pricing, "
            "  forensic, IFC testing — pick one)\n"
            "- Learn to write memos your senior doesn't need to rewrite\n"
            "- Build a working relationship with at least one manager who'll "
            "  vouch for you two years from now\n\n"
            "None of these correlate with the brand on the door."
        ),
        author_name="Nikhil Aiyar",
        author_role="CA · Talent Advisory",
        tags=["Career", "Articleship"],
        levels=["Intermediate", "Articleship"],
        days=40,
        hero_grad=["#10B981", "#7C3AED", "#0A0A0C"],
    ),
    _post(
        slug="advanced-accounts-30-questions",
        title="Advanced Accounts: 30 questions to know cold",
        excerpt="A curated list of past-year and RTP problems that map to 80% of what shows up in Intermediate Paper 1 numerical questions.",
        body_md=(
            "## Why 30\n\n"
            "Not 100. Not 50. Thirty is roughly the number of *distinct* problem "
            "archetypes you'll encounter in Intermediate Advanced Accounting. "
            "Beyond 30, questions start rhyming with ones you've already seen.\n\n"
            "The list below is my curated pull from the last 8 attempts of RTPs, "
            "MTPs, and past papers. If you can do all 30 clean, without notes, in "
            "the time budget of the actual paper, you're above the pass mark before "
            "you touch a single theory question.\n\n"
            "## The list\n\n"
            "### Ind AS 115 Revenue (4 questions)\n"
            "- Q1: Bundled telecom contract with allocation using standalone SP\n"
            "- Q2: Contract modification with 'additional distinct goods'\n"
            "- Q3: Variable consideration with the constraint\n"
            "- Q4: Contract cost capitalisation under Ind AS 115.91\n\n"
            "### Ind AS 116 Leases (4 questions)\n"
            "- Q5: Basic ROU + lease liability computation with modifications\n"
            "- Q6: Sale-and-leaseback (both scenarios)\n"
            "- Q7: Sublease classification\n"
            "- Q8: Short-term lease vs low-value asset exemption\n\n"
            "### Business Combinations & Consolidation (6 questions)\n"
            "- Q9: Purchase-consideration measurement (fair value)\n"
            "- Q10: Non-controlling interest — fair value vs proportionate\n"
            "- Q11: Goodwill vs bargain purchase\n"
            "- Q12: Step acquisition (single-step through multiple)\n"
            "- Q13: CFS with intra-group elimination\n"
            "- Q14: Loss of control accounting\n\n"
            "### Financial Instruments (5 questions)\n"
            "- Q15: Effective interest rate + amortised cost measurement\n"
            "- Q16: ECL simplified vs general approach\n"
            "- Q17: Derivative classification\n"
            "- Q18: Compound instruments (split)\n"
            "- Q19: Hedge accounting basics (fair-value hedge)\n\n"
            "### Deferred Tax (3 questions)\n"
            "- Q20: Standalone computation with permanent + timing differences\n"
            "- Q21: Deferred tax on business combinations\n"
            "- Q22: Deferred tax on unused losses\n\n"
            "### EPS + Cash Flow (2 questions)\n"
            "- Q23: Diluted EPS with bonus + rights + convertibles\n"
            "- Q24: Indirect-method cash flow with reconciling items\n\n"
            "### Other (6 questions)\n"
            "- Q25: Employee benefits — defined benefit plan\n"
            "- Q26: Share-based payments (equity-settled)\n"
            "- Q27: Foreign currency translation\n"
            "- Q28: Investment property vs PP&E\n"
            "- Q29: Impairment of assets (CGU test)\n"
            "- Q30: Government grants (Ind AS 20)\n\n"
            "## How to use the list\n\n"
            "Do each question once cold. Mark your errors. Do it again in 5 days. "
            "Anything you got wrong twice goes into your weak pile — that's the "
            "list you attack for the last two weeks before the attempt."
        ),
        author_name="Ritvik Shah",
        author_role="CA · Faculty, Advanced Accounts",
        tags=["Intermediate", "Advanced Accounts"],
        levels=["Intermediate"],
        days=44,
        hero_grad=["#7C3AED", "#0A0A0C", "#F59E0B"],
    ),
    _post(
        slug="mental-health-during-ca",
        title="Mental health during CA prep",
        excerpt="Nobody talks about it enough. A frank essay on burnout, isolation, and how to prep sustainably for a multi-year exam.",
        body_md=(
            "## The compounding cost of grinding\n\n"
            "CA prep is a multi-year commitment where each phase gets harder. "
            "Foundation feels manageable. Intermediate breaks people. Final breaks "
            "them again, differently. Articleship layers on top.\n\n"
            "The natural response is to grind harder. But there's a compounding "
            "cost that most students underestimate: burnout doesn't reset when the "
            "exam ends. If you push through the last two weeks on 4 hours of "
            "sleep, your recovery costs you the next three weeks of learning "
            "efficiency at 60%.\n\n"
            "## The signs to watch for\n\n"
            "- You can't remember what you studied 2 hours ago\n"
            "- Physical symptoms: chronic headaches, jaw tension, back pain\n"
            "- Loss of interest in things you used to enjoy for even 15 minutes\n"
            "- Irritability that surprises the people around you\n"
            "- Sleep gets shorter but no more energising\n\n"
            "If two or more of these last more than three weeks, you're not "
            "'in the zone'. You're burning out. And no amount of extra hours "
            "will fix it — you need active recovery.\n\n"
            "## What active recovery looks like\n\n"
            "**Sleep debt.** Two weeks of protected 8-hour nights. Non-negotiable. "
            "No phone in the bedroom, actual darkness, cool room.\n\n"
            "**Sunlight.** 20-30 minutes of morning sunlight, before caffeine, "
            "every day. This resets circadian rhythm faster than any supplement.\n\n"
            "**Physical exercise.** Not for weight or muscle. For cognitive "
            "function. 30 minutes of moderate cardio, 4x a week, is the minimum "
            "your brain needs to work optimally.\n\n"
            "**Real connection.** One human interaction per day that has nothing "
            "to do with CA prep. Family dinner counts. A study-group WhatsApp "
            "does not.\n\n"
            "**Therapy or counselling.** If the signs above persist beyond active "
            "recovery — talk to a professional. CA prep is one of the highest-"
            "sustained-stress environments a young adult can be in. Getting "
            "professional help is a strength, not a weakness.\n\n"
            "## The three-day sabbatical rule\n\n"
            "Every 8-12 weeks, take three consecutive days completely off. No "
            "notes, no revision, no lectures. Do something entirely unrelated. "
            "The productivity you 'lose' in those three days is replaced 3x by "
            "the two weeks that follow.\n\n"
            "This isn't advice from wellness Instagram. This is advice from every "
            "senior faculty member I've talked to. The rank-holders they've "
            "trained didn't grind hardest — they recovered best."
        ),
        author_name="Dr. Meghana Rao",
        author_role="Clinical Psychologist · works with CA aspirants",
        tags=["Wellbeing", "Sustainability"],
        levels=["Foundation", "Intermediate", "Final"],
        days=50,
        hero_grad=["#10B981", "#7C3AED", "#0A0A0C"],
    ),
    _post(
        slug="topper-interview-air-3-2023",
        title="Topper interview: 'I stopped watching lectures halfway through Intermediate'",
        excerpt="AIR 3 (Nov 2023) on the lecture trap, why she switched to primary-source reading, and the study group that actually helped.",
        body_md=(
            "## On watching lectures\n\n"
            "**Q: When did you stop watching lectures?**\n\n"
            "Halfway through Intermediate, around June 2022. I realised I was "
            "watching them at 1.5x, taking screenshots, and still not being able "
            "to solve a problem cold. The lectures had become a very expensive "
            "form of procrastination.\n\n"
            "**Q: What did you switch to?**\n\n"
            "The ICAI study modules directly. They're not glamorous, but they're "
            "the source of truth for the paper. I paired the modules with the "
            "RTPs and MTPs, and I stopped watching lectures except for very "
            "specific concepts I got stuck on.\n\n"
            "## On study groups\n\n"
            "**Q: Did you have a study group?**\n\n"
            "One that worked. Two that didn't.\n\n"
            "The one that worked: three of us, met twice a week over Zoom for 90 "
            "minutes. Structured agenda — each person had prepped one topic, "
            "walked the other two through it, took questions. Rotation.\n\n"
            "The ones that didn't work: general WhatsApp groups of 20 people. "
            "They turned into complaint groups. Get out of those. They lower "
            "your baseline mood without giving you anything back.\n\n"
            "## On the last month\n\n"
            "**Q: What did the last month look like?**\n\n"
            "Slowly increasing calm. That surprises people. Everyone expects the "
            "last month to be more panicked than the previous months. Mine was "
            "less. Because I trusted the work I had done in the previous ten.\n\n"
            "The last month should be about controlled repetition. If you're "
            "learning new concepts in the last week, you already lost. Accept "
            "the syllabus you know, sharpen it, and go.\n\n"
            "**Q: What surprised you about the exam itself?**\n\n"
            "How much slower I wrote than in mocks. Adrenaline compresses time. "
            "Practise writing full papers in 2h 45m instead of 3h — you'll have "
            "buffer on the day.\n\n"
            "## On what she'd change\n\n"
            "**Q: If you could redo something, what would it be?**\n\n"
            "I'd have started my weak-pile system a full month earlier. That's "
            "the compounding I underestimated. Every day I ran the weak pile in "
            "the last three months was worth more than a full day of new topics.\n\n"
            "**Q: Any last thing?**\n\n"
            "Sleep. Genuinely. My rank came from sleeping more, not less, in the "
            "last six weeks. Every rank-holder I've met since says the same."
        ),
        author_name="Interview by Editorial Team",
        author_role="Featured: Suhani Bansal, AIR 3, Nov 2023",
        tags=["Topper", "Interview", "Final"],
        levels=["Intermediate", "Final"],
        days=55,
        hero_grad=["#F59E0B", "#0A0A0C", "#7C3AED"],
    ),
    _post(
        slug="gst-place-of-supply-mental-model",
        title="GST Place of Supply: a mental model that survives the exam",
        excerpt="Stop memorising rules. Learn the two-question test that resolves 85% of place-of-supply problems in one shot.",
        body_md=(
            "## The problem with memorising sections\n\n"
            "Place of Supply under GST is the classic memorisation trap. There "
            "are ~20 sections and sub-sections in Sec 10-13 of the IGST Act, and "
            "students often try to memorise them all. Under exam pressure, they "
            "blur into each other.\n\n"
            "There's a better way. Two questions, in order, resolve most cases.\n\n"
            "## Question 1: Is this goods or services?\n\n"
            "- **Goods** → Sec 10 or 11 (11 = imports/exports; 10 = domestic)\n"
            "- **Services** → Sec 12 or 13 (13 = one party outside India; 12 = both in India)\n\n"
            "This immediately narrows to one section. That's 80% of the problem.\n\n"
            "## Question 2: Movement or supply-location?\n\n"
            "For goods (Sec 10):\n"
            "- **Movement involved (10.1(a))** → POS = location where goods "
            "  terminate for delivery to recipient\n"
            "- **No movement (10.1(b))** → POS = location at delivery time\n"
            "- **Bill-to-ship-to (10.1(b) proviso)** → POS = principal place of "
            "  business of person taking billing responsibility\n"
            "- **Installation (10.1(d))** → POS = installation site\n\n"
            "For services (Sec 12, domestic):\n"
            "- **B2B general rule** → POS = recipient's registered address\n"
            "- **B2C general rule** → POS = supplier's location\n"
            "- **Specific exceptions** (Sec 12.3 to 12.14) → 12 specific "
            "  categories with their own rules (immovable property, events, "
            "  transport, telecom, banking, insurance, advertisement, etc.)\n\n"
            "## The trap the exam loves\n\n"
            "Consider: a Bengaluru IT firm serves a Mumbai-based multinational, "
            "with the software installed on the client's US servers.\n\n"
            "Student instinct: 'The service is provided in the US, so it's an "
            "export?'\n\n"
            "Correct analysis: Both supplier (Bengaluru) and recipient (Mumbai) "
            "are in India → Sec 12 applies. B2B general rule → POS is Mumbai. "
            "It's an inter-state supply within India, not an export.\n\n"
            "The physical location of where the software 'runs' is irrelevant "
            "under Sec 12.\n\n"
            "## The exception-list you must actually memorise\n\n"
            "There are 12 specific rules under Sec 12.3-12.14. Do memorise these — "
            "they're the ones examiners love to test. Especially:\n\n"
            "- Immovable property services → POS = location of property\n"
            "- Event admission/organisation → POS = event location\n"
            "- Transport of goods → POS = destination (for B2C domestic)\n"
            "- Passenger transport → POS = boarding point\n"
            "- Restaurant, catering → POS = performance location\n"
            "- Telecom → POS = billing address\n\n"
            "## The exam habit\n\n"
            "For every POS question, write down your answer to Question 1 and "
            "Question 2 in the margin before you touch the problem. If you're "
            "wrong on either, you'll catch yourself before writing the full "
            "answer. Two seconds saves two marks."
        ),
        author_name="Neelam Bhatia",
        author_role="CA · Indirect Tax Faculty",
        tags=["GST", "Intermediate", "Final"],
        levels=["Intermediate", "Final"],
        days=60,
        hero_grad=["#7C3AED", "#F59E0B", "#0A0A0C"],
    ),
    _post(
        slug="ind-as-116-vs-ifrs-16",
        title="Ind AS 116 vs IFRS 16: what's actually different?",
        excerpt="Short piece for aspirants planning to work in the Big 4 or Indian subsidiaries of MNCs. The three differences that matter and the ones that don't.",
        body_md=(
            "## Same standard, small deltas\n\n"
            "Ind AS 116 is textually near-identical to IFRS 16. The differences are "
            "small and mostly around presentation, but if you're going to work on "
            "MNC reporting, you'll be asked about them.\n\n"
            "## The three differences that matter\n\n"
            "**1. Presentation of ROU asset in Balance Sheet.** Ind AS 116 explicitly "
            "requires ROU assets to be presented as a separate line item — either on "
            "the face of the balance sheet or in the notes. IFRS 16 permits inclusion "
            "with PP&E provided the ROU asset is disclosed in the notes.\n\n"
            "**2. Rate implicit in the lease.** Same in text. Practical difference: "
            "Indian lessees often cannot determine the rate implicit in the lease "
            "because lease agreements typically don't disclose residual values. So "
            "the incremental borrowing rate (IBR) is used far more frequently in "
            "India than under IFRS.\n\n"
            "**3. Sale and leaseback with variable payments.** Ind AS 116 clarified "
            "the accounting where lease payments are variable and don't depend on "
            "an index or rate — retrospective amendment in FY22-23. IFRS 16 has the "
            "same clarification via IFRS 16 amendment (2022), but the effective "
            "date differs by one year.\n\n"
            "## The differences that don't\n\n"
            "The recognition/measurement mechanics are identical. Same 5-step "
            "criteria for identifying a lease. Same treatment of short-term and "
            "low-value assets. Same lease modification framework.\n\n"
            "## What you'll be asked in an audit interview\n\n"
            "Not the differences. The application. Given a specific lease contract, "
            "walk them through: is there a lease? What's the lease term (including "
            "options)? What's the discount rate? What's the ROU asset at initial "
            "recognition? What's the P&L impact for year 1?\n\n"
            "That's a 20-minute conversation and it's the one that decides whether "
            "you get the offer."
        ),
        author_name="Aditya Rao",
        author_role="Partner · Financial Reporting Advisory",
        tags=["Ind AS", "IFRS", "Final"],
        levels=["Final"],
        days=64,
        hero_grad=["#8B5CF6", "#0A0A0C", "#B4FF39"],
    ),
    _post(
        slug="mock-paper-strategy",
        title="How to actually use mock papers",
        excerpt="Not for score. Not to prove yourself right. Here's the diagnostic approach that turns a mediocre mock into 3 hours of high-value learning.",
        body_md=(
            "## The wrong way to use a mock\n\n"
            "Sit down for three hours. Try hard. Get a score. Show it to your "
            "coaching institute. Wait for the next mock.\n\n"
            "This is the majority of how mocks are consumed by CA students, "
            "and it's the reason they extract 20% of the value available.\n\n"
            "## What a mock actually tests\n\n"
            "A mock paper is a diagnostic. The score is the least interesting "
            "output. The interesting outputs are:\n\n"
            "1. Which chapter/topics did I lose marks on?\n"
            "2. Was I slow on any section? Why?\n"
            "3. Did I lose marks to careless computation or to missing knowledge?\n"
            "4. In which questions did I feel most anxious?\n"
            "5. Did my time management collapse in the last hour?\n\n"
            "Every mock should end with 30 minutes of writing down answers to "
            "these five. That's where the learning is.\n\n"
            "## The post-mock ritual\n\n"
            "**Minute 0-30 after submitting:** Nothing. Rest.\n\n"
            "**Minute 30-90:** Go through every question. For each: (a) mark it "
            "green (got it right and knew why), yellow (got it right but was "
            "unsure), or red (got it wrong).\n\n"
            "**Minute 90-150:** For every yellow and red, write one sentence "
            "explaining what you'd do differently next time. Not what the correct "
            "answer is — what your process would be next time to catch it.\n\n"
            "**Minute 150-180:** Update your weak-pile spreadsheet. Any topic that "
            "generated a red in this mock enters the weak pile.\n\n"
            "**Next day:** Do 3 practice questions from each weak topic. Consolidate.\n\n"
            "## Mock frequency\n\n"
            "For Intermediate: 4-6 full mocks in the last 8 weeks, plus 2-3 topic-"
            "focused sectional mocks per week for the last 3 weeks.\n\n"
            "For Final: 6-8 full mocks in the last 10 weeks. Yes, that's a lot. "
            "You're not preparing to know the material; you're preparing to "
            "reproduce it under 3 hours of pressure.\n\n"
            "## The single most under-used move\n\n"
            "**Give your mock to a mentor and ask them to grade only your "
            "presentation, not your correctness.** Structure. Layout. Working "
            "notes. Answer numbering. Assumption disclosure.\n\n"
            "Presentation contributes 10-15% of the marks and most students "
            "leave that on the table because they never practise it.\n\n"
            "One clean-presentation mock, reviewed by a mentor, will earn you "
            "more marks on exam day than three additional practice sets. This "
            "is the compounding trick nobody talks about."
        ),
        author_name="Rhea Menon",
        author_role="CA · AIR 12, Nov 2024",
        tags=["Strategy", "Mocks", "Intermediate", "Final"],
        levels=["Intermediate", "Final"],
        days=68,
        hero_grad=["#B4FF39", "#7C3AED", "#0A0A0C"],
    ),
    _post(
        slug="valuation-startup-basics",
        title="Startup valuation for the AFM paper",
        excerpt="DCF is not the answer. Here's the mental model you actually need for VC-method, First-Chicago, and comparable-transactions questions.",
        body_md=(
            "## Why DCF doesn't work\n\n"
            "The AFM paper will happily ask you to value a startup, and students "
            "reflexively reach for DCF. But early-stage startups often have "
            "negative cash flows for 5+ years and terminal-value assumptions that "
            "dominate the number. DCF is a bad tool for this.\n\n"
            "The right tools are Venture Capital Method (VCM) and First Chicago "
            "Method (FCM). Both are on the syllabus. Both are consistently under-"
            "prepared.\n\n"
            "## Venture Capital Method — in 4 steps\n\n"
            "1. **Terminal Year Revenue/Earnings Projection.** Project revenue "
            "  and net income at exit (usually 5-7 years out). Be aggressive but "
            "  defensible.\n"
            "2. **Terminal Value.** Apply a comparable-companies exit multiple "
            "  (P/E or EV/Revenue) to get terminal value.\n"
            "3. **Discount to Present Value.** Use a very high discount rate — "
            "  40-70% depending on stage. This is the VC's expected return "
            "  compensating for risk.\n"
            "4. **Adjust for Dilution.** Divide the required investor ownership "
            "  by (1 - future dilution %) to get today's required stake.\n\n"
            "Post-money valuation = investment amount / required ownership.\n\n"
            "## First Chicago Method — in 3 steps\n\n"
            "1. Model three scenarios: best case, base case, failure.\n"
            "2. Value each scenario using DCF or exit multiples.\n"
            "3. Weight by probability and take expected value.\n\n"
            "The insight of FCM over pure DCF: it explicitly accommodates the "
            "asymmetric payoff structure of early-stage investments (small "
            "chance of enormous upside, large chance of zero).\n\n"
            "## What the exam actually tests\n\n"
            "Recent AFM papers have leaned toward:\n\n"
            "- Full VCM computation with dilution rounds\n"
            "- Comparison of DCF vs VCM output and defending which is more "
            "  appropriate\n"
            "- Effect of a down-round on existing investors' ownership\n"
            "- Basic waterfall analysis (preferred + common + option pool)\n\n"
            "Practice at least three problems on each of these four sub-areas. "
            "Any decent AFM textbook or the RTP will have them.\n\n"
            "## The IVSC 106 update\n\n"
            "The Indian Valuation Standards Board recently released IVS 106 on "
            "startup valuation. It formalises the VCM and FCM as accepted "
            "approaches. Expect this to appear in an exam within 2-3 attempts. "
            "Read it once."
        ),
        author_name="Meera Chatterjee",
        author_role="CA · Corporate Finance, ex-Startup CFO",
        tags=["AFM", "Valuation", "Final"],
        levels=["Final"],
        days=72,
        hero_grad=["#7C3AED", "#B4FF39", "#F59E0B"],
    ),
    _post(
        slug="cost-vs-management-accounting",
        title="Cost vs Management Accounting — a distinction that matters",
        excerpt="These two blur together in students' minds, and the exam quietly punishes the confusion. The 90-second explanation you needed six months ago.",
        body_md=(
            "## The confusion\n\n"
            "Ask a random Intermediate student what the difference between "
            "Cost Accounting and Management Accounting is, and you'll get an "
            "answer that includes the phrase 'both are internal' or 'management "
            "accounting is broader'. Neither is wrong. Neither is useful for the "
            "exam.\n\n"
            "## The distinction that matters\n\n"
            "**Cost accounting** tells you what a thing cost. Full stop. Total "
            "cost of a unit, of a job, of a batch, of a process. It's descriptive "
            "and mostly historical. Its outputs feed into: pricing, external "
            "reporting (in some cases), and the raw material for management "
            "accounting.\n\n"
            "**Management accounting** takes those cost numbers plus other "
            "financial and non-financial data and answers business questions: "
            "*should we make or buy? should we drop this product? should we "
            "accept this special order? how did we perform vs plan?* It's "
            "prescriptive and forward-looking.\n\n"
            "One is the raw material. The other is the decision.\n\n"
            "## Why this matters in the exam\n\n"
            "Paper 4 of Intermediate covers both. Questions like 'compute product "
            "cost using ABC' are pure cost accounting. Questions like 'should the "
            "company accept a 25% below-market order?' are management "
            "accounting — the cost number is an input.\n\n"
            "The mark schemes reward showing the analysis chain. If a "
            "special-order question is asked, present the incremental-cost "
            "computation *and* the qualitative factors *and* the recommendation. "
            "Cost accounting alone (just the numbers) will get you partial credit "
            "at best.\n\n"
            "## The three question archetypes to master\n\n"
            "1. **Make-or-buy** — always compute avoidable costs vs external "
            "  price. Include opportunity cost of capacity.\n"
            "2. **Drop or continue** — segment-margin analysis. Include fixed "
            "  costs that are avoidable.\n"
            "3. **Special order** — incremental revenue vs incremental cost. "
            "  Include capacity constraints.\n\n"
            "In each case, the exam expects a computation + a written "
            "recommendation + qualitative caveats. Miss any one of the three and "
            "you leave marks on the table."
        ),
        author_name="Karan Deshpande",
        author_role="CA · GST Practice Lead",
        tags=["Costing", "Intermediate"],
        levels=["Intermediate"],
        days=76,
        hero_grad=["#F59E0B", "#0A0A0C", "#B4FF39"],
    ),
    _post(
        slug="topper-interview-air-1-2024",
        title="Topper interview: 'The plan was boring. It worked.'",
        excerpt="AIR 1 (May 2024) on why he ignored every glamorous study system and just showed up for 11 months.",
        body_md=(
            "## The plan\n\n"
            "**Q: What did your daily schedule look like?**\n\n"
            "6:30am wake up. 7-10am study session one. Breakfast. 10:30am-1:30pm "
            "session two. Lunch + nap. 3-6pm session three. Dinner. 7-9pm "
            "session four. Bed by 11.\n\n"
            "That's it. Same every day, more or less, for 11 months.\n\n"
            "**Q: No study system? No Pomodoro, no spaced repetition?**\n\n"
            "The tools people talk about online are for people who can't "
            "sustain attention for 3 hours. If you can sit still and study for "
            "3 hours, you don't need the tools. Just the habit.\n\n"
            "## The choice\n\n"
            "**Q: How did you avoid distractions?**\n\n"
            "I deleted Instagram in June. I didn't join any WhatsApp study groups "
            "except my one 3-person group. I read one Bloomberg article a day, "
            "10 minutes maximum, to stay in touch with the world.\n\n"
            "That's the whole system. Delete the stuff that eats attention. "
            "Everything else follows.\n\n"
            "**Q: Coaching?**\n\n"
            "I did coaching for Costing and DT because I'd struggled with them at "
            "Intermediate. For the rest — self-study using ICAI modules + past "
            "papers. Coaching for the topics you're weakest on. Self-study for "
            "the topics you're okay at. Waste no time on lectures for topics you "
            "already know.\n\n"
            "## The last month\n\n"
            "**Q: The last month?**\n\n"
            "I went home for the last month. Away from the coaching centre. Away "
            "from friends who were panicking. My mother made all my meals. I "
            "studied 10 hours a day and slept 8. That's it.\n\n"
            "**Q: What did you do the day before the first paper?**\n\n"
            "Walked for two hours. Watched a movie. Slept 9 hours. I revised zero.\n\n"
            "## On why he thinks he came AIR 1\n\n"
            "**Q: Why do you think you came first?**\n\n"
            "Two things. I trusted the plan and didn't second-guess it. And I "
            "stayed emotionally boring — no highs, no lows, no rank-tracking, no "
            "comparing to batchmates. I just showed up every day. That's the "
            "whole answer. It's not a satisfying one and I know it sounds like "
            "false humility. But it's true.\n\n"
            "**Q: One thing you wish more aspirants understood?**\n\n"
            "That the rank is the *outcome*, not the *strategy*. If your "
            "strategy is 'get rank', you'll optimise for the wrong things. If "
            "your strategy is 'show up every day, do the work honestly, get "
            "sleep, don't panic', the rank finds you."
        ),
        author_name="Interview by Editorial Team",
        author_role="Featured: Arjun Menon, AIR 1, May 2024",
        tags=["Topper", "Interview", "Final"],
        levels=["Final"],
        days=79,
        hero_grad=["#B4FF39", "#7C3AED", "#0A0A0C"],
    ),
    _post(
        slug="ind-as-116-lease-modifications",
        title="Lease modifications under Ind AS 116 — a decision tree",
        excerpt="Every year there's at least one question on lease modifications. Here's the decision tree that resolves it in 45 seconds.",
        body_md=(
            "## The four-branch decision tree\n\n"
            "When faced with a lease modification, ask these questions in "
            "sequence:\n\n"
            "**Q1: Does the modification add the right to use one or more "
            "additional underlying assets?**\n\n"
            "If yes, and the consideration is commensurate with the standalone "
            "price → it's a **separate new lease**. Account for it independently. "
            "Don't touch the existing ROU asset or liability.\n\n"
            "If yes but the consideration is not commensurate → not a separate "
            "lease; go to Q3.\n\n"
            "**Q2: Does the modification decrease the scope (e.g., surrender part "
            "of the asset)?**\n\n"
            "If yes → this is a **partial termination**. Decrease the ROU asset "
            "proportionally, decrease the lease liability, and recognise any "
            "gain or loss in P&L.\n\n"
            "**Q3: Does the modification change only the consideration (payment "
            "amount)?**\n\n"
            "If yes → **re-measure the lease liability** using a revised discount "
            "rate. Adjust the ROU asset by the same amount (no P&L impact except "
            "if the ROU asset goes below zero, in which case the excess hits "
            "P&L).\n\n"
            "**Q4: Does the modification change the lease term or the assessment "
            "of options?**\n\n"
            "Same treatment as Q3 — re-measure liability, adjust ROU. Revised "
            "discount rate at modification date.\n\n"
            "## The trap\n\n"
            "Students often treat 'consideration decrease' as a partial "
            "termination. It's not — a payment reduction without a scope "
            "reduction is Q3, not Q2. Watch the wording carefully.\n\n"
            "## The presentation piece\n\n"
            "Always disclose in your working: (i) which branch of the decision "
            "tree applies, (ii) the new discount rate used (with reasoning), "
            "(iii) the revised ROU + liability computation, and (iv) any P&L "
            "impact. Examiners award full marks for showing the reasoning even "
            "if you're 5% off on a number."
        ),
        author_name="Aditya Rao",
        author_role="Partner · Financial Reporting Advisory",
        tags=["Ind AS", "Advanced Accounts", "Final"],
        levels=["Intermediate", "Final"],
        days=82,
        hero_grad=["#7C3AED", "#F59E0B", "#0A0A0C"],
    ),
    _post(
        slug="foundation-contract-act-framework",
        title="Foundation Business Laws: the Contract Act framework",
        excerpt="The Indian Contract Act is 20% of Paper 2. Here's the section-by-section framework that makes it a scoring chapter.",
        body_md=(
            "## Why the Contract Act is your friend\n\n"
            "The Indian Contract Act, 1872 is the single highest-yield chapter of Foundation "
            "Paper 2. It's 20% of the paper, it's static (unlike Companies Act which keeps "
            "changing), and it rewards structured memorisation.\n\n"
            "The Act is 266 sections but Foundation only cares about the general principles "
            "(Sec 1-75). Here's the framework I use with every student.\n\n"
            "## Layer 1 — the definition ladder (Sec 2)\n\n"
            "Learn Sec 2 like a ladder. It's the foundation for every question:\n"
            "- **2(a) Proposal** → **2(b) Promise (proposal accepted)** → **2(c) Promisor & Promisee**\n"
            "- **2(d) Consideration** → **2(e) Agreement (promise + consideration)** → **2(f) Reciprocal Promises**\n"
            "- **2(g) Void Agreement** → **2(h) Contract (enforceable agreement)** → **2(i) Voidable** → **2(j) Discharged**\n\n"
            "Memorise this ladder cold — half of the 6-mark theory questions come straight "
            "from these definitions.\n\n"
            "## Layer 2 — essentials of a valid contract (Sec 10)\n\n"
            "1. Offer + Acceptance (Sec 3-9)\n"
            "2. Intention to create legal relations (implied)\n"
            "3. Lawful consideration (Sec 23-25)\n"
            "4. Capacity to contract (Sec 11-12)\n"
            "5. Free consent (Sec 13-22)\n"
            "6. Lawful object (Sec 23)\n"
            "7. Not expressly declared void (Sec 24-30)\n"
            "8. Certainty & possibility of performance (Sec 29)\n"
            "9. Legal formalities (writing, registration where required)\n\n"
            "Any question on 'when is a contract valid' expects this list. Marks are for "
            "completeness, not brilliance.\n\n"
            "## Layer 3 — the vitiating factors (Sec 13-22)\n\n"
            "- **Coercion (Sec 15)** — pressure through illegal acts. Contract voidable at "
            "  the option of the aggrieved party.\n"
            "- **Undue Influence (Sec 16)** — misuse of dominant position. Voidable.\n"
            "- **Fraud (Sec 17)** — intentional misrepresentation with intent to deceive. Voidable.\n"
            "- **Misrepresentation (Sec 18)** — innocent false statement. Voidable.\n"
            "- **Mistake of Fact (Sec 20/22)** — bilateral mistake: void. Unilateral: usually "
            "  valid unless it concerns identity or subject matter.\n"
            "- **Mistake of Law** — Indian law: no relief. Foreign law: treated as fact.\n\n"
            "The trick: every one of these makes the contract *voidable*, not *void* — except "
            "bilateral mistake of fact which is void ab initio.\n\n"
            "## Layer 4 — special contracts\n\n"
            "- **Indemnity (Sec 124-125)** vs **Guarantee (Sec 126-147)** — memorise the 6-point "
            "  difference table (parties, liability, recovery, subrogation, notice, purpose).\n"
            "- **Bailment (Sec 148-181)** — delivery of goods for a purpose. Note the "
            "  bailee's duties (care, no unauthorised use, return with accretions).\n"
            "- **Agency (Sec 182-238)** — actual vs implied vs ostensible authority. Termination "
            "  triggers.\n\n"
            "## What to memorise verbatim\n\n"
            "Sec 2 definitions, Sec 10 essentials, Sec 11 capacity, Sec 16 undue influence, "
            "Sec 23 lawful consideration exceptions, Sec 25 exceptions to no-consideration rule. "
            "These six sections quoted verbatim in an answer earn a full presentation-mark bonus.\n\n"
            "## The 10 landmark cases you must know\n\n"
            "Carlill v Carbolic Smoke Ball · Balfour v Balfour · Mohori Bibee v Dharmodas Ghose · "
            "Chinnaya v Ramayya · Lalman Shukla v Gauri Datt · Harvey v Facey · Hyde v Wrench · "
            "Rose & Frank Co · Currie v Misa · Kedarnath v Gorie Mohammed.\n\n"
            "Learn the one-line ratio of each. Cite one in every relevant answer for a bonus mark."
        ),
        author_name="Meera Balakrishnan",
        author_role="CA · Foundation Faculty",
        tags=["Foundation", "Business Laws", "Contract Act"],
        levels=["Foundation", "Aspiring"],
        days=90,
        hero_grad=["#8B5CF6", "#B4FF39", "#0A0A0C"],
    ),
    _post(
        slug="foundation-first-mock-day-plan",
        title="Foundation: the day you take your first mock",
        excerpt="What to do before, during, and after your first Foundation mock. A calm playbook that removes 80% of the panic.",
        body_md=(
            "## The night before\n\n"
            "- Print out your admit card format if using paper mocks; test your laptop and "
            "  charger if online.\n"
            "- Lay out: black pen (2), pencil (1), eraser, sharpener, water bottle, spare "
            "  calculator, ICAI-permitted watch. No phone.\n"
            "- Skim the syllabus table of contents — one pass, 30 minutes max. Not deep study.\n"
            "- Sleep by 10:30pm. This is not the day to grind.\n\n"
            "## Morning of\n\n"
            "- Wake up 2.5 hours before the mock. Shower. Real breakfast. Coffee if you drink it, "
            "  but not more than usual — new caffeine tolerance in a stress environment is a bad idea.\n"
            "- Walk for 15 minutes. It resets nervous energy.\n"
            "- Arrive 30 minutes early. Sit. Breathe. Do NOT talk to other panicking students.\n\n"
            "## The first 5 minutes of the paper\n\n"
            "This is where most students lose marks silently. What to do:\n\n"
            "1. Read every instruction on the front page. Every one.\n"
            "2. Do a rapid **paper scan** — flip through all pages, note the total questions, "
            "  the mark distribution, any surprising formats.\n"
            "3. Identify one 'easy' question (usually a bookwork theory question) and one 'hard' "
            "  question. Mark them mentally.\n"
            "4. Start with the easy one. NOT question 1. The easy one. Getting 6 marks in the "
            "  first 5 minutes builds confidence for the rest of the paper.\n\n"
            "## Time management by paper (Foundation)\n\n"
            "- **Paper 1 (Accounting)** — 3 hours for 100 marks. Aim: ~1.8 minutes per mark. "
            "  Numerical questions eat time — start with the shortest first.\n"
            "- **Paper 2 (Business Laws + BCR)** — 3 hours. Laws section first (mechanical), "
            "  BCR after (creative energy needed).\n"
            "- **Paper 3 (Quant)** — 2 hours (MCQ). Set aside 90 minutes for questions, 30 for "
            "  review. Negative marking so DON'T guess randomly.\n"
            "- **Paper 4 (BE + BCK)** — 2 hours (MCQ). Same as Paper 3 discipline.\n\n"
            "## During the paper\n\n"
            "- **Presentation**: leave a 1-inch left margin. Number each answer clearly. Write "
            "  the question number in the margin. Underline key terms in your answer.\n"
            "- **When stuck**: skip. Do not spend more than 1.5x the time budget on any single "
            "  question. Return at the end.\n"
            "- **Working notes**: even wrong workings earn marks if they show correct methodology. "
            "  Always show workings on numerical questions.\n\n"
            "## The last 15 minutes\n\n"
            "- Review the questions you skipped. Attempt something on each — a bad attempt "
            "  earns more than a blank.\n"
            "- Check assumptions on numerical answers. One misread of a rate or a date can "
            "  cost 4 marks silently.\n"
            "- Do NOT change MCQ answers unless you're 90% sure. First-instinct answers are "
            "  usually right; second-guessing loses marks statistically.\n\n"
            "## After the paper\n\n"
            "- Do NOT discuss the paper with anyone. Every discussion afterward will convince "
            "  you that you got a question wrong. It's not useful.\n"
            "- Rest. Eat. Prep for the next paper.\n\n"
            "## The mental model\n\n"
            "Treat your first mock as **diagnostic**, not judgment. Its purpose is to reveal "
            "which chapters need more work, how your time management holds up, and where your "
            "presentation leaks marks. The score is the least useful output — the analysis of "
            "*why* you got each mark or missed it is where the value lives."
        ),
        author_name="Meera Balakrishnan",
        author_role="CA · Foundation Faculty",
        tags=["Foundation", "Strategy", "Mocks"],
        levels=["Foundation", "Aspiring"],
        days=92,
        hero_grad=["#B4FF39", "#0A0A0C", "#8B5CF6"],
    ),
]
