from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


ROOT = Path(r"C:\Users\Glory\Documents\argleadstracker")
PDF_PATH = ROOT / "artifacts" / "ARG_Leads_Tracker_Management_Status_and_GoLive_Readiness_2026-08-04.pdf"
OUTPUT_DIR = ROOT / "tmp" / "aug4-report-render"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(PDF_PATH))
    rendered = []

    for index in range(len(pdf)):
        page = pdf[index]
        image = page.render(scale=1.35).to_pil().convert("RGB")
        image_path = OUTPUT_DIR / f"page-{index + 1}.png"
        image.save(image_path, quality=92)
        rendered.append(image)

    thumb_width = 620
    margin = 24
    label_height = 30
    thumbs = []
    for index, image in enumerate(rendered):
        height = round(image.height * thumb_width / image.width)
        thumb = image.resize((thumb_width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (thumb_width, height + label_height), "white")
        canvas.paste(thumb, (0, label_height))
        draw = ImageDraw.Draw(canvas)
        draw.text((8, 7), f"Page {index + 1}", fill="#06283d")
        thumbs.append(canvas)

    columns = 2
    rows = (len(thumbs) + columns - 1) // columns
    cell_height = max(image.height for image in thumbs)
    sheet = Image.new(
        "RGB",
        (
            columns * thumb_width + (columns + 1) * margin,
            rows * cell_height + (rows + 1) * margin,
        ),
        "#eef1f4",
    )
    for index, thumb in enumerate(thumbs):
        x = margin + (index % columns) * (thumb_width + margin)
        y = margin + (index // columns) * (cell_height + margin)
        sheet.paste(thumb, (x, y))

    sheet.save(OUTPUT_DIR / "contact-sheet.png", quality=92)
    (OUTPUT_DIR / "page-count.txt").write_text(str(len(pdf)), encoding="ascii")


if __name__ == "__main__":
    main()
