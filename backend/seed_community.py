"""Phase 6 — Community seed.

9 categories:
  - 6 level-segmented (foundation, inter, articleship, final, qualified, aspiring)
  - 3 cross-cutting (career, general, ama)
15 seeded threads across categories, each with 3-6 replies.
4 study groups (mix of level & topic).
Content is hand-authored (Indian CA context) and marked as system-seeded.
"""
import uuid

FORUM_CATEGORIES = [
    {"category_slug": "foundation", "name": "Foundation", "kind": "level", "level_key": "Foundation", "description": "First-step Q&A: exams, subjects, coaching, mindset.", "order": 10},
    {"category_slug": "intermediate", "name": "Intermediate", "kind": "level", "level_key": "Intermediate", "description": "Both groups, exam strategy, subject-wise deep dives.", "order": 20},
    {"category_slug": "articleship", "name": "Articleship", "kind": "level", "level_key": "Articleship", "description": "Firm choice, work life, leaves, ITT/OP training.", "order": 30},
    {"category_slug": "final", "name": "Final", "kind": "level", "level_key": "Final", "description": "Elective, self-study or coaching, mock papers, exam day tips.", "order": 40},
    {"category_slug": "qualified", "name": "Qualified", "kind": "level", "level_key": "Qualified CA", "description": "Post-qualification: practice vs job, networking, upskilling.", "order": 50},
    {"category_slug": "aspiring", "name": "Aspiring", "kind": "level", "level_key": "Aspiring", "description": "Is CA for me? School, entrance, CPT/Foundation routes.", "order": 60},
    {"category_slug": "careers", "name": "Careers & Placements", "kind": "cross", "level_key": None, "description": "CV reviews, Big-4 vs mid-tier, industry moves.", "order": 70},
    {"category_slug": "general", "name": "General & Off-topic", "kind": "cross", "level_key": None, "description": "Everything not academic. Books, tools, life.", "order": 80},
    {"category_slug": "ama", "name": "Ask Me Anything", "kind": "cross", "level_key": None, "description": "Verified CAs and rank-holders host AMAs here.", "order": 90},
]

def _thread(cat, title, body, author_init, author_lvl, is_pinned=False, tags=None):
    return {
        "thread_id": f"th_{uuid.uuid4().hex[:12]}",
        "category_slug": cat,
        "title": title,
        "body_markdown": body,
        "author_initials": author_init,
        "author_level": author_lvl,
        "is_verified_ca": author_lvl == "Qualified CA",
        "is_pinned": is_pinned,
        "tags": tags or [],
        "upvotes": 0,  # seeded below
        "reply_count": 0,  # seeded below
        "seed": True,
    }

def _reply(body, author_init, author_lvl, upvotes=0, is_verified=False):
    return {
        "reply_id": f"rp_{uuid.uuid4().hex[:12]}",
        "body_markdown": body,
        "author_initials": author_init,
        "author_level": author_lvl,
        "is_verified_ca": is_verified,
        "upvotes": upvotes,
        "parent_reply_id": None,
        "seed": True,
    }

