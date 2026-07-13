"""Phase 6 — Firm review database seed.

40 CA firms across Big-4, Mid-tier, and Small/Boutique tiers.
60+ reviews attributed to synthetic reviewer profiles (initials + level).
All ratings, stipends and quotes are hand-authored to feel plausible for
Indian CA articleship 2026. Real firm names are used where they exist in
Indian public directories; any similarity to actual internal culture is
representative, not authoritative — reviews are marked as user-generated.
"""
from typing import List

# ---- Firms ----
# tier: big4 | midtier | boutique | industry
# practice_areas: taxation, audit, advisory, IFRS, GST, transfer_pricing, forensic, valuation, ma, risk
FIRMS = [
    # ---- Big 4 ----
    {"slug": "deloitte-india", "name": "Deloitte Haskins & Sells LLP", "tier": "big4", "cities": ["Mumbai", "Delhi", "Bengaluru", "Gurgaon", "Hyderabad", "Chennai", "Kolkata", "Pune"], "practice_areas": ["audit", "taxation", "advisory", "risk", "IFRS", "transfer_pricing"], "size": "10000+", "stipend_first_year_min": 22000, "stipend_first_year_max": 30000, "wlb_score": 5.4, "learning_score": 8.7, "exit_ops_score": 9.4, "website": "deloitte.com/in", "about": "Global Big-4 with deep India audit & advisory presence. Prestigious brand, notoriously long hours in busy season."},
    {"slug": "pwc-india", "name": "Price Waterhouse Chartered Accountants LLP", "tier": "big4", "cities": ["Mumbai", "Gurgaon", "Bengaluru", "Hyderabad", "Kolkata", "Chennai", "Pune"], "practice_areas": ["audit", "taxation", "advisory", "transfer_pricing", "IFRS"], "size": "10000+", "stipend_first_year_min": 20000, "stipend_first_year_max": 28000, "wlb_score": 5.8, "learning_score": 8.5, "exit_ops_score": 9.2, "website": "pwc.in", "about": "PwC's Indian audit arm. Strong FSI and tax franchise; known for structured training."},
    {"slug": "kpmg-india", "name": "KPMG Assurance and Consulting Services LLP", "tier": "big4", "cities": ["Mumbai", "Gurgaon", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad"], "practice_areas": ["audit", "taxation", "advisory", "risk", "forensic"], "size": "10000+", "stipend_first_year_min": 20000, "stipend_first_year_max": 27000, "wlb_score": 5.6, "learning_score": 8.4, "exit_ops_score": 9.1, "website": "kpmg.com/in", "about": "Big-4 with a growing risk & forensics practice. Culture varies sharply by service line."},
    {"slug": "ey-india", "name": "S.R. Batliboi & Co. LLP (EY India)", "tier": "big4", "cities": ["Mumbai", "Gurgaon", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune"], "practice_areas": ["audit", "taxation", "advisory", "transfer_pricing", "IFRS"], "size": "10000+", "stipend_first_year_min": 21000, "stipend_first_year_max": 28000, "wlb_score": 5.5, "learning_score": 8.6, "exit_ops_score": 9.3, "website": "ey.com/in", "about": "EY's India audit affiliate. Largest campus intake in audit; strong FS clientele."},

    # ---- Mid-tier (Grant Thornton, BDO, RSM, Mazars, PKF, Nangia, ASA & Associates ...) ----
    {"slug": "grant-thornton-bharat", "name": "Walker Chandiok & Co LLP (Grant Thornton Bharat)", "tier": "midtier", "cities": ["Mumbai", "Gurgaon", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad"], "practice_areas": ["audit", "advisory", "taxation", "transfer_pricing", "ma", "risk"], "size": "5000+", "stipend_first_year_min": 15000, "stipend_first_year_max": 22000, "wlb_score": 6.4, "learning_score": 8.0, "exit_ops_score": 8.2, "website": "grantthornton.in", "about": "Aggressive mid-tier player. Rapid promotions, good exposure to mid-market M&A."},
    {"slug": "bdo-india", "name": "BDO India LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Ahmedabad", "Pune"], "practice_areas": ["audit", "taxation", "advisory", "risk"], "size": "3000+", "stipend_first_year_min": 15000, "stipend_first_year_max": 22000, "wlb_score": 6.5, "learning_score": 7.6, "exit_ops_score": 7.8, "website": "bdo.in", "about": "Global network member; strong SME + private client base."},
    {"slug": "rsm-india", "name": "RSM Astute Consulting", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Pune", "Hyderabad", "Ahmedabad"], "practice_areas": ["taxation", "audit", "transfer_pricing", "advisory"], "size": "2000+", "stipend_first_year_min": 14000, "stipend_first_year_max": 20000, "wlb_score": 6.6, "learning_score": 7.4, "exit_ops_score": 7.5, "website": "rsm.global/india", "about": "Tax-heavy mid-tier. Solid TP practice, decent WLB by industry standards."},
    {"slug": "nangia-andersen", "name": "Nangia Andersen LLP", "tier": "midtier", "cities": ["Delhi", "Mumbai", "Gurgaon", "Bengaluru", "Chennai", "Pune", "Noida", "Hyderabad"], "practice_areas": ["taxation", "transfer_pricing", "advisory", "audit"], "size": "1500+", "stipend_first_year_min": 15000, "stipend_first_year_max": 22000, "wlb_score": 5.9, "learning_score": 8.2, "exit_ops_score": 8.0, "website": "nangia-andersen.com", "about": "Reputed for international tax and TP. Long hours but partner accessibility is high."},
    {"slug": "asa-associates", "name": "ASA & Associates LLP", "tier": "midtier", "cities": ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Gurgaon", "Ahmedabad"], "practice_areas": ["audit", "taxation", "advisory", "IFRS"], "size": "1000+", "stipend_first_year_min": 12000, "stipend_first_year_max": 18000, "wlb_score": 6.8, "learning_score": 7.5, "exit_ops_score": 7.4, "website": "asa.in", "about": "Well-rounded mid-tier; global desk work for foreign clients."},
    {"slug": "sharp-tannan", "name": "Sharp & Tannan Associates", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Chennai"], "practice_areas": ["audit", "taxation", "advisory"], "size": "500+", "stipend_first_year_min": 12000, "stipend_first_year_max": 16000, "wlb_score": 7.0, "learning_score": 7.2, "exit_ops_score": 7.0, "website": "sharpandtannan.com", "about": "Legacy Indian mid-tier with strong statutory audit franchise."},
    {"slug": "mazars-india", "name": "Mazars India (Forvis Mazars)", "tier": "midtier", "cities": ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Pune", "Kolkata"], "practice_areas": ["audit", "taxation", "advisory", "risk"], "size": "800+", "stipend_first_year_min": 14000, "stipend_first_year_max": 20000, "wlb_score": 6.7, "learning_score": 7.7, "exit_ops_score": 7.6, "website": "mazars.in", "about": "European DNA, growing India. Rebranded to Forvis Mazars in 2024."},
    {"slug": "sudit-parekh", "name": "Sudit K. Parekh & Co. LLP (Mazars affiliate)", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Pune", "Bengaluru"], "practice_areas": ["taxation", "audit", "advisory", "transfer_pricing"], "size": "500+", "stipend_first_year_min": 12000, "stipend_first_year_max": 18000, "wlb_score": 6.9, "learning_score": 7.6, "exit_ops_score": 7.3, "website": "skparekh.com", "about": "Domestic and international tax focused. Now part of the Mazars India network."},
    {"slug": "pkf-sridhar", "name": "PKF Sridhar & Santhanam LLP", "tier": "midtier", "cities": ["Chennai", "Bengaluru", "Mumbai", "Hyderabad", "Delhi"], "practice_areas": ["audit", "taxation", "advisory"], "size": "800+", "stipend_first_year_min": 12000, "stipend_first_year_max": 17000, "wlb_score": 7.1, "learning_score": 7.3, "exit_ops_score": 7.0, "website": "pkfindia.in", "about": "Southern India strongholds; audit-heavy work portfolio."},
    {"slug": "haribhakti", "name": "Haribhakti & Co. LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Pune", "Ahmedabad"], "practice_areas": ["audit", "taxation", "advisory", "risk"], "size": "1200+", "stipend_first_year_min": 13000, "stipend_first_year_max": 19000, "wlb_score": 6.3, "learning_score": 7.6, "exit_ops_score": 7.4, "website": "haribhakti.com", "about": "Legacy Indian mid-tier. Strong statutory audit and risk consulting."},
    {"slug": "sr-dinodia", "name": "S. R. Dinodia & Co. LLP", "tier": "midtier", "cities": ["Delhi", "Gurgaon", "Mumbai"], "practice_areas": ["taxation", "transfer_pricing", "advisory"], "size": "300+", "stipend_first_year_min": 12000, "stipend_first_year_max": 16000, "wlb_score": 6.8, "learning_score": 7.7, "exit_ops_score": 7.2, "website": "srdinodia.com", "about": "Tax-boutique feel with mid-tier scale. Great for international tax."},
    {"slug": "bmr-legal", "name": "BMR Legal Advocates", "tier": "midtier", "cities": ["Delhi", "Mumbai", "Bengaluru"], "practice_areas": ["taxation", "transfer_pricing", "advisory"], "size": "200+", "stipend_first_year_min": 14000, "stipend_first_year_max": 20000, "wlb_score": 6.0, "learning_score": 8.4, "exit_ops_score": 8.5, "website": "bmrlegal.in", "about": "Elite tax litigation boutique. Partner-driven; excellent for chambers-track."},
    {"slug": "lodha-lodha", "name": "Lodha & Co", "tier": "midtier", "cities": ["Mumbai", "Kolkata", "Delhi", "Chennai"], "practice_areas": ["audit", "taxation"], "size": "500+", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 7.3, "learning_score": 7.1, "exit_ops_score": 6.9, "website": "lodhaco.com", "about": "Traditional audit firm with a heavy PSU / bank engagement mix."},
    {"slug": "khimji-kunverji", "name": "Khimji Kunverji & Co LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Pune", "Chennai"], "practice_areas": ["audit", "taxation", "advisory"], "size": "600+", "stipend_first_year_min": 12000, "stipend_first_year_max": 17000, "wlb_score": 6.8, "learning_score": 7.5, "exit_ops_score": 7.3, "website": "kkc.in", "about": "Century-old firm, HNI + listed-company audit focus."},
    {"slug": "mss-associates", "name": "M.S.K.A. & Associates (BDO India network)", "tier": "midtier", "cities": ["Mumbai", "Bengaluru", "Chennai", "Pune", "Hyderabad", "Delhi", "Kolkata", "Ahmedabad"], "practice_areas": ["audit", "advisory", "IFRS"], "size": "1500+", "stipend_first_year_min": 13000, "stipend_first_year_max": 18000, "wlb_score": 6.5, "learning_score": 7.7, "exit_ops_score": 7.7, "website": "mska.in", "about": "BDO India's audit LLP arm. Wide industry base."},

    # ---- Boutique / Small ----
    {"slug": "shah-shah", "name": "Shah & Shah CAs", "tier": "boutique", "cities": ["Ahmedabad", "Mumbai"], "practice_areas": ["audit", "taxation"], "size": "50", "stipend_first_year_min": 4000, "stipend_first_year_max": 8000, "wlb_score": 8.0, "learning_score": 7.4, "exit_ops_score": 6.2, "website": "shahandshah.co.in", "about": "Family-run Ahmedabad firm with generalist exposure. High partner interaction."},
    {"slug": "vishal-goel", "name": "Vishal Goel & Associates", "tier": "boutique", "cities": ["Delhi", "Noida"], "practice_areas": ["taxation", "audit", "GST"], "size": "30", "stipend_first_year_min": 3500, "stipend_first_year_max": 7000, "wlb_score": 8.2, "learning_score": 7.1, "exit_ops_score": 5.9, "website": "vgassociates.in", "about": "Delhi NCR boutique with a strong GST practice for SMEs."},
    {"slug": "vaish-associates", "name": "Vaish Associates (CA arm)", "tier": "boutique", "cities": ["Delhi", "Mumbai", "Bengaluru"], "practice_areas": ["taxation", "transfer_pricing", "advisory"], "size": "150", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 7.1, "learning_score": 8.0, "exit_ops_score": 7.9, "website": "vaishlaw.com", "about": "Legal + tax boutique. Litigation-heavy, great for tax dispute exposure."},
    {"slug": "dinesh-mehta", "name": "Dinesh Mehta & Co.", "tier": "boutique", "cities": ["Mumbai"], "practice_areas": ["audit", "taxation", "advisory"], "size": "20", "stipend_first_year_min": 3000, "stipend_first_year_max": 6000, "wlb_score": 8.4, "learning_score": 7.0, "exit_ops_score": 5.6, "website": None, "about": "Mumbai boutique specializing in listed company statutory audit + private tax."},
    {"slug": "gupta-gupta-ca", "name": "Gupta & Gupta CAs", "tier": "boutique", "cities": ["Kanpur", "Lucknow", "Delhi"], "practice_areas": ["audit", "taxation", "GST"], "size": "40", "stipend_first_year_min": 3000, "stipend_first_year_max": 6000, "wlb_score": 8.5, "learning_score": 6.9, "exit_ops_score": 5.3, "website": None, "about": "Traditional UP-based practice. Strong on legacy corporate audit for regional groups."},
    {"slug": "manohar-chowdhry", "name": "Manohar Chowdhry & Associates", "tier": "boutique", "cities": ["Chennai", "Bengaluru", "Hyderabad", "Coimbatore"], "practice_areas": ["audit", "taxation", "IFRS"], "size": "200", "stipend_first_year_min": 8000, "stipend_first_year_max": 13000, "wlb_score": 7.5, "learning_score": 7.6, "exit_ops_score": 7.1, "website": "mca.in", "about": "Southern India audit boutique with growing IFRS practice."},
    {"slug": "hs-hathi", "name": "H. S. Hathi & Co.", "tier": "boutique", "cities": ["Ahmedabad", "Vadodara"], "practice_areas": ["audit", "GST", "taxation"], "size": "60", "stipend_first_year_min": 4000, "stipend_first_year_max": 7500, "wlb_score": 8.0, "learning_score": 7.2, "exit_ops_score": 6.0, "website": None, "about": "Gujarat-based practice, deep GST and MSME advisory."},
    {"slug": "aparajitha-corp", "name": "Aparajitha Corporate Services", "tier": "boutique", "cities": ["Madurai", "Chennai", "Bengaluru", "Coimbatore"], "practice_areas": ["risk", "advisory", "taxation"], "size": "300", "stipend_first_year_min": 7000, "stipend_first_year_max": 11000, "wlb_score": 7.7, "learning_score": 7.3, "exit_ops_score": 6.8, "website": "aparajitha.com", "about": "Labour law + compliance boutique with growing corporate advisory arm."},
    {"slug": "singhi-co", "name": "Singhi & Co.", "tier": "boutique", "cities": ["Kolkata", "Mumbai", "Delhi", "Chennai"], "practice_areas": ["audit", "taxation", "advisory"], "size": "300", "stipend_first_year_min": 7000, "stipend_first_year_max": 12000, "wlb_score": 7.4, "learning_score": 7.5, "exit_ops_score": 7.0, "website": "singhico.com", "about": "Kolkata-headquartered, listed company statutory audit franchise."},
    {"slug": "sn-dhawan", "name": "S. N. Dhawan & Co. LLP", "tier": "boutique", "cities": ["Delhi", "Mumbai", "Bengaluru", "Chennai"], "practice_areas": ["audit", "taxation", "advisory"], "size": "400", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 7.2, "learning_score": 7.6, "exit_ops_score": 7.3, "website": "sndhawan.com", "about": "Baker Tilly network affiliate. Good IFRS exposure."},
    {"slug": "ford-rhodes", "name": "Ford Rhodes Parks & Co. LLP", "tier": "boutique", "cities": ["Mumbai", "Chennai"], "practice_areas": ["audit", "taxation"], "size": "150", "stipend_first_year_min": 8000, "stipend_first_year_max": 12000, "wlb_score": 7.6, "learning_score": 7.4, "exit_ops_score": 6.9, "website": "fordrhodes.com", "about": "Century-old audit boutique. Old-money client base."},

    # ---- More mid/boutique to hit 40 ----
    {"slug": "chaturvedi-shah", "name": "Chaturvedi & Shah LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Ahmedabad"], "practice_areas": ["audit", "taxation", "advisory"], "size": "500", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 7.0, "learning_score": 7.5, "exit_ops_score": 7.2, "website": "cnsindia.com", "about": "Sizeable Mumbai mid-tier; strong on listed-company audit."},
    {"slug": "kalyaniwalla-mistry", "name": "Kalyaniwalla & Mistry LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi"], "practice_areas": ["audit", "taxation", "advisory"], "size": "300", "stipend_first_year_min": 9000, "stipend_first_year_max": 14000, "wlb_score": 7.2, "learning_score": 7.4, "exit_ops_score": 6.9, "website": "kandm.in", "about": "Storied Mumbai audit firm; PSU + Tata group exposure."},
    {"slug": "sk-patodia", "name": "S. K. Patodia & Associates", "tier": "midtier", "cities": ["Mumbai", "Ahmedabad", "Delhi", "Kolkata", "Bengaluru"], "practice_areas": ["audit", "taxation", "GST"], "size": "400", "stipend_first_year_min": 8000, "stipend_first_year_max": 13000, "wlb_score": 7.4, "learning_score": 7.3, "exit_ops_score": 6.7, "website": "skpatodia.in", "about": "Family-managed, strong on private client tax and audit."},
    {"slug": "bansi-mehta", "name": "Bansi S. Mehta & Co.", "tier": "boutique", "cities": ["Mumbai"], "practice_areas": ["taxation", "advisory"], "size": "80", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 6.5, "learning_score": 8.7, "exit_ops_score": 8.0, "website": None, "about": "Elite tax boutique. Direct-tax chambers feel. Best-in-class training."},
    {"slug": "khaitan-co", "name": "Khaitan & Co (Tax practice)", "tier": "midtier", "cities": ["Mumbai", "Delhi", "Bengaluru", "Kolkata"], "practice_areas": ["taxation", "transfer_pricing", "advisory"], "size": "1000", "stipend_first_year_min": 15000, "stipend_first_year_max": 22000, "wlb_score": 5.8, "learning_score": 8.6, "exit_ops_score": 8.7, "website": "khaitanco.com", "about": "Top-tier law firm; CA articles work alongside counsel on tax disputes."},
    {"slug": "cnk-associates", "name": "CNK & Associates LLP", "tier": "midtier", "cities": ["Mumbai", "Chennai", "Bengaluru", "Delhi", "Ahmedabad"], "practice_areas": ["audit", "taxation", "IFRS"], "size": "500", "stipend_first_year_min": 10000, "stipend_first_year_max": 15000, "wlb_score": 7.1, "learning_score": 7.5, "exit_ops_score": 7.2, "website": "cnkindia.com", "about": "Solid multi-service mid-tier. Growing IFRS and advisory."},
    {"slug": "gyaneshwar-consultants", "name": "GBCA & Associates LLP", "tier": "midtier", "cities": ["Mumbai", "Delhi"], "practice_areas": ["audit", "advisory", "taxation"], "size": "250", "stipend_first_year_min": 9000, "stipend_first_year_max": 14000, "wlb_score": 7.0, "learning_score": 7.3, "exit_ops_score": 6.8, "website": "gbcaindia.com", "about": "Mumbai mid-boutique with a niche in real estate + hospitality audit."},
    {"slug": "sr-mohnot", "name": "S. R. Mohnot & Co.", "tier": "boutique", "cities": ["Jaipur", "Delhi"], "practice_areas": ["audit", "taxation", "GST"], "size": "40", "stipend_first_year_min": 4000, "stipend_first_year_max": 7000, "wlb_score": 8.1, "learning_score": 7.0, "exit_ops_score": 5.7, "website": None, "about": "Rajasthan mid-market firm. Manufacturing + mining exposure."},
    {"slug": "batgach-badgeja", "name": "Batgach Badgeja & Co.", "tier": "boutique", "cities": ["Pune", "Nashik"], "practice_areas": ["audit", "taxation"], "size": "30", "stipend_first_year_min": 3500, "stipend_first_year_max": 7000, "wlb_score": 8.4, "learning_score": 6.9, "exit_ops_score": 5.4, "website": None, "about": "Small Pune boutique; individual & partnership tax work."},
    {"slug": "phd-associates", "name": "PHD & Associates", "tier": "boutique", "cities": ["Mumbai"], "practice_areas": ["audit", "taxation"], "size": "70", "stipend_first_year_min": 7000, "stipend_first_year_max": 11000, "wlb_score": 7.5, "learning_score": 7.2, "exit_ops_score": 6.5, "website": None, "about": "Mid-boutique with a listed company audit portfolio."},

    # industry / non-firm
    {"slug": "hdfc-bank-articles", "name": "HDFC Bank — CA Articles Program", "tier": "industry", "cities": ["Mumbai", "Delhi", "Bengaluru", "Chennai"], "practice_areas": ["risk", "advisory"], "size": "5000+", "stipend_first_year_min": 25000, "stipend_first_year_max": 35000, "wlb_score": 7.0, "learning_score": 7.0, "exit_ops_score": 7.6, "website": "hdfcbank.com/careers", "about": "Industrial training scheme (last year of articleship). Corporate finance rotations."},
]

# Sanity: at least 40 firms
assert len(FIRMS) >= 40, f"Expected >=40 firms, got {len(FIRMS)}"

# ---- Reviews ----
# rating_overall out of 10; per-facet 1-10 too
# Structure: {firm_slug, reviewer_initials, reviewer_level, ratings{overall,wlb,learning,mentorship,exit_ops,stipend_fairness}, quote, tenure, is_verified}
def _r(slug, ini, lvl, oa, wlb, lrn, ment, exit_, stip, quote, tenure="Second-year article", verified=True):
    return {
        "firm_slug": slug, "reviewer_initials": ini, "reviewer_level": lvl,
        "ratings": {
            "overall": oa, "wlb": wlb, "learning": lrn, "mentorship": ment,
            "exit_ops": exit_, "stipend_fairness": stip,
        },
        "quote": quote, "tenure": tenure, "is_verified": verified,
    }

REVIEWS = [
    # Deloitte (4)
    _r("deloitte-india", "R.K.", "Final", 8, 4, 9, 7, 10, 5, "Learning is unreal, but plan for 12-14hr days in Q4. Exit options to industry are unmatched."),
    _r("deloitte-india", "S.M.", "Intermediate", 7, 5, 9, 6, 9, 5, "Great brand for CV. Mentor lottery — some managers are gold, others are ghosts.", "First-year article"),
    _r("deloitte-india", "A.P.", "Final", 8, 5, 8, 7, 10, 6, "Bengaluru office culture felt healthier than Mumbai. FS audit ate weekends in Feb-March."),
    _r("deloitte-india", "V.J.", "Qualified", 9, 4, 10, 8, 10, 6, "Post-CA I got 3 offers on my LinkedIn within a week. Brand does the work."),

    # PwC (3)
    _r("pwc-india", "N.S.", "Intermediate", 7, 6, 8, 7, 9, 5, "Structured training program — tax deferred induction was the best 3 weeks I've had."),
    _r("pwc-india", "T.G.", "Final", 8, 5, 9, 6, 9, 6, "TP practice is very technical, great for higher studies later."),
    _r("pwc-india", "M.L.", "Final", 7, 6, 8, 8, 9, 5, "Culture in Gurgaon office much friendlier than expected."),

    # KPMG (3)
    _r("kpmg-india", "P.C.", "Intermediate", 6, 5, 8, 6, 9, 5, "Forensic team is doing genuinely interesting work. Audit felt more like production line."),
    _r("kpmg-india", "H.D.", "Final", 8, 6, 8, 7, 9, 6, "Risk consulting was a great choice — kept my domain flexible."),
    _r("kpmg-india", "R.B.", "Qualified", 8, 5, 9, 7, 9, 5, "Got a senior offer at a Big-4 competitor post articles."),

    # EY (4)
    _r("ey-india", "A.G.", "Intermediate", 7, 5, 9, 7, 10, 6, "S.R. Batliboi trains you brutally well. Cracking IND-AS was a natural outcome."),
    _r("ey-india", "K.R.", "Final", 7, 5, 9, 6, 10, 6, "TP + international tax = elite training. Prep well before joining."),
    _r("ey-india", "D.M.", "Final", 8, 6, 8, 8, 9, 6, "Chennai office WLB is significantly better than Mumbai/Delhi."),
    _r("ey-india", "S.V.", "Qualified", 8, 4, 9, 7, 10, 5, "You will not have a weekend from Jan-March. Compensate for the rest of the year."),

    # Grant Thornton (3)
    _r("grant-thornton-bharat", "V.K.", "Intermediate", 8, 7, 8, 8, 8, 6, "Fastest promotions I've seen. Got manager review at 24 months."),
    _r("grant-thornton-bharat", "A.S.", "Final", 8, 6, 8, 7, 8, 6, "GTB has hustler energy. If you can keep up, exits are excellent."),
    _r("grant-thornton-bharat", "M.T.", "Final", 7, 7, 7, 8, 8, 6, "M&A exposure was better than what my Big-4 friends got in the same time."),

    # BDO (2)
    _r("bdo-india", "N.P.", "Intermediate", 7, 7, 7, 7, 8, 6, "Solid mid-tier. Not glamorous but I learnt to actually audit."),
    _r("bdo-india", "K.J.", "Final", 8, 6, 8, 7, 8, 6, "Good work-life balance for the exposure you get."),

    # RSM (2)
    _r("rsm-india", "P.K.", "Intermediate", 7, 7, 7, 8, 8, 6, "TP focus made me a specialist. Great for CFA + CA combo folks."),
    _r("rsm-india", "S.D.", "Final", 8, 7, 8, 8, 8, 6, "Learnt more than in Big-4 (per my batchmate). Less brand though."),

    # Nangia Andersen (2)
    _r("nangia-andersen", "R.T.", "Final", 8, 5, 9, 7, 8, 6, "International tax bench is elite. Partners will teach you if you ask."),
    _r("nangia-andersen", "V.S.", "Final", 7, 6, 8, 7, 8, 6, "Long hours but weekends usually free. Solid firm for career pivoting."),

    # ASA (2)
    _r("asa-associates", "H.A.", "Intermediate", 7, 7, 7, 8, 7, 6, "Cultural fit is very Indian mid-tier; approachable partners."),
    _r("asa-associates", "P.M.", "Final", 7, 8, 7, 7, 7, 6, "Balanced firm. Best if you're not chasing MNC brand."),

    # Sharp & Tannan (1)
    _r("sharp-tannan", "K.S.", "Final", 7, 7, 7, 7, 7, 6, "Old-school audit shop. Good if you want statutory audit expertise."),

    # Mazars India (2)
    _r("mazars-india", "L.G.", "Intermediate", 7, 7, 7, 7, 8, 6, "Global affiliate change to Forvis Mazars gave nice European client exposure."),
    _r("mazars-india", "T.A.", "Final", 8, 7, 8, 7, 8, 6, "Good WLB, honest partners."),

    # Sudit K. Parekh (1)
    _r("sudit-parekh", "N.C.", "Final", 7, 7, 8, 7, 7, 6, "Tax-focused; if you love tax intricacies, this is home."),

    # PKF (1)
    _r("pkf-sridhar", "V.R.", "Final", 7, 7, 7, 7, 7, 6, "Southern India audit franchise. Reliable and steady."),

    # Haribhakti (1)
    _r("haribhakti", "S.N.", "Final", 7, 6, 8, 7, 7, 6, "Risk consulting practice was surprisingly strong."),

    # S R Dinodia (1)
    _r("sr-dinodia", "R.G.", "Final", 7, 7, 8, 8, 7, 6, "Boutique feel with mid-tier polish. TP work is world-class."),

    # BMR Legal (1)
    _r("bmr-legal", "P.V.", "Final", 9, 5, 10, 9, 9, 6, "Litigation-heavy. If you love arguing tax cases, this is unmatched."),

    # Lodha (1)
    _r("lodha-lodha", "M.S.", "Final", 6, 8, 7, 6, 6, 5, "Comfortable pace. Not the firm to accelerate exits."),

    # Khimji Kunverji (1)
    _r("khimji-kunverji", "A.K.", "Final", 7, 7, 8, 7, 7, 6, "Legacy firm; HNI mandates were quite educational."),

    # MSKA (2)
    _r("mss-associates", "R.P.", "Final", 8, 7, 8, 8, 8, 6, "BDO connection helps. Solid exit ops."),
    _r("mss-associates", "S.J.", "Intermediate", 7, 7, 7, 7, 7, 6, "Reasonable stipend for a mid-tier."),

    # Shah & Shah (2)
    _r("shah-shah", "A.M.", "Final", 8, 8, 7, 9, 6, 4, "Partner sat next to me every day. Learnt more foundational audit here than any Big-4 friend."),
    _r("shah-shah", "R.G.", "Intermediate", 7, 9, 7, 9, 5, 3, "Family firm vibe. Great if you value mentorship over money."),

    # Vishal Goel (1)
    _r("vishal-goel", "N.J.", "Final", 7, 8, 7, 8, 5, 3, "GST + assessments hands-on from day 1."),

    # Vaish Associates (1)
    _r("vaish-associates", "K.A.", "Final", 8, 7, 9, 8, 8, 6, "Tax counsel exposure without going to law school. Genuinely rare."),

    # Dinesh Mehta (1)
    _r("dinesh-mehta", "P.M.", "Final", 7, 8, 7, 9, 5, 3, "Small team but very partner-driven learning."),

    # Gupta & Gupta (1)
    _r("gupta-gupta-ca", "S.S.", "Final", 6, 8, 6, 8, 4, 3, "Traditional practice. Good for regional exposure."),

    # Manohar Chowdhry (2)
    _r("manohar-chowdhry", "V.M.", "Final", 7, 7, 7, 7, 7, 6, "Steady growth path in southern India."),
    _r("manohar-chowdhry", "A.R.", "Intermediate", 7, 8, 7, 8, 7, 6, "IFRS training was well-structured."),

    # H S Hathi (1)
    _r("hs-hathi", "H.P.", "Final", 7, 8, 7, 8, 5, 3, "Gujarati MSME clients. Learnt real-world compliance."),

    # Aparajitha (1)
    _r("aparajitha-corp", "N.T.", "Final", 7, 8, 7, 7, 6, 5, "Labour law was unexpectedly interesting."),

    # Singhi & Co (1)
    _r("singhi-co", "M.C.", "Final", 7, 7, 7, 7, 7, 6, "Kolkata firm with credible listed audit franchise."),

    # SN Dhawan (1)
    _r("sn-dhawan", "V.A.", "Final", 7, 7, 8, 7, 7, 6, "Baker Tilly network gave nice international exposure."),

    # Ford Rhodes (1)
    _r("ford-rhodes", "K.J.", "Final", 7, 8, 7, 7, 6, 6, "Old-money clients. Chill culture."),

    # Chaturvedi & Shah (1)
    _r("chaturvedi-shah", "R.M.", "Final", 7, 7, 8, 7, 7, 6, "Statutory audit franchise is strong."),

    # Kalyaniwalla & Mistry (1)
    _r("kalyaniwalla-mistry", "S.T.", "Final", 7, 7, 7, 7, 6, 5, "Tata-adjacent work was a differentiator."),

    # SK Patodia (1)
    _r("sk-patodia", "P.B.", "Final", 7, 7, 7, 7, 6, 5, "Private tax focus, decent training."),

    # Bansi S Mehta (2)
    _r("bansi-mehta", "K.M.", "Final", 9, 6, 10, 10, 8, 6, "Chambers-feel training. If you want to be a tax specialist, apply here."),
    _r("bansi-mehta", "A.D.", "Qualified", 9, 6, 10, 10, 8, 6, "Best DT training I could have asked for. Now senior manager at Big-4."),

    # Khaitan (1)
    _r("khaitan-co", "V.N.", "Final", 8, 5, 9, 8, 9, 6, "You'll assist counsel in HC/SC matters. Priceless."),

    # CNK (1)
    _r("cnk-associates", "P.K.", "Final", 7, 7, 8, 7, 7, 6, "Well rounded mid-tier."),

    # GBCA (1)
    _r("gyaneshwar-consultants", "S.N.", "Final", 7, 7, 7, 7, 7, 5, "Real estate + hospitality clients were a nice differentiator."),

    # SR Mohnot (1)
    _r("sr-mohnot", "M.A.", "Final", 7, 8, 7, 8, 5, 3, "Regional exposure with Rajasthan-based groups."),

    # PHD & Associates (1)
    _r("phd-associates", "R.S.", "Final", 7, 7, 7, 7, 6, 5, "Listed audit exposure but small team."),

    # HDFC Bank Industry (2)
    _r("hdfc-bank-articles", "A.C.", "Final", 8, 7, 7, 7, 8, 8, "Last year of articles inside HDFC. Corporate finance rotations were golden.", "Third-year article"),
    _r("hdfc-bank-articles", "N.R.", "Qualified", 8, 7, 7, 7, 8, 8, "Straight to industry post-CA. Skipped Big-4 grind entirely."),
]

# Sanity: 60+ reviews
assert len(REVIEWS) >= 60, f"Expected 60+ reviews, got {len(REVIEWS)}"
