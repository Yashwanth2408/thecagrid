"""Phase 7 — Post-Qualification Hub seed.

Career paths + certificate comparison (static reference data)
+ 30 jobs, 15 referrals, 8 mentors.
"""
CAREER_PATHS = [
    {"key": "big4-manager-track", "name": "Big-4 Manager Track", "nodes": [
        {"name": "Associate", "years": 0, "salary_range": [800000, 1400000]},
        {"name": "Senior Associate", "years": 2, "salary_range": [1400000, 2200000]},
        {"name": "Assistant Manager", "years": 4, "salary_range": [2200000, 3200000]},
        {"name": "Manager", "years": 6, "salary_range": [3200000, 5000000]},
        {"name": "Senior Manager", "years": 9, "salary_range": [5000000, 8500000]},
        {"name": "Partner", "years": 15, "salary_range": [15000000, 60000000]},
    ], "typical_progression": "Structured, 6-9 years to Manager. Partner is highly selective.", "next_certs": ["US CPA", "IFRS Diploma"], "exit_paths": ["Industry CFO", "PE/VC ops", "MBA + strategy"], "required_skills": ["Audit rigor", "Client management", "Team leadership", "Complex accounting"]},
    {"key": "industry-cfo", "name": "Industry CFO Path", "nodes": [
        {"name": "Financial Analyst", "years": 0, "salary_range": [900000, 1500000]},
        {"name": "Manager, Finance", "years": 3, "salary_range": [1800000, 2800000]},
        {"name": "Sr. Manager", "years": 6, "salary_range": [3000000, 5000000]},
        {"name": "Head of Finance", "years": 9, "salary_range": [5000000, 9000000]},
        {"name": "CFO", "years": 14, "salary_range": [10000000, 40000000]},
    ], "typical_progression": "Post Big-4 stint or direct industry entry. Cross-functional exposure critical.", "next_certs": ["CFA", "MBA", "US CPA"], "exit_paths": ["Board director", "Founder", "PE portfolio CFO"], "required_skills": ["FP&A", "Treasury", "M&A", "Stakeholder mgmt"]},
    {"key": "tax-litigator", "name": "Tax Litigation / Chambers", "nodes": [
        {"name": "Junior Article", "years": 0, "salary_range": [200000, 400000]},
        {"name": "Associate", "years": 3, "salary_range": [800000, 1400000]},
        {"name": "Sr. Associate", "years": 6, "salary_range": [1500000, 2500000]},
        {"name": "Principal", "years": 10, "salary_range": [3000000, 8000000]},
        {"name": "Partner (Chambers)", "years": 15, "salary_range": [10000000, 50000000]},
    ], "typical_progression": "Boutique/law-firm route. Reputation-driven; slow start, high ceiling.", "next_certs": ["LL.B.", "LL.M."], "exit_paths": ["Own practice", "Corporate GC"], "required_skills": ["Case law", "Drafting", "Advocacy"]},
    {"key": "startup-cfo", "name": "Startup Finance Lead", "nodes": [
        {"name": "Finance Manager (Seed)", "years": 0, "salary_range": [1500000, 2500000]},
        {"name": "Head of Finance (Series A)", "years": 3, "salary_range": [3000000, 5000000]},
        {"name": "VP Finance (Series B)", "years": 5, "salary_range": [5000000, 9000000]},
        {"name": "CFO (Series C+)", "years": 8, "salary_range": [9000000, 25000000], "extras": "+ ESOP"},
    ], "typical_progression": "High-risk, high-upside. ESOP dominates the reward.", "next_certs": ["CFA", "Startup mentors circle"], "exit_paths": ["Repeat CFO", "Founder", "Angel investor"], "required_skills": ["Cap-table", "Fundraising", "Unit economics", "Governance"]},
    {"key": "private-practice", "name": "Own Practice", "nodes": [
        {"name": "Solo Practice Y1", "years": 0, "salary_range": [300000, 800000]},
        {"name": "Small Firm Y3", "years": 3, "salary_range": [1200000, 2500000]},
        {"name": "Established Firm Y7", "years": 7, "salary_range": [3500000, 8000000]},
        {"name": "Multi-Partner Y15", "years": 15, "salary_range": [8000000, 40000000]},
    ], "typical_progression": "First 3 years brutal. Client-book compounds after year 5.", "next_certs": ["DISA (ICAI)", "ICWA"], "exit_paths": ["Merge into mid-tier", "Consulting sale"], "required_skills": ["Business development", "Compliance", "Practice management"]},
    {"key": "banking-treasury", "name": "Banking & Treasury", "nodes": [
        {"name": "Management Trainee", "years": 0, "salary_range": [1000000, 1600000]},
        {"name": "AVP", "years": 4, "salary_range": [2000000, 3500000]},
        {"name": "VP", "years": 7, "salary_range": [3500000, 6500000]},
        {"name": "SVP / MD", "years": 12, "salary_range": [7000000, 20000000]},
    ], "typical_progression": "PSU vs Private diverges early. Product specialization matters.", "next_certs": ["CFA", "FRM"], "exit_paths": ["Corporate treasury", "PE debt"], "required_skills": ["Risk", "Products", "Regulation"]},
    {"key": "consulting", "name": "Consulting (Strategy/Ops)", "nodes": [
        {"name": "Associate Consultant", "years": 0, "salary_range": [1500000, 2400000]},
        {"name": "Consultant", "years": 3, "salary_range": [2400000, 3800000]},
        {"name": "Manager", "years": 5, "salary_range": [4000000, 7000000]},
        {"name": "Partner", "years": 12, "salary_range": [12000000, 40000000]},
    ], "typical_progression": "Post-MBA usually. Big-4 consulting arms are the easier entry.", "next_certs": ["MBA", "Certified strategy diplomas"], "exit_paths": ["Industry SVP", "Founder"], "required_skills": ["Problem structuring", "Client management", "Storytelling"]},
    {"key": "forensic-fraud", "name": "Forensic & Fraud Investigation", "nodes": [
        {"name": "Analyst", "years": 0, "salary_range": [900000, 1400000]},
        {"name": "Senior Analyst", "years": 3, "salary_range": [1400000, 2200000]},
        {"name": "Manager", "years": 6, "salary_range": [2500000, 4200000]},
        {"name": "Director", "years": 10, "salary_range": [5000000, 10000000]},
    ], "typical_progression": "Niche but very sticky. Regulatory demand rising post-2020.", "next_certs": ["CFE", "DISA"], "exit_paths": ["Corporate governance", "Independent forensic practice"], "required_skills": ["Investigation", "Data analytics", "Reporting"]},
]