# ---- threads with attached replies ----
SEED_THREADS = [
    # Foundation
    (_thread("foundation", "How do you actually enjoy Business Math?",
             "Struggling to keep motivated. Any tips on making Foundation Paper 3 less painful?",
             "R.S.", "Foundation", tags=["math", "foundation"]),
     [
        _reply("Solve past 5 years CA Foundation Math papers first. Patterns repeat more than you'd think.", "K.M.", "Intermediate", 34),
        _reply("Video lectures at 1.5x + revising the formula sheet daily. Boring but works.", "P.J.", "Foundation", 12),
        _reply("If you can afford it, Sanjay Saraf's shortcuts are gold.", "A.T.", "Intermediate", 22),
     ], 87),
    (_thread("foundation", "Foundation Nov'26 attempt — study plan critique",
             "Planning 4 hrs/day self-study + 2 hrs coaching. Enough or too much?",
             "N.T.", "Foundation", tags=["planning"]),
     [
        _reply("Enough for a first attempt. Ramp up in last 60 days to 6-7hrs.", "V.P.", "Final", 41, True),
        _reply("Track by chapters completed, not hours studied. Time can lie.", "R.M.", "Intermediate", 29),
     ], 64),

    # Intermediate
    (_thread("intermediate", "Group 1 or Group 2 first — no consensus in my circle",
             "Coaching says G1, seniors say G2 is lighter. Confused.",
             "S.G.", "Intermediate", tags=["strategy", "group-order"]),
     [
        _reply("G2 is lighter but Costing + FM are conceptual — great warmup.", "R.T.", "Final", 55, True),
        _reply("If you fear failing, take G2 first. Confidence boost matters.", "M.K.", "Qualified CA", 78, True),
        _reply("Just don't skip taxation lectures. That's the sticky group.", "A.V.", "Intermediate", 33),
        _reply("I did G1 first and rolled it → cost me 6 months. Wish I'd done G2.", "P.S.", "Final", 46),
     ], 92),
    (_thread("intermediate", "Cost Accounting — what's the fastest revision framework?",
             "Any tricks for last 15 days?",
             "V.M.", "Intermediate", tags=["costing"]),
     [
        _reply("One formula sheet per chapter. Handwrite it 3x. Then solve 1 problem per formula.", "K.J.", "Final", 61, True),
        _reply("Reverse solve — start from answer options in MCQs.", "N.S.", "Intermediate", 24),
     ], 58),

    # Articleship
    (_thread("articleship", "Big-4 vs mid-tier — I know it's asked a lot, but 2026 edition",
             "Got calls from Deloitte and Nangia Andersen. My weakness is math + risk aversion.",
             "P.C.", "Articleship", tags=["big4", "career", "mid-tier"], is_pinned=True),
     [
        _reply("For a math-weak person, Nangia's tax focus will pay long-term. Big-4 audit is repetitive.", "R.G.", "Qualified CA", 132, True),
        _reply("Take Big-4 brand — it opens doors even if the work is meh. Exit ops matter for 30-year career.", "S.M.", "Qualified CA", 108, True),
        _reply("Depends on what you want post-CA. Industry? Big-4. Practice? Mid-tier.", "V.A.", "Final", 71),
        _reply("Talk to at least 3 second-year articles at each firm before deciding.", "T.G.", "Qualified CA", 66, True),
     ], 214),
    (_thread("articleship", "How to negotiate stipend?",
             "Firm offered ₹8k, market rate for the city is ₹12k. Any playbook?",
             "N.K.", "Articleship", tags=["stipend", "negotiation"]),
     [
        _reply("ICAI minimum is now ₹6k tier-1, ₹5k tier-2, ₹4k others (2025 rev). Anything above is negotiation.", "V.T.", "Qualified CA", 92, True),
        _reply("Show competing offer. Even a mid-tier offer works as leverage.", "M.J.", "Final", 44),
        _reply("Don't burn the bridge. If they say no, learn the trade for 2 years then re-negotiate.", "K.R.", "Qualified CA", 61, True),
     ], 87),
    (_thread("articleship", "How many leaves does ICAI allow — real numbers?",
             "Confused between 156 days limit and firm's internal quota.",
             "R.P.", "Articleship", tags=["leaves", "icai"]),
     [
        _reply("ICAI: 1/6th of period served (excluding examination leave). Roughly ~156 days over 3 years.", "N.S.", "Qualified CA", 98, True),
        _reply("Study leaves are separate — usually 3 months before Inter/Final. Firm dependent.", "P.V.", "Qualified CA", 55, True),
     ], 71),

    # Final
    (_thread("final", "Best elective for banking + industry aspirations?",
             "Choosing between Risk Mgmt (Paper 6A) and International Taxation (Paper 6C).",
             "A.M.", "Final", tags=["elective"]),
     [
        _reply("For banking → 6A (Risk Mgmt). Directly relevant to what you'll do at any BFSI role.", "K.T.", "Qualified CA", 78, True),
        _reply("6C is longer-term useful if you'd consider MNC tax roles.", "V.J.", "Qualified CA", 45, True),
     ], 66),
    (_thread("final", "Self-study Final SFM in 4 months — realistic?",
             "Working full-time as trainee, only 2-3 hours/day available.",
             "P.T.", "Final", tags=["sfm", "self-study"]),
     [
        _reply("Doable if you're consistent. Priority: derivatives + portfolio + capital budgeting. Skip nothing before mocks.", "R.B.", "Qualified CA", 89, True),
        _reply("Sanjay Saraf's compact SFM series is 60 hours. That + 60 hours of practice = fighting chance.", "M.G.", "Final", 44),
     ], 58),

    # Qualified
    (_thread("qualified", "Practice or job in 2026? Not clear to me",
             "3 years post-CA, ₹22 LPA at a Big-4 senior role. Practice offers me freedom but risk.",
             "S.R.", "Qualified CA", tags=["career-choice"]),
     [
        _reply("Give practice 5 years or don't start. First 3 years are brutal even for talented CAs.", "V.M.", "Qualified CA", 76, True),
        _reply("Do both. Consult on the side while employed for 2 years. Then decide.", "K.A.", "Qualified CA", 118, True),
        _reply("Location matters. Tier-1 practice is very different from tier-2.", "N.V.", "Qualified CA", 33, True),
     ], 97),

    # Aspiring
    (_thread("aspiring", "12th commerce done, is CA still worth it in 2026 vs CFA/MBA?",
             "Everyone's telling me CA is dying. Reality check?",
             "A.T.", "Aspiring", tags=["career-choice", "cfa"]),
     [
        _reply("CA is not dying. Bad CAs might be. Domain + AI literacy = incredibly valuable.", "R.J.", "Qualified CA", 156, True),
        _reply("CFA is complementary, not substitute. Do CA first if you're in India.", "V.K.", "Qualified CA", 92, True),
        _reply("MBA is a tag; CA is a skill. Different games.", "T.M.", "Qualified CA", 74, True),
     ], 132),

    # Careers
    (_thread("careers", "CV template for Big-4 senior lateral — anyone willing to share?",
             "3 yrs Big-4 experience, moving to another Big-4. What do recruiters want to see?",
             "N.P.", "Qualified CA", tags=["cv", "big4"]),
     [
        _reply("Metrics matter. \"Managed 15-member team\", \"led ₹200Cr audit\". Not job descriptions.", "K.M.", "Qualified CA", 66, True),
        _reply("PDF only, 1 page, no photo. Recruiters spend 30 seconds first pass.", "P.R.", "Qualified CA", 41, True),
     ], 54),

    # General
    (_thread("general", "Best noise-cancelling headphones under ₹15k for long study sessions?",
             "Sony XM4 or Bose 700 or Nothing Ear Stick?",
             "V.S.", "Intermediate", tags=["gear"]),
     [
        _reply("Sony XM4 has best comfort for 6+ hour wear.", "K.P.", "Final", 33),
        _reply("Wired IEMs (Moondrop Chu) if you don't need ANC — better sound for the price.", "R.S.", "Qualified CA", 22, True),
     ], 41),

    # AMA
    (_thread("ama", "AMA: All India Rank 12, CA Final Nov 2024 — anything you want to ask",
             "Just cleared with AIR 12. 3 years of failure before this. Ask me anything about revision, mindset, mock strategy.",
             "P.G.", "Qualified CA", tags=["ama", "rank-holder"], is_pinned=True),
     [
        _reply("How many mocks did you actually give per subject?", "S.A.", "Final", 45),
        _reply("15 for DT, 10 for IDT, 8 for Audit. Fewer for practical papers.", "P.G.", "Qualified CA", 128, True),
        _reply("Rest days? Did you take them?", "A.J.", "Final", 28),
        _reply("Sunday post-lunch off, mandatory. And 1 movie per week. Non-negotiable.", "P.G.", "Qualified CA", 92, True),
     ], 264),
]

