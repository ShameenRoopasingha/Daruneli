#!/usr/bin/env python3
"""
project-docs-generator PDF Exporter
Converts Markdown project proposals and reports into professionally designed executive PDFs.
"""

import os
import sys
import argparse
import subprocess
import tempfile
import re
import shutil
from pathlib import Path


def find_browser() -> str | None:
    """Finds an installed Chromium-based browser (Chrome, Edge, Brave, Chromium) across OSes."""
    # 1. Explicit environment overrides
    for env_var in ["CHROME_PATH", "EDGE_PATH", "BROWSER_PATH"]:
        val = os.environ.get(env_var)
        if val and os.path.isfile(val):
            return val

    # 2. Windows known locations
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        for exe in ["chrome.exe", "msedge.exe", "brave.exe"]:
            path = shutil.which(exe)
            if path:
                return path

    # 3. macOS known locations
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        for exe in ["google-chrome", "chromium", "msedge"]:
            path = shutil.which(exe)
            if path:
                return path

    # 4. Linux known locations
    else:
        for exe in [
            "google-chrome",
            "google-chrome-stable",
            "chromium",
            "chromium-browser",
            "microsoft-edge",
            "microsoft-edge-stable",
            "brave-browser",
        ]:
            path = shutil.which(exe)
            if path:
                return path

    return None


def convert_markdown_to_html(md_content: str) -> str:
    """Converts Markdown content into HTML using the markdown library or fallback."""
    try:
        import markdown
        html = markdown.markdown(
            md_content,
            extensions=["tables", "fenced_code", "sane_lists", "toc", "nl2br"]
        )
        return html
    except ImportError:
        # Fallback to pandoc if python-markdown is not installed
        pandoc_path = shutil.which("pandoc")
        if pandoc_path:
            res = subprocess.run(
                [pandoc_path, "-f", "gfm", "-t", "html5"],
                input=md_content,
                text=True,
                capture_output=True
            )
            if res.returncode == 0:
                return res.stdout
        raise RuntimeError(
            "Neither Python 'markdown' package nor 'pandoc' is available. "
            "Please run: pip install markdown"
        )


def post_process_html(html: str) -> str:
    """Applies executive enhancements: badges, mermaid wrappers, and executive summary callouts."""
    # 1. Transform mermaid code blocks to mermaid divs
    mermaid_pattern = r'<pre><code class="language-mermaid">([\s\S]*?)</code></pre>'
    def replace_mermaid(match):
        code = (
            match.group(1)
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
        )
        return f'<div class="mermaid-container"><div class="mermaid">{code.strip()}</div></div>'
    html = re.sub(mermaid_pattern, replace_mermaid, html)

    # 2. Inject badges for table status and severity values
    badge_map = {
        "Completed": "badge-success",
        "On Track": "badge-success",
        "Proposed": "badge-info",
        "In Progress": "badge-info",
        "Open": "badge-info",
        "At Risk": "badge-warning",
        "Medium": "badge-warning",
        "Delayed": "badge-danger",
        "High": "badge-danger",
        "Critical": "badge-danger",
        "Low": "badge-neutral",
    }
    for label, badge_class in badge_map.items():
        cell_pattern = rf'(<td[^>]*>)\s*({re.escape(label)})\s*(</td>)'
        html = re.sub(
            cell_pattern,
            rf'\1<span class="badge {badge_class}">\2</span>\3',
            html
        )

    return html


def build_full_html_document(html_body: str, title: str, css_styles: str) -> str:
    """Wraps body in a full HTML5 container with fonts, print styling, and Mermaid.js support."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
{css_styles}
</style>
</head>
<body>
<div class="document-container">
{html_body}
</div>
<script>
  if (typeof mermaid !== 'undefined') {{
    mermaid.initialize({{
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter, "Noto Sans Sinhala", "Iskoola Pota", "Nirmala UI", sans-serif',
      fontSize: 20,
      flowchart: {{
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 16
      }},
      gantt: {{
        fontSize: 16,
        sectionFontSize: 16,
        numberSectionStyles: 5,
        axisFormat: '%d/%m',
        topPadding: 45,
        bottomPadding: 45,
        barHeight: 26,
        barGap: 8
      }}
    }});
  }}
</script>
</body>
</html>"""


