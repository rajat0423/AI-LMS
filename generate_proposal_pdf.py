# generate_proposal_pdf.py
import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Define Colors
PRIMARY = colors.HexColor("#1A365D")      # Deep Navy Blue
SECONDARY = colors.HexColor("#2B6CB0")    # Slate Blue
TEXT_COLOR = colors.HexColor("#2D3748")   # Charcoal Grey
BACKGROUND_LIGHT = colors.HexColor("#F7FAFC") # Soft Grey bg
BORDER_COLOR = colors.HexColor("#E2E8F0") # Subtle border grey
WHITE = colors.HexColor("#FFFFFF")
ALERT_GREEN = colors.HexColor("#2F855A")  # Sage Green for executive highlights
ALERT_GREEN_BG = colors.HexColor("#F0FFF4")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_elements(self, page_count):
        self.saveState()
        
        # Suppress header on page 1 (traditional first page layout)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(SECONDARY)
            self.drawString(54, 755, "BUSINESS SIZING & SCALABILITY PROPOSAL")
            self.setFont("Helvetica", 8)
            self.setFillColor(TEXT_COLOR)
            self.drawRightString(558, 755, "Aao Seekhe Live")
            
            # Header Line
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)

        # Running Footer on all pages
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(54, 50, 558, 50)
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_COLOR)
        self.drawString(54, 38, "Confidential - Prepared for Client")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 38, page_text)
        
        self.restoreState()