STUDY_GROUPS = [
    {
        "slug": "gst-warriors-2026",
        "name": "GST Warriors — May '26 Intermediate",
        "description": "Weekly problem-solving sprints for GST Part-II. Focus: ITC, RCM, and place-of-supply edge cases.",
        "level_key": "Intermediate",
        "topics": ["GST", "Indirect Tax"],
        "max_members": 20,
        "is_public": True,
        "seed": True,
    },
    {
        "slug": "final-sfm-selfstudy",
        "name": "Final SFM Self-Study Cohort",
        "description": "Working professionals studying SFM together. Nightly 90-min slot 9-10:30pm IST.",
        "level_key": "Final",
        "topics": ["SFM", "Derivatives"],
        "max_members": 15,
        "is_public": True,
        "seed": True,
    },
    {
        "slug": "articleship-big4-mumbai",
        "name": "Articleship — Big 4 Mumbai",
        "description": "Second-year articles at Big-4 Mumbai offices. Peer support + resume reviews.",
        "level_key": "Articleship",
        "topics": ["Big 4", "Career", "Mumbai"],
        "max_members": 30,
        "is_public": True,
        "seed": True,
    },
    {
        "slug": "aspiring-2028",
        "name": "Aspiring — Class of 2028",
        "description": "12th-passed students starting CA journey together. Weekly Foundation prep + mindset.",
        "level_key": "Aspiring",
        "topics": ["Foundation", "Career-choice"],
        "max_members": 40,
        "is_public": True,
        "seed": True,
    },
    {
        "slug": "qualified-industry-swap",
        "name": "Qualified CAs — Industry Rotators",
        "description": "Post-CA folks moving between industry roles. Confidential networking + role reviews.",
        "level_key": "Qualified CA",
        "topics": ["Industry", "Career"],
        "max_members": 25,
        "is_public": True,
        "seed": True,
    },
]