def get_default_css(custom_css_path: str | None = None) -> str:
    """Loads CSS from file or provides embedded executive fallback."""
    if custom_css_path and os.path.isfile(custom_css_path):
        with open(custom_css_path, "r", encoding="utf-8") as f:
            return f.read()

    # Look for sibling resources/pdf-style.css
    script_dir = Path(__file__).resolve().parent
    resource_css = script_dir.parent / "resources" / "pdf-style.css"
    if resource_css.is_file():
        with open(resource_css, "r", encoding="utf-8") as f:
            return f.read()

    # Embedded fallback
    return """
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; }
    h1 { color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
    h2 { color: #1e293b; border-bottom: 1px solid #e2e8f0; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; }
    th, td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 9pt; }
    th { background: #f1f5f9; text-align: left; }
    """


def generate_pdf(input_md_path: str, output_pdf_path: str | None = None, css_path: str | None = None, keep_html: bool = False) -> str:
    input_file = Path(input_md_path).resolve()
    if not input_file.is_file():
        raise FileNotFoundError(f"Markdown file not found: {input_md_path}")

    if not output_pdf_path:
        output_file = input_file.with_suffix(".pdf")
    else:
        output_file = Path(output_pdf_path).resolve()

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(input_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Extract title from first H1 or filename
    title_match = re.search(r'^#\s+(.+)$', md_text, re.MULTILINE)
    doc_title = title_match.group(1).strip() if title_match else input_file.stem.replace("-", " ").title()

    html_content = convert_markdown_to_html(md_text)
    html_content = post_process_html(html_content)
    css_styles = get_default_css(css_path)
    full_html = build_full_html_document(html_content, doc_title, css_styles)

    # Temporary HTML file for headless browser
    temp_dir = tempfile.gettempdir()
    temp_html_path = os.path.join(temp_dir, f"{input_file.stem}_preview.html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    browser = find_browser()
    if not browser:
        # Fallback check for pandoc/weasyprint
        weasyprint = shutil.which("weasyprint")
        if weasyprint:
            subprocess.run([weasyprint, temp_html_path, str(output_file)], check=True)
            if not keep_html and os.path.exists(temp_html_path):
                os.remove(temp_html_path)
            return str(output_file)
        raise RuntimeError(
            "No Chromium-based browser (Chrome/Edge/Brave) or WeasyPrint found. "
            "Please ensure Google Chrome or Microsoft Edge is installed to render PDFs."
        )

    # Execute headless print-to-pdf
    args = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=3000",
        "--no-pdf-header-footer",
        f"--print-to-pdf={str(output_file)}",
        temp_html_path
    ]

    result = subprocess.run(args, capture_output=True, text=True)

    if not output_file.is_file() or output_file.stat().st_size == 0:
        raise RuntimeError(
            f"PDF rendering failed (exit code {result.returncode}).\n"
            f"Stderr: {result.stderr}\nStdout: {result.stdout}"
        )

    if keep_html:
        dest_html = output_file.with_suffix(".html")
        shutil.copy2(temp_html_path, dest_html)

    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)

    return str(output_file)


def main():
    parser = argparse.ArgumentParser(
        description="Convert project proposals and reports into executive-styled PDF documents."
    )
    parser.add_argument("input", help="Path to input Markdown file")
    parser.add_argument("-o", "--output", help="Path to output PDF file (default: same directory as input)")
    parser.add_argument("-c", "--css", help="Optional path to custom CSS stylesheet")
    parser.add_argument("--keep-html", action="store_true", help="Keep intermediate HTML file alongside PDF")

    args = parser.parse_args()

    try:
        pdf_path = generate_pdf(
            input_md_path=args.input,
            output_pdf_path=args.output,
            css_path=args.css,
            keep_html=args.keep_html
        )
        print(f"SUCCESS: PDF generated successfully at:\n{pdf_path}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