def create_proposal_pdf(output_path):
    # Setup document with 0.75-inch (54pt) margins
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=64
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    doc_title_style = ParagraphStyle(
        'DocumentTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=4
    )

    doc_subtitle_style = ParagraphStyle(
        'DocumentSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=SECONDARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_COLOR,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=ALERT_GREEN,
        leftIndent=8,
        rightIndent=8
    )

    table_header_style = ParagraphStyle(
        'TableHeaderText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=WHITE,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_COLOR
    )

    table_cell_bold = ParagraphStyle(
        'TableCellTextBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title Block
    story.append(Paragraph("Aao Seekhe Live — Sizing & Scalability Proposal", doc_title_style))
    story.append(Paragraph("<b>Target Capacity:</b> 20,000 Active Members (Students & Professionals)  |  <b>Billing Model:</b> INR & USD", doc_subtitle_style))

    # Top Color Accent Bar
    bar_data = [['']]
    bar_table = Table(bar_data, colWidths=[504], rowHeights=[3])
    bar_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(bar_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 1: BUSINESS SUMMARY & BENEFITS
    # ==========================================
    story.append(Paragraph("What is this platform upgrade about?", h1_style))
    intro_txt = (
        "We want to make sure that as our student and professional community grows to 20,000 active users, "
        "the <b>Aao Seekhe Live</b> platform remains incredibly fast, highly reliable, and entirely secure. "
        "This proposal breaks down the exact cloud setup and costs required to transition the platform into a "
        "highly polished, professional cloud structure. We have avoided dry technical jargon to focus on what "
        "this investment actually delivers for your students, your team, and your business."
    )
    story.append(Paragraph(intro_txt, body_style))

    story.append(Paragraph("How this keeps our users happy and protects our data", h2_style))
    story.append(Paragraph(
        "By moving to a professional, dedicated database and hosting plan, we solve the common limitations "
        "of free hosting models. Here is how this directly benefits our community:",
        body_style
    ))
    
    story.append(Paragraph(
        "<b>• All student progress is saved permanently:</b> Previously, student accounts, completed lessons, "
        "and test scores were stored in a temporary cloud folder that automatically wiped itself clean whenever the "
        "system restarted. With our new permanent database vault, accounts and achievements are safely saved forever.",
        bullet_style
    ))
    
    story.append(Paragraph(
        "<b>• No long boot-up wait times:</b> Free websites fall into a deep sleep after 15 minutes of silence, "
        "causing the next visitor to wait a frustrating 1 to 2 minutes for the page to open. We have built-in "
        "automated pings that keep the server 'awake' and warm 24/7. Pages will load instantly at any time of day.",
        bullet_style
    ))

    story.append(Paragraph(
        "<b>• Automatically adjusts to peak traffic:</b> If hundreds of students log in at the same exact second "
        "to take a mid-term quiz or submit resumes, the server automatically duplicates itself in the cloud "
        "to share the traffic load. This guarantees the platform never gets sluggish or crashes during critical hours.",
        bullet_style
    ))

    story.append(Spacer(1, 8))

    # Executive Highlight Callout Box
    summary_box_data = [[
        Paragraph(
            "<b>💡 The Big Picture (Cost-per-User):</b><br/>"
            "By utilizing state-of-the-art serverless hosting and highly optimized, pay-as-you-go AI processing (Groq), "
            "the annual cost of hosting the entire platform is just <b>₹1,71,492 ($2,053.80 USD)</b>. "
            "This works out to **less than ₹8.50 ($0.10 USD) per active user per year**! "
            "This is an exceptionally cost-efficient setup that delivers enterprise-grade performance.",
            callout_style
        )
    ]]
    summary_box_table = Table(summary_box_data, colWidths=[504])
    summary_box_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ALERT_GREEN_BG),
        ('BOX', (0,0), (-1,-1), 1, ALERT_GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_box_table)
    
    story.append(PageBreak())

    # ==========================================
    # SECTION 2: COST BREAKDOWN
    # ==========================================
    story.append(Paragraph("A clear, simple cost breakdown", h1_style))
    story.append(Paragraph(
        "Here is the line-by-line investment required. We have translated the technical terms into clear, "
        "business-focused descriptions. <i>Conversions are calculated at a standard billing rate of ₹83.50 INR per USD.</i>",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Table Sizing & Headers
    # Total Width available = 504pt
    col_widths = [110, 154, 60, 60, 60, 60]
    
    table_data = [
        [
            Paragraph("Service Layer", table_header_style),
            Paragraph("Plain-English Sizing Details", table_header_style),
            Paragraph("Monthly<br/>(USD)", table_header_style),
            Paragraph("Monthly<br/>(INR)", table_header_style),
            Paragraph("Annual<br/>(USD)", table_header_style),
            Paragraph("Annual<br/>(INR)", table_header_style),
        ],
        [
            Paragraph("<b>High-Speed Web Delivery</b>", table_cell_style),
            Paragraph("Ensures the portal loads instantly across the globe and covers all network bandwidth for 20k users.", table_cell_style),
            Paragraph("$20.00", table_cell_style),
            Paragraph("₹1,670", table_cell_style),
            Paragraph("$240.00", table_cell_style),
            Paragraph("₹20,040", table_cell_style),
        ],
        [
            Paragraph("<b>Core Computing Server</b>", table_cell_style),
            Paragraph("Dual cloud engines running concurrently to share user traffic and handle high quiz submissions smoothly.", table_cell_style),
            Paragraph("$50.00", table_cell_style),
            Paragraph("₹4,175", table_cell_style),
            Paragraph("$600.00", table_cell_style),
            Paragraph("₹50,100", table_cell_style),
        ],
        [
            Paragraph("<b>Secure Data Vault</b>", table_cell_style),
            Paragraph("Dedicated database holding all student credentials, lesson history, and quiz scores. Includes daily backups.", table_cell_style),
            Paragraph("$50.00", table_cell_style),
            Paragraph("₹4,175", table_cell_style),
            Paragraph("$600.00", table_cell_style),
            Paragraph("₹50,100", table_cell_style),
        ],
        [
            Paragraph("<b>AI Brain & Analysis</b>", table_cell_style),
            Paragraph("Powers the AI Resume Analyzer and Chatbot Tutor. Billed on a highly secure pay-as-you-go model.", table_cell_style),
            Paragraph("$10.00", table_cell_style),
            Paragraph("₹835", table_cell_style),
            Paragraph("$120.00", table_cell_style),
            Paragraph("₹10,020", table_cell_style),
        ],
        [
            Paragraph("<b>Resume Storage</b>", table_cell_style),
            Paragraph("Safely holds all uploaded student resumes. Downloading files is completely free of charge.", table_cell_style),
            Paragraph("$0.15", table_cell_style),
            Paragraph("₹12.50", table_cell_style),
            Paragraph("$1.80", table_cell_style),
            Paragraph("₹150", table_cell_style),
        ],
        [
            Paragraph("<b>Auto-Email Delivery</b>", table_cell_style),
            Paragraph("Automatically dispatches student welcome emails, password resets, and PDF course certificates.", table_cell_style),
            Paragraph("$20.00", table_cell_style),
            Paragraph("₹1,670", table_cell_style),
            Paragraph("$240.00", table_cell_style),
            Paragraph("₹20,040", table_cell_style),
        ],
        [
            Paragraph("<b>DNS & Cloud Security</b>", table_cell_style),
            Paragraph("Active cyber security monitoring that deflects malicious bots and keeps user data safe and encrypted.", table_cell_style),
            Paragraph("$21.00", table_cell_style),
            Paragraph("₹1,753.50", table_cell_style),
            Paragraph("$252.00", table_cell_style),
            Paragraph("₹21,042", table_cell_style),
        ],
        [
            Paragraph("<b>TOTAL ESTIMATED BUDGET</b>", table_cell_bold),
            Paragraph("<b>Enterprise cloud setup for 20,000 active students and professionals</b>", table_cell_bold),
            Paragraph("<b>$171.15</b>", table_cell_bold),
            Paragraph("<b>₹14,291</b>", table_cell_bold),
            Paragraph("<b>$2,053.80</b>", table_cell_bold),
            Paragraph("<b>₹171,492</b>", table_cell_bold),
        ]
    ]

    cost_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    cost_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [WHITE, BACKGROUND_LIGHT]),
        ('BACKGROUND', (0,-1), (-1,-1), BACKGROUND_LIGHT),
        ('BOX', (0,-1), (-1,-1), 1.5, PRIMARY),
    ]))
    
    story.append(cost_table)
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 3: PEACE OF MIND
    # ==========================================
    story.append(Paragraph("Safety nets and peace of mind", h1_style))
    story.append(Paragraph(
        "Our system is designed with multiple layers of automatic protection so that you never have to "
        "worry about system health or data loss:",
        body_style
    ))
    story.append(Paragraph(
        "<b>• Automated Daily Backups:</b> In the event of an accidental delete, the system takes "
        "automatic snapshots every 24 hours. We can fully restore all data to any point in time with zero data loss.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>• Proactive Cybersecurity Guard:</b> Our security shields automatically screen and block "
        "malicious internet bots, keeping the platform clean, fast, and completely safe from cyber threats.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>• Safe, Pay-As-You-Go Billing:</b> The AI processing cost is calculated on actual active usage. "
        "If student activity is lower during holidays, your monthly AI bill will automatically drop, ensuring "
        "no budget is ever wasted.",
        bullet_style
    ))
    
    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    output_pdf = "C:\\Users\\rajat\\OneDrive\\Desktop\\Aao_Seekhe_Live_Scaling_Proposal.pdf"
    create_proposal_pdf(output_pdf)
    print(f"PDF successfully compiled and exported to: {output_pdf}")
