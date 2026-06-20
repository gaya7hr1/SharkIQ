from functools import lru_cache

import fitz
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document as LCDocument

from app.core.logging import get_logger
from app.utils.exceptions import DocumentProcessingError

logger = get_logger(__name__)


@lru_cache
def _get_ocr_engine():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def _ocr_pdf(file_path: str) -> list[LCDocument]:
    """Rasterize each page and run OCR. Used when a PDF has no embedded text
    layer (e.g. pitch decks exported as flattened slide images)."""
    engine = _get_ocr_engine()
    pdf = fitz.open(file_path)
    docs = []
    for page_num, page in enumerate(pdf):
        pixmap_bytes = page.get_pixmap(dpi=200).tobytes("png")
        result, _ = engine(pixmap_bytes)
        text = "\n".join(line[1] for line in result) if result else ""
        docs.append(
            LCDocument(
                page_content=text,
                metadata={"source": file_path, "total_pages": pdf.page_count, "page": page_num, "ocr": True},
            )
        )
    return docs


def load_pdf(file_path: str) -> list[LCDocument]:
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    except Exception as exc:  # noqa: BLE001 - surface any parser failure uniformly
        raise DocumentProcessingError(f"Failed to load PDF '{file_path}': {exc}") from exc

    if any(doc.page_content.strip() for doc in docs):
        return docs

    logger.info("pdf_has_no_text_layer_falling_back_to_ocr", file_path=file_path)
    try:
        return _ocr_pdf(file_path)
    except Exception as exc:  # noqa: BLE001 - OCR is a best-effort fallback
        raise DocumentProcessingError(f"Failed to OCR PDF '{file_path}': {exc}") from exc