CERT_COMPARISON = [
    {"key": "ca", "name": "Chartered Accountant (CA - ICAI)", "cost_inr": 250000, "duration_months": 60, "pass_rate": "12-15%", "difficulty_score": 9.5, "roi_5y_multiple": 4.2, "format": "Foundation → Inter → Articleship → Final", "recognition": "India: strongest. Global: limited.", "best_for": "Indian audit, tax, industry."},
    {"key": "us-cpa", "name": "US Certified Public Accountant", "cost_inr": 400000, "duration_months": 18, "pass_rate": "45-55%", "difficulty_score": 7.5, "roi_5y_multiple": 3.6, "format": "4 papers (AUD, BEC/DISC, FAR, REG)", "recognition": "US market + MNCs globally.", "best_for": "US-desk work, MNC transfer, IFRS/USGAAP roles."},
    {"key": "cfa", "name": "CFA Charter (CFA Institute)", "cost_inr": 350000, "duration_months": 36, "pass_rate": "35% (L1) / 45% (L2) / 50% (L3)", "difficulty_score": 8.5, "roi_5y_multiple": 3.9, "format": "3 levels, self-study, minimum 3y work exp.", "recognition": "Global investment industry.", "best_for": "Investment banking, asset mgmt, equity research."},
    {"key": "acca", "name": "ACCA (UK)", "cost_inr": 320000, "duration_months": 30, "pass_rate": "40-50%", "difficulty_score": 7.0, "roi_5y_multiple": 3.2, "format": "13 papers, modular, exemptions for CAs", "recognition": "UK, EU, ME. Growing India MNC.", "best_for": "IFRS-heavy roles, MNC finance, Middle East."},
    {"key": "mba", "name": "MBA (Top-tier India/US)", "cost_inr": 3000000, "duration_months": 24, "pass_rate": "Entrance ~1-3%", "difficulty_score": 8.0, "roi_5y_multiple": 3.4, "format": "Full-time 2 years", "recognition": "Global; brand-dependent.", "best_for": "Career pivot to strategy, consulting, PE/VC."},
]

