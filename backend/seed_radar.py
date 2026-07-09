"""Phase 4 Regulatory Radar seed — 28 realistic alerts spanning last 90 days.

Alerts reference the paper_code + chapter numbers seeded by seed_syllabus. We
don't hard-code chapter_ids (they're uuids generated at import), so `affected_topics`
uses `paper_code` + `chapter_numbers` and the API resolves numbers → real
chapter_ids at query time.
"""
from datetime import datetime, timedelta, timezone


def _days_ago(n):
    return datetime.now(timezone.utc) - timedelta(days=n)


REGULATORY_ALERTS = [
    # ---------- CRITICAL (5) ----------
    {
        "alert_id": "rad_budget26_ltcg",
        "title": "Budget 2026: LTCG on listed equity rate revised to 15%",
        "body_markdown": (
            "The Finance Bill 2026 has increased LTCG on listed equity shares "
            "and equity-oriented mutual funds from 12.5% to 15%, effective "
            "01-Apr-2026. The Sec 112A ₹1.25L exemption remains. Direct impact "
            "on capital gains computations in ITR-2 filings from AY 2026-27 "
            "onward; students should update chapter workings for FY26 finals."
        ),
        "source": "Finance Bill 2026 · Clause 39",
        "source_url": "https://www.indiabudget.gov.in/",
        "published_at": _days_ago(3),
        "impact_level": "critical",
        "affected_topics": [
            {"paper_code": "I3", "chapter_numbers": [5]},
            {"paper_code": "P4", "chapter_numbers": [6]},
        ],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_gst_iotc_amend",
        "title": "GST: Sec 16(4) ITC time limit extended by 60 days",
        "body_markdown": (
            "CBIC has notified an extension of the Section 16(4) time limit to "
            "claim ITC for FY 2024-25 invoices — now up to 30-Nov of the "
            "following FY (from 30-Sep). Aligns with the recent GSTR-3B due "
            "date changes. Retrospective effect for FY23-24 claims as well."
        ),
        "source": "CBIC Notification 12/2026-CT (14-May-2026)",
        "source_url": "https://cbic-gst.gov.in/",
        "published_at": _days_ago(8),
        "impact_level": "critical",
        "affected_topics": [
            {"paper_code": "I3", "chapter_numbers": [13]},
            {"paper_code": "P5", "chapter_numbers": [5]},
        ],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_indas_116_amend",
        "title": "Ind AS 116 amendment: Lease liability re-measurement clarified",
        "body_markdown": (
            "MCA has notified an amendment to Ind AS 116 (Leases) via the "
            "Companies (Indian Accounting Standards) Third Amendment Rules, "
            "2026. The change harmonises the treatment of lease-liability "
            "re-measurement on rent concessions with IFRS 16 as amended. "
            "Applicable to reporting periods commencing on or after 01-Apr-2026."
        ),
        "source": "MCA G.S.R. 421(E) dated 03-Jun-2026",
        "source_url": "https://www.mca.gov.in/",
        "published_at": _days_ago(15),
        "impact_level": "critical",
        "affected_topics": [
            {"paper_code": "I1", "chapter_numbers": [7]},
            {"paper_code": "P1", "chapter_numbers": [9]},
        ],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_caro_2026",
        "title": "CARO 2026 draft: Two new reporting clauses proposed",
        "body_markdown": (
            "MCA has released the draft Companies (Auditor's Report) Order, "
            "2026 for public consultation. Two new clauses proposed: (i) "
            "reporting on cybersecurity incidents disclosed in the year and "
            "(ii) reporting on Related Party Transactions with startups the "
            "company has invested in. Final notification expected before "
            "September 2026 audits."
        ),
        "source": "MCA Consultation Paper (28-Jun-2026)",
        "source_url": "https://www.mca.gov.in/",
        "published_at": _days_ago(11),
        "impact_level": "critical",
        "affected_topics": [
            {"paper_code": "I5", "chapter_numbers": [10]},
            {"paper_code": "P3", "chapter_numbers": [14]},
        ],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_icai_may26_dates",
        "title": "ICAI: May 2026 exam schedule + form availability window",
        "body_markdown": (
            "The Institute has notified the May 2026 exam schedule (Foundation "
            "3-9 May, Intermediate 10-25 May, Final 26 May - 11 Jun). "
            "Examination form window: 1-25 Feb 2026 (with late fee till 5 Mar). "
            "First attempt to have all Foundation papers under the revised "
            "syllabus with negative marking on MCQ sections."
        ),
        "source": "ICAI Announcement Ref: 13/EXAM/2026",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(2),
        "impact_level": "critical",
        "affected_topics": [
            {"paper_code": "F1", "chapter_numbers": []},
            {"paper_code": "I1", "chapter_numbers": []},
            {"paper_code": "P1", "chapter_numbers": []},
        ],
        "affected_levels": ["Foundation", "Intermediate", "Final", "Articleship"],
    },

    # ---------- MODERATE (11) ----------
    {
        "alert_id": "rad_cbdt_44ab_clar",
        "title": "CBDT circular clarifies Sec 44AB threshold post digital-txn",
        "body_markdown": (
            "CBDT Circular 8/2026 clarifies applicability of the ₹10 crore "
            "audit threshold under Sec 44AB where cash receipts + cash "
            "payments are within 5% of gross receipts. Includes worked "
            "example for professionals under Sec 44ADA and provides "
            "guidance on treatment of UPI receipts as non-cash."
        ),
        "source": "CBDT Circular 8/2026 dated 12-Jun-2026",
        "source_url": "https://incometaxindia.gov.in/",
        "published_at": _days_ago(20),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I3", "chapter_numbers": [4]}, {"paper_code": "P4", "chapter_numbers": [5]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_gst_einvoice_5cr",
        "title": "GST e-invoicing threshold lowered to ₹3 crore turnover",
        "body_markdown": (
            "CBIC Notification 18/2026-CT reduces the e-invoicing threshold "
            "from aggregate turnover of ₹5 crore to ₹3 crore w.e.f. "
            "01-Aug-2026. Small taxpayers should register for IRP and "
            "integrate their billing software; grace period of 90 days "
            "for penalty relief under Sec 122."
        ),
        "source": "CBIC Notification 18/2026-CT",
        "source_url": "https://cbic-gst.gov.in/",
        "published_at": _days_ago(28),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I3", "chapter_numbers": [15]}, {"paper_code": "P5", "chapter_numbers": [7]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_mca_llp_amend",
        "title": "MCA amends LLP (Amendment) Rules 2026: annual return format",
        "body_markdown": (
            "MCA has notified amendments to LLP annual return Form 11 to "
            "capture beneficial ownership details in line with the PMLA "
            "reporting requirements. Effective for FY25-26 filings."
        ),
        "source": "MCA G.S.R. 388(E)",
        "source_url": "https://www.mca.gov.in/",
        "published_at": _days_ago(32),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "F2", "chapter_numbers": [4]}, {"paper_code": "I2", "chapter_numbers": [12]}],
        "affected_levels": ["Foundation", "Intermediate"],
    },
    {
        "alert_id": "rad_sebi_related_party",
        "title": "SEBI: RPT threshold tightened for listed companies",
        "body_markdown": (
            "SEBI has amended the LODR Regulations to reduce the material "
            "RPT threshold from ₹1000 crore or 10% of turnover to ₹500 crore "
            "or 5% of turnover, whichever is lower. Requires prior approval "
            "of shareholders for material RPTs. Relevant for audit planning."
        ),
        "source": "SEBI/HO/CFD/CMD1/CIR/P/2026/17",
        "source_url": "https://www.sebi.gov.in/",
        "published_at": _days_ago(40),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I5", "chapter_numbers": [9]}, {"paper_code": "P3", "chapter_numbers": [1]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_indas_115_saas",
        "title": "EAC Opinion: Revenue recognition for SaaS bundled contracts",
        "body_markdown": (
            "ICAI's Expert Advisory Committee has opined on the treatment of "
            "hybrid SaaS subscriptions bundled with implementation services "
            "under Ind AS 115. Where implementation is distinct, revenue "
            "should be recognised at a point in time; where highly "
            "customised, over the customer's benefit period."
        ),
        "source": "ICAI EAC Opinion Vol XLII",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(45),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I1", "chapter_numbers": [6]}, {"paper_code": "P1", "chapter_numbers": [8]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_rbi_tokenisation",
        "title": "RBI: Card-on-file tokenisation extended to CBDC pilots",
        "body_markdown": (
            "RBI has extended its card-on-file tokenisation framework to "
            "cover CBDC pilot merchants. Financial reporting implications: "
            "banks & PPI issuers to disclose additional details in the "
            "notes to accounts on tokenisation-related fees and merchant "
            "discount pools."
        ),
        "source": "RBI Master Direction DPSS.CO.OPPD/2026-27/01",
        "source_url": "https://www.rbi.org.in/",
        "published_at": _days_ago(50),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "P3", "chapter_numbers": [6]}],
        "affected_levels": ["Final"],
    },
    {
        "alert_id": "rad_transfer_pricing_saas",
        "title": "CBDT: Safe harbour margins revised for IT-BPO segments",
        "body_markdown": (
            "CBDT has notified revised safe-harbour margins for the IT/BPO "
            "sector under Rule 10TD — 17% (contract R&D), 18% (KPO), and "
            "15% (routine ITeS). Applicable for AY 2026-27 to AY 2028-29. "
            "Reduces transfer-pricing litigation for eligible taxpayers."
        ),
        "source": "CBDT Notification 43/2026",
        "source_url": "https://incometaxindia.gov.in/",
        "published_at": _days_ago(55),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "P4", "chapter_numbers": [18]}],
        "affected_levels": ["Final"],
    },
    {
        "alert_id": "rad_companies_csr_rules",
        "title": "CSR Rules amended: Two-year carry-forward for ongoing projects",
        "body_markdown": (
            "MCA has amended Rule 4 & 7 of the Companies (CSR Policy) Rules, "
            "2014. Ongoing projects can now spread unspent CSR obligation "
            "over three years (up from two), with mandatory quarterly board "
            "reporting on utilisation status."
        ),
        "source": "MCA G.S.R. 512(E) dated 22-Apr-2026",
        "source_url": "https://www.mca.gov.in/",
        "published_at": _days_ago(60),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I2", "chapter_numbers": [9]}, {"paper_code": "P3", "chapter_numbers": [13]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_customs_ftp_updates",
        "title": "FTP 2023 amendments: EPCG scheme conditions tightened",
        "body_markdown": (
            "DGFT has amended the EPCG scheme under FTP 2023 to require a "
            "minimum export performance of 6x duty saved (up from 5x) with a "
            "block-wise export obligation. RoDTEP rates rationalised for 25 "
            "HSN codes."
        ),
        "source": "DGFT Public Notice 15/2026",
        "source_url": "https://www.dgft.gov.in/",
        "published_at": _days_ago(65),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "P5", "chapter_numbers": [15]}],
        "affected_levels": ["Final"],
    },
    {
        "alert_id": "rad_icai_ethics_amend",
        "title": "ICAI Code of Ethics: NOCLAR revision effective 01-Jul-2026",
        "body_markdown": (
            "ICAI has revised the sections on Non-Compliance with Laws and "
            "Regulations (NOCLAR) in the Code of Ethics, harmonising with "
            "IESBA revisions. Auditors must actively consider whether to "
            "disclose to regulators when senior management is involved in "
            "identified non-compliance."
        ),
        "source": "ICAI Ethics Standards Board Announcement",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(35),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "I5", "chapter_numbers": [11]}, {"paper_code": "P3", "chapter_numbers": [13]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_indasfs_bank_disclosure",
        "title": "Ind AS applicability for scheduled banks pushed to Apr 2027",
        "body_markdown": (
            "RBI, in consultation with MCA, has deferred the applicability "
            "of Ind AS to Scheduled Commercial Banks to reporting periods "
            "commencing 01-Apr-2027 (was Apr 2026). Additional pillar-3 "
            "disclosure requirements for the transition period."
        ),
        "source": "RBI Notification RBI/2026-27/45",
        "source_url": "https://www.rbi.org.in/",
        "published_at": _days_ago(70),
        "impact_level": "moderate",
        "affected_topics": [{"paper_code": "P1", "chapter_numbers": [2]}, {"paper_code": "P3", "chapter_numbers": [6]}],
        "affected_levels": ["Final"],
    },

    # ---------- INFO (12) ----------
    {
        "alert_id": "rad_icai_bos_notes",
        "title": "ICAI Board of Studies: Revised study material for Costing released",
        "body_markdown": (
            "The BoS has released the revised Cost and Management Accounting "
            "module for Intermediate. Includes new worked examples on ABC "
            "and revised chapter on Service Costing with case studies."
        ),
        "source": "ICAI BoS Announcement",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(6),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I4", "chapter_numbers": [5, 11]}],
        "affected_levels": ["Intermediate"],
    },
    {
        "alert_id": "rad_ind_as_faq_lease",
        "title": "ICAI FAQ on Ind AS 116 short-term-lease exemption",
        "body_markdown": (
            "Updated FAQ clarifying the short-term-lease exemption when "
            "the lease term is initially 12 months but extendable by "
            "mutual consent — treated as short-term only if extension "
            "is not reasonably certain."
        ),
        "source": "ICAI Ind AS Technical FAQ v3.2",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(18),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I1", "chapter_numbers": [7]}, {"paper_code": "P1", "chapter_numbers": [9]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_articleship_leave",
        "title": "Revised articleship leave policy notified",
        "body_markdown": (
            "ICAI has revised the articleship leave rules — 156 days total "
            "over 3 years, of which 84 days may be used for exam leave "
            "(up from 84 total). Simplified form for extension applications."
        ),
        "source": "ICAI Regulation 60 Amendment",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(25),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "F1", "chapter_numbers": []}],
        "affected_levels": ["Articleship"],
    },
    {
        "alert_id": "rad_gst_return_calendar",
        "title": "GST Return calendar for FY26-27 released",
        "body_markdown": (
            "CBIC has released the compliance calendar for FY26-27. GSTR-1 "
            "quarterly due-dates for QRMP taxpayers slightly advanced; "
            "GSTR-9 self-certification threshold raised to ₹10 crore."
        ),
        "source": "CBIC Compliance Calendar 2026-27",
        "source_url": "https://cbic-gst.gov.in/",
        "published_at": _days_ago(42),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I3", "chapter_numbers": [16]}, {"paper_code": "P5", "chapter_numbers": [8]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_tax_slabs_new",
        "title": "Reminder: New tax regime is default from AY 2024-25",
        "body_markdown": (
            "Continuing reminder — for individuals & HUFs the new tax regime "
            "under Sec 115BAC(1A) is the default from AY 2024-25 onwards. "
            "Filing Form 10-IEA is required to opt-out. Standard deduction "
            "of ₹75,000 available under the new regime as well."
        ),
        "source": "CBDT Reference Guide",
        "source_url": "https://incometaxindia.gov.in/",
        "published_at": _days_ago(48),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I3", "chapter_numbers": [9]}, {"paper_code": "P4", "chapter_numbers": [10]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_icai_capacity_building",
        "title": "ICAI capacity-building programme on ESG assurance launched",
        "body_markdown": (
            "ICAI, in collaboration with CBSCC, has launched a certification "
            "programme on ESG assurance and reporting. Includes SEBI's BRSR "
            "core framework and CDP disclosures. Useful for CA aspirants "
            "targeting Big 4 assurance."
        ),
        "source": "ICAI Announcement Ref: CBSCC-25/2026",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(52),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "P1", "chapter_numbers": [17]}, {"paper_code": "P3", "chapter_numbers": [1]}],
        "affected_levels": ["Final", "Qualified CA"],
    },
    {
        "alert_id": "rad_mca_form_v3",
        "title": "MCA V3 portal: New form filing for share transfer",
        "body_markdown": (
            "MCA V3 portal is now live for share transfer filings (Form MGT-6). "
            "STK-2 (voluntary striking off) and INC-33/INC-34 also migrated. "
            "V2 portal will be sunset for these forms from 01-Oct-2026."
        ),
        "source": "MCA Circular 4/2026",
        "source_url": "https://www.mca.gov.in/",
        "published_at": _days_ago(58),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I2", "chapter_numbers": [4]}],
        "affected_levels": ["Intermediate"],
    },
    {
        "alert_id": "rad_indas_38_intangibles",
        "title": "EAC Opinion: Recognition of AI model development costs",
        "body_markdown": (
            "The EAC has opined that internal AI model development costs "
            "may be capitalised under Ind AS 38 if the recognition criteria "
            "for intangible assets are met — technical feasibility + intent + "
            "measurable cost. Similar to the software development-cost framework."
        ),
        "source": "ICAI EAC Opinion Vol XLII, Case 7",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(72),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "P1", "chapter_numbers": [5]}],
        "affected_levels": ["Final"],
    },
    {
        "alert_id": "rad_icai_may_pass_pct",
        "title": "May 2025 exam pass %: Foundation 26.9%, Inter 12.7%, Final 8.2%",
        "body_markdown": (
            "ICAI has released the May 2025 attempt pass percentages. "
            "Foundation 26.90% (higher than Nov 2024), Intermediate Group I "
            "12.74%, Group II 15.31%, Final Group I 8.24%, Group II 9.14%."
        ),
        "source": "ICAI Result Statistics — May 2025 Attempt",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(38),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "F1", "chapter_numbers": []}],
        "affected_levels": ["Foundation", "Intermediate", "Final"],
    },
    {
        "alert_id": "rad_gst_appellate_e",
        "title": "GST Appellate Tribunal (GSTAT) benches operational",
        "body_markdown": (
            "The Principal Bench of GSTAT at Delhi is operational from "
            "01-May-2026, with 30 state benches to follow by December. "
            "First round of appointments completed. Appeals filing manual "
            "released on the GST portal."
        ),
        "source": "GSTAT Notification 1/2026",
        "source_url": "https://cbic-gst.gov.in/",
        "published_at": _days_ago(75),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "P5", "chapter_numbers": [11]}],
        "affected_levels": ["Final"],
    },
    {
        "alert_id": "rad_income_return_default",
        "title": "ITR filing utility rollout for AY 2026-27",
        "body_markdown": (
            "Income-Tax Department has rolled out the ITR filing utilities "
            "for AY 2026-27. New reporting requirements for foreign assets "
            "including crypto-assets under Sec 285BAA are integrated. "
            "Due date for non-audit cases: 31-Jul-2026."
        ),
        "source": "CBDT Notification 41/2026",
        "source_url": "https://incometaxindia.gov.in/",
        "published_at": _days_ago(80),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "I3", "chapter_numbers": [10]}, {"paper_code": "P4", "chapter_numbers": [14]}],
        "affected_levels": ["Intermediate", "Final"],
    },
    {
        "alert_id": "rad_ind_valuation_std",
        "title": "IVSC issues Indian Valuation Standard on Startups",
        "body_markdown": (
            "The Indian Valuation Standards Board of ICAI has issued IVS 106 "
            "on valuation of early-stage startups. Explicit guidance on Rule "
            "11UA-adjacent methodologies (Venture Capital Method, First "
            "Chicago Method) and disclosure requirements."
        ),
        "source": "ICAI Valuation Standards Board",
        "source_url": "https://icai.org/",
        "published_at": _days_ago(86),
        "impact_level": "info",
        "affected_topics": [{"paper_code": "P2", "chapter_numbers": [13, 14]}],
        "affected_levels": ["Final"],
    },
]