# ---- Jobs (30) ----
def _job(job_id, title, company, location, type_, exp_min, exp_max, sal_min, sal_max, domain, description, sponsored=False, apply_url=None):
    return {
        "job_id": job_id, "title": title, "company": company, "location": location,
        "type": type_, "experience_min": exp_min, "experience_max": exp_max,
        "salary_min": sal_min, "salary_max": sal_max, "salary_currency": "INR",
        "domain": domain, "description_markdown": description,
        "posted_by": None, "is_sponsored": sponsored, "apply_url": apply_url,
    }

JOBS = [
    _job("job_dt_audit_mum", "Audit Associate", "Deloitte India", "Mumbai", "full_time", 0, 1, 1200000, 1800000, ["Audit"], "Join the FS audit practice for banks and insurance clients. Structured training, IFRS + Ind-AS exposure, mentor-buddy program.", sponsored=True),
    _job("job_ey_tax_del", "Senior Tax Consultant", "EY India (S.R. Batliboi)", "Gurgaon", "full_time", 1, 3, 1600000, 2400000, ["Direct Tax", "Transfer Pricing"], "TP + international tax mandate on Fortune 500 clients. High client interaction, strong learning curve."),
    _job("job_bsr_gst_del", "GST Manager", "BSR & Co. LLP (KPMG)", "Delhi", "full_time", 3, 6, 1800000, 2500000, ["GST", "Indirect Tax"], "Lead GST advisory + litigation for large corporates. Ownership of end-to-end client relationships."),
    _job("job_pwc_ifrs_blr", "IFRS Reporting Specialist", "Price Waterhouse", "Bengaluru", "full_time", 2, 5, 1500000, 2200000, ["IFRS", "Audit"], "IFRS conversions for MNC subsidiaries. Requires deep Ind-AS ↔ IFRS mapping."),
    _job("job_gt_ma_mum", "M&A Associate", "Grant Thornton Bharat", "Mumbai", "full_time", 2, 4, 1500000, 2300000, ["M&A", "Advisory"], "Sell-side and buy-side advisory for mid-market deals. Financial modeling + due diligence."),
    _job("job_swiggy_cfo_asst", "Assistant Manager, Finance", "Swiggy", "Bengaluru", "full_time", 2, 4, 1800000, 2600000, ["FP&A", "Business Finance"], "Business partner for one of our national P&L verticals. Ownership of unit economics."),
    _job("job_razorpay_fin_ops", "Manager, Finance Operations", "Razorpay", "Bengaluru", "full_time", 3, 6, 2200000, 3200000, ["Finance", "Operations"], "Own the reconciliation + settlements operations for a top-3 Indian payment gateway."),
    _job("job_zerodha_treasury", "Senior Treasury Analyst", "Zerodha", "Bengaluru", "full_time", 3, 5, 2000000, 2800000, ["Treasury", "Investments"], "Manage the ₹1000cr+ treasury book. Fixed income + short-duration debt focus."),
    _job("job_flipkart_taxindir", "Manager, Indirect Tax", "Flipkart", "Bengaluru", "full_time", 4, 7, 2400000, 3500000, ["GST", "Indirect Tax"], "GST compliance + advisory for one of India's largest e-commerce platforms. Multi-state complexity."),
    _job("job_hdfc_credit", "AVP, Credit Risk", "HDFC Bank", "Mumbai", "full_time", 5, 8, 2800000, 4200000, ["Risk", "Credit"], "SME + mid-market credit underwriting. Domain rotation possible in 18-24 months."),
    _job("job_icici_treasury_avp", "AVP, Treasury Solutions", "ICICI Bank", "Mumbai", "full_time", 4, 7, 2500000, 3800000, ["Treasury", "Products"], "Sell FX + debt products to large corporate clients."),
    _job("job_kpmg_forensic_mum", "Forensic Manager", "KPMG India", "Mumbai", "full_time", 3, 6, 1800000, 2600000, ["Forensic"], "White-collar investigations for listed clients. Sensitive engagements, discrete style."),
    _job("job_deloitte_risk_del", "Senior Consultant, Risk", "Deloitte India", "Gurgaon", "full_time", 2, 4, 1500000, 2100000, ["Risk"], "Enterprise risk management for financial services clients."),
    _job("job_pwc_ma_del", "Associate, Corporate Finance", "PwC India", "Gurgaon", "full_time", 2, 4, 1600000, 2400000, ["M&A", "Advisory"], "Mid-market corporate finance mandates. Modeling + deal execution."),
    _job("job_walmart_glob_ind", "Senior Manager, Global Compliance", "Walmart India", "Bengaluru", "full_time", 6, 10, 3500000, 5500000, ["Tax", "Compliance"], "Multi-jurisdiction tax + compliance for one of the world's largest retailers.", sponsored=True),
    _job("job_meesho_analyst", "Senior Financial Analyst", "Meesho", "Bengaluru", "full_time", 1, 3, 1600000, 2400000, ["FP&A"], "Business finance partner for the merchant experience org."),
    _job("job_paytm_fin", "Manager, Merchant Finance", "Paytm", "Noida", "full_time", 3, 5, 2200000, 3000000, ["Finance"], "Own P&L for merchant lending. Cross-functional with product + credit."),
    _job("job_bcg_consultant", "Consultant, Financial Services", "BCG India", "Mumbai", "full_time", 3, 5, 3200000, 4800000, ["Consulting"], "FS consulting mandates for Indian banks + NBFCs. High-visibility work.", sponsored=True),
    _job("job_mck_associate", "Associate, Financial Institutions Group", "McKinsey & Company", "Gurgaon", "full_time", 2, 4, 2800000, 4000000, ["Consulting"], "FIG cases across Asia. Requires MBA or exceptional CA + business acumen."),
    _job("job_lazypay_fin_head", "Head of Finance (Fintech)", "LazyPay", "Bengaluru", "full_time", 6, 10, 4500000, 7500000, ["Finance", "Startup"], "Own the finance function for one of India's largest BNPL platforms. ESOP included."),
    _job("job_urban_company_finance", "Manager, Corporate Finance", "Urban Company", "Gurgaon", "full_time", 3, 5, 2200000, 3200000, ["FP&A", "Startup"], "Business partner to one of our largest service categories."),
    _job("job_boat_finance", "Senior Analyst, Business Finance", "boAt", "Mumbai", "full_time", 2, 4, 1600000, 2200000, ["FP&A", "Consumer"], "D2C consumer finance role. FP&A for product lines."),
    _job("job_freelance_gst_1", "Freelance GST Filings (₹15L revenue firm)", "Independent", "Remote", "contract", 1, 3, 500000, 900000, ["GST", "Compliance"], "Long-term freelance mandate. GST + TDS filings for a growing D2C brand. 15-25 hrs/week."),
    _job("job_freelance_audit_1", "Statutory Audit Support (Weekends)", "Independent", "Chennai", "contract", 2, 5, 300000, 600000, ["Audit"], "Weekend audit support for a listed company for 6 months. Perfect side income."),
    _job("job_referral_startup_cfo", "Fractional CFO — Series A SaaS", "Confidential SaaS", "Remote", "referral", 5, 8, 1500000, 3000000, ["Startup", "CFO"], "Post CA with 5+ years exp. Refer someone great — 15% success fee to the referrer."),
    _job("job_referral_tax_lead", "Head of Tax — Consumer FMCG", "Confidential FMCG", "Mumbai", "referral", 8, 12, 5000000, 8000000, ["Tax", "Leadership"], "Referral-only mandate. Confidential — details on shortlist."),
    _job("job_amazon_tax_analyst", "Tax Analyst (India)", "Amazon India", "Hyderabad", "full_time", 1, 3, 1600000, 2400000, ["Direct Tax", "Compliance"], "Corporate tax compliance for a global tech leader.", sponsored=True),
    _job("job_google_tax_manager", "Tax Manager (India)", "Google India", "Bengaluru", "full_time", 5, 8, 3800000, 5500000, ["Tax", "International"], "Complex international tax structuring in a top-tier tech firm."),
    _job("job_dmart_fin_analyst", "Financial Analyst", "Avenue Supermarts (DMart)", "Mumbai", "full_time", 1, 2, 1000000, 1500000, ["FP&A", "Retail"], "Corporate finance role at India's most profitable listed retailer."),
    _job("job_reliance_ma", "Senior Manager, Corporate Development", "Reliance Industries", "Mumbai", "full_time", 6, 10, 4500000, 7000000, ["M&A", "Corporate"], "Deal execution + strategic investments. High-visibility, high-pressure role."),
]

# ---- Career Referrals (15) ----
def _ref(rid, title, description, client_type, service_needed, est_value, location, applications=0):
    return {
        "referral_id": rid, "title": title, "description_markdown": description,
        "client_type": client_type, "service_needed": service_needed,
        "estimated_value": est_value, "location": location,
        "is_open": True, "applications_count": applications,
        "posted_by": None, "posted_by_initials": "R.G.",
    }

CAREER_REFERRALS = [
    _ref("ref_saas_stat_audit", "Statutory Auditor — Series A SaaS (₹5cr revenue)", "Mumbai-based B2B SaaS closing Series A. Looking for a CA/firm to run FY26 stat audit. Roughly 30-40 partner hours. Client wants continuity for FY27+.", "startup", ["Audit", "Ind-AS"], 500000, "Mumbai", applications=3),
    _ref("ref_delhi_gst", "GST Advisor — Delhi FMCG (₹80cr revenue)", "Family-owned FMCG business needs GST consulting + monthly filing help. Multi-state operations, some litigation.", "sme", ["GST"], 300000, "Delhi"),
    _ref("ref_blr_transfer_pricing", "TP Advisor — Bengaluru IT Services Firm", "₹200cr revenue IT services firm setting up US subsidiary. Need TP documentation + advisory. 6-month engagement.", "sme", ["Transfer Pricing"], 800000, "Bengaluru", applications=6),
    _ref("ref_startup_cfo_fractional", "Fractional CFO — Fintech Startup (Series B)", "Series B fintech, 20 people, ₹40cr ARR. Need a fractional CFO for 6 months, ~15hrs/week. Cap table, fundraise support, board reporting.", "startup", ["CFO", "Fundraising"], 900000, "Remote", applications=8),
    _ref("ref_mumbai_stat_listed", "Statutory Auditor — Listed Company (Mid-cap)", "Listed mid-cap company, ~₹300cr revenue. Existing auditor rotating out. Formal RFP by Oct.", "corporate", ["Audit"], 1500000, "Mumbai"),
    _ref("ref_pune_ind_as", "Ind-AS Conversion — Manufacturing Firm", "Pune manufacturer moving from IGAAP to Ind-AS. Need 3-month engagement to guide finance team.", "sme", ["Ind-AS", "IFRS"], 400000, "Pune", applications=2),
    _ref("ref_chennai_direct_tax", "Direct Tax Litigation — Chennai HNI Client", "HNI client with 3 pending tax cases at CIT(A). Need experienced litigator to represent + draft submissions.", "individual", ["Direct Tax", "Litigation"], 250000, "Chennai"),
    _ref("ref_ecom_gst_multi", "Multi-State GST — E-commerce Startup", "Growing D2C brand — 12 state warehouses. Full-service GST setup + compliance for FY26.", "startup", ["GST", "Compliance"], 600000, "Bengaluru", applications=4),
    _ref("ref_family_office", "Family Office CFO — Ahmedabad", "Second-generation family office, ₹200cr AUM. Need a resident CFO to consolidate + report. Full-time preferred.", "individual", ["CFO", "Investment"], 2400000, "Ahmedabad"),
    _ref("ref_ngo_audit", "NGO Audit (12A/80G registered)", "Delhi-based education NGO, ₹15cr annual. Need statutory audit + FCRA compliance.", "corporate", ["Audit", "FCRA"], 150000, "Delhi", applications=1),
    _ref("ref_forensic_investigation", "Forensic Review — Suspected Fraud", "Mid-tier logistics firm suspects internal fraud in procurement. Need discreet forensic review.", "corporate", ["Forensic", "Investigation"], 700000, "Mumbai"),
    _ref("ref_healthcare_valuation", "Valuation for Series C — Healthtech", "Healthtech raising Series C, need independent valuation report + comparables analysis.", "startup", ["Valuation"], 400000, "Bengaluru", applications=2),
    _ref("ref_realestate_sfm", "SFM Advisory — Real Estate Group", "Real estate developer restructuring debt. Need CA with FM/SFM expertise for negotiation support.", "sme", ["SFM", "Advisory"], 600000, "Mumbai"),
    _ref("ref_esop_setup", "ESOP Design — Fintech Startup", "20-person fintech pre-Series A. Need ESOP scheme design + tax structuring + shareholder docs.", "startup", ["ESOP", "Tax"], 250000, "Bengaluru", applications=5),
    _ref("ref_edtech_ind_as", "IPO Readiness Diagnostic — Edtech", "Edtech company aiming for IPO in 18 months. Need diagnostic on Ind-AS gaps + governance readiness.", "startup", ["IPO", "Governance"], 900000, "Delhi"),
]

# ---- Mentors (8) — created as verified CA users during seed ----
MENTORS = [
    {"key": "big4_audit_alum", "name": "Aryan G.", "email": "mentor_aryan@cagrid.in", "membership": "234512",
     "specializations": ["Audit", "Big 4", "IFRS"], "hourly_rate_inr": 3000,
     "bio": "Ex-Big-4 audit manager, 8 years. Left as Manager in 2023 to co-found a boutique. Available for career-map + Big-4 prep chats.",
     "availability_slots": [{"day": "Sat", "start": "10:00", "end": "13:00"}, {"day": "Sun", "start": "16:00", "end": "19:00"}]},
    {"key": "gst_tp_specialist", "name": "Priya M.", "email": "mentor_priya@cagrid.in", "membership": "301122",
     "specializations": ["GST", "Transfer Pricing", "International Tax"], "hourly_rate_inr": 3500,
     "bio": "12 years in tax — 6 at Big-4, now Partner at a mid-tier. Deep TP + international tax practice. Book me for tax career deep-dives.",
     "availability_slots": [{"day": "Wed", "start": "19:00", "end": "21:30"}, {"day": "Sat", "start": "09:00", "end": "12:00"}]},
    {"key": "startup_cfo_advisor", "name": "Rohan D.", "email": "mentor_rohan@cagrid.in", "membership": "412234",
     "specializations": ["Startup CFO", "Fundraising", "ESOP"], "hourly_rate_inr": 4000,
     "bio": "Ex-CA turned Series-B fintech CFO. Ran 3 startup finance functions over 10 years. Talk to me about the startup path, cap tables, ESOPs.",
     "availability_slots": [{"day": "Tue", "start": "20:00", "end": "22:00"}, {"day": "Fri", "start": "20:00", "end": "22:00"}]},
    {"key": "forensic_specialist", "name": "Vandana K.", "email": "mentor_vandana@cagrid.in", "membership": "298721",
     "specializations": ["Forensic", "Investigation", "Fraud"], "hourly_rate_inr": 3200,
     "bio": "Forensic partner, 15 years. Led 40+ engagements. Discreet, structured discussions on the forensic career + case-cracking mindset.",
     "availability_slots": [{"day": "Thu", "start": "19:00", "end": "21:00"}, {"day": "Sun", "start": "11:00", "end": "13:00"}]},
    {"key": "corporate_finance_veteran", "name": "Karan V.", "email": "mentor_karan@cagrid.in", "membership": "156889",
     "specializations": ["Corporate Finance", "M&A", "Treasury"], "hourly_rate_inr": 3800,
     "bio": "Ex-JP Morgan India, currently Head of Corp Dev at a listed mid-cap. Talk M&A, treasury, board conversations.",
     "availability_slots": [{"day": "Sat", "start": "14:00", "end": "17:00"}, {"day": "Sun", "start": "14:00", "end": "17:00"}]},
    {"key": "ca_final_ranker", "name": "Meera S.", "email": "mentor_meera@cagrid.in", "membership": "376012",
     "specializations": ["Exam Strategy", "CA Final", "Mindset"], "hourly_rate_inr": 1500,
     "bio": "AIR 8 CA Final Nov 2023. Now at Big-4 audit. Book me for exam-prep, revision strategies, mock analysis. Newer CA — more affordable.",
     "availability_slots": [{"day": "Mon", "start": "20:00", "end": "22:00"}, {"day": "Wed", "start": "20:00", "end": "22:00"}, {"day": "Sat", "start": "10:00", "end": "12:00"}]},
    {"key": "own_practice", "name": "Sudhir T.", "email": "mentor_sudhir@cagrid.in", "membership": "089215",
     "specializations": ["Practice", "Client Acquisition", "GST"], "hourly_rate_inr": 2500,
     "bio": "20 years in own practice, small firm with ₹3cr revenue. Real talk on building a practice from scratch — the actual first 5 years.",
     "availability_slots": [{"day": "Fri", "start": "18:00", "end": "20:00"}, {"day": "Sat", "start": "17:00", "end": "19:00"}]},
    {"key": "cfa_ca_combo", "name": "Nikhil B.", "email": "mentor_nikhil@cagrid.in", "membership": "254478",
     "specializations": ["CFA + CA combo", "Investment Banking", "Equity Research"], "hourly_rate_inr": 3500,
     "bio": "CA + CFA charterholder. 7 years in equity research + M&A. Discussion focus: CFA planning, investment banking transitions.",
     "availability_slots": [{"day": "Sun", "start": "10:00", "end": "13:00"}]},
]
